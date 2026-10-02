/**
 * deploy-commands.js
 *
 * Registers all slash commands with the Discord API.
 *
 * Usage:
 *   # Global (all guilds — can take up to 1 hour to propagate):
 *   node src/deploy-commands.js
 *
 *   # Guild-only (instant, good for testing):
 *   GUILD_ID=<your-guild-id> node src/deploy-commands.js
 *
 * Required env vars: BOT_TOKEN, CLIENT_ID
 * Optional env var:  GUILD_ID (deploy to a single guild instead of globally)
 */

import { REST, Routes } from 'discord.js';
import 'dotenv/config';

const { BOT_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

if (!BOT_TOKEN) throw new Error('Missing BOT_TOKEN in environment');
if (!CLIENT_ID) throw new Error('Missing CLIENT_ID in environment');

// Dynamically import the command collection to get all command data
const { commandCollection } = await import('./commands/index.js');
const commandData = [...commandCollection.values()].map((cmd) => cmd.data.toJSON());

const rest = new REST().setToken(BOT_TOKEN);

if (GUILD_ID) {
  // Guild-scoped deploy (instant)
  console.log(`Deploying ${commandData.length} commands to guild ${GUILD_ID}...`);
  const data = await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: commandData,
  });
  console.log(`Successfully registered ${data.length} guild commands.`);
} else {
  // Global deploy (up to 1 hour to propagate)
  console.log(`Deploying ${commandData.length} commands globally...`);
  const data = await rest.put(Routes.applicationCommands(CLIENT_ID), {
    body: commandData,
  });
  console.log(`Successfully registered ${data.length} global commands.`);
}
