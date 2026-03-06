# Sentinel - Discord Counting Game Guardian

A Discord bot designed to monitor and manage counting game guild saves, automatically blacklisting users who abuse the guild save feature.

## Features

- **Automatic Blacklisting**: Tracks guild saves and blacklists repeat offenders
- **Configurable**: Per-guild settings for role, channel, time window, and prefix
- **Permission-Based**: Role hierarchy and permission checks
- **Flexible Commands**: Use prefix or mention the bot
- **Multi-Guild Support**: Independent configuration for each server

## Setup

### Prerequisites

- Node.js 16.9.0 or higher
- A Discord Bot Token ([Create one here](https://discord.com/developers/applications))
- Bot Permissions: Manage Roles, Send Messages, Read Messages

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd sentinel
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:

   ```env
   BOT_TOKEN=your_discord_bot_token_here
   ```

4. Start the bot:

   ```bash
   npm start
   ```

## Configuration

### Initial Setup

1. Invite the bot to your server with proper permissions
2. Create a role for blacklisted users (e.g., "Blacklisted")
3. Run the following commands:

```
s!config role @Blacklisted
s!config channel #counting
s!config timelimit 10
```

### Commands

All commands can be used with the configured prefix (default: `s!`) or by mentioning the bot.

#### Admin Commands (Requires Administrator)

- `config show` - Display current configuration
- `config role <@role>` - Set the blacklist role
- `config channel <#channel>` - Set the counting channel to monitor
- `config timelimit <minutes>` - Set time window for tracking guild saves
- `config prefix <prefix>` - Change the bot prefix (max 5 characters)

#### Moderation Commands (Requires Manage Roles or Administrator)

- `blacklist <@user>` - Manually blacklist a user
- `unblacklist <@user>` - Remove blacklist from a user

### How It Works

1. Bot monitors the configured counting channel
2. When the counting bot posts a "guild save!" message mentioning a user
3. Sentinel tracks how many times that user triggered a guild save
4. If the same user causes 2+ guild saves within the configured time window, they get blacklisted automatically

### Health Monitoring

The bot logs important events to console:

- Startup confirmation
- Blacklist actions (automated and manual)
- Configuration changes
- Error messages

Monitor these logs for operational insights.

## Bot Permissions

Required Discord permissions:

- **View Channels** - To see messages in configured channel
- **Send Messages** - To send messages
- **Read Message History** - To watch for counting bot's messages regarding guild saves
- **Send Messages** - To send blacklist notifications
- **Manage Roles** - To assign/remove blacklist role

**Important**: The bot's role must be **higher** than the blacklist role in the role hierarchy.

## File Structure

```
sentinel/
├── src/
│   ├── index.js                      # Bot entry point
│   ├── config/
│   │   └── guildConfig.js           # Guild configuration management
│   ├── commands/
│   │   ├── config.js                # Configuration commands
│   │   ├── blacklist.js             # Manual blacklist command
│   │   └── unblacklist.js           # Manual unblacklist command
│   ├── utils/
│   │   └── permissions.js           # Permission checking utilities
│   ├── handlers/
│   │   └── guildSaveTracker.js      # Guild save tracking logic
│   └── events/
│       └── messageCreate.js         # Message event handler
├── data/
│   └── guildConfigs.json            # Per-guild configuration (auto-generated)
├── .env                              # Environment variables
├── .gitignore
├── package.json
└── README.md
```
