import { PermissionsBitField } from 'discord.js';
import { getPermissionRoles } from '../db/queries/permissionRole.js';

export const isAdmin = (member) => member.permissions.has(PermissionsBitField.Flags.Administrator);
export const hasManageServer = (member) =>
  member.permissions.has(PermissionsBitField.Flags.ManageGuild);
export const hasManageRoles = (member) =>
  member.permissions.has(PermissionsBitField.Flags.ManageRoles);
export const hasBanMembers = (member) =>
  member.permissions.has(PermissionsBitField.Flags.BanMembers);
export const hasKickMembers = (member) =>
  member.permissions.has(PermissionsBitField.Flags.KickMembers);
export const hasTimeoutMembers = (member) =>
  member.permissions.has(PermissionsBitField.Flags.ModerateMembers);

export const PERMISSION_LABELS = {
  hasManageRoles: 'Manage Roles',
  hasManageServer: 'Manage Server',
  hasBanMembers: 'Ban Members',
  hasKickMembers: 'Kick Members',
  hasTimeoutMembers: 'Timeout Members',
};

/** Default permissions required for each action type. */
export const DEFAULT_PERMISSIONS = {
  COUNTINGBLACKLIST: 'hasManageRoles',
  BAN: 'hasBanMembers',
  KICK: 'hasKickMembers',
  MUTE: ['hasManageRoles', 'hasTimeoutMembers'],
  WARN: 'hasManageRoles',
  MANAGEINFRACTIONS: 'hasManageServer',
  TIMEOUT: 'hasTimeoutMembers',
};

const PERMISSION_CHECKS = {
  hasManageRoles: (member) => hasManageRoles(member),
  hasManageServer: (member) => hasManageServer(member),
  hasBanMembers: (member) => hasBanMembers(member),
  hasKickMembers: (member) => hasKickMembers(member),
  hasTimeoutMembers: (member) => hasTimeoutMembers(member),
};

export const canModerateUser = (executor, target) => {
  if (target.guild.ownerId === target.id) return false;
  if (executor.guild.ownerId === executor.id) return true;
  return executor.roles.highest.position > target.roles.highest.position;
};

/**
 * Structured permission result codes
 * - allowed: boolean
 * - code: optional machine-friendly code
 * - reason: human-friendly message
 */
export const canPerformAction = async (executor, target, actionType, guildId) => {
  const normalizedActionType = String(actionType).toUpperCase();

  if (executor.id === target.id) {
    return {
      allowed: false,
      code: 'SELF',
      reason: 'You cannot use your powers to bonk yourself.',
    };
  }

  if (target.client?.user?.id && target.id === target.client.user.id) {
    return {
      allowed: false,
      code: 'BOT',
      reason: "Nice try, but you can't moderate me. 🙂",
    };
  }

  // Guild owner override (cannot act on server owner)
  if (executor.guild.ownerId === executor.id) {
    if (target.guild.ownerId === target.id) {
      return {
        allowed: false,
        code: 'TARGET_IS_OWNER',
        reason: 'You cannot perform this action on the server owner.',
      };
    }

    return { allowed: true };
  }

  if (target.guild.ownerId === target.id) {
    return {
      allowed: false,
      code: 'TARGET_IS_OWNER',
      reason: 'You cannot perform this action on the server owner.',
    };
  }

  const permissionRoles = await getPermissionRoles(guildId, normalizedActionType);
  const defaultPermissionCheck = DEFAULT_PERMISSIONS[normalizedActionType];
  if (!defaultPermissionCheck) {
    return {
      allowed: false,
      code: 'NO_CHECK_CONFIG',
      reason: 'Permission check not configured for this action.',
    };
  }

  const requiredChecks = Array.isArray(defaultPermissionCheck)
    ? defaultPermissionCheck
    : [defaultPermissionCheck];

  const hasDefaultPermission = requiredChecks.some(
    (check) => PERMISSION_CHECKS[check] && PERMISSION_CHECKS[check](executor),
  );

  const hasPermissionRole =
    permissionRoles.length > 0 && permissionRoles.some((pr) => executor.roles.cache.has(pr.roleId));

  if (!hasPermissionRole && !hasDefaultPermission) {
    const permNames = requiredChecks.map((check) => PERMISSION_LABELS[check] ?? check);
    const permList = permNames.length > 1 ? permNames.join(' or ') : permNames[0];
    const needText =
      permissionRoles.length > 0
        ? `a configured role or ${permList} permission`
        : `${permList} permission`;
    return {
      allowed: false,
      code: 'MISSING_PERMISSION',
      reason: `You need ${needText} to use this command.`,
    };
  }

  if (!canModerateUser(executor, target)) {
    return {
      allowed: false,
      code: 'ROLE_HIERARCHY',
      reason:
        'You cannot perform this action on someone with a role equal to or higher than yours.',
    };
  }

  return { allowed: true };
};

export default {
  canPerformAction,
  canModerateUser,
  PERMISSION_LABELS,
  DEFAULT_PERMISSIONS,
};
