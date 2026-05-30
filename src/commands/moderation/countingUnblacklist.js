import { getGuildConfig } from '../../config/guildConfig.js';
import { bindReply, ERROR_COLOR, SUCCESS_COLOR } from '../../utils/embedBuilder.js';
import { mentionUser } from '../../utils/mentions.js';
import { canPerformAction } from '../../utils/permissions.js';

export const countingUnblacklist = {
  name: 'countingunblacklist',
  aliases: ['unblacklist'],
  execute: async (message, args, prefix) => {
    const replyEmbed = bindReply(message);

    // Get the guild config to check if blacklist role is set
    const config = await getGuildConfig(message.guild.id);
    if (!config.countingBlacklistRole) {
      await replyEmbed({
        title: 'Counting Unblacklist',
        description:
          'No blacklist role has been configured. Use `' +
          prefix +
          'config countingblacklistrole set @Role` to set one.',
      });
      return;
    }

    // Check if a user was mentioned
    const mentioned = message.mentions.users.first();
    if (!mentioned) {
      await replyEmbed({
        title: 'Counting Unblacklist',
        description: 'Please mention a user to unblacklist. e.g. `' + prefix + 'unblacklist @User`',
      });
      return;
    }

    try {
      // Fetch the member from the guild
      const member = await message.guild.members.fetch(mentioned.id);

      // Check if the member has the blacklist role
      if (!member.roles.cache.has(config.countingBlacklistRole)) {
        await replyEmbed({
          title: 'Counting Unblacklist',
          description: `${mentionUser(mentioned.id)} is not blacklisted.`,
        });
        return;
      }

      // Check if user can perform the action
      const permissionCheck = await canPerformAction(
        message.member,
        member,
        'COUNTINGBLACKLIST',
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

      // Remove the blacklist role
      await member.roles.remove(config.countingBlacklistRole);
      // console.log(
      //   `[${message.guild.name}] Unblacklisted ${member.user.tag} by ${message.author.tag}`,
      // );
      await replyEmbed({
        title: 'Counting Unblacklist',
        description: `${mentionUser(mentioned.id)} has been unblacklisted.`,
        color: SUCCESS_COLOR,
      });
    } catch (err) {
      console.error(`Failed to unblacklist user in guild ${message.guild.id}:`, err);

      // Provide specific error messages
      if (err.code === 10007) {
        await replyEmbed({
          title: 'Counting Unblacklist',
          description: 'That user is not a member of this server.',
          color: ERROR_COLOR,
        });
      } else if (err.code === 50013) {
        await replyEmbed({
          title: 'Counting Unblacklist',
          description: "I don't have permission to manage roles. Please check my role hierarchy.",
          color: ERROR_COLOR,
        });
      } else {
        await (
          await import('../../utils/errors.js')
        ).replyError(message, err, {
          userMessage:
            'An error occurred while trying to unblacklist that user. Please check my permissions and try again.',
        });
      }
    }
  },
};
