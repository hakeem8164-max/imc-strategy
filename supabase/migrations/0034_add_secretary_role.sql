-- دور «أمين اللجان» (يستطيع إنشاء الاجتماعات والتوصيات)
alter type public.user_role add value if not exists 'secretary';
