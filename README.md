# Sentinel

A Discord moderation bot with counting game abuse detection. Automatically blacklists users who abuse guild saves in counting channels, and provides a full suite of moderation slash commands.

## Features

- **Counting abuse detection** — monitors a configured counting channel and automatically blacklists users who trigger too many guild saves within a time window
- **Sticky roles** — mute and counting blacklist roles are re-applied if a user leaves and rejoins
- **Infraction tracking** — every moderation action is logged to a database with case numbers, reasons, and expiry times
- **Mod logs** — configurable channels for moderation logs and ban logs
- **Appeal links** — per-action configurable appeal URLs sent to users in DMs
- **Temporary actions** — tempban and tempmute with automatic expiry

## Privacy

The Privacy Policy at https://sentinelbot.tech/privacy applies only to the Sentinel instance operated by Param Chandarana.

If you self-host Sentinel, you run your own Discord application and are the operator of your own instance. You are responsible for how that instance handles data and must publish your own privacy policy. Do not link to or reuse the policy above.

## Requirements

- Node.js 22+
- PostgreSQL 16+
- A Discord bot with the following:
  - **Scopes**: `bot`, `applications.commands`
  - **Permissions**: View Audit Log, Manage Roles, Kick Members, Ban Members, Send Messages, Embed Links, Read Message History
  - **Privileged intents**: Message Content Intent (required for counting bot detection)

## Setup

### 1. Clone and install

```bash
git clone https://github.com/param-chandarana/sentinel.git
cd sentinel
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

```env
NODE_ENV=development
BOT_TOKEN=         # From Discord Developer Portal → Bot → Reset Token
CLIENT_ID=         # From Discord Developer Portal → General Information → Application ID
GUILD_ID=          # Optional: your server ID for instant guild-scoped command deploy
DATABASE_URL=      # PostgreSQL connection string
POSTGRES_USER=     # Postgres username
POSTGRES_PASSWORD= # Postgres password
POSTGRES_DB=       # Database name
DB_SSL=false       # Change to true for production
COUNTING_BOT_ID=   # User ID of the counting bot to monitor
REQUIRE_MEMBER_INTENT=false
```

### 3. Run database migrations

```bash
npx prisma migrate deploy
```

### 4. Start the bot

```bash
npm run dev       # development (auto-restart on file changes)
npm start         # production
```

### 5. Register slash commands

Run once after first setup, and again any time commands are added or changed:

```bash
# Instant (guild-specific, for testing):
GUILD_ID=your_server_id node src/deploy-commands.js

# Global (all guilds, takes up to 1 hour to propagate):
node src/deploy-commands.js
```

## Docker

```bash
# Start everything (bot + Postgres):
docker compose up -d

# View logs:
docker compose logs -f sentinel

# Rebuild after code changes:
docker compose up -d --build

# Stop:
docker compose down
```

The entrypoint automatically runs `prisma migrate deploy` before starting the bot. You still need to run the deploy script manually to register slash commands.

## Commands

### Configuration
> Requires **Manage Server** permission.

| Command | Description |
|---|---|
| `/config view` | Show all current server settings |
| `/config muterole` | Set or remove the mute role |
| `/config countingblacklistrole` | Set or remove the counting blacklist role |
| `/config countingtimelimit` | Set or remove the counting abuse time window |
| `/config countingchannel` | Set or remove the counting channel |
| `/config modlogchannel` | Set or remove the mod log channel |
| `/config banlogchannel` | Set or remove the ban log channel |
| `/config joinlogchannel` | Set or remove the join log channel |
| `/config leavelogchannel` | Set or remove the leave log channel |
| `/config permissions` | Add or remove permission roles for a command |
| `/config appeallink` | Set or remove an appeal link for a moderation action |

### Moderation

| Command | Permission | Description |
|---|---|---|
| `/warn` | Warn permission or Manage Server | Warn a user |
| `/mute` | Mute permission or Manage Server | Mute a user (role-based) |
| `/tempmute` | Mute permission or Manage Server | Temporarily mute a user |
| `/unmute` | Mute permission or Manage Server | Remove a mute |
| `/kick` | Kick permission or Kick Members | Kick a user |
| `/ban` | Ban permission or Ban Members | Ban a user |
| `/tempban` | Ban permission or Ban Members | Temporarily ban a user |
| `/unban` | Ban permission or Ban Members | Unban a user |
| `/massban` | Ban permission or Ban Members | Ban multiple users at once |
| `/countingblacklist` | Counting Blacklist permission or Manage Server | Manually blacklist a user from counting |
| `/countingunblacklist` | Counting Blacklist permission or Manage Server | Remove a counting blacklist |

### Infractions

| Command | Description |
|---|---|
| `/infraction list` | List infractions for a user or the whole server |
| `/infraction edit` | Edit the reason on an existing infraction |
| `/infraction delete` | Soft-delete an infraction |

### Utility

| Command | Description |
|---|---|
| `/ping` | Check bot latency |
| `/random number` | Generate a random number from 1 to N |
| `/random range` | Generate a random number between two values |
| `/random pick` | Pick a random item from a comma-separated list |

## Counting Abuse Detection

When the counting bot posts a message containing `"guild save!"` in the configured counting channel, Sentinel tracks how many times each mentioned user has triggered a save within the configured time window. If the threshold is reached (≥ 2 saves in the window), the user is automatically:

1. Sent a DM with the reason and appeal link (if configured)
2. Assigned the counting blacklist role
3. Logged in the infractions database
4. Announced in the counting channel

Configure it with:
```
/config countingchannel set #your-channel
/config countingblacklistrole set @Blacklisted
/config countingtimelimit set 60   ← minutes
```
