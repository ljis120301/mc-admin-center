import { NextResponse } from 'next/server';
import util from 'minecraft-server-util';
import { Rcon } from 'rcon-client';
import fs from 'fs';
import path from 'path';

const RCON_CONFIG = {
  host: process.env.MINECRAFT_HOST,
  port: parseInt(process.env.MINECRAFT_PORT),
  password: process.env.RCON_PASSWORD,
  gamePort: 25565
};

// Helper function to check server status
async function checkServerStatus() {
  try {
    console.log('Attempting to connect to server:', {
      host: RCON_CONFIG.host,
      port: RCON_CONFIG.gamePort
    });
    
    // First try to get server status
    let serverStatus = {
      success: true,
      status: 'offline',
      players: [],
      maxPlayers: 0,
      version: null,
      error: null
    };

    try {
      // Try both status methods
      let status;
      try {
        status = await util.status(RCON_CONFIG.host, RCON_CONFIG.gamePort);
      } catch (e) {
        status = await util.statusBedrock(RCON_CONFIG.host, RCON_CONFIG.gamePort);
      }

      console.log('Server status response:', status);
      
      if (status) {
        serverStatus = {
          ...serverStatus,
          status: 'online',
          maxPlayers: status.players?.max || 20, // Default to 20 if not available
          version: status.version?.name || 'Unknown'
        };
      }
    } catch (statusError) {
      console.error('Failed to get server status:', statusError);
      // Don't set error here, just keep status as offline
    }

    // Then try to get player list via RCON
    try {
      const rcon = new Rcon({
        host: RCON_CONFIG.host,
        port: RCON_CONFIG.port,
        password: RCON_CONFIG.password
      });

      await rcon.connect();
      const playerList = await rcon.send('list');
      await rcon.end();

      // Parse player list response
      const players = playerList
        .split(':')[1] // Get the part after "There are X of a max of Y players online:"
        .trim()
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      serverStatus.players = players;
      // If we got a player list, the server is definitely online
      serverStatus.status = 'online';
    } catch (rconError) {
      console.error('Failed to get player list:', rconError);
      // Only set error if we couldn't get server status either
      if (serverStatus.status === 'offline') {
        serverStatus.error = rconError.message;
      }
    }

    return serverStatus;
  } catch (error) {
    console.error('Server status check failed:', error);
    return {
      success: true,
      status: 'offline',
      players: [],
      maxPlayers: 0,
      version: null,
      error: error.message
    };
  }
}

// Helper function to send RCON command
async function sendRconCommand(command) {
  const rcon = new Rcon({
    host: RCON_CONFIG.host,
    port: RCON_CONFIG.port,
    password: RCON_CONFIG.password
  });

  try {
    await rcon.connect();
    const response = await rcon.send(command);
    await rcon.end();
    return response;
  } catch (error) {
    console.error(`Failed to send RCON command "${command}":`, error);
    throw error;
  }
}

// Helper function to read server logs
async function readServerLogs() {
  try {
    const logPath = path.join(process.cwd(), 'logs', 'latest.log');
    const logs = await fs.promises.readFile(logPath, 'utf8');
    return logs.split('\n').slice(-100); // Return last 100 lines
  } catch (error) {
    console.error('Failed to read server logs:', error);
    return [];
  }
}

export async function POST(request) {
  try {
    const { action, command } = await request.json();

    if (!action) {
      return NextResponse.json({
        success: false,
        status: 'error',
        message: 'No action specified',
        error: 'No action specified'
      }, { status: 400 });
    }

    console.log('Received action:', action);
    if (command) {
      console.log('Command:', command);
    }
    console.log('Using RCON config:', {
      host: RCON_CONFIG.host,
      port: RCON_CONFIG.port
    });

    switch (action) {
      case 'start':
        return NextResponse.json({
          success: true,
          status: 'offline',
          message: 'Server start command received. Note: This requires additional server setup.',
          error: null
        });

      case 'stop':
        try {
          console.log('Attempting to stop server...');
          await sendRconCommand('stop');
          console.log('Stop command sent successfully');
          return NextResponse.json({
            success: true,
            status: 'offline',
            message: 'Server stopping...',
            error: null
          });
        } catch (error) {
          console.error('Failed to stop server:', error);
          return NextResponse.json({
            success: false,
            status: 'error',
            message: `Failed to stop server: ${error.message}`,
            error: error.message
          }, { status: 500 });
        }

      case 'restart':
        try {
          console.log('Attempting to restart server...');
          await sendRconCommand('restart');
          console.log('Restart command sent successfully');
          return NextResponse.json({
            success: true,
            status: 'offline',
            message: 'Server restarting...',
            error: null
          });
        } catch (error) {
          console.error('Failed to restart server:', error);
          return NextResponse.json({
            success: false,
            status: 'error',
            message: `Failed to restart server: ${error.message}`,
            error: error.message
          }, { status: 500 });
        }

      case 'refresh':
        const status = await checkServerStatus();
        return NextResponse.json(status);

      case 'command':
        if (!command) {
          return NextResponse.json({
            success: false,
            status: 'error',
            message: 'No command specified',
            error: 'No command specified'
          }, { status: 400 });
        }

        try {
          const output = await sendRconCommand(command);
          return NextResponse.json({
            success: true,
            status: 'online',
            output,
            error: null
          });
        } catch (error) {
          console.error('Failed to execute command:', error);
          return NextResponse.json({
            success: false,
            status: 'error',
            message: `Failed to execute command: ${error.message}`,
            error: error.message
          }, { status: 500 });
        }

      case 'logs':
        const logs = await readServerLogs();
        return NextResponse.json({
          success: true,
          status: 'online',
          logs,
          error: null
        });

      default:
        return NextResponse.json({
          success: false,
          status: 'error',
          message: 'Invalid action',
          error: 'Invalid action'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json({
      success: false,
      status: 'error',
      message: `Server error: ${error.message}`,
      error: error.message
    }, { status: 500 });
  }
} 