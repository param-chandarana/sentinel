import { SlashCommandBuilder } from 'discord.js';
import { getActiveBansForUser, setInfractionActive } from '../../db/queries/infraction.js';
import { getPermissionRoles } from '../../db/queries/permissionRole.js';
import { ERROR_COLOR, SUCCESS_COLOR, reply } from '../../utils/embedBuilder.js';
import { mentionUser } from '../../utils/mentions.js';
import { postModerationLogs } from '../../utils/moderationLogs.js';
import { hasBanMembers } from '../../utils/permissions.js';
import { replyError } from '../../utils/errors.js';

export const unban = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unbans a user from the server.')
    .addUserOption((option) =>
      option.setName('target').setDescription('The user to unban').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('The reason for the unban').setRequired(false),
    ),

  execute: async (interaction) => {
    await interaction.deferReply();
    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const userId = targetUser.id;

    try {
      if (interaction.guild.ownerId !== interaction.user.id) {
        const hasPerm = hasBanMembers(interaction.member);
        const roles = await getPermissionRoles(interaction.guild.id, 'BAN');
        const hasRole =
          roles.length > 0 && roles.some((r) => interaction.member.roles.cache.has(r.roleId));
        if (!hasPerm && !hasRole) {
          await reply(interaction, {
            title: 'Permission Denied',
            description: 'You need Ban Members permission or a configured role to use this command.',
            color: ERROR_COLOR,
          });
          return;
        }
      }

      await interaction.guild.members.unban(userId, reason);

      await reply(interaction, {
        title: 'Unban',
        description: `${mentionUser(userId)} has been unbanned.`,
        color: SUCCESS_COLOR,
      });

      const [activeInfraction] = await getActiveBansForUser(interaction.guild.id, userId);
      if (activeInfraction) {
        await setInfractionActive(activeInfraction.id, false);
        await postModerationLogs({
          guild: interaction.guild,
          infraction: activeInfraction,
          actionLabel: 'UNBAN',
          executorId: interaction.user.id,
          reason,
          banLog: true,
        });
      }
    } catch (err) {
      console.error(`Failed to unban user in guild ${interaction.guild.id}:`, err);
      if (err.code === 10026) {
        await reply(interaction, {
          title: 'Unban Error',
          description: 'That user is not banned or could not be found in the ban list.',
          color: ERROR_COLOR,
        });
      } else if (err.code === 50013) {
        await reply(interaction, {
          title: 'Unban Error',
          description: "I don't have permission to unban members.",
          color: ERROR_COLOR,
        });
      } else {
        await replyError(interaction, err, {
          userMessage: 'An error occurred while trying to unban that user.',
        });
      }
    }
  },
};
