'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import Button from "@/components/ui/button";
import { Terminal, Command } from "@/components/ui/terminal";

export default function Home() {
  const [serverStatus, setServerStatus] = useState('offline');
  const [playerList, setPlayerList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [serverInfo, setServerInfo] = useState({
    maxPlayers: 0,
    version: null,
    error: null
  });
  const [command, setCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState([]);
  const [commandOutput, setCommandOutput] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [playerOpStatus, setPlayerOpStatus] = useState({});
  const [bannedPlayers, setBannedPlayers] = useState([]);
  const [isLoadingBanned, setIsLoadingBanned] = useState(false);

  // Function to check for server updates
  const checkServerStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'refresh' }),
      });
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to get server status');
      }

      // Only update if there are actual changes
      const hasChanges = 
        data.status !== serverStatus ||
        JSON.stringify(data.players) !== JSON.stringify(playerList) ||
        data.maxPlayers !== serverInfo.maxPlayers ||
        data.version !== serverInfo.version;

      if (hasChanges) {
        setServerStatus(data.status || 'offline');
        setPlayerList(data.players || []);
        setServerInfo({
          maxPlayers: data.maxPlayers || 0,
          version: data.version || null,
          error: data.error || null
        });
        setLastUpdate(new Date());

        // Check OP status for new players
        if (data.players) {
          data.players.forEach(player => {
            if (!(player in playerOpStatus)) {
              checkPlayerOpStatus(player);
            }
          });
        }
      }
    } catch (error) {
      console.error('Error checking server status:', error);
      setError(error.message || 'Failed to check server status');
    }
  }, [serverStatus, playerList, serverInfo, playerOpStatus]);

  // Function to get banned players
  const getBannedPlayers = async () => {
    setIsLoadingBanned(true);
    try {
      const response = await fetch('/api/server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'getBannedPlayers' }),
      });
      const data = await response.json();
      
      if (data.success) {
        setBannedPlayers(data.bannedPlayers);
      }
    } catch (error) {
      console.error('Failed to get banned players:', error);
      setError('Failed to get banned players list');
    } finally {
      setIsLoadingBanned(false);
    }
  };

  // Function to handle player actions (kick/ban)
  const handlePlayerAction = async (player, action) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: action === 'kick' ? 'kickPlayer' : 'banPlayer',
          player 
        }),
      });
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || `Failed to ${action} player`);
      }

      // Refresh player lists
      checkServerStatus();
      getBannedPlayers();
    } catch (error) {
      console.error(`Failed to ${action} player:`, error);
      setError(error.message || `Failed to ${action} player`);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle unban
  const handleUnban = async (player) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'unbanPlayer',
          player 
        }),
      });
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to unban player');
      }

      // Refresh banned players list
      getBannedPlayers();
    } catch (error) {
      console.error('Failed to unban player:', error);
      setError(error.message || 'Failed to unban player');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial server status check
  useEffect(() => {
    checkServerStatus();
    getBannedPlayers();
  }, []);

  // Set up polling interval
  useEffect(() => {
    const pollInterval = setInterval(checkServerStatus, 5000); // Check every 5 seconds

    return () => clearInterval(pollInterval);
  }, [checkServerStatus]);

  // Function to check OP status for a player
  const checkPlayerOpStatus = async (player) => {
    try {
      const response = await fetch('/api/server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'checkOp',
          player 
        }),
      });
      const data = await response.json();
      
      if (data.success) {
        setPlayerOpStatus(prev => ({
          ...prev,
          [player]: data.isOp
        }));
      }
    } catch (error) {
      console.error(`Failed to check OP status for ${player}:`, error);
    }
  };

  // Function to toggle OP status
  const togglePlayerOp = async (player, currentStatus) => {
    try {
      const response = await fetch('/api/server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'toggleOp',
          player,
          opAction: !currentStatus
        }),
      });
      const data = await response.json();
      
      if (data.success) {
        setPlayerOpStatus(prev => ({
          ...prev,
          [player]: !currentStatus
        }));
      } else {
        throw new Error(data.message || 'Failed to toggle OP status');
      }
    } catch (error) {
      console.error(`Failed to toggle OP status for ${player}:`, error);
      setError(error.message || 'Failed to toggle OP status');
    }
  };

  const handleServerAction = async (action, commandText = null) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/server', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action,
          command: commandText 
        }),
      });
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to execute action');
      }

      // Handle different actions
      switch (action) {
        case 'start':
        case 'stop':
        case 'restart':
          // Wait a moment and then check status
          setTimeout(checkServerStatus, 5000);
          break;
        case 'command':
          // Add command to history and output
          setCommandHistory(prev => [...prev, commandText]);
          setCommandOutput(prev => [...prev, data.output]);
          setCommand(''); // Clear command input
          break;
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'An error occurred while communicating with the server');
      setServerStatus('offline');
      setPlayerList([]);
      setServerInfo({
        maxPlayers: 0,
        version: null,
        error: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommandSubmit = (e) => {
    e.preventDefault();
    if (command.trim() && serverStatus === 'online') {
      handleServerAction('command', command.trim());
    }
  };

  return (
    <div className="p-8 bg-[#1A1A1A] min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Error Message */}
        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        {/* Server Status */}
        <div className="bg-[#2C2C2C] rounded-lg shadow-lg p-6 mb-6 border border-[#3C3C3C]">
          <h2 className="text-xl font-semibold mb-4 text-white">Server Status</h2>
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-3 h-3 rounded-full ${serverStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="capitalize text-white">{serverStatus}</span>
            {isLoading && <span className="text-sm text-gray-400">(Updating...)</span>}
            {lastUpdate && (
              <span className="text-sm text-gray-400">
                (Last updated: {lastUpdate.toLocaleTimeString()})
              </span>
            )}
          </div>
          
          {/* Server Info */}
          <div className="mt-4 space-y-2 text-sm text-gray-300">
            {serverInfo.version && (
              <div>Version: {serverInfo.version}</div>
            )}
            {serverInfo.maxPlayers > 0 && (
              <div>Max Players: {serverInfo.maxPlayers}</div>
            )}
            {serverInfo.error && (
              <div className="text-red-400">Connection Error: {serverInfo.error}</div>
            )}
          </div>
        </div>

        {/* Players Tabs */}
        <div className="bg-[#2C2C2C] rounded-lg shadow-lg p-6 mb-6 border border-[#3C3C3C]">
          <Tabs defaultValue="online" className="w-full">
            <TabsList className="mb-4 bg-[#1A1A1A] p-1 rounded-none flex gap-1">
              <TabsTrigger 
                value="online" 
                className="data-[state=active]:bg-[#4CAF50] data-[state=active]:text-white rounded-none"
              >
                <Button variant="green">
                  Online Players
                </Button>
              </TabsTrigger>
              <TabsTrigger 
                value="banned"
                className="data-[state=active]:bg-[#B71C1C] data-[state=active]:text-white rounded-none"
              >
                <Button variant="red">
                  Banned Players
                </Button>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="online">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#3C3C3C]">
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Player Name</TableHead>
                    <TableHead className="text-gray-300">OP Status</TableHead>
                    <TableHead className="text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {playerList.length > 0 ? (
                    playerList.map((player) => (
                      <TableRow key={player} className="border-[#3C3C3C]">
                        <TableCell className="text-gray-300">
                          <span className="w-2 h-2 bg-green-500 rounded-full inline-block mr-2"></span>
                          Online
                        </TableCell>
                        <TableCell className="text-gray-300">{player}</TableCell>
                        <TableCell>
                          {playerOpStatus[player] ? (
                            <span className="text-green-400 font-medium">OP</span>
                          ) : (
                            <span className="text-gray-400">Player</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => togglePlayerOp(player, playerOpStatus[player])}
                              disabled={isLoading}
                            >
                              {playerOpStatus[player] ? 'Remove OP' : 'Give OP'}
                            </Button>
                            <Button
                              onClick={() => handlePlayerAction(player, 'kick')}
                              disabled={isLoading}
                            >
                              Kick
                            </Button>
                            <Button
                              onClick={() => handlePlayerAction(player, 'ban')}
                              disabled={isLoading}
                            >
                              Ban
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow className="border-[#3C3C3C]">
                      <TableCell colSpan={4} className="text-center text-gray-400">
                        No players online
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="banned">
              <div className="flex justify-end mb-4">
                <Button
                  onClick={getBannedPlayers}
                  disabled={isLoadingBanned}
                >
                  {isLoadingBanned ? 'Refreshing...' : 'Refresh List'}
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="border-[#3C3C3C]">
                    <TableHead className="text-gray-300">Player Name</TableHead>
                    <TableHead className="text-gray-300">Ban Reason</TableHead>
                    <TableHead className="text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingBanned ? (
                    <TableRow className="border-[#3C3C3C]">
                      <TableCell colSpan={3} className="text-center text-gray-400">
                        Loading banned players...
                      </TableCell>
                    </TableRow>
                  ) : bannedPlayers.length > 0 ? (
                    bannedPlayers.map((player) => (
                      <TableRow key={player.name} className="border-[#3C3C3C]">
                        <TableCell className="font-medium text-gray-300">{player.name}</TableCell>
                        <TableCell className="text-gray-400">{player.reason}</TableCell>
                        <TableCell>
                          <Button
                            onClick={() => handleUnban(player.name)}
                            disabled={isLoading}
                          >
                            Unban
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow className="border-[#3C3C3C]">
                      <TableCell colSpan={3} className="text-center text-gray-400">
                        No banned players
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </div>

        {/* Command Console */}
        <div className="bg-[#2C2C2C] rounded-lg shadow-lg p-6 mb-6 border border-[#3C3C3C]">
          <h2 className="text-xl font-semibold mb-4 text-white">Command Console</h2>
          <Terminal>
            {commandHistory.map((cmd, index) => (
              <Command 
                key={index}
                command={cmd}
                output={commandOutput[index]}
              />
            ))}
          </Terminal>
          <form onSubmit={handleCommandSubmit} className="flex gap-2 mt-4">
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Enter command..."
              className="flex-1 px-4 py-2 bg-[#1A1A1A] border border-[#3C3C3C] rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-300 placeholder-gray-500"
              disabled={serverStatus !== 'online'}
            />
            <Button
              type="submit"
              disabled={isLoading || serverStatus !== 'online'}
            >
              Send
            </Button>
          </form>
        </div>

        {/* Server Controls */}
        <div className="bg-[#2C2C2C] rounded-lg shadow-lg p-6 border border-[#3C3C3C]">
          <h2 className="text-xl font-semibold mb-4 text-white">Server Controls</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => handleServerAction('start')}
              disabled={isLoading || serverStatus === 'online'}
              variant="server-start"
            >
              Start Server
            </Button>
            <Button
              onClick={() => handleServerAction('stop')}
              disabled={isLoading || serverStatus === 'offline'}
              variant="server-stop"
            >
              Stop Server
            </Button>
            <Button
              onClick={() => handleServerAction('restart')}
              disabled={isLoading}
              variant="server-restart"
            >
              Restart Server
            </Button>
            <Button
              onClick={checkServerStatus}
              disabled={isLoading}
              variant="server-refresh"
            >
              Refresh Status
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
