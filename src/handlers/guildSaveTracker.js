import { getGuildConfig } from '../config/guildConfig.js';
import { getAppealLink } from '../db/queries/appealLink.js';
import { createInfraction } from '../db/queries/infraction.js';
import { sendDM } from '../utils/dmQueue.js';
import { buildEmbed, ERROR_COLOR, send, SUCCESS_COLOR } from '../utils/embedBuilder.js';
import { replyError } from '../utils/errors.js';
import { mentionUser } from '../utils/mentions.js';
import { postModerationLogs } from '../utils/moderationLogs.js';
import { toBigIntMs } from '../utils/time.js';

const guildSaveLog = new Map();
const MAX_AGE_MS = 60n * 60n * 1000n; // 1 hour

// Clean up old entries every 30 minutes to prevent memory leak
setInterval(
  () => {
    const now = BigInt(Date.now());

    for (const [key, timestamps] of guildSaveLog.entries()) {
      const validTimestamps = timestamps
        .map((t) => toBigIntMs(t))
        .filter((t) => t !== null && now - t < MAX_AGE_MS);
      if (validTimestamps.length === 0) {
        guildSaveLog.delete(key);
      } else {
        guildSaveLog.set(key, validTimestamps);
      }
    }
  },
  30 * 60 * 1000,
);

export const handleGuildSave = async (message) => {
  const config = await getGuildConfig(message.guild.id);

  if (!config.countingBlacklistRole) return;
  if (!config.countingChannel) return;
  if (message.channel.id !== config.countingChannel) return;
  const countingWindowMs = toBigIntMs(config.countingWindowMs);
  if (!countingWindowMs) return;

  const mentioned = message.mentions.users.first();
  if (!mentioned) return;

  const now = BigInt(Date.now());
  const userId = mentioned.id;
  const guildKey = `${message.guild.id}:${userId}`;

  const timestamps = (guildSaveLog.get(guildKey) || [])
    .map((t) => toBigIntMs(t))
    .filter((t) => t !== null && now - t < countingWindowMs);
  timestamps.push(now);
  guildSaveLog.set(guildKey, timestamps);

  if (timestamps.length >= 2) {
    try {
      const member = await message.guild.members.fetch(userId);
      if (member.roles.cache.has(config.countingBlacklistRole)) return;

      const reason = 'Using too many guild saves';
      const appealLink = await getAppealLink(message.guild.id, 'COUNTINGBLACKLIST');

      // 1. Build DM embed before blacklisting
      const dmEmbed = buildEmbed({
        title: `You have been blacklisted from counting in ${message.guild.name}`,
        description: [
          `**Reason:** ${reason}`,
          `**Server:** ${message.guild.name}`,
          appealLink ? `**Appeal Link:** ${appealLink.template}` : '',
        ].join('\n'),
        color: ERROR_COLOR,
        timestamp: new Date(),
      });

      // 2. Send DM - must happen before blacklisting
      const dmResult = await sendDM(message.client, userId, { embeds: [dmEmbed] });

      // 3. Execute the blacklist role addition
      await member.roles.add(config.countingBlacklistRole);

      // 4. Create infraction
      const infraction = await createInfraction({
        guildId: message.guild.id,
        userId,
        moderatorId: message.client.user.id,
        type: 'COUNTING_BLACKLIST',
        reason,
        dmStatus: dmResult.delivered ? 'delivered' : dmResult.reason,
      });

      // 5. Post mod logs
      await postModerationLogs({
        guild: message.guild,
        infraction,
        actionLabel: 'COUNTING_BLACKLIST',
        executorId: message.client.user.id,
        reason,
        dmResult,
      });

      await send(message.channel, {
        title: 'Counting Blacklist',
        description: `${mentionUser(userId)} has been blacklisted for using too many guild saves. (Case #${infraction.caseNumber})`,
        color: SUCCESS_COLOR,
      });
    } catch (err) {
      console.error(`Failed to assign blacklist role in guild ${message.guild.id}:`, err);
      // Notify channel with a friendly error message where possible
      await replyError(message, err).catch(() => {});
    }
  }
};
