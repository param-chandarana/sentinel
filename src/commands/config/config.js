import { getGuildConfig, setGuildConfig } from '../../config/guildConfig.js';
import { getAppealLink, removeAppealLink, setAppealLink } from '../../db/queries/appealLink.js';
import { addPermissionRole, removePermissionRole } from '../../db/queries/permissionRole.js';
import { isAdmin } from '../../utils/permissions.js';

// Maps subcommand name -> guildConfig key for set/remove pattern
const CHANNEL_SUBCOMMANDS = {
  countingchannel: 'countingChannel',
  modlogchannel: 'modLogChannel',
  banlogchannel: 'banLogChannel',
  joinlogchannel: 'joinLogChannel',
  leavelogchannel: 'leaveLogChannel',
};

const ROLE_SUBCOMMANDS = {
  muterole: 'muteRole',
  countingblacklistrole: 'countingBlacklistRole',
};

const VALID_PERMISSION_COMMANDS = ['BAN', 'KICK', 'MUTE', 'WARN'];

function getHelpEmbed() {
  return {
    title: 'Config Command Help',
    color: 5814783,
    fields: [
      {
        name: 'View Current Config',
        value: 'Run `config` with no subcommand to view all current settings',
      },
      {
        name: 'Prefix',
        value: '`prefix <new-prefix>` - Change the bot prefix',
      },
      {
        name: 'Mute Role',
        value: [
          '`muterole set @role` - Set mute role',
          '`muterole remove` - Remove mute role',
        ].join('\n'),
      },
      {
        name: 'Counting Blacklist Role',
        value: [
          '`countingblacklistrole set @role` - Set counting blacklist role',
          '`countingblacklistrole remove` - Remove counting blacklist role',
        ].join('\n'),
      },
      {
        name: 'Counting Time Limit',
        value: [
          '`countingtimelimit set <minutes>` - Set counting time limit',
          '`countingtimelimit remove` - Remove counting time limit',
        ].join('\n'),
      },
      {
        name: 'Counting Channel',
        value: [
          '`countingchannel set #channel` - Set counting channel',
          '`countingchannel remove` - Remove counting channel',
        ].join('\n'),
      },
      {
        name: 'Logging Channels',
        value: [
          '`modlogchannel set #channel` - Set mod log channel',
          '`modlogchannel remove` - Remove mod log channel',
          '`banlogchannel set #channel` - Set ban log channel',
          '`banlogchannel remove` - Remove ban log channel',
          '`joinlogchannel set #channel` - Set join log channel',
          '`joinlogchannel remove` - Remove join log channel',
          '`leavelogchannel set #channel` - Set leave log channel',
          '`leavelogchannel remove` - Remove leave log channel',
        ].join('\n'),
      },
      {
        name: 'Permissions',
        value: [
          '`permissions set <command> @role(s)` - Add permission roles',
          '`permissions remove <command> @role(s)` - Remove permission roles',
        ].join('\n'),
      },
      {
        name: 'Appeal Links',
        value: [
          '`appeallink set <command> <template>` - Set appeal link template',
          '`appeallink remove <command>` - Remove appeal link',
        ].join('\n'),
      },
    ],
  };
}

async function resolveCommand(rawCommand) {
  if (!rawCommand) return undefined;
  const { commandRegistry } = await import('../index.js');
  const cmdObj = commandRegistry.get(rawCommand.toLowerCase());
  return (cmdObj?.name ?? rawCommand).toUpperCase();
}

function requireAction(message, action, prefix, example) {
  if (!action || !['set', 'remove'].includes(action)) {
    message.reply(`Please specify an action. e.g. \`${example}\``);
    return false;
  }
  return true;
}

