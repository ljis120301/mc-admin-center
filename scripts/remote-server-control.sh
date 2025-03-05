#!/bin/bash

# Configuration
SERVER_USER="jason"
SERVER_HOST="100.88.145.94"
SERVER_PATH="/home/jason/Documents/Fast-Share/mc-server-new"
START_SCRIPT="start-forge.sh"
SCREEN_BASE_NAME="mc.whoisjason.me"
SSH_KEY="$HOME/.ssh/id_rsa"  # Path to your SSH key

# Debug function
debug() {
    echo "[DEBUG] $1"
}

# Function to generate unique screen name
generate_screen_name() {
    local timestamp=$(date +%s)
    echo "${timestamp}.${SCREEN_BASE_NAME}"
}

# SSH command wrapper with key authentication
ssh_cmd() {
    local cmd="$1"
    debug "Executing SSH command: $cmd"
    local output=$(ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_HOST "$cmd" 2>&1)
    local result=$?
    debug "SSH command output: $output"
    debug "SSH command result: $result"
    echo "$output"
    return $result
}

# Function to force remove all matching screen sessions
force_remove_screens() {
    debug "Force removing all matching screen sessions..."
    local output=$(ssh_cmd "screen -ls")
    debug "Current screen sessions: $output"
    
    # Get all sessions matching our base name
    local sessions=$(echo "$output" | grep "$SCREEN_BASE_NAME" | awk '{print $1}')
    
    if [ ! -z "$sessions" ]; then
        debug "Found matching sessions to remove: $sessions"
        for session in $sessions; do
            debug "Removing session: $session"
            ssh_cmd "screen -X -S $session quit"
        done
        sleep 2
        
        # Verify removal
        output=$(ssh_cmd "screen -ls")
        if echo "$output" | grep -q "$SCREEN_BASE_NAME"; then
            debug "Failed to remove some screen sessions"
            return 1
        else
            debug "Successfully removed all matching screen sessions"
            return 0
        fi
    else
        debug "No matching screen sessions found"
        return 0
    fi
}

# Function to check if server is running
check_server() {
    debug "Checking server status..."
    
    # First force remove any existing sessions
    force_remove_screens
    
    # Now check if we can create a new session
    local screen_name=$(generate_screen_name)
    debug "Testing with new session name: $screen_name"
    
    # Try to create a test session
    ssh_cmd "cd $SERVER_PATH && screen -dmS $screen_name echo 'test'"
    local result=$?
    
    if [ $result -eq 0 ]; then
        # Clean up test session
        ssh_cmd "screen -X -S $screen_name quit"
        debug "Server is not running (test session created successfully)"
        return 1
    else
        debug "Server might be running (failed to create test session)"
        return 0
    fi
}

# Function to start server
start_server() {
    debug "Starting Minecraft server..."
    
    # Force remove any existing sessions first
    if ! force_remove_screens; then
        echo "Failed to remove existing screen sessions"
        return 1
    fi
    
    # Generate new unique screen name
    local screen_name=$(generate_screen_name)
    debug "Using new screen session name: $screen_name"
    
    # Verify we're in the correct directory and the start script exists
    debug "Checking start script..."
    ssh_cmd "cd $SERVER_PATH && ls -l $START_SCRIPT"
    
    # Start the server
    debug "Attempting to start server in new screen session..."
    ssh_cmd "cd $SERVER_PATH && screen -dmS $screen_name ./$START_SCRIPT"
    local result=$?
    
    if [ $result -eq 0 ]; then
        echo "Server start command sent successfully"
        debug "Screen session created successfully"
        return 0
    else
        echo "Failed to start server"
        debug "Start command failed with result: $result"
        return 1
    fi
}

# Function to stop server
stop_server() {
    debug "Stopping Minecraft server..."
    force_remove_screens
    echo "Server stop command sent successfully"
    return 0
}

# Function to restart server
restart_server() {
    debug "Restarting server..."
    stop_server
    sleep 5
    start_server
}

# Main command handling
case "$1" in
    "start")
        if check_server; then
            echo "Server is already running"
        else
            start_server
        fi
        ;;
    "stop")
        if check_server; then
            stop_server
        else
            echo "Server is not running"
        fi
        ;;
    "restart")
        restart_server
        ;;
    "status")
        if check_server; then
            echo "Server is running"
        else
            echo "Server is not running"
        fi
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac 