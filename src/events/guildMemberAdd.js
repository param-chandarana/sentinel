import { getGuildConfig } from '../config/guildConfig.js';
import { getActiveBlacklistsForUser, getActiveMutesForUser } from '../db/queries/infraction.js';
import { replyError } from '../utils/errors.js';

export default async (member) => {
  if (!member.guild) return;

  try {
    const config = await getGuildConfig(member.guild.id);

    // 1. Re-apply sticky mute if applicable
    if (config.muteRole) {
      try {
        const activeMutes = await getActiveMutesForUser(member.guild.id, member.id);
        if (activeMutes.length > 0 && !member.roles.cache.has(config.muteRole)) {
          await member.roles.add(config.muteRole, 'Sticky mute re-applied on rejoin');
        }
      } catch (err) {
        console.error(`Failed to re-apply sticky mute in guild ${member.guild.id}:`, err);
      }
    }

    // 2. Re-apply sticky counting blacklist if applicable
    if (config.countingBlacklistRole) {
      try {
        const activeBlacklists = await getActiveBlacklistsForUser(member.guild.id, member.id);
        if (activeBlacklists.length > 0 && !member.roles.cache.has(config.countingBlacklistRole)) {
          await member.roles.add(
            config.countingBlacklistRole,
            'Sticky counting blacklist re-applied on rejoin',
          );
        }
      } catch (err) {
        console.error(
          `Failed to re-apply sticky counting blacklist in guild ${member.guild.id}:`,
          err,
        );
      }
    }
  } catch (err) {
    console.error(`Error in guildMemberAdd handler for guild ${member.guild.id}:`, err);
    await replyError(member, err).catch(() => {});
  }
};
