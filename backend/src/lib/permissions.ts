import { Action, Role } from "../types/permissions";

/**
 * Map of Role → Set of Actions that role is permitted to perform.
 *
 * Roles not listed in the map have zero permissions (safe by default).
 * Unknown role strings (from JWT) will also yield zero permissions.
 */
export const ROLE_PERMISSION_MAP: Record<string, Set<Action>> = {
  [Role.ADMIN]: new Set([
    Action.LEAD_CREATE,
    Action.LEAD_READ_ALL,
    Action.LEAD_UPDATE_ALL,
    Action.LEAD_ASSIGN,
    Action.LEAD_DELETE,
    Action.LEAD_ADD_NOTE,
  ]),

  [Role.CEO]: new Set([
    Action.LEAD_CREATE,
    Action.LEAD_READ_ALL,
    Action.LEAD_UPDATE_ALL,
    Action.LEAD_ASSIGN,
    Action.LEAD_DELETE,
    Action.LEAD_ADD_NOTE,
  ]),

  [Role.CFO]: new Set([
    Action.LEAD_CREATE,
    Action.LEAD_READ_ALL,
    Action.LEAD_UPDATE_ALL,
    Action.LEAD_ASSIGN,
    Action.LEAD_DELETE,
    Action.LEAD_ADD_NOTE,
  ]),

  [Role.MANAGER]: new Set([
    Action.LEAD_CREATE,
    Action.LEAD_READ_ALL,
    Action.LEAD_UPDATE_ALL,
    Action.LEAD_ASSIGN,
    Action.LEAD_DELETE,
    Action.LEAD_ADD_NOTE,
  ]),

  [Role.SALES_HEAD]: new Set([
    Action.LEAD_CREATE,
    Action.LEAD_READ_ALL,
    Action.LEAD_UPDATE_ALL,
    Action.LEAD_ASSIGN,
    Action.LEAD_DELETE,
    Action.LEAD_ADD_NOTE,
  ]),

  [Role.OPERATIONS_HEAD]: new Set([
    Action.LEAD_CREATE,
    Action.LEAD_READ_ALL,
    Action.LEAD_UPDATE_ALL,
    Action.LEAD_ASSIGN,
    Action.LEAD_DELETE,
    Action.LEAD_ADD_NOTE,
  ]),

  [Role.SALES_USER]: new Set([
    Action.LEAD_CREATE,
    Action.LEAD_READ_OWN,
    Action.LEAD_UPDATE_OWN,
    Action.LEAD_ADD_NOTE,
  ]),

  [Role.USER]: new Set([
    Action.LEAD_READ_OWN,
    Action.LEAD_ADD_NOTE,
  ]),
};

/**
 * Convenience: set of roles that have broad ("view-all") lead access.
 * Used by leadAccessWhere() in lead.ts to build the Prisma filter.
 */
export const PRIVILEGED_ROLES = new Set<string>([
  Role.ADMIN,
  Role.CEO,
  Role.CFO,
  Role.MANAGER,
  Role.SALES_HEAD,
  Role.OPERATIONS_HEAD,
]);
