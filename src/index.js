import { Client, IntentsBitField } from 'discord.js';
import 'dotenv/config';
import guildMemberAdd from './events/guildMemberAdd.js';
import messageCreate from './events/messageCreate.js';
import { startExpirationWorker } from './handlers/expirationWorker.js';

const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
  ],
});

client.once('clientReady', () => {
  console.log(`Ready! Logged in as ${client.user.tag}`);
  console.log(`Bot is in ${client.guilds.cache.size} guilds`);
  client.guilds.cache.forEach((guild) => {
    console.log(`  - ${guild.name} (${guild.id})`);
  });
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

startExpirationWorker(client);

client.on('guildMemberAdd', (member) => {
  guildMemberAdd(member);
});

client.login(process.env.BOT_TOKEN);
