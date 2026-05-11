const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const url = require("url");
const os = require("os");

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "db.json");
const BACKUP_DIR = path.join(DATA_DIR, "backups");
const UPLOAD_DIR = path.join(ROOT, "uploads");

const collections = new Set([
  "departments",
  "versements",
  "boxes",
  "folders",
  "documents",
  "consultations",
  "borrowings",
  "retentionSchedules",
  "locations",
  "notifications",
  "thesaurus",
  "users"
]);

const roles = {
  "Super Admin": ["*"],
  Admin: ["*"],
  Archivist: ["read", "write", "upload", "backup"],
  "Department Officer": ["read", "request"],
  "Consultation Officer": ["read", "consultation"],
  Manager: ["read", "reports"],
  "Read Only": ["read"]
};

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

function now() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(password, salt, 120000, 64, "sha512").toString("hex");
  return { salt, hash };
}

function verifyPassword(password, user) {
  if (!user || !user.salt || !user.passwordHash) return false;
  const result = hashPassword(password, user.salt);
  return crypto.timingSafeEqual(Buffer.from(result.hash), Buffer.from(user.passwordHash));
}

function seedDb() {
  const adminPassword = hashPassword("admin123");
  const archivistPassword = hashPassword("archive123");

  return {
    meta: {
      appName: "E-Archive Pro",
      createdAt: now(),
      updatedAt: now()
    },
    sessions: [],
    users: [
      {
        id: id("usr"),
        fullName: "مدير النظام",
        username: "admin",
        role: "Super Admin",
        department: "الأمانة العامة",
        active: true,
        salt: adminPassword.salt,
        passwordHash: adminPassword.hash,
        createdAt: now(),
        updatedAt: now()
      },
      {
        id: id("usr"),
        fullName: "أمين الأرشيف",
        username: "archivist",
        role: "Archivist",
        department: "مصلحة الأرشيف",
        active: true,
        salt: archivistPassword.salt,
        passwordHash: archivistPassword.hash,
        createdAt: now(),
        updatedAt: now()
      }
    ],
    departments: [
      { id: id("dep"), name: "الأمانة العامة", code: "SG", manager: "مدير عام", active: true, createdAt: now(), updatedAt: now() },
      { id: id("dep"), name: "مصلحة الموارد البشرية", code: "RH", manager: "رئيس المصلحة", active: true, createdAt: now(), updatedAt: now() },
      { id: id("dep"), name: "مصلحة المالية", code: "FIN", manager: "رئيس المصلحة", active: true, createdAt: now(), updatedAt: now() }
    ],
    versements: [
      {
        id: id("ver"),
        number: "V-2026-001",
        producer: "مصلحة الموارد البشرية",
        transferDate: "2026-05-10",
        periodStart: "2023-01-01",
        periodEnd: "2025-12-31",
        boxesCount: 2,
        notes: "دفعة أولية للتجربة",
        status: "مفتوحة",
        createdAt: now(),
        updatedAt: now()
      }
    ],
    boxes: [
      {
        id: id("box"),
        versementId: null,
        number: "B-001",
        archivalCode: "AR-SG-001",
        physicalLocation: "المخزن الرئيسي",
        room: "غرفة 01",
        shelf: "رف A-03",
        documentType: "إداري",
        size: "متوسط",
        folderCount: 8,
        preservationStatus: "جيدة",
        createdAt: now(),
        updatedAt: now()
      }
    ],
    folders: [],
    documents: [
      {
        id: id("doc"),
        number: "D-2026-0001",
        title: "محضر اجتماع لجنة الأرشيف",
        type: "محضر",
        description: "وثيقة تجريبية لعرض الفهرسة والبحث.",
        keywords: "لجنة، أرشيف، اجتماع",
        productionDate: "2026-05-01",
        producer: "الأمانة العامة",
        confidentiality: "داخلي",
        format: "PDF",
        language: "العربية",
        retentionYears: 10,
        legalStatus: "ساري",
        status: "مؤرشف",
        boxId: null,
        folderId: null,
        attachments: [],
        createdAt: now(),
        updatedAt: now()
      }
    ],
    consultations: [],
    borrowings: [],
    retentionSchedules: [
      { id: id("ret"), documentType: "ملفات الموظفين", years: 50, finalAction: "حفظ دائم", createdAt: now(), updatedAt: now() },
      { id: id("ret"), documentType: "فواتير ومحاسبة", years: 10, finalAction: "فرز", createdAt: now(), updatedAt: now() }
    ],
    locations: [
      { id: id("loc"), name: "المخزن الرئيسي", room: "غرفة 01", shelf: "رف A-03", capacity: 120, used: 1, createdAt: now(), updatedAt: now() }
    ],
    notifications: [],
    thesaurus: defaultThesaurus(),
    storageConfig: {
      mode: "local",
      localBackupDir: BACKUP_DIR,
      googleDriveEmail: "",
      googleDriveFolderId: "",
      notes: "التخزين المحلي مفعل. يمكن استعمال Google Drive for desktop ليصبح مجلد النسخ الاحتياطية متزامنا سحابيا.",
      updatedAt: now()
    },
    auditLogs: []
  };
}

function defaultThesaurus() {
  return [
    {
      id: id("ths"),
      term: "الأرشيف",
      synonyms: "وثائق، محفوظات، سجلات، رصيد وثائقي",
      broaderTerm: "إدارة الوثائق",
      narrowerTerms: "أرشيف إداري، أرشيف تاريخي، أرشيف رقمي",
      notes: "مصطلح عام يستعمل لتوسيع البحث في السجلات والوثائق.",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: id("ths"),
      term: "الموارد البشرية",
      synonyms: "الموظفون، العمال، المستخدمون، ملفات الموظفين",
      broaderTerm: "الإدارة",
      narrowerTerms: "توظيف، ترقية، مسار مهني، أجور",
      notes: "يربط وثائق المستخدمين والملفات المهنية.",
      createdAt: now(),
      updatedAt: now()
    },
    {
      id: id("ths"),
      term: "المالية",
      synonyms: "محاسبة، فواتير، ميزانية، نفقات، إيرادات",
      broaderTerm: "التسيير المالي",
      narrowerTerms: "أمر بالدفع، فاتورة، حوالة، كشف",
      notes: "مصطلحات مساعدة للبحث في الوثائق المالية.",
      createdAt: now(),
      updatedAt: now()
    }
  ];
}

