import { createInfraction } from '../../db/queries/infraction.js';
import { parseDurationSeconds } from '../../utils/duration.js';
import { bindReply, ERROR_COLOR, SUCCESS_COLOR } from '../../utils/embedBuilder.js';
import { mentionUser } from '../../utils/mentions.js';
import { postModerationLogs } from '../../utils/moderationLogs.js';
import { canPerformAction } from '../../utils/permissions.js';

export const tempban = {
  name: 'tempban',
  aliases: [],
  execute: async (message, args, prefix) => {
    const replyEmbed = bindReply(message);

    const mentioned = message.mentions.users.first();
    if (!mentioned) {
      await replyEmbed({
        title: 'Tempban',
        description:
          'Please mention a user to tempban. e.g. `' + prefix + 'tempban @User 1h [reason]`',
      });
      return;
    }

    const durationArg = args[1];
    const durationSeconds = parseDurationSeconds(durationArg);
    if (!durationSeconds) {
      await replyEmbed({
        title: 'Tempban',
        description: 'Please specify a duration (e.g. `30m`, `1h`, `7d`).',
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

      const reason = args.slice(2).join(' ') || 'No reason provided';

      await member.ban({ reason });

      const expiresAt = new Date(Date.now() + durationSeconds * 1000);

      const infraction = await createInfraction({
        guildId: message.guild.id,
        userId: mentioned.id,
        moderatorId: message.author.id,
        type: 'TEMPBAN',
        reason,
        durationSeconds,
        expiresAt,
      });

      await postModerationLogs({
        guild: message.guild,
        infraction,
        actionLabel: 'TEMPBAN',
        executorId: message.author.id,
        reason,
        durationSeconds,
        banLog: true,
      });

      await replyEmbed({
        title: 'Tempban',
        description: `${mentionUser(mentioned.id)} has been tempbanned until ${expiresAt.toUTCString()}. (Case #${infraction.caseNumber})`,
        color: SUCCESS_COLOR,
      });
    } catch (err) {
      console.error(`Failed to tempban user in guild ${message.guild.id}:`, err);
      if (err.code === 10007) {
        await replyEmbed({
          title: 'Tempban',
          description: 'That user is not a member of this server.',
          color: ERROR_COLOR,
        });
      } else if (err.code === 50013) {
        await replyEmbed({
          title: 'Tempban',
          description: "I don't have permission to ban members. Please check my role hierarchy.",
          color: ERROR_COLOR,
        });
      } else {
        await (
          await import('../../utils/errors.js')
        ).replyError(message, err, {
          userMessage: 'An error occurred while trying to tempban that user.',
        });
      }
    }
  },
};
