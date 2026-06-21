"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Gavel,
  Plus,
  CheckCircle2,
  RotateCcw,
  Trash2,
  CalendarClock,
  UserCircle2,
  ListChecks,
  MessageSquarePlus,
  AtSign,
  Send,
} from "lucide-react";
import type { KpiDecision, KpiDecisionUpdate } from "@/lib/data";
import {
  addDecision,
  addDecisionUpdate,
  toggleDecisionStatus,
  deleteDecision,
} from "@/app/(app)/kpis/[id]/decisions-actions";

export type SimpleUser = { id: string; full_name: string | null };

function fmtDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-GB");
}

function fmtDateTime(d: string | null) {
  if (!d) return null;
  const dt = new Date(d);
  return `${dt.toLocaleDateString("en-GB")} ${dt.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function isOverdue(due: string | null, status: string) {
  if (!due || status === "done") return false;
  const d = new Date(due);
  d.setHours(0, 0, 0, 0);
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return d.getTime() < t.getTime();
}

export default function KpiDecisions({
  kpiId,
  decisions,
  updatesByDecision,
  users,
  canManage,
  myUserId,
}: {
  kpiId: string;
  decisions: KpiDecision[];
  updatesByDecision: Record<string, KpiDecisionUpdate[]>;
  users: SimpleUser[];
  canManage: boolean;
  myUserId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [action, setAction] = useState("");
  const [assignee, setAssignee] = useState("");
  const [due, setDue] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function submit() {
    setErr(null);
    start(async () => {
      const res = await addDecision({
        kpi_id: kpiId,
        body,
        action: action || null,
        assigned_user_id: assignee,
        due_date: due,
      });
      if (!res.ok) {
        setErr(res.error ?? "تعذّر الحفظ");
        return;
      }
      setBody("");
      setAction("");
      setAssignee("");
      setDue("");
      setOpen(false);
      router.refresh();
    });
  }

  const openCount = decisions.filter((d) => d.status === "open").length;

  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-bold text-mushar-dark">
          <Gavel size={18} className="text-mushar-primary" />
          القرارات والملاحظات التنفيذية
          {openCount > 0 && (
            <span className="rounded-full bg-mushar-accent/10 px-2 py-0.5 text-xs font-semibold text-mushar-accent">
              {openCount} قيد المتابعة
            </span>
          )}
        </h3>
        {canManage && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="btn-ghost gap-1.5 text-sm"
          >
            <Plus size={16} />
            قرار جديد
          </button>
        )}
      </div>

      {canManage && open && (
        <div className="mb-5 space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              نص القرار / الملاحظة
            </label>
            <textarea
              className="input min-h-[80px]"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="مثال: الأداء دون المستهدف للربع الثاني، نطلب خطة تصحيحية خلال أسبوعين."
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              الإجراء المطلوب (اختياري)
            </label>
            <input
              className="input"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="مثال: إعداد خطة تصحيحية ورفعها"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                المسؤول عن المتابعة <span className="text-mushar-accent">*</span>
              </label>
              <select
                className="input"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              >
                <option value="">— اختر الشخص —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || "مستخدم"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                تاريخ الاستحقاق <span className="text-mushar-accent">*</span>
              </label>
              <input
                type="date"
                className="input"
                value={due}
                onChange={(e) => setDue(e.target.value)}
              />
            </div>
          </div>
          {err && <p className="text-sm font-medium text-mushar-accent">{err}</p>}
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={pending}
              className="btn-primary disabled:opacity-50"
            >
              حفظ القرار
            </button>
            <button onClick={() => setOpen(false)} className="btn-ghost text-sm">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {decisions.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">
          لا توجد قرارات أو ملاحظات تنفيذية على هذا المؤشر بعد
        </p>
      ) : (
        <div className="space-y-3">
          {decisions.map((d) => (
            <DecisionItem
              key={d.id}
              kpiId={kpiId}
              decision={d}
              updates={updatesByDecision[d.id] ?? []}
              users={users}
              canManage={canManage}
              canFollow={canManage || d.assigned_user_id === myUserId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DecisionItem({
  kpiId,
  decision: d,
  updates,
  users,
  canManage,
  canFollow,
}: {
  kpiId: string;
  decision: KpiDecision;
  updates: KpiDecisionUpdate[];
  users: SimpleUser[];
  canManage: boolean;
  canFollow: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState("");
  const [mention, setMention] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const overdue = isOverdue(d.due_date, d.status);
  const done = d.status === "done";

  function toggle() {
    start(async () => {
      await toggleDecisionStatus(d.id, kpiId, done ? "open" : "done");
      router.refresh();
    });
  }
  function remove() {
    if (!confirm("حذف هذا القرار وكل تحديثاته؟")) return;
    start(async () => {
      await deleteDecision(d.id, kpiId);
      router.refresh();
    });
  }
  function postUpdate() {
    setErr(null);
    start(async () => {
      const res = await addDecisionUpdate({
        decision_id: d.id,
        kpi_id: kpiId,
        body: text,
        mention_user_id: mention || null,
      });
      if (!res.ok) {
        setErr(res.error ?? "تعذّر الإضافة");
        return;
      }
      setText("");
      setMention("");
      setShowForm(false);
      router.refresh();
    });
  }

  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        done
          ? "border-slate-100 bg-slate-50/50"
          : overdue
          ? "border-mushar-accent/40 bg-mushar-accent/5"
          : "border-mushar-pale/60 bg-mushar-pale/10"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p
            className={`text-sm font-medium ${
              done ? "text-slate-400 line-through" : "text-mushar-dark"
            }`}
          >
            {d.body}
          </p>
          {d.action && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
              <ListChecks size={13} className="text-mushar-primary" />
              <span className="font-semibold">الإجراء:</span> {d.action}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
            {d.assignee?.full_name && (
              <span className="flex items-center gap-1 font-semibold text-slate-500">
                <UserCircle2 size={13} />
                {d.assignee.full_name}
              </span>
            )}
            {d.due_date && (
              <span
                className={`flex items-center gap-1 ${
                  overdue ? "font-semibold text-mushar-accent" : ""
                }`}
              >
                <CalendarClock size={12} />
                {overdue ? "تأخّر: " : "استحقاق: "}
                {fmtDate(d.due_date)}
              </span>
            )}
            {d.author?.full_name && <span>أصدره: {d.author.full_name}</span>}
            <span>{fmtDate(d.created_at)}</span>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            done
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {done ? "مكتمل" : "قيد المتابعة"}
        </span>
      </div>

      {/* سجل التحديثات/المتابعات */}
      {updates.length > 0 && (
        <div className="mt-3 space-y-2 border-r-2 border-slate-100 pr-3">
          {updates.map((u) => (
            <div key={u.id} className="text-xs">
              <p className="text-slate-600">{u.body}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] text-slate-400">
                {u.author?.full_name && <span>{u.author.full_name}</span>}
                <span>{fmtDateTime(u.created_at)}</span>
                {u.mention?.full_name && (
                  <span className="flex items-center gap-0.5 text-mushar-primary">
                    <AtSign size={10} />
                    {u.mention.full_name}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* نموذج إضافة تحديث */}
      {canFollow && showForm && (
        <div className="mt-3 space-y-2 rounded-lg bg-white/70 p-3">
          <textarea
            className="input min-h-[60px] text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="اكتب تحديث المتابعة / ما تم إنجازه…"
          />
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <AtSign size={13} />
              <select
                className="input w-auto py-1.5 text-xs"
                value={mention}
                onChange={(e) => setMention(e.target.value)}
              >
                <option value="">إشعار شخص (اختياري)</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name || "مستخدم"}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={postUpdate}
              disabled={pending}
              className="btn-primary gap-1.5 px-3 py-1.5 text-xs disabled:opacity-50"
            >
              <Send size={13} />
              إرسال
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="btn-ghost px-3 py-1.5 text-xs"
            >
              إلغاء
            </button>
          </div>
          {err && <p className="text-xs font-medium text-mushar-accent">{err}</p>}
        </div>
      )}

      {/* أزرار الإجراءات */}
      <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-2">
        {canFollow && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            disabled={pending}
            className="inline-flex items-center gap-1 text-xs font-semibold text-mushar-primary hover:underline disabled:opacity-50"
          >
            <MessageSquarePlus size={13} /> إضافة تحديث
          </button>
        )}
        {canFollow && (
          <button
            onClick={toggle}
            disabled={pending}
            className="inline-flex items-center gap-1 text-xs font-semibold text-mushar-primary hover:underline disabled:opacity-50"
          >
            {done ? (
              <>
                <RotateCcw size={13} /> إعادة فتح
              </>
            ) : (
              <>
                <CheckCircle2 size={13} /> تحديد كمكتمل
              </>
            )}
          </button>
        )}
        {canManage && (
          <button
            onClick={remove}
            disabled={pending}
            className="inline-flex items-center gap-1 text-xs font-semibold text-mushar-accent hover:underline disabled:opacity-50"
          >
            <Trash2 size={13} /> حذف
          </button>
        )}
      </div>
    </div>
  );
}
