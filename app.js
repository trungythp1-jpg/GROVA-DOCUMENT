/* =========================================================
GROVA DOCUMENT
APP.JS — FIRESTORE DATABASE VERSION 203
========================================================= */

(() => {
“use strict”;

/* =======================================================
BASIC HELPERS
======================================================= */

const $ = (selector) =>
document.querySelector(selector);

const $$ = (selector) =>
[…document.querySelectorAll(selector)];

/* =======================================================
LOCAL CACHE KEYS
======================================================= */

const STORAGE = {

projects: "GROVA_PROJECTS_V1",
customers: "GROVA_CUSTOMERS_V1",
employees: "GROVA_EMPLOYEES_V1",
history: "GROVA_HISTORY_V1",
settings: "GROVA_SETTINGS_V1"

};

/* =======================================================
FIRESTORE COLLECTIONS
======================================================= */

const COLLECTION = {

users: "users",
projects: "projects",
customers: "customers",
employees: "employees",
history: "history",
settings: "settings"

};

/* =======================================================
PAGE INFORMATION
======================================================= */

const PAGE_INFO = {

dashboard: {
  title: "Tổng quan",
  subtitle: "Hệ thống quản lý hồ sơ và văn bản"
},
documents: {
  title: "Văn bản",
  subtitle: "Thư viện mẫu văn bản GROVA"
},
projects: {
  title: "Công trình",
  subtitle: "Quản lý công trình và tiến độ"
},
customers: {
  title: "Khách hàng",
  subtitle: "Quản lý thông tin khách hàng"
},
employees: {
  title: "Nhân sự",
  subtitle: "Quản lý thông tin nhân sự"
},
history: {
  title: "Lịch sử hoạt động",
  subtitle: "Nhật ký sử dụng hệ thống"
},
reports: {
  title: "Báo cáo",
  subtitle: "Tổng hợp dữ liệu GROVA"
},
settings: {
  title: "Cài đặt",
  subtitle: "Cấu hình hệ thống"
}

};

/* =======================================================
APPLICATION STATE
======================================================= */

let currentPage = “dashboard”;

let modalMode = “”;

let modalEditId = null;

let currentUser = null;

let firestore = null;

let firestoreReady = false;

let firestoreOnline = false;

let authObserverStarted = false;

let unsubscribe = {};

let dataState = {

projects: [],
customers: [],
employees: [],
history: [],
settings: null

};

/* =======================================================
STATIC DATA
======================================================= */

const DATA =
window.GROVA_DATA || {

  app: {
    name: "GROVA DOCUMENT",
    shortName: "GROVA DOC"
  },
  company: {
    name: "",
    taxCode: "",
    address: "",
    representative: "",
    position: ""
  },
  templates: []
};

/* =======================================================
LOCAL STORAGE
======================================================= */

function readStorage(
key,
fallback = []
) {

try {
  const raw =
    localStorage.getItem(key);
  if (!raw) {
    return fallback;
  }
  return JSON.parse(raw);
} catch (error) {
  console.error(
    "GROVA DOCUMENT storage read error:",
    error
  );
  return fallback;
}

}

function writeStorage(
key,
value
) {

try {
  localStorage.setItem(
    key,
    JSON.stringify(value)
  );
  return true;
} catch (error) {
  console.error(
    "GROVA DOCUMENT storage write error:",
    error
  );
  return false;
}

}

function removeStorage(
key
) {

try {
  localStorage.removeItem(key);
} catch (error) {
  console.warn(
    "GROVA DOCUMENT storage remove error:",
    error
  );
}

}

/* =======================================================
FIRESTORE INITIALIZATION
======================================================= */

function initFirestore() {

try {
  if (
    typeof firebase ===
    "undefined"
  ) {
    console.warn(
      "GROVA: Firebase SDK chưa được tải."
    );
    return false;
  }
  if (
    typeof firebase.firestore !==
    "function"
  ) {
    console.warn(
      "GROVA: Firestore SDK chưa được tải."
    );
    return false;
  }
  if (
    firebase.apps &&
    firebase.apps.length
  ) {
    firestore =
      firebase.firestore();
  } else {
    console.warn(
      "GROVA: Firebase App chưa được khởi tạo. auth.js phải khởi tạo Firebase trước app.js."
    );
    return false;
  }
  firestoreReady =
    Boolean(firestore);
  if (firestoreReady) {
    console.log(
      "GROVA: Firestore initialized."
    );
  }
  return firestoreReady;
} catch (error) {
  console.error(
    "GROVA: Firestore initialization error:",
    error
  );
  firestoreReady = false;
  return false;
}

}

/* =======================================================
CURRENT USER
======================================================= */

function getFirebaseUser() {

try {
  if (
    typeof firebase ===
    "undefined"
  ) {
    return null;
  }
  if (
    !firebase.auth ||
    !firebase.auth()
  ) {
    return null;
  }
  return firebase.auth().currentUser || null;
} catch (error) {
  return null;
}

}

function getUserId() {

const user =
  currentUser ||
  getFirebaseUser();
return user?.uid || null;

}

function requireUser() {

const uid =
  getUserId();
if (!uid) {
  showToast(
    "Vui lòng đăng nhập để sử dụng dữ liệu."
  );
  return false;
}
return true;

}

/* =======================================================
FIRESTORE REFERENCES
======================================================= */

function collectionRef(
name
) {

const uid =
  getUserId();
if (
  !firestoreReady ||
  !uid
) {
  return null;
}
return firestore
  .collection(COLLECTION.users)
  .doc(uid)
  .collection(name);

}

function documentRef(
collectionName,
id
) {

const ref =
  collectionRef(
    collectionName
  );
if (!ref) {
  return null;
}
return ref.doc(String(id));

}

function settingsRef() {

const uid =
  getUserId();
if (
  !firestoreReady ||
  !uid
) {
  return null;
}
return firestore
  .collection(COLLECTION.settings)
  .doc(uid);

}

/* =======================================================
FIRESTORE DATA CONVERSION
======================================================= */

function firestoreData(
data
) {

if (!data) {
  return null;
}
const result = {
  ...data
};
Object.keys(result).forEach(
  (key) => {
    const value =
      result[key];
    if (
      value &&
      typeof value.toDate ===
      "function"
    ) {
      result[key] =
        value.toDate().toISOString();
    }
  }
);
return result;

}

/* =======================================================
CACHE ACCESS
======================================================= */

function getProjects() {

if (Array.isArray(dataState.projects)) {
  return dataState.projects;
}
return readStorage(
  STORAGE.projects,
  []
);

}

function getCustomers() {

if (Array.isArray(dataState.customers)) {
  return dataState.customers;
}
return readStorage(
  STORAGE.customers,
  []
);

}

function getEmployees() {

if (Array.isArray(dataState.employees)) {
  return dataState.employees;
}
return readStorage(
  STORAGE.employees,
  []
);

}

function getHistory() {

if (Array.isArray(dataState.history)) {
  return dataState.history;
}
return readStorage(
  STORAGE.history,
  []
);

}

function getSettings() {

const defaults = {
  companyName:
    DATA.company?.name || "",
  taxCode:
    DATA.company?.taxCode || "",
  address:
    DATA.company?.address || "",
  representative:
    DATA.company?.representative || "",
  position:
    DATA.company?.position || "",
  userName:
    "Quản trị viên"
};
const cached =
  readStorage(
    STORAGE.settings,
    {}
  );
const firestoreSettings =
  dataState.settings || {};
return {
  ...defaults,
  ...(cached || {}),
  ...(firestoreSettings || {})
};

}

/* =======================================================
LOCAL CACHE UPDATE
======================================================= */

function cacheCollection(
key,
value
) {

const list =
  Array.isArray(value)
    ? value
    : [];
dataState[key] =
  list;
writeStorage(
  STORAGE[key],
  list
);

}

function cacheSettings(
value
) {

dataState.settings =
  value || null;
writeStorage(
  STORAGE.settings,
  value || {}
);

}

/* =======================================================
ID / DATE
======================================================= */

function createId(
prefix = “GROVA”
) {

return (
  prefix +
  "_" +
  Date.now().toString(36) +
  "_" +
  Math.random()
    .toString(36)
    .substring(2, 8)
);

}

function nowISO() {

return new Date().toISOString();

}

function formatDate(
value
) {

if (!value) {
  return "";
}
const date =
  new Date(value);
if (
  Number.isNaN(
    date.getTime()
  )
) {
  return value;
}
return date.toLocaleDateString(
  "vi-VN",
  {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }
);

}

function formatDateTime(
value
) {

if (!value) {
  return "";
}
const date =
  new Date(value);
if (
  Number.isNaN(
    date.getTime()
  )
) {
  return value;
}
return date.toLocaleString(
  "vi-VN",
  {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }
);

}

/* =======================================================
HTML SAFETY
======================================================= */

function escapeHTML(
value
) {

return String(value ?? "")
  .replace(
    /&/g,
    "&amp;"
  )
  .replace(
    /</g,
    "&lt;"
  )
  .replace(
    />/g,
    "&gt;"
  )
  .replace(
    /"/g,
    "&quot;"
  )
  .replace(
    /'/g,
    "&#039;"
  );

}

function slugStatus(
value
) {

return String(value || "")
  .normalize("NFD")
  .replace(
    /[\u0300-\u036f]/g,
    ""
  )
  .toLowerCase()
  .replace(
    /\s+/g,
    "-"
  );

}

/* =======================================================
TOAST
======================================================= */

function showToast(
message
) {

let container =
  document.querySelector(
    ".toast-container"
  );
if (!container) {
  container =
    document.createElement(
      "div"
    );
  container.className =
    "toast-container";
  document.body.appendChild(
    container
  );
}
const toast =
  document.createElement(
    "div"
  );
toast.className =
  "toast";
toast.textContent =
  message;
container.appendChild(
  toast
);
setTimeout(
  () => {
    toast.style.opacity =
      "0";
    toast.style.transform =
      "translateY(8px)";
    setTimeout(
      () => {
        toast.remove();
      },
      200
    );
  },
  2600
);

}

/* =======================================================
NAVIGATION
======================================================= */

function showPage(
page
) {

if (!PAGE_INFO[page]) {
  page =
    "dashboard";
}
currentPage =
  page;
$$(".page").forEach(
  (element) => {
    element.classList.toggle(
      "active",
      element.id ===
      `page-${page}`
    );
  }
);
$$(".nav-item").forEach(
  (button) => {
    button.classList.toggle(
      "active",
      button.dataset.page ===
      page
    );
  }
);
const info =
  PAGE_INFO[page];
$("#pageTitle").textContent =
  info.title;
$("#pageSubtitle").textContent =
  info.subtitle;
closeSidebar();
if (
  page ===
  "dashboard"
) {
  renderDashboard();
}
if (
  page ===
  "documents"
) {
  renderDocuments();
}
if (
  page ===
  "projects"
) {
  renderProjects();
}
if (
  page ===
  "customers"
) {
  renderCustomers();
}
if (
  page ===
  "employees"
) {
  renderEmployees();
}
if (
  page ===
  "history"
) {
  renderHistory();
}
if (
  page ===
  "reports"
) {
  renderReports();
}
if (
  page ===
  "settings"
) {
  renderSettings();
}

}

function openSidebar() {

const sidebar =
  $("#sidebar");
if (!sidebar) {
  return;
}
sidebar.classList.add(
  "open"
);
ensureSidebarOverlay();

}

function closeSidebar() {

const sidebar =
  $("#sidebar");
if (sidebar) {
  sidebar.classList.remove(
    "open"
  );
}
const overlay =
  document.querySelector(
    ".sidebar-overlay"
  );
if (overlay) {
  overlay.classList.remove(
    "show"
  );
}

}

function ensureSidebarOverlay() {

let overlay =
  document.querySelector(
    ".sidebar-overlay"
  );
if (!overlay) {
  overlay =
    document.createElement(
      "div"
    );
  overlay.className =
    "sidebar-overlay";
  overlay.addEventListener(
    "click",
    closeSidebar
  );
  document.body.appendChild(
    overlay
  );
}
overlay.classList.add(
  "show"
);

}

/* =======================================================
DOCUMENT TEMPLATES
======================================================= */

function getTemplates() {

return Array.isArray(
  DATA.templates
)
  ? DATA.templates.filter(
      (item) =>
        item &&
        item.enabled !== false
    )
  : [];

}

function renderDocumentCard(
template
) {

return `
  <article class="doc-card">
    <div class="doc-top">
      <div class="doc-icon">
        ${escapeHTML(
          template.icon ||
          "📄"
        )}
      </div>
      <span class="doc-code">
        ${escapeHTML(
          template.code ||
          ""
        )}
      </span>
    </div>
    <h3>
      ${escapeHTML(
        template.name ||
        template.title ||
        ""
      )}
    </h3>
    <p>
      ${escapeHTML(
        template.description ||
        ""
      )}
    </p>
    <div class="doc-meta">
      <span class="category">
        ${escapeHTML(
          template.category ||
          "Văn bản"
        )}
      </span>
      <button
        class="doc-open"
        type="button"
        data-template-id="${escapeHTML(
          template.id
        )}"
      >
        Mở mẫu →
      </button>
    </div>
  </article>
`;

}

function renderDocuments() {

const templates =
  getTemplates();
const search =
  (
    $("#documentSearch")
      ?.value ||
    ""
  )
    .trim()
    .toLowerCase();
const category =
  $("#documentCategory")
    ?.value ||
  "";
const filtered =
  templates.filter(
    (template) => {
      const text = [
        template.name,
        template.title,
        template.description,
        template.code,
        template.category
      ]
        .join(" ")
        .toLowerCase();
      const matchSearch =
        !search ||
        text.includes(search);
      const matchCategory =
        !category ||
        template.category ===
        category;
      return (
        matchSearch &&
        matchCategory
      );
    }
  );
const html =
  filtered.length
    ? filtered
        .map(
          renderDocumentCard
        )
        .join("")
    : emptyState(
        "Không tìm thấy mẫu",
        "Thử thay đổi từ khóa hoặc loại văn bản.",
        "🔎"
      );
if (
  $("#documentGrid")
) {
  $("#documentGrid")
    .innerHTML =
    templates
      .slice(0, 6)
      .map(
        renderDocumentCard
      )
      .join("") ||
    emptyState(
      "Chưa có mẫu văn bản",
      "Danh mục mẫu đang trống.",
      "📄"
    );
}
if (
  $("#documentsPageGrid")
) {
  $("#documentsPageGrid")
    .innerHTML =
    html;
}

}

function initDocumentCategories() {

const select =
  $("#documentCategory");
if (!select) {
  return;
}
const current =
  select.value;
const categories =
  [
    ...new Set(
      getTemplates()
        .map(
          (template) =>
            template.category
        )
        .filter(Boolean)
    )
  ]
    .sort(
      (a, b) =>
        a.localeCompare(
          b,
          "vi"
        )
    );
select.innerHTML = `
  <option value="">
    Tất cả loại
  </option>
`;
categories.forEach(
  (category) => {
    const option =
      document.createElement(
        "option"
      );
    option.value =
      category;
    option.textContent =
      category;
    select.appendChild(
      option
    );
  }
);
select.value =
  categories.includes(
    current
  )
    ? current
    : "";

}

function findTemplate(
id
) {

return getTemplates().find(
  (template) =>
    String(
      template.id
    ) ===
    String(id)
);

}

function openTemplate(
id
) {

const template =
  findTemplate(id);
if (!template) {
  showToast(
    "Không tìm thấy mẫu văn bản."
  );
  return;
}
addHistory(
  template
);
if (
  template.file
) {
  window.location.href =
    template.file;
  return;
}
showToast(
  "Mẫu văn bản chưa được cấu hình đường dẫn."
);

}

function openTemplatePicker() {

const templates =
  getTemplates();
if (!templates.length) {
  showToast(
    "Chưa có mẫu văn bản."
  );
  showPage(
    "documents"
  );
  return;
}
modalMode =
  "template-picker";
modalEditId =
  null;
$("#modalEyebrow")
  .textContent =
  "GROVA DOCUMENT";
$("#modalTitle")
  .textContent =
  "Chọn mẫu văn bản";
$("#modalBody")
  .innerHTML = `
    <div class="template-picker">
      ${templates
        .map(
          (template) => `
            <button
              type="button"
              class="template-option"
              data-picker-template-id="${escapeHTML(
                template.id
              )}"
            >
              <span class="template-option-icon">
                ${escapeHTML(
                  template.icon ||
                  "📄"
                )}
              </span>
              <span class="template-option-content">
                <b>
                  ${escapeHTML(
                    template.name ||
                    template.title ||
                    ""
                  )}
                </b>
                <span>
                  ${escapeHTML(
                    template.description ||
                    ""
                  )}
                </span>
              </span>
            </button>
          `
        )
        .join("")}
    </div>
  `;
$("#modalSave")
  .style.display =
  "none";
openModal();

}

