export const ROLES = {
  adminIt: "admin_it",
  responsabile: "responsabile",
  employee: "employee",
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES] | "admin";

/** Admin IT (ex admin) — full access incluso utenti. */
export function isAdminIt(role: string) {
  return role === ROLES.adminIt || role === "admin";
}

/** Responsabile operativo o Admin IT. */
export function isManager(role: string) {
  return role === ROLES.responsabile || isAdminIt(role);
}

export function canManageUsers(role: string) {
  return isAdminIt(role);
}

export function canApproveExpenses(role: string) {
  return isManager(role);
}

export function canViewAllExpenses(role: string) {
  return isManager(role);
}

export function canAccessAdminArea(role: string) {
  return isManager(role);
}

export function canImportAci(role: string) {
  return isAdminIt(role);
}

export function homePathForRole(role: string) {
  return canAccessAdminArea(role) ? "/admin" : "/expenses";
}

export function roleLabel(role: string) {
  if (isAdminIt(role)) return "Admin IT";
  if (role === ROLES.responsabile) return "Responsabile";
  return "Dipendente";
}
