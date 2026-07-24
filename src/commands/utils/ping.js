import { buildEmbed, reply } from '../../utils/embedBuilder.js';

export const ping = async (message) => {
  const sent = await reply(message, { description: 'Pinging...' });
  const roundtrip = sent.createdTimestamp - message.createdTimestamp;
  const ws = message.client.ws.ping;
  const wsDisplay = ws === -1 ? 'N/A' : `${ws}ms`;
  await sent.edit({
    embeds: [
      buildEmbed({
        title: 'Pong!',
        description: `Roundtrip: \`${roundtrip}ms\`\nWebSocket: \`${wsDisplay}\``,
      }),
    ],
  });
};