/* =======================================================
MODAL
======================================================= */

function openModal() {

const modal =
  $("#modal");
if (!modal) {
  return;
}
modal.classList.remove(
  "hidden"
);
modal.setAttribute(
  "aria-hidden",
  "false"
);

}

function closeModal() {

const modal =
  $("#modal");
if (!modal) {
  return;
}
modal.classList.add(
  "hidden"
);
modal.setAttribute(
  "aria-hidden",
  "true"
);
modalMode =
  "";
modalEditId =
  null;
if (
  $("#modalSave")
) {
  $("#modalSave")
    .style.display =
    "";
}

}

/* =======================================================
EMPTY STATE
======================================================= */

function emptyState(
title,
description,
icon = “📁”
) {

return `
  <div class="empty-state">
    <div class="empty-state-icon">
      ${escapeHTML(icon)}
    </div>
    <h3>
      ${escapeHTML(title)}
    </h3>
    <p>
      ${escapeHTML(
        description
      )}
    </p>
  </div>
`;

}

/* =======================================================
FIRESTORE LISTENER MANAGEMENT
======================================================= */

function stopListener(
key
) {

if (
  typeof unsubscribe[key] ===
  "function"
) {
  try {
    unsubscribe[key]();
  } catch (error) {
    console.warn(
      "GROVA listener cleanup:",
      error
    );
  }
}
delete unsubscribe[key];

}

