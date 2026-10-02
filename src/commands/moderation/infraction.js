import { SlashCommandBuilder } from 'discord.js';
import { getGuildConfig } from '../../config/guildConfig.js';
import {
  countInfractionsForGuild,
  countInfractionsForUser,
  getInfractionById,
  listInfractionsForGuild,
  listInfractionsForUser,
  setInfractionModlogMessageId,
  softDeleteInfraction,
  updateInfractionReason,
} from '../../db/queries/infraction.js';
import { getPermissionRoles } from '../../db/queries/permissionRole.js';
import {
  buildEmbed,
  ERROR_COLOR,
  INFO_COLOR,
  SUCCESS_COLOR,
  reply,
} from '../../utils/embedBuilder.js';
import { mentionUser } from '../../utils/mentions.js';
import { hasManageServer, isModerator } from '../../utils/permissions.js';

const PAGE_SIZE = 10;

const isManageInfractions = async (member, guildId) => {
  if (hasManageServer(member)) return true;

  const permissionRoles = await getPermissionRoles(guildId, 'MANAGEINFRACTIONS').catch(() => []);
  return permissionRoles.some((role) => member.roles.cache.has(role.roleId));
};

const formatDuration = (infraction) => {
  if (!infraction.durationSeconds) return 'Permanent';

  const seconds = Number(infraction.durationSeconds);
  if (Number.isNaN(seconds) || seconds <= 0) return 'Unknown';

  const parts = [];
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;

  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (remaining && parts.length === 0) parts.push(`${remaining}s`);

  return parts.length ? parts.join(' ') : `${seconds}s`;
};

const formatStatus = (infraction) => {
  if (infraction.deletedAt) return 'Deleted';
  if (infraction.active === false) return 'Inactive';
  return 'Active';
};

const buildInfractionFields = (infraction) => [
  { name: 'User', value: mentionUser(infraction.userId), inline: true },
  { name: 'Moderator', value: mentionUser(infraction.moderatorId), inline: true },
  { name: 'Type', value: infraction.type, inline: true },
  { name: 'Reason', value: infraction.reason || 'No reason provided', inline: false },
  { name: 'Duration', value: formatDuration(infraction), inline: true },
  { name: 'Status', value: formatStatus(infraction), inline: true },
  {
    name: 'Created',
    value: `<t:${Math.floor(new Date(infraction.createdAt).getTime() / 1000)}:R>`,
    inline: true,
  },
  {
    name: 'Expires',
    value: infraction.expiresAt
      ? `<t:${Math.floor(new Date(infraction.expiresAt).getTime() / 1000)}:R>`
      : 'Not set',
    inline: true,
  },
];

const buildInfractionEmbed = (title, infraction, color = INFO_COLOR, extraFields = []) =>
  buildEmbed({
    title,
    color,
    fields: [...buildInfractionFields(infraction), ...extraFields],
    footer: `Case #${infraction.caseNumber} • ID ${infraction.id}`,
  });

const fetchModlogChannel = async (guild, channelId) => {
  if (!guild || !channelId) return null;
  return guild.channels.cache.get(channelId) ?? guild.channels.fetch(channelId).catch(() => null);
};

const editOrPostModlog = async (guild, config, infraction, embed) => {
  const channel = await fetchModlogChannel(guild, config.modLogChannel);
  if (!channel || typeof channel.send !== 'function') return null;

  if (infraction.modlogMessageId) {
    try {
      const original = await channel.messages.fetch(infraction.modlogMessageId);
      await original.edit({ embeds: [embed] });
      return original;
    } catch (err) {
      console.error(`Failed to edit modlog message for infraction ${infraction.id}:`, err);
    }
  }

  const posted = await channel.send({ embeds: [embed] }).catch((err) => {
    console.error(`Failed to post modlog message for infraction ${infraction.id}:`, err);
    return null;
  });

  if (posted?.id) {
    await setInfractionModlogMessageId(infraction.id, posted.id).catch((err) => {
      console.error(`Failed to store modlog message ID for infraction ${infraction.id}:`, err);
    });
  }

  return posted;
};

