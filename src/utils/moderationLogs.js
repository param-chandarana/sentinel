import { getGuildConfig } from '../config/guildConfig.js';
import { setInfractionModlogMessageId } from '../db/queries/infraction.js';
import { buildEmbed, INFO_COLOR, send } from './embedBuilder.js';
import { mentionUser } from './mentions.js';

const formatDuration = (durationSeconds) => {
  if (!durationSeconds) return 'Permanent';

  const seconds = Number(durationSeconds);
  if (Number.isNaN(seconds) || seconds <= 0) return 'Permanent';

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

const toTitleCase = (str) => {
  if (!str) return '';
  const upper = str.toUpperCase();
  if (upper === 'COUNTINGBLACKLIST') return 'Counting Blacklist';
  if (upper === 'COUNTINGUNBLACKLIST') return 'Counting Unblacklist';
  return str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
};

const getActionColor = (action) => {
  const act = String(action).toUpperCase();
  if (act.includes('BAN')) return 0xe74c3c; // Red
  if (act.includes('MUTE') || act.includes('WARN')) return 0xe67e22; // Orange
  if (act.includes('UN')) return 0x57f287; // Green
  return 0x58a6ff; // Blue
};

export const buildModerationModlogEmbed = ({
  infraction,
  actionLabel,
  executorId,
  reason,
  durationSeconds,
  color,
  timestamp = new Date(),
  title,
  dmResult,
  extraFields = [],
}) => {
  const dynamicColor = color ?? getActionColor(actionLabel);
  const titleCaseAction = toTitleCase(actionLabel);

  const fields = [
    {
      name: 'Target User',
      value: `${mentionUser(infraction.userId)}\n\`${infraction.userId}\``,
      inline: true,
    },
    { name: 'Moderator', value: `${mentionUser(executorId)}\n\`${executorId}\``, inline: true },
  ];

  const isTemporary = ['TEMPBAN', 'TEMPMUTE'].includes(actionLabel.toUpperCase());
  if (isTemporary) {
    const durVal = durationSeconds || infraction.durationSeconds;
    fields.push({
      name: 'Duration',
      value: formatDuration(durVal),
      inline: true,
    });
  }

  const dmSupportedActions = [
    'BAN',
    'TEMPBAN',
    'KICK',
    'MUTE',
    'TEMPMUTE',
    'WARN',
    'COUNTING_BLACKLIST',
  ];
  if (dmSupportedActions.includes(actionLabel.toUpperCase())) {
    let dmStatusText = 'Not attempted';
    if (dmResult) {
      dmStatusText = dmResult.delivered ? 'Delivered' : toTitleCase(dmResult.reason || 'failed');
    } else if (infraction.dmStatus && infraction.dmStatus !== 'pending') {
      dmStatusText =
        infraction.dmStatus === 'delivered' ? 'Delivered' : toTitleCase(infraction.dmStatus);
    }
    fields.push({
      name: 'DM Status',
      value: dmStatusText,
      inline: true,
    });
  }

  fields.push({
    name: 'Reason',
    value: reason || infraction.reason || 'No reason provided',
    inline: false,
  });

  return buildEmbed({
    title: title ?? `${titleCaseAction} | Case #${infraction.caseNumber}`,
    color: dynamicColor,
    fields: [...fields, ...extraFields],
    timestamp,
  });
};

export const buildBanLogEmbed = ({ infraction, reason, color, title, timestamp = new Date() }) => {
  const titleCaseTitle = toTitleCase(title ?? 'Ban Log');
  const dynamicColor = color ?? getActionColor(title ?? 'BAN');

  return buildEmbed({
    title: titleCaseTitle,
    color: dynamicColor,
    fields: [
      {
        name: 'Affected User',
        value: `${mentionUser(infraction.userId)}\n\`${infraction.userId}\``,
        inline: false,
      },
      { name: 'Reason', value: reason || infraction.reason || 'No reason provided', inline: false },
    ],
    timestamp,
  });
};

export const postModerationLogs = async ({
  guild,
  infraction,
  actionLabel,
  executorId,
  reason,
  durationSeconds,
  color = INFO_COLOR,
  timestamp = new Date(),
  banLog = false,
  banLogReason,
  title,
  extraFields = [],
  dmResult,
}) => {
  if (!guild || !infraction) return { modlogMessage: null, banlogMessage: null };

  const config = await getGuildConfig(guild.id);
  const modlogChannelId = config.modLogChannel;
  const banlogChannelId = config.banLogChannel;

  const modlogEmbed = buildModerationModlogEmbed({
    infraction,
    actionLabel,
    executorId,
    reason,
    durationSeconds,
    color,
    timestamp,
    title,
    extraFields,
    dmResult,
  });

  const result = { modlogMessage: null, banlogMessage: null };

  if (modlogChannelId) {
    const modlogChannel =
      guild.channels.cache.get(modlogChannelId) ??
      (await guild.channels.fetch(modlogChannelId).catch(() => null));
    if (modlogChannel && typeof modlogChannel.send === 'function') {
      result.modlogMessage = await send(modlogChannel, modlogEmbed).catch((err) => {
        console.error(`Failed to send modlog embed for infraction ${infraction.id}:`, err);
        return null;
      });

      if (result.modlogMessage?.id) {
        await setInfractionModlogMessageId(infraction.id, result.modlogMessage.id).catch((err) => {
          console.error(`Failed to store modlog message ID for infraction ${infraction.id}:`, err);
        });
      }
    }
  }

  if (banLog && banlogChannelId) {
    const banlogChannel =
      guild.channels.cache.get(banlogChannelId) ??
      (await guild.channels.fetch(banlogChannelId).catch(() => null));
    if (banlogChannel && typeof banlogChannel.send === 'function') {
      const banlogEmbed = buildBanLogEmbed({
        infraction,
        title: actionLabel,
        reason: banLogReason ?? reason,
        color,
        timestamp,
      });
      result.banlogMessage = await send(banlogChannel, banlogEmbed).catch((err) => {
        console.error(`Failed to send banlog embed for infraction ${infraction.id}:`, err);
        return null;
      });
    }
  }

  return result;
};
