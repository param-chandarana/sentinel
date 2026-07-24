import { channelMention, roleMention, userMention } from '@discordjs/formatters';

export const mentionUser = (id) => (id ? userMention(id) : 'Unknown');
export const mentionRole = (id) => (id ? roleMention(id) : 'Not set');
export const mentionChannel = (id) => (id ? channelMention(id) : 'Not set');

export default { mentionUser, mentionRole, mentionChannel };
