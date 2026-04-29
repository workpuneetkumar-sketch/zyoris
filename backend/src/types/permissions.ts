/**
 * Every discrete action that can be performed in the system.
 */
export enum Action {
  LEAD_CREATE = "LEAD_CREATE",
  LEAD_READ_OWN = "LEAD_READ_OWN",
  LEAD_READ_ALL = "LEAD_READ_ALL",
  LEAD_UPDATE_OWN = "LEAD_UPDATE_OWN",
  LEAD_UPDATE_ALL = "LEAD_UPDATE_ALL",
  LEAD_ASSIGN = "LEAD_ASSIGN",
  LEAD_DELETE = "LEAD_DELETE",
  LEAD_ADD_NOTE = "LEAD_ADD_NOTE",
}

/**
 * Every role that exists in the system.
 * Keep in sync with your Prisma / JWT payload role strings.
 */
export enum Role {
  ADMIN = "ADMIN",
  CEO = "CEO",
  CFO = "CFO",
  MANAGER = "MANAGER",
  SALES_HEAD = "SALES_HEAD",
  OPERATIONS_HEAD = "OPERATIONS_HEAD",
  SALES_USER = "SALES_USER",
  USER = "USER",
}

/**
 * Minimal user shape required by all permission helpers.
 * Mirrors AuthPayload from middleware/auth.ts — no cross-import needed.
 */
export interface PermissionUser {
  userId: string;
  role: string;
  organizationId: string | null;
}
