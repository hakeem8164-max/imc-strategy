"use client";

import { useState, useTransition } from "react";
import FilterSelect from "@/components/ui/FilterSelect";
import { useRouter } from "next/navigation";
import {
  addOrgUnit,
  renameOrgUnit,
  deleteOrgUnit,
  updateOrgName,
  addUnitType,
  deleteUnitType,
} from "@/app/(app)/admin/settings/actions";
import type { OrgUnit, OrgUnitTypeDef } from "@/lib/types";

export default function OrgStructureManager({
  orgName,
  units,
  unitTypes,
}: {
  orgName: string;
  units: OrgUnit[];
  unitTypes: OrgUnitTypeDef[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(orgName);
  const [nameSaved, setNameSaved] = useState(false);

  const typeColor = (n: string) =>
    unitTypes.find((t) => t.name === n)?.color ?? "#64748b";

  // نموذج إضافة وحدة
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<string>(unitTypes[0]?.name ?? "");
  const [newParent, setNewParent] = useState<string>("");
  const [msg, setMsg] = useState<string | null>(null);

  // نموذج إضافة نوع
  const [typeName, setTypeName] = useState("");
  const [typeColorVal, setTypeColorVal] = useState("#8C341F");
  const [typeMsg, setTypeMsg] = useState<string | null>(null);

  const byParent = (pid: string | null) =>
    units.filter((u) => u.parent_id === pid);

  function saveName() {
    startTransition(async () => {
      const res = await updateOrgName(name);
      if (res.ok) {
        setNameSaved(true);
        setTimeout(() => setNameSaved(false), 2000);
        router.refresh();
      } else alert(res.error);
    });
  }

  function add() {
    setMsg(null);
    if (!newType) {
      setMsg("أضِف نوعًا أولًا");
      return;
    }
    startTransition(async () => {
      const res = await addOrgUnit({
        name: newName,
        unit_type: newType,
        parent_id: newParent || null,
      });
      if (res.ok) {
        setNewName("");
        router.refresh();
      } else setMsg(res.error || "خطأ");
    });
  }

  function addType() {
    setTypeMsg(null);
    startTransition(async () => {
      const res = await addUnitType(typeName, typeColorVal);
      if (res.ok) {
        setTypeName("");
        router.refresh();
      } else setTypeMsg(res.error || "خطأ");
    });
  }

  function removeType(t: OrgUnitTypeDef) {
    if (confirm(`حذف النوع «${t.name}»؟`)) {
      startTransition(async () => {
        const res = await deleteUnitType(t.id);
        if (res.ok) router.refresh();
        else alert(res.error);
      });
    }
  }

  function rename(u: OrgUnit) {
    const v = prompt("الاسم الجديد:", u.name);
    if (v && v.trim() && v !== u.name) {
      startTransition(async () => {
        const res = await renameOrgUnit(u.id, v);
        if (res.ok) router.refresh();
        else alert(res.error);
      });
    }
  }

  function remove(u: OrgUnit) {
    if (confirm(`حذف «${u.name}»؟ سيُحذف كل ما تحته. لا يمكن التراجع.`)) {
      startTransition(async () => {
        const res = await deleteOrgUnit(u.id);
        if (res.ok) router.refresh();
        else alert(res.error);
      });
    }
  }

  function renderTree(pid: string | null, depth: number) {
    const children = byParent(pid);
    if (children.length === 0) return null;
    return (
      <ul className={depth > 0 ? "mr-5 border-r border-slate-100 pr-3" : ""}>
        {children.map((u) => (
          <li key={u.id} className="py-1">
            <div className="group flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-slate-50">
              <span
                className="rounded-md px-2 py-0.5 text-[10px] font-bold text-white"
                style={{ backgroundColor: typeColor(u.unit_type) }}
              >
                {u.unit_type}
              </span>
              <span className="text-sm font-semibold text-mushar-dark">
                {u.name}
              </span>
              <div className="mr-auto flex gap-1 opacity-0 transition group-hover:opacity-100">
                <button
                  onClick={() => rename(u)}
                  className="rounded px-2 py-1 text-xs text-mushar-primary hover:bg-mushar-pale/50"
                >
                  تعديل
                </button>
                <button
                  onClick={() => remove(u)}
                  className="rounded px-2 py-1 text-xs text-mushar-accent hover:bg-mushar-accent/10"
                >
                  حذف
                </button>
              </div>
            </div>
            {renderTree(u.id, depth + 1)}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-6">
      {/* بيانات المنشأة */}
      <div className="card p-5">
        <h3 className="mb-3 text-base font-bold text-mushar-dark">
          بيانات المنشأة
        </h3>
        <label className="label">اسم المنشأة</label>
        <div className="flex gap-2">
          <input
            className="input md:max-w-md"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <button onClick={saveName} disabled={pending} className="btn-primary">
            {nameSaved ? "✓ تم" : "حفظ"}
          </button>
        </div>
      </div>

      {/* أنواع الوحدات */}
      <div className="card p-5">
        <h3 className="mb-1 text-base font-bold text-mushar-dark">
          أنواع الوحدات
        </h3>
        <p className="mb-3 text-xs text-slate-400">
          عرّف الأنواع التي تستخدمها في هيكلك (قطاع، إدارة، قسم، فريق…) بألوانها.
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          {unitTypes.map((t) => (
            <span
              key={t.id}
              className="group inline-flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 py-1 pr-3 pl-1.5 text-sm"
            >
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: t.color }}
              />
              <span className="font-medium text-mushar-dark">{t.name}</span>
              <button
                onClick={() => removeType(t)}
                className="rounded px-1.5 text-xs text-slate-400 hover:bg-mushar-accent/10 hover:text-mushar-accent"
                title="حذف النوع"
              >
                ✕
              </button>
            </span>
          ))}
          {unitTypes.length === 0 && (
            <span className="text-sm text-slate-400">لا توجد أنواع بعد</span>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="label">اسم النوع</label>
            <input
              className="input"
              placeholder="مثال: فريق"
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">اللون</label>
            <input
              type="color"
              className="h-[42px] w-16 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
              value={typeColorVal}
              onChange={(e) => setTypeColorVal(e.target.value)}
            />
          </div>
          <button onClick={addType} disabled={pending} className="btn-primary">
            إضافة نوع
          </button>
          {typeMsg && (
            <span className="text-sm text-mushar-accent">{typeMsg}</span>
          )}
        </div>
      </div>

      {/* إضافة وحدة تنظيمية */}
      <div className="card p-5">
        <h3 className="mb-3 text-base font-bold text-mushar-dark">
          إضافة وحدة تنظيمية
        </h3>
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="label">النوع</label>
            <FilterSelect
              className="w-full"
              value={newType ?? ""}
              onValueChange={(v) => setNewType(v)}
              options={unitTypes.map((t) => ({ value: t.name, label: t.name }))}
            />
          </div>
          <div>
            <label className="label">يتبع لـ (اختياري)</label>
            <FilterSelect
              className="w-full"
              value={newParent ?? ""}
              onValueChange={(v) => setNewParent(v)}
              options={[
                { value: "", label: "— المستوى الأعلى —" },
                ...units.map((u) => ({
                  value: u.id,
                  label: `${u.unit_type}: ${u.name}`,
                })),
              ]}
            />
          </div>
          <div className="md:col-span-2">
            <label className="label">الاسم</label>
            <div className="flex gap-2">
              <input
                className="input"
                placeholder="مثال: قطاع المالية"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <button onClick={add} disabled={pending} className="btn-primary">
                إضافة
              </button>
            </div>
          </div>
        </div>
        {msg && <p className="mt-2 text-sm text-mushar-accent">{msg}</p>}
      </div>

      {/* شجرة الهيكل */}
      <div className="card p-5">
        <h3 className="mb-3 text-base font-bold text-mushar-dark">
          الهيكل التنظيمي
        </h3>
        {units.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            لا توجد وحدات بعد — أضِف أول وحدة من الأعلى.
          </p>
        ) : (
          renderTree(null, 0)
        )}
      </div>
    </div>
  );
}
