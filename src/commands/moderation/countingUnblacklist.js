import { SlashCommandBuilder } from 'discord.js';
import { getGuildConfig } from '../../config/guildConfig.js';
import { getActiveBlacklistsForUser, setInfractionActive } from '../../db/queries/infraction.js';
import { ERROR_COLOR, SUCCESS_COLOR, reply } from '../../utils/embedBuilder.js';
import { mentionUser } from '../../utils/mentions.js';
import { postModerationLogs } from '../../utils/moderationLogs.js';
import { canPerformAction } from '../../utils/permissions.js';
import { replyError } from '../../utils/errors.js';

export const countingUnblacklist = {
  data: new SlashCommandBuilder()
    .setName('countingunblacklist')
    .setDescription('Unblacklists a user from counting.')
    .addUserOption((option) =>
      option.setName('target').setDescription('The user to unblacklist').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('The reason for the unblacklist').setRequired(false),
    ),

  execute: async (interaction) => {
    await interaction.deferReply();
    const config = await getGuildConfig(interaction.guild.id);
    if (!config.countingBlacklistRole) {
      await reply(interaction, {
        title: 'Counting Unblacklist Error',
        description: 'No blacklist role has been configured. Use `/config countingblacklistrole set @Role` to set one.',
        color: ERROR_COLOR,
      });
      return;
    }

    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      const member = await interaction.guild.members.fetch(targetUser.id);

      if (!member.roles.cache.has(config.countingBlacklistRole)) {
        await reply(interaction, {
          title: 'Counting Unblacklist',
          description: `${mentionUser(targetUser.id)} is not blacklisted.`,
          color: ERROR_COLOR,
        });
        return;
      }

      const permissionCheck = await canPerformAction(
        interaction.member,
        member,
        'COUNTINGBLACKLIST',
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

      await member.roles.remove(config.countingBlacklistRole, reason);

      await reply(interaction, {
        title: 'Counting Unblacklist',
        description: `${mentionUser(targetUser.id)} has been unblacklisted.`,
        color: SUCCESS_COLOR,
      });

      const [activeInfraction] = await getActiveBlacklistsForUser(interaction.guild.id, targetUser.id);
      if (activeInfraction) {
        await setInfractionActive(activeInfraction.id, false);
        await postModerationLogs({
          guild: interaction.guild,
          infraction: activeInfraction,
          actionLabel: 'COUNTING_UNBLACKLIST',
          executorId: interaction.user.id,
          reason,
        });
      }
    } catch (err) {
      console.error(`Failed to unblacklist user in guild ${interaction.guild.id}:`, err);

      if (err.code === 10007) {
        await reply(interaction, {
          title: 'Counting Unblacklist Error',
          description: 'That user is not a member of this server.',
          color: ERROR_COLOR,
        });
      } else if (err.code === 50013) {
        await reply(interaction, {
          title: 'Counting Unblacklist Error',
          description: "I don't have permission to manage roles. Please check my role hierarchy.",
          color: ERROR_COLOR,
        });
      } else {
        await replyError(interaction, err, {
          userMessage: 'An error occurred while trying to unblacklist that user. Please check my permissions and try again.',
        });
      }
    }
  },
};
