import { EmbedBuilder } from 'discord.js';

export const ERROR_COLOR = 0xe74c3c;
export const SUCCESS_COLOR = 0x57f287;
export const INFO_COLOR = 0x58a6ff;

export function buildEmbed({
  title,
  description,
  color = INFO_COLOR,
  fields,
  footer,
  author,
  timestamp,
  url,
  thumbnail,
  image,
} = {}) {
  const embed = new EmbedBuilder();

  if (title) embed.setTitle(title);
  if (description) embed.setDescription(description);
  if (color !== undefined) embed.setColor(color);
  if (fields?.length) embed.setFields(fields);
  if (footer) embed.setFooter(typeof footer === 'string' ? { text: footer } : footer);
  if (author) embed.setAuthor(author);
  if (timestamp) embed.setTimestamp(timestamp);
  if (url) embed.setURL(url);
  if (thumbnail) embed.setThumbnail(thumbnail);
  if (image) embed.setImage(image);

  return embed;
}

/**
 * Reply to a message (or interaction-like object) with an embed.
 * @param {Message} message
 * @param {Object} options buildEmbed options
 */
export const reply = (message, options) => {
  const embed = options instanceof EmbedBuilder ? options : buildEmbed(options);
  return message.reply({ embeds: [embed] });
};

/**
 * Send an embed to a channel-like object.
 * @param {TextChannel|DMChannel|NewsChannel} channel
 * @param {Object} options buildEmbed options
 */
export const send = (channel, options) => {
  const embed = options instanceof EmbedBuilder ? options : buildEmbed(options);
  return channel.send({ embeds: [embed] });
};

// Convenience builders for common colors
export const error = (opts = {}) => buildEmbed({ ...opts, color: ERROR_COLOR });
export const success = (opts = {}) => buildEmbed({ ...opts, color: SUCCESS_COLOR });
export const info = (opts = {}) => buildEmbed({ ...opts, color: INFO_COLOR });

// Return a bound reply helper for a specific message
export const bindReply = (message) => (opts) => reply(message, opts);
