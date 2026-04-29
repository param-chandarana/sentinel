import { commandRegistry } from '../commands/index.js';
import { getGuildConfig } from '../config/guildConfig.js';
import { parseCommand } from '../utils/parseCommands.js';

const COUNTING_BOT_ID = process.env.COUNTING_BOT_ID;

export default async (message) => {
  // Ignore DMs
  if (!message.guild) return;

  // Ignore all bots except the counting bot
  if (message.author.bot && message.author.id !== COUNTING_BOT_ID) return;

  // Counting bot: only handle guild save messages, nothing else
  if (message.author.id === COUNTING_BOT_ID) {
    if (message.content.toLowerCase().includes('guild save!')) {
      const { handleGuildSave } = await import('../handlers/guildSaveTracker.js');
      await handleGuildSave(message);
    }
    return; // counting bot never triggers normal commands
  }

  // Fetch guild config from DB (prefix, etc.)
  const config = await getGuildConfig(message.guild.id);
  const prefix = config?.prefix ?? '?';

  // Parse the message into { command, args }
  const parsed = parseCommand(message, prefix);
  if (!parsed.command) return;

  // Look up command in registry
  const handler = commandRegistry.get(parsed.command);
  if (!handler) return;

  // Execute — all permission checking happens inside the handler
  try {
    const execute = typeof handler === 'function' ? handler : handler.execute;

    if (typeof execute !== 'function') {
      throw new TypeError(`Command "${parsed.command}" does not expose an executable handler.`);
    }

    await execute(message, parsed.args, prefix, config);
  } catch (err) {
    console.error(`Error in command "${parsed.command}":`, err);
    await message.channel
      .send({
        embeds: [
          {
            description: 'Something went wrong. Please try again.',
            color: 0xe74c3c,
          },
        ],
      })
      .catch(() => {}); // swallow if we can't even send the error
  }
};