function stopAllListeners() {

Object.keys(
  unsubscribe
).forEach(
  stopListener
);

}

function startCollectionListener(
stateKey,
collectionName,
localKey,
renderer
) {

stopListener(
  stateKey
);
const ref =
  collectionRef(
    collectionName
  );
if (!ref) {
  return;
}
unsubscribe[stateKey] =
  ref.onSnapshot(
    (snapshot) => {
      firestoreOnline =
        true;
      const list =
        snapshot.docs
          .map(
            (doc) => ({
              id: doc.id,
              ...firestoreData(
                doc.data()
              )
            })
          );
      list.sort(
        (a, b) => {
          const aTime =
            new Date(
              a.updatedAt ||
              a.createdAt ||
              a.openedAt ||
              0
            ).getTime();
          const bTime =
            new Date(
              b.updatedAt ||
              b.createdAt ||
              b.openedAt ||
              0
            ).getTime();
          return bTime - aTime;
        }
      );
      cacheCollection(
        stateKey,
        list
      );
      if (
        typeof renderer ===
        "function"
      ) {
        renderer();
      }
      updateStats();
    },
    (error) => {
      console.error(
        `GROVA Firestore ${collectionName} listener error:`,
        error
      );
      firestoreOnline =
        false;
      const cached =
        readStorage(
          localKey,
          []
        );
      dataState[stateKey] =
        cached;
      if (
        typeof renderer ===
        "function"
      ) {
        renderer();
      }
      showFirestoreError(
        error
      );
    }
  );

}

function startSettingsListener() {

stopListener(
  "settings"
);
const ref =
  settingsRef();
if (!ref) {
  return;
}
unsubscribe.settings =
  ref.onSnapshot(
    (snapshot) => {
      firestoreOnline =
        true;
      if (
        snapshot.exists
      ) {
        const data =
          firestoreData(
            snapshot.data()
          );
        cacheSettings(
          data
        );
      } else {
        dataState.settings =
          null;
      }
      renderSettings();
      updateUserDisplay();
    },
    (error) => {
      console.error(
        "GROVA settings listener error:",
        error
      );
      firestoreOnline =
        false;
      renderSettings();
    }
  );

}

function startFirestoreListeners() {

if (
  !firestoreReady ||
  !getUserId()
) {
  return;
}
startCollectionListener(
  "projects",
  COLLECTION.projects,
  STORAGE.projects,
  () => {
    if (
      currentPage ===
      "projects"
    ) {
      renderProjects();
    }
    if (
      currentPage ===
      "reports"
    ) {
      renderReports();
    }
    if (
      currentPage ===
      "dashboard"
    ) {
      updateStats();
    }
  }
);
startCollectionListener(
  "customers",
  COLLECTION.customers,
  STORAGE.customers,
  () => {
    if (
      currentPage ===
      "customers"
    ) {
      renderCustomers();
    }
    if (
      currentPage ===
      "reports"
    ) {
      renderReports();
    }
    if (
      currentPage ===
      "dashboard"
    ) {
      updateStats();
    }
  }
);
startCollectionListener(
  "employees",
  COLLECTION.employees,
  STORAGE.employees,
  () => {
    if (
      currentPage ===
      "employees"
    ) {
      renderEmployees();
    }
    if (
      currentPage ===
      "dashboard"
    ) {
      updateStats();
    }
  }
);
startCollectionListener(
  "history",
  COLLECTION.history,
  STORAGE.history,
  () => {
    if (
      currentPage ===
      "history"
    ) {
      renderHistory();
    }
    if (
      currentPage ===
      "dashboard"
    ) {
      renderRecentDocuments();
    }
    updateStats();
  }
);
startSettingsListener();

}

/* =======================================================
FIRESTORE ERROR
======================================================= */

function showFirestoreError(
error
) {

if (!error) {
  return;
}
const code =
  error.code || "";
if (
  code ===
  "permission-denied"
) {
  showToast(
    "Firestore từ chối quyền truy cập dữ liệu."
  );
  return;
}
if (
  code ===
  "unavailable"
) {
  showToast(
    "Firestore đang ngoại tuyến. Đang dùng dữ liệu bộ nhớ đệm."
  );
  return;
}
console.warn(
  "GROVA Firestore:",
  error
);

}

/* =======================================================
SAVE FIRESTORE DOCUMENT
======================================================= */

async function saveFirestoreDocument(
collectionName,
id,
data
) {

const ref =
  documentRef(
    collectionName,
    id
  );
if (!ref) {
  throw new Error(
    "FIRESTORE_NOT_READY"
  );
}
await ref.set(
  {
    ...data,
    ownerUid:
      getUserId(),
    updatedAt:
      nowISO()
  },
  {
    merge: true
  }
);
return true;

}

async function deleteFirestoreDocument(
collectionName,
id
) {

const ref =
  documentRef(
    collectionName,
    id
  );
if (!ref) {
  throw new Error(
    "FIRESTORE_NOT_READY"
  );
}
await ref.delete();
return true;

}

/* =======================================================
HISTORY
======================================================= */

