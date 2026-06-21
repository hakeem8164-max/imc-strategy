"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export interface DimensionDatum {
  name: string;
  count: number;
  withData: number;
  color: string;
}

export function DimensionBarChart({ data }: { data: DimensionDatum[] }) {
  return (
    <div className="card p-5">
      <h3 className="mb-4 text-sm font-bold text-mushar-dark">
        عدد المؤشرات حسب البعد
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#475569" }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={70}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#475569" }} />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 12, direction: "rtl" }}
            formatter={(v: number, n: string) => [
              v,
              n === "count" ? "إجمالي المؤشرات" : "تم إدخال بيانات",
            ]}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#D1F1ED" />
          <Bar dataKey="withData" radius={[6, 6, 0, 0]} fill="#056073" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AchievementPie({
  data,
}: {
  data: { name: string; value: number; color: string }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="card p-5">
      <h3 className="mb-4 text-sm font-bold text-mushar-dark">
        حالة إدخال البيانات
      </h3>
      {total === 0 ? (
        <p className="py-20 text-center text-sm text-slate-400">
          لا توجد بيانات بعد
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 12, direction: "rtl" }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, direction: "rtl" }}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
