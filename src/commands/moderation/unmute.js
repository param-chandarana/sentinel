import { getGuildConfig } from '../../config/guildConfig.js';
import { bindReply, ERROR_COLOR, SUCCESS_COLOR } from '../../utils/embedBuilder.js';
import { mentionUser } from '../../utils/mentions.js';
import { canPerformAction } from '../../utils/permissions.js';

export const unmute = {
  name: 'unmute',
  aliases: [],
  execute: async (message, args, prefix) => {
    const replyEmbed = bindReply(message);

    const config = await getGuildConfig(message.guild.id);
    if (!config.muteRole) {
      await replyEmbed({
        title: 'Unmute',
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
        title: 'Unmute',
        description: 'Please mention a user to unmute. e.g. `' + prefix + 'unmute @User`',
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

      if (!member.roles.cache.has(config.muteRole)) {
        await replyEmbed({
          title: 'Unmute',
          description: `${mentionUser(mentioned.id)} is not muted.`,
          color: ERROR_COLOR,
        });
        return;
      }

      await member.roles.remove(config.muteRole, args.slice(1).join(' ') || 'No reason provided');

      await replyEmbed({
        title: 'Unmute',
        description: `${mentionUser(mentioned.id)} has been unmuted.`,
        color: SUCCESS_COLOR,
      });
    } catch (err) {
      console.error(`Failed to unmute user in guild ${message.guild.id}:`, err);

      if (err.code === 10007) {
        await replyEmbed({
          title: 'Unmute',
          description: 'That user is not a member of this server.',
          color: ERROR_COLOR,
        });
      } else if (err.code === 50013) {
        await replyEmbed({
          title: 'Unmute',
          description: "I don't have permission to manage roles. Please check my role hierarchy.",
          color: ERROR_COLOR,
        });
      } else {
        await (
          await import('../../utils/errors.js')
        ).replyError(message, err, {
          userMessage: 'An error occurred while trying to unmute that user.',
        });
      }
    }
  },
};
