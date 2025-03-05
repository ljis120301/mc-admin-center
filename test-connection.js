const util = require('minecraft-server-util');
const Rcon = require('rcon-client').Rcon;

const config = {
  host: '100.88.145.94',
  port: 25575,
  gamePort: 25565,
  password: 'jason'
};

async function testConnection() {
  try {
    console.log('Testing connection to server:', {
      host: config.host,
      gamePort: config.gamePort,
      rconPort: config.port
    });

    // First test basic server status on game port
    console.log('\nTesting basic server status on game port...');
    try {
      const status = await util.status(config.host, config.gamePort);
      console.log('Server status:', status);
    } catch (statusError) {
      console.error('Failed to get server status:', statusError);
    }

    // Then test RCON connection
    console.log('\nTesting RCON connection...');
    try {
      const rcon = new Rcon({
        host: config.host,
        port: config.port,
        password: config.password
      });

      await rcon.connect();
      console.log('RCON connection established!');

      const response = await rcon.send('list');
      console.log('RCON response:', response);

      await rcon.end();
    } catch (rconError) {
      console.error('RCON connection failed:', rconError);
      console.log('\nTroubleshooting steps:');
      console.log('1. Check if server.properties has enable-rcon=true');
      console.log('2. Verify rcon.port matches the port in config');
      console.log('3. Verify server is running and RCON is initialized');
      console.log('4. Try connecting with telnet to verify port is open:');
      console.log(`   telnet ${config.host} ${config.port}`);
    }
  } catch (error) {
    console.error('Connection error:', error);
    console.log('\nTroubleshooting steps:');
    console.log('1. Check if server is running');
    console.log('2. Verify IP address is correct');
    console.log('3. Check if port is open and accessible');
    console.log('4. Try connecting to the game port (25565) first');
  }
}

testConnection(); 