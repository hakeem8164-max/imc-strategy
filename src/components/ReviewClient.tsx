"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  submitEntry,
  approveEntry,
  rejectEntry,
  managerApprove,
  managerReject,
} from "@/app/(app)/performance/review/actions";
import {
  ENTRY_STATUS_LABELS,
  type EntryStatus,
  type Kpi,
  type KpiEntry,
  type Role,
} from "@/lib/types";
import { notify } from "@/components/ui/toast";
import { formatValue } from "@/lib/format";
import { FileText, CheckCircle2, XCircle } from "lucide-react";
import {
  currentYear,
  currentPeriodKey,
  periodsForFrequency,
  targetForDate,
  labelForDate,
  achievementStatus,
} from "@/lib/period";

const STATUS_STYLE: Record<EntryStatus, string> = {
  pending_manager: "bg-amber-100 text-amber-700",
  pending_officer: "bg-sky-100 text-sky-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-brand-accent/10 text-brand-accent",
  submitted: "bg-amber-100 text-amber-700",
};

function StatusBadge({ status }: { status: EntryStatus }) {
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLE[status]}`}
    >
      {ENTRY_STATUS_LABELS[status]}
    </span>
  );
}

async function openDoc(path: string) {
  const supabase = createClient();
  const { data } = await supabase.storage
    .from("kpi-docs")
    .createSignedUrl(path, 3600);
  if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  else notify("تعذّر فتح الوثيقة", "error");
}

export default function ReviewClient({
  role,
  editableKpis,
  lastValues,
  mySubmissions,
  officerPending,
  managerPending,
}: {
  role: Role;
  editableKpis: Kpi[];
  lastValues: Record<string, number>;
  mySubmissions: KpiEntry[];
  officerPending: KpiEntry[];
  managerPending: KpiEntry[];
}) {
  const router = useRouter();
  const year = currentYear();
  const isAdmin = role === "admin";
  const isManager = role === "owner" || role === "admin";

  return (
    <div className="space-y-6">
      {/* جدول إدخال النتائج (للمالك/المدير) */}
      {editableKpis.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-1 text-base font-bold text-brand-dark">
            إدخال النتائج وإرسالها للاعتماد
          </h3>
          <p className="mb-4 text-xs text-slate-400">
            الفترة تُحدّد تلقائيًا حسب الربع. تظهر لك النتيجة السابقة والمستهدف
            الربعي والحالة. أدخل القيمة، أرفق الوثيقة، ثم أرسل.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm">
              <thead className="bg-slate-50 text-right text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">المؤشر</th>
                  <th className="px-3 py-2 font-semibold">دورية القياس</th>
                  <th className="px-3 py-2 font-semibold">المتحقق السابق</th>
                  <th className="px-3 py-2 font-semibold">الفترة</th>
                  <th className="px-3 py-2 font-semibold">المستهدف</th>
                  <th className="px-3 py-2 font-semibold">النتيجة الجديدة</th>
                  <th className="px-3 py-2 font-semibold">الحالة</th>
                  <th className="px-3 py-2 font-semibold">الوثيقة</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {editableKpis.map((k) => (
                  <SubmitRow
                    key={k.id}
                    kpi={k}
                    lastValue={lastValues[k.id] ?? null}
                    year={year}
                    onDone={() => router.refresh()}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* طابور المدير: اعتماد ما يرسله الموظفون */}
      {isManager && (
        <div className="card p-5">
          <h3 className="mb-4 text-base font-bold text-brand-dark">
            بانتظار اعتماد المدير ({managerPending.length})
          </h3>
          {managerPending.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              لا توجد نتائج من الموظفين بانتظار اعتمادك.
            </p>
          ) : (
            <div className="space-y-3">
              {managerPending.map((e) => (
                <PendingRow
                  key={e.id}
                  entry={e}
                  stage="manager"
                  onDone={() => router.refresh()}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* طابور مسؤول الأداء: الاعتماد النهائي */}
      {isAdmin && (
        <div className="card p-5">
          <h3 className="mb-4 text-base font-bold text-brand-dark">
            بانتظار الاعتماد النهائي ({officerPending.length})
          </h3>
          {officerPending.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              لا توجد نتائج بانتظار الاعتماد النهائي.
            </p>
          ) : (
            <div className="space-y-3">
              {officerPending.map((e) => (
                <PendingRow
                  key={e.id}
                  entry={e}
                  stage="officer"
                  onDone={() => router.refresh()}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* سجلّ نتائجي */}
      <div className="card p-5">
        <h3 className="mb-4 text-base font-bold text-brand-dark">
          سجلّ نتائجي ({mySubmissions.length})
        </h3>
        {mySubmissions.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            لم ترسل أي نتيجة بعد.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-slate-50 text-right text-xs text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-semibold">المؤشر</th>
                  <th className="px-3 py-2 font-semibold">الفترة</th>
                  <th className="px-3 py-2 font-semibold">القيمة</th>
                  <th className="px-3 py-2 font-semibold">الحالة</th>
                  <th className="px-3 py-2 font-semibold">الوثيقة</th>
                </tr>
              </thead>
              <tbody>
                {mySubmissions.map((e) => (
                  <tr key={e.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 font-medium text-brand-dark">
                      {e.kpi?.name ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {e.period_label}
                      {e.period_start && e.period_end && (
                        <span className="block text-[10px] text-slate-400">
                          {e.period_start} ← {e.period_end}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {formatValue(e.value, e.kpi?.unit ?? "")}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={e.status} />
                      {e.status === "rejected" && e.review_note && (
                        <p className="mt-1 text-[11px] text-brand-accent">
                          السبب: {e.review_note}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {e.document_url ? (
                        <button
                          onClick={() => openDoc(e.document_url!)}
                          className="text-xs font-semibold text-brand-primary hover:underline"
                        >
                          عرض
                        </button>
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SubmitRow({
  kpi,
  lastValue,
  year,
  onDone,
}: {
  kpi: Kpi;
  lastValue: number | null;
  year: number;
  onDone: () => void;
}) {
  const supabase = createClient();
  const periods = periodsForFrequency(kpi.frequency, year);
  const initialKey = currentPeriodKey(kpi.frequency) || periods[0]?.key;
  const initial = periods.find((p) => p.key === initialKey) ?? periods[0];
  const [start, setStart] = useState(initial?.start ?? "");
  const [end, setEnd] = useState(initial?.date ?? "");
  const [value, setValue] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // الفترة والمستهدف يُشتقّان تلقائيًا من تاريخ النهاية
  const target = end ? targetForDate(kpi, end) : null;
  const numVal = value === "" ? null : Number(value);
  const st = achievementStatus(numVal, target, kpi.polarity);

  async function submit() {
    if (value === "" || Number.isNaN(Number(value))) {
      notify("أدخل قيمة صحيحة", "error");
      return;
    }
    if (!start || !end) {
      notify("حدّد تاريخ البداية والنهاية", "info");
      return;
    }
    setBusy(true);
    let document_url: string | null = null;
    let document_name: string | null = null;
    if (file) {
      const path = `${kpi.id}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("kpi-docs")
        .upload(path, file);
      if (upErr) {
        setBusy(false);
        notify("تعذّر رفع الوثيقة: " + upErr.message, "error");
        return;
      }
      document_url = path;
      document_name = file.name;
    }
    const res = await submitEntry({
      kpi_id: kpi.id,
      value: Number(value),
      period_label: labelForDate(kpi.frequency, end),
      period_start: start,
      period_end: end,
      note: null,
      document_url,
      document_name,
    });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      setValue("");
      setFile(null);
      setTimeout(() => setDone(false), 2500);
      onDone();
    } else notify(res.error || "خطأ", "error");
  }

  return (
    <tr className="border-b border-slate-100 align-middle last:border-0">
      <td className="px-3 py-2">
        <p className="font-medium text-brand-dark">{kpi.name}</p>
        <p className="text-[11px] text-slate-400">{kpi.dimension?.name}</p>
      </td>
      <td className="px-3 py-2 text-xs text-slate-500">
        {kpi.frequency || "—"}
      </td>
      <td className="px-3 py-2 text-slate-600">
        {lastValue != null ? formatValue(lastValue, kpi.unit) : "—"}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <input
            type="date"
            className="input px-2 py-1.5 text-xs"
            value={start}
            max={end || undefined}
            onChange={(e) => setStart(e.target.value)}
            title="تاريخ البداية"
          />
          <span className="text-slate-300">–</span>
          <input
            type="date"
            className="input px-2 py-1.5 text-xs"
            value={end}
            min={start || undefined}
            onChange={(e) => setEnd(e.target.value)}
            title="تاريخ النهاية"
          />
        </div>
        {end && (
          <p className="mt-1 text-[10px] text-slate-400">
            {labelForDate(kpi.frequency, end)}
          </p>
        )}
      </td>
      <td className="px-3 py-2 font-semibold text-slate-700">
        {target != null ? formatValue(target, kpi.unit) : "—"}
      </td>
      <td className="px-3 py-2">
        <input
          type="number"
          step="any"
          className="input w-28 py-1.5"
          placeholder="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </td>
      <td className="px-3 py-2">
        {st.pct != null ? (
          <span
            className="rounded-md px-2 py-0.5 text-[11px] font-bold"
            style={{ backgroundColor: `${st.color}1a`, color: st.color }}
          >
            {st.pct}% · {st.label}
          </span>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </td>
      <td className="px-3 py-2">
        <input
          type="file"
          className="w-32 text-xs"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </td>
      <td className="px-3 py-2 text-left">
        <button
          onClick={submit}
          disabled={busy}
          className="btn-primary px-3 py-1.5 text-xs"
        >
          {busy ? "…" : done ? "✓ أُرسلت" : "إرسال"}
        </button>
      </td>
    </tr>
  );
}

function PendingRow({
  entry,
  stage,
  onDone,
}: {
  entry: KpiEntry;
  stage: "manager" | "officer";
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const approveLabel = stage === "manager" ? "اعتماد ورفع" : "اعتماد نهائي";
  const rejectLabel = stage === "manager" ? "إعادة للموظف" : "رفض";

  async function approve() {
    setBusy(true);
    const res =
      stage === "manager"
        ? await managerApprove(entry.id)
        : await approveEntry(entry.id);
    setBusy(false);
    if (res.ok) onDone();
    else notify(res.error || "خطأ", "error");
  }
  async function reject() {
    if (!reason.trim()) return;
    setBusy(true);
    const res =
      stage === "manager"
        ? await managerReject(entry.id, reason)
        : await rejectEntry(entry.id, reason);
    setBusy(false);
    if (res.ok) onDone();
    else notify(res.error || "خطأ", "error");
  }

  return (
    <div className="rounded-xl border border-slate-100 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-bold text-brand-dark">
            {entry.kpi?.name ?? "—"}
          </p>
          <p className="text-xs text-slate-400">
            {entry.period_label}
            {entry.period_start && entry.period_end
              ? ` (${entry.period_start} ← ${entry.period_end})`
              : ""}{" "}
            · القيمة: {formatValue(entry.value, entry.kpi?.unit ?? "")}
            {entry.note ? ` · ${entry.note}` : ""}
          </p>
        </div>
        {entry.document_url && (
          <button
            onClick={() => openDoc(entry.document_url!)}
            className="btn-ghost gap-1.5 px-3 py-1.5 text-xs"
          >
            <FileText size={14} /> الوثيقة
          </button>
        )}
        {!rejecting && (
          <>
            <button
              onClick={approve}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <CheckCircle2 size={14} /> {approveLabel}
            </button>
            <button
              onClick={() => setRejecting(true)}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-accent hover:bg-brand-accent/10"
            >
              <XCircle size={14} /> {rejectLabel}
            </button>
          </>
        )}
      </div>
      {rejecting && (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <div className="flex-1">
            <label className="label">سبب الرفض (مبرر)</label>
            <input
              className="input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="اكتب المبرر…"
            />
          </div>
          <button
            onClick={reject}
            disabled={busy || !reason.trim()}
            className="btn-primary"
          >
            تأكيد الرفض
          </button>
          <button onClick={() => setRejecting(false)} className="btn-ghost">
            إلغاء
          </button>
        </div>
      )}
    </div>
  );
}
