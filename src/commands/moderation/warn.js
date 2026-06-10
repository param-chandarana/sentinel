import { getAppealLink } from '../../db/queries/appealLink.js';
import { createInfraction } from '../../db/queries/infraction.js';
import { sendDM } from '../../utils/dmQueue.js';
import { bindReply, buildEmbed, ERROR_COLOR, SUCCESS_COLOR } from '../../utils/embedBuilder.js';
import { mentionUser } from '../../utils/mentions.js';
import { postModerationLogs } from '../../utils/moderationLogs.js';
import { canPerformAction } from '../../utils/permissions.js';

export const warn = {
  name: 'warn',
  aliases: ['strike'],
  execute: async (message, args, prefix) => {
    const replyEmbed = bindReply(message);
    const targetId = args[0]?.replace(/[<@!>]/g, '');
    const mentioned =
      message.mentions.users.first() ||
      (targetId ? await message.client.users.fetch(targetId).catch(() => null) : null);

    if (!mentioned) {
      await replyEmbed({
        title: 'Warn',
        description: `Please mention a user or provide a valid user ID. e.g. \`${prefix}warn @User [reason]\` or \`${prefix}warn 123456789012345678 [reason]\``,
        color: ERROR_COLOR,
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
      const appealLink = await getAppealLink(message.guild.id, 'WARN');

      // 1. Build the DM embed before warning
      const dmEmbed = buildEmbed({
        title: `You have been warned in ${message.guild.name}`,
        description: [
          `**Reason:** ${reason}`,
          `**Server:** ${message.guild.name}`,
          appealLink ? `**Appeal Link:** ${appealLink.template}` : '',
        ].join('\n'),
        color: ERROR_COLOR,
        timestamp: new Date(),
      });

      // 2. Send DM - must happen before the action
      const dmResult = await sendDM(message.client, mentioned.id, { embeds: [dmEmbed] });

      // 3. Write infraction - dmStatus is already known from step 2
      const infraction = await createInfraction({
        guildId: message.guild.id,
        userId: mentioned.id,
        moderatorId: message.author.id,
        type: 'WARN',
        reason,
        dmStatus: dmResult.delivered ? 'delivered' : dmResult.reason,
      });

      // 4. Post mod logs
      await postModerationLogs({
        guild: message.guild,
        infraction,
        actionLabel: 'WARN',
        executorId: message.author.id,
        reason,
        dmResult,
      });

      // 5. Reply in channel
      await replyEmbed({
        title: 'Warn',
        description: `${mentionUser(mentioned.id)} has been warned. (Case #${infraction.caseNumber})`,
        color: SUCCESS_COLOR,
      });
    } catch (err) {
      console.error(`Failed to warn user in guild ${message.guild.id}:`, err);
      if (err.code === 10007) {
        await replyEmbed({
          title: 'Warn',
          description: 'That user is not a member of this server.',
          color: ERROR_COLOR,
        });
      } else {
        await (
          await import('../../utils/errors.js')
        ).replyError(message, err, {
          userMessage: 'An error occurred while trying to warn that user.',
        });
      }
    }
  },
};
