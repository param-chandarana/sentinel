import prisma from '../index.js';

export const createInfraction = async (data) => {
  // Ensure a per-guild incremental case number
  const max = await prisma.infraction.findFirst({
    where: { guildId: data.guildId },
    orderBy: { caseNumber: 'desc' },
    select: { caseNumber: true },
  });

  const nextCase = (max?.caseNumber ?? 0) + 1;

  const created = await prisma.infraction.create({
    data: {
      caseNumber: nextCase,
      guildId: data.guildId,
      userId: data.userId,
      moderatorId: data.moderatorId,
      type: data.type,
      reason: data.reason ?? null,
      durationSeconds: data.durationSeconds ?? null,
      expiresAt: data.expiresAt ?? null,
      modlogMessageId: data.modlogMessageId ?? null,
    },
  });

  return created;
};

export const getInfractionById = (id) => prisma.infraction.findUnique({ where: { id } });

export const listInfractionsForUser = (
  guildId,
  userId,
  includeDeleted = false,
  take = 50,
  skip = 0,
) =>
  prisma.infraction.findMany({
    where: {
      guildId,
      userId,
      deletedAt: includeDeleted ? undefined : null,
    },
    orderBy: { createdAt: 'desc' },
    take,
    skip,
  });

export const countInfractionsForUser = (guildId, userId, includeDeleted = false) =>
  prisma.infraction.count({
    where: {
      guildId,
      userId,
      deletedAt: includeDeleted ? undefined : null,
    },
  });

export const listInfractionsForGuild = (guildId, includeDeleted = false, take = 50, skip = 0) =>
  prisma.infraction.findMany({
    where: { guildId, deletedAt: includeDeleted ? undefined : null },
    orderBy: { createdAt: 'desc' },
    take,
    skip,
  });

export const countInfractionsForGuild = (guildId, includeDeleted = false) =>
  prisma.infraction.count({
    where: { guildId, deletedAt: includeDeleted ? undefined : null },
  });

export const updateInfractionReason = (id, reason) =>
  prisma.infraction.update({ where: { id }, data: { reason } });

export const setInfractionModlogMessageId = (id, messageId) =>
  prisma.infraction.update({ where: { id }, data: { modlogMessageId: messageId } });

export const softDeleteInfraction = (id) =>
  prisma.infraction.update({ where: { id }, data: { deletedAt: new Date() } });

export const setInfractionActive = (id, active, extraData = {}) =>
  prisma.infraction.update({
    where: { id },
    data: {
      active,
      ...extraData,
    },
  });

export const getExpiredInfractions = () =>
  prisma.infraction.findMany({
    where: {
      expiresAt: { not: null, lte: new Date() },
      deletedAt: null,
      active: true,
    },
  });

export const getActiveMutesForUser = (guildId, userId) =>
  prisma.infraction.findMany({
    where: {
      guildId,
      userId,
      deletedAt: null,
      active: true,
      type: { in: ['MUTE', 'TEMPMUTE'] },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: 'desc' },
  });

export const getActiveBansForUser = (guildId, userId) =>
  prisma.infraction.findMany({
    where: {
      guildId,
      userId,
      deletedAt: null,
      active: true,
      type: { in: ['BAN', 'TEMPBAN'] },
    },
    orderBy: { createdAt: 'desc' },
  });

export const getActiveBlacklistsForUser = (guildId, userId) =>
  prisma.infraction.findMany({
    where: {
      guildId,
      userId,
      deletedAt: null,
      active: true,
      type: { in: ['COUNTING_BLACKLIST'] },
    },
    orderBy: { createdAt: 'desc' },
  });

export default {
  createInfraction,
  getInfractionById,
  listInfractionsForUser,
  countInfractionsForUser,
  listInfractionsForGuild,
  countInfractionsForGuild,
  updateInfractionReason,
  setInfractionModlogMessageId,
  softDeleteInfraction,
  setInfractionActive,
  getExpiredInfractions,
  getActiveMutesForUser,
  getActiveBansForUser,
  getActiveBlacklistsForUser,
};
