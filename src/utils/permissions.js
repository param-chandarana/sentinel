import { PermissionsBitField } from 'discord.js';

export const isAdmin = (member) => {
  return member.permissions.has(PermissionsBitField.Flags.Administrator);
};

export const hasManageRoles = (member) => {
  return member.permissions.has(PermissionsBitField.Flags.ManageRoles);
};

export const canManageRoles = (member) => {
  return isAdmin(member) || hasManageRoles(member);
};