function addHistory(
template
) {

const uid =
  getUserId();
if (!uid) {
  showToast(
    "Vui lòng đăng nhập trước khi mở mẫu."
  );
  return;
}
const item = {
  id:
    createId("HIS"),
  templateId:
    template.id,
  code:
    template.code ||
    "",
  name:
    template.name ||
    template.title ||
    "",
  icon:
    template.icon ||
    "📄",
  openedAt:
    nowISO(),
  ownerUid:
    uid
};
const history =
  getHistory();
const filtered =
  history.filter(
    (oldItem) =>
      String(
        oldItem.templateId
      ) !==
      String(
        template.id
      )
  );
filtered.unshift(
  item
);
const limited =
  filtered.slice(
    0,
    100
  );
cacheCollection(
  "history",
  limited
);
if (
  firestoreReady
) {
  saveFirestoreDocument(
    COLLECTION.history,
    item.id,
    item
  )
    .then(
      () => {
        return Promise.all(
          history
            .filter(
              (oldItem) =>
                String(
                  oldItem.templateId
                ) ===
                String(
                  template.id
                ) &&
                oldItem.id !==
                item.id
            )
            .map(
              (oldItem) =>
                deleteFirestoreDocument(
                  COLLECTION.history,
                  oldItem.id
                )
            )
        );
      }
    )
    .catch(
      (error) => {
        console.error(
          "GROVA history save error:",
          error
        );
        showFirestoreError(
          error
        );
      }
    );
}
updateStats();

}

function renderHistory() {

const container =
  $("#historyList");
if (!container) {
  return;
}
const history =
  getHistory();
if (!history.length) {
  container.innerHTML =
    emptyState(
      "Chưa có hoạt động",
      "Các mẫu văn bản bạn mở sẽ xuất hiện ở đây.",
      "◷"
    );
  return;
}
container.innerHTML =
  history
    .map(
      (item) => `
        <div class="history-item">
          <div class="history-icon">
            ${escapeHTML(
              item.icon ||
              "📄"
            )}
          </div>
          <div class="history-content">
            <b>
              ${escapeHTML(
                item.name ||
                ""
              )}
            </b>
            <span>
              ${escapeHTML(
                item.code ||
                ""
              )}
            </span>
          </div>
          <div class="history-time">
            ${escapeHTML(
              formatDateTime(
                item.openedAt
              )
            )}
          </div>
        </div>
      `
    )
    .join("");

}

function renderRecentDocuments() {

const container =
  $("#recentDocuments");
if (!container) {
  return;
}
const history =
  getHistory();
if (!history.length) {
  container.innerHTML =
    emptyState(
      "Chưa có hoạt động gần đây",
      "Hãy mở một mẫu văn bản để bắt đầu.",
      "◷"
    );
  return;
}
container.innerHTML =
  history
    .slice(0, 5)
    .map(
      (item) => `
        <div class="history-item">
          <div class="history-icon">
            ${escapeHTML(
              item.icon ||
              "📄"
            )}
          </div>
          <div class="history-content">
            <b>
              ${escapeHTML(
                item.name ||
                ""
              )}
            </b>
            <span>
              ${escapeHTML(
                item.code ||
                ""
              )}
            </span>
          </div>
          <div class="history-time">
            ${escapeHTML(
              formatDateTime(
                item.openedAt
              )
            )}
          </div>
        </div>
      `
    )
    .join("");

}

async function clearHistory() {

const history =
  getHistory();
if (!history.length) {
  showToast(
    "Lịch sử đang trống."
  );
  return;
}
const ok =
  confirm(
    "Bạn có chắc muốn xóa toàn bộ lịch sử hoạt động?"
  );
if (!ok) {
  return;
}
cacheCollection(
  "history",
  []
);
if (
  firestoreReady &&
  getUserId()
) {
  try {
    const ref =
      collectionRef(
        COLLECTION.history
      );
    const snapshot =
      await ref.get();
    const batch =
      firestore.batch();
    snapshot.docs.forEach(
      (doc) => {
        batch.delete(
          doc.ref
        );
      }
    );
    await batch.commit();
  } catch (error) {
    console.error(
      "GROVA clear history error:",
      error
    );
    showFirestoreError(
      error
    );
  }
}
renderHistory();
renderRecentDocuments();
updateStats();
showToast(
  "Đã xóa lịch sử."
);

}

/* =======================================================
PROJECTS
======================================================= */

function renderProjects() {

const container =
  $("#projectsList");
if (!container) {
  return;
}
const search =
  (
    $("#projectSearch")
      ?.value ||
    ""
  )
    .trim()
    .toLowerCase();
const status =
  $("#projectStatus")
    ?.value ||
  "";
const projects =
  getProjects();
const filtered =
  projects.filter(
    (project) => {
      const text = [
        project.name,
        project.customer,
        project.address,
        project.code,
        project.note
      ]
        .join(" ")
        .toLowerCase();
      const matchSearch =
        !search ||
        text.includes(search);
      const matchStatus =
        !status ||
        project.status ===
        status;
      return (
        matchSearch &&
        matchStatus
      );
    }
  );
if (!filtered.length) {
  container.innerHTML =
    emptyState(
      "Chưa có công trình",
      "Bấm “Công trình mới” để thêm công trình.",
      "⌂"
    );
  return;
}
container.innerHTML =
  filtered
    .map(
      (project) => `
        <div class="data-row">
          <div class="data-main">
            <h3>
              ${escapeHTML(
                project.name ||
                "Công trình chưa đặt tên"
              )}
            </h3>
            <p>
              ${escapeHTML(
                project.customer
                  ? "Khách hàng: " +
                    project.customer
                  : "Chưa có khách hàng"
              )}
            </p>
            <p class="sub">
              ${escapeHTML(
                project.address ||
                "Chưa có địa chỉ"
              )}
            </p>
          </div>
          <div>
            <span class="status ${slugStatus(
              project.status
            )}">
              ${escapeHTML(
                project.status ||
                "Chuẩn bị"
              )}
            </span>
          </div>
          <div class="data-actions">
            <button
              type="button"
              class="small-btn"
              data-action="edit-project"
              data-id="${escapeHTML(
                project.id
              )}"
            >
              Sửa
            </button>
            <button
              type="button"
              class="small-btn delete"
              data-action="delete-project"
              data-id="${escapeHTML(
                project.id
              )}"
            >
              Xóa
            </button>
          </div>
        </div>
      `
    )
    .join("");

}

function openProjectModal(
id = null
) {

modalMode =
  "project";
modalEditId =
  id;
const project =
  id
    ? getProjects().find(
        (item) =>
          String(item.id) ===
          String(id)
      )
    : null;
$("#modalEyebrow")
  .textContent =
  "CÔNG TRÌNH";
$("#modalTitle")
  .textContent =
  project
    ? "Sửa công trình"
    : "Công trình mới";
$("#modalBody")
  .innerHTML = `
    <div class="modal-form">
      <label class="full">
        Tên công trình
        <input
          id="modalProjectName"
          type="text"
          placeholder="Ví dụ: Công trình nhà anh Nguyễn Văn A"
          value="${escapeHTML(
            project?.name ||
            ""
          )}"
        >
      </label>
      <label>
        Mã công trình
        <input
          id="modalProjectCode"
          type="text"
          placeholder="CT-001"
          value="${escapeHTML(
            project?.code ||
            ""
          )}"
        >
      </label>
      <label>
        Khách hàng
        <input
          id="modalProjectCustomer"
          type="text"
          placeholder="Tên khách hàng"
          value="${escapeHTML(
            project?.customer ||
            ""
          )}"
        >
      </label>
      <label class="full">
        Địa chỉ công trình
        <textarea
          id="modalProjectAddress"
          placeholder="Địa chỉ..."
        >${escapeHTML(
          project?.address ||
          ""
        )}</textarea>
      </label>
      <label>
        Trạng thái
        <select id="modalProjectStatus">
          <option value="Chuẩn bị">
            Chuẩn bị
          </option>
          <option value="Đang thi công">
            Đang thi công
          </option>
          <option value="Hoàn thành">
            Hoàn thành
          </option>
          <option value="Tạm dừng">
            Tạm dừng
          </option>
        </select>
      </label>
      <label>
        Ngày bắt đầu
        <input
          id="modalProjectStart"
          type="date"
          value="${escapeHTML(
            project?.startDate ||
            ""
          )}"
        >
      </label>
      <label class="full">
        Ghi chú
        <textarea
          id="modalProjectNote"
          placeholder="Ghi chú thêm..."
        >${escapeHTML(
          project?.note ||
          ""
        )}</textarea>
      </label>
    </div>
  `;
$("#modalProjectStatus")
  .value =
  project?.status ||
  "Chuẩn bị";
$("#modalSave")
  .style.display =
  "";
openModal();

}

