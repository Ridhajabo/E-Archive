const API = "/api";
const APP_VERSION = "النسخة المطورة 2026.05.11";

const collections = [
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
];

const state = {
  token: localStorage.getItem("archive_token") || "",
  user: null,
  roles: {},
  section: "dashboard",
  search: "",
  sidebarOpen: false,
  theme: localStorage.getItem("archive_theme") || "light",
  stats: null,
  data: {},
  backups: [],
  storage: null,
  searchFilters: {
    type: "all",
    producer: "",
    status: "",
    confidentiality: "",
    boxId: "",
    dateFrom: "",
    dateTo: ""
  },
  searchResults: null,
  searchLoading: false,
  pendingBoxId: location.pathname.startsWith("/box/") ? decodeURIComponent(location.pathname.split("/").pop()) : "",
  modal: null,
  toast: "",
  loading: false
};

const nav = [
  { id: "dashboard", label: "لوحة القيادة", icon: "▦" },
  { id: "versements", label: "إدارة الدفعات", icon: "▤" },
  { id: "boxes", label: "إدارة العلب", icon: "▣" },
  { id: "folders", label: "الملفات", icon: "▥" },
  { id: "documents", label: "إدارة الوثائق", icon: "▧" },
  { id: "scan", label: "مسح الوثائق", icon: "▨" },
  { id: "consultations", label: "سجل الاطلاع", icon: "◴" },
  { id: "borrowings", label: "الإعارات", icon: "⇄" },
  { id: "search", label: "البحث الذكي", icon: "⌕" },
  { id: "thesaurus", label: "المكنز", icon: "⌘" },
  { id: "statistics", label: "الإحصائيات", icon: "▰" },
  { id: "reports", label: "التقارير", icon: "▱" },
  { id: "departments", label: "المصالح", icon: "◇" },
  { id: "users", label: "الموظفون", icon: "◉" },
  { id: "retentionSchedules", label: "مدد الحفظ", icon: "◷" },
  { id: "locations", label: "المواقع", icon: "⌂" },
  { id: "account", label: "حسابي", icon: "◎" },
  { id: "storage", label: "التخزين", icon: "⇧" },
  { id: "backups", label: "إدارة النسخ", icon: "↥" },
  { id: "audit", label: "سجل النشاط", icon: "☰" }
];

const config = {
  departments: {
    title: "المصالح الإدارية",
    single: "مصلحة",
    endpoint: "departments",
    columns: ["name", "code", "manager", "active"],
    fields: [
      field("name", "اسم المصلحة"),
      field("code", "الرمز"),
      field("manager", "المسؤول"),
      select("active", "الحالة", [["true", "نشطة"], ["false", "غير نشطة"]])
    ]
  },
  versements: {
    title: "إدارة الدفعات الأرشيفية",
    single: "دفعة",
    endpoint: "versements",
    columns: ["number", "producer", "transferDate", "periodStart", "periodEnd", "boxesCount", "status"],
    fields: [
      field("number", "رقم الدفعة"),
      field("producer", "الجهة المنتجة"),
      field("transferDate", "تاريخ التحويل", "date"),
      field("periodStart", "الفترة الدنيا", "date"),
      field("periodEnd", "الفترة القصوى", "date"),
      field("boxesCount", "عدد العلب", "number"),
      select("status", "الحالة", ["مفتوحة", "مغلقة", "قيد المراجعة", "مؤرشفة"]),
      field("notes", "ملاحظات", "textarea", true)
    ]
  },
  boxes: {
    title: "إدارة علب الأرشيف",
    single: "علبة",
    endpoint: "boxes",
    columns: ["number", "archivalCode", "versementId", "physicalLocation", "room", "shelf", "preservationStatus"],
    fields: [
      field("number", "رقم العلبة"),
      field("archivalCode", "الرمز الأرشيفي"),
      relation("versementId", "الدفعة", "versements", "number"),
      field("physicalLocation", "الموقع الفيزيائي"),
      field("room", "الغرفة"),
      field("shelf", "الرف"),
      field("documentType", "نوع الوثائق"),
      select("size", "الحجم", ["صغير", "متوسط", "كبير"]),
      field("folderCount", "عدد الملفات", "number"),
      select("preservationStatus", "حالة الحفظ", ["جيدة", "متوسطة", "تحتاج ترميم", "متضررة"])
    ]
  },
  folders: {
    title: "الملفات الأرشيفية",
    single: "ملف",
    endpoint: "folders",
    columns: ["number", "title", "boxId", "dateStart", "dateEnd", "keywords"],
    fields: [
      field("number", "رقم الملف"),
      field("title", "عنوان الملف"),
      relation("boxId", "العلبة", "boxes", "number"),
      field("dateStart", "تاريخ البداية", "date"),
      field("dateEnd", "تاريخ النهاية", "date"),
      field("keywords", "الكلمات المفتاحية"),
      field("description", "الوصف", "textarea", true)
    ]
  },
  documents: {
    title: "إدارة الوثائق",
    single: "وثيقة",
    endpoint: "documents",
    columns: ["number", "title", "type", "producer", "confidentiality", "retentionYears", "status", "attachments"],
    fields: [
      field("number", "رقم الوثيقة"),
      field("title", "عنوان الوثيقة"),
      field("type", "نوع الوثيقة"),
      relation("boxId", "العلبة", "boxes", "number"),
      relation("folderId", "الملف", "folders", "title"),
      field("producer", "الجهة المنتجة"),
      field("productionDate", "تاريخ الإنتاج", "date"),
      select("confidentiality", "درجة السرية", ["عمومي", "داخلي", "سري", "سري جدا"]),
      select("format", "الصيغة", ["PDF", "DOCX", "صورة", "ورقي", "مختلط"]),
      select("language", "اللغة", ["العربية", "الفرنسية", "الإنجليزية", "متعدد"]),
      field("retentionYears", "مدة الحفظ بالسنوات", "number"),
      select("legalStatus", "الحالة القانونية", ["ساري", "منتهي", "قيد المراجعة"]),
      select("status", "الحالة", ["مسودة", "مفهرس", "مؤرشف", "محفوظ نهائيا"]),
      field("keywords", "الكلمات المفتاحية"),
      field("description", "الوصف", "textarea", true)
    ]
  },
  consultations: {
    title: "سجل الاطلاع",
    single: "طلب اطلاع",
    endpoint: "consultations",
    columns: ["beneficiary", "documentId", "reason", "requestDate", "dueDate", "returnDate", "status"],
    fields: [
      field("beneficiary", "اسم المستفيد"),
      relation("documentId", "الوثيقة", "documents", "title"),
      field("reason", "سبب الاطلاع"),
      field("requestDate", "تاريخ الطلب", "date"),
      field("dueDate", "تاريخ الإرجاع المتوقع", "date"),
      field("returnDate", "تاريخ الإرجاع", "date"),
      select("status", "الحالة", ["طلب جديد", "موافق عليه", "مرفوض", "مغلق"])
    ]
  },
  borrowings: {
    title: "نظام الإعارة",
    single: "إعارة",
    endpoint: "borrowings",
    columns: ["borrower", "documentId", "borrowedAt", "dueDate", "returnedAt", "status"],
    fields: [
      field("borrower", "المستعير"),
      relation("documentId", "الوثيقة", "documents", "title"),
      field("borrowedAt", "تاريخ الإعارة", "date"),
      field("dueDate", "آخر أجل"),
      field("returnedAt", "تاريخ الإرجاع", "date"),
      select("status", "الحالة", ["جارية", "متأخرة", "مسترجعة"])
    ]
  },
  users: {
    title: "إدارة الموظفين والمستخدمين",
    single: "مستخدم",
    endpoint: "users",
    columns: ["fullName", "username", "role", "department", "active"],
    fields: [
      field("fullName", "الاسم الكامل"),
      field("username", "اسم المستخدم"),
      field("password", "كلمة المرور", "password"),
      select("role", "الدور", ["Super Admin", "Admin", "Archivist", "Department Officer", "Consultation Officer", "Manager", "Read Only"]),
      field("department", "المصلحة"),
      select("active", "الحالة", [["true", "نشط"], ["false", "معطل"]])
    ]
  },
  retentionSchedules: {
    title: "جداول مدد الحفظ",
    single: "قاعدة حفظ",
    endpoint: "retentionSchedules",
    columns: ["documentType", "years", "finalAction"],
    fields: [
      field("documentType", "نوع الوثيقة"),
      field("years", "مدة الحفظ بالسنوات", "number"),
      select("finalAction", "الإجراء النهائي", ["حفظ دائم", "إتلاف", "فرز", "تحويل"])
    ]
  },
  locations: {
    title: "المواقع الفيزيائية",
    single: "موقع",
    endpoint: "locations",
    columns: ["name", "room", "shelf", "capacity", "used"],
    fields: [
      field("name", "اسم الموقع"),
      field("room", "الغرفة"),
      field("shelf", "الرف"),
      field("capacity", "السعة"),
      field("used", "المستعمل")
    ]
  },
  thesaurus: {
    title: "المكنز والتكشيف",
    single: "مصطلح",
    endpoint: "thesaurus",
    columns: ["term", "synonyms", "broaderTerm", "narrowerTerms"],
    fields: [
      field("term", "المصطلح المعتمد"),
      field("synonyms", "المرادفات"),
      field("broaderTerm", "مصطلح أوسع"),
      field("narrowerTerms", "مصطلحات أضيق"),
      field("notes", "ملاحظات التكشيف", "textarea", true)
    ]
  }
};

