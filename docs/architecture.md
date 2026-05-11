# E-Archive Pro Architecture

## المنطق الهرمي

```text
Institution
  -> Department
  -> Versement
  -> Archive Box
  -> Folder
  -> Document
  -> Digital Attachment
```

## وحدات النظام

- Authentication: تسجيل الدخول والجلسات.
- Dashboard: مؤشرات الأرشيف والنشاط.
- Versements: الدفعات الأرشيفية.
- Archive Boxes: العلب والمواقع الفيزيائية.
- Folders: الملفات الأرشيفية.
- Documents: الفهرسة، Metadata، والمرفقات.
- Consultations: سجل الاطلاع.
- Borrowings: الإعارة والإرجاع.
- Search: بحث موحد عبر السجلات.
- Statistics: تقارير ومؤشرات.
- Users: الموظفون والأدوار.
- Retention: مدد الحفظ والإجراء النهائي.
- Locations: الغرف والرفوف والمخازن.
- Audit Logs: تتبع العمليات.
- Backups: نسخ قاعدة البيانات المحلية.

## API الحالي

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/me
GET  /api/stats

GET/POST       /api/versements
GET/PUT/DELETE /api/versements/:id

GET/POST       /api/boxes
GET/PUT/DELETE /api/boxes/:id

GET/POST       /api/folders
GET/PUT/DELETE /api/folders/:id

GET/POST       /api/documents
GET/PUT/DELETE /api/documents/:id

POST /api/upload
GET  /api/backups
POST /api/backups
GET  /api/audit-logs
```

نفس نمط CRUD مستعمل أيضاً في:

```text
departments
consultations
borrowings
retentionSchedules
locations
users
```

## ترقية مستقبلية إلى Stack مؤسساتي

النسخة الحالية مبنية بدون حزم خارجية حتى تعمل فوراً. عند الترقية:

- انقل `server.js` إلى Modules في NestJS.
- انقل `data/db.json` إلى Prisma schema.
- استبدل `uploads/` بـ MinIO bucket.
- استبدل الجلسات الحالية بـ JWT + Refresh Tokens.
- أضف RBAC على مستوى endpoint وواجهة المستخدم.
- أضف PostgreSQL Full Text Search وOCR index.