async function saveProject() {

const name =
  $("#modalProjectName")
    ?.value
    .trim();
if (!name) {
  showToast(
    "Vui lòng nhập tên công trình."
  );
  return;
}
if (!requireUser()) {
  return;
}
const data = {
  name,
  code:
    $("#modalProjectCode")
      ?.value
      .trim() ||
    "",
  customer:
    $("#modalProjectCustomer")
      ?.value
      .trim() ||
    "",
  address:
    $("#modalProjectAddress")
      ?.value
      .trim() ||
    "",
  status:
    $("#modalProjectStatus")
      ?.value ||
    "Chuẩn bị",
  startDate:
    $("#modalProjectStart")
      ?.value ||
    "",
  note:
    $("#modalProjectNote")
      ?.value
      .trim() ||
    ""
};
const id =
  modalEditId ||
  createId("CT");
const old =
  getProjects().find(
    (item) =>
      String(item.id) ===
      String(id)
  );
const record = {
  ...(old || {}),
  id,
  ...data,
  ownerUid:
    getUserId(),
  createdAt:
    old?.createdAt ||
    nowISO(),
  updatedAt:
    nowISO()
};
/* Optimistic cache */
const projects =
  getProjects().filter(
    (item) =>
      String(item.id) !==
      String(id)
  );
projects.unshift(
  record
);
cacheCollection(
  "projects",
  projects
);
renderProjects();
updateStats();
try {
  await saveFirestoreDocument(
    COLLECTION.projects,
    id,
    record
  );
  closeModal();
  showToast(
    modalEditId
      ? "Đã cập nhật công trình."
      : "Đã thêm công trình."
  );
} catch (error) {
  console.error(
    "GROVA save project error:",
    error
  );
  showFirestoreError(
    error
  );
  showToast(
    "Đã lưu tạm trên thiết bị. Firestore chưa nhận được dữ liệu."
  );
}

}

async function deleteProject(
id
) {

const projects =
  getProjects();
const project =
  projects.find(
    (item) =>
      String(item.id) ===
      String(id)
  );
if (!project) {
  return;
}
const ok =
  confirm(
    `Xóa công trình "${project.name}"?`
  );
if (!ok) {
  return;
}
cacheCollection(
  "projects",
  projects.filter(
    (item) =>
      String(item.id) !==
      String(id)
  )
);
renderProjects();
updateStats();
try {
  await deleteFirestoreDocument(
    COLLECTION.projects,
    id
  );
  showToast(
    "Đã xóa công trình."
  );
} catch (error) {
  console.error(
    "GROVA delete project error:",
    error
  );
  showFirestoreError(
    error
  );
  showToast(
    "Đã cập nhật bộ nhớ tạm. Chưa xóa được trên Firestore."
  );
}

}

/* =======================================================
CUSTOMERS
======================================================= */

function renderCustomers() {

const container =
  $("#customersList");
if (!container) {
  return;
}
const search =
  (
    $("#customerSearch")
      ?.value ||
    ""
  )
    .trim()
    .toLowerCase();
const customers =
  getCustomers();
const filtered =
  customers.filter(
    (customer) => {
      const text = [
        customer.name,
        customer.phone,
        customer.taxCode,
        customer.address,
        customer.email,
        customer.note
      ]
        .join(" ")
        .toLowerCase();
      return (
        !search ||
        text.includes(search)
      );
    }
  );
if (!filtered.length) {
  container.innerHTML =
    emptyState(
      "Chưa có khách hàng",
      "Bấm “Khách hàng mới” để thêm dữ liệu.",
      "♙"
    );
  return;
}
container.innerHTML =
  filtered
    .map(
      (customer) => `
        <div class="data-row">
          <div class="data-main">
            <h3>
              ${escapeHTML(
                customer.name ||
                "Khách hàng chưa đặt tên"
              )}
            </h3>
            <p>
              ${escapeHTML(
                customer.phone
                  ? "Điện thoại: " +
                    customer.phone
                  : "Chưa có số điện thoại"
              )}
            </p>
            <p class="sub">
              ${escapeHTML(
                customer.taxCode
                  ? "MST: " +
                    customer.taxCode
                  : customer.address ||
                    "Chưa có thông tin"
              )}
            </p>
          </div>
          <div class="data-actions">
            <button
              type="button"
              class="small-btn"
              data-action="edit-customer"
              data-id="${escapeHTML(
                customer.id
              )}"
            >
              Sửa
            </button>
            <button
              type="button"
              class="small-btn delete"
              data-action="delete-customer"
              data-id="${escapeHTML(
                customer.id
              )}"
            >
              Xóa
            </button>
          </div>
        </div>
      `
    )
    .join("");

}

function openCustomerModal(
id = null
) {

modalMode =
  "customer";
modalEditId =
  id;
const customer =
  id
    ? getCustomers().find(
        (item) =>
          String(item.id) ===
          String(id)
      )
    : null;
$("#modalEyebrow")
  .textContent =
  "KHÁCH HÀNG";
$("#modalTitle")
  .textContent =
  customer
    ? "Sửa khách hàng"
    : "Khách hàng mới";
$("#modalBody")
  .innerHTML = `
    <div class="modal-form">
      <label class="full">
        Tên khách hàng / đơn vị
        <input
          id="modalCustomerName"
          type="text"
          placeholder="Tên khách hàng hoặc công ty"
          value="${escapeHTML(
            customer?.name ||
            ""
          )}"
        >
      </label>
      <label>
        Số điện thoại
        <input
          id="modalCustomerPhone"
          type="tel"
          placeholder="09..."
          value="${escapeHTML(
            customer?.phone ||
            ""
          )}"
        >
      </label>
      <label>
        Email
        <input
          id="modalCustomerEmail"
          type="email"
          placeholder="email@example.com"
          value="${escapeHTML(
            customer?.email ||
            ""
          )}"
        >
      </label>
      <label>
        Mã số thuế
        <input
          id="modalCustomerTax"
          type="text"
          value="${escapeHTML(
            customer?.taxCode ||
            ""
          )}"
        >
      </label>
      <label>
        Người liên hệ
        <input
          id="modalCustomerContact"
          type="text"
          value="${escapeHTML(
            customer?.contact ||
            ""
          )}"
        >
      </label>
      <label class="full">
        Địa chỉ
        <textarea
          id="modalCustomerAddress"
          placeholder="Địa chỉ..."
        >${escapeHTML(
          customer?.address ||
          ""
        )}</textarea>
      </label>
      <label class="full">
        Ghi chú
        <textarea
          id="modalCustomerNote"
          placeholder="Ghi chú..."
        >${escapeHTML(
          customer?.note ||
          ""
        )}</textarea>
      </label>
    </div>
  `;
$("#modalSave")
  .style.display =
  "";
openModal();

}

