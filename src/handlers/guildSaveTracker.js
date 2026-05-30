import { getGuildConfig } from '../config/guildConfig.js';
import { send, SUCCESS_COLOR } from '../utils/embedBuilder.js';
import { replyError } from '../utils/errors.js';
import { mentionUser } from '../utils/mentions.js';
import { toBigIntMs } from '../utils/time.js';

const guildSaveLog = new Map();
const MAX_AGE_MS = 60n * 60n * 1000n; // 1 hour

// Clean up old entries every 30 minutes to prevent memory leak
setInterval(
  () => {
    const now = BigInt(Date.now());

    for (const [key, timestamps] of guildSaveLog.entries()) {
      const validTimestamps = timestamps
        .map((t) => toBigIntMs(t))
        .filter((t) => t !== null && now - t < MAX_AGE_MS);
      if (validTimestamps.length === 0) {
        guildSaveLog.delete(key);
      } else {
        guildSaveLog.set(key, validTimestamps);
      }
    }
  },
  30 * 60 * 1000,
);

export const handleGuildSave = async (message) => {
  const config = await getGuildConfig(message.guild.id);

  if (!config.countingBlacklistRole) return;
  if (!config.countingChannel) return;
  if (message.channel.id !== config.countingChannel) return;
  const countingWindowMs = toBigIntMs(config.countingWindowMs);
  if (!countingWindowMs) return;

  const mentioned = message.mentions.users.first();
  if (!mentioned) return;

  const now = BigInt(Date.now());
  const userId = mentioned.id;
  const guildKey = `${message.guild.id}:${userId}`;

  const timestamps = (guildSaveLog.get(guildKey) || [])
    .map((t) => toBigIntMs(t))
    .filter((t) => t !== null && now - t < countingWindowMs);
  timestamps.push(now);
  guildSaveLog.set(guildKey, timestamps);

  if (timestamps.length >= 2) {
    try {
      const member = await message.guild.members.fetch(userId);
      if (member.roles.cache.has(config.countingBlacklistRole)) return;

      await member.roles.add(config.countingBlacklistRole);
      // console.log(`[${message.guild.name}] Blacklisted ${member.user.tag}`);
      await send(message.channel, {
        title: 'Counting Blacklist',
        description: `${mentionUser(userId)} has been blacklisted for using too many guild saves.`,
        color: SUCCESS_COLOR,
      });
    } catch (err) {
      console.error(`Failed to assign blacklist role in guild ${message.guild.id}:`, err);
      // Notify channel with a friendly error message where possible
      await replyError(message, err).catch(() => {});
    }
  }
};
