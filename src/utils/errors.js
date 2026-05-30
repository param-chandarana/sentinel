import { buildEmbed, ERROR_COLOR } from './embedBuilder.js';

function generateErrorId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a user-facing error embed for common errors.
 * Includes a short error ID in the footer for correlation.
 */
export function formatErrorEmbed(err, { userMessage, errorId } = {}) {
  let description = userMessage || 'Something went wrong. Please try again.';

  // Prisma common errors
  if (err?.code === 'P2002') {
    description = 'A duplicate entry prevented this action.';
  } else if (err?.code === 'P2025') {
    description = 'The item was not found in the database.';
  } else if (err?.code === 'P2003') {
    description = 'A related database record is missing.';
  } else if (err?.name === 'ValidationError' || err?.name === 'TypeError') {
    description = userMessage || err.message || description;
  }

  const embed = buildEmbed({ description, color: ERROR_COLOR });
  if (errorId) embed.setFooter({ text: `Error ID: ${errorId}` });
  return embed;
}

export async function replyError(messageLike, err, opts = {}) {
  const errorId = generateErrorId();
  // Log with correlation id
  try {
    console.error(`Error [${errorId}]:`, err);
  } catch {
    // ignore logging failures
  }

  const embed = formatErrorEmbed(err, { ...opts, errorId });
  try {
    if (typeof messageLike.reply === 'function') return messageLike.reply({ embeds: [embed] });
    if (typeof messageLike.send === 'function') return messageLike.send({ embeds: [embed] });
  } catch {
    // swallow to avoid cascading failures
  }
}

export default { formatErrorEmbed, replyError };
