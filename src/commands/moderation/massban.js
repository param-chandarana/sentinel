import { SlashCommandBuilder } from 'discord.js';
import { getAppealLink } from '../../db/queries/appealLink.js';
import { createInfraction } from '../../db/queries/infraction.js';
import { getPermissionRoles } from '../../db/queries/permissionRole.js';
import { sendDM } from '../../utils/dmQueue.js';
import { ERROR_COLOR, SUCCESS_COLOR, reply, buildEmbed } from '../../utils/embedBuilder.js';
import { mentionUser } from '../../utils/mentions.js';
import { postModerationLogs } from '../../utils/moderationLogs.js';
import { canPerformAction, hasBanMembers } from '../../utils/permissions.js';

export const massban = {
  data: new SlashCommandBuilder()
    .setName('massban')
    .setDescription('Bans multiple users at once.')
    .addStringOption((option) =>
      option
        .setName('users')
        .setDescription('Space-separated list of user IDs or mentions')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('The reason for the bans').setRequired(false),
    ),

  execute: async (interaction) => {
    await interaction.deferReply();

    const usersStr = interaction.options.getString('users');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const tokens = usersStr.split(/\s+/).filter(Boolean);
    const ids = new Set();

    for (const t of tokens) {
      const m = t.match(/^<@!?(\d+)>$/);
      if (m) ids.add(m[1]);
      else if (/^\d+$/.test(t)) ids.add(t);
    }

    if (ids.size === 0) {
      await reply(interaction, {
        title: 'Massban Error',
        description: 'Please provide one or more valid user mentions or IDs.',
        color: ERROR_COLOR,
      });
      return;
    }

    if (interaction.guild.ownerId !== interaction.user.id) {
      const hasPerm = hasBanMembers(interaction.member);
      const roles = await getPermissionRoles(interaction.guild.id, 'BAN');
      const hasRole =
        roles.length > 0 && roles.some((r) => interaction.member.roles.cache.has(r.roleId));
      if (!hasPerm && !hasRole) {
        await reply(interaction, {
          title: 'Permission Denied',
          description: 'You need Ban Members permission or a configured role to use this command.',
          color: ERROR_COLOR,
        });
        return;
      }
    }

    const appealLink = await getAppealLink(interaction.guild.id, 'BAN');
    const successes = [];
    const failures = [];

    for (const id of ids) {
      try {
        const user = await interaction.client.users.fetch(id).catch(() => null);
        if (!user) {
          failures.push({ id, reason: 'User not found.' });
          continue;
        }

        let member = null;
        try {
          member = await interaction.guild.members.fetch(user.id);
        } catch {
          member = null;
        }

        if (member) {
          const permissionCheck = await canPerformAction(
            interaction.member,
            member,
            'BAN',
            interaction.guild.id,
          );
          if (!permissionCheck.allowed) {
            failures.push({ id: user.id, reason: permissionCheck.reason });
            continue;
          }
        }

        const dmEmbed = buildEmbed({
          title: `You have been banned from ${interaction.guild.name}`,
          description: [
            `**Reason:** ${reason}`,
            `**Server:** ${interaction.guild.name}`,
            appealLink ? `**Appeal Link:** ${appealLink.template}` : '',
          ].join('\n'),
          color: ERROR_COLOR,
          timestamp: new Date(),
        });

        const dmResult = await sendDM(interaction.client, user.id, { embeds: [dmEmbed] });

        await interaction.guild.members.ban(user.id, { reason });

        const infraction = await createInfraction({
          guildId: interaction.guild.id,
          userId: user.id,
          moderatorId: interaction.user.id,
          type: 'BAN',
          reason,
          dmStatus: dmResult.delivered ? 'delivered' : dmResult.reason,
        });

        await postModerationLogs({
          guild: interaction.guild,
          infraction,
          actionLabel: 'BAN',
          executorId: interaction.user.id,
          reason,
          banLog: true,
          dmResult,
        });

        successes.push(user.id);
      } catch (err) {
        console.error(`Failed to ban ${id} in guild ${interaction.guild.id}:`, err);
        failures.push({ id, reason: err.message || String(err) });
      }
    }

    const parts = [];
    parts.push(`Banned ${successes.length} user(s).`);
    if (successes.length > 0) parts.push(successes.map((id) => mentionUser(id)).join(' '));
    if (failures.length > 0) {
      parts.push(`Failed ${failures.length} user(s):`);
      parts.push(failures.map((f) => `- ${f.id}: ${f.reason}`).join('\n'));
    }

    await reply(interaction, {
      title: 'Massban Results',
      description: parts.join('\n\n'),
      color: failures.length > 0 ? ERROR_COLOR : SUCCESS_COLOR,
    });
  },
};
