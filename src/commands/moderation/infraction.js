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
  bindReply,
  buildEmbed,
  ERROR_COLOR,
  INFO_COLOR,
  SUCCESS_COLOR,
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

const getTargetFromArgs = async (message, args) => {
  const mention = message.mentions.users.first();
  if (mention) return mention.id;

  const raw = args[1];
  if (!raw) return null;

  const id = raw.replace(/[<@!>]/g, '');
  if (/^\d{17,20}$/.test(id)) return id;

  return null;
};

const getPageNumber = (raw) => {
  const page = Number(raw);
  return Number.isInteger(page) && page > 0 ? page : 1;
};

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

const listCommand = async (message, args) => {
  const replyEmbed = bindReply(message);
  const canManageAll = await isManageInfractions(message.member, message.guild.id);
  const targetId = await getTargetFromArgs(message, args);

  if (targetId && targetId !== message.author.id) {
    const isMod = await isModerator(message.member, message.guild.id);
    if (!isMod && !canManageAll) {
      await replyEmbed({
        title: 'Permission Denied',
        description: "You must have active moderator permissions to view other users' infractions.",
        color: ERROR_COLOR,
      });
      return;
    }
  }

  const page = getPageNumber(targetId ? args[2] : args[1]);

  const showAll = !targetId && canManageAll;
  const guildId = message.guild.id;

  const total = showAll
    ? await countInfractionsForGuild(guildId)
    : targetId
      ? await countInfractionsForUser(guildId, targetId)
      : await countInfractionsForUser(guildId, message.author.id);

  const currentPage = Math.max(page, 1);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const infractions = showAll
    ? await listInfractionsForGuild(guildId, false, PAGE_SIZE, skip)
    : targetId
      ? await listInfractionsForUser(guildId, targetId, false, PAGE_SIZE, skip)
      : await listInfractionsForUser(guildId, message.author.id, false, PAGE_SIZE, skip);

  const pageItems = infractions;

  if (!showAll && !targetId && total === 0) {
    await replyEmbed({
      title: 'Infractions',
      description: 'You do not have any infractions yet.',
    });
    return;
  }

  if (showAll && total === 0) {
    await replyEmbed({
      title: 'Infractions',
      description: 'There are no infractions in this server yet.',
    });
    return;
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selectedPage = Math.min(currentPage, totalPages);
  if (showAll && selectedPage !== currentPage) {
    await replyEmbed({
      title: 'Infractions',
      description: `Page ${currentPage} is out of range. Try page ${selectedPage}.`,
      color: ERROR_COLOR,
    });
    return;
  }

  const displayTarget = targetId ?? message.author.id;
  const targetUser = targetId
    ? message.mentions.users.first() ||
      (await message.client.users.fetch(targetId).catch(() => null))
    : message.author;
  const displayTargetName = targetUser ? targetUser.tag : displayTarget;

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

  await replyEmbed({
    title: showAll ? 'Server Infractions' : `Infractions for ${displayTargetName}`,
    description: `Page ${selectedPage} of ${totalPages} • ${total} total`,
    fields: fields.length
      ? fields
      : [{ name: 'No Results', value: 'No infractions found for this page.' }],
    color: INFO_COLOR,
  });
};

const editCommand = async (message, args) => {
  const replyEmbed = bindReply(message);
  const infractionId = Number(args[1]);
  if (!Number.isInteger(infractionId) || infractionId <= 0) {
    await replyEmbed({
      title: 'Infraction Edit',
      description:
        'Please provide a valid infraction ID. e.g. `infraction edit 12 --reason new reason`',
      color: ERROR_COLOR,
    });
    return;
  }

  const infraction = await getInfractionById(infractionId);
  if (!infraction || infraction.deletedAt) {
    await replyEmbed({
      title: 'Infraction Edit',
      description: 'That infraction could not be found.',
      color: ERROR_COLOR,
    });
    return;
  }

  const canManageAll = await isManageInfractions(message.member, message.guild.id);
  const isMod = await isModerator(message.member, message.guild.id);
  if (!canManageAll) {
    if (!isMod) {
      await replyEmbed({
        title: 'Permission Denied',
        description: 'You must have active moderator permissions to edit infractions.',
        color: ERROR_COLOR,
      });
      return;
    }
    if (message.author.id !== infraction.moderatorId) {
      await replyEmbed({
        title: 'Permission Denied',
        description: 'You can only edit your own infractions unless you have Manage Infractions.',
        color: ERROR_COLOR,
      });
      return;
    }
  }

  const reasonFlagIndex = args.findIndex((arg) => arg === '--reason' || arg === '-r');
  const reason =
    reasonFlagIndex >= 0
      ? args
          .slice(reasonFlagIndex + 1)
          .join(' ')
          .trim()
      : args.slice(2).join(' ').trim();

  if (!reason) {
    await replyEmbed({
      title: 'Infraction Edit',
      description: 'Please provide a new reason. e.g. `infraction edit 12 --reason new reason`',
      color: ERROR_COLOR,
    });
    return;
  }

  await updateInfractionReason(infraction.id, reason);

  const config = await getGuildConfig(message.guild.id);
  const updatedInfraction = { ...infraction, reason };

  const logEmbed = buildInfractionEmbed(
    'Infraction Reason Updated',
    updatedInfraction,
    INFO_COLOR,
    [
      { name: 'Edited By', value: mentionUser(message.author.id), inline: true },
      { name: 'Edited At', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
    ],
  );

  if (config.modLogChannel) {
    await editOrPostModlog(message.guild, config, infraction, logEmbed);
  }

  await replyEmbed({
    title: 'Infraction Updated',
    description: `Updated reason for case #${infraction.caseNumber}.`,
    color: SUCCESS_COLOR,
  });
};

const deleteCommand = async (message, args) => {
  const replyEmbed = bindReply(message);
  const infractionId = Number(args[1]);
  if (!Number.isInteger(infractionId) || infractionId <= 0) {
    await replyEmbed({
      title: 'Infraction Delete',
      description: 'Please provide a valid infraction ID. e.g. `infraction delete 12`',
      color: ERROR_COLOR,
    });
    return;
  }

  const infraction = await getInfractionById(infractionId);
  if (!infraction || infraction.deletedAt) {
    await replyEmbed({
      title: 'Infraction Delete',
      description: 'That infraction could not be found.',
      color: ERROR_COLOR,
    });
    return;
  }

  const canManageAll = await isManageInfractions(message.member, message.guild.id);
  const isMod = await isModerator(message.member, message.guild.id);
  if (!canManageAll) {
    if (!isMod) {
      await replyEmbed({
        title: 'Permission Denied',
        description: 'You must have active moderator permissions to delete infractions.',
        color: ERROR_COLOR,
      });
      return;
    }
    if (message.author.id !== infraction.moderatorId) {
      await replyEmbed({
        title: 'Permission Denied',
        description: 'You can only delete your own infractions unless you have Manage Infractions.',
        color: ERROR_COLOR,
      });
      return;
    }
  }

  await softDeleteInfraction(infraction.id);

  const config = await getGuildConfig(message.guild.id);
  if (config.modLogChannel) {
    const channel = await fetchModlogChannel(message.guild, config.modLogChannel);
    if (channel && typeof channel.send === 'function') {
      await channel
        .send({
          embeds: [
            buildInfractionEmbed(
              'Infraction Deleted',
              { ...infraction, deletedAt: new Date() },
              ERROR_COLOR,
              [
                { name: 'Deleted By', value: mentionUser(message.author.id), inline: true },
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

  await replyEmbed({
    title: 'Infraction Deleted',
    description: `Deleted case #${infraction.caseNumber}.`,
    color: SUCCESS_COLOR,
  });
};

export const infraction = {
  name: 'infraction',
  aliases: ['infractions', 'punishment', 'punishments'],
  execute: async (message, args, prefix) => {
    const subcommand = args[0]?.toLowerCase();

    if (!subcommand || subcommand === 'list') {
      return listCommand(message, args);
    }

    if (subcommand === 'edit') {
      return editCommand(message, args, prefix);
    }

    if (subcommand === 'delete') {
      return deleteCommand(message, args, prefix);
    }

    const replyEmbed = bindReply(message);
    await replyEmbed({
      title: 'Infraction',
      description:
        'Unknown subcommand. Use `infraction list`, `infraction edit <id> --reason ...`, or `infraction delete <id>`.',
      color: ERROR_COLOR,
    });
  },
};
