# Use official Node.js LTS image
FROM node:20-alpine

# Install su-exec for proper user switching
RUN apk add --no-cache su-exec

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy application code
COPY src/ ./src/

# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create data directory for configs
RUN mkdir -p ./data

# Run as non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Start the bot with entrypoint script
ENTRYPOINT ["docker-entrypoint.sh"]
