export const parseCommand = (message, prefix) => {
  let content = message.content.trim();

  // Handle mention prefix (<@ID> or <@!ID>)
  const mentionRegex = new RegExp(`^<@!?${message.client.user.id}>\\s+`);
  if (mentionRegex.test(content)) {
    content = content.replace(mentionRegex, '').trim();
    const [command, ...args] = content.split(/\s+/);
    return { command: command?.toLowerCase() ?? null, args };
  }

  // Handle prefix (case-insensitive)
  if (content.toLowerCase().startsWith(prefix.toLowerCase())) {
    content = content.slice(prefix.length).trim();
    if (!content) return { command: null, args: [] };
    const [command, ...args] = content.split(/\s+/);
    return { command: command?.toLowerCase() ?? null, args };
  }

  return { command: null, args: [] };
};