function field(key, label, type = "text", wide = false) {
  return { key, label, type, wide };
}

function select(key, label, options) {
  return { key, label, type: "select", options };
}

function relation(key, label, source, labelKey) {
  return { key, label, type: "relation", source, labelKey };
}

function h(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function statusBadge(value) {
  const text = h(value || "غير محدد");
  const cls = ["مؤرشف", "مغلق", "جيدة", "نشطة", "نشط", "موافق عليه", "مسترجعة"].includes(value)
    ? "green"
    : ["مرفوض", "متضررة", "معطل", "غير نشطة"].includes(value)
      ? "red"
      : ["قيد المراجعة", "متأخرة", "تحتاج ترميم"].includes(value)
        ? "yellow"
        : "";
  return `<span class="badge ${cls}">${text}</span>`;
}

async function api(path, options = {}) {
  const headers = options.headers || {};
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "حدث خطأ في الاتصال بالخادم.");
  return payload;
}

async function boot() {
  document.documentElement.dataset.theme = state.theme;
  if (!state.token) {
    render();
    return;
  }
  try {
    const me = await api("/me");
    state.user = me.user;
    state.roles = me.roles;
    await loadAll();
  } catch {
    localStorage.removeItem("archive_token");
    state.token = "";
  }
  render();
}

async function loadAll() {
  state.loading = true;
  const [stats, backups, storage, ...sets] = await Promise.all([
    api("/stats"),
    api("/backups"),
    api("/storage").catch(() => null),
    ...collections.map(name => api(`/${name}`).catch(() => ({ items: [] })))
  ]);
  state.stats = stats;
  state.backups = backups.items || [];
  state.storage = storage;
  collections.forEach((name, index) => {
    state.data[name] = sets[index].items || [];
  });
  state.loading = false;
  if (state.pendingBoxId) {
    const pending = state.pendingBoxId;
    state.pendingBoxId = "";
    state.section = "boxes";
    state.modal = { type: "boxDetail", id: pending };
    history.replaceState(null, "", "/");
  }
}

function render() {
  document.documentElement.dataset.theme = state.theme;
  const app = document.querySelector("#app");
  app.innerHTML = state.token && state.user ? renderShell() : renderLogin();
  bind();
}

function renderLogin() {
  return `
    <main class="login-shell">
      <section class="login-visual" aria-hidden="true">
        <div class="archive-mark">
          <div class="binder-row">
            <div class="binder"><span></span></div>
            <div class="binder"><span></span></div>
            <div class="binder"><span></span></div>
          </div>
        </div>
      </section>
      <section class="login-panel">
        <form class="login-card" id="loginForm">
          <div class="brand">
            <div class="brand-icon">EA</div>
            <div>
              <h1>تسجيل الدخول</h1>
              <p>منصة الإدارة الإلكترونية للأرشيف المؤسسي</p>
            </div>
          </div>
          <div class="version-banner">${APP_VERSION} · حسابات وصلاحيات · QR · تقارير · تخزين</div>
          <div class="field">
            <label for="username">اسم المستخدم</label>
            <input id="username" name="username" autocomplete="username" value="admin" required />
          </div>
          <div class="field">
            <label for="password">كلمة المرور</label>
            <input id="password" name="password" type="password" autocomplete="current-password" value="admin123" required />
          </div>
          <button class="primary-btn" type="submit">دخول</button>
          <p class="error" id="loginError"></p>
          <p class="hint">حساب التجربة: admin / admin123 أو archivist / archive123. البيانات تحفظ محلياً داخل مجلد المشروع.</p>
        </form>
      </section>
    </main>
  `;
}

function hasPermission(permission) {
  const permissions = state.roles[state.user?.role] || [];
  return permissions.includes("*") || permissions.includes(permission);
}

function isAdmin() {
  return ["Super Admin", "Admin"].includes(state.user?.role);
}

function canSeeNav(item) {
  if (item.id === "users") return isAdmin();
  if (["backups", "storage"].includes(item.id)) return hasPermission("backup");
  if (item.id === "reports") return hasPermission("reports") || hasPermission("backup");
  return true;
}

function renderShell() {
  const active = nav.find(item => item.id === state.section) || nav[0];
  return `
    <div class="app-shell">
      <aside class="sidebar ${state.sidebarOpen ? "open" : ""}">
        <div class="sidebar-head">
          <div class="sidebar-title">E-Archive Pro</div>
          <div class="sidebar-subtitle">تسيير الأرشيف المؤسسي</div>
          <div class="sidebar-version">${APP_VERSION}</div>
        </div>
        <nav class="nav">
          ${nav.filter(canSeeNav).map(item => `
            <button class="${state.section === item.id ? "active" : ""}" data-action="nav" data-section="${item.id}">
              <span class="ico">${item.icon}</span>
              <span>${item.label}</span>
            </button>
          `).join("")}
        </nav>
        <div class="sidebar-foot">
          <div class="user-chip">
            <strong>${h(state.user.fullName)}</strong>
            <span>${h(state.user.role)} · ${h(state.user.department || "")}</span>
          </div>
          <button class="secondary-btn" data-action="logout">خروج</button>
        </div>
      </aside>
      <main class="main">
        <header class="topbar">
          <button class="icon-btn mobile-menu" data-action="mobile">☰</button>
          <div>
            <h2>${h(active.label)}</h2>
            <span class="muted">${new Date().toLocaleDateString("ar-DZ", { dateStyle: "full" })}</span>
          </div>
          <span class="badge green">${APP_VERSION}</span>
          <div class="topbar-spacer"></div>
          <input class="search" id="globalSearch" placeholder="بحث سريع في الشاشة الحالية" value="${h(state.search)}" />
          <button class="icon-btn" data-action="theme" title="تبديل الوضع">${state.theme === "dark" ? "☀" : "◐"}</button>
        </header>
        <section class="content">${renderSection()}</section>
      </main>
    </div>
    ${state.modal ? renderModal() : ""}
    ${state.toast ? `<div class="toast">${h(state.toast)}</div>` : ""}
  `;
}

function renderSection() {
  if (state.loading) return `<div class="panel empty">جاري تحميل البيانات...</div>`;
  if (state.section === "dashboard") return renderDashboard();
  if (state.section === "statistics") return renderStatistics();
  if (state.section === "reports") return renderReports();
  if (state.section === "search") return renderSmartSearch();
  if (state.section === "scan") return renderDocumentScan();
  if (state.section === "account") return renderAccount();
  if (state.section === "storage") return renderStorage();
  if (state.section === "backups") return renderBackups();
  if (state.section === "audit") return renderAudit();
  if (config[state.section]) return renderCrud(state.section);
  return `<div class="panel empty">الوحدة غير متوفرة بعد.</div>`;
}