function formatSubcommandName(subcommand) {
  const allMaps = { ...CHANNEL_SUBCOMMANDS, ...ROLE_SUBCOMMANDS };
  const camelCase = allMaps[subcommand];
  if (!camelCase) return subcommand;

  // Convert camelCase to Title Case (e.g., "countingChannel" -> "Counting Channel")
  return camelCase
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export const config = {
  name: 'config',
  execute: async (message, args, prefix) => {
    if (!isAdmin(message.member)) {
      await message.reply('You need Administrator permission to use this command.');
      return;
    }

    const subcommand = args[0]?.toLowerCase();

    // prefix
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

    // Generic role subcommands (muterole, countingblacklistrole)
    if (subcommand in ROLE_SUBCOMMANDS) {
      const configKey = ROLE_SUBCOMMANDS[subcommand];
      const action = args[1]?.toLowerCase();
      if (!requireAction(message, action, prefix, `${prefix}config ${subcommand} set @Role`))
        return;

      if (action === 'set') {
        const role = message.mentions.roles.first();
        if (!role) {
          await message.reply(
            `Please mention a valid role. e.g. \`${prefix}config ${subcommand} set @Role\``,
          );
          return;
        }
        await setGuildConfig(message.guild.id, { [configKey]: role.id });
        await message.reply(`${formatSubcommandName(subcommand)} set to **${role.name}**.`);
      } else {
        await setGuildConfig(message.guild.id, { [configKey]: null });
        await message.reply(`${formatSubcommandName(subcommand)} removed.`);
      }
      return;
    }

    // countingtimelimit (set/remove)
    if (subcommand === 'countingtimelimit') {
      const action = args[1]?.toLowerCase();
      if (!requireAction(message, action, prefix, `${prefix}config countingtimelimit set 10`))
        return;

      if (action === 'set') {
        const minutes = parseFloat(args[2]);
        if (isNaN(minutes) || minutes <= 0) {
          await message.reply(
            `Please provide a valid number of minutes. e.g. \`${prefix}config countingtimelimit set 10\``,
          );
          return;
        }
        const countingWindowMs = Math.round(minutes * 60 * 1000);
        await setGuildConfig(message.guild.id, { countingWindowMs: BigInt(countingWindowMs) });
        await message.reply(`Counting time limit set to **${minutes} minutes**.`);
      } else {
        await setGuildConfig(message.guild.id, { countingWindowMs: null });
        await message.reply('Counting time limit removed.');
      }
      return;
    }

    // Generic channel subcommands
    if (subcommand in CHANNEL_SUBCOMMANDS) {
      const configKey = CHANNEL_SUBCOMMANDS[subcommand];
      const action = args[1]?.toLowerCase();
      if (!requireAction(message, action, prefix, `${prefix}config ${subcommand} set #channel`))
        return;

      if (action === 'set') {
        const channel = message.mentions.channels.first();
        if (!channel) {
          await message.reply(
            `Please mention a valid channel. e.g. \`${prefix}config ${subcommand} set #channel\``,
          );
          return;
        }
        await setGuildConfig(message.guild.id, { [configKey]: channel.id });
        await message.reply(`${formatSubcommandName(subcommand)} set to **${channel.name}**.`);
      } else {
        await setGuildConfig(message.guild.id, { [configKey]: null });
        await message.reply(`${formatSubcommandName(subcommand)} removed.`);
      }
      return;
    }

    // permissions
    if (subcommand === 'permissions') {
      const action = args[1]?.toLowerCase();
      if (
        !requireAction(message, action, prefix, `${prefix}config permissions set ban @Moderators`)
      )
        return;

      const command = await resolveCommand(args[2]);
      if (!command || !VALID_PERMISSION_COMMANDS.includes(command)) {
        await message.reply(
          `Invalid command. Available commands: \`ban\`, \`kick\`, \`mute\`, \`warn\``,
        );
        return;
      }

      const mentionedRoles = message.mentions.roles;
      if (mentionedRoles.size === 0) {
        await message.reply(
          `Please mention at least one role. e.g. \`${prefix}config permissions ${action} ${command.toLowerCase()} @Role1\``,
        );
        return;
      }

      const added = [],
        skipped = [];
      for (const role of mentionedRoles.values()) {
        try {
          if (action === 'set') {
            await addPermissionRole(message.guild.id, command, role.id);
            added.push(role.name);
          } else {
            await removePermissionRole(message.guild.id, command, role.id);
            added.push(role.name);
          }
        } catch (err) {
          if (err.code === 'P2002' || err.code === 'P2025') {
            skipped.push(role.name);
          } else {
            throw err;
          }
        }
      }

      const verb = action === 'set' ? 'Added' : 'Removed';
      const skipLabel = action === 'set' ? 'Already had permissions' : 'Did not have permissions';
      let response = '';
      if (added.length)
        response += `${verb} permissions for **${command.toLowerCase()}** to: ${added.join(', ')}\n`;
      if (skipped.length) response += `${skipLabel}: ${skipped.join(', ')}`;
      await message.reply(response || 'No roles were updated.');
      return;
    }

    // appeallink
    if (subcommand === 'appeallink') {
      const action = args[1]?.toLowerCase();
      if (!requireAction(message, action, prefix, `${prefix}config appeallink set ban https://...`))
        return;

      const command = await resolveCommand(args[2]);
      if (!command || !VALID_PERMISSION_COMMANDS.includes(command)) {
        await message.reply(
          `Invalid command. Available commands: \`ban\`, \`kick\`, \`mute\`, \`warn\``,
        );
        return;
      }

      try {
        if (action === 'set') {
          const template = args.slice(3).join(' ');
          if (!template) {
            await message.reply(
              `Please provide a link or template. e.g. \`${prefix}config appeallink set ban https://example.com/appeal\``,
            );
            return;
          }
          await setAppealLink(message.guild.id, command, template);
          await message.reply(`Set appeal link for **${command.toLowerCase()}**.`);
        } else {
          await removeAppealLink(message.guild.id, command);
          await message.reply(`Removed appeal link for **${command.toLowerCase()}**.`);
        }
      } catch (err) {
        if (err.code === 'P2025') {
          await message.reply(`No appeal link was set for **${command.toLowerCase()}**.`);
        } else {
          console.error(err);
          await message.reply('Failed to update appeal link.');
        }
      }
      return;
    }

    // Unknown subcommand
    if (subcommand) {
      await message.channel.send({
        content: `Unknown subcommand: \`${subcommand}\``,
        embeds: [getHelpEmbed()],
      });
      return;
    }

    // No subcommand: show current config
    const [currentConfig, warnAppeal, muteAppeal, kickAppeal, banAppeal] = await Promise.all([
      getGuildConfig(message.guild.id),
      getAppealLink(message.guild.id, 'WARN'),
      getAppealLink(message.guild.id, 'MUTE'),
      getAppealLink(message.guild.id, 'KICK'),
      getAppealLink(message.guild.id, 'BAN'),
    ]);

    const fmt = {
      channel: (id) => (id ? `<#${id}>` : 'Not set'),
      role: (id) => (id ? `<@&${id}>` : 'Not set'),
      roles: (r) => (r?.length ? r.join(', ') : 'Not set'),
      link: (l) => l ?? 'Not set',
    };

    await message.channel.send({
      embeds: [
        {
          title: `Server Config for ${message.guild.name}`,
          color: 5814783,
          fields: [
            {
              name: 'General Settings',
              value: `Prefix: \`${currentConfig.prefix}\`\nMute Role: ${fmt.role(currentConfig.muteRole)}`,
            },
            {
              name: 'Logging Channels',
              value: [
                `Mod Log: ${fmt.channel(currentConfig.modLogChannel)}`,
                `Ban Log: ${fmt.channel(currentConfig.banLogChannel)}`,
                `Join Log: ${fmt.channel(currentConfig.joinLogChannel)}`,
                `Leave Log: ${fmt.channel(currentConfig.leaveLogChannel)}`,
              ].join('\n'),
            },
            {
              name: 'Permissions',
              value: [
                `Warn/Strike: ${fmt.roles(currentConfig.warnPermissionRoles)}`,
                `Mute: ${fmt.roles(currentConfig.mutePermissionRoles)}`,
                `Kick: ${fmt.roles(currentConfig.kickPermissionRoles)}`,
                `Ban: ${fmt.roles(currentConfig.banPermissionRoles)}`,
              ].join('\n'),
            },
            {
              name: 'Appeal Links',
              value: [
                `Warn/Strike: ${fmt.link(warnAppeal?.template)}`,
                `Mute: ${fmt.link(muteAppeal?.template)}`,
                `Kick: ${fmt.link(kickAppeal?.template)}`,
                `Ban: ${fmt.link(banAppeal?.template)}`,
              ].join('\n'),
            },
            {
              name: 'Counting',
              value: [
                `Channel: ${fmt.channel(currentConfig.countingChannel)}`,
                `Blacklist Role: ${fmt.role(currentConfig.countingBlacklistRole)}`,
                `Time Limit: ${currentConfig.countingWindowMs ? (BigInt(currentConfig.countingWindowMs) / 60000n).toString() + ' minutes' : 'Not set'}`,
              ].join('\n'),
            },
          ],
        },
      ],
    });
  },
};
