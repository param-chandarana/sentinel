import { getGuildConfig } from '../../config/guildConfig.js';
import { getActiveBlacklistsForUser, setInfractionActive } from '../../db/queries/infraction.js';
import { bindReply, ERROR_COLOR, SUCCESS_COLOR } from '../../utils/embedBuilder.js';
import { mentionUser } from '../../utils/mentions.js';
import { postModerationLogs } from '../../utils/moderationLogs.js';
import { canPerformAction } from '../../utils/permissions.js';

export const countingUnblacklist = {
  name: 'countingunblacklist',
  aliases: ['unblacklist'],
  execute: async (message, args, prefix) => {
    const replyEmbed = bindReply(message);

    // Get the guild config to check if blacklist role is set
    const config = await getGuildConfig(message.guild.id);
    if (!config.countingBlacklistRole) {
      await replyEmbed({
        title: 'Counting Unblacklist',
        description:
          'No blacklist role has been configured. Use `' +
          prefix +
          'config countingblacklistrole set @Role` to set one.',
        color: ERROR_COLOR,
      });
      return;
    }

    const targetId = args[0]?.replace(/[<@!>]/g, '');
    const mentioned =
      message.mentions.users.first() ||
      (targetId ? await message.client.users.fetch(targetId).catch(() => null) : null);

    if (!mentioned) {
      await replyEmbed({
        title: 'Counting Unblacklist',
        description: `Please mention a user or provide a valid user ID. e.g. \`${prefix}unblacklist @User\` or \`${prefix}unblacklist 123456789012345678\``,
        color: ERROR_COLOR,
      });
      return;
    }

    try {
      // Fetch the member from the guild
      const member = await message.guild.members.fetch(mentioned.id);

      // Check if the member has the blacklist role
      if (!member.roles.cache.has(config.countingBlacklistRole)) {
        await replyEmbed({
          title: 'Counting Unblacklist',
          description: `${mentionUser(mentioned.id)} is not blacklisted.`,
          color: ERROR_COLOR,
        });
        return;
      }

      // Check if user can perform the action
      const permissionCheck = await canPerformAction(
        message.member,
        member,
        'COUNTINGBLACKLIST',
        message.guild.id,
      );
      if (!permissionCheck.allowed) {
        await replyEmbed({
          title: 'Permission Denied',
          description: permissionCheck.reason,
          color: ERROR_COLOR,
        });
        return;
      }

      const reason = args.slice(1).join(' ') || 'No reason provided';

      // Remove the blacklist role
      await member.roles.remove(config.countingBlacklistRole, reason);

      await replyEmbed({
        title: 'Counting Unblacklist',
        description: `${mentionUser(mentioned.id)} has been unblacklisted.`,
        color: SUCCESS_COLOR,
      });

      const [activeInfraction] = await getActiveBlacklistsForUser(message.guild.id, mentioned.id);
      if (activeInfraction) {
        await setInfractionActive(activeInfraction.id, false);
        await postModerationLogs({
          guild: message.guild,
          infraction: activeInfraction,
          actionLabel: 'COUNTING_UNBLACKLIST',
          executorId: message.author.id,
          reason,
        });
      }
    } catch (err) {
      console.error(`Failed to unblacklist user in guild ${message.guild.id}:`, err);

      // Provide specific error messages
      if (err.code === 10007) {
        await replyEmbed({
          title: 'Counting Unblacklist',
          description: 'That user is not a member of this server.',
          color: ERROR_COLOR,
        });
      } else if (err.code === 50013) {
        await replyEmbed({
          title: 'Counting Unblacklist',
          description: "I don't have permission to manage roles. Please check my role hierarchy.",
          color: ERROR_COLOR,
        });
      } else {
        await (
          await import('../../utils/errors.js')
        ).replyError(message, err, {
          userMessage:
            'An error occurred while trying to unblacklist that user. Please check my permissions and try again.',
        });
      }
    }
  },
};
