import { getActiveBansForUser, setInfractionActive } from '../../db/queries/infraction.js';
import { getPermissionRoles } from '../../db/queries/permissionRole.js';
import { bindReply, ERROR_COLOR, SUCCESS_COLOR } from '../../utils/embedBuilder.js';
import { mentionUser } from '../../utils/mentions.js';
import { postModerationLogs } from '../../utils/moderationLogs.js';
import { hasBanMembers } from '../../utils/permissions.js';

export const unban = {
  name: 'unban',
  aliases: [],
  execute: async (message, args, prefix) => {
    const replyEmbed = bindReply(message);

    const targetArg = args[0];
    if (!targetArg) {
      await replyEmbed({
        title: 'Unban',
        description:
          'Please provide a user ID or mention to unban. e.g. `' +
          prefix +
          'unban 123456789012345678 [reason]`',
      });
      return;
    }

    const userId = message.mentions.users.first()?.id ?? targetArg.replace(/[<@!>]/g, '');

    try {
      // Simple permission check: owner or ban members or configured permission role
      if (message.member.guild.ownerId !== message.author.id) {
        const hasPerm = hasBanMembers(message.member);
        const roles = await getPermissionRoles(message.guild.id, 'BAN');
        const hasRole =
          roles.length > 0 && roles.some((r) => message.member.roles.cache.has(r.roleId));
        if (!hasPerm && !hasRole) {
          await replyEmbed({
            title: 'Permission Denied',
            description:
              'You need Ban Members permission or a configured role to use this command.',
            color: ERROR_COLOR,
          });
          return;
        }
      }

      const reason = args.slice(1).join(' ') || 'No reason provided';

      await message.guild.members.unban(userId, reason);

      await replyEmbed({
        title: 'Unban',
        description: `${mentionUser(userId)} has been unbanned.`,
        color: SUCCESS_COLOR,
      });
      const [activeInfraction] = await getActiveBansForUser(message.guild.id, userId);
      if (activeInfraction) {
        await setInfractionActive(activeInfraction.id, false);
        await postModerationLogs({
          guild: message.guild,
          infraction: activeInfraction,
          actionLabel: 'UNBAN',
          executorId: message.author.id,
          reason,
          banLog: true,
        });
      }
    } catch (err) {
      console.error(`Failed to unban user in guild ${message.guild.id}:`, err);
      if (err.code === 10026) {
        await replyEmbed({
          title: 'Unban',
          description: 'That user is not banned or could not be found in the ban list.',
          color: ERROR_COLOR,
        });
      } else if (err.code === 50013) {
        await replyEmbed({
          title: 'Unban',
          description: "I don't have permission to unban members.",
          color: ERROR_COLOR,
        });
      } else {
        await (
          await import('../../utils/errors.js')
        ).replyError(message, err, {
          userMessage: 'An error occurred while trying to unban that user.',
        });
      }
    }
  },
};
