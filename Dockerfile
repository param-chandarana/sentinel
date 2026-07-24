# Use official Node.js LTS image
FROM node:22.12-alpine

# Install su-exec and netcat for proper user switching and db health check
RUN apk add --no-cache su-exec netcat-openbsd

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy application code
COPY src/ ./src/

# Copy prisma schema and migrations
COPY prisma/ ./prisma/

# Generate Prisma client
RUN npx prisma generate

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