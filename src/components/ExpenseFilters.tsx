"use client";

import Link from "next/link";
import { useState } from "react";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/format";

type UserOption = { id: string; name: string };

type Props = {
  isAdmin: boolean;
  users: UserOption[];
  values: {
    q: string;
    status: string;
    category: string;
    userId: string;
    from: string;
    to: string;
  };
  resultCount: number;
};

export function ExpenseFilters({ isAdmin, users, values, resultCount }: Props) {
  const [from, setFrom] = useState(values.from);
  const [to, setTo] = useState(values.to);

  const hasFilters = Boolean(
    values.q || values.status || values.category || values.userId || values.from || values.to,
  );

  return (
    <form
      method="get"
      className="space-y-3 rounded-xl border border-line bg-white/80 p-4 backdrop-blur-sm"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm font-semibold text-ink">Filtri</p>
        <p className="text-xs text-muted">
          {resultCount} risultat{resultCount === 1 ? "o" : "i"}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block sm:col-span-2 lg:col-span-1">
          <span className="mb-1 block text-xs font-semibold text-muted">Cerca</span>
          <input
            name="q"
            defaultValue={values.q}
            placeholder="Fornitore o descrizione"
            className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">Stato</span>
          <select
            name="status"
            defaultValue={values.status}
            className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
          >
            <option value="">Tutti</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted">Categoria</span>
          <select
            name="category"
            defaultValue={values.category}
            className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
          >
            <option value="">Tutte</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        {isAdmin && (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Dipendente</span>
            <select
              name="userId"
              defaultValue={values.userId}
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
            >
              <option value="">Tutti</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="grid grid-cols-2 gap-3 sm:col-span-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Data da</span>
            <input
              type="date"
              name="from"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted">Data a</span>
            <input
              type="date"
              name="to"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-deep"
        >
          Applica
        </button>
        {hasFilters && (
          <Link
            href="/expenses"
            className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-muted hover:border-brand hover:text-brand-deep"
          >
            Reset
          </Link>
        )}
      </div>
    </form>
  );
}
