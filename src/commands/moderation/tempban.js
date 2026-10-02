import { SlashCommandBuilder } from 'discord.js';
import { parseDurationSeconds } from '../../utils/duration.js';
import { ERROR_COLOR, reply } from '../../utils/embedBuilder.js';
import { executeModerationPipeline } from '../../utils/moderationPipeline.js';

export const tempban = {
  data: new SlashCommandBuilder()
    .setName('tempban')
    .setDescription('Temporarily bans a user from the server.')
    .addUserOption((option) =>
      option.setName('target').setDescription('The user to tempban').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('duration').setDescription('Duration (e.g. 30m, 1h, 7d)').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('The reason for the tempban').setRequired(false),
    ),

  execute: async (interaction) => {
    await interaction.deferReply();
    const targetUser = interaction.options.getUser('target');
    const durationArg = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const durationSeconds = parseDurationSeconds(durationArg);
    if (!durationSeconds) {
      await reply(interaction, {
        title: 'Tempban Error',
        description: 'Please specify a valid duration (e.g. `30m`, `1h`, `7d`).',
        color: ERROR_COLOR,
      });
      return;
    }

    const opts = { duration: durationArg, durationMs: durationSeconds * 1000 };

    await executeModerationPipeline(interaction, targetUser, 'TEMPBAN', reason, async () => {
      await interaction.guild.members.ban(targetUser.id, { reason });
    }, opts);
  },
};
