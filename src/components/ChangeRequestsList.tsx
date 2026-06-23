"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Clock, Paperclip } from "lucide-react";
import { reviewChange } from "@/app/(app)/change-requests/actions";
import { notify } from "@/components/ui/toast";
import { promptDialog } from "@/components/ui/confirm";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";
import type { ChangeRequest } from "@/lib/data";

type Meta = {
  reason?: string;
  impact?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  field_label?: string | null;
  current_value?: string | null;
  new_value?: string | null;
};

const ENTITY: Record<string, string> = {
  objective: "هدف",
  initiative: "مبادرة",
  kpi: "مؤشر",
  target: "مستهدفات",
};
const ACTION: Record<string, string> = {
  create: "إنشاء",
  update: "تعديل",
  delete: "حذف",
};
const STATUS: Record<string, { label: string; color: string }> = {
  pending_manager: { label: "بانتظار مدير الإدارة", color: "#2563eb" },
  pending_officer: { label: "بانتظار مسؤول القياس", color: "#7c3aed" },
  pending_executive: { label: "بانتظار الرئيس التنفيذي", color: "#D97706" },
  approved: { label: "معتمد", color: "#16a34a" },
  rejected: { label: "مرفوض", color: "#A11249" },
};

function canAct(cr: ChangeRequest, p: Profile): boolean {
  if (cr.status === "pending_manager")
    return (
      p.role === "admin" ||
      (p.role === "owner" && p.org_unit_id === cr.requester_unit_id)
    );
  if (cr.status === "pending_officer") return p.role === "admin";
  if (cr.status === "pending_executive") return p.role === "executive";
  return false;
}

function summary(cr: ChangeRequest): string {
  const p = cr.payload || {};
  const parts: string[] = [];
  if (cr.entity_type === "initiative" && Array.isArray(p.milestones))
    parts.push(`${(p.milestones as unknown[]).length} معالم`);
  if (cr.entity_type === "initiative" && Array.isArray(p.deliverables))
    parts.push(`${(p.deliverables as unknown[]).length} مخرجات`);
  if (typeof p.name === "string") parts.push(p.name);
  return parts.join(" · ");
}

export default function ChangeRequestsList({
  requests,
  profile,
}: {
  requests: ChangeRequest[];
  profile: Profile;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const actionable = useMemo(
    () => requests.filter((r) => canAct(r, profile)),
    [requests, profile]
  );
  const mine = useMemo(
    () => requests.filter((r) => r.requested_by === profile.id),
    [requests, profile]
  );
  const history = requests;

  async function openDoc(path: string) {
    const supabase = createClient();
    const { data } = await supabase.storage
      .from("kpi-docs")
      .createSignedUrl(path, 120);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else notify("تعذّر فتح المرفق", "error");
  }

  async function review(cr: ChangeRequest, decision: "approve" | "reject") {
    let note: string | null = null;
    if (decision === "reject") {
      note = await promptDialog("سبب الرفض/الإعادة:", {
        title: "رفض/إعادة الطلب",
        confirmText: "إرسال",
        danger: true,
        multiline: true,
      });
      if (!note || !note.trim()) return;
    } else {
      note = await promptDialog("ملاحظة الاعتماد (اختياري):", {
        title: "اعتماد الطلب",
        confirmText: "اعتماد",
        multiline: true,
      });
      if (note === null) return; // أُلغي
      note = note.trim() || null;
    }
    startTransition(async () => {
      const res = await reviewChange(cr.id, decision, note);
      if (res.ok) router.refresh();
      else notify(res.error || "خطأ", "error");
    });
  }

  const Card = ({ cr, act }: { cr: ChangeRequest; act: boolean }) => {
    const s = STATUS[cr.status];
    return (
      <div className="card space-y-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-brand-pale/40 px-2 py-0.5 text-[11px] font-bold text-brand-primary">
            {ACTION[cr.action]} {ENTITY[cr.entity_type]}
          </span>
          <span
            className="rounded-md px-2 py-0.5 text-[11px] font-bold"
            style={{ backgroundColor: `${s.color}1a`, color: s.color }}
          >
            {s.label}
          </span>
        </div>
        <h3 className="text-sm font-bold text-brand-dark">{cr.title}</h3>

        {(() => {
          const meta = (cr.payload?.__meta ?? {}) as Meta;
          const extra = summary(cr);
          return (
            <div className="space-y-1.5 text-xs">
              {(meta.current_value || meta.new_value) && (
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  {meta.field_label && (
                    <span className="font-semibold text-slate-500">
                      {meta.field_label}:{" "}
                    </span>
                  )}
                  <span className="text-slate-400 line-through">
                    {meta.current_value || "—"}
                  </span>
                  <span className="mx-1 text-slate-400">←</span>
                  <span className="font-semibold text-brand-dark">
                    {meta.new_value || "—"}
                  </span>
                </div>
              )}
              {extra && <p className="text-slate-500">{extra}</p>}
              {meta.reason && (
                <p className="text-slate-600">
                  <span className="font-semibold">السبب:</span> {meta.reason}
                </p>
              )}
              {meta.impact && (
                <p className="text-slate-600">
                  <span className="font-semibold">الأثر:</span> {meta.impact}
                </p>
              )}
              {meta.attachment_url && (
                <button
                  onClick={() => openDoc(meta.attachment_url!)}
                  className="inline-flex items-center gap-1 font-semibold text-brand-primary hover:underline"
                >
                  <Paperclip size={12} />
                  {meta.attachment_name || "المرفق"}
                </button>
              )}
            </div>
          );
        })()}

        <div className="flex flex-wrap gap-x-4 text-[11px] text-slate-400">
          <span>مُقدِّم الطلب: {cr.requester?.full_name ?? "—"}</span>
          <span>{new Date(cr.created_at).toLocaleDateString("ar")}</span>
          {cr.review_note && <span>ملاحظة المراجعة: {cr.review_note}</span>}
        </div>
        {act && (
          <div className="flex gap-2 border-t border-slate-100 pt-2">
            <button
              onClick={() => review(cr, "approve")}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Check size={14} /> اعتماد
            </button>
            <button
              onClick={() => review(cr, "reject")}
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-accent hover:bg-brand-accent/10"
            >
              <X size={14} /> رفض/إعادة
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-brand-dark">
          <Clock size={16} className="text-brand-primary" />
          بانتظار إجرائي ({actionable.length})
        </h2>
        {actionable.length === 0 ? (
          <div className="card p-8 text-center text-sm text-slate-400">
            لا طلبات بانتظار إجرائك.
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {actionable.map((cr) => (
              <Card key={cr.id} cr={cr} act />
            ))}
          </div>
        )}
      </section>

      {mine.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-bold text-brand-dark">
            طلباتي ({mine.length})
          </h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {mine.map((cr) => (
              <Card key={cr.id} cr={cr} act={false} />
            ))}
          </div>
        </section>
      )}

      {(profile.role === "admin" || profile.role === "executive") && (
        <section>
          <h2 className="mb-3 text-sm font-bold text-brand-dark">
            كل الطلبات ({history.length})
          </h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {history.map((cr) => (
              <Card key={cr.id} cr={cr} act={canAct(cr, profile)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
