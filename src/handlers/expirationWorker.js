import { getGuildConfig } from '../config/guildConfig.js';
import { getExpiredInfractions, setInfractionActive } from '../db/queries/infraction.js';
import { SUCCESS_COLOR, buildEmbed, send } from '../utils/embedBuilder.js';

const POLL_INTERVAL_MS = 60 * 1000;

const isKnownMissingMemberError = (err) => err?.code === 10007;
const isKnownAlreadyProcessedError = (err) => err?.code === 10026;

async function fetchGuild(client, guildId) {
  return client.guilds.cache.get(guildId) ?? client.guilds.fetch(guildId).catch(() => null);
}

async function fetchTextChannel(guild, channelId) {
  if (!guild || !channelId) return null;
  const cached = guild.channels.cache.get(channelId);
  if (cached) return cached;

  return guild.channels.fetch(channelId).catch(() => null);
}

async function postLog(guild, channelId, options) {
  const channel = await fetchTextChannel(guild, channelId);
  if (!channel || typeof channel.send !== 'function') return;

  await send(channel, options).catch((err) => {
    console.error(`Failed to send expiry log in guild ${guild.id}:`, err);
  });
}

async function processTempban(client, infraction, config) {
  const guild = await fetchGuild(client, infraction.guildId);
  if (!guild) {
    await setInfractionActive(infraction.id, false);
    return;
  }

  const logEmbed = buildEmbed({
    title: 'Tempban Expired',
    description: `<@${infraction.userId}> has been automatically unbanned.`,
    color: SUCCESS_COLOR,
    fields: [
      { name: 'Case', value: `#${infraction.caseNumber}`, inline: true },
      { name: 'Moderator', value: `<@${infraction.moderatorId}>`, inline: true },
      { name: 'Reason', value: infraction.reason || 'No reason provided', inline: false },
    ],
  });

  try {
    await guild.members.unban(infraction.userId, 'Temporary ban expired');
  } catch (err) {
    if (!isKnownAlreadyProcessedError(err)) {
      throw err;
    }
  }

  await postLog(guild, config.modLogChannel, logEmbed);
  await postLog(guild, config.banLogChannel, logEmbed);
  await setInfractionActive(infraction.id, false);
}

async function processMuteLike(client, infraction, config, clearTimeoutInstead = false) {
  const guild = await fetchGuild(client, infraction.guildId);
  if (!guild) {
    await setInfractionActive(infraction.id, false);
    return;
  }

  const logEmbed = buildEmbed({
    title: clearTimeoutInstead ? 'Timeout Expired' : 'Tempmute Expired',
    description: `<@${infraction.userId}> is no longer muted.`,
    color: SUCCESS_COLOR,
    fields: [
      { name: 'Case', value: `#${infraction.caseNumber}`, inline: true },
      { name: 'Moderator', value: `<@${infraction.moderatorId}>`, inline: true },
      { name: 'Reason', value: infraction.reason || 'No reason provided', inline: false },
    ],
  });

  try {
    if (clearTimeoutInstead) {
      const member = await guild.members.fetch(infraction.userId);
      await member.timeout(null, 'Timeout expired');
    } else if (config.muteRole) {
      const muteRole =
        guild.roles.cache.get(config.muteRole) ??
        (await guild.roles.fetch(config.muteRole).catch(() => null));
      if (!muteRole) {
        await postLog(
          guild,
          config.modLogChannel,
          buildEmbed({
            title: 'Tempmute Expired',
            description: `<@${infraction.userId}> is no longer muted.`,
            color: SUCCESS_COLOR,
            fields: [
              { name: 'Case', value: `#${infraction.caseNumber}`, inline: true },
              { name: 'Moderator', value: `<@${infraction.moderatorId}>`, inline: true },
              { name: 'Reason', value: infraction.reason || 'No reason provided', inline: false },
              {
                name: 'Note',
                value: 'Mute role no longer exists; nothing was removed.',
                inline: false,
              },
            ],
          }),
        );
        await setInfractionActive(infraction.id, false, { roleDeleted: true });
        return;
      }

      const member = await guild.members.fetch(infraction.userId);
      if (member.roles.cache.has(config.muteRole)) {
        await member.roles.remove(config.muteRole, 'Temporary mute expired');
      }
    }
  } catch (err) {
    if (!isKnownMissingMemberError(err)) {
      throw err;
    }
  }

  await postLog(guild, config.modLogChannel, logEmbed);
  await setInfractionActive(infraction.id, false, config.muteRole ? {} : { roleDeleted: true });
}

async function processTimeout(client, infraction, config) {
  return processMuteLike(client, infraction, config, true);
}

export async function processExpiredInfractions(client) {
  if (!client?.isReady?.() || !client.user) return { processed: 0, failed: 0 };

  const expiredInfractions = await getExpiredInfractions();
  const summary = { processed: 0, failed: 0 };

  for (const infraction of expiredInfractions) {
    try {
      const config = await getGuildConfig(infraction.guildId);

      switch (infraction.type) {
        case 'TEMPBAN':
          await processTempban(client, infraction, config);
          break;
        case 'TEMPMUTE':
          await processMuteLike(client, infraction, config, false);
          break;
        case 'TIMEOUT':
          await processTimeout(client, infraction, config);
          break;
        default:
          await setInfractionActive(infraction.id, false);
          break;
      }

      summary.processed += 1;
    } catch (err) {
      summary.failed += 1;
      console.error(
        `Failed to process expired infraction ${infraction.id} in guild ${infraction.guildId}:`,
        err,
      );
    }
  }

  return summary;
}

export function startExpirationWorker(client, intervalMs = POLL_INTERVAL_MS) {
  const runOnce = () =>
    processExpiredInfractions(client).catch((err) => {
      console.error('Expiration worker run failed:', err);
    });

  void runOnce();
  const timer = setInterval(runOnce, intervalMs);

  return timer;
}
