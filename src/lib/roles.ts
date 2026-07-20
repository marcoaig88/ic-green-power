export const ROLES = {
  adminIt: "admin_it",
  coo: "coo",
  cfo: "cfo",
  employee: "employee",
  /** Legacy — trattato come manager come COO/CFO */
  responsabile: "responsabile",
} as const;

/** Ruoli selezionabili in anagrafica (Admin IT escluso). */
export const ASSIGNABLE_ROLES = [ROLES.coo, ROLES.cfo, ROLES.employee] as const;

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];
export type AppRole = (typeof ROLES)[keyof typeof ROLES] | "admin";

export function isAssignableRole(role: string): role is AssignableRole {
  return (ASSIGNABLE_ROLES as readonly string[]).includes(role);
}

/** Ruoli gestiti dalla pagina Dipendenti (inclusi legacy). */
export function isTeamManagedRole(role: string) {
  return isAssignableRole(role) || role === ROLES.responsabile;
}

/** Admin IT (ex admin) — full access incluso utenti. */
export function isAdminIt(role: string) {
  return role === ROLES.adminIt || role === "admin";
}

/** COO / CFO / Responsabile legacy / Admin IT. */
export function isManager(role: string) {
  return (
    role === ROLES.coo ||
    role === ROLES.cfo ||
    role === ROLES.responsabile ||
    isAdminIt(role)
  );
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
  if (role === ROLES.coo) return "COO";
  if (role === ROLES.cfo) return "CFO";
  if (role === ROLES.responsabile) return "Responsabile";
  return "Dipendente";
}

export const ASSIGNABLE_ROLE_OPTIONS: { value: AssignableRole; label: string }[] = [
  { value: ROLES.coo, label: "COO" },
  { value: ROLES.cfo, label: "CFO" },
  { value: ROLES.employee, label: "Dipendente" },
];

/** Filtro Prisma: utenti del team (non Admin IT). */
export const teamUsersWhere = {
  role: {
    in: [...ASSIGNABLE_ROLES, ROLES.responsabile],
  },
};
