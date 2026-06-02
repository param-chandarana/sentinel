import { createInfraction } from '../../db/queries/infraction.js';
import { bindReply, ERROR_COLOR, SUCCESS_COLOR } from '../../utils/embedBuilder.js';
import { mentionUser } from '../../utils/mentions.js';
import { canPerformAction } from '../../utils/permissions.js';

export const ban = {
  name: 'ban',
  aliases: [],
  execute: async (message, args, prefix) => {
    const replyEmbed = bindReply(message);

    const mentioned = message.mentions.users.first();
    if (!mentioned) {
      await replyEmbed({
        title: 'Ban',
        description: 'Please mention a user to ban. e.g. `' + prefix + 'ban @User [reason]`',
      });
      return;
    }

    try {
      const member = await message.guild.members.fetch(mentioned.id);

      const permissionCheck = await canPerformAction(
        message.member,
        member,
        'BAN',
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

      await member.ban({ reason });

      const infraction = await createInfraction({
        guildId: message.guild.id,
        userId: mentioned.id,
        moderatorId: message.author.id,
        type: 'BAN',
        reason,
      });

      await replyEmbed({
        title: 'Ban',
        description: `${mentionUser(mentioned.id)} has been banned. (Case #${infraction.caseNumber})`,
        color: SUCCESS_COLOR,
      });
    } catch (err) {
      console.error(`Failed to ban user in guild ${message.guild.id}:`, err);

      if (err.code === 10007) {
        await replyEmbed({
          title: 'Ban',
          description: 'That user is not a member of this server.',
          color: ERROR_COLOR,
        });
      } else if (err.code === 50013) {
        await replyEmbed({
          title: 'Ban',
          description: "I don't have permission to ban members. Please check my role hierarchy.",
          color: ERROR_COLOR,
        });
      } else {
        await (
          await import('../../utils/errors.js')
        ).replyError(message, err, {
          userMessage: 'An error occurred while trying to ban that user.',
        });
      }
    }
  },
};
