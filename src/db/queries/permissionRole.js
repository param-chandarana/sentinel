import prisma from '../index.js';

export const getPermissionRoles = (guildId, command) =>
  prisma.permissionRole.findMany({
    where: { guildId, command },
  });

export const addPermissionRole = (guildId, command, roleId) =>
  prisma.permissionRole.create({
    data: { guildId, command, roleId },
  });

export const removePermissionRole = (guildId, command, roleId) =>
  prisma.permissionRole.delete({
    where: { guildId_command_roleId: { guildId, command, roleId } },
  });

export const getPermissionRolesForCommands = (guildId, commands) =>
  prisma.permissionRole.findMany({
    where: {
      guildId,
      command: { in: commands },
    },
  });

export default {
  getPermissionRoles,
  getPermissionRolesForCommands,
  addPermissionRole,
  removePermissionRole,
};