async function saveCustomer() {

const name =
  $("#modalCustomerName")
    ?.value
    .trim();
if (!name) {
  showToast(
    "Vui lòng nhập tên khách hàng."
  );
  return;
}
if (!requireUser()) {
  return;
}
const data = {
  name,
  phone:
    $("#modalCustomerPhone")
      ?.value
      .trim() ||
    "",
  email:
    $("#modalCustomerEmail")
      ?.value
      .trim() ||
    "",
  taxCode:
    $("#modalCustomerTax")
      ?.value
      .trim() ||
    "",
  contact:
    $("#modalCustomerContact")
      ?.value
      .trim() ||
    "",
  address:
    $("#modalCustomerAddress")
      ?.value
      .trim() ||
    "",
  note:
    $("#modalCustomerNote")
      ?.value
      .trim() ||
    ""
};
const id =
  modalEditId ||
  createId("KH");
const old =
  getCustomers().find(
    (item) =>
      String(item.id) ===
      String(id)
  );
const record = {
  ...(old || {}),
  id,
  ...data,
  ownerUid:
    getUserId(),
  createdAt:
    old?.createdAt ||
    nowISO(),
  updatedAt:
    nowISO()
};
const customers =
  getCustomers().filter(
    (item) =>
      String(item.id) !==
      String(id)
  );
customers.unshift(
  record
);
cacheCollection(
  "customers",
  customers
);
renderCustomers();
updateStats();
try {
  await saveFirestoreDocument(
    COLLECTION.customers,
    id,
    record
  );
  closeModal();
  showToast(
    modalEditId
      ? "Đã cập nhật khách hàng."
      : "Đã thêm khách hàng."
  );
} catch (error) {
  console.error(
    "GROVA save customer error:",
    error
  );
  showFirestoreError(
    error
  );
  showToast(
    "Đã lưu tạm trên thiết bị. Firestore chưa nhận được dữ liệu."
  );
}

}

async function deleteCustomer(
id
) {

const customers =
  getCustomers();
const customer =
  customers.find(
    (item) =>
      String(item.id) ===
      String(id)
  );
if (!customer) {
  return;
}
const ok =
  confirm(
    `Xóa khách hàng "${customer.name}"?`
  );
if (!ok) {
  return;
}
cacheCollection(
  "customers",
  customers.filter(
    (item) =>
      String(item.id) !==
      String(id)
  )
);
renderCustomers();
updateStats();
try {
  await deleteFirestoreDocument(
    COLLECTION.customers,
    id
  );
  showToast(
    "Đã xóa khách hàng."
  );
} catch (error) {
  console.error(
    "GROVA delete customer error:",
    error
  );
  showFirestoreError(
    error
  );
  showToast(
    "Đã cập nhật bộ nhớ tạm. Chưa xóa được trên Firestore."
  );
}

}

/* =======================================================
EMPLOYEES
======================================================= */

function renderEmployees() {

const container =
  $("#employeesList");
if (!container) {
  return;
}
const search =
  (
    $("#employeeSearch")
      ?.value ||
    ""
  )
    .trim()
    .toLowerCase();
const employees =
  getEmployees();
const filtered =
  employees.filter(
    (employee) => {
      const text = [
        employee.name,
        employee.phone,
        employee.position,
        employee.department,
        employee.email,
        employee.note
      ]
        .join(" ")
        .toLowerCase();
      return (
        !search ||
        text.includes(search)
      );
    }
  );
if (!filtered.length) {
  container.innerHTML =
    emptyState(
      "Chưa có nhân sự",
      "Bấm “Nhân sự mới” để thêm thông tin.",
      "👤"
    );
  return;
}
container.innerHTML =
  filtered
    .map(
      (employee) => `
        <div class="data-row">
          <div class="data-main">
            <h3>
              ${escapeHTML(
                employee.name ||
                "Nhân sự chưa đặt tên"
              )}
            </h3>
            <p>
              ${escapeHTML(
                employee.position ||
                "Chưa có chức vụ"
              )}
              ${
                employee.department
                  ? " · " +
                    escapeHTML(
                      employee.department
                    )
                  : ""
              }
            </p>
            <p class="sub">
              ${escapeHTML(
                employee.phone ||
                employee.email ||
                "Chưa có liên hệ"
              )}
            </p>
          </div>
          <div class="data-actions">
            <button
              type="button"
              class="small-btn"
              data-action="edit-employee"
              data-id="${escapeHTML(
                employee.id
              )}"
            >
              Sửa
            </button>
            <button
              type="button"
              class="small-btn delete"
              data-action="delete-employee"
              data-id="${escapeHTML(
                employee.id
              )}"
            >
              Xóa
            </button>
          </div>
        </div>
      `
    )
    .join("");

}

function openEmployeeModal(
id = null
) {

modalMode =
  "employee";
modalEditId =
  id;
const employee =
  id
    ? getEmployees().find(
        (item) =>
          String(item.id) ===
          String(id)
      )
    : null;
$("#modalEyebrow")
  .textContent =
  "NHÂN SỰ";
$("#modalTitle")
  .textContent =
  employee
    ? "Sửa nhân sự"
    : "Nhân sự mới";
$("#modalBody")
  .innerHTML = `
    <div class="modal-form">
      <label class="full">
        Họ và tên
        <input
          id="modalEmployeeName"
          type="text"
          placeholder="Họ và tên"
          value="${escapeHTML(
            employee?.name ||
            ""
          )}"
        >
      </label>
      <label>
        Chức vụ
        <input
          id="modalEmployeePosition"
          type="text"
          placeholder="Ví dụ: Kỹ thuật"
          value="${escapeHTML(
            employee?.position ||
            ""
          )}"
        >
      </label>
      <label>
        Phòng / bộ phận
        <input
          id="modalEmployeeDepartment"
          type="text"
          placeholder="Ví dụ: Kỹ thuật"
          value="${escapeHTML(
            employee?.department ||
            ""
          )}"
        >
      </label>
      <label>
        Số điện thoại
        <input
          id="modalEmployeePhone"
          type="tel"
          value="${escapeHTML(
            employee?.phone ||
            ""
          )}"
        >
      </label>
      <label>
        Email
        <input
          id="modalEmployeeEmail"
          type="email"
          value="${escapeHTML(
            employee?.email ||
            ""
          )}"
        >
      </label>
      <label>
        Ngày vào làm
        <input
          id="modalEmployeeStart"
          type="date"
          value="${escapeHTML(
            employee?.startDate ||
            ""
          )}"
        >
      </label>
      <label class="full">
        Ghi chú
        <textarea
          id="modalEmployeeNote"
          placeholder="Ghi chú..."
        >${escapeHTML(
          employee?.note ||
          ""
        )}</textarea>
      </label>
    </div>
  `;
$("#modalSave")
  .style.display =
  "";
openModal();

}

async function saveEmployee() {

const name =
  $("#modalEmployeeName")
    ?.value
    .trim();
if (!name) {
  showToast(
    "Vui lòng nhập họ và tên."
  );
  return;
}
if (!requireUser()) {
  return;
}
const data = {
  name,
  position:
    $("#modalEmployeePosition")
      ?.value
      .trim() ||
    "",
  department:
    $("#modalEmployeeDepartment")
      ?.value
      .trim() ||
    "",
  phone:
    $("#modalEmployeePhone")
      ?.value
      .trim() ||
    "",
  email:
    $("#modalEmployeeEmail")
      ?.value
      .trim() ||
    "",
  startDate:
    $("#modalEmployeeStart")
      ?.value ||
    "",
  note:
    $("#modalEmployeeNote")
      ?.value
      .trim() ||
    ""
};
const id =
  modalEditId ||
  createId("NS");
const old =
  getEmployees().find(
    (item) =>
      String(item.id) ===
      String(id)
  );
const record = {
  ...(old || {}),
  id,
  ...data,
  ownerUid:
    getUserId(),
  createdAt:
    old?.createdAt ||
    nowISO(),
  updatedAt:
    nowISO()
};
const employees =
  getEmployees().filter(
    (item) =>
      String(item.id) !==
      String(id)
  );
employees.unshift(
  record
);
cacheCollection(
  "employees",
  employees
);
renderEmployees();
updateStats();
try {
  await saveFirestoreDocument(
    COLLECTION.employees,
    id,
    record
  );
  closeModal();
  showToast(
    modalEditId
      ? "Đã cập nhật nhân sự."
      : "Đã thêm nhân sự."
  );
} catch (error) {
  console.error(
    "GROVA save employee error:",
    error
  );
  showFirestoreError(
    error
  );
  showToast(
    "Đã lưu tạm trên thiết bị. Firestore chưa nhận được dữ liệu."
  );
}

}

