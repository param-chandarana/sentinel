import { findGuild, upsertGuild } from '../db/queries/guild.js';

const defaults = {
  countingBlacklistRole: null,
  countingChannel: null,
  countingWindowMs: 10 * 60 * 1000,
  muteRole: null,
  modLogChannel: null,
  banLogChannel: null,
  joinLogChannel: null,
  leaveLogChannel: null,
  prefix: '?',
};

const toConfig = (record) => {
  if (!record) return { ...defaults };

  return {
    ...record,
  };
};

const sanitizeUpdates = (updates) => {
  const allowedKeys = [
    'countingBlacklistRole',
    'countingChannel',
    'countingWindowMs',
    'muteRole',
    'modLogChannel',
    'banLogChannel',
    'joinLogChannel',
    'leaveLogChannel',
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
