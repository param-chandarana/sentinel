import { getGuildConfig } from '../../config/guildConfig.js';
import { createInfraction } from '../../db/queries/infraction.js';
import { parseDurationSeconds } from '../../utils/duration.js';
import { bindReply, ERROR_COLOR, SUCCESS_COLOR } from '../../utils/embedBuilder.js';
import { mentionUser } from '../../utils/mentions.js';
import { canPerformAction } from '../../utils/permissions.js';

export const tempmute = {
  name: 'tempmute',
  aliases: [],
  execute: async (message, args, prefix) => {
    const replyEmbed = bindReply(message);

    const config = await getGuildConfig(message.guild.id);
    if (!config.muteRole) {
      await replyEmbed({
        title: 'Tempmute',
        description:
          'No mute role has been configured. Use `' +
          prefix +
          'config muterole set @Role` to set one.',
      });
      return;
    }

    const mentioned = message.mentions.users.first();
    if (!mentioned) {
      await replyEmbed({
        title: 'Tempmute',
        description:
          'Please mention a user to tempmute. e.g. `' + prefix + 'tempmute @User 1h [reason]`',
      });
      return;
    }

    const durationArg = args[1];
    const durationSeconds = parseDurationSeconds(durationArg);
    if (!durationSeconds) {
      await replyEmbed({
        title: 'Tempmute',
        description: 'Please specify a duration (e.g. `30m`, `1h`, `7d`).',
        color: ERROR_COLOR,
      });
      return;
    }

    try {
      const member = await message.guild.members.fetch(mentioned.id);

      const permissionCheck = await canPerformAction(
        message.member,
        member,
        'MUTE',
        message.guild.id,
      );

      if (!permissionCheck.allowed) {
        await replyEmbed({
          title: 'Permission Denied',
          description: permissionCheck.reason,
          color: ERROR_COLOR,
        });
        return;
      }

      if (member.roles.cache.has(config.muteRole)) {
        await replyEmbed({
          title: 'Tempmute',
          description: `${mentionUser(mentioned.id)} is already muted.`,
          color: ERROR_COLOR,
        });
        return;
      }

      const reason = args.slice(2).join(' ') || 'No reason provided';
      const expiresAt = new Date(Date.now() + durationSeconds * 1000);

      await member.roles.add(config.muteRole, reason);

      const infraction = await createInfraction({
        guildId: message.guild.id,
        userId: mentioned.id,
        moderatorId: message.author.id,
        type: 'TEMPMUTE',
        reason,
        durationSeconds,
        expiresAt,
      });

      await replyEmbed({
        title: 'Tempmute',
        description: `${mentionUser(mentioned.id)} has been tempmuted until ${expiresAt.toUTCString()}. (Case #${infraction.caseNumber})`,
        color: SUCCESS_COLOR,
      });
    } catch (err) {
      console.error(`Failed to tempmute user in guild ${message.guild.id}:`, err);

      if (err.code === 10007) {
        await replyEmbed({
          title: 'Tempmute',
          description: 'That user is not a member of this server.',
          color: ERROR_COLOR,
        });
      } else if (err.code === 50013) {
        await replyEmbed({
          title: 'Tempmute',
          description: "I don't have permission to manage roles. Please check my role hierarchy.",
          color: ERROR_COLOR,
        });
      } else {
        await (
          await import('../../utils/errors.js')
        ).replyError(message, err, {
          userMessage: 'An error occurred while trying to tempmute that user.',
        });
      }
    }
  },
};
