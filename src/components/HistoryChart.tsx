"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from "recharts";

export default function HistoryChart({
  data,
  target,
  baseline,
}: {
  data: { label: string; value: number }[];
  target?: number | null;
  baseline?: number | null;
}) {
  if (data.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-slate-400">
        لا توجد قياسات بعد — أضف أول قيمة من النموذج أدناه
      </p>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eef2f4" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#475569" }} />
        <YAxis tick={{ fontSize: 11, fill: "#475569" }} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 12, direction: "rtl" }}
        />
        {target != null && (
          <ReferenceLine
            y={target}
            stroke="#16a34a"
            strokeDasharray="5 4"
            label={{ value: "المستهدف", fontSize: 11, fill: "#16a34a" }}
          />
        )}
        {baseline != null && (
          <ReferenceLine
            y={baseline}
            stroke="#BD9258"
            strokeDasharray="5 4"
            label={{ value: "خط الأساس", fontSize: 11, fill: "#BD9258" }}
          />
        )}
        <Line
          type="monotone"
          dataKey="value"
          stroke="#8C341F"
          strokeWidth={2.5}
          dot={{ r: 4, fill: "#8C341F" }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
