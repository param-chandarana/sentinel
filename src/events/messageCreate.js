const COUNTING_BOT_ID = process.env.COUNTING_BOT_ID;

export default async (message) => {
  // Ignore DMs
  if (!message.guild) return;

  // Ignore all bots except the counting bot
  if (message.author.bot && message.author.id !== COUNTING_BOT_ID) return;

  // Counting bot: only handle guild save messages, nothing else
  if (message.author.id === COUNTING_BOT_ID) {
    if (message.content.toLowerCase().includes('guild save!')) {
      const { handleGuildSave } = await import('../handlers/guildSaveTracker.js');
      await handleGuildSave(message);
    }
    return;
  }
};
