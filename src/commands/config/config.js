import { getGuildConfigWithPermissionRoles, setGuildConfig } from '../../config/guildConfig.js';
import { getAppealLink, removeAppealLink, setAppealLink } from '../../db/queries/appealLink.js';
import { addPermissionRole, removePermissionRole } from '../../db/queries/permissionRole.js';
import { buildEmbed, ERROR_COLOR, reply, send, SUCCESS_COLOR } from '../../utils/embedBuilder.js';
import { mentionChannel, mentionRole } from '../../utils/mentions.js';
import { hasManageServer } from '../../utils/permissions.js';
import { formatMsToMinutes } from '../../utils/time.js';

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

const VALID_PERMISSION_COMMANDS = [
  'BAN',
  'KICK',
  'MUTE',
  'WARN',
  'COUNTINGBLACKLIST',
  'MANAGEINFRACTIONS',
  'TIMEOUT',
];

const VALID_APPEAL_LINK_COMMANDS = ['BAN', 'KICK', 'MUTE', 'WARN', 'COUNTINGBLACKLIST', 'TIMEOUT'];

const replyEmbed = reply;

const resolveAndValidateRole = async (guild, arg) => {
  if (!arg) return null;
  const roleId = arg.replace(/[<@&>]/g, '');
  if (!/^\d{17,20}$/.test(roleId)) return null;

  return guild.roles.cache.get(roleId) ?? (await guild.roles.fetch(roleId).catch(() => null));
};

function getHelpEmbed() {
  return buildEmbed({
    title: 'Config Command Help',
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
          'Available commands: `ban`, `kick`, `mute`, `warn`, `countingblacklist`, `manageinfractions`, `timeout`',
          'Note: Roles are optional. Default permissions still work too.',
        ].join('\n'),
      },
      {
        name: 'Appeal Links',
        value: [
          '`appeallink set <command> <template>` - Set appeal link template',
          '`appeallink remove <command>` - Remove appeal link',
          'Available commands: `ban`, `kick`, `mute`, `warn`, `countingblacklist`, `timeout`',
        ].join('\n'),
      },
    ],
  });
}

async function resolveCommand(rawCommand) {
  if (!rawCommand) return undefined;
  const { commandRegistry } = await import('../index.js');
  const cmdObj = commandRegistry.get(rawCommand.toLowerCase());
  return (cmdObj?.name ?? rawCommand).toUpperCase();
}

