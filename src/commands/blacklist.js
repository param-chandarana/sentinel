import { getGuildConfig } from '../config/guildConfig.js';
import { canManageRoles } from '../utils/permissions.js';

export const handleBlacklist = async (message, args, prefix) => {
  // Check if user has Manage Roles or Administrator permission
  if (!canManageRoles(message.member)) {
    await message.reply('You need the Manage Roles or Administrator permission to use this command.');
    return;
  }

  // Get the guild config to check if blacklist role is set
  const config = getGuildConfig(message.guild.id);
  if (!config.blacklistRoleId) {
    await message.reply('No blacklist role has been configured. Use `' + prefix + 'config role @Role` to set one.');
    return;
  }

  // Check if a user was mentioned
  const mentioned = message.mentions.users.first();
  if (!mentioned) {
    await message.reply('Please mention a user to blacklist. e.g. `' + prefix + 'blacklist @User`');
    return;
  }

  // Prevent blacklisting bots
  if (mentioned.bot) {
    await message.reply('You cannot blacklist bots.');
    return;
  }

  try {
    // Fetch the member from the guild
    const member = await message.guild.members.fetch(mentioned.id);
    
    // Check if the member already has the blacklist role
    if (member.roles.cache.has(config.blacklistRoleId)) {
      await message.reply(`<@${mentioned.id}> is already blacklisted.`);
      return;
    }

    // Prevent blacklisting users with higher or equal roles
    if (member.roles.highest.position >= message.member.roles.highest.position) {
      await message.reply('You cannot blacklist someone with a role equal to or higher than yours.');
      return;
    }

    // Add the blacklist role
    await member.roles.add(config.blacklistRoleId);
    console.log(`[${message.guild.name}] Manually blacklisted ${member.user.tag} by ${message.author.tag}`);
    await message.reply(`<@${mentioned.id}> has been blacklisted.`);
    
  } catch (err) {
    console.error(`Failed to blacklist user in guild ${message.guild.id}:`, err);
    
    // Provide specific error messages
    if (err.code === 10007) {
      await message.reply('That user is not a member of this server.');
    } else if (err.code === 50013) {
      await message.reply('I don\'t have permission to manage roles. Please check my role hierarchy.');
    } else {
      await message.reply('An error occurred while trying to blacklist that user. Please check my permissions and try again.');
    }
  }
};
