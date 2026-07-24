import { getAppealLink } from '../../db/queries/appealLink.js';
import { createInfraction } from '../../db/queries/infraction.js';
import { getPermissionRoles } from '../../db/queries/permissionRole.js';
import { sendDM } from '../../utils/dmQueue.js';
import { parseDurationSeconds } from '../../utils/duration.js';
import { bindReply, buildEmbed, ERROR_COLOR, SUCCESS_COLOR } from '../../utils/embedBuilder.js';
import { mentionUser } from '../../utils/mentions.js';
import { postModerationLogs } from '../../utils/moderationLogs.js';
import { canPerformAction, hasBanMembers } from '../../utils/permissions.js';

export const tempban = {
  name: 'tempban',
  aliases: [],
  execute: async (message, args, prefix) => {
    const replyEmbed = bindReply(message);

    const targetId = args[0]?.replace(/[<@!>]/g, '');
    const mentioned =
      message.mentions.users.first() ||
      (targetId ? await message.client.users.fetch(targetId).catch(() => null) : null);

    if (!mentioned) {
      await replyEmbed({
        title: 'Tempban',
        description: `Please mention a user or provide a valid user ID. e.g. \`${prefix}tempban @User 1h [reason]\` or \`${prefix}tempban 123456789012345678 1h [reason]\``,
        color: ERROR_COLOR,
      });
      return;
    }

    const durationArg = args[1];
    const durationSeconds = parseDurationSeconds(durationArg);
    if (!durationSeconds) {
      await replyEmbed({
        title: 'Tempban',
        description: 'Please specify a duration (e.g. `30m`, `1h`, `7d`).',
        color: ERROR_COLOR,
      });
      return;
    }

    try {
      let member = null;
      try {
        member = await message.guild.members.fetch(mentioned.id);
      } catch {
        member = null;
      }

      if (member) {
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
      } else {
        let hasExecutorPerm = message.member.guild.ownerId === message.author.id;
        if (!hasExecutorPerm) {
          const hasPerm = hasBanMembers(message.member);
          const roles = await getPermissionRoles(message.guild.id, 'BAN');
          const hasRole =
            roles.length > 0 && roles.some((r) => message.member.roles.cache.has(r.roleId));
          hasExecutorPerm = hasPerm || hasRole;
        }

        if (!hasExecutorPerm) {
          await replyEmbed({
            title: 'Permission Denied',
            description:
              'You need Ban Members permission or a configured role to use this command.',
            color: ERROR_COLOR,
          });
          return;
        }
      }

      const reason = args.slice(2).join(' ') || 'No reason provided';
      const appealLink = await getAppealLink(message.guild.id, 'BAN');

      // 1. Build the DM embed before banning (user becomes unreachable after)
      const dmEmbed = buildEmbed({
        title: `You have been temporarily banned from ${message.guild.name}`,
        description: [
          `**Reason:** ${reason}`,
          `**Duration:** ${durationArg}`,
          `**Server:** ${message.guild.name}`,
          appealLink ? `**Appeal Link:** ${appealLink.template}` : '',
        ].join('\n'),
        color: ERROR_COLOR,
        timestamp: new Date(),
      });

      // 2. Send DM - must happen before the ban, user can't receive DMs after
      const dmResult = await sendDM(message.client, mentioned.id, { embeds: [dmEmbed] });

      // 3. Execute the ban
      await message.guild.members.ban(mentioned.id, { reason });

      const expiresAt = new Date(Date.now() + durationSeconds * 1000);

      // 4. Write infraction - dmStatus is already known from step 2
      const infraction = await createInfraction({
        guildId: message.guild.id,
        userId: mentioned.id,
        moderatorId: message.author.id,
        type: 'TEMPBAN',
        reason,
        durationSeconds,
        expiresAt,
        dmStatus: dmResult.delivered ? 'delivered' : dmResult.reason,
      });

      // 5. Post mod/ban logs
      await postModerationLogs({
        guild: message.guild,
        infraction,
        actionLabel: 'TEMPBAN',
        executorId: message.author.id,
        reason,
        durationSeconds,
        banLog: true,
        dmResult,
      });

      // 6. Reply in channel
      await replyEmbed({
        title: 'Tempban',
        description: `${mentionUser(mentioned.id)} has been tempbanned until ${expiresAt.toUTCString()}. (Case #${infraction.caseNumber})`,
        color: SUCCESS_COLOR,
      });
    } catch (err) {
      console.error(`Failed to tempban user in guild ${message.guild.id}:`, err);
      if (err.code === 50013) {
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
