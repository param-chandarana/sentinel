import { findGuild, upsertGuild } from '../db/queries/guild.js';
import { getPermissionRoles } from '../db/queries/permissionRole.js';

const defaults = {
  countingBlacklistRole: null,
  countingChannel: null,
  countingWindowMs: null,
  muteRole: null,
  modLogChannel: null,
  banLogChannel: null,
  joinLogChannel: null,
  leaveLogChannel: null,
  prefix: '?',
};

const permissionRoleDefaults = {
  warnPermissionRoles: [],
  mutePermissionRoles: [],
  kickPermissionRoles: [],
  banPermissionRoles: [],
  countingBlacklistPermissionRoles: [],
  manageInfractionsPermissionRoles: [],
  timeoutPermissionRoles: [],
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

export const getGuildConfigWithPermissionRoles = async (guildId) => {
  const baseConfig = await getGuildConfig(guildId);

  try {
    const [
      warnRoles,
      muteRoles,
      kickRoles,
      banRoles,
      countingBlacklistRoles,
      manageInfractionsRoles,
      timeoutRoles,
    ] = await Promise.all([
      getPermissionRoles(guildId, 'WARN'),
      getPermissionRoles(guildId, 'MUTE'),
      getPermissionRoles(guildId, 'KICK'),
      getPermissionRoles(guildId, 'BAN'),
      getPermissionRoles(guildId, 'COUNTINGBLACKLIST'),
      getPermissionRoles(guildId, 'MANAGEINFRACTIONS'),
      getPermissionRoles(guildId, 'TIMEOUT'),
    ]);

    const mapToMentions = (rows) =>
      rows && rows.length > 0 ? rows.map((r) => `<@&${r.roleId}>`) : [];

    return {
      ...baseConfig,
      warnPermissionRoles: mapToMentions(warnRoles),
      mutePermissionRoles: mapToMentions(muteRoles),
      kickPermissionRoles: mapToMentions(kickRoles),
      banPermissionRoles: mapToMentions(banRoles),
      countingBlacklistPermissionRoles: mapToMentions(countingBlacklistRoles),
      manageInfractionsPermissionRoles: mapToMentions(manageInfractionsRoles),
      timeoutPermissionRoles: mapToMentions(timeoutRoles),
    };
  } catch (err) {
    console.error(`Failed to load permission roles for guild ${guildId}:`, err);
    return { ...baseConfig, ...permissionRoleDefaults };
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
