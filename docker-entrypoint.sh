#!/bin/sh
set -e

# Ensure data directory exists and is writable
mkdir -p /app/data
chown -R nodejs:nodejs /app/data 2>/dev/null || chmod -R 777 /app/data

# If legacy config file exists, ensure it's writable
if [ -f /app/data/guildConfigs.json ]; then
  chown nodejs:nodejs /app/data/guildConfigs.json 2>/dev/null || chmod 666 /app/data/guildConfigs.json
fi

# Wait for Postgres to be reachable before migrating
echo "Waiting for database..."
until nc -z db 5432 > /dev/null 2>&1; do
  echo "Database not ready, retrying in 2s..."
  sleep 2
done
echo "Database is ready."

# Run database migrations before starting
echo "Running database migrations..."
npx prisma migrate deploy

# Switch to nodejs user and run the application
exec su-exec nodejs node src/index.js