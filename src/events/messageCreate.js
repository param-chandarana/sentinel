import { getGuildConfig } from '../config/guildConfig.js';
import { handleConfig } from '../commands/config.js';
import { handleBlacklist } from '../commands/blacklist.js';
import { handleUnblacklist } from '../commands/unblacklist.js';
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
  if (content.startsWith(prefix)) {
    content = content.slice(prefix.length).trim();
    const parts = content.split(/\s+/);
    return { command: parts[0]?.toLowerCase(), args: parts.slice(1) };
  }
  
  return { command: null, args: [] };
};

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
  }

  if (message.author.id === COUNTING_BOT_ID && message.content.toLowerCase().includes('guild save!')) {
    await handleGuildSave(message);
  }
};
