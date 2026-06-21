-- منصة المساجد المتكاملة — إضافة دورَي «الرئيس التنفيذي» و«الموظف» إلى نوع user_role
-- يجب تطبيقها قبل 0016 لأنها تعتمد على هاتين القيمتين.
-- (إعادة بناء لمهاجرة كانت مفقودة من المصدر)
alter type user_role add value if not exists 'executive';
alter type user_role add value if not exists 'employee';
