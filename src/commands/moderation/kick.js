import { SlashCommandBuilder } from 'discord.js';
import { executeModerationPipeline } from '../../utils/moderationPipeline.js';

export const kick = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kicks a user from the server.')
    .addUserOption((option) =>
      option.setName('target').setDescription('The user to kick').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('The reason for the kick').setRequired(false),
    ),

  execute: async (interaction) => {
    await interaction.deferReply();
    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    await executeModerationPipeline(interaction, targetUser, 'KICK', reason, async (member) => {
      if (!member) {
        throw { code: 10007 }; // Not a member error code simulation if they aren't in guild
      }
      await member.kick(reason);
    });
  },
};
