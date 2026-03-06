#!/bin/sh
set -e

# Ensure data directory exists
mkdir -p /app/data

# Fix permissions on data directory
chown -R nodejs:nodejs /app/data 2>/dev/null || chmod -R 777 /app/data

# If config file exists, ensure it's writable
if [ -f /app/data/guildConfigs.json ]; then
    chown nodejs:nodejs /app/data/guildConfigs.json 2>/dev/null || chmod 666 /app/data/guildConfigs.json
fi

# Switch to nodejs user and run the application
exec su-exec nodejs node src/index.js
