"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Plus,
  Trash2,
  Users,
  Building2,
  Flag,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Paperclip,
  X,
  Tag,
  ClipboardList,
  Clock,
  Settings2,
  ChevronDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { notify } from "@/components/ui/toast";
import { confirmDialog } from "@/components/ui/confirm";
import FilterSelect from "@/components/ui/FilterSelect";
import SearchableSelect from "@/components/ui/SearchableSelect";
import {
  computeRecStatus,
  REC_STATUS,
  type RecStatus,
} from "@/lib/recommendation-status";
import {
  createMeeting,
  deleteMeeting,
  addRecommendation,
  deleteRecommendation,
  requestClosure,
  reviewClosure,
  addRecUpdate,
  deleteRecUpdate,
  setRecUpdateResolved,
  addRecReply,
  deleteRecReply,
  addDomain,
  renameDomain,
  toggleDomain,
} from "@/app/(app)/meetings/actions";
import type {
  Meeting,
  MeetingRecommendation,
  RecommendationDomain,
  RecommendationUpdate,
} from "@/lib/data";

export const MEETING_TYPES = [
  "مجلس النظارة",
  "اللجنة التنفيذية",
  "مجلس المديرين",
  "الإدارة التنفيذية",
] as const;

const PRIORITY: Record<
  "low" | "medium" | "high" | "critical",
  { label: string; color: string }
> = {
  low: { label: "منخفضة", color: "#64748B" },
  medium: { label: "متوسطة", color: "#2563EB" },
  high: { label: "عالية", color: "#F97316" },
  critical: { label: "حرجة", color: "#DC2626" },
};

const SEVERITY: Record<"low" | "medium" | "high" | "critical", { label: string; color: string }> = {
  low: { label: "منخفضة", color: "#64748B" },
  medium: { label: "متوسطة", color: "#EAB308" },
  high: { label: "عالية", color: "#F97316" },
  critical: { label: "حرجة", color: "#DC2626" },
};

type SimpleUnit = { id: string; name: string };
type MentionUser = { id: string; full_name: string | null };

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB");
}
function dt(s: string) {
  return new Date(s).toLocaleString("ar", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function recStatusOf(r: MeetingRecommendation): RecStatus {
  return computeRecStatus({
    closed: r.closure_status === "closed",
    due_date: r.due_date,
  });
}

/** عرض الحضور: يحاول قراءة JSON [{name,title}] ويتراجع للنص الخام للبيانات القديمة */
function AttendeesView({ raw }: { raw: string }) {
  let list: { name: string; title: string }[] | null = null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) list = parsed;
  } catch {
    list = null;
  }
  return (
    <div className="text-xs text-slate-500">
      <p className="mb-1 flex items-center gap-1 font-semibold text-slate-500">
        <Users size={12} className="text-slate-400" /> الحضور
      </p>
      {list && list.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {list.map((a, i) => (
            <div
              key={i}
              className="flex items-center gap-2 border-b border-slate-100 px-3 py-1.5 last:border-b-0"
            >
              <span className="flex-1 font-semibold text-mushar-dark">{a.name}</span>
              <span className="flex-1 text-slate-500">{a.title}</span>
            </div>
          ))}
        </div>
      ) : (
        <p>{raw}</p>
      )}
    </div>
  );
}

