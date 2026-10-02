import { SlashCommandBuilder } from 'discord.js';
import { getGuildConfig } from '../../config/guildConfig.js';
import { ERROR_COLOR, reply } from '../../utils/embedBuilder.js';
import { executeModerationPipeline } from '../../utils/moderationPipeline.js';

export const countingBlacklist = {
  data: new SlashCommandBuilder()
    .setName('countingblacklist')
    .setDescription('Blacklists a user from counting.')
    .addUserOption((option) =>
      option.setName('target').setDescription('The user to blacklist').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('The reason for the blacklist').setRequired(false),
    ),

  execute: async (interaction) => {
    await interaction.deferReply();
    const config = await getGuildConfig(interaction.guild.id);
    if (!config.countingBlacklistRole) {
      await reply(interaction, {
        title: 'Counting Blacklist Error',
        description: 'No blacklist role has been configured. Use `/config countingblacklistrole set @Role` to set one.',
        color: ERROR_COLOR,
      });
      return;
    }

    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'Manual blacklist';

    await executeModerationPipeline(
      interaction,
      targetUser,
      'COUNTING_BLACKLIST',
      reason,
      async (member) => {
        if (!member) throw { code: 10007 };
        if (member.roles.cache.has(config.countingBlacklistRole)) {
          await reply(interaction, {
            title: 'Counting Blacklist',
            description: `<@${targetUser.id}> is already blacklisted.`,
            color: ERROR_COLOR,
          });
          return;
        }
        await member.roles.add(config.countingBlacklistRole, reason);
      }
    );
  },
};