function loadDb() {
  ensureDirs();
  if (!fs.existsSync(DATA_FILE)) {
    const db = seedDb();
    const firstVersement = db.versements[0];
    const firstBox = db.boxes[0];
    const firstDoc = db.documents[0];
    firstBox.versementId = firstVersement.id;
    firstDoc.boxId = firstBox.id;
    saveDb(db);
    return db;
  }
  const db = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  migrateDb(db);
  return db;
}

function saveDb(db) {
  db.meta.updatedAt = now();
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
}

function migrateDb(db) {
  db.meta = db.meta || { appName: "E-Archive Pro", createdAt: now() };
  db.sessions = Array.isArray(db.sessions) ? db.sessions : [];
  db.auditLogs = Array.isArray(db.auditLogs) ? db.auditLogs : [];
  for (const name of collections) db[name] = Array.isArray(db[name]) ? db[name] : [];
  if (!db.thesaurus.length) db.thesaurus = defaultThesaurus();
  db.storageConfig = db.storageConfig || {
    mode: "local",
    localBackupDir: BACKUP_DIR,
    googleDriveEmail: "",
    googleDriveFolderId: "",
    notes: "التخزين المحلي مفعل. اربط مجلد Google Drive محليا أو أدخل بيانات الحساب لتوثيق وجهة النسخ السحابي.",
    updatedAt: now()
  };
}

function send(res, status, payload, headers = {}) {
  const body = typeof payload === "string" ? payload : JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": typeof payload === "string" ? "text/plain; charset=utf-8" : "application/json; charset=utf-8",
    ...headers
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", chunk => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function readJson(req) {
  const body = await readBody(req);
  if (!body.length) return {};
  return JSON.parse(body.toString("utf8"));
}

function safeFileName(name) {
  const ext = path.extname(name || "");
  const base = path.basename(name || "file", ext).replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(0, 80);
  return `${base || "file"}-${Date.now()}${ext}`;
}

function parseMultipart(buffer, contentType) {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || "");
  if (!match) throw new Error("Missing multipart boundary");
  const boundary = `--${match[1] || match[2]}`;
  const raw = buffer.toString("binary");
  const parts = raw.split(boundary).slice(1, -1);
  const fields = {};
  const files = [];

  for (const part of parts) {
    const trimmed = part.replace(/^\r\n/, "").replace(/\r\n$/, "");
    const splitAt = trimmed.indexOf("\r\n\r\n");
    if (splitAt === -1) continue;
    const headerText = trimmed.slice(0, splitAt);
    const bodyText = trimmed.slice(splitAt + 4);
    const nameMatch = /name="([^"]+)"/i.exec(headerText);
    if (!nameMatch) continue;
    const fieldName = nameMatch[1];
    const fileMatch = /filename="([^"]*)"/i.exec(headerText);
    const typeMatch = /Content-Type:\s*([^\r\n]+)/i.exec(headerText);

    if (fileMatch && fileMatch[1]) {
      files.push({
        fieldName,
        originalName: Buffer.from(fileMatch[1], "binary").toString("utf8"),
        contentType: typeMatch ? typeMatch[1].trim() : "application/octet-stream",
        buffer: Buffer.from(bodyText, "binary")
      });
    } else {
      fields[fieldName] = Buffer.from(bodyText, "binary").toString("utf8");
    }
  }

  return { fields, files };
}

function publicUser(user) {
  if (!user) return null;
  const { passwordHash, salt, ...safe } = user;
  return safe;
}

function requireAuth(req, res, db) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const session = db.sessions.find(item => item.token === token && new Date(item.expiresAt) > new Date());
  if (!session) {
    send(res, 401, { error: "UNAUTHORIZED", message: "الرجاء تسجيل الدخول." });
    return null;
  }
  const user = db.users.find(item => item.id === session.userId && item.active !== false);
  if (!user) {
    send(res, 401, { error: "UNAUTHORIZED", message: "جلسة غير صالحة." });
    return null;
  }
  return { user, session };
}

function addAudit(db, user, action, entity, entityId, details = {}) {
  db.auditLogs.unshift({
    id: id("log"),
    userId: user ? user.id : null,
    userName: user ? user.fullName : "System",
    action,
    entity,
    entityId,
    details,
    createdAt: now()
  });
  db.auditLogs = db.auditLogs.slice(0, 500);
}

function canWrite(user) {
  const permissions = roles[user.role] || [];
  return permissions.includes("*") || permissions.includes("write");
}

function canBackup(user) {
  const permissions = roles[user.role] || [];
  return permissions.includes("*") || permissions.includes("backup");
}

function canManageUsers(user) {
  return ["Super Admin", "Admin"].includes(user.role);
}

function canReadReports(user) {
  const permissions = roles[user.role] || [];
  return permissions.includes("*") || permissions.includes("reports") || canBackup(user);
}

function assertUserPayload(body, existing, actor) {
  if (!canManageUsers(actor)) return "إدارة الحسابات متاحة فقط للحساب الأساسي أو المدير.";
  if (existing && existing.role === "Super Admin" && actor.role !== "Super Admin") {
    return "لا يمكن تعديل الحساب الأساسي إلا من حساب أساسي.";
  }
  if (body.role === "Super Admin" && actor.role !== "Super Admin") {
    return "إنشاء أو ترقية حساب أساسي يتطلب حسابا أساسيا.";
  }
  return "";
}

function normalizeRecord(collection, payload, existing = {}) {
  const base = {
    ...existing,
    ...payload,
    updatedAt: now()
  };
  if (!base.id) base.id = id(collection.slice(0, 3));
  if (!base.createdAt) base.createdAt = now();
  if (collection === "users") {
    base.active = base.active !== false;
    if (payload.password) {
      const hashed = hashPassword(payload.password);
      base.salt = hashed.salt;
      base.passwordHash = hashed.hash;
      delete base.password;
    }
  }
  return base;
}

const searchStopWords = new Set([
  "من", "في", "على", "عن", "الى", "إلى", "او", "أو", "و", "ف", "ثم", "كل", "هذا", "هذه", "ذلك", "تلك",
  "مع", "بدون", "غير", "رقم", "سنة", "تاريخ"
].map(word => normalizeForSearch(word)));

const searchTypeLabels = {
  document: "وثيقة",
  folder: "ملف",
  box: "علبة",
  versement: "دفعة"
};

const searchCollections = {
  document: "documents",
  folder: "folders",
  box: "boxes",
  versement: "versements"
};

