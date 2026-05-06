import { getGuildConfig, setGuildConfig } from '../../config/guildConfig.js';
import { getAppealLink, removeAppealLink, setAppealLink } from '../../db/queries/appealLink.js';
import { addPermissionRole, removePermissionRole } from '../../db/queries/permissionRole.js';
import { isAdmin } from '../../utils/permissions.js';

export const config = {
  name: 'config',
  execute: async (message, args, prefix) => {
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

    // Subcommand: permissions
    if (subcommand === 'permissions') {
      const action = args[1]?.toLowerCase();
      const rawCommand = args[2];
      // Resolve aliases via commandRegistry at runtime to avoid circular imports
      let command;
      if (rawCommand) {
        const { commandRegistry } = await import('../index.js');
        const cmdObj = commandRegistry.get(rawCommand.toLowerCase());
        if (cmdObj && cmdObj.name) {
          command = cmdObj.name.toUpperCase();
        } else {
          command = rawCommand.toUpperCase();
        }
      } else {
        command = undefined;
      }
      const mentionedRoles = message.mentions.roles;

      if (!action || !['set', 'remove'].includes(action)) {
        await message.reply(
          `Please specify an action. e.g. \`${prefix}config permissions set ban @Moderators\` or \`${prefix}config permissions remove ban @Moderators\``,
        );
        return;
      }

      if (!command || !['BAN', 'KICK', 'MUTE', 'WARN'].includes(command)) {
        await message.reply(
          `Invalid command. Available commands: \`ban\`, \`kick\`, \`mute\`, \`warn\``,
        );
        return;
      }

      if (mentionedRoles.size === 0) {
        await message.reply(
          `Please mention at least one role. e.g. \`${prefix}config permissions ${action} ${command.toLowerCase()} @Role1 @Role2\``,
        );
        return;
      }

      if (action === 'set') {
        const addedRoles = [];
        const duplicateRoles = [];

        for (const role of mentionedRoles.values()) {
          try {
            await addPermissionRole(message.guild.id, command, role.id);
            addedRoles.push(role.name);
          } catch (err) {
            if (err.code === 'P2002') {
              duplicateRoles.push(role.name);
            } else {
              throw err;
            }
          }
        }

        let response = '';
        if (addedRoles.length > 0) {
          response += `Added permissions for **${command.toLowerCase()}** to: ${addedRoles.join(', ')}\n`;
        }
        if (duplicateRoles.length > 0) {
          response += `Already had permissions: ${duplicateRoles.join(', ')}`;
        }

        await message.reply(response || 'No roles were added.');
        return;
      }

      if (action === 'remove') {
        const removedRoles = [];
        const notFoundRoles = [];

        for (const role of mentionedRoles.values()) {
          try {
            await removePermissionRole(message.guild.id, command, role.id);
            removedRoles.push(role.name);
          } catch (err) {
            if (err.code === 'P2025') {
              notFoundRoles.push(role.name);
            } else {
              throw err;
            }
          }
        }

        let response = '';
        if (removedRoles.length > 0) {
          response += `Removed permissions for **${command.toLowerCase()}** from: ${removedRoles.join(', ')}\n`;
        }
        if (notFoundRoles.length > 0) {
          response += `Did not have permissions: ${notFoundRoles.join(', ')}`;
        }

        await message.reply(response || 'No roles were removed.');
        return;
      }
    }

    // Subcommand: appeallink (set/remove)
    if (subcommand === 'appeallink') {
      const action = args[1]?.toLowerCase();
      const rawCommand = args[2];

      if (!action || !['set', 'remove'].includes(action)) {
        await message.reply(
          `Please specify an action. e.g. \`${prefix}config appeallink set ban https://...\` or \`${prefix}config appeallink remove ban\``,
        );
        return;
      }

      // Resolve aliases via commandRegistry
      let command;
      if (rawCommand) {
        const { commandRegistry } = await import('../index.js');
        const cmdObj = commandRegistry.get(rawCommand.toLowerCase());
        if (cmdObj && cmdObj.name) {
          command = cmdObj.name.toUpperCase();
        } else {
          command = rawCommand.toUpperCase();
        }
      }

      if (!command || !['BAN', 'KICK', 'MUTE', 'WARN'].includes(command)) {
        await message.reply(
          `Invalid command. Available commands: \`ban\`, \`kick\`, \`mute\`, \`warn\``,
        );
        return;
      }

      if (action === 'set') {
        const template = args.slice(3).join(' ');
        if (!template) {
          await message.reply(
            `Please provide a link or template. e.g. \`${prefix}config appeallink set ban https://example.com/appeal\``,
          );
          return;
        }

        try {
          await setAppealLink(message.guild.id, command, template);
          await message.reply(`Set appeal link for **${command.toLowerCase()}**.`);
        } catch (err) {
          console.error(err);
          await message.reply('Failed to set appeal link.');
        }
        return;
      }

      if (action === 'remove') {
        try {
          await removeAppealLink(message.guild.id, command);
          await message.reply(`Removed appeal link for **${command.toLowerCase()}**.`);
        } catch (err) {
          if (err.code === 'P2025') {
            await message.reply(`No appeal link was set for **${command.toLowerCase()}**.`);
          } else {
            console.error(err);
            await message.reply('Failed to remove appeal link.');
          }
        }
        return;
      }
    }

    // Invalid subcommand provided
    if (subcommand) {
      await message.reply(
        `Unknown subcommand: \`${subcommand}\`\n\n` +
          `Available subcommands:\n` +
          `\`prefix <new-prefix>\` — Change the bot prefix\n` +
          `\`muterole @role\` — Set the mute role\n` +
          `\`countingblacklistrole @role\` — Set counting blacklist role\n` +
          `\`countingtimelimit <minutes>\` — Set counting time limit\n` +
          `\`countingchannel #channel\` — Set counting channel\n` +
          `\`modlogchannel #channel\` — Set mod log channel\n` +
          `\`banlogchannel #channel\` — Set ban log channel\n` +
          `\`joinlogchannel #channel\` — Set join log channel\n` +
          `\`leavelogchannel #channel\` — Set leave log channel\n` +
          `\`permissions set <command> @role(s)\` — Add permission roles\n` +
          `\`permissions remove <command> @role(s)\` — Remove permission roles` +
          `\`appeallink set <command> <template>\` — Set appeal link template\n` +
          `\`appeallink remove <command>\` — Remove appeal link`,
      );
      return;
    }

    // No subcommand: show config
    const currentConfig = await getGuildConfig(message.guild.id);

    // Fetch appeal links for display
    const warnAppeal = await getAppealLink(message.guild.id, 'WARN');
    const muteAppeal = await getAppealLink(message.guild.id, 'MUTE');
    const kickAppeal = await getAppealLink(message.guild.id, 'KICK');
    const banAppeal = await getAppealLink(message.guild.id, 'BAN');

    const formatRoles = (roles) => (roles && roles.length > 0 ? roles.join(', ') : 'Not set');
    const formatChannelMention = (channelId) => (channelId ? `<#${channelId}>` : 'Not set');
    const formatRoleMention = (roleId) => (roleId ? `<@&${roleId}>` : 'Not set');
    const formatCustomMessage = (message) => (message ? message : 'Not set');
    const formatAppealLink = (link) => (link ? link : 'Not set');

    await message.channel.send({
      embeds: [
        {
          title: `Server Config for ${message.guild.name}`,
          color: 5814783,
          description: '',
          fields: [
            {
              name: 'General Settings',
              value: `Prefix: \`${currentConfig.prefix}\`\nMute Role: ${formatRoleMention(currentConfig.muteRole)}`,
            },
            {
              name: 'Logging Channels',
              value: `Mod Log Channel: ${formatChannelMention(currentConfig.modLogChannel)}\nBan Log Channel: ${formatChannelMention(currentConfig.banLogChannel)}\nJoin Log Channel: ${formatChannelMention(currentConfig.joinLogChannel)}\nLeave Log Channel: ${formatChannelMention(currentConfig.leaveLogChannel)}`,
            },
            {
              name: 'Permissions',
              value: `Warn/Strike: ${formatRoles(currentConfig.warnPermissionRoles)}\nMute: ${formatRoles(currentConfig.mutePermissionRoles)}\nKick: ${formatRoles(currentConfig.kickPermissionRoles)}\nBan: ${formatRoles(currentConfig.banPermissionRoles)}`,
            },
            {
              name: 'Appeal Links',
              value: `Warn/Strike: ${formatAppealLink(warnAppeal?.template)}\nMute: ${formatAppealLink(muteAppeal?.template)}\nKick: ${formatAppealLink(kickAppeal?.template)}\nBan: ${formatAppealLink(banAppeal?.template)}`,
            },
            {
              name: 'Counting',
              value: `Counting Channel: ${formatChannelMention(currentConfig.countingChannel)}\nCounting Blacklist Role: ${formatRoleMention(currentConfig.countingBlacklistRole)}\nCounting Time Limit: ${currentConfig.countingWindowMs / 60000} minutes`,
            },
          ],
          attachments: [],
        },
      ],
    });
  },
};
