import { NextResponse } from 'next/server';
import util from 'minecraft-server-util';
import { Rcon } from 'rcon-client';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const RCON_CONFIG = {
  host: process.env.MINECRAFT_HOST,
  port: parseInt(process.env.MINECRAFT_PORT),
  password: process.env.RCON_PASSWORD,
  gamePort: 25565
};

const CONTROL_SCRIPT = path.join(process.cwd(), 'scripts', 'remote-server-control.sh');

// Helper function to check server status
async function checkServerStatus() {
  try {
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
      // Try to get server status
      const status = await util.status(RCON_CONFIG.host, RCON_CONFIG.gamePort);
      
      if (status) {
        serverStatus = {
          ...serverStatus,
          status: 'online',
          maxPlayers: status.players?.max || 20,
          version: status.version?.name || 'Unknown'
        };
      }
    } catch (statusError) {
      // Don't log this error as it's expected when server is offline
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
      const match = playerList.match(/There are (\d+) of a max of (\d+) players online:/);
      if (match) {
        serverStatus.maxPlayers = parseInt(match[2]);
      }

      const players = playerList
        .split(':')[1]
        .trim()
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      serverStatus.players = players;
      serverStatus.status = 'online';
    } catch (rconError) {
      if (serverStatus.status === 'offline') {
        serverStatus.error = rconError.message;
      }
    }

    // Always try to get version via RCON if server is online
    if (serverStatus.status === 'online') {
      try {
        const rcon = new Rcon({
          host: RCON_CONFIG.host,
          port: RCON_CONFIG.port,
          password: RCON_CONFIG.password
        });

        await rcon.connect();
        
        // Try forge mods command first
        try {
          const modsResponse = await rcon.send('forge mods');

          // Extract version from the first line (minecraft server version)
          const versionMatch = modsResponse.match(/minecraft server-(\d+\.\d+\.\d+)/);
          if (versionMatch) {
            serverStatus.version = versionMatch[1];
          }

          // Parse mod list
          const modLines = modsResponse.split('\n').filter(line => line.trim().startsWith('•'));
          serverStatus.mods = modLines.map(line => {
            const match = line.match(/• (.+) : (.+) \((\d+\.\d+\.\d+)\) - (\d+)/);
            if (match) {
              return {
                name: match[1],
                id: match[2],
                version: match[3],
                priority: parseInt(match[4])
              };
            }
            return null;
          }).filter(mod => mod !== null);

        } catch (modsError) {
          // Fallback to standard version commands if forge mods fails
          const commands = ['version', 'ver', 'about', 'help'];
          for (const cmd of commands) {
            try {
              const response = await rcon.send(cmd);

              const patterns = [
                /This server is running (.+)/,
                /Minecraft server version (.+)/,
                /Server version: (.+)/,
                /Version: (.+)/,
                /Minecraft (.+)/,
                /Paper (.+)/,
                /Spigot (.+)/,
                /Bukkit (.+)/
              ];

              for (const pattern of patterns) {
                const versionMatch = response.match(pattern);
                if (versionMatch) {
                  serverStatus.version = versionMatch[1];
                  break;
                }
              }

              if (serverStatus.version) break;
            } catch (cmdError) {
              // Don't log individual command failures
            }
          }
        }

        await rcon.end();
      } catch (versionError) {
        // Don't log version check errors
      }
    }

    // Only log the final status if there are changes
    if (serverStatus.status === 'online' || serverStatus.error) {
      console.log('Server status:', {
        status: serverStatus.status,
        players: serverStatus.players.length,
        maxPlayers: serverStatus.maxPlayers,
        version: serverStatus.version,
        mods: serverStatus.mods?.length || 0,
        error: serverStatus.error
      });
    }

    return serverStatus;
  } catch (error) {
    console.error('Server status check failed:', error.message);
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

// Helper function to start the server
async function startServer() {
  try {
    console.log('Starting server...');
    const { stdout, stderr } = await execAsync(`${CONTROL_SCRIPT} start`);
    console.log('Server start command output:', stdout);
    if (stderr) console.error('Server start errors:', stderr);
    return true;
  } catch (error) {
    console.error('Failed to start server:', error);
    throw error;
  }
}

// Helper function to stop the server
async function stopServer() {
  try {
    console.log('Stopping server...');
    const { stdout, stderr } = await execAsync(`${CONTROL_SCRIPT} stop`);
    console.log('Server stop command output:', stdout);
    if (stderr) console.error('Server stop errors:', stderr);
    return true;
  } catch (error) {
    console.error('Failed to stop server:', error);
    throw error;
  }
}

// Helper function to check if a player has OP
async function checkPlayerOp(player) {
  try {
    const rcon = new Rcon({
      host: RCON_CONFIG.host,
      port: RCON_CONFIG.port,
      password: RCON_CONFIG.password
    });

    await rcon.connect();
    const response = await rcon.send(`op ${player}`);
    await rcon.end();

    // If the response contains "already an op", the player is already an op
    return response.toLowerCase().includes('already an op');
  } catch (error) {
    console.error(`Failed to check OP status for ${player}:`, error);
    return false;
  }
}

// Helper function to toggle player OP status
async function togglePlayerOp(player, shouldBeOp) {
  try {
    const rcon = new Rcon({
      host: RCON_CONFIG.host,
      port: RCON_CONFIG.port,
      password: RCON_CONFIG.password
    });

    await rcon.connect();
    const command = shouldBeOp ? 'op' : 'deop';
    const response = await rcon.send(`${command} ${player}`);
    await rcon.end();

    return {
      success: true,
      message: response
    };
  } catch (error) {
    console.error(`Failed to toggle OP status for ${player}:`, error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Helper function to get banned players list
async function getBannedPlayers() {
  try {
    const rcon = new Rcon({
      host: RCON_CONFIG.host,
      port: RCON_CONFIG.port,
      password: RCON_CONFIG.password
    });

    await rcon.connect();
    const response = await rcon.send('banlist');
    await rcon.end();

    console.log('Banlist response:', response);

    // If the response indicates no bans, return empty array
    if (response.toLowerCase().includes('there are no bans')) {
      return [];
    }

    // Parse the banlist response
    const lines = response.split('\n');
    const bannedPlayers = lines
      .filter(line => line.trim().length > 0) // Remove empty lines
      .filter(line => !line.toLowerCase().includes('banned players:')) // Skip header
      .filter(line => !/^\d+$/.test(line)) // Skip number lines
      .filter(line => !line.toLowerCase().includes('there are no bans')) // Skip "no bans" message
      .map(line => {
        // Extract player name and reason
        // Example: "player was banned by Rcon: Banned by an operator."
        const match = line.match(/^([^\s]+)\s+(.*)/);
        if (match) {
          return {
            name: match[1],
            reason: match[2]
          };
        }
        return null;
      })
      .filter(player => player !== null); // Remove any null entries

    console.log('Parsed banned players:', bannedPlayers);
    return bannedPlayers;
  } catch (error) {
    console.error('Failed to get banned players:', error);
    return [];
  }
}

// Helper function to ban a player
async function banPlayer(player) {
  try {
    const rcon = new Rcon({
      host: RCON_CONFIG.host,
      port: RCON_CONFIG.port,
      password: RCON_CONFIG.password
    });

    await rcon.connect();
    const response = await rcon.send(`ban ${player}`);
    await rcon.end();

    console.log('Ban response:', response);

    // Check if the ban was successful
    const success = response.toLowerCase().includes('banned') || 
                   response.toLowerCase().includes('already banned');

    return {
      success,
      message: response
    };
  } catch (error) {
    console.error(`Failed to ban player ${player}:`, error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Helper function to unban a player
async function unbanPlayer(player) {
  try {
    const rcon = new Rcon({
      host: RCON_CONFIG.host,
      port: RCON_CONFIG.port,
      password: RCON_CONFIG.password
    });

    await rcon.connect();
    // Clean the player name to ensure it's just the username
    const cleanPlayerName = player.split(' ')[0];
    const response = await rcon.send(`pardon ${cleanPlayerName}`);
    await rcon.end();

    console.log('Unban response:', response);

    // Check if the unban was successful
    const success = response.toLowerCase().includes('unbanned') || 
                   response.toLowerCase().includes('not banned');

    return {
      success,
      message: response
    };
  } catch (error) {
    console.error(`Failed to unban player ${player}:`, error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Helper function to kick a player
async function kickPlayer(player) {
  try {
    const rcon = new Rcon({
      host: RCON_CONFIG.host,
      port: RCON_CONFIG.port,
      password: RCON_CONFIG.password
    });

    await rcon.connect();
    const response = await rcon.send(`kick ${player}`);
    await rcon.end();

    return {
      success: true,
      message: response
    };
  } catch (error) {
    console.error(`Failed to kick player ${player}:`, error);
    return {
      success: false,
      message: error.message
    };
  }
}

export async function POST(request) {
  try {
    const { action, command, player, opAction } = await request.json();

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
        try {
          console.log('Attempting to start server...');
          await startServer();
          console.log('Server start command sent successfully');
          
          // Wait a bit for the server to start up
          await new Promise(resolve => setTimeout(resolve, 10000));
          
          // Check if server is now online
          const status = await checkServerStatus();
          return NextResponse.json({
            success: true,
            status: status.status,
            message: 'Server starting...',
            error: null
          });
        } catch (error) {
          console.error('Failed to start server:', error);
          return NextResponse.json({
            success: false,
            status: 'error',
            message: `Failed to start server: ${error.message}`,
            error: error.message
          }, { status: 500 });
        }

      case 'stop':
        try {
          console.log('Attempting to stop server...');
          await stopServer();
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

      case 'checkOp':
        if (!player) {
          return NextResponse.json({
            success: false,
            message: 'No player specified',
            error: 'No player specified'
          }, { status: 400 });
        }

        const isOp = await checkPlayerOp(player);
        return NextResponse.json({
          success: true,
          isOp
        });

      case 'toggleOp':
        if (!player || opAction === undefined) {
          return NextResponse.json({
            success: false,
            message: 'Missing player or opAction',
            error: 'Missing parameters'
          }, { status: 400 });
        }

        const result = await togglePlayerOp(player, opAction);
        return NextResponse.json(result);

      case 'getBannedPlayers':
        const bannedPlayers = await getBannedPlayers();
        return NextResponse.json({
          success: true,
          bannedPlayers
        });

      case 'banPlayer':
        if (!player) {
          return NextResponse.json({
            success: false,
            message: 'No player specified',
            error: 'No player specified'
          }, { status: 400 });
        }
        const banResult = await banPlayer(player);
        return NextResponse.json(banResult);

      case 'unbanPlayer':
        if (!player) {
          return NextResponse.json({
            success: false,
            message: 'No player specified',
            error: 'No player specified'
          }, { status: 400 });
        }
        const unbanResult = await unbanPlayer(player);
        return NextResponse.json(unbanResult);

      case 'kickPlayer':
        if (!player) {
          return NextResponse.json({
            success: false,
            message: 'No player specified',
            error: 'No player specified'
          }, { status: 400 });
        }
        const kickResult = await kickPlayer(player);
        return NextResponse.json(kickResult);

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