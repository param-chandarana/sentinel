import { SlashCommandBuilder } from 'discord.js';
import { getGuildConfig } from '../../config/guildConfig.js';
import { ERROR_COLOR, reply } from '../../utils/embedBuilder.js';
import { executeModerationPipeline } from '../../utils/moderationPipeline.js';

export const mute = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mutes a user in the server.')
    .addUserOption((option) =>
      option.setName('target').setDescription('The user to mute').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('The reason for the mute').setRequired(false),
    ),

  execute: async (interaction) => {
    await interaction.deferReply();

    const config = await getGuildConfig(interaction.guild.id);
    if (!config.muteRole) {
      await reply(interaction, {
        title: 'Mute Error',
        description: 'No mute role has been configured. Use `/config muterole set @Role` to set one.',
        color: ERROR_COLOR,
      });
      return;
    }

    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    await executeModerationPipeline(interaction, targetUser, 'MUTE', reason, async (member) => {
      if (!member) throw { code: 10007 }; // Not a member
      if (member.roles.cache.has(config.muteRole)) {
        await reply(interaction, {
          title: 'Mute',
          description: `<@${targetUser.id}> is already muted.`,
          color: ERROR_COLOR,
        });
        return; // Early return to avoid duplicate actions
      }
      await member.roles.add(config.muteRole, reason);
    });
  },
};
