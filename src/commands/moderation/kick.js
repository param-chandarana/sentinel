import { getAppealLink } from '../../db/queries/appealLink.js';
import { createInfraction } from '../../db/queries/infraction.js';
import { sendDM } from '../../utils/dmQueue.js';
import { bindReply, buildEmbed, ERROR_COLOR, SUCCESS_COLOR } from '../../utils/embedBuilder.js';
import { mentionUser } from '../../utils/mentions.js';
import { postModerationLogs } from '../../utils/moderationLogs.js';
import { canPerformAction } from '../../utils/permissions.js';

export const kick = {
  name: 'kick',
  aliases: [],
  execute: async (message, args, prefix) => {
    const replyEmbed = bindReply(message);
    const targetId = args[0]?.replace(/[<@!>]/g, '');
    const mentioned =
      message.mentions.users.first() ||
      (targetId ? await message.client.users.fetch(targetId).catch(() => null) : null);

    if (!mentioned) {
      await replyEmbed({
        title: 'Kick',
        description: `Please mention a user or provide a valid user ID. e.g. \`${prefix}kick @User [reason]\` or \`${prefix}kick 123456789012345678 [reason]\``,
        color: ERROR_COLOR,
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
      const appealLink = await getAppealLink(message.guild.id, 'KICK');

      // 1. Build the DM embed before kicking (user becomes unreachable after)
      const dmEmbed = buildEmbed({
        title: `You have been kicked from ${message.guild.name}`,
        description: [
          `**Reason:** ${reason}`,
          `**Server:** ${message.guild.name}`,
          appealLink ? `**Appeal Link:** ${appealLink.template}` : '',
        ].join('\n'),
        color: ERROR_COLOR,
        timestamp: new Date(),
      });

      // 2. Send DM - must happen before the kick, user can't receive DMs after
      const dmResult = await sendDM(message.client, mentioned.id, { embeds: [dmEmbed] });

      // 3. Execute the kick
      await member.kick(reason);

      // 4. Write infraction - dmStatus is already known from step 2
      const infraction = await createInfraction({
        guildId: message.guild.id,
        userId: mentioned.id,
        moderatorId: message.author.id,
        type: 'KICK',
        reason,
        dmStatus: dmResult.delivered ? 'delivered' : dmResult.reason,
      });

      // 5. Post mod logs
      await postModerationLogs({
        guild: message.guild,
        infraction,
        actionLabel: 'KICK',
        executorId: message.author.id,
        reason,
        dmResult,
      });

      // 6. Reply in channel
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