export default function MeetingsManager({
  meetings,
  domains,
  orgUnits,
  users,
  profile,
  canManage,
  canReview,
}: {
  meetings: Meeting[];
  domains: RecommendationDomain[];
  orgUnits: SimpleUnit[];
  users: MentionUser[];
  profile: { id: string; role: string };
  canManage: boolean;
  canReview: boolean;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // إحصاءات لوحة المتابعة
  const allRecs = useMemo(
    () => meetings.flatMap((m) => m.recommendations ?? []),
    [meetings]
  );
  const stats = useMemo(() => {
    let done = 0,
      late = 0,
      stalled = 0,
      pending = 0;
    for (const r of allRecs) {
      if (r.closure_status === "pending") pending++;
      const s = recStatusOf(r);
      if (s === "done") done++;
      else if (s === "late") late++;
      else if (s === "stalled") stalled++;
    }
    return { done, late, stalled, pending, total: allRecs.length };
  }, [allRecs]);

  // تجميع حسب دورة التقييم (سنة)
  const groups = useMemo(() => {
    const map = new Map<string, Meeting[]>();
    for (const m of meetings) {
      const key = m.cycle || "غير محدّد";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(m);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [meetings]);

  const activeDomains = domains.filter((d) => d.is_active);

  return (
    <div className="space-y-6">
      {/* لوحة المتابعة */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard icon={CalendarDays} label="عدد الاجتماعات" value={meetings.length} color="#0D9488" />
        <StatCard icon={ClipboardList} label="إجمالي التوصيات" value={stats.total} color="#2563EB" />
        <StatCard icon={CheckCircle2} label="منفّذة" value={stats.done} color={REC_STATUS.done.color} />
        <StatCard icon={Clock} label="متأخرة" value={stats.late} color={REC_STATUS.late.color} />
        <StatCard icon={AlertTriangle} label="متعثّرة" value={stats.stalled} color={REC_STATUS.stalled.color} />
      </div>

      {/* أدوات */}
      {canManage && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="btn-primary inline-flex items-center gap-1.5"
          >
            <Plus size={16} /> إنشاء اجتماع جديد
          </button>
          {canReview && (
            <button
              onClick={() => setShowSettings((v) => !v)}
              className="btn-ghost inline-flex items-center gap-1.5"
            >
              <Settings2 size={15} /> مجالات التوصيات
            </button>
          )}
        </div>
      )}

      {showSettings && canReview && (
        <DomainSettings domains={domains} />
      )}

      {showCreate && canManage && (
        <CreateMeetingForm
          domains={activeDomains}
          orgUnits={orgUnits}
          users={users}
          onDone={() => setShowCreate(false)}
        />
      )}

      {/* قائمة الاجتماعات مجمّعة حسب الدورة */}
      {meetings.length === 0 ? (
        <div className="card p-12 text-center text-sm text-slate-400">
          لا توجد اجتماعات بعد.
        </div>
      ) : (
        groups.map(([cycle, list]) => (
          <section key={cycle} className="space-y-3">
            <h2 className="flex items-center gap-2 text-base font-bold text-mushar-dark">
              <CalendarDays size={18} className="text-mushar-primary" />
              دورة التقييم {cycle}
              <span className="text-xs font-normal text-slate-400">
                ({list.length} اجتماع)
              </span>
            </h2>
            {list.map((m) => (
              <MeetingCard
                key={m.id}
                meeting={m}
                domains={activeDomains}
                orgUnits={orgUnits}
                users={users}
                profile={profile}
                canManage={canManage}
                canReview={canReview}
              />
            ))}
          </section>
        ))
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${color}1a`, color }}
      >
        <Icon size={20} />
      </span>
      <div className="min-w-0">
        <p className="text-xl font-bold text-mushar-dark">{value}</p>
        <p className="truncate text-[11px] text-slate-400">{label}</p>
      </div>
    </div>
  );
}

// ===== إنشاء اجتماع =====
type RecDraft = {
  name: string;
  description: string;
  domain_id: string;
  owner_unit_id: string;
  owner_user_id: string;
  due_date: string;
  priority: "low" | "medium" | "high" | "critical";
  participant_unit_ids: string[];
};

function emptyRec(): RecDraft {
  return {
    name: "",
    description: "",
    domain_id: "",
    owner_unit_id: "",
    owner_user_id: "",
    due_date: "",
    priority: "medium",
    participant_unit_ids: [],
  };
}

function CreateMeetingForm({
  domains,
  orgUnits,
  users,
  onDone,
}: {
  domains: RecommendationDomain[];
  orgUnits: SimpleUnit[];
  users: MentionUser[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [attendees, setAttendees] = useState<{ name: string; title: string }[]>([
    { name: "", title: "" },
  ]);
  const [minutes, setMinutes] = useState("");
  const [recs, setRecs] = useState<RecDraft[]>([]);
  const [draft, setDraft] = useState<RecDraft>(emptyRec());

  function patchDraft(p: Partial<RecDraft>) {
    setDraft((s) => ({ ...s, ...p }));
  }
  function patchAttendee(i: number, p: Partial<{ name: string; title: string }>) {
    setAttendees((s) => s.map((a, idx) => (idx === i ? { ...a, ...p } : a)));
  }
  function toggleParticipant(id: string) {
    setDraft((s) => ({
      ...s,
      participant_unit_ids: s.participant_unit_ids.includes(id)
        ? s.participant_unit_ids.filter((x) => x !== id)
        : [...s.participant_unit_ids, id],
    }));
  }
  function addToList() {
    if (!draft.name.trim()) return notify("اكتب اسم التوصية", "error");
    if (!draft.description.trim()) return notify("اكتب وصف التوصية", "error");
    if (!draft.domain_id) return notify("اختر مجال التوصية", "error");
    if (!draft.owner_unit_id) return notify("اختر الإدارة المسؤولة", "error");
    if (!draft.owner_user_id) return notify("اختر المسؤول", "error");
    if (!draft.due_date) return notify("حدّد تاريخ الاستحقاق", "error");
    if (draft.participant_unit_ids.length === 0)
      return notify("اختر إدارة مشاركة واحدة على الأقل", "error");
    setRecs((s) => [...s, draft]);
    setDraft(emptyRec());
  }

  function submit() {
    if (!type) return notify("اختر نوع الاجتماع", "error");
    if (!date) return notify("حدّد تاريخ المحضر", "error");
    if (!title.trim()) return notify("اكتب عنوان الاجتماع", "error");
    const cleanAtt = attendees.filter((a) => a.name.trim() && a.title.trim());
    if (cleanAtt.length === 0)
      return notify("أضف الحضور (الاسم والمنصب)", "error");
    if (!minutes.trim()) return notify("اكتب محضر الاجتماع", "error");
    if (recs.length === 0)
      return notify("أضف توصية واحدة على الأقل عبر «إضافة للقائمة»", "error");
    setBusy(true);
    startTransition(async () => {
      const res = await createMeeting({
        type,
        title,
        meeting_date: date,
        committee: null,
        attendees: JSON.stringify(cleanAtt),
        minutes,
        recommendations: recs
          .filter((r) => r.name.trim())
          .map((r) => ({
            name: r.name,
            description: r.description || null,
            domain_id: r.domain_id || null,
            owner_unit_id: r.owner_unit_id || null,
            owner_user_id: r.owner_user_id || null,
            due_date: r.due_date || null,
            priority: r.priority,
            participant_unit_ids: r.participant_unit_ids,
          })),
      });
      setBusy(false);
      if (res.ok) {
        notify("تم إنشاء الاجتماع", "success");
        onDone();
        router.refresh();
      } else notify(res.error || "خطأ", "error");
    });
  }

  return (
    <div className="card space-y-5 p-5">
      {/* بيانات الاجتماع */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-mushar-dark">بيانات الاجتماع</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">نوع الاجتماع *</label>
            <FilterSelect
              className="w-full"
              value={type}
              onValueChange={setType}
              options={[
                { value: "", label: "— اختر النوع —" },
                ...MEETING_TYPES.map((t) => ({ value: t, label: t })),
              ]}
            />
          </div>
          <div>
            <label className="label">التاريخ *</label>
            <input
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label">عنوان الاجتماع *</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: الاجتماع الأول لمجلس النظارة"
          />
        </div>
        <div>
          <label className="label">الحضور * (الاسم والمنصب)</label>
          <div className="space-y-1.5">
            {attendees.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className="input flex-1"
                  placeholder="الاسم"
                  value={a.name}
                  onChange={(e) => patchAttendee(i, { name: e.target.value })}
                />
                <input
                  className="input flex-1"
                  placeholder="المنصب"
                  value={a.title}
                  onChange={(e) => patchAttendee(i, { title: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() =>
                    setAttendees((s) =>
                      s.length > 1 ? s.filter((_, idx) => idx !== i) : s
                    )
                  }
                  className="shrink-0 rounded-lg p-2 text-slate-400 hover:text-red-600 disabled:opacity-30"
                  disabled={attendees.length === 1}
                  aria-label="حذف"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setAttendees((s) => [...s, { name: "", title: "" }])}
              className="btn-ghost py-1.5 text-xs"
            >
              <Plus size={14} className="inline" /> إضافة حاضر
            </button>
          </div>
        </div>
        <div>
          <label className="label">محضر الاجتماع / جدول الأعمال / الملاحظات *</label>
          <textarea
            className="input min-h-[90px]"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
        </div>
      </div>

      {/* التوصيات */}
      <div className="space-y-3 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-bold text-mushar-dark">
          التوصيات <span className="text-slate-400">({recs.length})</span>
        </h3>

        {/* التوصيات المُضافة */}
        {recs.length > 0 && (
          <div className="space-y-1.5">
            {recs.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-mushar-pale/60 text-[10px] font-bold text-mushar-primary">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold text-mushar-dark">
                  {r.name}
                </span>
                <span
                  className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold"
                  style={{
                    backgroundColor: `${PRIORITY[r.priority].color}1a`,
                    color: PRIORITY[r.priority].color,
                  }}
                >
                  {PRIORITY[r.priority].label}
                </span>
                <button
                  onClick={() => setRecs((s) => s.filter((_, idx) => idx !== i))}
                  className="shrink-0 text-slate-400 hover:text-red-600"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* مُنشئ التوصية */}
        <div className="space-y-3 rounded-xl border border-dashed border-slate-200 p-3">
          <p className="text-xs font-semibold text-slate-500">
            إضافة توصية{" "}
            <span className="font-normal text-slate-400">
              (تُنشأ كمهمّة في المتابعة عند الحفظ)
            </span>
          </p>
          <input
            className="input text-sm"
            placeholder="اسم التوصية *"
            value={draft.name}
            onChange={(e) => patchDraft({ name: e.target.value })}
          />
          <textarea
            className="input min-h-[44px] text-sm"
            placeholder="وصف التوصية *"
            value={draft.description}
            onChange={(e) => patchDraft({ description: e.target.value })}
          />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className="label text-[11px]">المجال</label>
              <FilterSelect
                className="w-full"
                value={draft.domain_id}
                onValueChange={(v) => patchDraft({ domain_id: v })}
                options={[
                  { value: "", label: "بدون" },
                  ...domains.map((d) => ({ value: d.id, label: d.name })),
                ]}
              />
            </div>
            <div>
              <label className="label text-[11px]">الإدارة المسؤولة</label>
              <SearchableSelect
                value={draft.owner_unit_id}
                onValueChange={(v) => patchDraft({ owner_unit_id: v })}
                placeholder="— غير محدد —"
                options={orgUnits.map((u) => ({ value: u.id, label: u.name }))}
              />
            </div>
            <div>
              <label className="label text-[11px]">المسؤول</label>
              <SearchableSelect
                value={draft.owner_user_id}
                onValueChange={(v) => patchDraft({ owner_user_id: v })}
                placeholder="— غير محدد —"
                options={users
                  .filter((u) => u.full_name)
                  .map((u) => ({ value: u.id, label: u.full_name! }))}
              />
            </div>
            <div>
              <label className="label text-[11px]">تاريخ الاستحقاق</label>
              <input
                type="date"
                className="input"
                value={draft.due_date}
                onChange={(e) => patchDraft({ due_date: e.target.value })}
              />
            </div>
            <div>
              <label className="label text-[11px]">الأولوية</label>
              <FilterSelect
                className="w-full"
                value={draft.priority}
                onValueChange={(v) => patchDraft({ priority: v as RecDraft["priority"] })}
                options={(Object.keys(PRIORITY) as (keyof typeof PRIORITY)[]).map((k) => ({
                  value: k,
                  label: PRIORITY[k].label,
                }))}
              />
            </div>
          </div>

          {/* الإدارات المشاركة */}
          <div>
            <label className="label text-[11px]">الإدارات المشاركة *</label>
            <div className="flex flex-wrap gap-1.5">
              {orgUnits.map((u) => {
                const on = draft.participant_unit_ids.includes(u.id);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleParticipant(u.id)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                      on
                        ? "border-mushar-primary bg-mushar-primary text-white"
                        : "border-slate-200 bg-white text-slate-500 hover:border-mushar-pale"
                    }`}
                  >
                    {u.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={addToList}
              className="inline-flex items-center gap-1.5 rounded-lg bg-mushar-accent px-4 py-2 text-xs font-bold text-white transition hover:bg-mushar-accentDark"
            >
              <Plus size={14} /> إضافة للقائمة
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
        <button onClick={onDone} className="btn-ghost">إلغاء</button>
        <button onClick={submit} disabled={busy} className="btn-primary disabled:opacity-50">
          {busy ? "جارٍ الحفظ…" : "حفظ الاجتماع"}
        </button>
      </div>
    </div>
  );
}

function RecEditor({
  r,
  idx,
  domains,
  orgUnits,
  users,
  onPatch,
  onRemove,
}: {
  r: RecDraft;
  idx: number;
  domains: RecommendationDomain[];
  orgUnits: SimpleUnit[];
  users: MentionUser[];
  onPatch: (p: Partial<RecDraft>) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-dashed border-slate-200 p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500">توصية {idx + 1}</span>
        {onRemove && (
          <button onClick={onRemove} className="text-mushar-accent hover:text-red-600">
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <input
        className="input text-sm"
        placeholder="نص التوصية *"
        value={r.name}
        onChange={(e) => onPatch({ name: e.target.value })}
      />
      <textarea
        className="input min-h-[44px] text-sm"
        placeholder="تفاصيل (اختياري)"
        value={r.description}
        onChange={(e) => onPatch({ description: e.target.value })}
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="label text-[11px]">المجال</label>
          <FilterSelect
            className="w-full"
            value={r.domain_id}
            onValueChange={(v) => onPatch({ domain_id: v })}
            options={[
              { value: "", label: "بدون" },
              ...domains.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
        </div>
        <div>
          <label className="label text-[11px]">الأولوية</label>
          <FilterSelect
            className="w-full"
            value={r.priority}
            onValueChange={(v) => onPatch({ priority: v as RecDraft["priority"] })}
            options={(Object.keys(PRIORITY) as (keyof typeof PRIORITY)[]).map((k) => ({
              value: k,
              label: PRIORITY[k].label,
            }))}
          />
        </div>
        <div>
          <label className="label text-[11px]">الإدارة المالكة</label>
          <SearchableSelect
            value={r.owner_unit_id}
            onValueChange={(v) => onPatch({ owner_unit_id: v })}
            placeholder="اختر الإدارة"
            options={orgUnits.map((u) => ({ value: u.id, label: u.name }))}
          />
        </div>
        <div>
          <label className="label text-[11px]">المسؤول المكلَّف</label>
          <SearchableSelect
            value={r.owner_user_id}
            onValueChange={(v) => onPatch({ owner_user_id: v })}
            placeholder="اختر المسؤول"
            options={users
              .filter((u) => u.full_name)
              .map((u) => ({ value: u.id, label: u.full_name! }))}
          />
        </div>
        <div>
          <label className="label text-[11px]">تاريخ الاستحقاق</label>
          <input
            type="date"
            className="input"
            value={r.due_date}
            onChange={(e) => onPatch({ due_date: e.target.value })}
          />
        </div>
        <div>
          <label className="label text-[11px]">الإدارات المشاركة</label>
          <MultiUnitPicker
            orgUnits={orgUnits}
            value={r.participant_unit_ids}
            onChange={(ids) => onPatch({ participant_unit_ids: ids })}
          />
        </div>
      </div>
    </div>
  );
}

function MultiUnitPicker({
  orgUnits,
  value,
  onChange,
}: {
  orgUnits: SimpleUnit[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const selected = orgUnits.filter((u) => value.includes(u.id));
  const remaining = orgUnits.filter((u) => !value.includes(u.id));
  return (
    <div className="space-y-1.5">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selected.map((u) => (
            <span
              key={u.id}
              className="inline-flex items-center gap-1 rounded-md bg-mushar-pale/50 px-2 py-0.5 text-[11px] text-mushar-primary"
            >
              {u.name}
              <button onClick={() => onChange(value.filter((v) => v !== u.id))}>
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      {remaining.length > 0 && (
        <SearchableSelect
          value=""
          onValueChange={(v) => v && onChange([...value, v])}
          placeholder="أضف إدارة مشاركة"
          options={remaining.map((u) => ({ value: u.id, label: u.name }))}
        />
      )}
    </div>
  );
}

// ===== بطاقة الاجتماع =====
function MeetingCard({
  meeting,
  domains,
  orgUnits,
  users,
  profile,
  canManage,
  canReview,
}: {
  meeting: Meeting;
  domains: RecommendationDomain[];
  orgUnits: SimpleUnit[];
  users: MentionUser[];
  profile: { id: string; role: string };
  canManage: boolean;
  canReview: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(true);
  const [showAddRec, setShowAddRec] = useState(false);
  const recs = meeting.recommendations ?? [];

  function removeMeeting() {
    confirmDialog("سيُحذف الاجتماع وكل توصياته. متابعة؟", {
      title: "حذف الاجتماع",
      confirmText: "حذف",
      danger: true,
    }).then((ok) => {
      if (!ok) return;
      startTransition(async () => {
        const res = await deleteMeeting(meeting.id);
        if (res.ok) router.refresh();
        else notify(res.error || "خطأ", "error");
      });
    });
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-start gap-3 text-right"
        >
          <ChevronDown
            size={18}
            className={`mt-1 shrink-0 text-slate-400 transition-transform ${open ? "" : "-rotate-90"}`}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-mushar-pale/50 px-2 py-0.5 text-[11px] font-semibold text-mushar-primary">
                {meeting.type}
              </span>
              <h3 className="text-sm font-bold text-mushar-dark">{meeting.title}</h3>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <CalendarDays size={12} /> {fmtDate(meeting.meeting_date)}
              </span>
              {meeting.committee && <span>· {meeting.committee}</span>}
              <span>· {recs.length} توصية</span>
            </p>
          </div>
        </button>
        {canManage && (
          <button
            onClick={removeMeeting}
            className="text-slate-400 hover:text-red-600"
            aria-label="حذف"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {open && (
        <div className="space-y-4 border-t border-slate-100 bg-slate-50/50 p-5">
          {meeting.attendees && <AttendeesView raw={meeting.attendees} />}
          {meeting.minutes && (
            <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600">
              <p className="mb-1 font-semibold text-slate-500">محضر الاجتماع</p>
              <p className="whitespace-pre-wrap">{meeting.minutes}</p>
            </div>
          )}

          <div className="space-y-3">
            {recs.map((r) => (
              <RecommendationCard
                key={r.id}
                rec={r}
                domains={domains}
                users={users}
                profile={profile}
                canManage={canManage}
                canReview={canReview}
              />
            ))}
            {recs.length === 0 && (
              <p className="text-xs text-slate-400">لا توصيات في هذا الاجتماع.</p>
            )}
          </div>

          {canManage && (
            <div>
              {showAddRec ? (
                <AddRecInline
                  meetingId={meeting.id}
                  domains={domains}
                  orgUnits={orgUnits}
                  users={users}
                  onDone={() => setShowAddRec(false)}
                />
              ) : (
                <button
                  onClick={() => setShowAddRec(true)}
                  className="btn-ghost py-1.5 text-xs"
                >
                  <Plus size={14} className="inline" /> إضافة توصية
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddRecInline({
  meetingId,
  domains,
  orgUnits,
  users,
  onDone,
}: {
  meetingId: string;
  domains: RecommendationDomain[];
  orgUnits: SimpleUnit[];
  users: MentionUser[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [r, setR] = useState<RecDraft>(emptyRec());
  const [busy, setBusy] = useState(false);

  function submit() {
    if (!r.name.trim()) return notify("اكتب نص التوصية", "error");
    setBusy(true);
    startTransition(async () => {
      const res = await addRecommendation({
        meeting_id: meetingId,
        name: r.name,
        description: r.description || null,
        domain_id: r.domain_id || null,
        owner_unit_id: r.owner_unit_id || null,
        owner_user_id: r.owner_user_id || null,
        due_date: r.due_date || null,
        priority: r.priority,
        participant_unit_ids: r.participant_unit_ids,
      });
      setBusy(false);
      if (res.ok) {
        onDone();
        router.refresh();
      } else notify(res.error || "خطأ", "error");
    });
  }

  return (
    <div className="rounded-xl border border-mushar-pale bg-white p-3">
      <RecEditor
        r={r}
        idx={0}
        domains={domains}
        orgUnits={orgUnits}
        users={users}
        onPatch={(p) => setR((s) => ({ ...s, ...p }))}
      />
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onDone} className="btn-ghost py-1.5 text-xs">إلغاء</button>
        <button onClick={submit} disabled={busy} className="btn-primary py-1.5 text-xs disabled:opacity-50">
          {busy ? "جارٍ…" : "إضافة"}
        </button>
      </div>
    </div>
  );
}

// ===== بطاقة التوصية =====
function RecommendationCard({
  rec,
  domains,
  users,
  profile,
  canManage,
  canReview,
}: {
  rec: MeetingRecommendation;
  domains: RecommendationDomain[];
  users: MentionUser[];
  profile: { id: string; role: string };
  canManage: boolean;
  canReview: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [noteMentions, setNoteMentions] = useState<string[]>([]);
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [showClose, setShowClose] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [reviewNote, setReviewNote] = useState("");

  const isOwner = rec.owner_user_id === profile.id;
  const canConverse = canManage || isOwner;
  const status = REC_STATUS[recStatusOf(rec)];
  const updates = rec.updates ?? [];

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
      const res = await addRecUpdate({
        recommendation_id: rec.id,
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

  async function submitClosure() {
    if (!file) return notify("إرفاق وثيقة الإغلاق إلزامي.", "error");
    setBusy(true);
    try {
      await notify.promise(
        (async () => {
          const path = `recommendations/${Date.now()}-${file.name}`;
          const { error: upErr } = await supabase.storage
            .from("kpi-docs")
            .upload(path, file);
          if (upErr) throw new Error("تعذّر رفع الوثيقة");
          const res = await requestClosure({
            recommendation_id: rec.id,
            doc_url: path,
            doc_name: file.name,
          });
          if (!res.ok) throw new Error(res.error || "تعذّر رفع الطلب");
        })(),
        {
          loading: "جارٍ رفع طلب الإغلاق…",
          success: "تم رفع طلب الإغلاق لمسؤول القياس.",
          error: "تعذّر رفع طلب الإغلاق.",
        }
      );
      setShowClose(false);
      setFile(null);
      router.refresh();
    } catch {
      /* عُرض عبر التوست */
    } finally {
      setBusy(false);
    }
  }

  async function openDoc(path: string) {
    const { data } = await supabase.storage.from("kpi-docs").createSignedUrl(path, 120);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      {/* رأس التوصية */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-semibold text-mushar-dark">{rec.name}</p>
          {rec.description && (
            <p className="text-xs text-slate-500">{rec.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {rec.domain?.name && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                <Tag size={10} /> {rec.domain.name}
              </span>
            )}
            <span
              className="rounded-md px-2 py-0.5 text-[10px] font-bold"
              style={{ backgroundColor: `${PRIORITY[rec.priority].color}1a`, color: PRIORITY[rec.priority].color }}
            >
              {PRIORITY[rec.priority].label}
            </span>
            {rec.owner_unit?.name && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                <Building2 size={10} /> {rec.owner_unit.name}
              </span>
            )}
            {rec.owner?.full_name && (
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                <Users size={10} /> {rec.owner.full_name}
              </span>
            )}
            {rec.participants && rec.participants.length > 0 && (
              <span className="text-[10px] text-slate-400">
                + {rec.participants.length} إدارة مشاركة
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
              <CalendarDays size={10} /> استحقاق {fmtDate(rec.due_date)}
            </span>
          </div>
        </div>
        <span
          className="shrink-0 rounded-md px-2 py-1 text-[11px] font-bold"
          style={{ backgroundColor: `${status.color}1a`, color: status.color }}
        >
          {status.label}
        </span>
      </div>

      {/* المحادثة */}
      <div className="mt-3 border-t border-slate-100 pt-3">
        <h5 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-mushar-dark">
          <MessageSquare size={13} className="text-mushar-primary" /> التحديثات والتحديات
        </h5>

        {canConverse && rec.closure_status !== "closed" && (
          <div className="mb-3 space-y-2 rounded-lg border border-dashed border-slate-200 p-2.5">
            <MentionBox
              value={note}
              onChange={setNote}
              onMention={(id) => setNoteMentions((s) => [...s, id])}
              users={users}
              placeholder="اكتب تحديثًا أو تحديًا… استخدم @ للإشارة"
              multiline
            />
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => addNote("update")} className="btn-ghost py-1 text-xs">
                + تحديث
              </button>
              <span className="mx-1 h-5 w-px bg-slate-200" />
              <span className="text-[11px] text-slate-500">خطورة التحدّي:</span>
              <div className="w-24">
                <FilterSelect
                  className="w-full"
                  value={severity}
                  onValueChange={(v) => setSeverity(v as typeof severity)}
                  options={(Object.keys(SEVERITY) as (keyof typeof SEVERITY)[]).map((s) => ({
                    value: s,
                    label: SEVERITY[s].label,
                  }))}
                />
              </div>
              <button
                onClick={() => addNote("challenge")}
                className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100"
              >
                + تحدٍّ
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {updates.map((u) => (
            <UpdateItem
              key={u.id}
              u={u}
              users={users}
              canConverse={canConverse}
              onChange={() => router.refresh()}
            />
          ))}
          {updates.length === 0 && (
            <p className="text-[11px] text-slate-400">لا تحديثات بعد.</p>
          )}
        </div>
      </div>

      {/* الإغلاق */}
      <div className="mt-3 border-t border-slate-100 pt-3">
        {rec.closure_status === "closed" ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            <CheckCircle2 size={14} />
            <span className="font-bold">توصية منفّذة ومغلقة</span>
            {rec.resolved_at && <span>· {fmtDate(rec.resolved_at)}</span>}
            {rec.closure_doc_url && (
              <button
                onClick={() => openDoc(rec.closure_doc_url!)}
                className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
              >
                <Paperclip size={12} /> {rec.closure_doc_name || "الوثيقة"}
              </button>
            )}
          </div>
        ) : rec.closure_status === "pending" ? (
          <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/60 p-3 text-xs">
            <p className="flex items-center gap-1.5 font-bold text-amber-800">
              <Clock size={13} /> بانتظار اعتماد الإغلاق من مسؤول القياس
            </p>
            {rec.closure_doc_url && (
              <button
                onClick={() => openDoc(rec.closure_doc_url!)}
                className="inline-flex items-center gap-1 font-semibold text-amber-700 hover:underline"
              >
                <Paperclip size={12} /> {rec.closure_doc_name || "وثيقة الإغلاق"}
              </button>
            )}
            {canReview && (
              <div className="space-y-2 border-t border-amber-200 pt-2">
                <input
                  className="input py-1.5 text-xs"
                  placeholder="ملاحظة (اختياري)"
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      run(() =>
                        reviewClosure({
                          recommendation_id: rec.id,
                          approve: true,
                          note: reviewNote || null,
                        })
                      )
                    }
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    اعتماد الإغلاق
                  </button>
                  <button
                    onClick={() =>
                      run(() =>
                        reviewClosure({
                          recommendation_id: rec.id,
                          approve: false,
                          note: reviewNote || null,
                        })
                      )
                    }
                    className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    إعادة (رفض)
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : canConverse ? (
          showClose ? (
            <div className="space-y-3 rounded-lg border border-emerald-200 p-3">
              <h5 className="text-xs font-bold text-mushar-dark">طلب إغلاق التوصية</h5>
              <p className="text-[11px] text-slate-500">
                لا تُغلق التوصية إلا بإرفاق وثيقة ورفعها لمسؤول القياس للاعتماد.
              </p>
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-xs text-slate-500 file:ml-3 file:rounded-lg file:border-0 file:bg-mushar-pale/50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-mushar-primary"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowClose(false)} className="btn-ghost py-1.5 text-xs">
                  إلغاء
                </button>
                <button
                  onClick={submitClosure}
                  disabled={busy}
                  className="btn-primary py-1.5 text-xs disabled:opacity-50"
                >
                  {busy ? "جارٍ الرفع…" : "رفع طلب الإغلاق"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowClose(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Paperclip size={13} /> طلب إغلاق التوصية
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}

function UpdateItem({
  u,
  users,
  canConverse,
  onChange,
}: {
  u: RecommendationUpdate;
  users: MentionUser[];
  canConverse: boolean;
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
      const res = await addRecReply({
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
        u.resolved
          ? "border-emerald-200 bg-emerald-50/50"
          : isChallenge
          ? "border-amber-200 bg-amber-50/40"
          : "border-slate-200 bg-slate-50"
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

      {replies.length > 0 && (
        <div className="mt-2 space-y-1.5 border-r-2 border-slate-200 pr-3">
          {replies.map((r) => (
            <div key={r.id} className="text-[11px]">
              <p className="text-slate-700">{r.body}</p>
              <p className="flex items-center gap-2 text-[10px] text-slate-400">
                <span>
                  {r.author?.full_name ?? "—"} · {dt(r.created_at)}
                </span>
                {canConverse && (
                  <button
                    onClick={() => act(() => deleteRecReply(r.id))}
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

      {canConverse && (
        <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-2 text-[11px]">
          <button
            onClick={() => setShowReply((v) => !v)}
            className="font-semibold text-mushar-primary hover:underline"
          >
            رد
          </button>
          <button
            onClick={() => act(() => setRecUpdateResolved(u.id, !u.resolved))}
            className="font-semibold text-emerald-700 hover:underline"
          >
            {u.resolved ? "إعادة فتح" : "إغلاق"}
          </button>
          <button
            onClick={() => act(() => deleteRecUpdate(u.id))}
            className="mr-auto text-mushar-accent hover:underline"
          >
            حذف
          </button>
        </div>
      )}

      {showReply && canConverse && (
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

// ===== مجالات التوصيات =====
function DomainSettings({ domains }: { domains: RecommendationDomain[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [name, setName] = useState("");

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) router.refresh();
      else notify(res.error || "خطأ", "error");
    });
  }

  return (
    <div className="card space-y-3 p-5">
      <h3 className="text-sm font-bold text-mushar-dark">مجالات التوصيات</h3>
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="اسم مجال جديد"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          onClick={() =>
            run(async () => {
              const res = await addDomain(name);
              if (res.ok) setName("");
              return res;
            })
          }
          className="btn-primary shrink-0"
        >
          إضافة
        </button>
      </div>
      <div className="space-y-1.5">
        {domains.map((d) => (
          <DomainRow key={d.id} d={d} onSaved={() => router.refresh()} />
        ))}
      </div>
    </div>
  );
}

function DomainRow({
  d,
  onSaved,
}: {
  d: RecommendationDomain;
  onSaved: () => void;
}) {
  const [, startTransition] = useTransition();
  const [name, setName] = useState(d.name);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await fn();
      if (res.ok) onSaved();
      else notify(res.error || "خطأ", "error");
    });
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5">
      <input
        className="input flex-1 py-1 text-xs"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && name !== d.name && run(() => renameDomain(d.id, name))}
      />
      <button
        onClick={() => run(() => toggleDomain(d.id, !d.is_active))}
        className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
          d.is_active
            ? "bg-emerald-50 text-emerald-700"
            : "bg-slate-200 text-slate-500"
        }`}
      >
        {d.is_active ? "مُفعّل" : "مُعطّل"}
      </button>
    </div>
  );
}

// ===== صندوق الإشارة @ =====
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
          className="input min-h-[46px] text-xs"
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
