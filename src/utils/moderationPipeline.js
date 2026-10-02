import { getAppealLink } from '../db/queries/appealLink.js';
import { createInfraction } from '../db/queries/infraction.js';
import { getPermissionRoles } from '../db/queries/permissionRole.js';
import { sendDM } from './dmQueue.js';
import { buildEmbed, ERROR_COLOR, SUCCESS_COLOR, reply } from './embedBuilder.js';
import { replyError } from './errors.js';
import { mentionUser } from './mentions.js';
import { postModerationLogs } from './moderationLogs.js';
import { canPerformAction, hasBanMembers } from './permissions.js';

/**
 * Centralized pipeline for all moderation actions.
 * @param {CommandInteraction} interaction
 * @param {User} targetUser
 * @param {string} actionType e.g., 'BAN', 'KICK', 'MUTE', 'WARN'
 * @param {string} reason
 * @param {Function} executeAction A callback that actually performs the Discord action
 * @param {Object} opts Extra options (e.g., duration for temp actions)
 */
export async function executeModerationPipeline(
  interaction,
  targetUser,
  actionType,
  reason,
  executeAction,
  opts = {},
) {
  try {
    let member = null;
    try {
      member = await interaction.guild.members.fetch(targetUser.id);
    } catch {
      member = null;
    }

    if (member) {
      const permissionCheck = await canPerformAction(
        interaction.member,
        member,
        actionType,
        interaction.guild.id,
      );

      if (!permissionCheck.allowed) {
        await reply(interaction, {
          title: 'Permission Denied',
          description: permissionCheck.reason,
          color: ERROR_COLOR,
        });
        return;
      }
    } else {
      // If user isn't in the guild, we still need to check if the executor can perform this action generally
      let hasExecutorPerm = interaction.guild.ownerId === interaction.user.id;
      if (!hasExecutorPerm) {
        // Fallback for actions on non-members (mostly BAN)
        const hasPerm = hasBanMembers(interaction.member);
        const roles = await getPermissionRoles(interaction.guild.id, actionType);
        const hasRole =
          roles.length > 0 && roles.some((r) => interaction.member.roles.cache.has(r.roleId));
        hasExecutorPerm = hasPerm || hasRole;
      }

      if (!hasExecutorPerm) {
        await reply(interaction, {
          title: 'Permission Denied',
          description: `You need permission or a configured role to use ${actionType} on non-members.`,
          color: ERROR_COLOR,
        });
        return;
      }
    }

    const appealLink = await getAppealLink(interaction.guild.id, actionType);
    
    let actionPastTense = actionType.toLowerCase() + 'ed';
    if (actionType === 'BAN') actionPastTense = 'banned';
    if (actionType === 'UNBAN') actionPastTense = 'unbanned';

    // 1. Build DM embed
    const dmEmbed = buildEmbed({
      title: `You have been ${actionPastTense} in ${interaction.guild.name}`,
      description: [
        `**Reason:** ${reason}`,
        `**Server:** ${interaction.guild.name}`,
        opts.duration ? `**Duration:** ${opts.duration}` : '',
        appealLink ? `**Appeal Link:** ${appealLink.template}` : '',
      ].filter(Boolean).join('\n'),
      color: ERROR_COLOR,
      timestamp: new Date(),
    });

    // 2. Send DM - must happen before the action
    const dmResult = await sendDM(interaction.client, targetUser.id, { embeds: [dmEmbed] });

    // 3. Execute the actual action (e.g. member.ban(), member.kick(), etc)
    if (executeAction) {
      await executeAction(member);
    }

    // 4. Create infraction
    const infraction = await createInfraction({
      guildId: interaction.guild.id,
      userId: targetUser.id,
      moderatorId: interaction.user.id,
      type: actionType,
      reason,
      durationMs: opts.durationMs || null,
      dmStatus: dmResult.delivered ? 'delivered' : dmResult.reason,
    });

    // 5. Post mod logs
    await postModerationLogs({
      guild: interaction.guild,
      infraction,
      actionLabel: actionType,
      executorId: interaction.user.id,
      reason,
      duration: opts.duration,
      dmResult,
    });

    // 6. Reply in channel
    await reply(interaction, {
      title: actionType.charAt(0).toUpperCase() + actionType.slice(1).toLowerCase(),
      description: `${mentionUser(targetUser.id)} has been ${actionPastTense}. (Case #${infraction.caseNumber})`,
      color: SUCCESS_COLOR,
    });

  } catch (err) {
    console.error(`Failed to execute ${actionType} pipeline in guild ${interaction.guild.id}:`, err);
    if (err.code === 50013) {
      await reply(interaction, {
        title: 'Permission Error',
        description: `I don't have permission to perform this action. Please check my role hierarchy.`,
        color: ERROR_COLOR,
      });
    } else {
      await replyError(interaction, err, {
        userMessage: `An error occurred while trying to perform ${actionType}.`,
      });
    }
  }
}