function requireAction(message, action, prefix, example) {
  if (!action || !['set', 'remove'].includes(action)) {
    void replyEmbed(message, {
      title: 'Config',
      description: `Please specify an action. e.g. \`${example}\``,
    }).catch(() => {});
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
    if (!hasManageServer(message.member)) {
      await replyEmbed(message, {
        title: 'Permission Denied',
        description: 'You need Manage Server permission to use this command.',
        color: ERROR_COLOR,
      });
      return;
    }

    const subcommand = args[0]?.toLowerCase();

    // prefix
    if (subcommand === 'prefix') {
      const newPrefix = args[1];
      if (!newPrefix) {
        await replyEmbed(message, {
          title: 'Config',
          description: `Please provide a new prefix. e.g. \`${prefix}config prefix w!\``,
        });
        return;
      }
      if (newPrefix.length > 5) {
        await replyEmbed(message, {
          title: 'Config',
          description: 'Prefix must be 5 characters or fewer.',
        });
        return;
      }
      await setGuildConfig(message.guild.id, { prefix: newPrefix });
      await replyEmbed(message, {
        title: 'Config Updated',
        color: SUCCESS_COLOR,
        description: `Prefix updated to \`${newPrefix}\`. Use \`${newPrefix}config\` from now on.`,
      });
      return;
    }

    // Generic role subcommands (muterole, countingblacklistrole)
    if (subcommand in ROLE_SUBCOMMANDS) {
      const configKey = ROLE_SUBCOMMANDS[subcommand];
      const action = args[1]?.toLowerCase();
      if (!requireAction(message, action, prefix, `${prefix}config ${subcommand} set @Role`))
        return;

      if (action === 'set') {
        const roleInput = args[2];
        const role = await resolveAndValidateRole(message.guild, roleInput);
        if (!role) {
          await replyEmbed(message, {
            title: 'Config',
            color: ERROR_COLOR,
            description: `Please provide a valid role or role ID. e.g. \`${prefix}config ${subcommand} set @Role\` or \`${prefix}config ${subcommand} set 123456789012345678\``,
          });
          return;
        }
        await setGuildConfig(message.guild.id, { [configKey]: role.id });
        await replyEmbed(message, {
          title: 'Config Updated',
          color: SUCCESS_COLOR,
          description: `${formatSubcommandName(subcommand)} set to **${role.name}**.`,
        });
      } else {
        await setGuildConfig(message.guild.id, { [configKey]: null });
        await replyEmbed(message, {
          title: 'Config Updated',
          color: SUCCESS_COLOR,
          description: `${formatSubcommandName(subcommand)} removed.`,
        });
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
          await replyEmbed(message, {
            title: 'Config',
            description: `Please provide a valid number of minutes. e.g. \`${prefix}config countingtimelimit set 10\``,
          });
          return;
        }
        const countingWindowMs = Math.round(minutes * 60 * 1000);
        await setGuildConfig(message.guild.id, { countingWindowMs: BigInt(countingWindowMs) });
        await replyEmbed(message, {
          title: 'Config Updated',
          color: SUCCESS_COLOR,
          description: `Counting time limit set to **${minutes} minutes**.`,
        });
      } else {
        await setGuildConfig(message.guild.id, { countingWindowMs: null });
        await replyEmbed(message, {
          title: 'Config Updated',
          color: SUCCESS_COLOR,
          description: 'Counting time limit removed.',
        });
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
        let channel = message.mentions.channels.first();
        if (!channel) {
          const channelId = args[2]?.replace(/[<#>]/g, '');
          if (channelId) {
            channel =
              message.guild.channels.cache.get(channelId) ??
              (await message.guild.channels.fetch(channelId).catch(() => null));
          }
        }
        if (!channel) {
          await replyEmbed(message, {
            title: 'Config',
            description: `Please provide a valid channel or channel ID. e.g. \`${prefix}config ${subcommand} set #channel\` or \`${prefix}config ${subcommand} set 123456789012345678\``,
          });
          return;
        }
        await setGuildConfig(message.guild.id, { [configKey]: channel.id });
        await replyEmbed(message, {
          title: 'Config Updated',
          color: SUCCESS_COLOR,
          description: `${formatSubcommandName(subcommand)} set to **${channel.name}**.`,
        });
      } else {
        await setGuildConfig(message.guild.id, { [configKey]: null });
        await replyEmbed(message, {
          title: 'Config Updated',
          color: SUCCESS_COLOR,
          description: `${formatSubcommandName(subcommand)} removed.`,
        });
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
        await replyEmbed(message, {
          title: 'Config',
          description:
            'Invalid command. Available commands: `ban`, `kick`, `mute`, `warn`, `countingblacklist`, `manageinfractions`, `timeout`',
        });
        return;
      }

      const roleInputs = args.slice(3);
      if (roleInputs.length === 0) {
        await replyEmbed(message, {
          title: 'Config',
          color: ERROR_COLOR,
          description: `Please provide at least one role or role ID. e.g. \`${prefix}config permissions ${action} ${command.toLowerCase()} @Role1\``,
        });
        return;
      }

      const rolesToProcess = [];
      const invalidArgs = [];

      for (const input of roleInputs) {
        const role = await resolveAndValidateRole(message.guild, input);
        if (role) {
          rolesToProcess.push(role);
        } else {
          invalidArgs.push(input);
        }
      }

      if (invalidArgs.length > 0) {
        await replyEmbed(message, {
          title: 'Config',
          color: ERROR_COLOR,
          description: `The following role(s) or role ID(s) are invalid or could not be found: ${invalidArgs.map((arg) => `\`${arg}\``).join(', ')}`,
        });
        return;
      }

      const roleTasks = rolesToProcess.map((role) => {
        if (action === 'set')
          return addPermissionRole(message.guild.id, command, role.id)
            .then(() => ({ status: 'ok', name: role.name }))
            .catch((err) => ({
              status: err.code === 'P2002' ? 'skipped' : 'error',
              name: role.name,
              err,
            }));

        return removePermissionRole(message.guild.id, command, role.id)
          .then(() => ({ status: 'ok', name: role.name }))
          .catch((err) => ({
            status: err.code === 'P2025' ? 'skipped' : 'error',
            name: role.name,
            err,
          }));
      });

      const results = await Promise.allSettled(roleTasks);
      const added = [];
      const skipped = [];
      const errors = [];
      for (const r of results) {
        if (r.status === 'fulfilled') {
          const res = r.value;
          if (res.status === 'ok') added.push(res.name);
          else if (res.status === 'skipped') skipped.push(res.name);
          else if (res.status === 'error') errors.push({ name: res.name, err: res.err });
        } else {
          errors.push({ name: 'unknown', err: r.reason });
        }
      }

      const verb = action === 'set' ? 'Added' : 'Removed';
      const skipLabel = action === 'set' ? 'Already had permissions' : 'Did not have permissions';
      let response = '';
      if (added.length)
        response += `${verb} permissions for **${command.toLowerCase()}** to: ${added.join(', ')}\n`;
      if (skipped.length) response += `${skipLabel}: ${skipped.join(', ')}`;
      if (errors.length) response += `\nFailed: ${errors.map((e) => e.name).join(', ')}`;
      await replyEmbed(message, {
        title: 'Config Updated',
        color: SUCCESS_COLOR,
        description: response || 'No roles were updated.',
      });
      return;
    }

    // appeallink
    if (subcommand === 'appeallink') {
      const action = args[1]?.toLowerCase();
      if (!requireAction(message, action, prefix, `${prefix}config appeallink set ban https://...`))
        return;

      const command = await resolveCommand(args[2]);
      if (!command || !VALID_APPEAL_LINK_COMMANDS.includes(command)) {
        await replyEmbed(message, {
          title: 'Config',
          description:
            'Invalid command. Available commands: `ban`, `kick`, `mute`, `warn`, `countingblacklist`, `timeout`',
        });
        return;
      }

      try {
        if (action === 'set') {
          const template = args.slice(3).join(' ');
          if (!template) {
            await replyEmbed(message, {
              title: 'Config',
              description: `Please provide a link or template. e.g. \`${prefix}config appeallink set ban https://example.com/appeal\``,
            });
            return;
          }
          await setAppealLink(message.guild.id, command, template);
          await replyEmbed(message, {
            title: 'Config Updated',
            color: SUCCESS_COLOR,
            description: `Set appeal link for **${command.toLowerCase()}**.`,
          });
        } else {
          await removeAppealLink(message.guild.id, command);
          await replyEmbed(message, {
            title: 'Config Updated',
            color: SUCCESS_COLOR,
            description: `Removed appeal link for **${command.toLowerCase()}**.`,
          });
        }
      } catch (err) {
        if (err.code === 'P2025') {
          await replyEmbed(message, {
            title: 'Config',
            description: `No appeal link was set for **${command.toLowerCase()}**.`,
          });
        } else {
          console.error(err);
          await (
            await import('../../utils/errors.js')
          ).replyError(message, err, {
            userMessage: 'Failed to update appeal link.',
          });
        }
      }
      return;
    }

    // Unknown subcommand
    if (subcommand) {
      await send(message.channel, {
        title: 'Unknown Subcommand',
        description: `Unknown subcommand: \`${subcommand}\``,
      });
      await send(message.channel, getHelpEmbed());
      return;
    }

    // No subcommand: show current config
    const [
      currentConfig,
      warnAppeal,
      muteAppeal,
      kickAppeal,
      banAppeal,
      countingBlacklistAppeal,
      timeoutAppeal,
    ] = await Promise.all([
      getGuildConfigWithPermissionRoles(message.guild.id),
      getAppealLink(message.guild.id, 'WARN'),
      getAppealLink(message.guild.id, 'MUTE'),
      getAppealLink(message.guild.id, 'KICK'),
      getAppealLink(message.guild.id, 'BAN'),
      getAppealLink(message.guild.id, 'COUNTINGBLACKLIST'),
      getAppealLink(message.guild.id, 'TIMEOUT'),
    ]);

    const fmt = {
      channel: (id) => mentionChannel(id),
      role: (id) => mentionRole(id),
      roles: (r) => (r?.length ? r.join(', ') : 'Not set'),
      link: (l) => l ?? 'Not set',
    };

    await send(message.channel, {
      title: `Server Config for ${message.guild.name}`,
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
            `Counting Blacklist: ${fmt.roles(currentConfig.countingBlacklistPermissionRoles)}`,
            `Manage Infractions: ${fmt.roles(currentConfig.manageInfractionsPermissionRoles)}`,
            `Timeout: ${fmt.roles(currentConfig.timeoutPermissionRoles)}`,
            'Note: Roles are optional. Default permissions still work too.',
          ].join('\n'),
        },
        {
          name: 'Appeal Links',
          value: [
            `Warn/Strike: ${fmt.link(warnAppeal?.template)}`,
            `Mute: ${fmt.link(muteAppeal?.template)}`,
            `Kick: ${fmt.link(kickAppeal?.template)}`,
            `Ban: ${fmt.link(banAppeal?.template)}`,
            `Counting Blacklist: ${fmt.link(countingBlacklistAppeal?.template)}`,
            `Timeout: ${fmt.link(timeoutAppeal?.template)}`,
          ].join('\n'),
        },
        {
          name: 'Counting',
          value: [
            `Channel: ${fmt.channel(currentConfig.countingChannel)}`,
            `Blacklist Role: ${fmt.role(currentConfig.countingBlacklistRole)}`,
            `Time Limit: ${currentConfig.countingWindowMs ? formatMsToMinutes(currentConfig.countingWindowMs) : 'Not set'}`,
          ].join('\n'),
        },
      ],
    });
  },
};