function normalizeForSearch(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitControlledTerms(value) {
  return String(value ?? "")
    .split(/[،,;؛\n]/)
    .map(item => item.trim())
    .filter(Boolean);
}

function tokenVariants(token) {
  const variants = new Set([token]);
  let stem = token;
  for (const prefix of ["وال", "بال", "كال", "فال", "لل", "ال", "و", "ف", "ب", "ك", "ل"]) {
    if (stem.length > prefix.length + 2 && stem.startsWith(prefix)) {
      stem = stem.slice(prefix.length);
      variants.add(stem);
      break;
    }
  }
  for (const suffix of ["يات", "ات", "ون", "ين", "يه", "ية", "ها", "هم", "كم", "نا", "ه", "ي"]) {
    if (stem.length > suffix.length + 2 && stem.endsWith(suffix)) {
      variants.add(stem.slice(0, -suffix.length));
      break;
    }
  }
  return [...variants].filter(item => item.length > 1);
}

function searchTokens(value) {
  const normalized = normalizeForSearch(value);
  if (!normalized) return [];
  const tokens = new Set();
  for (const part of normalized.split(" ")) {
    if (part.length < 2 || searchStopWords.has(part)) continue;
    for (const variant of tokenVariants(part)) {
      if (!searchStopWords.has(variant)) tokens.add(variant);
    }
  }
  return [...tokens];
}

function collectionSearch(items, query) {
  const q = normalizeForSearch(query.q || "");
  if (!q) return items;
  return items.filter(item => normalizeForSearch(JSON.stringify(item)).includes(q));
}

function relationPath(parts) {
  return parts.filter(Boolean).join(" / ") || "غير محدد";
}

function boxLocation(box) {
  return box ? relationPath([box.physicalLocation, box.room, box.shelf]) : "";
}

function makeSearchRecord(db, type, item) {
  const fields = [];
  const add = (name, value, weight) => {
    if (value !== undefined && value !== null && String(value).trim()) fields.push({ name, value: String(value), weight });
  };
  let folder = null;
  let box = null;
  let versement = null;
  if (type === "document") {
    folder = db.folders.find(entry => entry.id === item.folderId) || null;
    box = db.boxes.find(entry => entry.id === (item.boxId || folder?.boxId)) || null;
    versement = db.versements.find(entry => entry.id === box?.versementId) || null;
    add("العنوان", item.title, 10);
    add("الرقم", item.number, 9);
    add("الكلمات المفتاحية", item.keywords, 8);
    add("الوصف", item.description, 5);
    add("النوع", item.type, 4);
    add("الجهة المنتجة", item.producer, 4);
    add("الحالة", item.status, 3);
    add("السرية", item.confidentiality, 2);
    add("الملف", relationPath([folder?.number, folder?.title, folder?.keywords]), 4);
    add("العلبة", relationPath([box?.number, box?.archivalCode, boxLocation(box)]), 3);
    add("الدفعة", relationPath([versement?.number, versement?.producer]), 2);
  } else if (type === "folder") {
    box = db.boxes.find(entry => entry.id === item.boxId) || null;
    versement = db.versements.find(entry => entry.id === box?.versementId) || null;
    add("العنوان", item.title, 10);
    add("الرقم", item.number, 9);
    add("الكلمات المفتاحية", item.keywords, 8);
    add("الوصف", item.description, 5);
    add("العلبة", relationPath([box?.number, box?.archivalCode, boxLocation(box)]), 4);
    add("الدفعة", relationPath([versement?.number, versement?.producer]), 2);
  } else if (type === "box") {
    versement = db.versements.find(entry => entry.id === item.versementId) || null;
    add("رقم العلبة", item.number, 10);
    add("الرمز الأرشيفي", item.archivalCode, 9);
    add("الموقع", boxLocation(item), 7);
    add("نوع الوثائق", item.documentType, 5);
    add("حالة الحفظ", item.preservationStatus, 4);
    add("الدفعة", relationPath([versement?.number, versement?.producer]), 3);
  } else if (type === "versement") {
    add("رقم الدفعة", item.number, 10);
    add("الجهة المنتجة", item.producer, 7);
    add("ملاحظات", item.notes, 5);
    add("الحالة", item.status, 3);
  }
  const title = item.title || item.number || item.archivalCode || "سجل";
  const date = item.productionDate || item.dateStart || item.transferDate || item.createdAt || "";
  const text = fields.map(field => field.value).join(" ");
  return {
    uid: `${type}:${item.id}`,
    id: item.id,
    type,
    collection: searchCollections[type],
    label: searchTypeLabels[type],
    title,
    number: item.number || item.archivalCode || "",
    summary: item.description || item.notes || "",
    producer: item.producer || versement?.producer || "",
    status: item.status || item.preservationStatus || "",
    confidentiality: item.confidentiality || "",
    date,
    boxId: item.boxId || box?.id || "",
    folderId: item.folderId || folder?.id || "",
    path: relationPath([versement?.number, box?.number || (type === "box" ? item.number : ""), folder?.title]),
    fields,
    normalizedText: normalizeForSearch(text),
    termSet: new Set(searchTokens(text))
  };
}

function buildArchiveSearchIndex(db) {
  const records = [
    ...db.documents.map(item => makeSearchRecord(db, "document", item)),
    ...db.folders.map(item => makeSearchRecord(db, "folder", item)),
    ...db.boxes.map(item => makeSearchRecord(db, "box", item)),
    ...db.versements.map(item => makeSearchRecord(db, "versement", item))
  ];
  const inverted = new Map();
  for (const record of records) {
    for (const field of record.fields) {
      for (const term of new Set(searchTokens(field.value))) {
        if (!inverted.has(term)) inverted.set(term, []);
        inverted.get(term).push({ record, field: field.name, weight: field.weight });
      }
    }
  }
  return { records, inverted };
}

function thesaurusEntryTerms(entry) {
  return [
    entry.term,
    ...splitControlledTerms(entry.synonyms),
    entry.broaderTerm,
    ...splitControlledTerms(entry.narrowerTerms)
  ].filter(Boolean);
}

function expandSearchQuery(db, baseTokens) {
  const expanded = new Set(baseTokens);
  const suggestions = [];
  for (const entry of db.thesaurus || []) {
    const displayTerms = thesaurusEntryTerms(entry);
    const entryTokens = new Set(displayTerms.flatMap(searchTokens));
    if (!baseTokens.some(token => entryTokens.has(token))) continue;
    displayTerms.flatMap(searchTokens).forEach(token => expanded.add(token));
    suggestions.push({
      term: entry.term,
      synonyms: splitControlledTerms(entry.synonyms).slice(0, 6),
      broaderTerm: entry.broaderTerm || "",
      narrowerTerms: splitControlledTerms(entry.narrowerTerms).slice(0, 6)
    });
  }
  return { tokens: [...expanded], suggestions };
}

function matchesSearchFilters(record, query) {
  if (query.type && query.type !== "all" && record.type !== query.type) return false;
  if (query.boxId && record.boxId !== query.boxId && record.id !== query.boxId) return false;
  if (query.status && normalizeForSearch(record.status) !== normalizeForSearch(query.status)) return false;
  if (query.confidentiality && normalizeForSearch(record.confidentiality) !== normalizeForSearch(query.confidentiality)) return false;
  if (query.producer && !normalizeForSearch(record.producer).includes(normalizeForSearch(query.producer))) return false;
  if (query.dateFrom && record.date && record.date.slice(0, 10) < query.dateFrom) return false;
  if (query.dateTo && record.date && record.date.slice(0, 10) > query.dateTo) return false;
  return true;
}

function searchSnippet(record, tokens) {
  for (const field of record.fields) {
    const normalized = normalizeForSearch(field.value);
    if (tokens.some(token => normalized.includes(token))) {
      return `${field.name}: ${field.value}`.slice(0, 220);
    }
  }
  return (record.summary || record.path || record.title || "").slice(0, 220);
}

function facetCounts(results) {
  const facets = { type: {}, status: {}, confidentiality: {}, producer: {} };
  const add = (bucket, value) => {
    const key = value || "غير محدد";
    bucket[key] = (bucket[key] || 0) + 1;
  };
  for (const result of results) {
    add(facets.type, result.label);
    add(facets.status, result.status);
    add(facets.confidentiality, result.confidentiality);
    add(facets.producer, result.producer);
  }
  return facets;
}

function searchArchive(db, query) {
  const q = String(query.q || "").trim();
  const baseTokens = searchTokens(q);
  const { records, inverted } = buildArchiveSearchIndex(db);
  const { tokens, suggestions } = expandSearchQuery(db, baseTokens);
  const candidates = new Map();
  const ensureCandidate = record => {
    if (!candidates.has(record.uid)) {
      candidates.set(record.uid, { record, score: 0, fields: new Set(), terms: new Set() });
    }
    return candidates.get(record.uid);
  };

  if (tokens.length) {
    for (const token of tokens) {
      for (const posting of inverted.get(token) || []) {
        const candidate = ensureCandidate(posting.record);
        candidate.score += posting.weight * (baseTokens.includes(token) ? 2 : 0.9);
        candidate.fields.add(posting.field);
        candidate.terms.add(token);
      }
    }
  } else {
    records.forEach(record => ensureCandidate(record));
  }

  const normalizedPhrase = normalizeForSearch(q);
  const results = [...candidates.values()]
    .filter(candidate => matchesSearchFilters(candidate.record, query))
    .map(candidate => {
      if (normalizedPhrase && candidate.record.normalizedText.includes(normalizedPhrase)) candidate.score += 14;
      return {
        id: candidate.record.id,
        type: candidate.record.type,
        collection: candidate.record.collection,
        label: candidate.record.label,
        title: candidate.record.title,
        number: candidate.record.number,
        summary: candidate.record.summary,
        producer: candidate.record.producer,
        status: candidate.record.status,
        confidentiality: candidate.record.confidentiality,
        date: candidate.record.date,
        boxId: candidate.record.boxId,
        folderId: candidate.record.folderId,
        path: candidate.record.path,
        score: Number(candidate.score.toFixed(2)),
        matchedFields: [...candidate.fields].slice(0, 6),
        matchedTerms: [...candidate.terms].slice(0, 8),
        snippet: searchSnippet(candidate.record, tokens)
      };
    })
    .sort((a, b) => b.score - a.score || String(b.date).localeCompare(String(a.date)));

  const limit = Math.min(Number(query.limit || 60), 200);
  return {
    query: q,
    expandedTerms: tokens.slice(0, 30),
    suggestions,
    facets: facetCounts(results),
    index: {
      records: records.length,
      terms: inverted.size,
      generatedAt: now()
    },
    items: results.slice(0, limit),
    total: results.length
  };
}

function getStats(db) {
  const totalBytes = db.documents.flatMap(doc => doc.attachments || []).reduce((sum, file) => sum + Number(file.size || 0), 0);
  const pdfCount = db.documents
    .flatMap(doc => doc.attachments || [])
    .filter(file => (file.contentType || "").includes("pdf") || /\.pdf$/i.test(file.originalName || "")).length;

  const soonExpired = db.documents.filter(doc => {
    if (!doc.productionDate || !doc.retentionYears) return false;
    const limit = new Date(doc.productionDate);
    limit.setFullYear(limit.getFullYear() + Number(doc.retentionYears));
    const days = (limit - new Date()) / 86400000;
    return days <= 180;
  }).length;

  const byYear = {};
  for (const item of db.versements) {
    const year = (item.transferDate || item.createdAt || "").slice(0, 4) || "غير محدد";
    byYear[year] = (byYear[year] || 0) + 1;
  }

  return {
    counts: {
      versements: db.versements.length,
      boxes: db.boxes.length,
      folders: db.folders.length,
      documents: db.documents.length,
      consultations: db.consultations.length,
      borrowings: db.borrowings.filter(item => item.status !== "مسترجعة").length,
      pdf: pdfCount,
      expiredSoon: soonExpired
    },
    storage: {
      bytes: totalBytes,
      label: `${(totalBytes / 1024 / 1024).toFixed(2)} MB`
    },
    byYear,
    recentDocuments: db.documents.slice(-6).reverse(),
    activeConsultations: db.consultations.filter(item => !["مغلق", "مرفوض"].includes(item.status)).slice(0, 6),
    latestLogs: db.auditLogs.slice(0, 8)
  };
}

function getBoxContents(db, boxId) {
  const box = db.boxes.find(item => item.id === boxId);
  if (!box) return null;
  const folders = db.folders.filter(item => item.boxId === boxId);
  const folderIds = new Set(folders.map(item => item.id));
  const documents = db.documents.filter(item => item.boxId === boxId || folderIds.has(item.folderId));
  const versement = db.versements.find(item => item.id === box.versementId) || null;
  return { box, versement, folders, documents };
}

function h(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function localLanHost() {
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const item of entries || []) {
      if (item.family === "IPv4" && !item.internal) return item.address;
    }
  }
  return "";
}

