import prisma from '../db/index.js';

const defaults = {
  blacklistRoleId: null,
  countingChannelId: null,
  windowMs: 10 * 60 * 1000,
  prefix: '?',
};

const toConfig = (record) => {
  if (!record) return { ...defaults };

  return {
    blacklistRoleId: record.blacklistRoleId,
    countingChannelId: record.countingChannelId,
    windowMs: record.windowMs,
    prefix: record.prefix,
  };
};

const sanitizeUpdates = (updates) => {
  const allowedKeys = ['blacklistRoleId', 'countingChannelId', 'windowMs', 'prefix'];
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
    const config = await prisma.guildConfig.findUnique({ where: { guildId } });
    return toConfig(config);
  } catch (err) {
    console.error(`Failed to load guild config for guild ${guildId}:`, err);
    return { ...defaults };
  }
};

export const setGuildConfig = async (guildId, updates) => {
  const payload = sanitizeUpdates(updates);

  try {
    const config = await prisma.guildConfig.upsert({
      where: { guildId },
      update: payload,
      create: { guildId, ...payload },
    });

    return toConfig(config);
  } catch (err) {
    console.error(`Failed to update guild config for guild ${guildId}:`, err);
    return getGuildConfig(guildId);
  }
};