function renderDashboard() {
  const stats = state.stats || { counts: {}, storage: {}, byYear: {}, recentDocuments: [], activeConsultations: [], latestLogs: [] };
  const cards = [
    ["عدد الدفعات", stats.counts.versements || 0, "دفعات"],
    ["عدد العلب", stats.counts.boxes || 0, "علب"],
    ["عدد الوثائق", stats.counts.documents || 0, "وثائق"],
    ["حجم الملفات", stats.storage.label || "0 MB", "تخزين"],
    ["عدد PDF", stats.counts.pdf || 0, "PDF"]
  ];
  return `
    <div class="cards">
      ${cards.map(([label, value, icon]) => `
        <article class="stat-card">
          <div class="stat-top">
            <p>${label}</p>
            <div class="stat-icon">${icon}</div>
          </div>
          <strong>${h(value)}</strong>
        </article>
      `).join("")}
    </div>
    <div class="grid-2">
      <section class="panel">
        <div class="panel-header">
          <h3>الإيداعات حسب السنة</h3>
          <button class="secondary-btn" data-action="nav" data-section="versements">فتح الدفعات</button>
        </div>
        ${renderYearBars(stats.byYear)}
      </section>
      <section class="panel">
        <div class="panel-header">
          <h3>مؤشر النشاط</h3>
          <span class="badge">${stats.counts.expiredSoon || 0} وثيقة تقترب من نهاية الحفظ</span>
        </div>
        <div class="activity">
          ${(stats.latestLogs || []).map(log => `
            <div class="activity-item">
              <span class="activity-dot"></span>
              <div>
                <strong>${h(log.userName)} · ${h(log.action)}</strong>
                <span>${h(log.entity)} · ${formatDate(log.createdAt)}</span>
              </div>
            </div>
          `).join("") || `<div class="empty">لا توجد عمليات بعد.</div>`}
        </div>
      </section>
    </div>
    <div class="grid-2">
      <section class="panel">
        <div class="panel-header">
          <h3>آخر الوثائق</h3>
          <button class="primary-btn" data-action="new" data-collection="documents">إضافة وثيقة</button>
        </div>
        <div class="activity">
          ${(stats.recentDocuments || []).map(doc => `
            <div class="doc-row">
              <span class="activity-dot"></span>
              <div>
                <strong>${h(doc.title)}</strong>
                <span>${h(doc.number)} · ${h(doc.producer)} · ${h(doc.status)}</span>
              </div>
            </div>
          `).join("") || `<div class="empty">لا توجد وثائق مسجلة.</div>`}
        </div>
      </section>
      <section class="panel">
        <div class="panel-header">
          <h3>طلبات الاطلاع الحالية</h3>
          <button class="secondary-btn" data-action="new" data-collection="consultations">طلب اطلاع</button>
        </div>
        <div class="activity">
          ${(stats.activeConsultations || []).map(item => `
            <div class="doc-row">
              <span class="activity-dot"></span>
              <div>
                <strong>${h(item.beneficiary)}</strong>
                <span>${resolve("documents", item.documentId, "title")} · ${h(item.status)}</span>
              </div>
            </div>
          `).join("") || `<div class="empty">لا توجد طلبات مفتوحة.</div>`}
        </div>
      </section>
    </div>
  `;
}

function renderCrud(name) {
  const cfg = config[name];
  const items = filtered(state.data[cfg.endpoint] || []);
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>${cfg.title}</h3>
          <span class="muted">${items.length} سجل</span>
        </div>
        <div class="toolbar">
          <button class="primary-btn" data-action="new" data-collection="${name}">إضافة ${cfg.single}</button>
          <button class="secondary-btn" data-action="refresh">تحديث</button>
        </div>
      </div>
      ${name === "boxes" ? renderBoxExplorer(items) : ""}
      ${renderTable(name, items)}
    </section>
  `;
}

function renderBoxExplorer(items) {
  return `
    <div class="box-explorer">
      ${items.map(box => `
        <button class="archive-box-card" data-action="boxDetail" data-id="${h(box.id)}" type="button">
          <span class="box-lid"></span>
          <strong>${h(box.number || "علبة")}</strong>
          <small>${h(box.archivalCode || "بدون كود")}</small>
          <em>${h([box.room, box.shelf].filter(Boolean).join(" / ") || "غير محدد")}</em>
        </button>
      `).join("") || `<div class="empty">أضف أول علبة لتظهر هنا بشكل بصري.</div>`}
    </div>
  `;
}

function renderTable(name, items) {
  const cfg = config[name];
  if (!items.length) return `<div class="empty">لا توجد سجلات مطابقة.</div>`;
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            ${cfg.columns.map(col => `<th>${labelFor(cfg, col)}</th>`).join("")}
            <th>إجراءات</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr>
              ${cfg.columns.map(col => `<td>${cell(name, col, item)}</td>`).join("")}
              <td>
                <div class="toolbar">
                  ${name === "documents" ? `<button class="secondary-btn" data-action="upload" data-id="${item.id}">مرفقات</button>` : ""}
                  ${name === "boxes" ? `<button class="secondary-btn" data-action="boxDetail" data-id="${item.id}">المحتويات</button><button class="secondary-btn" data-action="boxQr" data-id="${item.id}">QR</button>` : ""}
                  ${name === "users" ? `<button class="secondary-btn" data-action="resetPassword" data-id="${item.id}">كلمة المرور</button>` : ""}
                  <button class="secondary-btn" data-action="edit" data-collection="${name}" data-id="${item.id}">تعديل</button>
                  <button class="danger-btn" data-action="delete" data-collection="${name}" data-id="${item.id}">حذف</button>
                </div>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderStatistics() {
  const stats = state.stats || { counts: {}, byYear: {}, storage: {} };
  const departmentCounts = {};
  for (const doc of state.data.documents || []) {
    departmentCounts[doc.producer || "غير محدد"] = (departmentCounts[doc.producer || "غير محدد"] || 0) + 1;
  }
  return `
    <div class="cards">
      <article class="stat-card"><p>إجمالي الوثائق</p><strong>${stats.counts.documents || 0}</strong></article>
      <article class="stat-card"><p>الإعارات الحالية</p><strong>${stats.counts.borrowings || 0}</strong></article>
      <article class="stat-card"><p>طلبات الاطلاع</p><strong>${stats.counts.consultations || 0}</strong></article>
      <article class="stat-card"><p>الوثائق الرقمية</p><strong>${stats.counts.pdf || 0}</strong></article>
      <article class="stat-card"><p>التخزين</p><strong>${h(stats.storage.label || "0 MB")}</strong></article>
    </div>
    <div class="grid-2">
      <section class="panel">
        <h3>الإيداعات حسب السنة</h3>
        ${renderYearBars(stats.byYear)}
      </section>
      <section class="panel">
        <h3>أكثر الجهات إنتاجاً للوثائق</h3>
        <div class="activity">${Object.entries(departmentCounts).map(([name, count]) => `
          <div class="activity-item"><span class="activity-dot"></span><div><strong>${h(name)}</strong><span>${count} وثيقة</span></div></div>
        `).join("") || `<div class="empty">لا توجد بيانات كافية.</div>`}</div>
      </section>
    </div>
  `;
}

function renderReports() {
  const stats = state.stats || { counts: {}, storage: {}, byYear: {} };
  const boxes = state.data.boxes || [];
  const docs = state.data.documents || [];
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>التقارير والإحصائيات</h3>
          <span class="muted">استخراج ملخص تنفيذي أو ملف CSV من البيانات المحلية الحالية.</span>
        </div>
        <div class="toolbar">
          <button class="primary-btn" data-action="printReport">طباعة التقرير</button>
          <button class="secondary-btn" data-action="exportReportCsv">CSV</button>
          <button class="secondary-btn" data-action="exportReportJson">JSON</button>
        </div>
      </div>
      <div class="report-sheet" id="reportSheet">
        <h3>تقرير الأرشيف</h3>
        <p class="muted">تاريخ الاستخراج: ${new Date().toLocaleString("ar-DZ")}</p>
        <div class="cards">
          <article class="stat-card"><p>العلب</p><strong>${stats.counts.boxes || 0}</strong></article>
          <article class="stat-card"><p>الملفات</p><strong>${stats.counts.folders || 0}</strong></article>
          <article class="stat-card"><p>الوثائق</p><strong>${stats.counts.documents || 0}</strong></article>
          <article class="stat-card"><p>المرفقات</p><strong>${stats.counts.pdf || 0}</strong></article>
          <article class="stat-card"><p>التخزين</p><strong>${h(stats.storage.label || "0 MB")}</strong></article>
        </div>
        <div class="grid-2 report-grid">
          <section>
            <h3>العلب حسب الموقع</h3>
            <div class="activity">
              ${boxes.map(box => `<div class="activity-item"><span class="activity-dot"></span><div><strong>${h(box.number)} · ${h(box.archivalCode || "")}</strong><span>${h([box.physicalLocation, box.room, box.shelf].filter(Boolean).join(" / ") || "غير محدد")}</span></div></div>`).join("") || `<div class="empty">لا توجد علب.</div>`}
            </div>
          </section>
          <section>
            <h3>آخر الوثائق</h3>
            <div class="activity">
              ${docs.slice(-8).reverse().map(doc => `<div class="activity-item"><span class="activity-dot"></span><div><strong>${h(doc.title)}</strong><span>${h(doc.number)} · ${resolve("boxes", doc.boxId, "number")}</span></div></div>`).join("") || `<div class="empty">لا توجد وثائق.</div>`}
            </div>
          </section>
        </div>
      </div>
    </section>
  `;
}

