import { getGuildConfig } from '../config/guildConfig.js';

const guildSaveLog = new Map();

// Clean up old entries every 30 minutes to prevent memory leak
setInterval(
  () => {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hour

    for (const [key, timestamps] of guildSaveLog.entries()) {
      const validTimestamps = timestamps.filter((t) => now - t < maxAge);
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

  if (!config.countingBlacklistRoleId) return;
  if (!config.countingChannelId) return;
  if (message.channel.id !== config.countingChannelId) return;

  const mentioned = message.mentions.users.first();
  if (!mentioned) return;

  const now = Date.now();
  const userId = mentioned.id;
  const guildKey = `${message.guild.id}:${userId}`;

  const timestamps = (guildSaveLog.get(guildKey) || []).filter(
    (t) => now - t < config.countingWindowMs,
  );
  timestamps.push(now);
  guildSaveLog.set(guildKey, timestamps);

  if (timestamps.length >= 2) {
    try {
      const member = await message.guild.members.fetch(userId);
      if (member.roles.cache.has(config.countingBlacklistRoleId)) return;

      await member.roles.add(config.countingBlacklistRoleId);
      console.log(`[${message.guild.name}] Blacklisted ${member.user.tag}`);
      await message.channel.send(
        `<@${userId}> has been blacklisted for using too many guild saves.`,
      );
    } catch (err) {
      console.error(`Failed to assign blacklist role in guild ${message.guild.id}:`, err);
    }
  }
};