async function deleteEmployee(
id
) {

const employees =
  getEmployees();
const employee =
  employees.find(
    (item) =>
      String(item.id) ===
      String(id)
  );
if (!employee) {
  return;
}
const ok =
  confirm(
    `Xóa nhân sự "${employee.name}"?`
  );
if (!ok) {
  return;
}
cacheCollection(
  "employees",
  employees.filter(
    (item) =>
      String(item.id) !==
      String(id)
  )
);
renderEmployees();
updateStats();
try {
  await deleteFirestoreDocument(
    COLLECTION.employees,
    id
  );
  showToast(
    "Đã xóa nhân sự."
  );
} catch (error) {
  console.error(
    "GROVA delete employee error:",
    error
  );
  showFirestoreError(
    error
  );
  showToast(
    "Đã cập nhật bộ nhớ tạm. Chưa xóa được trên Firestore."
  );
}

}

/* =======================================================
DASHBOARD
======================================================= */

function updateStats() {

const projects =
  getProjects();
const customers =
  getCustomers();
const employees =
  getEmployees();
const history =
  getHistory();
if (
  $("#statDocuments")
) {
  $("#statDocuments")
    .textContent =
    history.length;
}
if (
  $("#statProjects")
) {
  $("#statProjects")
    .textContent =
    projects.length;
}
if (
  $("#statCustomers")
) {
  $("#statCustomers")
    .textContent =
    customers.length;
}
if (
  $("#statEmployees")
) {
  $("#statEmployees")
    .textContent =
    employees.length;
}

}

function renderDashboard() {

initDocumentCategories();
renderDocuments();
renderRecentDocuments();
updateStats();

}

/* =======================================================
REPORTS
======================================================= */

