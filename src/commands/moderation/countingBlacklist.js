import { getGuildConfig } from '../../config/guildConfig.js';
import { canPerformAction } from '../../utils/permissions.js';

export const countingBlacklist = {
  name: 'countingblacklist',
  aliases: ['blacklist'],
  execute: async (message, args, prefix) => {
    // Get the guild config to check if blacklist role is set
    const config = await getGuildConfig(message.guild.id);
    if (!config.countingBlacklistRole) {
      await message.reply(
        'No blacklist role has been configured. Use `' +
          prefix +
          'config countingblacklistrole set @Role` to set one.',
      );
      return;
    }

    // Check if a user was mentioned
    const mentioned = message.mentions.users.first();
    if (!mentioned) {
      await message.reply(
        'Please mention a user to blacklist. e.g. `' + prefix + 'blacklist @User`',
      );
      return;
    }

    try {
      // Fetch the member from the guild
      const member = await message.guild.members.fetch(mentioned.id);

      // Check if the member already has the blacklist role
      if (member.roles.cache.has(config.countingBlacklistRole)) {
        await message.reply(`<@${mentioned.id}> is already blacklisted.`);
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
        await message.reply(permissionCheck.reason);
        return;
      }

      // Add the blacklist role
      await member.roles.add(config.countingBlacklistRole);
      // console.log(
      //   `[${message.guild.name}] Manually blacklisted ${member.user.tag} by ${message.author.tag}`,
      // );
      await message.reply(`<@${mentioned.id}> has been blacklisted.`);
    } catch (err) {
      console.error(`Failed to blacklist user in guild ${message.guild.id}:`, err);

      // Provide specific error messages
      if (err.code === 10007) {
        await message.reply('That user is not a member of this server.');
      } else if (err.code === 50013) {
        await message.reply(
          "I don't have permission to manage roles. Please check my role hierarchy.",
        );
      } else {
        await message.reply(
          'An error occurred while trying to blacklist that user. Please check my permissions and try again.',
        );
      }
    }
  },
};
