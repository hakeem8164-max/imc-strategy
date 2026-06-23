"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import KpiCard from "@/components/KpiCard";
import FilterSelect from "@/components/ui/FilterSelect";
import {
  RotateCcw,
  LayoutGrid,
  List,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import type { Dimension, Objective, Kpi, OrgUnit } from "@/lib/types";
import { achievementRatio } from "@/lib/period";
import { bandFor, type Band } from "@/lib/bands";
import { formatValue } from "@/lib/format";

const UNIT_LABEL: Record<string, string> = {
  "%": "نسبة مئوية",
  $: "مبلغ مالي",
  "#": "عدد",
  "": "بدون وحدة",
};

export type Point = { label: string; value: number };

type Meta = {
  value: number | null;
  prev: number | null;
  ratio: number | null;
  statusLabel: string;
  color: string;
  trend: "up" | "down" | "flat" | "none";
};

export default function KpiBrowser({
  kpis,
  dimensions,
  objectives = [],
  series = {},
  periods = [],
  orgUnits = [],
  bands = [],
}: {
  kpis: Kpi[];
  dimensions: Dimension[];
  objectives?: Objective[];
  series?: Record<string, Point[]>;
  periods?: string[];
  orgUnits?: OrgUnit[];
  bands?: Band[];
}) {
  const [q, setQ] = useState("");
  const [dim, setDim] = useState("all");
  const [obj, setObj] = useState("all");
  const [unit, setUnit] = useState("all");
  const [freq, setFreq] = useState("all");
  const [status, setStatus] = useState("all");
  const [trend, setTrend] = useState("all");
  const [type, setType] = useState("all");
  const [period, setPeriod] = useState(""); // "" = آخر فترة
  const [onlyMine, setOnlyMine] = useState(false);
  const [view, setView] = useState<"cards" | "table">("cards");

  const mineIds = useMemo(
    () => new Set(kpis.filter((k) => (k as any)._mine).map((k) => k.id)),
    [kpis]
  );
  const hasMine = mineIds.size > 0;

  // قيمة/سابق المؤشر حسب الفترة المختارة
  const meta = useMemo(() => {
    const m: Record<string, Meta> = {};
    for (const k of kpis) {
      const pts = series[k.id] ?? [];
      let value: number | null = null;
      let prev: number | null = null;
      if (period === "") {
        value = pts.length ? pts[pts.length - 1].value : null;
        prev = pts.length > 1 ? pts[pts.length - 2].value : null;
      } else {
        const idx = pts.findIndex((p) => p.label === period);
        value = idx >= 0 ? pts[idx].value : null;
        prev = idx > 0 ? pts[idx - 1].value : null;
      }
      const target = k.target_total ?? k.target_q4 ?? k.target_q3 ?? null;
      const ratio = achievementRatio(value, target, k.polarity);
      const b = bandFor(ratio, bands);
      let tr: Meta["trend"] = "none";
      if (value !== null && prev !== null) {
        tr = value > prev ? "up" : value < prev ? "down" : "flat";
      }
      m[k.id] = {
        value,
        prev,
        ratio,
        statusLabel: ratio === null ? "بلا بيانات" : b.label,
        color: b.color,
        trend: tr,
      };
    }
    return m;
  }, [kpis, series, period, bands]);

  const freqs = useMemo(
    () => Array.from(new Set(kpis.map((k) => k.frequency).filter(Boolean))),
    [kpis]
  );
  const types = useMemo(() => Array.from(new Set(kpis.map((k) => k.unit))), [kpis]);
  const statusOptions = useMemo(
    () => [...bands.map((b) => b.label), "بلا بيانات"],
    [bands]
  );
  const usedUnits = useMemo(() => {
    const ids = new Set(kpis.map((k) => k.owner_unit_id).filter(Boolean));
    return orgUnits.filter((u) => ids.has(u.id));
  }, [kpis, orgUnits]);

  // أهداف المنظور المختار (أو كلها)
  const objOptions = useMemo(
    () =>
      dim === "all"
        ? objectives
        : objectives.filter((o) => o.dimension_id === dim),
    [objectives, dim]
  );

  const filtered = useMemo(() => {
    return kpis.filter((k) => {
      if (dim !== "all" && k.dimension_id !== dim) return false;
      if (obj !== "all" && k.objective_id !== obj) return false;
      if (unit !== "all" && k.owner_unit_id !== unit) return false;
      if (freq !== "all" && k.frequency !== freq) return false;
      if (type !== "all" && k.unit !== type) return false;
      if (status !== "all" && meta[k.id]?.statusLabel !== status) return false;
      if (trend !== "all" && meta[k.id]?.trend !== trend) return false;
      if (onlyMine && !mineIds.has(k.id)) return false;
      if (q.trim()) {
        const t = q.trim();
        return (
          k.name.includes(t) ||
          (k.code ?? "").includes(t) ||
          (k.objective?.name ?? "").includes(t) ||
          (k.owner_unit?.name ?? "").includes(t) ||
          (k.owner_title ?? "").includes(t)
        );
      }
      return true;
    });
  }, [kpis, dim, obj, unit, freq, type, status, trend, onlyMine, q, meta, mineIds]);

  const active =
    dim !== "all" ||
    obj !== "all" ||
    unit !== "all" ||
    freq !== "all" ||
    type !== "all" ||
    status !== "all" ||
    trend !== "all" ||
    period !== "" ||
    onlyMine ||
    q.trim() !== "";

  function reset() {
    setQ("");
    setDim("all");
    setObj("all");
    setUnit("all");
    setFreq("all");
    setStatus("all");
    setTrend("all");
    setType("all");
    setPeriod("");
    setOnlyMine(false);
  }

  const grouped = useMemo(
    () =>
      dimensions
        .map((d) => {
          const dimKpis = filtered.filter((k) => k.dimension_id === d.id);
          const objs = objectives
            .filter((o) => o.dimension_id === d.id)
            .map((o) => ({
              o,
              list: dimKpis.filter((k) => k.objective_id === o.id),
            }))
            .filter((g) => g.list.length > 0);
          const orphan = dimKpis.filter((k) => !k.objective_id);
          return { d, objs, orphan, total: dimKpis.length };
        })
        .filter((g) => g.total > 0),
    [dimensions, objectives, filtered]
  );

  return (
    <div className="space-y-5">
      <div className="card space-y-3 p-4">
        <input
          className="input"
          placeholder="ابحث باسم المؤشر أو الإدارة…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
          <FilterSelect
            className="w-full"
            value={dim ?? ""}
            onValueChange={(v) => {
              setDim(v);
              setObj("all");
            }}
            options={[
              { value: "all", label: "كل المناظير" },
              ...dimensions.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
          <FilterSelect
            className="w-full"
            value={obj ?? ""}
            onValueChange={(v) => setObj(v)}
            options={[
              { value: "all", label: "كل الأهداف" },
              ...objOptions.map((o) => ({ value: o.id, label: o.name })),
            ]}
          />
          <FilterSelect
            className="w-full"
            value={unit ?? ""}
            onValueChange={(v) => setUnit(v)}
            options={[
              { value: "all", label: "كل الإدارات (المالك)" },
              ...usedUnits.map((u) => ({ value: u.id, label: u.name })),
            ]}
          />
          <FilterSelect
            className="w-full"
            value={freq ?? ""}
            onValueChange={(v) => setFreq(v)}
            options={[
              { value: "all", label: "كل الدوريات" },
              ...freqs.map((f) => ({ value: String(f), label: String(f) })),
            ]}
          />
          <FilterSelect
            className="w-full"
            value={period ?? ""}
            onValueChange={(v) => setPeriod(v)}
            options={[
              { value: "", label: "آخر فترة قياس" },
              ...periods.map((p) => ({ value: p, label: p })),
            ]}
          />
          <FilterSelect
            className="w-full"
            value={status ?? ""}
            onValueChange={(v) => setStatus(v)}
            options={[
              { value: "all", label: "كل حالات الأداء" },
              ...statusOptions.map((s) => ({ value: s, label: s })),
            ]}
          />
          <FilterSelect
            className="w-full"
            value={trend ?? ""}
            onValueChange={(v) => setTrend(v)}
            options={[
              { value: "all", label: "كل الاتجاهات" },
              { value: "up", label: "صاعد ↗" },
              { value: "down", label: "هابط ↘" },
              { value: "flat", label: "ثابت" },
              { value: "none", label: "بلا قياس سابق" },
            ]}
          />
          <FilterSelect
            className="w-full"
            value={type ?? ""}
            onValueChange={(v) => setType(v)}
            options={[
              { value: "all", label: "كل الأنواع" },
              ...types.map((u) => ({ value: u, label: UNIT_LABEL[u] ?? u })),
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3">
            {hasMine && (
              <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={onlyMine}
                  onChange={(e) => setOnlyMine(e.target.checked)}
                  className="h-4 w-4 accent-mushar-primary"
                />
                مؤشراتي فقط
              </label>
            )}
            {active && (
              <button
                onClick={reset}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-mushar-accent hover:underline"
              >
                <RotateCcw size={13} /> إعادة تعيين
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              النتائج: <b className="text-mushar-dark">{filtered.length}</b> من {kpis.length}
            </span>
            <div className="flex overflow-hidden rounded-lg border border-slate-200">
              <button
                onClick={() => setView("cards")}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold ${
                  view === "cards" ? "bg-mushar-primary text-white" : "text-slate-500"
                }`}
              >
                <LayoutGrid size={14} /> بطاقات
              </button>
              <button
                onClick={() => setView("table")}
                className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold ${
                  view === "table" ? "bg-mushar-primary text-white" : "text-slate-500"
                }`}
              >
                <List size={14} /> جدول
              </button>
            </div>
          </div>
        </div>
        {period !== "" && (
          <p className="text-[11px] text-mushar-primary">
            تعرض النتائج لفترة: <b>{period}</b>
          </p>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-sm text-slate-400">
          لا توجد مؤشرات مطابقة للفلاتر
        </div>
      ) : view === "table" ? (
        <TableView rows={filtered} meta={meta} />
      ) : (
        <div className="space-y-8">
          {grouped.map(({ d, objs, orphan, total }) => (
            <section key={d.id}>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-4 w-1.5 rounded-full" style={{ backgroundColor: d.color }} />
                <h2 className="text-base font-bold text-mushar-dark">{d.name}</h2>
                <span className="text-xs text-slate-400">({total})</span>
                <div className="mr-2 h-px flex-1 bg-slate-100" />
              </div>
              <div className="space-y-5">
                {objs.map(({ o, list }) => (
                  <div key={o.id}>
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
                      {o.code && (
                        <span className="text-xs font-bold text-mushar-accent">
                          {o.code}
                        </span>
                      )}
                      {o.name}
                      <span className="text-xs font-normal text-slate-400">
                        ({list.length})
                      </span>
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {list.map((k) => (
                        <KpiCard
                          key={k.id}
                          kpi={k}
                          value={meta[k.id]?.value ?? null}
                          prevValue={meta[k.id]?.prev ?? null}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                {orphan.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-slate-600">
                      مؤشرات دون هدف
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                      {orphan.map((k) => (
                        <KpiCard
                          key={k.id}
                          kpi={k}
                          value={meta[k.id]?.value ?? null}
                          prevValue={meta[k.id]?.prev ?? null}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function TrendIcon({ t }: { t: Meta["trend"] }) {
  if (t === "up") return <TrendingUp size={14} className="text-emerald-600" />;
  if (t === "down") return <TrendingDown size={14} className="text-mushar-accent" />;
  if (t === "flat") return <Minus size={14} className="text-slate-400" />;
  return <span className="text-slate-300">—</span>;
}

function TableView({
  rows,
  meta,
}: {
  rows: Kpi[];
  meta: Record<string, Meta>;
}) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-slate-50 text-right text-xs text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">المؤشر</th>
            <th className="px-4 py-3 font-semibold">المنظور</th>
            <th className="px-4 py-3 font-semibold">الهدف</th>
            <th className="px-4 py-3 font-semibold">الإدارة</th>
            <th className="px-4 py-3 font-semibold">الدورية</th>
            <th className="px-4 py-3 font-semibold">آخر قيمة</th>
            <th className="px-4 py-3 font-semibold">المستهدف الكلي</th>
            <th className="px-4 py-3 font-semibold">الحالة</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((k) => {
            const m = meta[k.id];
            const target = k.target_total ?? k.target_q4 ?? k.target_q3 ?? null;
            return (
              <tr key={k.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/kpis/${k.id}`}
                    className="font-medium text-mushar-dark hover:text-mushar-primary"
                  >
                    {k.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span
                    className="rounded-md px-2 py-0.5 text-[11px] font-semibold"
                    style={{
                      backgroundColor: `${k.dimension?.color ?? "#8C341F"}1a`,
                      color: k.dimension?.color ?? "#8C341F",
                    }}
                  >
                    {k.dimension?.name ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">{k.objective?.name ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">{k.owner_unit?.name ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">{k.frequency ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-mushar-dark">
                    {formatValue(m?.value ?? null, k.unit)}
                    <TrendIcon t={m?.trend ?? "none"} />
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{formatValue(target, k.unit)}</td>
                <td className="px-4 py-3">
                  {m?.ratio != null ? (
                    <span
                      className="rounded-md px-2 py-0.5 text-[11px] font-bold"
                      style={{ backgroundColor: `${m.color}1a`, color: m.color }}
                    >
                      {m.ratio}% · {m.statusLabel}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-300">بلا بيانات</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
