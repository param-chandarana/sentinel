import { SlashCommandBuilder } from 'discord.js';
import { executeModerationPipeline } from '../../utils/moderationPipeline.js';

export const warn = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warns a user in the server.')
    .addUserOption((option) =>
      option.setName('target').setDescription('The user to warn').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('The reason for the warning').setRequired(false),
    ),

  execute: async (interaction) => {
    await interaction.deferReply();
    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    await executeModerationPipeline(interaction, targetUser, 'WARN', reason, async (member) => {
      if (!member) throw { code: 10007 }; // Not a member
      // Warn has no discord action (like kick or ban), the DB and DM is the action.
    });
  },
};
