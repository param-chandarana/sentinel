# Sentinel

A Discord bot that monitors counting game guild saves and automatically blacklists users who abuse the feature.

## Setup

Clone and install:

```bash
git clone https://github.com/param-chandarana/sentinel.git
cd sentinel
npm install
```

Create `.env` file:

```env
BOT_TOKEN=your_bot_token_here
```

Start the bot:

```bash
npm start
```

## Commands

All commands can be used with the configured prefix (default: `s!`) or by mentioning the bot.

**Admin Commands** (Administrator permission required)

- `config show` - Display current configuration
- `config role <@role>` - Set the blacklist role
- `config channel <#channel>` - Set the counting channel
- `config timelimit <minutes>` - Set time window for tracking
- `config prefix <prefix>` - Change bot prefix

**Moderation Commands** (Manage Roles or Administrator)

- `blacklist <@user>` - Manually blacklist a user
- `unblacklist <@user>` - Remove blacklist from a user

## Deployment

### Docker

```bash
docker-compose up -d
docker-compose logs -f
```

### EC2

```bash
chmod +x deploy-ec2.sh
./deploy-ec2.sh
```

## Requirements

- Node.js 16.9.0+
- Discord bot with Manage Roles, Send Messages, and Read Messages permissions
- Bot role must be higher than the blacklist role in server hierarchy
