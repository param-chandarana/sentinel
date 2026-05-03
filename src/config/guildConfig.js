import { findGuild, upsertGuild } from '../db/queries/guild.js';

const defaults = {
  countingBlacklistRoleId: null,
  countingChannelId: null,
  countingWindowMs: 10 * 60 * 1000,
  prefix: '?',
};

const toConfig = (record) => {
  if (!record) return { ...defaults };

  return {
    countingBlacklistRoleId: record.countingBlacklistRoleId,
    countingChannelId: record.countingChannelId,
    countingWindowMs: record.countingWindowMs,
    prefix: record.prefix,
  };
};

const sanitizeUpdates = (updates) => {
  const allowedKeys = [
    'countingBlacklistRoleId',
    'countingChannelId',
    'countingWindowMs',
    'prefix',
  ];
  const payload = {};

  for (const key of allowedKeys) {
    if (updates[key] !== undefined) {
      payload[key] = updates[key];
    }
  }

  return payload;
};

export const getGuildConfig = async (guildId) => {
  try {
    const config = await findGuild(guildId);
    return toConfig(config);
  } catch (err) {
    console.error(`Failed to load guild config for guild ${guildId}:`, err);
    return { ...defaults };
  }
};

export const setGuildConfig = async (guildId, updates) => {
  const payload = sanitizeUpdates(updates);

  try {
    const config = await upsertGuild(guildId, payload);

    return toConfig(config);
  } catch (err) {
    console.error(`Failed to update guild config for guild ${guildId}:`, err);
    return getGuildConfig(guildId);
  }
};
