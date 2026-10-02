import { SlashCommandBuilder } from 'discord.js';
import { reply } from '../../utils/embedBuilder.js';

export const random = {
  data: new SlashCommandBuilder()
    .setName('random')
    .setDescription('Generate a random number or pick a random value.')
    .addSubcommand((sub) =>
      sub
        .setName('number')
        .setDescription('Generate a random integer from 1 to N.')
        .addIntegerOption((opt) =>
          opt.setName('max').setDescription('Upper bound (inclusive)').setRequired(true).setMinValue(1),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('range')
        .setDescription('Generate a random integer between start and end (inclusive).')
        .addIntegerOption((opt) =>
          opt.setName('start').setDescription('Start of range (inclusive)').setRequired(true).setMinValue(0),
        )
        .addIntegerOption((opt) =>
          opt.setName('end').setDescription('End of range (inclusive)').setRequired(true).setMinValue(0),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('pick')
        .setDescription('Pick a random value from a comma-separated list.')
        .addStringOption((opt) =>
          opt
            .setName('values')
            .setDescription('Comma-separated list of values to pick from (e.g. apple,banana,orange)')
            .setRequired(true),
        ),
    ),

  execute: async (interaction) => {
    await interaction.deferReply();
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'number') {
      const max = interaction.options.getInteger('max');
      const result = Math.floor(Math.random() * max) + 1;
      await reply(interaction, {
        title: 'Random Result',
        description: `Random number between 1 and ${max}: **${result}**`,
      });
      return;
    }

    if (subcommand === 'range') {
      const start = interaction.options.getInteger('start');
      const end = interaction.options.getInteger('end');

      if (start > end) {
        await reply(interaction, {
          title: 'Invalid Input',
          description: `Start (${start}) must be less than or equal to end (${end}).`,
        });
        return;
      }

      const result = Math.floor(Math.random() * (end - start + 1)) + start;
      await reply(interaction, {
        title: 'Random Result',
        description: `Random number between ${start} and ${end}: **${result}**`,
      });
      return;
    }

    if (subcommand === 'pick') {
      const valuesStr = interaction.options.getString('values');
      const values = valuesStr
        .split(',')
        .map((v) => v.trim())
        .filter((v) => v.length > 0);

      if (values.length < 2) {
        await reply(interaction, {
          title: 'Invalid Input',
          description: 'Please provide at least 2 comma-separated values to pick from.',
        });
        return;
      }

      const selected = values[Math.floor(Math.random() * values.length)];
      await reply(interaction, {
        title: 'Random Pick',
        description: `Random pick from ${values.length} values: **${selected}**`,
      });
    }
  },
};
