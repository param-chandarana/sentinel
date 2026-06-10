import { getAppealLink } from '../../db/queries/appealLink.js';
import { createInfraction } from '../../db/queries/infraction.js';
import { getPermissionRoles } from '../../db/queries/permissionRole.js';
import { sendDM } from '../../utils/dmQueue.js';
import { bindReply, buildEmbed, ERROR_COLOR, SUCCESS_COLOR } from '../../utils/embedBuilder.js';
import { mentionUser } from '../../utils/mentions.js';
import { postModerationLogs } from '../../utils/moderationLogs.js';
import { canPerformAction, hasBanMembers } from '../../utils/permissions.js';

export const massban = {
  name: 'massban',
  aliases: [],
  execute: async (message, args, prefix) => {
    const replyEmbed = bindReply(message);

    const tokens = args.filter(Boolean);
    const ids = new Set();

    for (const t of tokens) {
      const m = t.match(/^<@!?(\d+)>$/);
      if (m) ids.add(m[1]);
      else if (/^\d+$/.test(t)) ids.add(t);
    }

    // Also include any mentions parsed by the client
    for (const u of message.mentions.users.values()) ids.add(u.id);

    if (ids.size === 0) {
      await replyEmbed({
        title: 'Massban',
        description:
          'Please provide one or more user mentions or IDs to ban. e.g. `' +
          prefix +
          'massban @User1 @User2 [reason]`',
        color: ERROR_COLOR,
      });
      return;
    }

    // Check executor permissions once (owner or ban permission / configured role)
    if (message.member.guild.ownerId !== message.author.id) {
      const hasPerm = hasBanMembers(message.member);
      const roles = await getPermissionRoles(message.guild.id, 'BAN');
      const hasRole =
        roles.length > 0 && roles.some((r) => message.member.roles.cache.has(r.roleId));
      if (!hasPerm && !hasRole) {
        await replyEmbed({
          title: 'Permission Denied',
          description: 'You need Ban Members permission or a configured role to use this command.',
          color: ERROR_COLOR,
        });
        return;
      }
    }

    const reasonTokens = tokens.filter((t) => !/^<@!?(\d+)>$/.test(t) && !/^\d+$/.test(t));
    const reason = reasonTokens.join(' ') || 'No reason provided';
    const appealLink = await getAppealLink(message.guild.id, 'BAN');

    const successes = [];
    const failures = [];

    for (const id of ids) {
      try {
        const user = await message.client.users.fetch(id).catch(() => null);
        if (!user) {
          failures.push({ id, reason: 'User not found.' });
          continue;
        }

        let member = null;
        try {
          member = await message.guild.members.fetch(user.id);
        } catch {
          member = null;
        }

        if (member) {
          const permissionCheck = await canPerformAction(
            message.member,
            member,
            'BAN',
            message.guild.id,
          );
          if (!permissionCheck.allowed) {
            failures.push({ id: user.id, reason: permissionCheck.reason });
            continue;
          }
        }

        // 1. Build the DM embed before banning (user becomes unreachable after)
        const dmEmbed = buildEmbed({
          title: `You have been banned from ${message.guild.name}`,
          description: [
            `**Reason:** ${reason}`,
            `**Server:** ${message.guild.name}`,
            appealLink ? `**Appeal Link:** ${appealLink.template}` : '',
          ].join('\n'),
          color: ERROR_COLOR,
          timestamp: new Date(),
        });

        // 2. Send DM - must happen before the ban, user can't receive DMs after
        const dmResult = await sendDM(message.client, user.id, { embeds: [dmEmbed] });

        // 3. Execute the ban
        await message.guild.members.ban(user.id, { reason });

        // 4. Write infraction - dmStatus is already known from step 2
        const infraction = await createInfraction({
          guildId: message.guild.id,
          userId: user.id,
          moderatorId: message.author.id,
          type: 'BAN',
          reason,
          dmStatus: dmResult.delivered ? 'delivered' : dmResult.reason,
        });

        // 5. Post mod/ban logs
        await postModerationLogs({
          guild: message.guild,
          infraction,
          actionLabel: 'BAN',
          executorId: message.author.id,
          reason,
          banLog: true,
          dmResult,
        });

        successes.push(user.id);
      } catch (err) {
        console.error(`Failed to ban ${id} in guild ${message.guild.id}:`, err);
        failures.push({ id, reason: err.message || String(err) });
      }
    }

    const parts = [];
    parts.push(`Banned ${successes.length} user(s).`);
    if (successes.length > 0) parts.push(successes.map((id) => mentionUser(id)).join(' '));
    if (failures.length > 0) {
      parts.push(`Failed ${failures.length} user(s):`);
      parts.push(
        failures
          .map(
            (f) => `
- ${f.id}: ${f.reason}`,
          )
          .join('\n'),
      );
    }

    await replyEmbed({
      title: 'Massban Results',
      description: parts.join('\n\n'),
      color: failures.length > 0 ? ERROR_COLOR : SUCCESS_COLOR,
    });
  },
};
