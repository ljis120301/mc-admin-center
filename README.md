# Minecraft Server Admin Web Portal

A Next.js implementation of a Minecraft admin web portal that allows you to easily manage your Minecraft server through RCON. This web interface enables you to:

- Run server commands
- Start, stop, and restart your server
- Monitor server status and player list
- Execute RCON commands
- View server logs

## Prerequisites

Before setting up the web portal, ensure your Minecraft server has RCON enabled:

1. Open your server's `server.properties` file
2. Set the following properties:
   ```
   enable-rcon=true
   rcon.port=25575
   rcon.password=your_secure_password
   ```

## Getting Started

1. Clone the project:
   ```bash
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```bash
   cd mc-admin-center
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Create a `.env.local` file in the root directory with the following variables:
   ```
   MINECRAFT_HOST=minecraft-server-ip
   MINECRAFT_PORT=25575
   RCON_PASSWORD=your_secure_password
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:3000`

## Features

- Real-time server status monitoring
- Player list management
- Command console for executing server commands
- Server control (start/stop/restart)
- Secure RCON connection
- Modern, responsive web interface