function publicBoxUrl(req, boxId) {
  const host = req.headers.host || `localhost:${PORT}`;
  const port = host.includes(":") ? host.split(":").pop() : String(PORT);
  const hostname = host.split(":")[0];
  const lan = ["localhost", "127.0.0.1", "::1"].includes(hostname) ? localLanHost() : "";
  return `http://${lan || host}${lan ? `:${port}` : ""}/box-view/${encodeURIComponent(boxId)}`;
}

function publicBoxHtml(db, boxId) {
  const contents = getBoxContents(db, boxId);
  if (!contents) return null;
  const { box, versement, folders, documents } = contents;
  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>محتويات العلبة ${h(box.number)}</title>
  <style>
    body{margin:0;background:#f4f7fb;color:#132238;font-family:Tahoma,"Segoe UI",Arial,sans-serif;line-height:1.7}
    main{max-width:920px;margin:auto;padding:18px}
    header,section{background:#fff;border:1px solid #d9e2ec;border-radius:8px;padding:16px;margin-bottom:14px}
    h1,h2{margin:0 0 8px;font-size:22px} h2{font-size:17px}
    .meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
    .item{background:#f8fafc;border:1px solid #d9e2ec;border-radius:7px;padding:10px}
    .muted{color:#667085;font-size:13px}.badge{display:inline-block;background:#e7f4ee;color:#2e7d5b;border-radius:999px;padding:2px 10px;font-size:12px}
  </style>
</head>
<body>
  <main>
    <header>
      <span class="badge">E-Archive Pro</span>
      <h1>محتويات العلبة ${h(box.number || "")}</h1>
      <div class="muted">${h(box.archivalCode || "")}</div>
    </header>
    <section class="meta">
      <div class="item"><strong>الموقع</strong><div>${h([box.physicalLocation, box.room, box.shelf].filter(Boolean).join(" / ") || "غير محدد")}</div></div>
      <div class="item"><strong>الدفعة</strong><div>${h(versement ? versement.number : "غير محدد")}</div></div>
      <div class="item"><strong>نوع الوثائق</strong><div>${h(box.documentType || "غير محدد")}</div></div>
      <div class="item"><strong>المجموع</strong><div>${folders.length} ملف · ${documents.length} وثيقة</div></div>
    </section>
    <section>
      <h2>الملفات</h2>
      ${folders.map(folder => `<div class="item"><strong>${h(folder.title)}</strong><div class="muted">${h(folder.number)} · ${h(folder.dateStart || "")} - ${h(folder.dateEnd || "")}</div><div>${h(folder.description || "")}</div></div>`).join("") || `<div class="muted">لا توجد ملفات مرتبطة بهذه العلبة.</div>`}
    </section>
    <section>
      <h2>الوثائق</h2>
      ${documents.map(doc => `<div class="item"><strong>${h(doc.title)}</strong><div class="muted">${h(doc.number)} · ${h(doc.type || "")} · ${h(doc.status || "")}</div><div>${h(doc.description || "")}</div></div>`).join("") || `<div class="muted">لا توجد وثائق مرتبطة بهذه العلبة.</div>`}
    </section>
  </main>
</body>
</html>`;
}

function getReport(db) {
  const stats = getStats(db);
  const documentsByStatus = {};
  const boxesByLocation = {};
  const documentsByBox = {};
  for (const doc of db.documents) {
    documentsByStatus[doc.status || "غير محدد"] = (documentsByStatus[doc.status || "غير محدد"] || 0) + 1;
    documentsByBox[doc.boxId || "غير مصنف"] = (documentsByBox[doc.boxId || "غير مصنف"] || 0) + 1;
  }
  for (const box of db.boxes) {
    const key = [box.physicalLocation, box.room, box.shelf].filter(Boolean).join(" / ") || "غير محدد";
    boxesByLocation[key] = (boxesByLocation[key] || 0) + 1;
  }
  return {
    generatedAt: now(),
    stats,
    documentsByStatus,
    boxesByLocation,
    documentsByBox,
    storageConfig: db.storageConfig
  };
}

function gfTables() {
  const exp = new Array(512).fill(0);
  const log = new Array(256).fill(0);
  let x = 1;
  for (let i = 0; i < 255; i++) {
    exp[i] = x;
    log[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) exp[i] = exp[i - 255];
  return { exp, log };
}

const GF = gfTables();

function gfMul(a, b) {
  if (!a || !b) return 0;
  return GF.exp[GF.log[a] + GF.log[b]];
}

function rsGenerator(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= gfMul(poly[j], GF.exp[i]);
    }
    poly = next;
  }
  return poly;
}

function rsRemainder(data, degree) {
  const gen = rsGenerator(degree);
  const result = new Array(degree).fill(0);
  for (const byte of data) {
    const factor = byte ^ result.shift();
    result.push(0);
    for (let i = 0; i < degree; i++) result[i] ^= gfMul(gen[i + 1], factor);
  }
  return result;
}

function appendBits(bits, value, length) {
  for (let i = length - 1; i >= 0; i--) bits.push((value >>> i) & 1);
}

function formatBits(ecLevelBits, mask) {
  let data = (ecLevelBits << 3) | mask;
  let bits = data << 10;
  for (let i = 14; i >= 10; i--) {
    if ((bits >>> i) & 1) bits ^= 0x537 << (i - 10);
  }
  return (((data << 10) | bits) ^ 0x5412) & 0x7fff;
}

function makeQrSvg(text) {
  const version = 4;
  const size = 21 + (version - 1) * 4;
  const dataCodewords = 80;
  const eccCodewords = 20;
  const bytes = Buffer.from(text, "utf8");
  if (bytes.length > 78) throw new Error("QR payload is too long.");

  const bits = [];
  appendBits(bits, 0b0100, 4);
  appendBits(bits, bytes.length, 8);
  for (const byte of bytes) appendBits(bits, byte, 8);
  appendBits(bits, 0, Math.min(4, dataCodewords * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));
  for (let pad = 0; data.length < dataCodewords; pad++) data.push(pad % 2 ? 0x11 : 0xec);
  const codewords = data.concat(rsRemainder(data, eccCodewords));

  const modules = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved = Array.from({ length: size }, () => Array(size).fill(false));
  const set = (row, col, value, fixed = true) => {
    if (row < 0 || col < 0 || row >= size || col >= size) return;
    modules[row][col] = Boolean(value);
    if (fixed) reserved[row][col] = true;
  };

  const finder = (row, col) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = row + r;
        const cc = col + c;
        const inFinder = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        const dark = inFinder && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
        set(rr, cc, dark);
      }
    }
  };

  finder(0, 0);
  finder(0, size - 7);
  finder(size - 7, 0);
  for (let i = 8; i < size - 8; i++) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      set(26 + r, 26 + c, Math.max(Math.abs(r), Math.abs(c)) !== 1);
    }
  }
  for (let i = 0; i <= 5; i++) set(i, 8, false);
  set(7, 8, false);
  set(8, 8, false);
  set(8, 7, false);
  for (let i = 9; i < 15; i++) set(8, 14 - i, false);
  for (let i = 0; i < 8; i++) set(8, size - 1 - i, false);
  for (let i = 8; i < 15; i++) set(size - 15 + i, 8, false);
  set(4 * version + 9, 8, true);

  const allBits = [];
  for (const byte of codewords) appendBits(allBits, byte, 8);
  let bitIndex = 0;
  let upward = true;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right--;
    for (let vert = 0; vert < size; vert++) {
      const row = upward ? size - 1 - vert : vert;
      for (let j = 0; j < 2; j++) {
        const col = right - j;
        if (reserved[row][col]) continue;
        let bit = allBits[bitIndex++] || 0;
        if ((row + col) % 2 === 0) bit ^= 1;
        set(row, col, bit, false);
      }
    }
    upward = !upward;
  }

  const fmt = formatBits(1, 0);
  for (let i = 0; i < 15; i++) {
    const bit = ((fmt >>> i) & 1) === 1;
    if (i <= 5) set(i, 8, bit);
    else if (i === 6) set(7, 8, bit);
    else if (i === 7) set(8, 8, bit);
    else if (i === 8) set(8, 7, bit);
    else set(8, 14 - i, bit);
    if (i < 8) set(8, size - 1 - i, bit);
    else set(size - 15 + i, 8, bit);
  }
  set(4 * version + 9, 8, true);

  const scale = 8;
  const quiet = 4;
  const view = (size + quiet * 2) * scale;
  const rects = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (modules[r][c]) rects.push(`<rect x="${(c + quiet) * scale}" y="${(r + quiet) * scale}" width="${scale}" height="${scale}"/>`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${view} ${view}" role="img"><rect width="100%" height="100%" fill="#fff"/><g fill="#111">${rects.join("")}</g></svg>`;
}

function serveStatic(req, res) {
  const parsed = url.parse(req.url);
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname === "/") pathname = "/index.html";
  const fullPath = path.normalize(path.join(PUBLIC_DIR, pathname));

  if (!fullPath.startsWith(PUBLIC_DIR)) {
    send(res, 403, "Forbidden");
    return;
  }

  fs.readFile(fullPath, (err, data) => {
    if (err) {
      fs.readFile(path.join(PUBLIC_DIR, "index.html"), (fallbackErr, fallback) => {
        if (fallbackErr) send(res, 404, "Not found");
        else {
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(fallback);
        }
      });
      return;
    }
    const ext = path.extname(fullPath).toLowerCase();
    const types = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".svg": "image/svg+xml; charset=utf-8",
      ".pdf": "application/pdf"
    };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(data);
  });
}

async function handleApi(req, res) {
  const db = loadDb();
  const parsed = url.parse(req.url, true);
  const parts = parsed.pathname.split("/").filter(Boolean);
  const method = req.method || "GET";

  try {
    if (method === "POST" && parsed.pathname === "/api/auth/login") {
      const body = await readJson(req);
      const user = db.users.find(item => item.username === body.username && item.active !== false);
      if (!verifyPassword(body.password || "", user)) {
        send(res, 401, { error: "INVALID_LOGIN", message: "اسم المستخدم أو كلمة المرور غير صحيحة." });
        return;
      }
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 10).toISOString();
      db.sessions.push({ token, userId: user.id, createdAt: now(), expiresAt });
      addAudit(db, user, "LOGIN", "sessions", token);
      saveDb(db);
      send(res, 200, { token, expiresAt, user: publicUser(user), roles });
      return;
    }

    if (method === "POST" && parsed.pathname === "/api/auth/logout") {
      const auth = requireAuth(req, res, db);
      if (!auth) return;
      db.sessions = db.sessions.filter(item => item.token !== auth.session.token);
      addAudit(db, auth.user, "LOGOUT", "sessions", auth.session.token);
      saveDb(db);
      send(res, 200, { ok: true });
      return;
    }

    const auth = requireAuth(req, res, db);
    if (!auth) return;

    if (method === "POST" && parsed.pathname === "/api/auth/change-password") {
      const body = await readJson(req);
      if (!verifyPassword(body.currentPassword || "", auth.user)) {
        send(res, 400, { error: "INVALID_PASSWORD", message: "كلمة المرور الحالية غير صحيحة." });
        return;
      }
      if (!body.newPassword || String(body.newPassword).length < 8) {
        send(res, 400, { error: "WEAK_PASSWORD", message: "كلمة المرور الجديدة يجب أن تحتوي على 8 أحرف على الأقل." });
        return;
      }
      const hashed = hashPassword(body.newPassword);
      auth.user.salt = hashed.salt;
      auth.user.passwordHash = hashed.hash;
      auth.user.updatedAt = now();
      db.sessions = db.sessions.filter(item => item.userId !== auth.user.id || item.token === auth.session.token);
      addAudit(db, auth.user, "CHANGE_PASSWORD", "users", auth.user.id);
      saveDb(db);
      send(res, 200, { ok: true, user: publicUser(auth.user) });
      return;
    }

    if (method === "POST" && parts[0] === "api" && parts[1] === "users" && parts[2] && parts[3] === "reset-password") {
      if (!canManageUsers(auth.user)) {
        send(res, 403, { error: "FORBIDDEN", message: "إعادة تعيين كلمة المرور متاحة للحساب الأساسي أو المدير فقط." });
        return;
      }
      const body = await readJson(req);
      if (!body.newPassword || String(body.newPassword).length < 8) {
        send(res, 400, { error: "WEAK_PASSWORD", message: "كلمة المرور الجديدة يجب أن تحتوي على 8 أحرف على الأقل." });
        return;
      }
      const target = db.users.find(item => item.id === parts[2]);
      if (!target) {
        send(res, 404, { error: "NOT_FOUND", message: "المستخدم غير موجود." });
        return;
      }
      if (target.role === "Super Admin" && auth.user.role !== "Super Admin") {
        send(res, 403, { error: "FORBIDDEN", message: "إعادة تعيين الحساب الأساسي تتطلب حسابا أساسيا." });
        return;
      }
      const hashed = hashPassword(body.newPassword);
      target.salt = hashed.salt;
      target.passwordHash = hashed.hash;
      target.updatedAt = now();
      db.sessions = db.sessions.filter(item => item.userId !== target.id);
      addAudit(db, auth.user, "RESET_PASSWORD", "users", target.id, { username: target.username });
      saveDb(db);
      send(res, 200, { ok: true, user: publicUser(target) });
      return;
    }

    if (method === "GET" && parsed.pathname === "/api/me") {
      send(res, 200, { user: publicUser(auth.user), roles });
      return;
    }

    if (method === "GET" && parsed.pathname === "/api/stats") {
      send(res, 200, getStats(db));
      return;
    }

    if (method === "GET" && parsed.pathname === "/api/search") {
      send(res, 200, searchArchive(db, parsed.query));
      return;
    }

    if (method === "GET" && parsed.pathname === "/api/reports/summary") {
      if (!canReadReports(auth.user)) {
        send(res, 403, { error: "FORBIDDEN", message: "ليست لديك صلاحية استخراج التقارير." });
        return;
      }
      send(res, 200, getReport(db));
      return;
    }

    if (method === "GET" && parsed.pathname === "/api/audit-logs") {
      send(res, 200, { items: db.auditLogs.slice(0, Number(parsed.query.limit || 100)) });
      return;
    }

    if (method === "GET" && parsed.pathname === "/api/storage") {
      send(res, 200, db.storageConfig);
      return;
    }

    if (method === "PUT" && parsed.pathname === "/api/storage") {
      if (!canBackup(auth.user)) {
        send(res, 403, { error: "FORBIDDEN", message: "ليست لديك صلاحية تعديل إعدادات التخزين." });
        return;
      }
      const body = await readJson(req);
      db.storageConfig = {
        ...db.storageConfig,
        mode: body.mode === "google-drive" ? "google-drive" : "local",
        localBackupDir: body.localBackupDir || BACKUP_DIR,
        googleDriveEmail: body.googleDriveEmail || "",
        googleDriveFolderId: body.googleDriveFolderId || "",
        notes: body.notes || "",
        updatedAt: now()
      };
      addAudit(db, auth.user, "UPDATE_STORAGE", "storage", "config");
      saveDb(db);
      send(res, 200, db.storageConfig);
      return;
    }

    if (parsed.pathname === "/api/upload" && method === "POST") {
      if (!canWrite(auth.user)) {
        send(res, 403, { error: "FORBIDDEN", message: "ليست لديك صلاحية رفع الملفات." });
        return;
      }
      const buffer = await readBody(req);
      const { fields, files } = parseMultipart(buffer, req.headers["content-type"]);
      const document = db.documents.find(item => item.id === fields.documentId);
      if (!document) {
        send(res, 404, { error: "NOT_FOUND", message: "الوثيقة غير موجودة." });
        return;
      }
      const saved = [];
      for (const file of files) {
        const storedName = safeFileName(file.originalName);
        const storedPath = path.join(UPLOAD_DIR, storedName);
        fs.writeFileSync(storedPath, file.buffer);
        const attachment = {
          id: id("att"),
          originalName: file.originalName,
          storedName,
          contentType: file.contentType,
          size: file.buffer.length,
          url: `/uploads/${encodeURIComponent(storedName)}`,
          uploadedBy: auth.user.id,
          uploadedAt: now()
        };
        document.attachments = document.attachments || [];
        document.attachments.push(attachment);
        saved.push(attachment);
      }
      document.updatedAt = now();
      addAudit(db, auth.user, "UPLOAD", "documents", document.id, { files: saved.map(file => file.originalName) });
      saveDb(db);
      send(res, 201, { items: saved, document });
      return;
    }

    if (parsed.pathname === "/api/backups" && method === "GET") {
      const items = fs.readdirSync(BACKUP_DIR)
        .filter(file => file.endsWith(".json"))
        .map(file => {
          const stat = fs.statSync(path.join(BACKUP_DIR, file));
          return { file, size: stat.size, createdAt: stat.birthtime.toISOString() };
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      send(res, 200, { items });
      return;
    }

    if (parts[0] === "api" && parts[1] === "backups" && parts[2] && method === "GET") {
      if (!canBackup(auth.user)) {
        send(res, 403, { error: "FORBIDDEN", message: "ليست لديك صلاحية تحميل النسخ الاحتياطية." });
        return;
      }
      const fileName = path.basename(parts[2]);
      const filePath = path.join(BACKUP_DIR, fileName);
      if (!fileName.endsWith(".json") || !fs.existsSync(filePath)) {
        send(res, 404, { error: "NOT_FOUND", message: "النسخة غير موجودة." });
        return;
      }
      const data = fs.readFileSync(filePath);
      res.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`
      });
      res.end(data);
      return;
    }

    if (parsed.pathname === "/api/backups" && method === "POST") {
      if (!canBackup(auth.user)) {
        send(res, 403, { error: "FORBIDDEN", message: "ليست لديك صلاحية النسخ الاحتياطي." });
        return;
      }
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `backup-${stamp}.json`;
      fs.copyFileSync(DATA_FILE, path.join(BACKUP_DIR, fileName));
      db.storageConfig = { ...db.storageConfig, lastBackupFile: fileName, lastBackupAt: now() };
      addAudit(db, auth.user, "BACKUP", "backups", fileName);
      saveDb(db);
      send(res, 201, { file: fileName });
      return;
    }

    if (parts[0] === "api" && parts[1] === "boxes" && parts[2] && parts[3] === "contents" && method === "GET") {
      const contents = getBoxContents(db, parts[2]);
      if (!contents) {
        send(res, 404, { error: "NOT_FOUND", message: "العلبة غير موجودة." });
        return;
      }
      send(res, 200, contents);
      return;
    }

    if (parts[0] === "api" && parts[1] === "boxes" && parts[2] && parts[3] === "qr-target" && method === "GET") {
      const box = db.boxes.find(item => item.id === parts[2]);
      if (!box) {
        send(res, 404, { error: "NOT_FOUND", message: "العلبة غير موجودة." });
        return;
      }
      send(res, 200, { url: publicBoxUrl(req, box.id) });
      return;
    }

    if (parts[0] === "api" && parts[1] === "boxes" && parts[2] && parts[3] === "qr.svg" && method === "GET") {
      const box = db.boxes.find(item => item.id === parts[2]);
      if (!box) {
        send(res, 404, { error: "NOT_FOUND", message: "العلبة غير موجودة." });
        return;
      }
      const target = publicBoxUrl(req, box.id);
      const svg = makeQrSvg(target);
      res.writeHead(200, { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "no-store" });
      res.end(svg);
      return;
    }

    if (parts[0] === "api" && collections.has(parts[1])) {
      const collection = parts[1];
      const itemId = parts[2];

      if (collection === "users" && !canManageUsers(auth.user)) {
        send(res, 403, { error: "FORBIDDEN", message: "إدارة الحسابات متاحة فقط للحساب الأساسي أو المدير." });
        return;
      }

      if (method === "GET" && !itemId) {
        const items = collectionSearch(db[collection] || [], parsed.query).map(item => collection === "users" ? publicUser(item) : item);
        send(res, 200, { items });
        return;
      }

      if (method === "GET" && itemId) {
        const item = (db[collection] || []).find(entry => entry.id === itemId);
        if (!item) {
          send(res, 404, { error: "NOT_FOUND", message: "السجل غير موجود." });
          return;
        }
        send(res, 200, { item: collection === "users" ? publicUser(item) : item });
        return;
      }

      if (!canWrite(auth.user)) {
        send(res, 403, { error: "FORBIDDEN", message: "ليست لديك صلاحية تعديل البيانات." });
        return;
      }

      if (method === "POST") {
        const body = await readJson(req);
        if (collection === "documents" && body.folderId) {
          const folder = db.folders.find(item => item.id === body.folderId);
          if (folder) body.boxId = folder.boxId;
        }
        if (collection === "users") {
          const reason = assertUserPayload(body, null, auth.user);
          if (reason) {
            send(res, 403, { error: "FORBIDDEN", message: reason });
            return;
          }
          if (!body.password || String(body.password).length < 8) {
            send(res, 400, { error: "WEAK_PASSWORD", message: "كلمة مرور المستخدم الجديد يجب أن تحتوي على 8 أحرف على الأقل." });
            return;
          }
          if (db.users.some(user => user.username === body.username)) {
            send(res, 409, { error: "DUPLICATE_USER", message: "اسم المستخدم مستعمل من قبل." });
            return;
          }
        }
        const item = normalizeRecord(collection, body);
        db[collection].push(item);
        addAudit(db, auth.user, "CREATE", collection, item.id, { title: item.title || item.name || item.number || item.username });
        saveDb(db);
        send(res, 201, { item: collection === "users" ? publicUser(item) : item });
        return;
      }

      if (method === "PUT" && itemId) {
        const body = await readJson(req);
        if (collection === "documents" && body.folderId) {
          const folder = db.folders.find(item => item.id === body.folderId);
          if (folder) body.boxId = folder.boxId;
        }
        const index = db[collection].findIndex(entry => entry.id === itemId);
        if (index === -1) {
          send(res, 404, { error: "NOT_FOUND", message: "السجل غير موجود." });
          return;
        }
        if (collection === "users") {
          const reason = assertUserPayload(body, db[collection][index], auth.user);
          if (reason) {
            send(res, 403, { error: "FORBIDDEN", message: reason });
            return;
          }
          if (body.password && String(body.password).length < 8) {
            send(res, 400, { error: "WEAK_PASSWORD", message: "كلمة المرور الجديدة يجب أن تحتوي على 8 أحرف على الأقل." });
            return;
          }
          if (db.users.some(user => user.id !== itemId && user.username === body.username)) {
            send(res, 409, { error: "DUPLICATE_USER", message: "اسم المستخدم مستعمل من قبل." });
            return;
          }
        }
        db[collection][index] = normalizeRecord(collection, body, db[collection][index]);
        addAudit(db, auth.user, "UPDATE", collection, itemId);
        saveDb(db);
        send(res, 200, { item: collection === "users" ? publicUser(db[collection][index]) : db[collection][index] });
        return;
      }

      if (method === "DELETE" && itemId) {
        const index = db[collection].findIndex(entry => entry.id === itemId);
        if (index === -1) {
          send(res, 404, { error: "NOT_FOUND", message: "السجل غير موجود." });
          return;
        }
        if (collection === "users") {
          const target = db[collection][index];
          if (target.id === auth.user.id) {
            send(res, 400, { error: "SELF_DELETE", message: "لا يمكن حذف الحساب المستخدم حاليا." });
            return;
          }
          if (target.role === "Super Admin" && auth.user.role !== "Super Admin") {
            send(res, 403, { error: "FORBIDDEN", message: "حذف حساب أساسي يتطلب حسابا أساسيا." });
            return;
          }
        }
        const [removed] = db[collection].splice(index, 1);
        addAudit(db, auth.user, "DELETE", collection, itemId, { title: removed.title || removed.name || removed.number || removed.username });
        saveDb(db);
        send(res, 200, { ok: true });
        return;
      }
    }

    send(res, 404, { error: "NOT_FOUND", message: "المسار غير موجود." });
  } catch (error) {
    console.error(error);
    send(res, 500, { error: "SERVER_ERROR", message: error.message });
  }
}

function serveUpload(req, res) {
  const parsed = url.parse(req.url);
  const fileName = decodeURIComponent(parsed.pathname.replace(/^\/uploads\//, ""));
  const fullPath = path.normalize(path.join(UPLOAD_DIR, fileName));
  if (!fullPath.startsWith(UPLOAD_DIR)) {
    send(res, 403, "Forbidden");
    return;
  }
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      send(res, 404, "Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": "application/octet-stream" });
    res.end(data);
  });
}

ensureDirs();

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/box-view/")) {
    const db = loadDb();
    const boxId = decodeURIComponent(url.parse(req.url).pathname.replace(/^\/box-view\//, ""));
    const html = publicBoxHtml(db, boxId);
    if (!html) {
      send(res, 404, "العلبة غير موجودة.");
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
    res.end(html);
    return;
  }
  if (req.url.startsWith("/api/")) {
    handleApi(req, res);
    return;
  }
  if (req.url.startsWith("/uploads/")) {
    serveUpload(req, res);
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`E-Archive Pro is running on http://localhost:${PORT}`);
  console.log("Default accounts:");
  console.log("  admin / admin123");
  console.log("  archivist / archive123");
});
