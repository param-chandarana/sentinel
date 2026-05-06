import { findGuild, upsertGuild } from '../db/queries/guild.js';
import { getPermissionRoles } from '../db/queries/permissionRole.js';

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
    const base = toConfig(config);

    // load permission roles and map to role mentions
    const [warnRoles, muteRoles, kickRoles, banRoles] = await Promise.all([
      getPermissionRoles(guildId, 'WARN'),
      getPermissionRoles(guildId, 'MUTE'),
      getPermissionRoles(guildId, 'KICK'),
      getPermissionRoles(guildId, 'BAN'),
    ]);

    const mapToMentions = (rows) =>
      rows && rows.length > 0 ? rows.map((r) => `<@&${r.roleId}>`) : [];

    return {
      ...base,
      warnPermissionRoles: mapToMentions(warnRoles),
      mutePermissionRoles: mapToMentions(muteRoles),
      kickPermissionRoles: mapToMentions(kickRoles),
      banPermissionRoles: mapToMentions(banRoles),
    };
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
