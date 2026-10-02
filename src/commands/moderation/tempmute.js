import { SlashCommandBuilder } from 'discord.js';
import { getGuildConfig } from '../../config/guildConfig.js';
import { parseDurationSeconds } from '../../utils/duration.js';
import { ERROR_COLOR, reply } from '../../utils/embedBuilder.js';
import { executeModerationPipeline } from '../../utils/moderationPipeline.js';

export const tempmute = {
  data: new SlashCommandBuilder()
    .setName('tempmute')
    .setDescription('Temporarily mutes a user in the server.')
    .addUserOption((option) =>
      option.setName('target').setDescription('The user to tempmute').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('duration').setDescription('Duration (e.g. 30m, 1h, 7d)').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('The reason for the tempmute').setRequired(false),
    ),

  execute: async (interaction) => {
    await interaction.deferReply();

    const config = await getGuildConfig(interaction.guild.id);
    if (!config.muteRole) {
      await reply(interaction, {
        title: 'Tempmute Error',
        description: 'No mute role has been configured. Use `/config muterole set @Role` to set one.',
        color: ERROR_COLOR,
      });
      return;
    }

    const targetUser = interaction.options.getUser('target');
    const durationArg = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    const durationSeconds = parseDurationSeconds(durationArg);
    if (!durationSeconds) {
      await reply(interaction, {
        title: 'Tempmute Error',
        description: 'Please specify a valid duration (e.g. `30m`, `1h`, `7d`).',
        color: ERROR_COLOR,
      });
      return;
    }

    const opts = { duration: durationArg, durationMs: durationSeconds * 1000 };

    await executeModerationPipeline(
      interaction,
      targetUser,
      'TEMPMUTE',
      reason,
      async (member) => {
        if (!member) throw { code: 10007 }; // Not a member
        if (member.roles.cache.has(config.muteRole)) {
          await reply(interaction, {
            title: 'Tempmute',
            description: `<@${targetUser.id}> is already muted.`,
            color: ERROR_COLOR,
          });
          return;
        }
        await member.roles.add(config.muteRole, reason);
      },
      opts
    );
  },
};
