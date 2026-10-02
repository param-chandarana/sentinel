import { commandCollection } from '../commands/index.js';
import { replyError } from '../utils/errors.js';

export default async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commandCollection.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (err) {
    console.error(`Error in slash command "/${interaction.commandName}":`, err);
    await replyError(interaction, err).catch(() => {});
  }
};
