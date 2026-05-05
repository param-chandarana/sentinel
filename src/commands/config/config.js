import { getGuildConfig, setGuildConfig } from '../../config/guildConfig.js';
import { isAdmin } from '../../utils/permissions.js';

export const config = {
  name: 'config',
  execute: async (message, args, prefix, guildConfig) => {
    if (!isAdmin(message.member)) {
      await message.reply('You need Administrator permission to use this command.');
      return;
    }

    const subcommand = args[0]?.toLowerCase();

    // Subcommand: prefix
    if (subcommand === 'prefix') {
      const newPrefix = args[1];
      if (!newPrefix) {
        await message.reply(`Please provide a new prefix. e.g. \`${prefix}config prefix w!\``);
        return;
      }
      if (newPrefix.length > 5) {
        await message.reply('Prefix must be 5 characters or fewer.');
        return;
      }
      await setGuildConfig(message.guild.id, { prefix: newPrefix });
      await message.reply(
        `Prefix updated to \`${newPrefix}\`. Use \`${newPrefix}config\` from now on.`,
      );
      return;
    }

    // Subcommand: muterole
    if (subcommand === 'muterole') {
      const role = message.mentions.roles.first();
      if (!role) {
        await message.reply(
          `Please mention a valid role. e.g. \`${prefix}config muterole @Muted\``,
        );
        return;
      }
      await setGuildConfig(message.guild.id, { muteRole: role.id });
      await message.reply(`Mute role set to **${role.name}**.`);
      return;
    }

    // Subcommand: countingblacklistrole
    if (subcommand === 'countingblacklistrole') {
      const role = message.mentions.roles.first();
      if (!role) {
        await message.reply(
          `Please mention a valid role. e.g. \`${prefix}config countingblacklistrole @Blacklisted\``,
        );
        return;
      }
      await setGuildConfig(message.guild.id, { countingBlacklistRole: role.id });
      await message.reply(`Counting blacklist role set to **${role.name}**.`);
      return;
    }

    // Subcommand: countingtimelimit
    if (subcommand === 'countingtimelimit') {
      const minutes = parseFloat(args[1]);
      if (isNaN(minutes) || minutes <= 0) {
        await message.reply(
          `Please provide a valid number of minutes. e.g. \`${prefix}config countingtimelimit 10\``,
        );
        return;
      }
      await setGuildConfig(message.guild.id, { countingWindowMs: minutes * 60 * 1000 });
      await message.reply(`Time limit set to **${minutes} minutes**.`);
      return;
    }

    // Subcommand: countingchannel
    if (subcommand === 'countingchannel') {
      const channel = message.mentions.channels.first();
      if (!channel) {
        await message.reply(
          `Please mention a valid channel. e.g. \`${prefix}config countingchannel #counting\``,
        );
        return;
      }
      await setGuildConfig(message.guild.id, { countingChannel: channel.id });
      await message.reply(`Counting channel set to **${channel.name}**.`);
      return;
    }

    // Subcommand: modlogchannel
    if (subcommand === 'modlogchannel') {
      const channel = message.mentions.channels.first();
      if (!channel) {
        await message.reply(
          `Please mention a valid channel. e.g. \`${prefix}config modlogchannel #mod-logs\``,
        );
        return;
      }
      await setGuildConfig(message.guild.id, { modLogChannel: channel.id });
      await message.reply(`Mod log channel set to **${channel.name}**.`);
      return;
    }

    // Subcommand: banlogchannel
    if (subcommand === 'banlogchannel') {
      const channel = message.mentions.channels.first();
      if (!channel) {
        await message.reply(
          `Please mention a valid channel. e.g. \`${prefix}config banlogchannel #ban-logs\``,
        );
        return;
      }
      await setGuildConfig(message.guild.id, { banLogChannel: channel.id });
      await message.reply(`Ban log channel set to **${channel.name}**.`);
      return;
    }

    // Subcommand: joinlogchannel
    if (subcommand === 'joinlogchannel') {
      const channel = message.mentions.channels.first();
      if (!channel) {
        await message.reply(
          `Please mention a valid channel. e.g. \`${prefix}config joinlogchannel #join-logs\``,
        );
        return;
      }
      await setGuildConfig(message.guild.id, { joinLogChannel: channel.id });
      await message.reply(`Join log channel set to **${channel.name}**.`);
      return;
    }

    // Subcommand: leavelogchannel
    if (subcommand === 'leavelogchannel') {
      const channel = message.mentions.channels.first();
      if (!channel) {
        await message.reply(
          `Please mention a valid channel. e.g. \`${prefix}config leavelogchannel #leave-logs\``,
        );
        return;
      }
      await setGuildConfig(message.guild.id, { leaveLogChannel: channel.id });
      await message.reply(`Leave log channel set to **${channel.name}**.`);
      return;
    }

    // Invalid subcommand provided
    if (subcommand) {
      await message.reply(
        `Unknown subcommand: \`${subcommand}\`\n\n` +
          `Available subcommands:\n` +
          `\`prefix <new-prefix>\` - Change the bot prefix\n` +
          `\`muterole @role\` - Set the mute role\n` +
          `\`countingblacklistrole @role\` - Set counting blacklist role\n` +
          `\`countingtimelimit <minutes>\` - Set counting time limit\n` +
          `\`countingchannel #channel\` - Set counting channel\n` +
          `\`modlogchannel #channel\` - Set mod log channel\n` +
          `\`banlogchannel #channel\` - Set ban log channel\n` +
          `\`joinlogchannel #channel\` - Set join log channel\n` +
          `\`leavelogchannel #channel\` - Set leave log channel`,
      );
      return;
    }

    // No subcommand: show config
    const config = await getGuildConfig(message.guild.id);

    await message.channel.send({
      embeds: [
        {
          title: `Server Config for ${message.guild.name}`,
          color: 5814783,
          description: '',
          fields: [
            {
              name: 'General Settings',
              value: `Prefix: \`${config.prefix}\`\nMute Role: <@&${config.muteRole}>`,
            },
            {
              name: 'Logging Channels',
              value: `Mod Log Channel: <#${config.modLogChannel}>\nBan Log Channel: <#${config.banLogChannel}>\nJoin Log Channel: <#${config.joinLogChannel}>\nLeave Log Channel: <#${config.leaveLogChannel}>`,
            },
            {
              name: 'Permission Roles',
              value: `Warn/Strike Roles: ${config.warnPermissionRoles?.join(', ')}\nMute Roles: ${config?.mutePermissionRoles?.join(', ')}\nKick Roles: ${config.kickPermissionRoles?.join(', ')}\nBan Roles: ${config.banPermissionRoles?.join(', ')}`,
            },
            {
              name: 'Custom Messages',
              value: `Warn/Strike Message: ${config.warnCustomMessage}\nMute Message: ${config.muteCustomMessage}\nKick Message: ${config.kickCustomMessage}\nBan Message: ${config.banCustomMessage}`,
            },
            {
              name: 'Counting',
              value: `Counting Channel: <#${config.countingChannel}>\nCounting Blacklist Role: <@&${config.countingBlacklistRole}>\nCounting Time Limit: ${config.countingWindowMs / 60000} minutes`,
            },
          ],
          attachments: [],
        },
      ],
    });
  },
};
