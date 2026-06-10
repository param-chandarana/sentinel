import { createInfraction } from '../../db/queries/infraction.js';
import { bindReply, ERROR_COLOR, SUCCESS_COLOR } from '../../utils/embedBuilder.js';
import { mentionUser } from '../../utils/mentions.js';
import { postModerationLogs } from '../../utils/moderationLogs.js';
import { canPerformAction } from '../../utils/permissions.js';

export const warn = {
  name: 'warn',
  aliases: ['strike'],
  execute: async (message, args, prefix) => {
    const replyEmbed = bindReply(message);

    const mentioned = message.mentions.users.first();
    if (!mentioned) {
      await replyEmbed({
        title: 'Warn',
        description: 'Please mention a user to warn. e.g. `' + prefix + 'warn @User [reason]`',
      });
      return;
    }

    try {
      const member = await message.guild.members.fetch(mentioned.id);

      const permissionCheck = await canPerformAction(
        message.member,
        member,
        'WARN',
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

      const infraction = await createInfraction({
        guildId: message.guild.id,
        userId: mentioned.id,
        moderatorId: message.author.id,
        type: 'WARN',
        reason,
      });

      await postModerationLogs({
        guild: message.guild,
        infraction,
        actionLabel: 'WARN',
        executorId: message.author.id,
        reason,
      });

      await replyEmbed({
        title: 'Warn',
        description: `${mentionUser(mentioned.id)} has been warned. (Case #${infraction.caseNumber})`,
        color: SUCCESS_COLOR,
      });
    } catch (err) {
      console.error(`Failed to warn user in guild ${message.guild.id}:`, err);
      await (
        await import('../../utils/errors.js')
      ).replyError(message, err, {
        userMessage: 'An error occurred while trying to warn that user.',
      });
    }
  },
};
