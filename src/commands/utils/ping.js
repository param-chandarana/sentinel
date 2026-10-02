import { SlashCommandBuilder } from 'discord.js';
import { buildEmbed, reply } from '../../utils/embedBuilder.js';

export const ping = {
  data: new SlashCommandBuilder().setName('ping').setDescription('Check the bot latency.'),

  execute: async (interaction) => {
    await interaction.deferReply();
    const roundtrip = Date.now() - interaction.createdTimestamp;
    const ws = interaction.client.ws.ping;
    const wsDisplay = ws === -1 ? 'N/A' : `${ws}ms`;
    await interaction.editReply({
      embeds: [
        buildEmbed({
          title: 'Pong!',
          description: `Roundtrip: \`${roundtrip}ms\`\nWebSocket: \`${wsDisplay}\``,
        }),
      ],
    });
  },
};
