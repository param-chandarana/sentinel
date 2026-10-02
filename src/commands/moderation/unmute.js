import { SlashCommandBuilder } from 'discord.js';
import { getGuildConfig } from '../../config/guildConfig.js';
import { getActiveMutesForUser, setInfractionActive } from '../../db/queries/infraction.js';
import { ERROR_COLOR, SUCCESS_COLOR, reply } from '../../utils/embedBuilder.js';
import { mentionUser } from '../../utils/mentions.js';
import { postModerationLogs } from '../../utils/moderationLogs.js';
import { canPerformAction } from '../../utils/permissions.js';
import { replyError } from '../../utils/errors.js';

export const unmute = {
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmutes a user in the server.')
    .addUserOption((option) =>
      option.setName('target').setDescription('The user to unmute').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('The reason for the unmute').setRequired(false),
    ),

  execute: async (interaction) => {
    await interaction.deferReply();
    const config = await getGuildConfig(interaction.guild.id);
    if (!config.muteRole) {
      await reply(interaction, {
        title: 'Unmute Error',
        description: 'No mute role has been configured. Use `/config muterole set @Role` to set one.',
        color: ERROR_COLOR,
      });
      return;
    }

    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    try {
      const member = await interaction.guild.members.fetch(targetUser.id);

      const permissionCheck = await canPerformAction(
        interaction.member,
        member,
        'MUTE',
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

      if (!member.roles.cache.has(config.muteRole)) {
        await reply(interaction, {
          title: 'Unmute',
          description: `${mentionUser(targetUser.id)} is not muted.`,
          color: ERROR_COLOR,
        });
        return;
      }

      await member.roles.remove(config.muteRole, reason);

      await reply(interaction, {
        title: 'Unmute',
        description: `${mentionUser(targetUser.id)} has been unmuted.`,
        color: SUCCESS_COLOR,
      });

      const [activeInfraction] = await getActiveMutesForUser(interaction.guild.id, targetUser.id);
      if (activeInfraction) {
        await setInfractionActive(activeInfraction.id, false);
        await postModerationLogs({
          guild: interaction.guild,
          infraction: activeInfraction,
          actionLabel: 'UNMUTE',
          executorId: interaction.user.id,
          reason,
        });
      }
    } catch (err) {
      console.error(`Failed to unmute user in guild ${interaction.guild.id}:`, err);

      if (err.code === 10007) {
        await reply(interaction, {
          title: 'Unmute Error',
          description: 'That user is not a member of this server.',
          color: ERROR_COLOR,
        });
      } else if (err.code === 50013) {
        await reply(interaction, {
          title: 'Unmute Error',
          description: "I don't have permission to manage roles. Please check my role hierarchy.",
          color: ERROR_COLOR,
        });
      } else {
        await replyError(interaction, err, {
          userMessage: 'An error occurred while trying to unmute that user.',
        });
      }
    }
  },
};
