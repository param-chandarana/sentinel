import { AuditLogEvent } from 'discord.js';
import { getGuildConfig } from '../config/guildConfig.js';
import { INFO_COLOR, send } from '../utils/embedBuilder.js';
import { buildBanLogEmbed } from '../utils/moderationLogs.js';

export default async (ban) => {
  if (!ban.guild) return;

  // Wait a moment for the audit log to populate
  await new Promise((resolve) => setTimeout(resolve, 1000));

  try {
    const auditLogs = await ban.guild.fetchAuditLogs({
      type: AuditLogEvent.MemberBanRemove,
      limit: 1,
    });

    const unbanEntry = auditLogs.entries.first();
    if (!unbanEntry) return;

    // We only care about the entry if it's for the user who was just unbanned
    if (unbanEntry.target.id !== ban.user.id) return;

    // If the Sentinel bot itself performed the unban, ignore it to prevent duplicates
    if (unbanEntry.executor.id === ban.client.user.id) return;

    // Fetch config to check if ban logs are enabled
    const config = await getGuildConfig(ban.guild.id);
    if (!config || !config.banLogChannel) return;

    const banlogChannel =
      ban.guild.channels.cache.get(config.banLogChannel) ??
      (await ban.guild.channels.fetch(config.banLogChannel).catch(() => null));

    if (!banlogChannel || typeof banlogChannel.send !== 'function') return;

    // Build and send the embed
    const embed = buildBanLogEmbed({
      infraction: { userId: ban.user.id },
      reason: unbanEntry.reason || 'No reason provided',
      title: 'UNBAN',
      timestamp: new Date(),
      color: INFO_COLOR,
    });

    await send(banlogChannel, embed);
  } catch (err) {
    console.error(
      `Failed to handle guildBanRemove for user ${ban.user.id} in guild ${ban.guild.id}:`,
      err,
    );
  }
};
