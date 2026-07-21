"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const BRAND_DEEP = "#144928";
const MUTED = "#6b7c70";

/** Palette distinta dalle linee categoria (evita viola/glow). */
const CATEGORY_COLORS = [
  "#1f6b3a",
  "#0f766e",
  "#b45309",
  "#1d4ed8",
  "#6b7c70",
];

const EMPLOYEE_COLORS = [
  "#1f6b3a",
  "#0f766e",
  "#b45309",
  "#1d4ed8",
  "#6b7c70",
  "#854d0e",
  "#166534",
  "#0e7490",
];

export type MonthCategoryPoint = {
  label: string;
  [categoryLabel: string]: string | number;
};

export type EmployeePoint = {
  name: string;
  total: number;
  count: number;
};

type Props = {
  byMonthCategory: MonthCategoryPoint[];
  categoryKeys: string[];
  byEmployee: EmployeePoint[];
};

function euro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function ChartShell({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-white/80 p-5">
      <div>
        <h2 className="font-display text-lg font-bold text-brand-deep">{title}</h2>
        <p className="mt-0.5 text-xs text-muted">{hint}</p>
      </div>
      <div className="mt-4 h-72 w-full">{children}</div>
    </section>
  );
}

function Empty() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted">
      Nessun dato nel periodo.
    </div>
  );
}

export function DashboardCharts({
  byMonthCategory,
  categoryKeys,
  byEmployee,
}: Props) {
  const categoryEmpty =
    categoryKeys.length === 0 ||
    byMonthCategory.every((row) =>
      categoryKeys.every((key) => Number(row[key] || 0) === 0),
    );
  const employeeEmpty = byEmployee.length === 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartShell
        title="Totale mese per dipendente"
        hint="Mese corrente · data caricamento · inviate e approvate"
      >
        {employeeEmpty ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={byEmployee}
              margin={{ top: 8, right: 12, left: 0, bottom: 48 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5ebe7" />
              <XAxis
                dataKey="name"
                tick={{ fill: MUTED, fontSize: 11 }}
                interval={0}
                angle={-28}
                textAnchor="end"
                height={56}
              />
              <YAxis
                tick={{ fill: MUTED, fontSize: 11 }}
                tickFormatter={(v) => euro(Number(v))}
                width={64}
              />
              <Tooltip
                formatter={(value, _name, item) => [
                  `${euro(Number(value ?? 0))} · ${Number(item?.payload?.count ?? 0)} note`,
                  "Totale",
                ]}
                labelStyle={{ color: BRAND_DEEP }}
              />
              <Bar dataKey="total" name="Totale" radius={[6, 6, 0, 0]} barSize={28}>
                {byEmployee.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={EMPLOYEE_COLORS[index % EMPLOYEE_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartShell>

      <ChartShell
        title="Andamento mensile per categoria"
        hint="Top 4 categorie del periodo · data caricamento · inviate e approvate"
      >
        {categoryEmpty ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={byMonthCategory}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5ebe7" />
              <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 11 }} />
              <YAxis
                tick={{ fill: MUTED, fontSize: 11 }}
                tickFormatter={(v) => euro(Number(v))}
                width={64}
              />
              <Tooltip
                formatter={(value) => euro(Number(value ?? 0))}
                labelStyle={{ color: BRAND_DEEP }}
              />
              <Legend />
              {categoryKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={key}
                  stroke={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                  strokeWidth={2.25}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartShell>
    </div>
  );
}
