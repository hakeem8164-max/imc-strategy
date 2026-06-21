-- أهداف الوقفين: منظور مستقل خارج الخطة (مسؤولوه غير المساجد، ونتائجه لا تؤثر على نتائج الخطة)
-- يُميَّز بعلامة in_plan=false ويُستثنى من لوحات الأداء والتقارير، وله صفحته الخاصة.

alter table public.dimensions add column if not exists in_plan boolean not null default true;

-- المنظور المستقل
insert into public.dimensions (name, slug, color, sort_order, in_plan)
values ('أهداف الوقفين', 'awqaf', '#7B4A2E', 100, false)
on conflict (slug) do nothing;

-- الهدفان
insert into public.objectives (dimension_id, code, name, description, sort_order)
select d.id, v.code, v.name, v.description, v.sort_order
from (values
  ('و.1', 'تطوير البيئة التشريعية والتنظيمية',
   'السعي المنظّم للتأثير في الأنظمة والتشريعات التي تحكم قطاع المساجد ووقفها، عبر دراسات ومقترحات مدروسة تُرفع للجهات المختصة، بهدف تذليل القيود النظامية التي تعيق نموذج عمل الشركة، وتهيئة بيئة نظامية تتيح استدامة المشاريع.',
   101),
  ('و.2', 'تعزيز استدامة الشركة وديمومتها',
   'إسناد الشركة ماليًا وحماية استمراريتها كأصل وقفي، عبر معالجة التحديات المالية وتنظيم الدعم وحوكمة العلاقة بين الوقفين والشركة، بما يضمن ديمومة الكيان حتى يبلغ الاستدامة الذاتية.',
   102)
) as v(code, name, description, sort_order)
cross join (select id from public.dimensions where slug='awqaf') d
on conflict (dimension_id, name) do nothing;

-- المؤشرات الستة
insert into public.kpis (code, dimension_id, objective_id, name, unit, polarity, aggregation, is_active, sort_order)
select v.code, o.dimension_id, o.id, v.name, v.unit, v.polarity, 'sum', true, v.sort_order
from (values
  ('27','و.1','عدد المقترحات التشريعية المرفوعة','#','positive',27),
  ('28','و.1','عدد الدراسات الشرعية والنظامية المنجزة','#','positive',28),
  ('29','و.1','عدد الجهات المنظِّمة المتفاعلة','#','positive',29),
  ('30','و.1','نسبة القيود المعالَجة','%','positive',30),
  ('31','و.2','نسبة تغطية الدعم للعجز','%','positive',31),
  ('32','و.2','نسبة الاعتماد على دعم الوقف','%','negative',32)
) as v(code, obj_code, name, unit, polarity, sort_order)
join public.objectives o on o.code = v.obj_code;
