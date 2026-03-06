import { getGuildConfig, setGuildConfig } from '../config/guildConfig.js';
import { isAdmin } from '../utils/permissions.js';

export const handleConfig = async (message, args, prefix) => {
  if (!isAdmin(message.member)) {
    await message.reply('You need Administrator permission to use this command.');
    return;
  }

  const subcommand = args[0]?.toLowerCase();

  if (!subcommand || subcommand === 'help') {
    await message.reply(
      '**Sentinel Config**\n' +
      `\`${prefix}config timelimit <minutes>\` — Set the time window for guild save tracking\n` +
      `\`${prefix}config role <@role>\` — Set the blacklist role\n` +
      `\`${prefix}config channel <#channel>\` — Set the counting channel\n` +
      `\`${prefix}config prefix <prefix>\` — Change the bot prefix\n` +
      `\`${prefix}config show\` — Show current config`
    );
    return;
  }

  if (subcommand === 'show') {
    const config = getGuildConfig(message.guild.id);
    await message.reply(
      `**Current Config**\n` +
      `Prefix: \`${config.prefix}\`\n` +
      `Time limit: ${config.windowMs / 60000} minutes\n` +
      `Blacklist role: ${config.blacklistRoleId ? `<@&${config.blacklistRoleId}>` : 'Not set'}\n` +
      `Counting channel: ${config.countingChannelId ? `<#${config.countingChannelId}>` : 'Not set'}`
    );
    return;
  }

  if (subcommand === 'timelimit') {
    const minutes = parseFloat(args[1]);
    if (isNaN(minutes) || minutes <= 0) {
      await message.reply(`Please provide a valid number of minutes. e.g. \`${prefix}config timelimit 10\``);
      return;
    }
    setGuildConfig(message.guild.id, { windowMs: minutes * 60 * 1000 });
    await message.reply(`Time limit set to **${minutes} minutes**.`);
    return;
  }

  if (subcommand === 'role') {
    const role = message.mentions.roles.first();
    if (!role) {
      await message.reply(`Please mention a valid role. e.g. \`${prefix}config role @Blacklisted\``);
      return;
    }
    setGuildConfig(message.guild.id, { blacklistRoleId: role.id });
    await message.reply(`Blacklist role set to **${role.name}**.`);
    return;
  }

  if (subcommand === 'channel') {
    const channel = message.mentions.channels.first();
    if (!channel) {
      await message.reply(`Please mention a valid channel. e.g. \`${prefix}config channel #counting\``);
      return;
    }
    setGuildConfig(message.guild.id, { countingChannelId: channel.id });
    await message.reply(`Counting channel set to **${channel.name}**.`);
    return;
  }

  if (subcommand === 'prefix') {
    const newPrefix = args[1];
    if (!newPrefix) {
      await message.reply(`Please provide a new prefix. e.g. \`${prefix}config prefix w!\``);
      return;
    }
    if (newPrefix.length > 5) {
      await message.reply('Prefix must be 5 characters or fewer.');
      return;
    }
    setGuildConfig(message.guild.id, { prefix: newPrefix });
    await message.reply(`Prefix updated to \`${newPrefix}\`. Use \`${newPrefix}config\` from now on.`);
    return;
  }

  await message.reply(`Unknown subcommand \`${subcommand}\`. Use \`${prefix}config help\` to see available commands.`);
};
