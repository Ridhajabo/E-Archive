# E-Archive Pro

منصة محلية Full Stack لتسيير مكتب أو مصلحة أرشيف، بواجهة عربية RTL وتخزين داخلي على القرص الصلب.

## التشغيل

```powershell
npm start
```

ثم افتح:

```text
http://localhost:3000
```

حسابات التجربة:

```text
admin / admin123
archivist / archive123
```

## ماذا تحتوي النسخة الحالية؟

- تسجيل دخول وجلسات مستخدم.
- أدوار وصلاحيات أولية: Super Admin, Admin, Archivist, Department Officer, Consultation Officer, Manager, Read Only.
- Dashboard بإحصائيات الدفعات، العلب، الوثائق، حجم الملفات، وعدد ملفات PDF.
- إدارة الدفعات الأرشيفية.
- إدارة العلب والمواقع الفيزيائية.
- إدارة الملفات الأرشيفية.
- إدارة الوثائق مع Metadata ومرفقات رقمية.
- رفع ملفات PDF/DOCX/images/ZIP إلى مجلد `uploads`.
- سجل الاطلاع.
- نظام إعارة أولي.
- بحث ذكي داخل السجلات.
- إحصائيات ورسوم بسيطة.
- إدارة الموظفين والمصالح ومدد الحفظ.
- سجل تدقيق Audit Logs.
- نسخ احتياطي يدوي لقاعدة البيانات المحلية.

## التخزين المحلي

هذه النسخة لا تحتاج قاعدة بيانات خارجية. البيانات تحفظ في:

```text
data/db.json
```

المرفقات الرقمية تحفظ في:

```text
uploads/
```

النسخ الاحتياطية تحفظ في:

```text
data/backups/
```

## بنية المشروع

```text
server.js          API + static server
public/index.html  واجهة التطبيق
public/styles.css  التصميم RTL
public/app.js      منطق الواجهة
data/              قاعدة البيانات والنسخ الاحتياطي
uploads/           الملفات الرقمية
```

## ملاحظات مهمة

هذه نسخة MVP محلية وقابلة للتشغيل فوراً بدون تنزيل Dependencies. عند الانتقال لنسخة إنتاج مؤسساتية، الخطة الأفضل هي:

- Frontend: Next.js + TypeScript + Tailwind + ShadCN UI.
- Backend: NestJS + Prisma.
- Database: PostgreSQL.
- Storage: MinIO أو S3.
- Auth: JWT + Refresh Tokens + RBAC.
- Search: PostgreSQL Full Text Search ثم OCR لاحقاً.

## Roadmap مقترح

1. تثبيت نموذج البيانات النهائي وربطه بـ PostgreSQL.
2. إضافة OCR للوثائق الممسوحة.
3. إضافة QR/Barcode للعلب.
4. إضافة تقارير PDF وExcel.
5. إضافة صلاحيات دقيقة لكل شاشة ولكل عملية.
6. إضافة Restore للنسخ الاحتياطي من الواجهة.
7. إضافة سجل عمليات مفصل قابل للتصفية والتصدير.
