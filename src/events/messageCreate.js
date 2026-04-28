import { handleBlacklist } from '../commands/blacklist.js';
import { handleConfig } from '../commands/config.js';
import { handleRandom } from '../commands/random.js';
import { handleUnblacklist } from '../commands/unblacklist.js';
import { getGuildConfig } from '../config/guildConfig.js';
import { handleGuildSave } from '../handlers/guildSaveTracker.js';

const COUNTING_BOT_ID = '510016054391734273';

const parseCommand = (message, prefix) => {
  let content = message.content.trim();

  // Check for bot mention (handles both <@ID> and <@!ID> formats)
  const mentionRegex = new RegExp(`^<@!?${message.client.user.id}>\\s+`);
  if (mentionRegex.test(content)) {
    content = content.replace(mentionRegex, '').trim();
    const parts = content.split(/\s+/);
    return { command: parts[0]?.toLowerCase(), args: parts.slice(1) };
  }

  // Check for prefix
  // TODO: Make this check case insensitive
  if (content.startsWith(prefix)) {
    content = content.slice(prefix.length).trim();
    const parts = content.split(/\s+/);
    return { command: parts[0]?.toLowerCase(), args: parts.slice(1) };
  }

  return { command: null, args: [] };
};

// Might wanna refactor this entire file as more commands get added

export default async (message) => {
  if (!message.guild) return;
  if (message.author.bot && message.author.id !== COUNTING_BOT_ID) return;

  const config = getGuildConfig(message.guild.id);
  const prefix = config.prefix;

  if (!message.author.bot) {
    const { command, args } = parseCommand(message, prefix);

    if (command === 'config') {
      await handleConfig(message, args, prefix);
      return;
    }

    if (command === 'blacklist') {
      await handleBlacklist(message, args, prefix);
      return;
    }

    if (command === 'unblacklist') {
      await handleUnblacklist(message, args, prefix);
      return;
    }

    if (command === 'random') {
      await handleRandom(message, args, prefix);
      return;
    }
  }

  // TODO: Make sure the bot doesn't respond to commands written by the counting bot
  // e.g., if counting bot writes "!random 10" for whatever reason, the bot should not respond to that command
  // The current implementation will fail if the bot writes something like "?<command> @user guild save!""
  // Ofc it won't actually do that but it's better to check it anyway

  if (
    message.author.id === COUNTING_BOT_ID &&
    message.content.toLowerCase().includes('guild save!')
  ) {
    await handleGuildSave(message);
  }
};
