import { getGuildConfig } from '../config/guildConfig.js';
import { getActiveMutesForUser } from '../db/queries/infraction.js';
import { replyError } from '../utils/errors.js';

export default async (member) => {
  if (!member.guild) return;

  try {
    const config = await getGuildConfig(member.guild.id);
    if (!config.muteRole) return;

    const activeMutes = await getActiveMutesForUser(member.guild.id, member.id);
    if (activeMutes.length === 0) return;

    if (member.roles.cache.has(config.muteRole)) return;

    await member.roles.add(config.muteRole, 'Sticky mute re-applied on rejoin');
  } catch (err) {
    console.error(`Failed to re-apply sticky mute in guild ${member.guild.id}:`, err);
    await replyError(member, err).catch(() => {});
  }
};
