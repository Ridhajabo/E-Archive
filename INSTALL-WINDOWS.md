# تثبيت E-Archive Pro محليا على Windows

هذه الحزمة تشغل المنصة كبرنامج محلي داخل الجهاز. الواجهة تفتح من المتصفح على:

```text
http://localhost:3000
```

والبيانات تحفظ افتراضيا في:

```text
Documents\E-Archive Pro Data\
```

داخل هذا المجلد ستجد:

```text
data\db.json        قاعدة البيانات المحلية
uploads\            المرفقات والوثائق الرقمية
backups\            النسخ الاحتياطية
```

## المتطلبات

- Windows 10 أو Windows 11.
- Node.js 18 أو أحدث.

## التثبيت السريع

1. فك ضغط ملف `E-Archive-Pro-Local.zip`.
2. شغل `install-windows.cmd`.
3. بعد التثبيت استعمل الاختصار الموجود على سطح المكتب: `E-Archive Pro`.

الحسابات الافتراضية:

```text
admin / admin123
archivist / archive123
```

غيّر كلمات المرور مباشرة بعد أول تشغيل.

## اختيار قرص أو مجلد بيانات آخر

يمكن تشغيل التثبيت من PowerShell بهذا الشكل:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-windows.ps1 -DataRoot "D:\E-Archive-Pro-Data"
```

## التشغيل اليدوي من دون تثبيت

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\open-earchive.ps1
```

## النسخ الاحتياطي

من داخل المنصة استعمل شاشة التخزين والنسخ الاحتياطي. كما يمكن نسخ مجلد:

```text
Documents\E-Archive Pro Data\
```

إلى قرص خارجي بشكل دوري.

## إزالة البرنامج

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\uninstall-windows.ps1
```

الأمر السابق يترك البيانات محفوظة. لحذف البيانات أيضا:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\uninstall-windows.ps1 -RemoveData
```
