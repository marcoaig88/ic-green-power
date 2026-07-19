"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const BRAND = "#1f6b3a";
const BRAND_DEEP = "#144928";
const BRAND_SOFT = "#6faf86";
const MUTED = "#6b7c70";
const STATUS_COLORS = [MUTED, "#d4a017", BRAND, "#b45309"];

type StatusPoint = { label: string; count: number; total: number };
type CategoryPoint = { label: string; total: number; count: number };
type EmployeePoint = { name: string; total: number; monthTotal: number };
type MonthPoint = { label: string; total: number; count: number };

type Props = {
  byStatus: StatusPoint[];
  byCategory: CategoryPoint[];
  byEmployee: EmployeePoint[];
  byMonth: MonthPoint[];
};

function euro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-white/80 p-5">
      <h2 className="font-display text-lg font-bold text-brand-deep">{title}</h2>
      <div className="mt-4 h-64 w-full">{children}</div>
    </section>
  );
}

export function DashboardCharts({
  byStatus,
  byCategory,
  byEmployee,
  byMonth,
}: Props) {
  const statusData = byStatus.filter((row) => row.count > 0);
  const categoryData = byCategory.slice(0, 8);
  const employeeData = byEmployee
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <ChartCard title="Andamento mensile">
        {byMonth.every((m) => m.total === 0) ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={byMonth} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
              <Line
                type="monotone"
                dataKey="total"
                name="Importo"
                stroke={BRAND}
                strokeWidth={2.5}
                dot={{ r: 3, fill: BRAND }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Distribuzione per stato">
        {statusData.length === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={84}
                paddingAngle={2}
              >
                {statusData.map((entry, index) => (
                  <Cell
                    key={entry.label}
                    fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, _name, item) => [
                  `${Number(value ?? 0)} · ${euro(Number(item?.payload?.total ?? 0))}`,
                  String(item?.payload?.label ?? ""),
                ]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Spesa per categoria">
        {categoryData.length === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={categoryData}
              layout="vertical"
              margin={{ top: 8, right: 12, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5ebe7" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fill: MUTED, fontSize: 11 }}
                tickFormatter={(v) => euro(Number(v))}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={78}
                tick={{ fill: MUTED, fontSize: 11 }}
              />
              <Tooltip formatter={(value) => euro(Number(value ?? 0))} />
              <Bar dataKey="total" name="Importo" fill={BRAND} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="Spesa per dipendente">
        {employeeData.length === 0 ? (
          <Empty />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={employeeData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5ebe7" />
              <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 11 }} />
              <YAxis
                tick={{ fill: MUTED, fontSize: 11 }}
                tickFormatter={(v) => euro(Number(v))}
                width={64}
              />
              <Tooltip formatter={(value) => euro(Number(value ?? 0))} />
              <Legend />
              <Bar dataKey="total" name="Totale" fill={BRAND_DEEP} radius={[6, 6, 0, 0]} />
              <Bar dataKey="monthTotal" name="Mese" fill={BRAND_SOFT} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-muted">
      Nessun dato per i filtri selezionati.
    </div>
  );
}
