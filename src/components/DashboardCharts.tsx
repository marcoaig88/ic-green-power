"use client";

import {
  CartesianGrid,
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

export type MonthCategoryPoint = {
  label: string;
  /** totali per chiave categoria (label IT) */
  [categoryLabel: string]: string | number;
};

type Props = {
  byMonthCategory: MonthCategoryPoint[];
  categoryKeys: string[];
};

function euro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function DashboardCharts({ byMonthCategory, categoryKeys }: Props) {
  const empty =
    categoryKeys.length === 0 ||
    byMonthCategory.every((row) =>
      categoryKeys.every((key) => Number(row[key] || 0) === 0),
    );

  return (
    <section className="rounded-xl border border-line bg-white/80 p-5">
      <div>
        <h2 className="font-display text-lg font-bold text-brand-deep">
          Andamento mensile per categoria
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          Top 4 categorie del periodo · data caricamento · inviate e approvate
        </p>
      </div>
      <div className="mt-4 h-72 w-full">
        {empty ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            Nessun dato nel periodo.
          </div>
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
      </div>
    </section>
  );
}
