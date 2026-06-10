import { Client, IntentsBitField } from 'discord.js';
import 'dotenv/config';
import guildBanAdd from './events/guildBanAdd.js';
import guildBanRemove from './events/guildBanRemove.js';
import guildMemberAdd from './events/guildMemberAdd.js';
import messageCreate from './events/messageCreate.js';
import { startExpirationWorker } from './handlers/expirationWorker.js';
import { startQueueProcessor } from './utils/dmQueue.js';

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildModeration,
  ],
});

client.once('clientReady', () => {
  console.log(`Ready! Logged in as ${client.user.tag}`);
  console.log(`Bot is in ${client.guilds.cache.size} guilds`);
  client.guilds.cache.forEach((guild) => {
    console.log(`  - ${guild.name} (${guild.id})`);
  });

  startExpirationWorker(client);
  startQueueProcessor(client);
});

client.on('error', (error) => {
  console.error('Discord client error:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

process.on('SIGINT', () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  client.destroy();
  process.exit(0);
});

client.on('messageCreate', (message) => {
  messageCreate(message);
});

client.on('guildMemberAdd', (member) => {
  guildMemberAdd(member);
});

client.on('guildBanAdd', (ban) => {
  guildBanAdd(ban);
});

client.on('guildBanRemove', (ban) => {
  guildBanRemove(ban);
});

client.login(process.env.BOT_TOKEN);
