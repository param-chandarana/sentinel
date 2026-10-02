import { SlashCommandBuilder } from 'discord.js';
import { executeModerationPipeline } from '../../utils/moderationPipeline.js';

export const ban = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bans a user from the server.')
    .addUserOption((option) =>
      option.setName('target').setDescription('The user to ban').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('The reason for the ban').setRequired(false),
    ),

  execute: async (interaction) => {
    await interaction.deferReply();
    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    await executeModerationPipeline(interaction, targetUser, 'BAN', reason, async () => {
      await interaction.guild.members.ban(targetUser.id, { reason });
    });
  },
};