function renderDocumentScan() {
  const boxes = state.data.boxes || [];
  const folders = state.data.folders || [];
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>مسح الوثائق وإدراجها</h3>
          <span class="muted">اختر العلبة والملف، ثم ارفع صورة أو PDF للوثيقة. كل وثيقة تحفظ داخل ملف محدد، وكل ملف داخل علبة محددة.</span>
        </div>
      </div>
      <form class="form-grid" id="scanForm">
        <div class="field">
          <label>العلبة الأرشيفية</label>
          <select name="boxId" required>
            <option value="">اختر العلبة</option>
            ${boxes.map(box => `<option value="${h(box.id)}">${h(box.number)} · ${h(box.archivalCode || "")}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>الملف داخل العلبة</label>
          <select name="folderId" required>
            <option value="">اختر الملف</option>
            ${folders.map(folder => `<option value="${h(folder.id)}" data-box-id="${h(folder.boxId || "")}">${h(folder.title)} · ${resolve("boxes", folder.boxId, "number")}</option>`).join("")}
          </select>
        </div>
        <div class="field"><label>رقم الوثيقة</label><input name="number" required placeholder="مثال: DOC-001" /></div>
        <div class="field"><label>عنوان الوثيقة</label><input name="title" required /></div>
        <div class="field"><label>نوع الوثيقة</label><input name="type" /></div>
        <div class="field"><label>تاريخ الإنتاج</label><input name="productionDate" type="date" /></div>
        <div class="field"><label>الجهة المنتجة</label><input name="producer" /></div>
        <div class="field"><label>مدة الحفظ بالسنوات</label><input name="retentionYears" type="number" min="0" /></div>
        <div class="field">
          <label>درجة السرية</label>
          <select name="confidentiality"><option>عمومي</option><option>داخلي</option><option>سري</option><option>سري جدا</option></select>
        </div>
        <div class="field">
          <label>الحالة</label>
          <select name="status"><option>مؤرشف</option><option>مفهرس</option><option>مسودة</option><option>محفوظ نهائيا</option></select>
        </div>
        <div class="field wide"><label>الكلمات المفتاحية</label><input name="keywords" /></div>
        <div class="field wide"><label>وصف مختصر</label><textarea name="description"></textarea></div>
        <label class="drop-zone wide">
          <strong>مسح أو رفع الوثيقة</strong>
          <span class="muted">يمكن استعمال كاميرا الهاتف أو ملف PDF/صورة من الحاسوب.</span>
          <input name="files" type="file" accept="image/*,.pdf,.doc,.docx,.tif,.tiff" capture="environment" multiple />
        </label>
        <div class="form-actions wide">
          <button class="primary-btn" type="submit">حفظ الوثيقة داخل الملف</button>
          <span class="muted">${boxes.length} علبة · ${folders.length} ملف جاهز</span>
        </div>
      </form>
    </section>
  `;
}

function renderAccount() {
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>حسابي</h3>
          <span class="muted">${h(state.user.fullName)} · ${h(state.user.role)} · ${h(state.user.department || "")}</span>
        </div>
      </div>
      <form class="form-grid account-form" id="passwordForm">
        <div class="field"><label>كلمة المرور الحالية</label><input name="currentPassword" type="password" autocomplete="current-password" required /></div>
        <div class="field"><label>كلمة المرور الجديدة</label><input name="newPassword" type="password" autocomplete="new-password" minlength="8" required /></div>
        <div class="field"><label>تأكيد كلمة المرور</label><input name="confirmPassword" type="password" autocomplete="new-password" minlength="8" required /></div>
        <div class="field"><label>إدارة الحسابات</label><div class="hint">${isAdmin() ? "يمكنك إنشاء الحسابات وتغيير أدوارها من شاشة الموظفين." : "تغيير حسابات المستخدمين محصور في الحساب الأساسي أو المدير."}</div></div>
        <div class="form-actions wide"><button class="primary-btn" type="submit">تغيير كلمة المرور</button></div>
      </form>
    </section>
  `;
}

function renderStorage() {
  const cfg = state.storage || {};
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>التخزين والنسخ الاحتياطي</h3>
          <span class="muted">البيانات محفوظة محليا داخل مجلد المشروع، ويمكن توثيق حساب Google Drive أو مزامنة مجلد النسخ عبر Google Drive for desktop.</span>
        </div>
        <button class="primary-btn" data-action="backup">إنشاء نسخة الآن</button>
      </div>
      <form class="form-grid" id="storageForm">
        <div class="field">
          <label>وضع التخزين</label>
          <select name="mode">
            <option value="local" ${cfg.mode !== "google-drive" ? "selected" : ""}>محلي</option>
            <option value="google-drive" ${cfg.mode === "google-drive" ? "selected" : ""}>Google Drive</option>
          </select>
        </div>
        <div class="field"><label>مجلد النسخ المحلي</label><input name="localBackupDir" value="${h(cfg.localBackupDir || "data/backups")}" /></div>
        <div class="field"><label>حساب Google Drive</label><input name="googleDriveEmail" type="email" value="${h(cfg.googleDriveEmail || "")}" placeholder="name@example.com" /></div>
        <div class="field"><label>معرف/رابط مجلد Google Drive</label><input name="googleDriveFolderId" value="${h(cfg.googleDriveFolderId || "")}" /></div>
        <div class="field wide"><label>ملاحظات التخزين</label><textarea name="notes">${h(cfg.notes || "")}</textarea></div>
        <div class="form-actions wide">
          <button class="primary-btn" type="submit">حفظ الإعدادات</button>
          <span class="muted">آخر نسخة: ${h(cfg.lastBackupFile || "لا توجد")}</span>
        </div>
      </form>
    </section>
    ${renderBackups()}
  `;
}

function renderSmartSearch() {
  const filters = state.searchFilters;
  const result = state.searchResults;
  const boxes = state.data.boxes || [];
  const hasCriteria = hasSearchCriteria();
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>البحث الذكي</h3>
          <span class="muted">فهرسة داخلية للوثائق والملفات والعلب مع توسيع بالمكنز والكلمات المفتاحية.</span>
        </div>
        <button class="primary-btn" data-action="runSearch">تحديث الفهرس</button>
      </div>
      <form class="advanced-search" id="advancedSearchForm">
        <div class="field">
          <label>نوع السجل</label>
          <select name="type">
            ${[
              ["all", "الكل"],
              ["document", "وثائق"],
              ["folder", "ملفات"],
              ["box", "علب"],
              ["versement", "دفعات"]
            ].map(([value, label]) => `<option value="${value}" ${filters.type === value ? "selected" : ""}>${label}</option>`).join("")}
          </select>
        </div>
        <div class="field"><label>الجهة المنتجة</label><input name="producer" value="${h(filters.producer)}" /></div>
        <div class="field"><label>الحالة</label><input name="status" value="${h(filters.status)}" /></div>
        <div class="field"><label>درجة السرية</label><input name="confidentiality" value="${h(filters.confidentiality)}" /></div>
        <div class="field">
          <label>العلبة</label>
          <select name="boxId">
            <option value="">كل العلب</option>
            ${boxes.map(box => `<option value="${h(box.id)}" ${filters.boxId === box.id ? "selected" : ""}>${h(box.number)} · ${h(box.archivalCode || "")}</option>`).join("")}
          </select>
        </div>
        <div class="field"><label>من تاريخ</label><input name="dateFrom" type="date" value="${h(filters.dateFrom)}" /></div>
        <div class="field"><label>إلى تاريخ</label><input name="dateTo" type="date" value="${h(filters.dateTo)}" /></div>
        <div class="form-actions">
          <button class="primary-btn" type="submit">بحث</button>
          <button class="secondary-btn" type="button" data-action="clearSearch">مسح</button>
        </div>
      </form>
      ${state.searchLoading ? `<div class="empty">جاري بناء الفهرس وتحليل المصطلحات...</div>` : ""}
      ${!state.searchLoading && !hasCriteria ? `<div class="empty">اكتب عبارة في مربع البحث أعلى الصفحة أو اختر مرشحا للبحث المتقدم.</div>` : ""}
      ${!state.searchLoading && hasCriteria && result ? `
        <div class="search-summary">
          <span class="badge green">${result.total || 0} نتيجة</span>
          <span class="badge">${result.index?.records || 0} سجل مفهرس</span>
          <span class="badge">${result.index?.terms || 0} مصطلح</span>
        </div>
        ${renderThesaurusHints(result.suggestions || [])}
        <div class="search-layout">
          <div class="search-results">
            ${(result.items || []).map(renderSearchResult).join("") || `<div class="empty">لا توجد نتائج مطابقة للمعايير الحالية.</div>`}
          </div>
          <aside class="facet-panel">
            <h3>توزيع النتائج</h3>
            ${renderFacetGroup("النوع", result.facets?.type)}
            ${renderFacetGroup("الحالة", result.facets?.status)}
            ${renderFacetGroup("الجهة", result.facets?.producer)}
          </aside>
        </div>
      ` : ""}
    </section>
  `;
}

function renderSearchResult(item) {
  const openLabel = item.collection === "boxes" ? "محتويات العلبة" : "فتح السجل";
  return `
    <article class="search-result">
      <div>
        <div class="result-head">
          <span class="badge">${h(item.label)}</span>
          <span class="score">درجة المطابقة ${h(item.score)}</span>
        </div>
        <h3>${h(item.title || item.number)}</h3>
        <p>${h(item.snippet || item.summary || "—")}</p>
        <div class="result-meta">
          <span>${h(item.number || "بدون رقم")}</span>
          <span>${h(item.path || "مسار غير محدد")}</span>
          <span>${formatDate(item.date)}</span>
        </div>
        <div class="term-pills">
          ${(item.matchedFields || []).map(term => `<span>${h(term)}</span>`).join("")}
        </div>
      </div>
      <button class="secondary-btn" data-action="openSearchResult" data-collection="${h(item.collection)}" data-id="${h(item.id)}" data-query="${h(item.number || item.title || "")}">${openLabel}</button>
    </article>
  `;
}

function renderThesaurusHints(items) {
  if (!items.length) return "";
  return `
    <div class="thesaurus-hints">
      ${items.map(item => `
        <div>
          <strong>${h(item.term)}</strong>
          <span>${[...(item.synonyms || []), ...(item.narrowerTerms || [])].slice(0, 8).map(h).join(" · ")}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderFacetGroup(title, values = {}) {
  const entries = Object.entries(values || {}).filter(([, value]) => value);
  if (!entries.length) return "";
  return `
    <div class="facet-group">
      <strong>${h(title)}</strong>
      ${entries.slice(0, 7).map(([key, value]) => `<span><em>${h(key)}</em><b>${h(value)}</b></span>`).join("")}
    </div>
  `;
}

function renderBackups() {
  return `
    <section class="panel">
      <div class="panel-header">
        <div>
          <h3>إدارة النسخ الاحتياطية</h3>
          <span class="muted">يتم حفظ نسخة من قاعدة البيانات داخل data/backups.</span>
        </div>
        <button class="primary-btn" data-action="backup">إنشاء نسخة الآن</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>اسم الملف</th><th>الحجم</th><th>تاريخ الإنشاء</th><th>إجراء</th></tr></thead>
          <tbody>
            ${state.backups.map(item => `<tr><td>${h(item.file)}</td><td>${(item.size / 1024).toFixed(1)} KB</td><td>${formatDate(item.createdAt)}</td><td><button class="secondary-btn" data-action="downloadBackup" data-file="${h(item.file)}">تحميل</button></td></tr>`).join("") || `<tr><td colspan="4" class="empty">لا توجد نسخ بعد.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderAudit() {
  const logs = filtered(state.stats?.latestLogs || state.data.auditLogs || []);
  return `
    <section class="panel">
      <div class="panel-header">
        <h3>سجل النشاط والتدقيق</h3>
        <button class="secondary-btn" data-action="refresh">تحديث</button>
      </div>
      <div class="activity">
        ${(state.stats?.latestLogs || []).map(log => `
          <div class="activity-item">
            <span class="activity-dot"></span>
            <div>
              <strong>${h(log.userName)} · ${h(log.action)} · ${h(log.entity)}</strong>
              <span>${formatDate(log.createdAt)} · ${h(log.entityId || "")}</span>
            </div>
          </div>
        `).join("") || `<div class="empty">لا يوجد نشاط مسجل.</div>`}
      </div>
    </section>
  `;
}

function renderYearBars(values = {}) {
  const entries = Object.entries(values);
  if (!entries.length) return `<div class="empty">لا توجد بيانات رسم بياني بعد.</div>`;
  const max = Math.max(...entries.map(([, value]) => value), 1);
  return `<div class="chart-bars">${entries.map(([year, value]) => `
    <div class="bar" style="height:${Math.max(24, (value / max) * 190)}px" title="${h(value)}">
      <span>${h(year)}</span>
    </div>
  `).join("")}</div>`;
}

function renderModal() {
  if (state.modal.type === "form") return renderFormModal();
  if (state.modal.type === "upload") return renderUploadModal();
  if (state.modal.type === "boxDetail") return renderBoxDetailModal();
  if (state.modal.type === "boxQr") return renderBoxQrModal();
  if (state.modal.type === "resetPassword") return renderResetPasswordModal();
  return "";
}

function renderFormModal() {
  const { collection, item = {} } = state.modal;
  const cfg = config[collection];
  return `
    <div class="modal-backdrop">
      <form class="modal" id="recordForm">
        <div class="modal-head">
          <h3>${item.id ? "تعديل" : "إضافة"} ${cfg.single}</h3>
          <button class="icon-btn" type="button" data-action="close">×</button>
        </div>
        <div class="modal-body">
          ${["documents", "folders"].includes(collection) ? renderBoxPicker(item.boxId) : ""}
          <div class="form-grid">
            ${cfg.fields.map(f => renderInput(f, item)).join("")}
          </div>
        </div>
        <div class="modal-foot">
          <button class="primary-btn" type="submit">حفظ</button>
          <button class="secondary-btn" type="button" data-action="close">إلغاء</button>
        </div>
      </form>
    </div>
  `;
}

function renderBoxPicker(selectedId = "") {
  const boxes = state.data.boxes || [];
  if (!boxes.length) return `<div class="empty">أضف علبة أولا حتى تتمكن من ربط الملفات أو الوثائق بها.</div>`;
  return `
    <div class="box-picker" aria-label="اختيار العلبة">
      ${boxes.map(box => `
        <button type="button" class="archive-box-card small ${box.id === selectedId ? "selected" : ""}" data-action="pickBox" data-id="${h(box.id)}">
          <span class="box-lid"></span>
          <strong>${h(box.number || "علبة")}</strong>
          <small>${h(box.archivalCode || "")}</small>
          <em>${h(box.shelf || box.room || "غير محدد")}</em>
        </button>
      `).join("")}
    </div>
  `;
}

function renderBoxDetailModal() {
  const box = (state.data.boxes || []).find(item => item.id === state.modal.id);
  if (!box) return "";
  const folders = (state.data.folders || []).filter(item => item.boxId === box.id);
  const folderIds = new Set(folders.map(item => item.id));
  const docs = (state.data.documents || []).filter(item => item.boxId === box.id || folderIds.has(item.folderId));
  return `
    <div class="modal-backdrop">
      <div class="modal">
        <div class="modal-head">
          <h3>محتويات العلبة ${h(box.number)}</h3>
          <button class="icon-btn" type="button" data-action="close">×</button>
        </div>
        <div class="modal-body">
          <div class="box-detail-head">
            <div class="archive-box-card selected static"><span class="box-lid"></span><strong>${h(box.number)}</strong><small>${h(box.archivalCode || "")}</small><em>${h(box.shelf || "")}</em></div>
            <div class="activity">
              <div class="activity-item"><span class="activity-dot"></span><div><strong>الموقع</strong><span>${h([box.physicalLocation, box.room, box.shelf].filter(Boolean).join(" / ") || "غير محدد")}</span></div></div>
              <div class="activity-item"><span class="activity-dot"></span><div><strong>نوع الوثائق</strong><span>${h(box.documentType || "غير محدد")}</span></div></div>
              <div class="activity-item"><span class="activity-dot"></span><div><strong>الملفات والوثائق</strong><span>${folders.length} ملف · ${docs.length} وثيقة</span></div></div>
            </div>
          </div>
          <div class="grid-2">
            <section>
              <h3>الملفات داخل العلبة</h3>
              <div class="activity">${folders.map(folder => `<div class="activity-item"><span class="activity-dot"></span><div><strong>${h(folder.title)}</strong><span>${h(folder.number)} · ${formatDate(folder.dateStart)} - ${formatDate(folder.dateEnd)}</span></div></div>`).join("") || `<div class="empty">لا توجد ملفات داخل هذه العلبة.</div>`}</div>
            </section>
            <section>
              <h3>الوثائق</h3>
              <div class="activity">${docs.map(doc => `<div class="activity-item"><span class="activity-dot"></span><div><strong>${h(doc.title)}</strong><span>${h(doc.number)} · ${h(doc.status || "")}</span></div></div>`).join("") || `<div class="empty">لا توجد وثائق مرتبطة بهذه العلبة.</div>`}</div>
            </section>
          </div>
        </div>
        <div class="modal-foot">
          <button class="primary-btn" data-action="boxQr" data-id="${h(box.id)}">عرض QR</button>
          <button class="secondary-btn" data-action="edit" data-collection="boxes" data-id="${h(box.id)}">تعديل العلبة</button>
          <button class="secondary-btn" type="button" data-action="close">إغلاق</button>
        </div>
      </div>
    </div>
  `;
}

function renderBoxQrModal() {
  const box = (state.data.boxes || []).find(item => item.id === state.modal.id);
  return `
    <div class="modal-backdrop">
      <div class="modal qr-modal">
        <div class="modal-head">
          <h3>QR العلبة ${h(box?.number || "")}</h3>
          <button class="icon-btn" type="button" data-action="close">×</button>
        </div>
        <div class="modal-body qr-print" id="qrPrintArea">
          <div class="qr-card">
            <img alt="QR" data-qr-id="${h(state.modal.id)}" />
            <div>
              <h3>${h(box?.number || "علبة")}</h3>
              <p>${h(box?.archivalCode || "")}</p>
              <span>${h([box?.physicalLocation, box?.room, box?.shelf].filter(Boolean).join(" / "))}</span>
              <p class="muted">امسح الرمز من هاتف متصل بنفس الشبكة لفتح محتويات العلبة.</p>
              <a class="secondary-btn" href="/box-view/${h(encodeURIComponent(state.modal.id))}" target="_blank" data-box-link-id="${h(state.modal.id)}">فتح صفحة المحتويات</a>
            </div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="primary-btn" data-action="printQr">طباعة الملصق</button>
          <button class="secondary-btn" type="button" data-action="close">إغلاق</button>
        </div>
      </div>
    </div>
  `;
}

function renderResetPasswordModal() {
  const user = (state.data.users || []).find(item => item.id === state.modal.id);
  return `
    <div class="modal-backdrop">
      <form class="modal qr-modal" id="resetPasswordForm">
        <div class="modal-head">
          <h3>إعادة تعيين كلمة المرور</h3>
          <button class="icon-btn" type="button" data-action="close">×</button>
        </div>
        <div class="modal-body">
          <p class="muted">${h(user?.fullName || "")} · ${h(user?.username || "")}</p>
          <div class="field"><label>كلمة المرور الجديدة</label><input name="newPassword" type="password" minlength="8" required /></div>
          <div class="field"><label>تأكيد كلمة المرور</label><input name="confirmPassword" type="password" minlength="8" required /></div>
        </div>
        <div class="modal-foot">
          <button class="primary-btn" type="submit">تعيين كلمة المرور</button>
          <button class="secondary-btn" type="button" data-action="close">إلغاء</button>
        </div>
      </form>
    </div>
  `;
}

function renderUploadModal() {
  const doc = (state.data.documents || []).find(item => item.id === state.modal.id);
  return `
    <div class="modal-backdrop">
      <form class="modal" id="uploadForm">
        <div class="modal-head">
          <h3>مرفقات الوثيقة</h3>
          <button class="icon-btn" type="button" data-action="close">×</button>
        </div>
        <div class="modal-body">
          <p class="muted">${h(doc?.title || "")}</p>
          <label class="drop-zone">
            <strong>اختر ملفات رقمية</strong>
            <span class="muted">PDF, DOCX, PNG, JPG, TIFF, ZIP</span>
            <input name="file" type="file" multiple />
          </label>
          <div class="file-list">
            ${(doc?.attachments || []).map(file => `
              <div class="file-row">
                <span>${h(file.originalName)} · ${(Number(file.size || 0) / 1024).toFixed(1)} KB</span>
                <a class="secondary-btn" href="${h(file.url)}" target="_blank">فتح</a>
              </div>
            `).join("") || `<div class="empty">لا توجد مرفقات لهذه الوثيقة.</div>`}
          </div>
        </div>
        <div class="modal-foot">
          <button class="primary-btn" type="submit">رفع الملفات</button>
          <button class="secondary-btn" type="button" data-action="close">إغلاق</button>
        </div>
      </form>
    </div>
  `;
}

function renderInput(f, item) {
  const value = item[f.key] ?? "";
  const wide = f.wide ? "wide" : "";
  if (f.type === "textarea") {
    return `<div class="field ${wide}"><label>${f.label}</label><textarea name="${f.key}">${h(value)}</textarea></div>`;
  }
  if (f.type === "select") {
    return `<div class="field ${wide}"><label>${f.label}</label><select name="${f.key}">
      ${normalizeOptions(f.options).map(opt => `<option value="${h(opt.value)}" ${String(value) === String(opt.value) ? "selected" : ""}>${h(opt.label)}</option>`).join("")}
    </select></div>`;
  }
  if (f.type === "relation") {
    const options = state.data[f.source] || [];
    return `<div class="field ${wide}"><label>${f.label}</label><select name="${f.key}" ${f.key === "boxId" ? `data-box-select="true"` : ""}>
      <option value="">غير محدد</option>
      ${options.map(opt => `<option value="${h(opt.id)}" ${String(value) === String(opt.id) ? "selected" : ""}>${h(opt[f.labelKey] || opt.name || opt.title || opt.number)}</option>`).join("")}
    </select></div>`;
  }
  return `<div class="field ${wide}"><label>${f.label}</label><input name="${f.key}" type="${f.type}" value="${h(value)}" ${f.key === "password" && item.id ? `placeholder="اتركها فارغة للحفاظ على كلمة المرور"` : ""} /></div>`;
}

function normalizeOptions(options) {
  return options.map(option => Array.isArray(option) ? { value: option[0], label: option[1] } : { value: option, label: option });
}

function labelFor(cfg, key) {
  const labels = {
    name: "الاسم",
    code: "الرمز",
    manager: "المسؤول",
    active: "الحالة",
    number: "الرقم",
    producer: "الجهة المنتجة",
    transferDate: "تاريخ التحويل",
    periodStart: "من",
    periodEnd: "إلى",
    boxesCount: "عدد العلب",
    status: "الحالة",
    archivalCode: "الكود",
    versementId: "الدفعة",
    physicalLocation: "الموقع",
    room: "الغرفة",
    shelf: "الرف",
    preservationStatus: "الحفظ",
    title: "العنوان",
    boxId: "العلبة",
    folderId: "الملف",
    dateStart: "من",
    dateEnd: "إلى",
    keywords: "الكلمات",
    type: "النوع",
    confidentiality: "السرية",
    retentionYears: "الحفظ",
    attachments: "المرفقات",
    beneficiary: "المستفيد",
    documentId: "الوثيقة",
    reason: "السبب",
    requestDate: "الطلب",
    dueDate: "آخر أجل",
    returnDate: "الإرجاع",
    borrower: "المستعير",
    borrowedAt: "الإعارة",
    returnedAt: "الإرجاع",
    fullName: "الاسم",
    username: "المستخدم",
    role: "الدور",
    department: "المصلحة",
    documentType: "نوع الوثيقة",
    years: "السنوات",
    finalAction: "الإجراء",
    capacity: "السعة",
    used: "المستعمل",
    term: "المصطلح",
    synonyms: "المرادفات",
    broaderTerm: "الأوسع",
    narrowerTerms: "الأضيق"
  };
  return labels[key] || key;
}

function cell(collection, key, item) {
  const value = item[key];
  if (key === "active") return statusBadge(value === false || value === "false" ? "معطل" : "نشط");
  if (["status", "preservationStatus", "confidentiality"].includes(key)) return statusBadge(value);
  if (key === "attachments") return `<span class="badge">${(item.attachments || []).length}</span>`;
  if (key.endsWith("Date") || key.endsWith("At") || key === "transferDate" || key === "periodStart" || key === "periodEnd") return formatDate(value);
  if (key === "versementId") return resolve("versements", value, "number");
  if (key === "boxId") return resolve("boxes", value, "number");
  if (key === "folderId") return resolve("folders", value, "title");
  if (key === "documentId") return resolve("documents", value, "title");
  return h(value || "—");
}

function resolve(collection, id, labelKey) {
  const item = (state.data[collection] || []).find(entry => entry.id === id);
  return h(item ? (item[labelKey] || item.title || item.name || item.number) : "—");
}

function filtered(items) {
  const q = state.search.trim().toLowerCase();
  if (!q) return items;
  return items.filter(item => JSON.stringify(item).toLowerCase().includes(q));
}

function hasSearchCriteria() {
  return Boolean(
    state.search.trim() ||
    state.searchFilters.type !== "all" ||
    state.searchFilters.producer ||
    state.searchFilters.status ||
    state.searchFilters.confidentiality ||
    state.searchFilters.boxId ||
    state.searchFilters.dateFrom ||
    state.searchFilters.dateTo
  );
}

function buildSearchParams() {
  const params = new URLSearchParams();
  if (state.search.trim()) params.set("q", state.search.trim());
  Object.entries(state.searchFilters).forEach(([key, value]) => {
    if (value && !(key === "type" && value === "all")) params.set(key, value);
  });
  return params.toString();
}

function syncSearchFilters(form) {
  const data = new FormData(form);
  state.searchFilters = {
    type: data.get("type") || "all",
    producer: data.get("producer") || "",
    status: data.get("status") || "",
    confidentiality: data.get("confidentiality") || "",
    boxId: data.get("boxId") || "",
    dateFrom: data.get("dateFrom") || "",
    dateTo: data.get("dateTo") || ""
  };
}

async function executeSearch() {
  if (!hasSearchCriteria()) {
    state.searchResults = null;
    state.searchLoading = false;
    render();
    return;
  }
  state.searchLoading = true;
  render();
  try {
    const params = buildSearchParams();
    state.searchResults = await api(`/search?${params}`);
  } catch (err) {
    toast(err.message);
  } finally {
    state.searchLoading = false;
    render();
  }
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return h(value);
  return date.toLocaleDateString("ar-DZ");
}

function bind() {
  const loginForm = document.querySelector("#loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", submitLogin);
    return;
  }

  document.querySelectorAll("[data-action]").forEach(el => {
    el.addEventListener("click", handleAction);
  });

  const search = document.querySelector("#globalSearch");
  if (search) {
    search.addEventListener("input", event => {
      state.search = event.target.value;
      window.clearTimeout(search._timer);
      search._timer = window.setTimeout(() => {
        if (state.section === "search") executeSearch();
        else render();
      }, 220);
    });
  }

  const advancedSearchForm = document.querySelector("#advancedSearchForm");
  if (advancedSearchForm) {
    advancedSearchForm.addEventListener("submit", event => {
      event.preventDefault();
      syncSearchFilters(advancedSearchForm);
      executeSearch();
    });
    advancedSearchForm.addEventListener("input", () => {
      syncSearchFilters(advancedSearchForm);
      window.clearTimeout(advancedSearchForm._timer);
      advancedSearchForm._timer = window.setTimeout(executeSearch, 260);
    });
    advancedSearchForm.addEventListener("change", () => {
      syncSearchFilters(advancedSearchForm);
      executeSearch();
    });
  }

  const recordForm = document.querySelector("#recordForm");
  if (recordForm) recordForm.addEventListener("submit", submitRecord);

  const uploadForm = document.querySelector("#uploadForm");
  if (uploadForm) uploadForm.addEventListener("submit", submitUpload);

  const resetPasswordForm = document.querySelector("#resetPasswordForm");
  if (resetPasswordForm) resetPasswordForm.addEventListener("submit", submitResetPassword);

  const passwordForm = document.querySelector("#passwordForm");
  if (passwordForm) passwordForm.addEventListener("submit", submitPassword);

  const storageForm = document.querySelector("#storageForm");
  if (storageForm) storageForm.addEventListener("submit", submitStorage);

  const scanForm = document.querySelector("#scanForm");
  if (scanForm) {
    scanForm.addEventListener("submit", submitScan);
    scanForm.boxId.addEventListener("change", filterScanFolders);
    filterScanFolders({ currentTarget: scanForm.boxId });
  }

  document.querySelectorAll("[data-qr-id]").forEach(loadQrImage);
  document.querySelectorAll("[data-box-link-id]").forEach(loadPublicBoxLink);
}

async function submitLogin(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const error = document.querySelector("#loginError");
  error.textContent = "";
  try {
    const payload = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        username: form.get("username"),
        password: form.get("password")
      })
    });
    state.token = payload.token;
    state.user = payload.user;
    state.roles = payload.roles;
    localStorage.setItem("archive_token", state.token);
    await loadAll();
    toast("تم تسجيل الدخول بنجاح.");
    render();
  } catch (err) {
    error.textContent = err.message;
  }
}

async function handleAction(event) {
  const button = event.currentTarget;
  const action = button.dataset.action;

  if (action === "nav") {
    state.section = button.dataset.section;
    state.sidebarOpen = false;
    state.search = "";
    state.searchResults = null;
    render();
    return;
  }
  if (action === "mobile") {
    state.sidebarOpen = !state.sidebarOpen;
    render();
    return;
  }
  if (action === "theme") {
    state.theme = state.theme === "dark" ? "light" : "dark";
    localStorage.setItem("archive_theme", state.theme);
    render();
    return;
  }
  if (action === "logout") {
    await api("/auth/logout", { method: "POST", body: "{}" }).catch(() => null);
    localStorage.removeItem("archive_token");
    state.token = "";
    state.user = null;
    render();
    return;
  }
  if (action === "new") {
    state.modal = { type: "form", collection: button.dataset.collection, item: {} };
    render();
    return;
  }
  if (action === "edit") {
    const collection = button.dataset.collection;
    const item = (state.data[config[collection].endpoint] || []).find(entry => entry.id === button.dataset.id);
    state.modal = { type: "form", collection, item: { ...item, active: item?.active === false ? "false" : "true" } };
    render();
    return;
  }
  if (action === "delete") {
    await deleteRecord(button.dataset.collection, button.dataset.id);
    return;
  }
  if (action === "pickBox") {
    const select = document.querySelector('[data-box-select="true"]');
    if (select) {
      select.value = button.dataset.id;
      document.querySelectorAll(".box-picker .archive-box-card").forEach(el => el.classList.toggle("selected", el === button));
    }
    return;
  }
  if (action === "boxDetail") {
    state.modal = { type: "boxDetail", id: button.dataset.id };
    render();
    return;
  }
  if (action === "boxQr") {
    state.modal = { type: "boxQr", id: button.dataset.id };
    render();
    return;
  }
  if (action === "resetPassword") {
    state.modal = { type: "resetPassword", id: button.dataset.id };
    render();
    return;
  }
  if (action === "upload") {
    state.modal = { type: "upload", id: button.dataset.id };
    render();
    return;
  }
  if (action === "backup") {
    await createBackup();
    return;
  }
  if (action === "downloadBackup") {
    await downloadBackup(button.dataset.file);
    return;
  }
  if (action === "runSearch") {
    await executeSearch();
    return;
  }
  if (action === "clearSearch") {
    state.search = "";
    state.searchFilters = { type: "all", producer: "", status: "", confidentiality: "", boxId: "", dateFrom: "", dateTo: "" };
    state.searchResults = null;
    render();
    return;
  }
  if (action === "openSearchResult") {
    state.section = button.dataset.collection;
    state.search = button.dataset.query || "";
    if (button.dataset.collection === "boxes") state.modal = { type: "boxDetail", id: button.dataset.id };
    render();
    return;
  }
  if (action === "printQr") {
    printElement("qrPrintArea", "ملصق QR");
    return;
  }
  if (action === "printReport") {
    printElement("reportSheet", "تقرير الأرشيف");
    return;
  }
  if (action === "exportReportCsv") {
    exportReportCsv();
    return;
  }
  if (action === "exportReportJson") {
    exportReportJson();
    return;
  }
  if (action === "refresh") {
    await refresh();
    return;
  }
  if (action === "close") {
    state.modal = null;
    render();
  }
}

async function submitRecord(event) {
  event.preventDefault();
  const { collection, item } = state.modal;
  const cfg = config[collection];
  const form = new FormData(event.currentTarget);
  const payload = {};
  for (const f of cfg.fields) {
    const value = form.get(f.key);
    if (f.key === "password" && !value) continue;
    if (f.key === "active") payload[f.key] = value === "true";
    else if (f.type === "number") payload[f.key] = value === "" ? "" : Number(value);
    else payload[f.key] = value;
  }
  const method = item.id ? "PUT" : "POST";
  const path = item.id ? `/${cfg.endpoint}/${item.id}` : `/${cfg.endpoint}`;
  await api(path, { method, body: JSON.stringify(payload) });
  state.modal = null;
  toast("تم حفظ السجل.");
  await refresh();
}

async function submitUpload(event) {
  event.preventDefault();
  const input = event.currentTarget.querySelector('input[type="file"]');
  if (!input.files.length) {
    toast("اختر ملفاً واحداً على الأقل.");
    return;
  }
  const form = new FormData();
  form.append("documentId", state.modal.id);
  [...input.files].forEach(file => form.append("file", file));
  await api("/upload", { method: "POST", body: form, headers: {} });
  toast("تم رفع المرفقات.");
  state.modal = null;
  await refresh();
}

async function submitPassword(event) {
  event.preventDefault();
  try {
    const form = new FormData(event.currentTarget);
    const newPassword = form.get("newPassword");
    if (newPassword !== form.get("confirmPassword")) {
      toast("تأكيد كلمة المرور غير مطابق.");
      return;
    }
    const payload = {
      currentPassword: form.get("currentPassword"),
      newPassword
    };
    const result = await api("/auth/change-password", { method: "POST", body: JSON.stringify(payload) });
    state.user = result.user || state.user;
    event.currentTarget.reset();
    toast("تم تغيير كلمة المرور بنجاح.");
  } catch (err) {
    toast(err.message);
  }
}

async function submitStorage(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const payload = Object.fromEntries(form.entries());
  state.storage = await api("/storage", { method: "PUT", body: JSON.stringify(payload) });
  toast("تم حفظ إعدادات التخزين.");
  render();
}

async function submitResetPassword(event) {
  event.preventDefault();
  try {
    const form = new FormData(event.currentTarget);
    const newPassword = form.get("newPassword");
    if (newPassword !== form.get("confirmPassword")) {
      toast("تأكيد كلمة المرور غير مطابق.");
      return;
    }
    await api(`/users/${state.modal.id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ newPassword })
    });
    state.modal = null;
    toast("تمت إعادة تعيين كلمة المرور.");
    await refresh();
  } catch (err) {
    toast(err.message);
  }
}

function filterScanFolders(event) {
  const boxId = event.currentTarget.value;
  const form = event.currentTarget.form;
  const folderSelect = form.folderId;
  [...folderSelect.options].forEach(option => {
    if (!option.value) {
      option.hidden = false;
      return;
    }
    option.hidden = Boolean(boxId) && option.dataset.boxId !== boxId;
  });
  if (folderSelect.selectedOptions[0]?.hidden) folderSelect.value = "";
}

async function submitScan(event) {
  event.preventDefault();
  try {
    const form = new FormData(event.currentTarget);
    const files = [...event.currentTarget.querySelector('input[name="files"]').files];
    const folder = (state.data.folders || []).find(item => item.id === form.get("folderId"));
    const boxId = folder?.boxId || form.get("boxId");
    if (!boxId || !form.get("folderId")) {
      toast("اختر العلبة والملف قبل حفظ الوثيقة.");
      return;
    }
    const payload = {
      number: form.get("number"),
      title: form.get("title"),
      type: form.get("type"),
      boxId,
      folderId: form.get("folderId"),
      producer: form.get("producer"),
      productionDate: form.get("productionDate"),
      confidentiality: form.get("confidentiality"),
      format: files.length ? "مختلط" : "ورقي",
      language: "العربية",
      retentionYears: form.get("retentionYears") ? Number(form.get("retentionYears")) : "",
      legalStatus: "ساري",
      status: form.get("status"),
      keywords: form.get("keywords"),
      description: form.get("description"),
      attachments: []
    };
    const created = await api("/documents", { method: "POST", body: JSON.stringify(payload) });
    if (files.length) {
      const upload = new FormData();
      upload.append("documentId", created.item.id);
      files.forEach(file => upload.append("file", file));
      await api("/upload", { method: "POST", body: upload, headers: {} });
    }
    event.currentTarget.reset();
    toast("تم حفظ الوثيقة وربطها بالملف والعلبة.");
    await refresh();
    state.section = "documents";
    render();
  } catch (err) {
    toast(err.message);
  }
}

async function deleteRecord(collection, id) {
  const cfg = config[collection];
  if (!confirm("هل تريد حذف هذا السجل؟")) return;
  await api(`/${cfg.endpoint}/${id}`, { method: "DELETE" });
  toast("تم حذف السجل.");
  await refresh();
}

async function createBackup() {
  const result = await api("/backups", { method: "POST", body: "{}" });
  toast(`تم إنشاء النسخة: ${result.file}`);
  await refresh();
}

async function downloadBackup(file) {
  const response = await fetch(`${API}/backups/${encodeURIComponent(file)}`, {
    headers: { Authorization: `Bearer ${state.token}` }
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || "تعذر تحميل النسخة الاحتياطية.");
  }
  const blob = await response.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = file;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function loadQrImage(img) {
  const response = await fetch(`${API}/boxes/${encodeURIComponent(img.dataset.qrId)}/qr.svg`, {
    headers: { Authorization: `Bearer ${state.token}` }
  });
  if (!response.ok) return;
  const blob = await response.blob();
  img.src = URL.createObjectURL(blob);
}

async function loadPublicBoxLink(link) {
  const response = await fetch(`${API}/boxes/${encodeURIComponent(link.dataset.boxLinkId)}/qr-target`, {
    headers: { Authorization: `Bearer ${state.token}` }
  });
  if (!response.ok) return;
  const payload = await response.json();
  link.href = payload.url;
  link.textContent = "فتح صفحة المحتويات";
  link.insertAdjacentHTML("afterend", `<div class="muted qr-link">${h(payload.url)}</div>`);
}

function printElement(id, title) {
  const node = document.getElementById(id);
  if (!node) return;
  const win = window.open("", "_blank", "width=860,height=900");
  win.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${h(title)}</title><link rel="stylesheet" href="/styles.css"></head><body><main class="print-page">${node.outerHTML}</main></body></html>`);
  win.document.close();
  win.focus();
  window.setTimeout(() => win.print(), 300);
}

function reportRows() {
  return (state.data.documents || []).map(doc => ({
    number: doc.number || "",
    title: doc.title || "",
    type: doc.type || "",
    producer: doc.producer || "",
    box: (state.data.boxes || []).find(box => box.id === doc.boxId)?.number || "",
    folder: (state.data.folders || []).find(folder => folder.id === doc.folderId)?.title || "",
    status: doc.status || "",
    retentionYears: doc.retentionYears || "",
    attachments: (doc.attachments || []).length
  }));
}

function exportReportCsv() {
  const rows = reportRows();
  const headers = ["number", "title", "type", "producer", "box", "folder", "status", "retentionYears", "attachments"];
  const csv = [headers.join(",")].concat(rows.map(row => headers.map(key => `"${String(row[key]).replaceAll('"', '""')}"`).join(","))).join("\n");
  downloadText(`archive-report-${Date.now()}.csv`, csv, "text/csv;charset=utf-8");
}

function exportReportJson() {
  downloadText(`archive-report-${Date.now()}.json`, JSON.stringify({ generatedAt: new Date().toISOString(), stats: state.stats, rows: reportRows() }, null, 2), "application/json;charset=utf-8");
}

function downloadText(fileName, content, type) {
  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
}

async function refresh() {
  await loadAll();
  render();
}

function toast(message) {
  state.toast = message;
  window.clearTimeout(toast._timer);
  toast._timer = window.setTimeout(() => {
    state.toast = "";
    render();
  }, 2600);
}

boot();
