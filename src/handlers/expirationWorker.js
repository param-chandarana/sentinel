import { getGuildConfig } from '../config/guildConfig.js';
import { getExpiredInfractions, setInfractionActive } from '../db/queries/infraction.js';
import { postModerationLogs } from '../utils/moderationLogs.js';

const POLL_INTERVAL_MS = 60 * 1000;

const isKnownMissingMemberError = (err) => err?.code === 10007;
const isKnownAlreadyProcessedError = (err) => err?.code === 10026;

async function fetchGuild(client, guildId) {
  return client.guilds.cache.get(guildId) ?? client.guilds.fetch(guildId).catch(() => null);
}

async function processTempban(client, infraction) {
  const guild = await fetchGuild(client, infraction.guildId);
  if (!guild) {
    await setInfractionActive(infraction.id, false);
    return;
  }

  try {
    await guild.members.unban(infraction.userId, 'Temporary ban expired');
  } catch (err) {
    if (!isKnownAlreadyProcessedError(err)) {
      throw err;
    }
  }

  await postModerationLogs({
    guild,
    infraction,
    actionLabel: 'UNBAN',
    executorId: guild.client.user.id,
    reason: infraction.reason,
    banLog: true,
    banLogReason: 'Temporary ban expired',
    title: 'Tempban Expired',
  });
  await setInfractionActive(infraction.id, false);
}

async function processMuteLike(client, infraction, config, clearTimeoutInstead = false) {
  const guild = await fetchGuild(client, infraction.guildId);
  if (!guild) {
    await setInfractionActive(infraction.id, false);
    return;
  }

  try {
    if (clearTimeoutInstead) {
      const member = await guild.members.fetch(infraction.userId);
      await member.timeout(null, 'Timeout expired');
    } else if (config.muteRole) {
      const muteRole =
        guild.roles.cache.get(config.muteRole) ??
        (await guild.roles.fetch(config.muteRole).catch(() => null));
      if (!muteRole) {
        await postModerationLogs({
          guild,
          infraction,
          actionLabel: clearTimeoutInstead ? 'UNTIMEOUT' : 'UNMUTE',
          executorId: guild.client.user.id,
          reason: infraction.reason,
          title: clearTimeoutInstead ? 'Timeout Expired' : 'Tempmute Expired',
        });
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

  await postModerationLogs({
    guild,
    infraction,
    actionLabel: clearTimeoutInstead ? 'UNTIMEOUT' : 'UNMUTE',
    executorId: guild.client.user.id,
    reason: infraction.reason,
    title: clearTimeoutInstead ? 'Timeout Expired' : 'Tempmute Expired',
  });
  await setInfractionActive(infraction.id, false);
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
          await processTempban(client, infraction);
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
