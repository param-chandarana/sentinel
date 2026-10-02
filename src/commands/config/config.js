import { SlashCommandBuilder } from 'discord.js';
import { getGuildConfigWithPermissionRoles, setGuildConfig } from '../../config/guildConfig.js';
import { getAppealLink, removeAppealLink, setAppealLink } from '../../db/queries/appealLink.js';
import { addPermissionRole, removePermissionRole } from '../../db/queries/permissionRole.js';
import { buildEmbed, ERROR_COLOR, reply, send, SUCCESS_COLOR } from '../../utils/embedBuilder.js';
import { mentionChannel, mentionRole } from '../../utils/mentions.js';
import { hasManageServer } from '../../utils/permissions.js';
import { formatMsToMinutes } from '../../utils/time.js';
import { replyError } from '../../utils/errors.js';

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

// Maps slash option value -> guildConfig key
const CHANNEL_CONFIG_KEYS = {
  modlogchannel: 'modLogChannel',
  banlogchannel: 'banLogChannel',
  joinlogchannel: 'joinLogChannel',
  leavelogchannel: 'leaveLogChannel',
  countingchannel: 'countingChannel',
};

const ROLE_CONFIG_KEYS = {
  muterole: 'muteRole',
  countingblacklistrole: 'countingBlacklistRole',
};

function formatSubcommandName(key) {
  // Convert camelCase to Title Case
  const camelCase = { ...CHANNEL_CONFIG_KEYS, ...ROLE_CONFIG_KEYS }[key] ?? key;
  return camelCase.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
}

