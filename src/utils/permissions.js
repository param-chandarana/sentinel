import { PermissionsBitField } from 'discord.js';
import { getPermissionRoles } from '../db/queries/permissionRole.js';

export const isAdmin = (member) => {
  return member.permissions.has(PermissionsBitField.Flags.Administrator);
};

export const hasManageServer = (member) => {
  return member.permissions.has(PermissionsBitField.Flags.ManageGuild);
};

export const hasManageRoles = (member) => {
  return member.permissions.has(PermissionsBitField.Flags.ManageRoles);
};

export const hasBanMembers = (member) => {
  return member.permissions.has(PermissionsBitField.Flags.BanMembers);
};

export const hasKickMembers = (member) => {
  return member.permissions.has(PermissionsBitField.Flags.KickMembers);
};

export const hasTimeoutMembers = (member) => {
  return member.permissions.has(PermissionsBitField.Flags.ModerateMembers);
};

const PERMISSION_LABELS = {
  hasManageRoles: 'Manage Roles',
  hasManageServer: 'Manage Server',
  hasBanMembers: 'Ban Members',
  hasKickMembers: 'Kick Members',
  hasTimeoutMembers: 'Timeout Members',
};

/**
 * Default permissions required for each action type.
 * Used as fallback when no specific permission roles are configured.
 * Can be a string for a single check or an array for multiple checks (OR'd together).
 */
export const DEFAULT_PERMISSIONS = {
  COUNTINGBLACKLIST: 'hasManageRoles',
  BAN: 'hasBanMembers',
  KICK: 'hasKickMembers',
  MUTE: ['hasManageRoles', 'hasTimeoutMembers'],
  WARN: 'hasManageRoles',
  MANAGEINFRACTIONS: 'hasManageServer',
  TIMEOUT: 'hasTimeoutMembers',
};

/**
 * Check if a user can perform a role-based action on another user
 * (e.g., blacklist/unblacklist based on role hierarchy)
 * @param {GuildMember} executor - The user performing the action
 * @param {GuildMember} target - The user being acted upon
 * @returns {boolean} - True if the action is allowed
 */
export const canModerateUser = (executor, target) => {
  // Cannot moderate the guild owner
  if (target.guild.ownerId === target.id) {
    return false;
  }

  // Guild owner can always moderate others
  if (executor.guild.ownerId === executor.id) {
    return true;
  }

  // Otherwise, user must have higher role than target
  return executor.roles.highest.position > target.roles.highest.position;
};

/**
 * Comprehensive check to determine if a user can perform an action on another user.
 * Checks: owner override, owner protection, permission roles, default permissions, role hierarchy.
 * @param {GuildMember} executor - The user performing the action
 * @param {GuildMember} target - The user being acted upon
 * @param {string} actionType - The action type (e.g., 'COUNTINGBLACKLIST', 'BAN')
 * @param {string} guildId - The guild ID
 * @returns {Promise<{allowed: boolean, reason?: string}>} - Result with optional reason
 */
export const canPerformAction = async (executor, target, actionType, guildId) => {
  const normalizedActionType = String(actionType).toUpperCase();

  // No one can moderate themselves
  if (executor.id === target.id) {
    return {
      allowed: false,
      reason: 'You cannot use your powers to bonk yourself.',
    };
  }
  // No one can perform actions on the running bot itself
  if (target.client?.user?.id && target.id === target.client.user.id) {
    return {
      allowed: false,
      reason: "Nice try, but you can't moderate me. 🙂",
    };
  }

  // Guild owner can override everything except actions on the server owner
  if (executor.guild.ownerId === executor.id) {
    if (target.guild.ownerId === target.id) {
      return {
        allowed: false,
        reason: 'You cannot perform this action on the server owner.',
      };
    }
    return { allowed: true };
  }

  // No one can perform actions on the server owner
  if (target.guild.ownerId === target.id) {
    return {
      allowed: false,
      reason: 'You cannot perform this action on the server owner.',
    };
  }

  const permissionRoles = await getPermissionRoles(guildId, normalizedActionType);
  const defaultPermissionCheck = DEFAULT_PERMISSIONS[normalizedActionType];
  if (!defaultPermissionCheck) {
    return {
      allowed: false,
      reason: 'Permission check not configured for this action.',
    };
  }

  const permissionMap = {
    hasManageRoles: () => hasManageRoles(executor),
    hasManageServer: () => hasManageServer(executor),
    hasBanMembers: () => hasBanMembers(executor),
    hasKickMembers: () => hasKickMembers(executor),
    hasTimeoutMembers: () => hasTimeoutMembers(executor),
  };

  const requiredChecks = Array.isArray(defaultPermissionCheck)
    ? defaultPermissionCheck
    : [defaultPermissionCheck];

  const hasDefaultPermission = requiredChecks.some(
    (check) => permissionMap[check] && permissionMap[check](),
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
      reason: `You need ${needText} to use this command.`,
    };
  }

  if (!canModerateUser(executor, target)) {
    return {
      allowed: false,
      reason:
        'You cannot perform this action on someone with a role equal to or higher than yours.',
    };
  }

  return { allowed: true };
};
