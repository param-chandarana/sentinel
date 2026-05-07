export const ping = async (message, args, prefix) => {
  const sent = await message.reply('Pinging...');
  const roundtrip = sent.createdTimestamp - message.createdTimestamp;
  const ws = message.client.ws.ping;
  const wsDisplay = ws === -1 ? 'N/A' : `${ws}ms`;
  await sent.edit(`🏓 Pong!\nRoundtrip: \`${roundtrip}ms\`\nWebSocket: \`${wsDisplay}\``);
};
