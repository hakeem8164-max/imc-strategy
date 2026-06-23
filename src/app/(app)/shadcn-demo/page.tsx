"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

// صفحة تجريبية لإثبات تكامل shadcn (بمحرّك Base UI) مع هوية مُشار و RTL.
export default function ShadcnDemoPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-foreground">
          تجربة shadcn + Base UI
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          مكوّنات shadcn مبنية على Base UI ومربوطة بهوية مُشار، مع دعم RTL.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-foreground">الأزرار (Button)</h2>
        <div className="flex flex-wrap gap-3">
          <Button>أساسي</Button>
          <Button variant="secondary">ثانوي</Button>
          <Button variant="outline">محدّد</Button>
          <Button variant="destructive">حذف</Button>
          <Button variant="ghost">شبح</Button>
          <Button variant="link">رابط</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">صغير</Button>
          <Button size="default">عادي</Button>
          <Button size="lg">كبير</Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-foreground">نافذة (Dialog)</h2>
        <Dialog>
          <DialogTrigger
            render={<Button variant="outline">افتح النافذة</Button>}
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>عنوان النافذة</DialogTitle>
              <DialogDescription>
                هذه نافذة shadcn مبنية على Base UI — تركيز ولوحة مفاتيح و RTL
                تلقائيًّا.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button>تأكيد</Button>} />
              <DialogClose render={<Button variant="ghost">إلغاء</Button>} />
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}
