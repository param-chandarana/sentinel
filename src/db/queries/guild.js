import prisma from '../index.js';

export const findGuild = (guildId) => prisma.guild.findUnique({ where: { id: guildId } });

export const upsertGuild = (guildId, payload) =>
  prisma.guild.upsert({
    where: { id: guildId },
    update: payload,
    create: { id: guildId, ...payload },
  });

export default { findGuild, upsertGuild };