function renderReports() {

const projects =
  getProjects();
const customers =
  getCustomers();
const employees =
  getEmployees();
const history =
  getHistory();
const completed =
  projects.filter(
    (project) =>
      project.status ===
      "Hoàn thành"
  ).length;
const active =
  projects.filter(
    (project) =>
      project.status ===
      "Đang thi công"
  ).length;
if (
  $("#reportCards")
) {
  $("#reportCards")
    .innerHTML = `
      <div class="report-card">
        <small>
          Công trình
        </small>
        <strong>
          ${projects.length}
        </strong>
      </div>
      <div class="report-card">
        <small>
          Đang thi công
        </small>
        <strong>
          ${active}
        </strong>
      </div>
      <div class="report-card">
        <small>
          Hoàn thành
        </small>
        <strong>
          ${completed}
        </strong>
      </div>
      <div class="report-card">
        <small>
          Khách hàng
        </small>
        <strong>
          ${customers.length}
        </strong>
      </div>
    `;
}
if (
  $("#reportProjects")
) {
  if (!projects.length) {
    $("#reportProjects")
      .innerHTML =
      emptyState(
        "Chưa có dữ liệu công trình",
        "Thêm công trình để xem báo cáo.",
        "▥"
      );
    return;
  }
  $("#reportProjects")
    .innerHTML = `
      <h3>
        Tổng hợp công trình
      </h3>
      <table class="report-table">
        <thead>
          <tr>
            <th>
              Công trình
            </th>
            <th>
              Khách hàng
            </th>
            <th>
              Trạng thái
            </th>
            <th>
              Ngày bắt đầu
            </th>
          </tr>
        </thead>
        <tbody>
          ${projects
            .map(
              (project) => `
                <tr>
                  <td>
                    ${escapeHTML(
                      project.name ||
                      ""
                    )}
                  </td>
                  <td>
                    ${escapeHTML(
                      project.customer ||
                      "-"
                    )}
                  </td>
                  <td>
                    <span class="status ${slugStatus(
                      project.status
                    )}">
                      ${escapeHTML(
                        project.status ||
                        "Chuẩn bị"
                      )}
                    </span>
                  </td>
                  <td>
                    ${escapeHTML(
                      project.startDate
                        ? formatDate(
                            project.startDate
                          )
                        : "-"
                    )}
                  </td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    `;
}

}

/* =======================================================
SETTINGS
======================================================= */

function renderSettings() {

const settings =
  getSettings();
if (
  $("#setCompanyName")
) {
  $("#setCompanyName")
    .value =
    settings.companyName ||
    "";
}
if (
  $("#setTaxCode")
) {
  $("#setTaxCode")
    .value =
    settings.taxCode ||
    "";
}
if (
  $("#setAddress")
) {
  $("#setAddress")
    .value =
    settings.address ||
    "";
}
if (
  $("#setRepresentative")
) {
  $("#setRepresentative")
    .value =
    settings.representative ||
    "";
}
if (
  $("#setPosition")
) {
  $("#setPosition")
    .value =
    settings.position ||
    "";
}
if (
  $("#setUserName")
) {
  $("#setUserName")
    .value =
    settings.userName ||
    "Quản trị viên";
}
updateUserDisplay();

}

async function saveSettings() {

if (!requireUser()) {
  return;
}
const settings = {
  companyName:
    $("#setCompanyName")
      ?.value
      .trim() ||
    "",
  taxCode:
    $("#setTaxCode")
      ?.value
      .trim() ||
    "",
  address:
    $("#setAddress")
      ?.value
      .trim() ||
    "",
  representative:
    $("#setRepresentative")
      ?.value
      .trim() ||
    "",
  position:
    $("#setPosition")
      ?.value
      .trim() ||
    "",
  userName:
    $("#setUserName")
      ?.value
      .trim() ||
    "Quản trị viên",
  ownerUid:
    getUserId(),
  updatedAt:
    nowISO()
};
cacheSettings(
  settings
);
updateUserDisplay();
try {
  const ref =
    settingsRef();
  if (!ref) {
    throw new Error(
      "FIRESTORE_NOT_READY"
    );
  }
  await ref.set(
    settings,
    {
      merge: true
    }
  );
  showToast(
    "Đã lưu cài đặt."
  );
} catch (error) {
  console.error(
    "GROVA settings save error:",
    error
  );
  showFirestoreError(
    error
  );
  showToast(
    "Đã lưu tạm trên thiết bị. Firestore chưa nhận được dữ liệu."
  );
}

}

function updateUserDisplay() {

const settings =
  getSettings();
const name =
  settings.userName ||
  currentUser?.displayName ||
  "Quản trị viên";
if (
  $("#currentUserName")
) {
  $("#currentUserName")
    .textContent =
    name;
}
if (
  $("#currentUserRole")
) {
  $("#currentUserRole")
    .textContent =
    currentUser?.email ||
    "Administrator";
}
const avatar =
  $("#currentUserAvatar") ||
  document.querySelector(
    ".avatar"
  );
if (avatar) {
  avatar.textContent =
    name
      .trim()
      .charAt(0)
      .toUpperCase() ||
    "A";
}

}

/* =======================================================
EXPORT DATA
======================================================= */

function exportData() {

const payload = {
  exportedAt:
    nowISO(),
  ownerUid:
    getUserId(),
  app:
    DATA.app ||
    {},
  company:
    getSettings(),
  projects:
    getProjects(),
  customers:
    getCustomers(),
  employees:
    getEmployees(),
  history:
    getHistory(),
  templates:
    getTemplates()
};
const json =
  JSON.stringify(
    payload,
    null,
    2
  );
const blob =
  new Blob(
    [json],
    {
      type:
        "application/json;charset=utf-8"
    }
  );
const url =
  URL.createObjectURL(
    blob
  );
const link =
  document.createElement(
    "a"
  );
const date =
  new Date()
    .toISOString()
    .slice(0, 10);
link.href =
  url;
link.download =
  `GROVA-DOCUMENT-backup-${date}.json`;
document.body.appendChild(
  link
);
link.click();
link.remove();
URL.revokeObjectURL(
  url
);
showToast(
  "Đã xuất dữ liệu JSON."
);

}

/* =======================================================
RESET LOCAL CACHE ONLY
======================================================= */

function resetData() {

const ok =
  confirm(
    "CẢNH BÁO\n\nBạn có chắc muốn xóa toàn bộ bộ nhớ đệm cục bộ của GROVA DOCUMENT trên thiết bị này?\n\nDữ liệu Firestore trên tài khoản sẽ KHÔNG bị xóa."
  );
if (!ok) {
  return;
}
Object.values(
  STORAGE
).forEach(
  removeStorage
);
dataState = {
  projects: [],
  customers: [],
  employees: [],
  history: [],
  settings: null
};
renderDashboard();
showPage(
  "dashboard"
);
showToast(
  "Đã xóa bộ nhớ đệm cục bộ."
);

}

/* =======================================================
AUTH / FIRESTORE BOOTSTRAP
======================================================= */

function startAuthObserver() {

if (
  authObserverStarted
) {
  return;
}
if (
  typeof firebase ===
  "undefined" ||
  !firebase.auth
) {
  console.warn(
    "GROVA: Firebase Auth chưa sẵn sàng."
  );
  return;
}
authObserverStarted =
  true;
firebase.auth()
  .onAuthStateChanged(
    async (user) => {
      currentUser =
        user ||
        null;
      if (!user) {
        stopAllListeners();
        firestoreOnline =
          false;
        updateUserDisplay();
        return;
      }
      console.log(
        "GROVA: Authenticated user:",
        user.uid
      );
      initFirestore();
      if (
        !firestoreReady
      ) {
        updateUserDisplay();
        return;
      }
      await ensureUserDocument(
        user
      );
      startFirestoreListeners();
      updateUserDisplay();
      renderDashboard();
    }
  );

}

async function ensureUserDocument(
user
) {

if (
  !firestoreReady ||
  !user
) {
  return;
}
try {
  const ref =
    firestore
      .collection(
        COLLECTION.users
      )
      .doc(
        user.uid
      );
  const snapshot =
    await ref.get();
  const baseData = {
    uid:
      user.uid,
    email:
      user.email ||
      "",
    displayName:
      user.displayName ||
      "",
    lastLoginAt:
      nowISO(),
    updatedAt:
      nowISO()
  };
  if (
    snapshot.exists
  ) {
    await ref.set(
      {
        ...baseData
      },
      {
        merge: true
      }
    );
  } else {
    await ref.set(
      {
        ...baseData,
        createdAt:
          nowISO(),
        role:
          "Administrator",
        status:
          "active"
      },
      {
        merge: true
      }
    );
  }
} catch (error) {
  console.error(
    "GROVA ensure user error:",
    error
  );
  showFirestoreError(
    error
  );
}

}

/* =======================================================
EVENT HANDLERS
======================================================= */

function handleClick(
event
) {

const navButton =
  event.target.closest(
    ".nav-item[data-page]"
  );
if (navButton) {
  showPage(
    navButton.dataset.page
  );
  return;
}
const pageTarget =
  event.target.closest(
    "[data-page-target]"
  );
if (pageTarget) {
  showPage(
    pageTarget.dataset.pageTarget
  );
  return;
}
const templateButton =
  event.target.closest(
    "[data-template-id]"
  );
if (templateButton) {
  openTemplate(
    templateButton.dataset.templateId
  );
  return;
}
const pickerButton =
  event.target.closest(
    "[data-picker-template-id]"
  );
if (pickerButton) {
  closeModal();
  openTemplate(
    pickerButton.dataset
      .pickerTemplateId
  );
  return;
}
const actionButton =
  event.target.closest(
    "[data-action]"
  );
if (!actionButton) {
  return;
}
const action =
  actionButton.dataset.action;
switch (action) {
  case "new-document":
    openTemplatePicker();
    break;
  case "new-project":
    openProjectModal();
    break;
  case "edit-project":
    openProjectModal(
      actionButton.dataset.id
    );
    break;
  case "delete-project":
    deleteProject(
      actionButton.dataset.id
    );
    break;
  case "new-customer":
    openCustomerModal();
    break;
  case "edit-customer":
    openCustomerModal(
      actionButton.dataset.id
    );
    break;
  case "delete-customer":
    deleteCustomer(
      actionButton.dataset.id
    );
    break;
  case "new-employee":
    openEmployeeModal();
    break;
  case "edit-employee":
    openEmployeeModal(
      actionButton.dataset.id
    );
    break;
  case "delete-employee":
    deleteEmployee(
      actionButton.dataset.id
    );
    break;
  case "clear-history":
    clearHistory();
    break;
  case "close-modal":
    closeModal();
    break;
  case "save-settings":
    saveSettings();
    break;
  case "export-data":
    exportData();
    break;
  case "reset-data":
    resetData();
    break;
}

}

function handleInput(
event
) {

const id =
  event.target.id;
if (
  id ===
  "documentSearch" ||
  id ===
  "documentCategory"
) {
  renderDocuments();
  return;
}
if (
  id ===
  "projectSearch" ||
  id ===
  "projectStatus"
) {
  renderProjects();
  return;
}
if (
  id ===
  "customerSearch"
) {
  renderCustomers();
  return;
}
if (
  id ===
  "employeeSearch"
) {
  renderEmployees();
  return;
}

}

function handleModalSave() {

switch (modalMode) {
  case "project":
    saveProject();
    break;
  case "customer":
    saveCustomer();
    break;
  case "employee":
    saveEmployee();
    break;
}

}

/* =======================================================
KEYBOARD / MODAL
======================================================= */

function handleKeydown(
event
) {

if (
  event.key ===
  "Escape"
) {
  closeModal();
  closeSidebar();
}

}

function handleModalBackdrop(
event
) {

if (
  event.target ===
  $("#modal")
) {
  closeModal();
}

}

/* =======================================================
SERVICE WORKER
======================================================= */

function registerServiceWorker() {

if (
  "serviceWorker" in
  navigator
) {
  window.addEventListener(
    "load",
    () => {
      navigator.serviceWorker
        .register(
          "./sw.js"
        )
        .catch(
          (error) => {
            console.warn(
              "GROVA SW:",
              error
            );
          }
        );
    }
  );
}

}

/* =======================================================
INIT
======================================================= */

function init() {

/* Firebase */
initFirestore();
startAuthObserver();
/* Navigation */
$$(".nav-item").forEach(
  (button) => {
    button.addEventListener(
      "click",
      () => {
        showPage(
          button.dataset.page
        );
      }
    );
  }
);
/* Global click */
document.addEventListener(
  "click",
  handleClick
);
/* Search */
document.addEventListener(
  "input",
  handleInput
);
document.addEventListener(
  "change",
  handleInput
);
/* Modal */
if (
  $("#modalSave")
) {
  $("#modalSave")
    .addEventListener(
      "click",
      handleModalSave
    );
}
if (
  $("#modal")
) {
  $("#modal")
    .addEventListener(
      "click",
      handleModalBackdrop
    );
}
/* Mobile sidebar */
if (
  $("#openSidebar")
) {
  $("#openSidebar")
    .addEventListener(
      "click",
      openSidebar
    );
}
if (
  $("#closeSidebar")
) {
  $("#closeSidebar")
    .addEventListener(
      "click",
      closeSidebar
    );
}
/* Keyboard */
document.addEventListener(
  "keydown",
  handleKeydown
);
/* Initial cache */
dataState.projects =
  readStorage(
    STORAGE.projects,
    []
  );
dataState.customers =
  readStorage(
    STORAGE.customers,
    []
  );
dataState.employees =
  readStorage(
    STORAGE.employees,
    []
  );
dataState.history =
  readStorage(
    STORAGE.history,
    []
  );
dataState.settings =
  readStorage(
    STORAGE.settings,
    {}
  );
/* Initial render */
initDocumentCategories();
updateUserDisplay();
renderDashboard();
/* Service worker */
registerServiceWorker();

}

/* =======================================================
START
======================================================= */

if (
document.readyState ===
“loading”
) {

document.addEventListener(
  "DOMContentLoaded",
  init
);

} else {

init();

}

})();