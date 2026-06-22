"use client";

import { useMemo, useState, useTransition } from "react";
import FilterSelect from "@/components/ui/FilterSelect";
import { useRouter } from "next/navigation";
import {
  Target,
  Flag,
  PackageCheck,
  AlertTriangle,
  MessageSquare,
  CheckCircle2,
  Paperclip,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { notify } from "@/components/ui/toast";
import {
  setMilestoneProgress,
  toggleDeliverable,
  setDeliverableDoc,
  addInitiativeUpdate,
  deleteInitiativeUpdate,
  setUpdateResolved,
  addUpdateReply,
  deleteUpdateReply,
} from "@/app/(app)/initiatives/actions";
import { submitChange } from "@/app/(app)/change-requests/actions";
import {
  computeAutoStatus,
  AUTO_STATUS,
  achievedWeight,
  SEVERITY,
  type Severity,
} from "@/lib/initiative-status";
import GanttChart, { type GanttRow } from "@/components/GanttChart";
import type { KpiInitiative, KpiInitiativeProgressUpdate } from "@/lib/data";

function dt(s: string) {
  return new Date(s).toLocaleString("ar", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type MentionUser = { id: string; full_name: string | null };

function MentionBox({
  value,
  onChange,
  onMention,
  users,
  placeholder,
  multiline,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  onMention: (id: string) => void;
  users: MentionUser[];
  placeholder?: string;
  multiline?: boolean;
  onEnter?: () => void;
}) {
  const [q, setQ] = useState<string | null>(null);

  function handle(val: string) {
    onChange(val);
    const m = val.match(/@([^\s@]*)$/);
    setQ(m ? m[1] : null);
  }
  const matches =
    q !== null
      ? users
          .filter((u) => (u.full_name ?? "").includes(q) && u.full_name)
          .slice(0, 6)
      : [];

  function pick(u: MentionUser) {
    onChange(value.replace(/@([^\s@]*)$/, `@${u.full_name} `));
    onMention(u.id);
    setQ(null);
  }

  return (
    <div className="relative flex-1">
      {multiline ? (
        <textarea
          className="input min-h-[50px] text-xs"
          placeholder={placeholder}
          value={value}
          onChange={(e) => handle(e.target.value)}
        />
      ) : (
        <input
          className="input py-1.5 text-xs"
          placeholder={placeholder}
          value={value}
          onChange={(e) => handle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && matches.length === 0 && onEnter) onEnter();
          }}
        />
      )}
      {matches.length > 0 && (
        <div className="absolute z-30 mt-1 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {matches.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => pick(u)}
              className="block w-full px-3 py-2 text-right text-xs hover:bg-mushar-pale/40"
            >
              @{u.full_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MilestoneGantt({ milestones }: { milestones: NonNullable<KpiInitiative["milestones"]> }) {
  const rows: GanttRow[] = milestones
    .filter((m) => m.start_date && m.due_date)
    .map((m) => ({
      id: m.id,
      title: m.title,
      start: +new Date(m.start_date!),
      due: +new Date(m.due_date!),
      progress: m.progress ?? 0,
      color:
        AUTO_STATUS[
          computeAutoStatus({
            done: (m.progress ?? 0) >= 100,
            start_date: m.start_date,
            due_date: m.due_date,
          })
        ].color,
    }));
  if (rows.length === 0)
    return (
      <p className="text-xs text-slate-400">لا تواريخ كافية في المعالم لعرض المخطط.</p>
    );
  return <GanttChart rows={rows} />;
}

export default function InitiativeFollowUp({
  initiatives,
  canManage,
  users,
}: {
  initiatives: KpiInitiative[];
  canManage: boolean;
  users: MentionUser[];
}) {
  if (initiatives.length === 0)
    return (
      <div className="card p-12 text-center text-sm text-slate-400">
        لا توجد مبادرات معتمدة للمتابعة بعد.
      </div>
    );
  return (
    <div className="space-y-4">
      {initiatives.map((i) => (
        <FollowCard key={i.id} i={i} canManage={canManage} users={users} />
      ))}
    </div>
  );
}

function FollowCard({
  i,
  canManage,
  users,
}: {
  i: KpiInitiative;
  canManage: boolean;
  users: MentionUser[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [noteMentions, setNoteMentions] = useState<string[]>([]);
  const [severity, setSeverity] = useState<Severity>("medium");
  const [showComplete, setShowComplete] = useState(false);
  const [lessons, setLessons] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const milestones = i.milestones ?? [];
  const deliverables = i.deliverables ?? [];
  const updates = i.updates ?? [];
  const doneWeight = achievedWeight(milestones);
  const allDone = milestones.length > 0 && milestones.every((m) => (m.progress ?? 0) >= 100);
  const completed = !!i.completed_at;
  const status = AUTO_STATUS[
    computeAutoStatus({
      done: completed || allDone || doneWeight === 100,
      start_date: i.start_date,
      due_date: i.due_date,
    })
  ];

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) router.refresh();
      else notify(res.error || "خطأ", "error");
    });
  }

  function addNote(kind: "update" | "challenge") {
    if (!note.trim()) return;
    run(async () => {
      const res = await addInitiativeUpdate({
        initiative_id: i.id,
        kind,
        body: note,
        severity: kind === "challenge" ? severity : null,
        mention_user_ids: noteMentions,
      });
      if (res.ok) {
        setNote("");
        setNoteMentions([]);
      }
      return res;
    });
  }

  async function requestCompletion() {
    if (!lessons.trim()) return notify("اكتب الدروس المستفادة.", "error");
    if (!file) return notify("رفع وثيقة الإغلاق إلزامي.", "error");
    setBusy(true);
    const path = `change-requests/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("kpi-docs").upload(path, file);
    if (upErr) {
      setBusy(false);
      return notify("تعذّر رفع الوثيقة: " + upErr.message, "error");
    }
    const res = await submitChange({
      entity_type: "initiative",
      action: "update",
      entity_id: i.id,
      title: `طلب اكتمال المبادرة: ${i.title}`,
      payload: {
        mark_complete: "1",
        lessons_learned: lessons.trim(),
        completion_doc_url: path,
        completion_doc_name: file.name,
        __meta: {
          reason: "طلب اعتماد اكتمال المبادرة",
          attachment_url: path,
          attachment_name: file.name,
          new_value: "اكتمال المبادرة",
        },
      },
    });
    setBusy(false);
    if (res.ok) {
      setShowComplete(false);
      setLessons("");
      setFile(null);
      notify("تم رفع طلب اكتمال المبادرة للاعتماد.", "success");
      router.refresh();
    } else notify(res.error || "خطأ", "error");
  }

  async function openDoc(path: string) {
    const { data } = await supabase.storage.from("kpi-docs").createSignedUrl(path, 120);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  return (
    <div id={i.id} className="card space-y-4 scroll-mt-24 p-5">
      {/* رأس */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          {i.objective && (
            <span className="inline-flex items-center gap-1 rounded-md bg-mushar-pale/40 px-2 py-0.5 text-[11px] font-semibold text-mushar-primary">
              <Target size={12} /> {i.objective.name}
            </span>
          )}
          <h3 className="text-sm font-bold text-mushar-dark">{i.title}</h3>
          <p className="text-[11px] text-slate-400">
            {i.owner_unit?.name ?? "—"} · {i.owner?.full_name ?? "—"}
            {i.start_year ? ` · بداية ${i.start_year}` : ""}
          </p>
        </div>
        <span
          className="rounded-md px-2 py-0.5 text-[11px] font-bold"
          style={{ backgroundColor: `${status.color}1a`, color: status.color }}
        >
          {completed ? "مكتملة (معتمدة)" : status.label}
        </span>
      </div>

      {/* الإنجاز */}
      <div>
        <div className="mb-1 flex justify-between text-[11px] text-slate-400">
          <span>الإنجاز الموزون</span>
          <span>{doneWeight}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full" style={{ width: `${Math.min(doneWeight, 100)}%`, backgroundColor: status.color }} />
        </div>
      </div>

      {/* جانت */}
      <div>
        <h4 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-mushar-dark">
          <Flag size={14} className="text-mushar-primary" /> مخطط جانت للمعالم
        </h4>
        <MilestoneGantt milestones={milestones} />
      </div>

      {/* تحديث الإنجاز عبر المعالم (نسبة 0–100% لكل معلم) */}
      {canManage && !completed && (
        <div>
          <h4 className="mb-2 text-sm font-bold text-mushar-dark">
            تحديث نسبة إنجاز المعالم
          </h4>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {milestones.map((m) => (
              <MilestoneProgressRow key={m.id} id={m.id} title={m.title} weight={m.weight} progress={m.progress ?? 0} onSaved={() => router.refresh()} />
            ))}
          </div>
        </div>
      )}

      {/* المخرجات */}
      {deliverables.length > 0 && (
        <div>
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-mushar-dark">
            <PackageCheck size={14} className="text-mushar-primary" /> المخرجات (
            {deliverables.filter((d) => d.done).length}/{deliverables.length})
          </h4>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {deliverables.map((d) => (
              <DeliverableRow
                key={d.id}
                d={d}
                canManage={canManage}
                completed={completed}
                onChange={() => router.refresh()}
              />
            ))}
          </div>
        </div>
      )}

      {/* التحديات والتحديثات */}
      <div>
        <h4 className="mb-2 flex items-center gap-1.5 text-sm font-bold text-mushar-dark">
          <MessageSquare size={14} className="text-mushar-primary" /> التحديثات والتحديات
        </h4>

        {/* صندوق الإضافة في الأعلى */}
        {canManage && !completed && (
          <div className="mb-3 space-y-2 rounded-xl border border-dashed border-slate-200 p-3">
            <MentionBox
              value={note}
              onChange={setNote}
              onMention={(id) => setNoteMentions((s) => [...s, id])}
              users={users}
              placeholder="اكتب تحديثًا أو تحديًا… استخدم @ للإشارة لشخص"
              multiline
            />
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => addNote("update")} className="btn-ghost py-1.5 text-xs">
                + تحديث
              </button>
              <span className="mx-1 h-5 w-px bg-slate-200" />
              <label className="text-[11px] text-slate-500">خطورة التحدّي:</label>
              <div className="w-28">
                <FilterSelect
                  className="w-full"
                  value={severity ?? ""}
                  onValueChange={(v) => setSeverity(v as Severity)}
                  options={(Object.keys(SEVERITY) as Severity[]).map((s) => ({
                    value: s,
                    label: SEVERITY[s].label,
                  }))}
                />
              </div>
              <button
                onClick={() => addNote("challenge")}
                className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
              >
                + تسجيل تحدٍّ
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {updates.map((u) => (
            <UpdateItem
              key={u.id}
              u={u}
              canManage={canManage}
              users={users}
              onChange={() => router.refresh()}
            />
          ))}
          {updates.length === 0 && <p className="text-xs text-slate-400">لا تحديثات بعد.</p>}
        </div>
      </div>

      {/* الإغلاق */}
      <div className="border-t border-slate-100 pt-3">
        {completed ? (
          <div className="space-y-1 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
            <p className="flex items-center gap-1 font-bold">
              <CheckCircle2 size={14} /> مبادرة مكتملة ومعتمدة
            </p>
            {i.lessons_learned && (
              <p>
                <span className="font-semibold">الدروس المستفادة:</span> {i.lessons_learned}
              </p>
            )}
            {i.completion_doc_url && (
              <button
                onClick={() => openDoc(i.completion_doc_url!)}
                className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
              >
                <Paperclip size={12} /> {i.completion_doc_name || "وثيقة الإغلاق"}
              </button>
            )}
          </div>
        ) : canManage ? (
          showComplete ? (
            <div className="space-y-3 rounded-lg border border-emerald-200 p-3">
              <h4 className="text-sm font-bold text-mushar-dark">طلب اكتمال المبادرة</h4>
              <p className="text-[11px] text-slate-500">
                يُرفع للاعتماد عبر السلسلة. الوثيقة والدروس المستفادة إلزامية.
              </p>
              <div>
                <label className="label">الدروس المستفادة *</label>
                <textarea
                  className="input min-h-[70px]"
                  value={lessons}
                  onChange={(e) => setLessons(e.target.value)}
                />
              </div>
              <div>
                <label className="label">وثيقة الإغلاق *</label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm text-slate-500 file:ml-3 file:rounded-lg file:border-0 file:bg-mushar-pale/50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-mushar-primary"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowComplete(false)} className="btn-ghost">إلغاء</button>
                <button onClick={requestCompletion} disabled={busy} className="btn-primary disabled:opacity-50">
                  {busy ? "جارٍ الرفع…" : "رفع طلب الاكتمال"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowComplete(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <CheckCircle2 size={15} /> طلب اكتمال المبادرة
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}

function MilestoneProgressRow({
  id,
  title,
  weight,
  progress,
  onSaved,
}: {
  id: string;
  title: string;
  weight: number;
  progress: number;
  onSaved: () => void;
}) {
  const [val, setVal] = useState(String(progress));
  const [, startTransition] = useTransition();
  const done = (progress ?? 0) >= 100;

  function commit() {
    const n = Math.max(0, Math.min(100, Math.round(Number(val) || 0)));
    setVal(String(n));
    if (n === progress) return;
    startTransition(async () => {
      const res = await setMilestoneProgress(id, n);
      if (res.ok) onSaved();
      else notify(res.error || "خطأ", "error");
    });
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
      <span className={`flex-1 truncate ${done ? "text-emerald-700" : "text-mushar-dark"}`} title={title}>
        {title} <span className="text-slate-400">· وزن {weight}%</span>
      </span>
      <input
        type="number"
        min={0}
        max={100}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="input w-16 py-1 text-center text-xs"
      />
      <span className="text-slate-400">%</span>
    </div>
  );
}

function UpdateItem({
  u,
  canManage,
  users,
  onChange,
}: {
  u: KpiInitiativeProgressUpdate;
  canManage: boolean;
  users: MentionUser[];
  onChange: () => void;
}) {
  const [, startTransition] = useTransition();
  const [reply, setReply] = useState("");
  const [replyMentions, setReplyMentions] = useState<string[]>([]);
  const [showReply, setShowReply] = useState(false);
  const replies = u.replies ?? [];
  const isChallenge = u.kind === "challenge";

  function act(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) onChange();
      else notify(res.error || "خطأ", "error");
    });
  }

  function sendReply() {
    if (!reply.trim()) return;
    act(async () => {
      const res = await addUpdateReply({
        update_id: u.id,
        body: reply,
        mention_user_ids: replyMentions,
      });
      if (res.ok) {
        setReply("");
        setReplyMentions([]);
        setShowReply(false);
      }
      return res;
    });
  }

  return (
    <div
      className={`rounded-lg border px-3 py-2 text-xs ${
        u.resolved ? "border-emerald-200 bg-emerald-50/50" : isChallenge ? "border-amber-200 bg-amber-50/40" : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex items-start gap-2">
        {isChallenge ? (
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
        ) : (
          <MessageSquare size={14} className="mt-0.5 shrink-0 text-slate-400" />
        )}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
              {isChallenge ? "تحدٍّ" : "تحديث"}
            </span>
            {isChallenge && u.severity && (
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-bold"
                style={{
                  backgroundColor: `${SEVERITY[u.severity].color}1a`,
                  color: SEVERITY[u.severity].color,
                }}
              >
                {SEVERITY[u.severity].label}
              </span>
            )}
            {u.resolved && (
              <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                <CheckCircle2 size={11} /> مكتمل
              </span>
            )}
          </div>
          <p className={`mt-1 ${u.resolved ? "text-slate-500 line-through" : "text-mushar-dark"}`}>
            {u.body}
          </p>
          <p className="text-[10px] text-slate-400">
            {u.author?.full_name ?? "—"} · {dt(u.created_at)}
          </p>
        </div>
      </div>

      {/* الردود/التحديثات المتسلسلة */}
      {replies.length > 0 && (
        <div className="mt-2 space-y-1.5 border-r-2 border-slate-200 pr-3">
          {replies.map((r) => (
            <div key={r.id} className="text-[11px]">
              <p className="text-slate-700">{r.body}</p>
              <p className="flex items-center gap-2 text-[10px] text-slate-400">
                <span>
                  {r.author?.full_name ?? "—"} · {dt(r.created_at)}
                </span>
                {canManage && (
                  <button
                    onClick={() => act(() => deleteUpdateReply(r.id))}
                    className="text-mushar-accent hover:underline"
                  >
                    حذف
                  </button>
                )}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* أزرار */}
      {canManage && (
        <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-2 text-[11px]">
          <button
            onClick={() => setShowReply((v) => !v)}
            className="font-semibold text-mushar-primary hover:underline"
          >
            رد/تحديث
          </button>
          <button
            onClick={() => act(() => setUpdateResolved(u.id, !u.resolved))}
            className="font-semibold text-emerald-700 hover:underline"
          >
            {u.resolved ? "إعادة فتح" : "إكمال/إغلاق"}
          </button>
          <button
            onClick={() => act(() => deleteInitiativeUpdate(u.id))}
            className="mr-auto text-mushar-accent hover:underline"
          >
            حذف
          </button>
        </div>
      )}

      {showReply && canManage && (
        <div className="mt-2 flex gap-2">
          <MentionBox
            value={reply}
            onChange={setReply}
            onMention={(id) => setReplyMentions((s) => [...s, id])}
            users={users}
            placeholder="اكتب رداً… استخدم @ للإشارة"
            onEnter={sendReply}
          />
          <button onClick={sendReply} className="btn-primary shrink-0 py-1.5 text-xs">
            إرسال
          </button>
        </div>
      )}
    </div>
  );
}

function DeliverableRow({
  d,
  canManage,
  completed,
  onChange,
}: {
  d: NonNullable<KpiInitiative["deliverables"]>[number];
  canManage: boolean;
  completed: boolean;
  onChange: () => void;
}) {
  const supabase = createClient();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  function act(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) onChange();
      else notify(res.error || "خطأ", "error");
    });
  }

  async function attach(file: File) {
    setBusy(true);
    const path = `deliverables/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("kpi-docs").upload(path, file);
    if (error) {
      setBusy(false);
      notify("تعذّر رفع الوثيقة: " + error.message, "error");
      return;
    }
    const res = await setDeliverableDoc({ id: d.id, doc_url: path, doc_name: file.name });
    setBusy(false);
    if (res.ok) onChange();
    else notify(res.error || "خطأ", "error");
  }

  async function openDoc() {
    if (!d.doc_url) return;
    const { data } = await supabase.storage.from("kpi-docs").createSignedUrl(d.doc_url, 120);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
      <input
        type="checkbox"
        checked={d.done}
        disabled={!canManage || completed}
        onChange={(e) => act(() => toggleDeliverable(d.id, e.target.checked))}
        className="h-4 w-4 accent-emerald-600"
      />
      <span className={`flex-1 ${d.done ? "text-emerald-700 line-through" : "text-mushar-dark"}`}>
        {d.title}
      </span>
      {d.doc_url ? (
        <button onClick={openDoc} className="inline-flex items-center gap-1 font-semibold text-mushar-primary hover:underline">
          <Paperclip size={12} /> {d.doc_name ? "الوثيقة" : "عرض"}
        </button>
      ) : canManage && !completed ? (
        <label className="cursor-pointer font-semibold text-mushar-primary hover:underline">
          {busy ? "جارٍ…" : "إرفاق وثيقة"}
          <input
            type="file"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && attach(e.target.files[0])}
          />
        </label>
      ) : null}
      {d.doc_url && canManage && !completed && (
        <button
          onClick={() => act(() => setDeliverableDoc({ id: d.id, doc_url: null, doc_name: null }))}
          className="text-mushar-accent hover:underline"
        >
          إزالة
        </button>
      )}
    </div>
  );
}
