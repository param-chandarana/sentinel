import { PermissionsBitField } from 'discord.js';

export const isAdmin = (member) => {
  return member.permissions.has(PermissionsBitField.Flags.Administrator);
};

export const hasManageServer = (member) => {
  return member.permissions.has(PermissionsBitField.Flags.ManageGuild);
};

export const hasManageRoles = (member) => {
  return member.permissions.has(PermissionsBitField.Flags.ManageRoles);
};

export const canManageRoles = (member) => {
  return hasManageServer(member) || hasManageRoles(member);
};
