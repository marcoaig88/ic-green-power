import type { Prisma } from "@prisma/client";

export const ROLES = {
  adminIt: "admin_it",
  coo: "coo",
  cfo: "cfo",
  employee: "employee",
  /** Legacy — trattato come CFO */
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

export function isCfo(role: string) {
  return role === ROLES.cfo || role === ROLES.responsabile;
}

export function isCoo(role: string) {
  return role === ROLES.coo;
}

/** COO / CFO / Responsabile legacy / Admin IT. */
export function isManager(role: string) {
  return isCoo(role) || isCfo(role) || isAdminIt(role);
}

export function canManageUsers(role: string) {
  return isAdminIt(role);
}

/** Ha poteri di approvazione (COO/CFO). Admin IT non approva. */
export function canApproveExpenses(role: string) {
  return isCoo(role) || isCfo(role);
}

/** Vede spese oltre alle proprie (con scope diverso per COO/CFO). */
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
  if (isCfo(role)) return "CFO";
  return "Dipendente";
}

export const ASSIGNABLE_ROLE_OPTIONS: { value: AssignableRole; label: string }[] = [
  { value: ROLES.cfo, label: "CFO" },
  { value: ROLES.coo, label: "COO" },
  { value: ROLES.employee, label: "Dipendente" },
];

/** Ordine elenco utenti: CFO → COO → Dipendente. */
export function teamRoleRank(role: string) {
  if (isCfo(role)) return 0;
  if (isCoo(role)) return 1;
  return 2;
}

export function compareTeamUsers(
  a: { role: string; surname: string; name: string },
  b: { role: string; surname: string; name: string },
) {
  const byRole = teamRoleRank(a.role) - teamRoleRank(b.role);
  if (byRole !== 0) return byRole;
  const bySurname = a.surname.localeCompare(b.surname, "it");
  if (bySurname !== 0) return bySurname;
  return a.name.localeCompare(b.name, "it");
}

/** Filtro Prisma: utenti del team (non Admin IT). */
export const teamUsersWhere = {
  role: {
    in: [...ASSIGNABLE_ROLES, ROLES.responsabile],
  },
};

type SessionActor = { id: string; role: string };
type ExpenseOwner = { userId: string; user?: { role?: string | null } | null };

/**
 * Visibilità lista note spese:
 * - Admin IT / CFO → tutte tranne bozze altrui (le "da completare" restano solo al proprietario)
 * - COO → spese del CFO (non bozze) + proprie
 * - Dipendente → solo proprie
 */
export function expenseListWhere(session: SessionActor): Prisma.ExpenseWhereInput {
  if (isAdminIt(session.role) || isCfo(session.role)) {
    return {
      OR: [{ status: { not: "draft" } }, { userId: session.id }],
    };
  }
  if (isCoo(session.role)) {
    return {
      AND: [
        {
          OR: [{ user: { role: ROLES.cfo } }, { userId: session.id }],
        },
        {
          OR: [{ status: { not: "draft" } }, { userId: session.id }],
        },
      ],
    };
  }
  return { userId: session.id };
}

/**
 * Visibilità dashboard:
 * - COO → solo spese del CFO già inviate (niente bozze da completare)
 * - altrimenti come lista
 */
export function expenseDashboardWhere(session: SessionActor): Prisma.ExpenseWhereInput {
  if (isCoo(session.role)) {
    return {
      AND: [{ user: { role: ROLES.cfo } }, { status: { not: "draft" } }],
    };
  }
  return expenseListWhere(session);
}

/** Può approvare questa specifica nota spesa. Admin IT: mai. */
export function canApproveExpense(actor: SessionActor, expense: ExpenseOwner) {
  if (isAdminIt(actor.role)) return false;
  if (isCfo(actor.role)) {
    // CFO approva tutti tranne le proprie (le sue vanno al COO)
    return expense.userId !== actor.id;
  }
  if (isCoo(actor.role)) {
    return expense.user?.role === ROLES.cfo;
  }
  return false;
}

/** Spesa propria del CFO in attesa (da evidenziare, non approvabile da lui). */
export function isCfoOwnPending(
  actor: SessionActor,
  expense: { userId: string; status: string },
) {
  return isCfo(actor.role) && expense.userId === actor.id && expense.status === "submitted";
}

/** Può accedere in lettura a questa spesa. */
export function canAccessExpense(actor: SessionActor, expense: ExpenseOwner) {
  if (expense.userId === actor.id) return true;
  if (isAdminIt(actor.role) || isCfo(actor.role)) return true;
  if (isCoo(actor.role)) return expense.user?.role === ROLES.cfo;
  return false;
}
