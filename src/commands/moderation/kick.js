import { createInfraction } from '../../db/queries/infraction.js';
import { bindReply, ERROR_COLOR, SUCCESS_COLOR } from '../../utils/embedBuilder.js';
import { mentionUser } from '../../utils/mentions.js';
import { canPerformAction } from '../../utils/permissions.js';

export const kick = {
  name: 'kick',
  aliases: [],
  execute: async (message, args, prefix) => {
    const replyEmbed = bindReply(message);

    const mentioned = message.mentions.users.first();
    if (!mentioned) {
      await replyEmbed({
        title: 'Kick',
        description: 'Please mention a user to kick. e.g. `' + prefix + 'kick @User [reason]`',
      });
      return;
    }

    try {
      const member = await message.guild.members.fetch(mentioned.id);

      const permissionCheck = await canPerformAction(
        message.member,
        member,
        'KICK',
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

      await member.kick(reason);

      const infraction = await createInfraction({
        guildId: message.guild.id,
        userId: mentioned.id,
        moderatorId: message.author.id,
        type: 'KICK',
        reason,
      });

      await replyEmbed({
        title: 'Kick',
        description: `${mentionUser(mentioned.id)} has been kicked. (Case #${infraction.caseNumber})`,
        color: SUCCESS_COLOR,
      });
    } catch (err) {
      console.error(`Failed to kick user in guild ${message.guild.id}:`, err);
      if (err.code === 10007) {
        await replyEmbed({
          title: 'Kick',
          description: 'That user is not a member of this server.',
          color: ERROR_COLOR,
        });
      } else if (err.code === 50013) {
        await replyEmbed({
          title: 'Kick',
          description: "I don't have permission to kick members. Please check my role hierarchy.",
          color: ERROR_COLOR,
        });
      } else {
        await (
          await import('../../utils/errors.js')
        ).replyError(message, err, {
          userMessage: 'An error occurred while trying to kick that user.',
        });
      }
    }
  },
};
