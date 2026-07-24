import prisma from '../index.js';

export const getAppealLink = (guildId, actionType) =>
  prisma.appealLink.findUnique({ where: { guildId_actionType: { guildId, actionType } } });

export const setAppealLink = (guildId, actionType, template) =>
  prisma.appealLink.upsert({
    where: { guildId_actionType: { guildId, actionType } },
    create: { guildId, actionType, template },
    update: { template },
  });

export const removeAppealLink = (guildId, actionType) =>
  prisma.appealLink.delete({ where: { guildId_actionType: { guildId, actionType } } });

export default { getAppealLink, setAppealLink, removeAppealLink };
