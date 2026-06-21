"use client";

import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarRadiusAxis,
  PolarAngleAxis as RadarAngle,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
  PieChart,
  Pie,
  Legend,
  AreaChart,
  Area,
  CartesianGrid,
  ReferenceLine,
} from "recharts";

function scoreColor(v: number) {
  if (v >= 100) return "#16a34a";
  if (v >= 75) return "#67C5B9";
  if (v >= 50) return "#f59e0b";
  return "#A11249";
}

export function OverallGauge({ score }: { score: number }) {
  const data = [{ name: "الأداء", value: score, fill: scoreColor(score) }];
  return (
    <div className="card flex flex-col items-center p-5">
      <h3 className="mb-2 self-start text-sm font-bold text-mushar-dark">
        مؤشر الأداء العام
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <RadialBarChart
          innerRadius="70%"
          outerRadius="100%"
          data={data}
          startAngle={210}
          endAngle={-30}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar background dataKey="value" cornerRadius={12} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="-mt-32 mb-12 text-center">
        <p className="text-4xl font-extrabold text-mushar-dark">{score}%</p>
        <p className="text-xs text-slate-400">متوسط التحقّق</p>
      </div>
    </div>
  );
}

export function StatusDonut({
  data,
}: {
  data: { name: string; value: number; color: string }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="card p-5">
      <h3 className="mb-2 text-sm font-bold text-mushar-dark">
        توزيع حالة المؤشرات
      </h3>
      {total === 0 ? (
        <p className="py-20 text-center text-sm text-slate-400">
          لا توجد نتائج معتمدة بعد
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={95}
              paddingAngle={2}
            >
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 12, direction: "rtl" }}
            />
            <Legend wrapperStyle={{ fontSize: 12, direction: "rtl" }} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function DimensionRadar({
  data,
}: {
  data: { dimension: string; score: number }[];
}) {
  return (
    <div className="card p-5">
      <h3 className="mb-2 text-sm font-bold text-mushar-dark">
        تحقّق الأبعاد (نظرة متوازنة)
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="#e2e8f0" />
          <RadarAngle dataKey="dimension" tick={{ fontSize: 11, fill: "#475569" }} />
          <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#94a3b8" }} />
          <Radar
            dataKey="score"
            stroke="#056073"
            fill="#056073"
            fillOpacity={0.35}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 12, direction: "rtl" }}
            formatter={(v: number) => [`${v}%`, "نسبة التحقّق"]}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PerformanceTrend({
  data,
}: {
  data: { period: string; score: number; count: number }[];
}) {
  return (
    <div className="card p-5">
      <h3 className="mb-1 text-sm font-bold text-mushar-dark">
        تتبّع الأداء عبر الزمن
      </h3>
      <p className="mb-3 text-xs text-slate-400">
        متوسط نسبة التحقّق للقياسات المعتمدة في كل فترة
      </p>
      {data.length === 0 ? (
        <p className="py-20 text-center text-sm text-slate-400">
          لا توجد نتائج معتمدة بعد لعرض الاتجاه الزمني
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <defs>
              <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#056073" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#056073" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f4" />
            <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#475569" }} />
            <YAxis
              domain={[0, 110]}
              tick={{ fontSize: 11, fill: "#475569" }}
              unit="%"
            />
            <ReferenceLine
              y={100}
              stroke="#16a34a"
              strokeDasharray="5 4"
              label={{ value: "المستهدف", fontSize: 10, fill: "#16a34a" }}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 12, direction: "rtl" }}
              formatter={(v: number, _n, p: { payload?: { count?: number } }) => [
                `${v}% (${p?.payload?.count ?? 0} مؤشر)`,
                "متوسط التحقّق",
              ]}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#056073"
              strokeWidth={2.5}
              fill="url(#trendFill)"
              dot={{ r: 4, fill: "#056073" }}
              activeDot={{ r: 6 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export function DimensionBars({
  data,
  title = "نسبة التحقّق حسب البُعد",
}: {
  data: { name: string; score: number }[];
  title?: string;
}) {
  return (
    <div className="card p-5">
      <h3 className="mb-2 text-sm font-bold text-mushar-dark">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 32, left: 8, bottom: 4 }}
        >
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "#475569" }} unit="%" />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fontSize: 11, fill: "#475569" }}
          />
          <Tooltip
            cursor={{ fill: "#f1f5f9" }}
            contentStyle={{ fontSize: 12, borderRadius: 12, direction: "rtl" }}
            formatter={(v: number) => [`${v}%`, "التحقّق"]}
          />
          <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={18}>
            {data.map((d, i) => (
              <Cell key={i} fill={scoreColor(d.score)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
