import type { Prisma } from "@prisma/client";
import { CATEGORY_LABELS, dayRangeFromInputs } from "@/lib/format";
import {
  canViewAllExpenses,
  expenseDashboardWhere,
  expenseListWhere,
} from "@/lib/roles";

export const EXPENSE_STATUSES = ["draft", "submitted", "approved", "rejected"] as const;
export const EXPENSE_CATEGORIES = Object.keys(CATEGORY_LABELS);

export type ExpenseFilterValues = {
  q: string;
  status: string;
  category: string;
  userId: string;
  from: string;
  to: string;
};

export type ExpenseFilterParams = Partial<ExpenseFilterValues>;

export function parseExpenseFilters(params: ExpenseFilterParams): ExpenseFilterValues {
  const statusSet = new Set<string>(EXPENSE_STATUSES);
  const categorySet = new Set(EXPENSE_CATEGORIES);

  return {
    q: (params.q || "").trim(),
    status: statusSet.has(params.status || "") ? params.status! : "",
    category: categorySet.has(params.category || "") ? params.category! : "",
    userId: params.userId || "",
    from: params.from || "",
    to: params.to || "",
  };
}

export function buildExpenseWhere(
  filters: ExpenseFilterValues,
  options: {
    role: string;
    sessionUserId: string;
    /** dashboard = per COO solo spese CFO; list = default */
    scope?: "list" | "dashboard";
  },
): Prisma.ExpenseWhereInput {
  const andFilters: Prisma.ExpenseWhereInput[] = [];
  const session = { id: options.sessionUserId, role: options.role };
  const visibility =
    options.scope === "dashboard"
      ? expenseDashboardWhere(session)
      : expenseListWhere(session);

  if (Object.keys(visibility).length > 0) {
    andFilters.push(visibility);
  }

  if (canViewAllExpenses(options.role) && filters.userId) {
    andFilters.push({ userId: filters.userId });
  }

  if (filters.status) andFilters.push({ status: filters.status });
  if (filters.category) andFilters.push({ category: filters.category });

  if (filters.q) {
    andFilters.push({
      OR: [
        { merchant: { contains: filters.q, mode: "insensitive" } },
        { description: { contains: filters.q, mode: "insensitive" } },
        { documentNumber: { contains: filters.q, mode: "insensitive" } },
        { taxId: { contains: filters.q, mode: "insensitive" } },
      ],
    });
  }

  if (filters.from || filters.to) {
    const range = dayRangeFromInputs(filters.from, filters.to);
    andFilters.push({
      OR: [
        { expenseDate: range },
        {
          AND: [{ expenseDate: null }, { createdAt: range }],
        },
      ],
    });
  }

  return andFilters.length > 0 ? { AND: andFilters } : {};
}

export function expenseFiltersToSearchParams(filters: ExpenseFilterValues): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.category) params.set("category", filters.category);
  if (filters.userId) params.set("userId", filters.userId);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  return params;
}

export function hasActiveExpenseFilters(filters: ExpenseFilterValues) {
  return Boolean(
    filters.q ||
      filters.status ||
      filters.category ||
      filters.userId ||
      filters.from ||
      filters.to,
  );
}