// ────────────────────────────────────────────────────────────
// Slash command data
// ────────────────────────────────────────────────────────────
export const config = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Manage bot configuration for this server.')
    // ── View current config ──────────────────────────────────
    .addSubcommand((sub) => sub.setName('view').setDescription('View the current server configuration.'))
    // ── Mute role ────────────────────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('muterole')
        .setDescription('Set or remove the mute role.')
        .addStringOption((opt) =>
          opt
            .setName('action')
            .setDescription('set or remove')
            .setRequired(true)
            .addChoices({ name: 'set', value: 'set' }, { name: 'remove', value: 'remove' }),
        )
        .addRoleOption((opt) =>
          opt.setName('role').setDescription('The role to use as mute role (required for set)').setRequired(false),
        ),
    )
    // ── Counting blacklist role ──────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('countingblacklistrole')
        .setDescription('Set or remove the counting blacklist role.')
        .addStringOption((opt) =>
          opt
            .setName('action')
            .setDescription('set or remove')
            .setRequired(true)
            .addChoices({ name: 'set', value: 'set' }, { name: 'remove', value: 'remove' }),
        )
        .addRoleOption((opt) =>
          opt.setName('role').setDescription('The role to use (required for set)').setRequired(false),
        ),
    )
    // ── Counting time limit ──────────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('countingtimelimit')
        .setDescription('Set or remove the counting time limit.')
        .addStringOption((opt) =>
          opt
            .setName('action')
            .setDescription('set or remove')
            .setRequired(true)
            .addChoices({ name: 'set', value: 'set' }, { name: 'remove', value: 'remove' }),
        )
        .addNumberOption((opt) =>
          opt.setName('minutes').setDescription('Time limit in minutes (required for set)').setRequired(false).setMinValue(0.1),
        ),
    )
    // ── Logging channels ─────────────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('modlogchannel')
        .setDescription('Set or remove the mod log channel.')
        .addStringOption((opt) =>
          opt
            .setName('action')
            .setDescription('set or remove')
            .setRequired(true)
            .addChoices({ name: 'set', value: 'set' }, { name: 'remove', value: 'remove' }),
        )
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('The channel to use (required for set)').setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('banlogchannel')
        .setDescription('Set or remove the ban log channel.')
        .addStringOption((opt) =>
          opt
            .setName('action')
            .setDescription('set or remove')
            .setRequired(true)
            .addChoices({ name: 'set', value: 'set' }, { name: 'remove', value: 'remove' }),
        )
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('The channel to use (required for set)').setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('joinlogchannel')
        .setDescription('Set or remove the join log channel.')
        .addStringOption((opt) =>
          opt
            .setName('action')
            .setDescription('set or remove')
            .setRequired(true)
            .addChoices({ name: 'set', value: 'set' }, { name: 'remove', value: 'remove' }),
        )
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('The channel to use (required for set)').setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('leavelogchannel')
        .setDescription('Set or remove the leave log channel.')
        .addStringOption((opt) =>
          opt
            .setName('action')
            .setDescription('set or remove')
            .setRequired(true)
            .addChoices({ name: 'set', value: 'set' }, { name: 'remove', value: 'remove' }),
        )
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('The channel to use (required for set)').setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('countingchannel')
        .setDescription('Set or remove the counting channel.')
        .addStringOption((opt) =>
          opt
            .setName('action')
            .setDescription('set or remove')
            .setRequired(true)
            .addChoices({ name: 'set', value: 'set' }, { name: 'remove', value: 'remove' }),
        )
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('The channel to use (required for set)').setRequired(false),
        ),
    )
    // ── Permissions ──────────────────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('permissions')
        .setDescription('Add or remove permission roles for a moderation command.')
        .addStringOption((opt) =>
          opt
            .setName('action')
            .setDescription('set or remove')
            .setRequired(true)
            .addChoices({ name: 'set', value: 'set' }, { name: 'remove', value: 'remove' }),
        )
        .addStringOption((opt) =>
          opt
            .setName('command')
            .setDescription('The command to configure permissions for')
            .setRequired(true)
            .addChoices(
              { name: 'ban', value: 'BAN' },
              { name: 'kick', value: 'KICK' },
              { name: 'mute', value: 'MUTE' },
              { name: 'warn', value: 'WARN' },
              { name: 'countingblacklist', value: 'COUNTINGBLACKLIST' },
              { name: 'manageinfractions', value: 'MANAGEINFRACTIONS' },
              { name: 'timeout', value: 'TIMEOUT' },
            ),
        )
        .addRoleOption((opt) => opt.setName('role1').setDescription('Role to add/remove').setRequired(true))
        .addRoleOption((opt) => opt.setName('role2').setDescription('Additional role').setRequired(false))
        .addRoleOption((opt) => opt.setName('role3').setDescription('Additional role').setRequired(false))
        .addRoleOption((opt) => opt.setName('role4').setDescription('Additional role').setRequired(false))
        .addRoleOption((opt) => opt.setName('role5').setDescription('Additional role').setRequired(false)),
    )
    // ── Appeal links ─────────────────────────────────────────
    .addSubcommand((sub) =>
      sub
        .setName('appeallink')
        .setDescription('Set or remove an appeal link for a moderation action.')
        .addStringOption((opt) =>
          opt
            .setName('action')
            .setDescription('set or remove')
            .setRequired(true)
            .addChoices({ name: 'set', value: 'set' }, { name: 'remove', value: 'remove' }),
        )
        .addStringOption((opt) =>
          opt
            .setName('command')
            .setDescription('The action to set the appeal link for')
            .setRequired(true)
            .addChoices(
              { name: 'ban', value: 'BAN' },
              { name: 'kick', value: 'KICK' },
              { name: 'mute', value: 'MUTE' },
              { name: 'warn', value: 'WARN' },
              { name: 'countingblacklist', value: 'COUNTINGBLACKLIST' },
              { name: 'timeout', value: 'TIMEOUT' },
            ),
        )
        .addStringOption((opt) =>
          opt.setName('link').setDescription('The appeal link URL or template (required for set)').setRequired(false),
        ),
    ),

  // ────────────────────────────────────────────────────────────
  // Execute
  // ────────────────────────────────────────────────────────────
  execute: async (interaction) => {
    await interaction.deferReply();

    if (!hasManageServer(interaction.member)) {
      await reply(interaction, {
        title: 'Permission Denied',
        description: 'You need Manage Server permission to use this command.',
        color: ERROR_COLOR,
      });
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    // ── View ──────────────────────────────────────────────────
    if (subcommand === 'view') {
      const [
        currentConfig,
        warnAppeal,
        muteAppeal,
        kickAppeal,
        banAppeal,
        countingBlacklistAppeal,
        timeoutAppeal,
      ] = await Promise.all([
        getGuildConfigWithPermissionRoles(interaction.guild.id),
        getAppealLink(interaction.guild.id, 'WARN'),
        getAppealLink(interaction.guild.id, 'MUTE'),
        getAppealLink(interaction.guild.id, 'KICK'),
        getAppealLink(interaction.guild.id, 'BAN'),
        getAppealLink(interaction.guild.id, 'COUNTINGBLACKLIST'),
        getAppealLink(interaction.guild.id, 'TIMEOUT'),
      ]);

      const fmt = {
        channel: (id) => (id ? mentionChannel(id) : 'Not set'),
        role: (id) => (id ? mentionRole(id) : 'Not set'),
        roles: (r) => (r?.length ? r.join(', ') : 'Not set'),
        link: (l) => l ?? 'Not set',
      };

      await interaction.editReply({
        embeds: [
          buildEmbed({
            title: `Server Config for ${interaction.guild.name}`,
            fields: [
              {
                name: 'General Settings',
                value: `Mute Role: ${fmt.role(currentConfig.muteRole)}`,
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
          }),
        ],
      });
      return;
    }


    // ── Role subcommands ──────────────────────────────────────
    if (subcommand in ROLE_CONFIG_KEYS) {
      const configKey = ROLE_CONFIG_KEYS[subcommand];
      const action = interaction.options.getString('action');

      if (action === 'set') {
        const role = interaction.options.getRole('role');
        if (!role) {
          await reply(interaction, {
            title: 'Config',
            color: ERROR_COLOR,
            description: 'Please provide a role when using the `set` action.',
          });
          return;
        }
        await setGuildConfig(interaction.guild.id, { [configKey]: role.id });
        await reply(interaction, {
          title: 'Config Updated',
          color: SUCCESS_COLOR,
          description: `${formatSubcommandName(subcommand)} set to **${role.name}**.`,
        });
      } else {
        await setGuildConfig(interaction.guild.id, { [configKey]: null });
        await reply(interaction, {
          title: 'Config Updated',
          color: SUCCESS_COLOR,
          description: `${formatSubcommandName(subcommand)} removed.`,
        });
      }
      return;
    }

    // ── Counting time limit ───────────────────────────────────
    if (subcommand === 'countingtimelimit') {
      const action = interaction.options.getString('action');

      if (action === 'set') {
        const minutes = interaction.options.getNumber('minutes');
        if (!minutes) {
          await reply(interaction, {
            title: 'Config',
            color: ERROR_COLOR,
            description: 'Please provide a number of minutes when using the `set` action.',
          });
          return;
        }
        const countingWindowMs = Math.round(minutes * 60 * 1000);
        await setGuildConfig(interaction.guild.id, { countingWindowMs: BigInt(countingWindowMs) });
        await reply(interaction, {
          title: 'Config Updated',
          color: SUCCESS_COLOR,
          description: `Counting time limit set to **${minutes} minutes**.`,
        });
      } else {
        await setGuildConfig(interaction.guild.id, { countingWindowMs: null });
        await reply(interaction, {
          title: 'Config Updated',
          color: SUCCESS_COLOR,
          description: 'Counting time limit removed.',
        });
      }
      return;
    }

    // ── Channel subcommands ───────────────────────────────────
    if (subcommand in CHANNEL_CONFIG_KEYS) {
      const configKey = CHANNEL_CONFIG_KEYS[subcommand];
      const action = interaction.options.getString('action');

      if (action === 'set') {
        const channel = interaction.options.getChannel('channel');
        if (!channel) {
          await reply(interaction, {
            title: 'Config',
            color: ERROR_COLOR,
            description: 'Please provide a channel when using the `set` action.',
          });
          return;
        }
        await setGuildConfig(interaction.guild.id, { [configKey]: channel.id });
        await reply(interaction, {
          title: 'Config Updated',
          color: SUCCESS_COLOR,
          description: `${formatSubcommandName(subcommand)} set to **${channel.name}**.`,
        });
      } else {
        await setGuildConfig(interaction.guild.id, { [configKey]: null });
        await reply(interaction, {
          title: 'Config Updated',
          color: SUCCESS_COLOR,
          description: `${formatSubcommandName(subcommand)} removed.`,
        });
      }
      return;
    }

    // ── Permissions ───────────────────────────────────────────
    if (subcommand === 'permissions') {
      const action = interaction.options.getString('action');
      const command = interaction.options.getString('command');

      if (!VALID_PERMISSION_COMMANDS.includes(command)) {
        await reply(interaction, {
          title: 'Config',
          color: ERROR_COLOR,
          description: 'Invalid command specified.',
        });
        return;
      }

      // Collect up to 5 roles
      const roles = [
        interaction.options.getRole('role1'),
        interaction.options.getRole('role2'),
        interaction.options.getRole('role3'),
        interaction.options.getRole('role4'),
        interaction.options.getRole('role5'),
      ].filter(Boolean);

      const results = await Promise.allSettled(
        roles.map((role) => {
          if (action === 'set') {
            return addPermissionRole(interaction.guild.id, command, role.id)
              .then(() => ({ status: 'ok', name: role.name }))
              .catch((err) => ({
                status: err.code === 'P2002' ? 'skipped' : 'error',
                name: role.name,
                err,
              }));
          }
          return removePermissionRole(interaction.guild.id, command, role.id)
            .then(() => ({ status: 'ok', name: role.name }))
            .catch((err) => ({
              status: err.code === 'P2025' ? 'skipped' : 'error',
              name: role.name,
              err,
            }));
        }),
      );

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

      await reply(interaction, {
        title: 'Config Updated',
        color: SUCCESS_COLOR,
        description: response || 'No roles were updated.',
      });
      return;
    }

    // ── Appeal links ──────────────────────────────────────────
    if (subcommand === 'appeallink') {
      const action = interaction.options.getString('action');
      const command = interaction.options.getString('command');

      if (!VALID_APPEAL_LINK_COMMANDS.includes(command)) {
        await reply(interaction, {
          title: 'Config',
          color: ERROR_COLOR,
          description: 'Invalid command specified.',
        });
        return;
      }

      try {
        if (action === 'set') {
          const link = interaction.options.getString('link');
          if (!link) {
            await reply(interaction, {
              title: 'Config',
              color: ERROR_COLOR,
              description: 'Please provide a link when using the `set` action.',
            });
            return;
          }
          await setAppealLink(interaction.guild.id, command, link);
          await reply(interaction, {
            title: 'Config Updated',
            color: SUCCESS_COLOR,
            description: `Set appeal link for **${command.toLowerCase()}**.`,
          });
        } else {
          await removeAppealLink(interaction.guild.id, command);
          await reply(interaction, {
            title: 'Config Updated',
            color: SUCCESS_COLOR,
            description: `Removed appeal link for **${command.toLowerCase()}**.`,
          });
        }
      } catch (err) {
        if (err.code === 'P2025') {
          await reply(interaction, {
            title: 'Config',
            description: `No appeal link was set for **${command.toLowerCase()}**.`,
          });
        } else {
          console.error(err);
          await replyError(interaction, err, { userMessage: 'Failed to update appeal link.' });
        }
      }
    }
  },
};
