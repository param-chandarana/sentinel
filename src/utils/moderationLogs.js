import { getGuildConfig } from '../config/guildConfig.js';
import { setInfractionModlogMessageId } from '../db/queries/infraction.js';
import { buildEmbed, INFO_COLOR, send, SUCCESS_COLOR } from './embedBuilder.js';
import { mentionUser } from './mentions.js';

const toUnixTimestamp = (value) => Math.floor(new Date(value).getTime() / 1000);

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

const formatUserWithId = (userId) => `${mentionUser(userId)}\n\`${userId}\``;

export const buildModerationModlogEmbed = ({
  infraction,
  actionLabel,
  executorId,
  reason,
  durationSeconds,
  color = INFO_COLOR,
  timestamp = new Date(),
  title,
  dmResult,
  extraFields = [],
}) =>
  buildEmbed({
    title: title ?? `${actionLabel} Case #${infraction.caseNumber}`,
    color,
    fields: [
      { name: 'Case Number', value: `#${infraction.caseNumber}`, inline: true },
      { name: 'Action', value: actionLabel, inline: true },
      { name: 'Date Time', value: `<t:${toUnixTimestamp(timestamp)}:F>`, inline: true },
      { name: 'Affected User', value: formatUserWithId(infraction.userId), inline: false },
      { name: 'Executor', value: formatUserWithId(executorId), inline: false },
      { name: 'Reason', value: reason || infraction.reason || 'No reason provided', inline: false },
      {
        name: 'Duration',
        value: durationSeconds
          ? formatDuration(durationSeconds)
          : formatDuration(infraction.durationSeconds),
        inline: true,
      },
      {
        name: 'DM Status',
        value: dmResult?.delivered ? 'Delivered' : dmResult?.reason || 'Not attempted',
        inline: true,
      },
      ...extraFields,
    ],
    footer: `Infraction ID ${infraction.id}`,
  });

export const buildBanLogEmbed = ({ infraction, reason, color = SUCCESS_COLOR, title }) =>
  buildEmbed({
    title: title ?? 'Ban Log',
    color,
    fields: [
      { name: 'Affected User', value: formatUserWithId(infraction.userId), inline: false },
      { name: 'Reason', value: reason || infraction.reason || 'No reason provided', inline: false },
    ],
  });

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
      });
      result.banlogMessage = await send(banlogChannel, banlogEmbed).catch((err) => {
        console.error(`Failed to send banlog embed for infraction ${infraction.id}:`, err);
        return null;
      });
    }
  }

  return result;
};