const listCommand = async (interaction) => {
  const canManageAll = await isManageInfractions(interaction.member, interaction.guild.id);
  const targetUser = interaction.options.getUser('user');
  const targetId = targetUser?.id;

  if (targetId && targetId !== interaction.user.id) {
    const isMod = await isModerator(interaction.member, interaction.guild.id);
    if (!isMod && !canManageAll) {
      await reply(interaction, {
        title: 'Permission Denied',
        description: "You must have active moderator permissions to view other users' infractions.",
        color: ERROR_COLOR,
      });
      return;
    }
  }

  const page = interaction.options.getInteger('page') || 1;
  const showAll = !targetId && canManageAll;
  const guildId = interaction.guild.id;

  const total = showAll
    ? await countInfractionsForGuild(guildId)
    : targetId
      ? await countInfractionsForUser(guildId, targetId)
      : await countInfractionsForUser(guildId, interaction.user.id);

  const currentPage = Math.max(page, 1);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const infractions = showAll
    ? await listInfractionsForGuild(guildId, false, PAGE_SIZE, skip)
    : targetId
      ? await listInfractionsForUser(guildId, targetId, false, PAGE_SIZE, skip)
      : await listInfractionsForUser(guildId, interaction.user.id, false, PAGE_SIZE, skip);

  const pageItems = infractions;

  if (!showAll && !targetId && total === 0) {
    await reply(interaction, {
      title: 'Infractions',
      description: 'You do not have any infractions yet.',
    });
    return;
  }

  if (showAll && total === 0) {
    await reply(interaction, {
      title: 'Infractions',
      description: 'There are no infractions in this server yet.',
    });
    return;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectedPage = Math.min(currentPage, totalPages);
  if (showAll && selectedPage !== currentPage) {
    await reply(interaction, {
      title: 'Infractions',
      description: `Page ${currentPage} is out of range. Try page ${selectedPage}.`,
      color: ERROR_COLOR,
    });
    return;
  }

  const displayTargetName = targetUser ? targetUser.tag : interaction.user.tag;

  const fields = pageItems.map((infraction) => ({
    name: `#${infraction.caseNumber} • ${infraction.type}${infraction.deletedAt ? ' • Deleted' : ''}`,
    value: [
      `User: ${mentionUser(infraction.userId)}`,
      `Moderator: ${mentionUser(infraction.moderatorId)}`,
      `Reason: ${infraction.reason || 'No reason provided'}`,
      `Duration: ${formatDuration(infraction)}`,
      `Status: ${formatStatus(infraction)}`,
      infraction.expiresAt
        ? `Expires: <t:${Math.floor(new Date(infraction.expiresAt).getTime() / 1000)}:R>`
        : null,
    ]
      .filter(Boolean)
      .join('\n'),
  }));

  await reply(interaction, {
    title: showAll ? 'Server Infractions' : `Infractions for ${displayTargetName}`,
    description: `Page ${selectedPage} of ${totalPages} • ${total} total`,
    fields: fields.length
      ? fields
      : [{ name: 'No Results', value: 'No infractions found for this page.' }],
    color: INFO_COLOR,
  });
};

const editCommand = async (interaction) => {
  const infractionId = interaction.options.getInteger('id');
  const reason = interaction.options.getString('reason');

  const infraction = await getInfractionById(infractionId);
  if (!infraction || infraction.deletedAt) {
    await reply(interaction, {
      title: 'Infraction Edit',
      description: 'That infraction could not be found.',
      color: ERROR_COLOR,
    });
    return;
  }

  const canManageAll = await isManageInfractions(interaction.member, interaction.guild.id);
  const isMod = await isModerator(interaction.member, interaction.guild.id);
  if (!canManageAll) {
    if (!isMod) {
      await reply(interaction, {
        title: 'Permission Denied',
        description: 'You must have active moderator permissions to edit infractions.',
        color: ERROR_COLOR,
      });
      return;
    }
    if (interaction.user.id !== infraction.moderatorId) {
      await reply(interaction, {
        title: 'Permission Denied',
        description: 'You can only edit your own infractions unless you have Manage Infractions.',
        color: ERROR_COLOR,
      });
      return;
    }
  }

  await updateInfractionReason(infraction.id, reason);

  const config = await getGuildConfig(interaction.guild.id);
  const updatedInfraction = { ...infraction, reason };

  const logEmbed = buildInfractionEmbed(
    'Infraction Reason Updated',
    updatedInfraction,
    INFO_COLOR,
    [
      { name: 'Edited By', value: mentionUser(interaction.user.id), inline: true },
      { name: 'Edited At', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
    ],
  );

  if (config.modLogChannel) {
    await editOrPostModlog(interaction.guild, config, infraction, logEmbed);
  }

  await reply(interaction, {
    title: 'Infraction Updated',
    description: `Updated reason for case #${infraction.caseNumber}.`,
    color: SUCCESS_COLOR,
  });
};

const deleteCommand = async (interaction) => {
  const infractionId = interaction.options.getInteger('id');

  const infraction = await getInfractionById(infractionId);
  if (!infraction || infraction.deletedAt) {
    await reply(interaction, {
      title: 'Infraction Delete',
      description: 'That infraction could not be found.',
      color: ERROR_COLOR,
    });
    return;
  }

  const canManageAll = await isManageInfractions(interaction.member, interaction.guild.id);
  const isMod = await isModerator(interaction.member, interaction.guild.id);
  if (!canManageAll) {
    if (!isMod) {
      await reply(interaction, {
        title: 'Permission Denied',
        description: 'You must have active moderator permissions to delete infractions.',
        color: ERROR_COLOR,
      });
      return;
    }
    if (interaction.user.id !== infraction.moderatorId) {
      await reply(interaction, {
        title: 'Permission Denied',
        description: 'You can only delete your own infractions unless you have Manage Infractions.',
        color: ERROR_COLOR,
      });
      return;
    }
  }

  await softDeleteInfraction(infraction.id);

  const config = await getGuildConfig(interaction.guild.id);
  if (config.modLogChannel) {
    const channel = await fetchModlogChannel(interaction.guild, config.modLogChannel);
    if (channel && typeof channel.send === 'function') {
      await channel
        .send({
          embeds: [
            buildInfractionEmbed(
              'Infraction Deleted',
              { ...infraction, deletedAt: new Date() },
              ERROR_COLOR,
              [
                { name: 'Deleted By', value: mentionUser(interaction.user.id), inline: true },
                {
                  name: 'Deleted At',
                  value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
                  inline: true,
                },
              ],
            ),
          ],
        })
        .catch((err) => {
          console.error(
            `Failed to send infraction delete log for case #${infraction.caseNumber}:`,
            err,
          );
        });
    }
  }

  await reply(interaction, {
    title: 'Infraction Deleted',
    description: `Deleted case #${infraction.caseNumber}.`,
    color: SUCCESS_COLOR,
  });
};

export const infraction = {
  data: new SlashCommandBuilder()
    .setName('infraction')
    .setDescription('Manage or view infractions')
    .addSubcommand((subcommand) =>
      subcommand
        .setName('list')
        .setDescription('List infractions for a user or the server')
        .addUserOption((option) =>
          option.setName('user').setDescription('The user to view infractions for').setRequired(false),
        )
        .addIntegerOption((option) =>
          option.setName('page').setDescription('Page number to view').setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('edit')
        .setDescription('Edit an infraction reason')
        .addIntegerOption((option) =>
          option.setName('id').setDescription('The ID of the infraction').setRequired(true),
        )
        .addStringOption((option) =>
          option.setName('reason').setDescription('The new reason').setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('delete')
        .setDescription('Delete an infraction')
        .addIntegerOption((option) =>
          option.setName('id').setDescription('The ID of the infraction to delete').setRequired(true),
        ),
    ),

  execute: async (interaction) => {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'list') {
      return listCommand(interaction);
    }
    if (subcommand === 'edit') {
      return editCommand(interaction);
    }
    if (subcommand === 'delete') {
      return deleteCommand(interaction);
    }
  },
};
