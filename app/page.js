'use client';

import { useState, useEffect } from 'react';

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

  // Fetch initial server status
  useEffect(() => {
    handleServerAction('refresh');
  }, []);

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
        case 'refresh':
          setServerStatus(data.status || 'offline');
          setPlayerList(data.players || []);
          setServerInfo({
            maxPlayers: data.maxPlayers || 0,
            version: data.version || null,
            error: data.error || null
          });
          break;
        case 'start':
        case 'stop':
        case 'restart':
          // Wait a moment and then refresh status
          setTimeout(() => handleServerAction('refresh'), 5000);
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
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Minecraft Server Control Panel</h1>
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        {/* Server Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Server Status</h2>
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-3 h-3 rounded-full ${serverStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="capitalize">{serverStatus}</span>
            {isLoading && <span className="text-sm text-gray-500">(Updating...)</span>}
          </div>
          
          {/* Server Info */}
          <div className="mt-4 space-y-2 text-sm text-gray-600">
            {serverInfo.version && (
              <div>Version: {serverInfo.version}</div>
            )}
            {serverInfo.maxPlayers > 0 && (
              <div>Max Players: {serverInfo.maxPlayers}</div>
            )}
            {serverInfo.error && (
              <div className="text-red-500">Connection Error: {serverInfo.error}</div>
            )}
          </div>
        </div>

        {/* Player List */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Online Players</h2>
          <div className="space-y-2">
            {playerList.length > 0 ? (
              playerList.map((player, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>{player}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No players online</p>
            )}
          </div>
        </div>

        {/* Command Console */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Command Console</h2>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto mb-4">
            {commandHistory.map((cmd, index) => (
              <div key={index} className="mb-2">
                <span className="text-green-400">$</span> {cmd}
                {commandOutput[index] && (
                  <div className="mt-1 text-gray-300 whitespace-pre-wrap">
                    {commandOutput[index]}
                  </div>
                )}
              </div>
            ))}
          </div>
          <form onSubmit={handleCommandSubmit} className="flex gap-2">
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Enter command..."
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={serverStatus !== 'online'}
            />
            <button
              type="submit"
              disabled={isLoading || serverStatus !== 'online'}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </form>
        </div>

        {/* Server Controls */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Server Controls</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleServerAction('start')}
              disabled={isLoading || serverStatus === 'online'}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Start Server
            </button>
            <button
              onClick={() => handleServerAction('stop')}
              disabled={isLoading || serverStatus === 'offline'}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Stop Server
            </button>
            <button
              onClick={() => handleServerAction('restart')}
              disabled={isLoading}
              className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Restart Server
            </button>
            <button
              onClick={() => handleServerAction('refresh')}
              disabled={isLoading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Refresh Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
