export const random = async (message, args, prefix) => {
  const isPositiveIntegerString = (value) => /^[1-9]\d*$/.test(value);
  const isNonNegativeIntegerString = (value) => /^\d+$/.test(value);

  // TODO: Enable selecting multiple random values

  // Check if any arguments are provided
  if (args.length === 0) {
    await message.reply(
      `**Random Number Generator**\n` +
        `\`${prefix}random <n>\` — Generate a random integer from 1 to n\n` +
        `\`${prefix}random <start> <end>\` — Generate a random integer between non-negative start and end values (inclusive)\n` +
        `\`${prefix}random <value1>,<value2>,...\` — Pick a random value from a comma-separated list`,
    );
    return;
  }

  // Variation 1: Single argument - random from 1 to n
  if (args.length === 1 && !args[0].includes(',')) {
    if (!isPositiveIntegerString(args[0])) {
      await message.reply(
        `Invalid input. Please provide a positive integer. e.g. \`${prefix}random 10\``,
      );
      return;
    }

    const n = Number(args[0]);

    if (n < 1) {
      await message.reply('Please provide a positive integer (1 or greater).');
      return;
    }

    const result = Math.floor(Math.random() * n) + 1;
    await message.reply(`Random number between 1 and ${n}: **${result}**`);
    return;
  }

  // Variation 2: Two arguments - random between start and end
  if (args.length === 2 && !args[0].includes(',') && !args[1].includes(',')) {
    if (!isNonNegativeIntegerString(args[0]) || !isNonNegativeIntegerString(args[1])) {
      await message.reply(
        `Invalid input. Please provide two non-negative integers. e.g. \`${prefix}random 5 15\``,
      );
      return;
    }

    const start = Number(args[0]);
    const end = Number(args[1]);

    if (start < 0 || end < 0) {
      await message.reply('Please provide non-negative integers (0 or greater).');
      return;
    }

    if (start > end) {
      await message.reply(
        `Start number (${start}) must be less than or equal to end number (${end}).`,
      );
      return;
    }

    const result = Math.floor(Math.random() * (end - start + 1)) + start;
    await message.reply(`Random number between ${start} and ${end}: **${result}**`);
    return;
  }

  // Variation 3: Comma-separated list of values
  const listArg = args.join(' ');

  if (!listArg.includes(',')) {
    await message.reply(
      `Unknown format. Use \`${prefix}random <n>\`, \`${prefix}random <start> <end>\`, or \`${prefix}random <value1>,<value2>,...\`.`,
    );
    return;
  }

  const values = listArg
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v.length > 0);

  // Validation
  if (values.length === 0) {
    await message.reply(
      `Invalid input. Please provide comma-separated values. e.g. \`${prefix}random apple,banana,orange\``,
    );
    return;
  }

  if (values.length === 1) {
    await message.reply('Please provide at least 2 values to pick from.');
    return;
  }

  const selectedIndex = Math.floor(Math.random() * values.length);
  const selected = values[selectedIndex];

  await message.reply(`Random pick from ${values.length} values: **${selected}**`);
};
