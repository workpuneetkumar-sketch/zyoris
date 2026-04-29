import { Prisma } from "@prisma/client";
import { ROLE_PERMISSION_MAP, PRIVILEGED_ROLES } from "../lib/permissions";
import { Action, PermissionUser } from "../types/permissions";

/**
 * Returns true if `user` is allowed to perform `action`.
 *
 * @example
 *   if (!canPerform(user, Action.LEAD_ASSIGN)) {
 *     return res.status(403).json({ error: "Forbidden" });
 *   }
 */
export function canPerform(user: PermissionUser, action: Action): boolean {
  const allowed = ROLE_PERMISSION_MAP[user.role];
  if (!allowed) return false;
  return allowed.has(action);
}

/**
 * Returns true if the user's role grants visibility over ALL org leads
 * (vs. only their own assigned leads).
 */
export function canViewAllLeads(user: PermissionUser): boolean {
  return PRIVILEGED_ROLES.has(user.role);
}

/**
 * Builds the Prisma `where` clause for lead queries based on the user's role.
 *
 * Privileged roles  → scoped to organizationId only (see all leads)
 * Restricted roles  → scoped to organizationId + assignedToId (own leads only)
 */
export function leadAccessWhere(
  user: PermissionUser & { organizationId: string }
): Prisma.LeadWhereInput {
  if (canViewAllLeads(user)) {
    return { organizationId: user.organizationId };
  }
  return {
    organizationId: user.organizationId,
    assignedToId: user.userId,
  };
}

/**
 * When creating a lead, determines the final `assignedToId`.
 *
 * Privileged roles  → can assign to anyone (or null), honours the request body value.
 * Restricted roles  → always self-assigned; the requested assignee is ignored.
 */
export function resolveAssignedToId(
  user: PermissionUser,
  requestedAssigneeId: string | null | undefined
): string | null {
  if (canViewAllLeads(user)) {
    return requestedAssigneeId ?? null;
  }
  return user.userId;
}

/**
 * Checks whether a user may change privileged lead fields (status / assignee).
 * Equivalent to the old `canViewAll` guard in update-lead.
 */
export function canChangeLeadPrivilegedFields(user: PermissionUser): boolean {
  return canPerform(user, Action.LEAD_UPDATE_ALL);
}

/**
 * Checks whether a user may use the `assignedToId` filter in list queries.
 * Only privileged roles can filter by assignee (otherwise they could enumerate
 * leads outside their own scope).
 */
export function canFilterByAssignee(user: PermissionUser): boolean {
  return canViewAllLeads(user);
}
