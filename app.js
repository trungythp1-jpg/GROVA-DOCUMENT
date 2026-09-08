/* =========================================================
   GROVA DOCUMENT
   APP.JS — VERSION 233
   FIRESTORE PHASE 4 — HISTORY + PHASE 5A PERMISSION CORE + PHASE 5B.4 ACCOUNT MANAGEMENT UI + PHASE 5B.5 ACCOUNT PROFILE UI + PHASE 5B.6 ACCOUNT MANAGEMENT HARDENING + PHASE 5B.7 ACCOUNT PROFILE UI SYNC + SPARK ACCOUNT PROFILE MANAGEMENT + FULL VIEW/CREATE/EDIT/DELETE PERMISSION ENFORCEMENT
   PROJECTS + CUSTOMERS + EMPLOYEES + HISTORY
   CLEAN BASE FROM LOCKED VERSION 209
========================================================= */

(() => {
  "use strict";

  /* =======================================================
     BASIC HELPERS
  ======================================================= */

  const $ = (selector) => document.querySelector(selector);

  const $$ = (selector) => [
    ...document.querySelectorAll(selector)
  ];

  const STORAGE = {
    projects: "GROVA_PROJECTS_V1",
    customers: "GROVA_CUSTOMERS_V1",
    employees: "GROVA_EMPLOYEES_V1",
    history: "GROVA_HISTORY_V1",
    settings: "GROVA_SETTINGS_V1"
  };

  const PROJECT_CACHE_PREFIX = "GROVA_PROJECTS_V2_";
  const CUSTOMER_CACHE_PREFIX = "GROVA_CUSTOMERS_V2_";

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

    ai: {
      title: "GROVA AI",
      subtitle: "Trợ lý AI đọc dữ liệu theo quyền của tài khoản"
    },

    settings: {
      title: "Cài đặt",
      subtitle: "Cấu hình hệ thống"
    }
  };

  let currentPage = "dashboard";

  let modalMode = "";

  let modalEditId = null;

  let toastTimer = null;

  /* =======================================================
     PROJECT FIRESTORE STATE
  ======================================================= */

  let currentUser = null;

  /* =======================================================
     PERMISSION CORE — PHASE 5A
  ======================================================= */

  const ADMIN_UID = "nJmKgjEILgVOEjWKYWTsuonxbO03";

  const ROLE_LABELS = {
    admin: "Administrator",
    manager: "Quản lý",
    employee: "Nhân viên",
    viewer: "Chỉ xem",
    custom: "Tùy chỉnh"
  };

  const DEFAULT_PERMISSIONS = {
    admin: {
      projects: { view: true, create: true, edit: true, delete: true },
      customers: { view: true, create: true, edit: true, delete: true },
      employees: { view: true, create: true, edit: true, delete: true },
      documents: { view: true, create: true, edit: true, delete: true, export: true },
      history: { view: true },
      users: { view: true, create: true, edit: true, lock: true, managePermissions: true },
      settings: { view: true, edit: true },
      ai: { view: true }
    },
    manager: {
      projects: { view: true, create: true, edit: true, delete: true },
      customers: { view: true, create: true, edit: true, delete: true },
      employees: { view: true, create: true, edit: true, delete: true },
      documents: { view: true, create: true, edit: true, delete: true, export: true },
      history: { view: true },
      users: { view: false, create: false, edit: false, lock: false, managePermissions: false },
      settings: { view: true, edit: true },
      ai: { view: true }
    },
    employee: {
      projects: { view: true, create: true, edit: true, delete: false },
      customers: { view: true, create: true, edit: true, delete: false },
      employees: { view: true, create: false, edit: false, delete: false },
      documents: { view: true, create: true, edit: false, delete: false, export: true },
      history: { view: true },
      users: { view: false, create: false, edit: false, lock: false, managePermissions: false },
      settings: { view: false, edit: false },
      ai: { view: true }
    },
    viewer: {
      projects: { view: true, create: false, edit: false, delete: false },
      customers: { view: true, create: false, edit: false, delete: false },
      employees: { view: true, create: false, edit: false, delete: false },
      documents: { view: true, create: false, edit: false, delete: false, export: false },
      history: { view: true },
      users: { view: false, create: false, edit: false, lock: false, managePermissions: false },
      settings: { view: false, edit: false },
      ai: { view: true }
    },
    custom: {
      projects: { view: false, create: false, edit: false, delete: false },
      customers: { view: false, create: false, edit: false, delete: false },
      employees: { view: false, create: false, edit: false, delete: false },
      documents: { view: false, create: false, edit: false, delete: false, export: false },
      history: { view: false },
      users: { view: false, create: false, edit: false, lock: false, managePermissions: false },
      settings: { view: false, edit: false },
      ai: { view: false }
    }
  };

  let currentUserProfile = null;
  let userProfileSyncToken = 0;

  /* =======================================================
     PHASE 5B.4 — ACCOUNT MANAGEMENT UI STATE
  ======================================================= */
  let accountUsers = [];
  let accountUsersLoading = false;
  let accountUsersPageToken = null;
  let accountUsersLoadedOnce = false;

  function clonePermissions(value) {
    return JSON.parse(JSON.stringify(value || {}));
  }

  function getDefaultPermissions(role = "employee") {
    return clonePermissions(
      DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.employee
    );
  }

  function normalizeUserProfile(profile, user) {
    const role = profile?.role || (user?.uid === ADMIN_UID ? "admin" : "employee");
    const permissions = profile?.permissions || getDefaultPermissions(role);

    return {
      uid: String(user?.uid || profile?.uid || ""),
      name: String(profile?.name || user?.displayName || ""),
      email: String(profile?.email || user?.email || ""),
      role,
      status: profile?.status === "disabled" ? "disabled" : "active",
      permissions: clonePermissions(permissions),
      createdAt: profile?.createdAt || nowISO(),
      updatedAt: profile?.updatedAt || nowISO(),
      createdBy: profile?.createdBy || user?.uid || "",
      updatedBy: profile?.updatedBy || user?.uid || ""
    };
  }

  function isAdminUser(user = currentUser) {
    return Boolean(user?.uid && user.uid === ADMIN_UID);
  }

  function hasPermission(group, action) {
    if (isAdminUser()) return true;
    if (!currentUserProfile || currentUserProfile.status !== "active") return false;
    return Boolean(currentUserProfile.permissions?.[group]?.[action]);
  }

  /* =======================================================
     DOCUMENT PERMISSION MATRIX — PHASE 5C / V237
  ======================================================= */

  function getDocumentTemplateIds() {
    return getTemplates().map((template) => String(template?.id || "").trim()).filter(Boolean);
  }

  function getDocumentTemplatePermissionMap(profile = currentUserProfile) {
    const source = profile?.permissions?.documents?.templates;
    return source && typeof source === "object" ? clonePermissions(source) : {};
  }

  function getDocumentTemplatePermission(templateId, action, profile = currentUserProfile) {
    const id = String(templateId || "").trim();
    if (!id || !action) return false;
    if (isAdminUser(currentUser)) return true;
    const templateMap = getDocumentTemplatePermissionMap(profile);
    const templatePermissions = templateMap[id];
    if (templatePermissions && Object.prototype.hasOwnProperty.call(templatePermissions, action)) {
      return Boolean(templatePermissions[action]);
    }
    return hasPermission("documents", action);
  }

  function hasDocumentTemplatePermission(templateId, action) {
    return getDocumentTemplatePermission(templateId, action);
  }

  function getDefaultDocumentTemplatePermissions(role = "employee") {
    const base = getDefaultPermissions(role)?.documents || {};
    const map = {};
    getDocumentTemplateIds().forEach((templateId) => {
      map[templateId] = { view: Boolean(base.view), create: Boolean(base.create), edit: Boolean(base.edit), delete: Boolean(base.delete), export: Boolean(base.export) };
    });
    return map;
  }

  function getCurrentUserProfile() {
    return currentUserProfile ? {
      ...currentUserProfile,
      permissions: clonePermissions(currentUserProfile.permissions)
    } : null;
  }

  function getUsersCollection() {
    if (!firestoreDb) return null;
    return firestoreDb.collection("users");
  }


  function refreshAccountProfileUI() {
    updateUserDisplay();

    if (currentPage === "settings") {
      renderAccountManagement();
    }
  }

  async function syncCurrentUserProfile(user) {
    const token = ++userProfileSyncToken;
    currentUserProfile = null;

    if (!user) {
      refreshAccountProfileUI();
      return null;
    }

    if (!initializeFirestore()) {
      currentUserProfile = null;
      refreshAccountProfileUI();
      refreshPermissionUI();
      return null;
    }

    try {
      await waitForFirestore();
      const reference = getUsersCollection()?.doc(String(user.uid));
      if (!reference) throw new Error("FIRESTORE_UNAVAILABLE");

      const snapshot = await reference.get();
      if (token !== userProfileSyncToken) return null;

      currentUserProfile = snapshot.exists
        ? normalizeUserProfile(snapshot.data(), user)
        : null;

      refreshAccountProfileUI();
      refreshPermissionUI();
      if (currentPage !== "dashboard" && !canViewPage(currentPage)) {
        showPage("dashboard");
      }
      return currentUserProfile;
    } catch (error) {
      console.warn(
        "GROVA DOCUMENT: user profile sync unavailable.",
        error
      );

      if (token !== userProfileSyncToken) return null;
      currentUserProfile = null;
      refreshAccountProfileUI();
      return null;
    }
  }

  let authReadyPromise = null;

  let projectsCache = [];

  let firestoreDb = null;

  let firestoreReadyPromise = null;

  let projectsSyncToken = 0;

  let firestoreSyncRunning = false;

  let customersCache = [];

  let customersSyncToken = 0;

  let customersSyncRunning = false;

  let employeesCache = [];

  let employeesSyncToken = 0;

  let employeesSyncRunning = false;

  /* =======================================================
     HISTORY FIRESTORE STATE
  ======================================================= */

  let historyCache = [];

  let historySyncToken = 0;

  let historySyncRunning = false;

  /* =======================================================
     DATA
  ======================================================= */

  const DATA = window.GROVA_DATA || {
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
     STORAGE HELPERS
  ======================================================= */

  function readStorage(key, fallback = []) {

    try {

      const raw = localStorage.getItem(key);

      if (!raw) {
        return fallback;
      }

      const parsed = JSON.parse(raw);

      return parsed;

    } catch (error) {

      console.error(
        "GROVA DOCUMENT storage read error:",
        error
      );

      return fallback;

    }

  }

  function writeStorage(key, value) {

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

      showToast(
        "Không thể lưu dữ liệu trên thiết bị."
      );

      return false;

    }

  }

  function getProjectCacheKey(uid) {

    return (
      PROJECT_CACHE_PREFIX +
      String(uid || "")
    );

  }

  function readProjectCache(uid) {

    if (!uid) {
      return [];
    }

    return readStorage(
      getProjectCacheKey(uid),
      []
    );

  }

  function writeProjectCache(uid, projects) {

    if (!uid) {
      return false;
    }

    return writeStorage(
      getProjectCacheKey(uid),
      Array.isArray(projects)
        ? projects
        : []
    );

  }

  function getBestLocalProjects(uid) {

    const scopedCache =
      normalizeProjects(
        readProjectCache(uid)
      );

    if (scopedCache.length) {
      return scopedCache;
    }

    return normalizeProjects(
      readStorage(
        STORAGE.projects,
        []
      )
    );
  }

  function normalizeProjects(projects) {

    if (!Array.isArray(projects)) {
      return [];
    }

    return projects
      .filter(
        (project) =>
          project &&
          project.id
      )
      .map(
        (project) => ({
          ...project,
          id: String(project.id)
        })
      )
      .sort(
        (a, b) =>
          String(b.updatedAt || b.createdAt || "")
            .localeCompare(
              String(a.updatedAt || a.createdAt || "")
            )
      );

  }

  function setProjectsCache(projects) {

    projectsCache =
      normalizeProjects(projects);

  }

  function getProjects() {

    return projectsCache.slice();

  }

  function getCustomerCacheKey(uid) {
    return (
      CUSTOMER_CACHE_PREFIX +
      String(uid || "")
    );
  }

  function readCustomerCache(uid) {
    if (!uid) {
      return [];
    }

    return readStorage(
      getCustomerCacheKey(uid),
      []
    );
  }

  function writeCustomerCache(uid, customers) {
    if (!uid) {
      return false;
    }

    return writeStorage(
      getCustomerCacheKey(uid),
      Array.isArray(customers)
        ? customers
        : []
    );
  }

  function normalizeCustomers(customers) {
    if (!Array.isArray(customers)) {
      return [];
    }

    return customers
      .filter(
        (customer) =>
          customer &&
          customer.id
      )
      .map(
        (customer) => ({
          ...customer,
          id: String(customer.id)
        })
      )
      .sort(
        (a, b) =>
          String(b.updatedAt || b.createdAt || "")
            .localeCompare(
              String(a.updatedAt || a.createdAt || "")
            )
      );
  }

  function setCustomersCache(customers) {
    customersCache =
      normalizeCustomers(customers);
  }

  function getBestLocalCustomers(uid) {
    const scopedCache =
      normalizeCustomers(
        readCustomerCache(uid)
      );

    if (scopedCache.length) {
      return scopedCache;
    }

    return normalizeCustomers(
      readStorage(
        STORAGE.customers,
        []
      )
    );
  }

  function getCustomers() {
    if (currentUser) {
      return customersCache.slice();
    }

    return normalizeCustomers(
      readStorage(
        STORAGE.customers,
        []
      )
    );
  }

  function getEmployeeCacheKey(uid) {
    return "GROVA_EMPLOYEES_V2_" + String(uid || "");
  }

  function readEmployeeCache(uid) {
    if (!uid) return [];
    return readStorage(getEmployeeCacheKey(uid), []);
  }

  function writeEmployeeCache(uid, employees) {
    if (!uid) return false;
    return writeStorage(getEmployeeCacheKey(uid), Array.isArray(employees) ? employees : []);
  }

  function normalizeEmployees(employees) {
    if (!Array.isArray(employees)) return [];
    return employees
      .filter((employee) => employee && employee.id)
      .map((employee) => ({ ...employee, id: String(employee.id) }))
      .sort((a, b) => String(b.updatedAt || b.createdAt || "").localeCompare(String(a.updatedAt || a.createdAt || "")));
  }

  function setEmployeesCache(employees) {
    employeesCache = normalizeEmployees(employees);
  }

  function getBestLocalEmployees(uid) {
    const scopedCache = normalizeEmployees(readEmployeeCache(uid));
    if (scopedCache.length) return scopedCache;
    return normalizeEmployees(readStorage(STORAGE.employees, []));
  }

  function getEmployees() {
    if (currentUser) return employeesCache.slice();
    return normalizeEmployees(readStorage(STORAGE.employees, []));
  }

  function getHistoryCacheKey(uid) {
    return "GROVA_HISTORY_V2_" + String(uid || "");
  }

  function readHistoryCache(uid) {
    if (!uid) return [];
    return readStorage(getHistoryCacheKey(uid), []);
  }

  function writeHistoryCache(uid, history) {
    if (!uid) return false;
    return writeStorage(
      getHistoryCacheKey(uid),
      Array.isArray(history) ? history : []
    );
  }

  function normalizeHistory(history) {
    if (!Array.isArray(history)) return [];

    const seenTemplates = new Set();

    return history
      .filter((item) => item && item.templateId)
      .map((item) => ({
        ...item,
        id: String(item.id || createId("HIS")),
        templateId: String(item.templateId),
        code: item.code || "",
        name: item.name || "",
        icon: item.icon || "📄",
        openedAt: item.openedAt || nowISO(),
        createdBy: item.createdBy || ""
      }))
      .sort((a, b) =>
        String(b.openedAt || "").localeCompare(
          String(a.openedAt || "")
        )
      )
      .filter((item) => {
        if (seenTemplates.has(item.templateId)) {
          return false;
        }
        seenTemplates.add(item.templateId);
        return true;
      })
      .slice(0, 100);
  }

  function setHistoryCache(history) {
    historyCache = normalizeHistory(history);
  }

  function getBestLocalHistory(uid) {
    const scopedCache = normalizeHistory(
      readHistoryCache(uid)
    );

    if (scopedCache.length) {
      return scopedCache;
    }

    return normalizeHistory(
      readStorage(STORAGE.history, [])
    );
  }

  function clearLegacyHistoryStorage() {
    localStorage.removeItem(STORAGE.history);
  }

  function getHistory() {
    if (currentUser) {
      return historyCache.slice();
    }

    return normalizeHistory(
      readStorage(STORAGE.history, [])
    );
  }

  function getSettings() {

    const defaults = {
      companyName: DATA.company?.name || "",
      taxCode: DATA.company?.taxCode || "",
      address: DATA.company?.address || "",
      representative: DATA.company?.representative || "",
      position: DATA.company?.position || "",
      userName: "Quản trị viên"
    };

    const saved = readStorage(
      STORAGE.settings,
      {}
    );

    return {
      ...defaults,
      ...(saved || {})
    };

  }

  /* =======================================================
     FIRESTORE SERVICE — PROJECTS + CUSTOMERS
  ======================================================= */

  function getAuthObject() {

    if (
      window.GROVA_AUTH &&
      window.GROVA_AUTH.auth
    ) {
      return window.GROVA_AUTH.auth;
    }

    if (
      window.firebase &&
      typeof firebase.auth === "function"
    ) {

      try {
        return firebase.auth();
      } catch (error) {
        console.warn(
          "GROVA DOCUMENT: Firebase Auth unavailable.",
          error
        );
      }

    }

    return null;

  }

  function getFirebaseApp() {

    if (
      window.GROVA_AUTH &&
      window.GROVA_AUTH.firebase
    ) {
      return window.GROVA_AUTH.firebase;
    }

    if (
      window.firebase &&
      typeof firebase.app === "function"
    ) {

      try {
        return firebase.app();
      } catch (error) {
        console.warn(
          "GROVA DOCUMENT: Firebase App unavailable.",
          error
        );
      }

    }

    return null;

  }

  async function getActiveAuthUser() {

    if (currentUser) {
      return currentUser;
    }

    const auth = getAuthObject();

    if (!auth) {
      return null;
    }

    /*
      Firebase Auth có thể chưa hoàn tất khởi tạo dù giao diện đã mở.
      Chờ trạng thái Auth ban đầu trước khi kết luận user chưa đăng nhập.
    */
    if (typeof auth.authStateReady === "function") {
      try {
        await auth.authStateReady();
      } catch (error) {
        console.warn(
          "GROVA DOCUMENT: Auth readiness warning.",
          error
        );
      }
    }

    if (auth.currentUser) {
      currentUser = auth.currentUser;
      return currentUser;
    }

    if (authReadyPromise) {
      try {
        await authReadyPromise;
      } catch (error) {
        console.warn(
          "GROVA DOCUMENT: Auth state promise warning.",
          error
        );
      }
    }

    if (currentUser) {
      return currentUser;
    }

    if (auth.currentUser) {
      currentUser = auth.currentUser;
      return currentUser;
    }

    if (
      window.GROVA_AUTH &&
      typeof window.GROVA_AUTH.getCurrentUser === "function"
    ) {
      const user = window.GROVA_AUTH.getCurrentUser();
      if (user) {
        currentUser = user;
        return user;
      }
    }

    return null;

  }

  function initializeFirestore() {

    if (firestoreDb) {
      return true;
    }

    try {

      if (
        !window.firebase ||
        typeof firebase.firestore !== "function"
      ) {

        console.warn(
          "GROVA DOCUMENT: Firestore SDK chưa sẵn sàng."
        );

        return false;

      }

      const app =
        getFirebaseApp();

      if (!app) {

        console.warn(
          "GROVA DOCUMENT: Firebase App chưa sẵn sàng."
        );

        return false;

      }

      firestoreDb =
        app.firestore();

      firestoreReadyPromise =
        firestoreDb
          .enablePersistence({
            synchronizeTabs: true
          })
          .catch(
            (error) => {

              if (
                error &&
                (
                  error.code ===
                    "failed-precondition" ||
                  error.code ===
                    "unimplemented"
                )
              ) {

                console.warn(
                  "GROVA DOCUMENT: Firestore persistence không khả dụng, tiếp tục không offline persistence.",
                  error.code
                );

              } else {

                console.warn(
                  "GROVA DOCUMENT: Không thể bật Firestore persistence.",
                  error
                );

              }

            }
          );

      return true;

    } catch (error) {

      console.error(
        "GROVA DOCUMENT: Firestore initialization failed.",
        error
      );

      firestoreDb = null;

      firestoreReadyPromise = null;

      return false;

    }

  }

  async function waitForFirestore() {

    if (!firestoreDb) {
      return false;
    }

    if (firestoreReadyPromise) {

      try {
        await firestoreReadyPromise;
      } catch (error) {
        console.warn(
          "GROVA DOCUMENT: Firestore readiness warning.",
          error
        );
      }

    }

    return true;

  }

  function getProjectsCollection() {

    if (!firestoreDb) {
      return null;
    }

    return firestoreDb.collection("projects");

  }

  function buildProjectData(project, user, isCreate = false) {

    const now =
      nowISO();

    const uid =
      user?.uid || "";

    const existingCreatedAt =
      project.createdAt ||
      now;

    const existingUpdatedAt =
      project.updatedAt ||
      now;

    return {

      id:
        String(project.id),

      name:
        project.name || "",

      code:
        project.code || "",

      customer:
        project.customer || "",

      address:
        project.address || "",

      latitude:
        project.latitude || "",

      longitude:
        project.longitude || "",

      status:
        project.status || "Chuẩn bị",

      startDate:
        project.startDate || "",

      note:
        project.note || "",

      createdAt:
        existingCreatedAt,

      updatedAt:
        existingUpdatedAt,

      createdBy:
        project.createdBy ||
        (
          isCreate
            ? uid
            : uid
        ),

      updatedBy:
        uid

    };

  }

  function mapFirestoreProject(doc) {

    const data =
      doc.data() || {};

    return {

      ...data,

      id:
        String(doc.id)

    };

  }

  async function readCloudProjects() {

    if (!currentUser) {
      return null;
    }

    if (!initializeFirestore()) {
      return null;
    }

    await waitForFirestore();

    const collection =
      getProjectsCollection();

    if (!collection) {
      return null;
    }

    const snapshot =
      await collection.get();

    return normalizeProjects(
      snapshot.docs.map(
        mapFirestoreProject
      )
    );

  }

  async function writeCloudProject(project, user, isCreate = false) {

    if (!hasPermission("projects", isCreate ? "create" : "edit")) {
      throw new Error("PERMISSION_DENIED");
    }

    if (!user) {
      throw new Error(
        "AUTH_REQUIRED"
      );
    }

    if (!initializeFirestore()) {
      throw new Error(
        "FIRESTORE_UNAVAILABLE"
      );
    }

    await waitForFirestore();

    const data =
      buildProjectData(
        project,
        user,
        isCreate
      );

    const reference =
      getProjectsCollection()
        .doc(String(project.id));

    await reference.set(
      data,
      {
        merge: true
      }
    );

    const verification =
      await reference.get();

    if (!verification.exists) {

      throw new Error(
        "WRITE_VERIFICATION_FAILED"
      );

    }

    return mapFirestoreProject(
      verification
    );

  }

  async function deleteCloudProject(id, user) {

    if (!hasPermission("projects", "delete")) {
      throw new Error("PERMISSION_DENIED");
    }

    if (!user) {
      throw new Error(
        "AUTH_REQUIRED"
      );
    }

    if (!initializeFirestore()) {
      throw new Error(
        "FIRESTORE_UNAVAILABLE"
      );
    }

    await waitForFirestore();

    const reference =
      getProjectsCollection()
        .doc(String(id));

    await reference.delete();

    const verification =
      await reference.get();

    if (verification.exists) {

      throw new Error(
        "DELETE_VERIFICATION_FAILED"
      );

    }

    return true;

  }

  function projectIds(projects) {

    return normalizeProjects(projects)
      .map(
        (project) =>
          String(project.id)
      )
      .sort();

  }

  function sameIdSet(a, b) {

    const left =
      projectIds(a);

    const right =
      projectIds(b);

    if (
      left.length !==
      right.length
    ) {
      return false;
    }

    return left.every(
      (id, index) =>
        id === right[index]
    );

  }

  async function verifyMigration(expectedProjects) {

    const cloud =
      await readCloudProjects();

    if (!cloud) {
      return false;
    }

    const expected =
      normalizeProjects(
        expectedProjects
      );

    if (
      cloud.length !==
      expected.length
    ) {
      return false;
    }

    return sameIdSet(
      cloud,
      expected
    );

  }

  function renderProjectViews() {

    updateStats();

    if (currentPage === "dashboard") {
      renderDashboard();
    }

    if (currentPage === "projects") {
      renderProjects();
    }

    if (currentPage === "reports") {
      renderReports();
    }

  }

  function showProjectSyncError(error) {

    console.error(
      "GROVA DOCUMENT: Project Firestore error.",
      error
    );

    showToast(
      "Không thể đồng bộ công trình. Ứng dụng vẫn đang dùng dữ liệu cục bộ."
    );

  }

  async function migrateLocalProjectsIfNeeded(
    user,
    localProjects
  ) {

    if (!user) {
      return false;
    }

    const sourceProjects =
      normalizeProjects(
        localProjects
      );

    if (!sourceProjects.length) {
      return false;
    }

    const cloud =
      await readCloudProjects();

    if (!cloud) {
      return false;
    }

    if (cloud.length > 0) {
      setProjectsCache(cloud);

      writeProjectCache(
        user.uid,
        cloud
      );

      return false;
    }

    try {

      for (
        const project of sourceProjects
      ) {

        const data =
          buildProjectData(
            project,
            user,
            !project.createdBy
          );

        await getProjectsCollection()
          .doc(String(project.id))
          .set(data);
      }

      const verified =
        await verifyMigration(
          sourceProjects
        );

      if (!verified) {
        throw new Error(
          "MIGRATION_VERIFICATION_FAILED"
        );
      }

      const migratedCloud =
        await readCloudProjects();

      if (!migratedCloud) {
        throw new Error(
          "MIGRATION_READBACK_FAILED"
        );
      }

      setProjectsCache(
        migratedCloud
      );

      writeProjectCache(
        user.uid,
        migratedCloud
      );

      showToast(
        "Đã đồng bộ công trình cũ lên Firestore."
      );

      return true;

    } catch (error) {

      showProjectSyncError(
        error
      );

      return false;
    }
  }

  async function syncProjectsFromCloud(user) {

    if (!user) {
      return;
    }

    const token =
      ++projectsSyncToken;

    firestoreSyncRunning = true;

    try {

      const initialized =
        initializeFirestore();

      if (!initialized) {
        return;
      }

      const localProjects =
        getBestLocalProjects(
          user.uid
        );

      if (localProjects.length) {
        setProjectsCache(
          localProjects
        );

        renderProjectViews();
      }

      const cloud =
        await readCloudProjects();

      if (
        token !==
          projectsSyncToken ||
        currentUser?.uid !==
          user.uid
      ) {
        return;
      }

      if (!cloud) {
        return;
      }

      /* Cloud có dữ liệu => Cloud thắng. */
      if (cloud.length > 0) {

        setProjectsCache(
          cloud
        );

        writeProjectCache(
          user.uid,
          cloud
        );

        renderProjectViews();

        return;
      }

      /*
        Cloud đang rỗng:
        chỉ migrate nếu local thật sự có dữ liệu.
        Không bao giờ xóa V2 cache chỉ vì cloud rỗng.
      */
      if (localProjects.length) {

        const migrated =
          await migrateLocalProjectsIfNeeded(
            user,
            localProjects
          );

        if (
          token !==
            projectsSyncToken ||
          currentUser?.uid !==
            user.uid
        ) {
          return;
        }

        if (migrated) {
          renderProjectViews();
          return;
        }

        /* Migration lỗi => giữ nguyên local cache. */
        renderProjectViews();
        return;
      }

      /* Cả local và cloud đều rỗng. */
      setProjectsCache([]);

      writeProjectCache(
        user.uid,
        []
      );

      renderProjectViews();

    } catch (error) {

      if (
        token ===
        projectsSyncToken
      ) {
        showProjectSyncError(
          error
        );
      }

    } finally {

      if (
        token ===
        projectsSyncToken
      ) {
        firestoreSyncRunning = false;
      }
    }
  }

  function handleAuthUser(user) {

    projectsSyncToken++;
    customersSyncToken++;
    employeesSyncToken++;
    historySyncToken++;

    currentUser =
      user || null;

    void syncCurrentUserProfile(currentUser);

    if (!user) {

      setProjectsCache([]);
      setCustomersCache([]);
      setEmployeesCache([]);
      setHistoryCache([]);

      renderProjectViews();

      if (currentPage === "customers") {
        renderCustomers();
      }

      if (currentPage === "employees") {
        renderEmployees();
      }

      updateStats();

      return;

    }

    const cachedProjects =
      getBestLocalProjects(user.uid);
    setProjectsCache(cachedProjects);

    const cachedCustomers =
      getBestLocalCustomers(user.uid);
    setCustomersCache(cachedCustomers);

    const cachedEmployees =
      getBestLocalEmployees(user.uid);
    setEmployeesCache(cachedEmployees);

    const cachedHistory =
      getBestLocalHistory(user.uid);
    setHistoryCache(cachedHistory);

    renderProjectViews();

    if (currentPage === "customers") {
      renderCustomers();
    }

    if (currentPage === "employees") {
      renderEmployees();
    }

    renderRecentDocuments();
    if (currentPage === "history") {
      renderHistory();
    }

    syncProjectsFromCloud(user);
    syncCustomersFromCloud(user);
    syncEmployeesFromCloud(user);
    syncHistoryFromCloud(user);

  }

  function initFirestoreAuthBridge() {

    const auth =
      getAuthObject();

    if (!auth) {

      console.warn(
        "GROVA DOCUMENT: Firebase Auth chưa sẵn sàng. App vẫn chạy local."
      );

      return;

    }

    authReadyPromise = new Promise((resolve) => {

      let settled = false;

      const finishInitialState = (user) => {
        handleAuthUser(user);

        if (!settled) {
          settled = true;
          resolve(user || null);
        }
      };

      auth.onAuthStateChanged(
        finishInitialState
      );

    });

  }

  /* =======================================================
     FIRESTORE SERVICE — CUSTOMERS
  ======================================================= */

  function getCustomersCollection() {
    if (!firestoreDb) {
      return null;
    }

    return firestoreDb.collection("customers");
  }

  function buildCustomerData(customer, user, isCreate = false) {
    const now =
      nowISO();

    const uid =
      user?.uid || "";

    return {
      id:
        String(customer.id),

      name:
        customer.name || "",

      phone:
        customer.phone || "",

      email:
        customer.email || "",

      taxCode:
        customer.taxCode || "",

      contact:
        customer.contact || "",

      address:
        customer.address || "",

      note:
        customer.note || "",

      createdAt:
        customer.createdAt ||
        now,

      updatedAt:
        customer.updatedAt ||
        now,

      createdBy:
        customer.createdBy ||
        uid,

      updatedBy:
        uid
    };
  }

  function mapFirestoreCustomer(doc) {
    const data =
      doc.data() || {};

    return {
      ...data,
      id:
        String(doc.id)
    };
  }

  async function readCloudCustomers() {
    if (!currentUser) {
      return null;
    }

    if (!initializeFirestore()) {
      return null;
    }

    await waitForFirestore();

    const collection =
      getCustomersCollection();

    if (!collection) {
      return null;
    }

    const snapshot =
      await collection.get();

    return normalizeCustomers(
      snapshot.docs.map(
        mapFirestoreCustomer
      )
    );
  }

  async function writeCloudCustomer(customer, user, isCreate = false) {
    if (!hasPermission("customers", isCreate ? "create" : "edit")) {
      throw new Error("PERMISSION_DENIED");
    }
    if (!user) {
      throw new Error(
        "AUTH_REQUIRED"
      );
    }

    if (!initializeFirestore()) {
      throw new Error(
        "FIRESTORE_UNAVAILABLE"
      );
    }

    await waitForFirestore();

    const data =
      buildCustomerData(
        customer,
        user,
        isCreate
      );

    const reference =
      getCustomersCollection()
        .doc(String(customer.id));

    await reference.set(
      data,
      {
        merge: true
      }
    );

    const verification =
      await reference.get();

    if (!verification.exists) {
      throw new Error(
        "WRITE_VERIFICATION_FAILED"
      );
    }

    return mapFirestoreCustomer(
      verification
    );
  }

  async function deleteCloudCustomer(id, user) {
    if (!hasPermission("customers", "delete")) {
      throw new Error("PERMISSION_DENIED");
    }
    if (!user) {
      throw new Error(
        "AUTH_REQUIRED"
      );
    }

    if (!initializeFirestore()) {
      throw new Error(
        "FIRESTORE_UNAVAILABLE"
      );
    }

    await waitForFirestore();

    const reference =
      getCustomersCollection()
        .doc(String(id));

    await reference.delete();

    const verification =
      await reference.get();

    if (verification.exists) {
      throw new Error(
        "DELETE_VERIFICATION_FAILED"
      );
    }

    return true;
  }

  function customerIds(customers) {
    return normalizeCustomers(customers)
      .map(
        (customer) =>
          String(customer.id)
      )
      .sort();
  }

  function sameCustomerIdSet(a, b) {
    const left =
      customerIds(a);

    const right =
      customerIds(b);

    if (
      left.length !==
      right.length
    ) {
      return false;
    }

    return left.every(
      (id, index) =>
        id === right[index]
    );
  }

  async function verifyCustomerMigration(expectedCustomers) {
    const cloud =
      await readCloudCustomers();

    if (!cloud) {
      return false;
    }

    const expected =
      normalizeCustomers(
        expectedCustomers
      );

    if (
      cloud.length !==
      expected.length
    ) {
      return false;
    }

    return sameCustomerIdSet(
      cloud,
      expected
    );
  }

  function showCustomerSyncError(error) {
    console.error(
      "GROVA DOCUMENT: Customer Firestore error.",
      error
    );

    showToast(
      "Không thể đồng bộ khách hàng. Ứng dụng vẫn đang dùng dữ liệu cục bộ."
    );
  }

  async function migrateLocalCustomersIfNeeded(
    user,
    localCustomers
  ) {
    if (!user) {
      return false;
    }

    const sourceCustomers =
      normalizeCustomers(
        localCustomers
      );

    if (!sourceCustomers.length) {
      return false;
    }

    const cloud =
      await readCloudCustomers();

    if (!cloud) {
      return false;
    }

    if (cloud.length > 0) {
      setCustomersCache(cloud);

      writeCustomerCache(
        user.uid,
        cloud
      );

      return false;
    }

    try {
      for (
        const customer of sourceCustomers
      ) {
        const data =
          buildCustomerData(
            customer,
            user,
            !customer.createdBy
          );

        await getCustomersCollection()
          .doc(String(customer.id))
          .set(data);
      }

      const verified =
        await verifyCustomerMigration(
          sourceCustomers
        );

      if (!verified) {
        throw new Error(
          "MIGRATION_VERIFICATION_FAILED"
        );
      }

      const migratedCloud =
        await readCloudCustomers();

      if (!migratedCloud) {
        throw new Error(
          "MIGRATION_READBACK_FAILED"
        );
      }

      setCustomersCache(
        migratedCloud
      );

      writeCustomerCache(
        user.uid,
        migratedCloud
      );

      showToast(
        "Đã đồng bộ khách hàng cũ lên Firestore."
      );

      return true;

    } catch (error) {
      showCustomerSyncError(
        error
      );

      return false;
    }
  }

  async function syncCustomersFromCloud(user) {
    if (!user) {
      return;
    }

    const token =
      ++customersSyncToken;

    customersSyncRunning = true;

    try {
      const initialized =
        initializeFirestore();

      if (!initialized) {
        return;
      }

      const localCustomers =
        getBestLocalCustomers(
          user.uid
        );

      if (localCustomers.length) {
        setCustomersCache(
          localCustomers
        );

        if (currentPage === "customers") {
          renderCustomers();
        }

        updateStats();
      }

      const cloud =
        await readCloudCustomers();

      if (
        token !==
          customersSyncToken ||
        currentUser?.uid !==
          user.uid
      ) {
        return;
      }

      if (!cloud) {
        return;
      }

      /* Cloud có dữ liệu => Cloud thắng. */
      if (cloud.length > 0) {
        setCustomersCache(
          cloud
        );

        writeCustomerCache(
          user.uid,
          cloud
        );

        if (currentPage === "customers") {
          renderCustomers();
        }

        updateStats();

        return;
      }

      /*
        Cloud đang rỗng:
        chỉ migrate nếu local thật sự có dữ liệu.
        Không bao giờ xóa cache chỉ vì cloud rỗng.
      */
      if (localCustomers.length) {
        const migrated =
          await migrateLocalCustomersIfNeeded(
            user,
            localCustomers
          );

        if (
          token !==
            customersSyncToken ||
          currentUser?.uid !==
            user.uid
        ) {
          return;
        }

        if (migrated) {
          if (currentPage === "customers") {
            renderCustomers();
          }

          updateStats();

          return;
        }

        /* Migration lỗi => giữ nguyên local cache. */
        if (currentPage === "customers") {
          renderCustomers();
        }

        updateStats();

        return;
      }

      /* Cả local và cloud đều rỗng. */
      setCustomersCache([]);

      writeCustomerCache(
        user.uid,
        []
      );

      if (currentPage === "customers") {
        renderCustomers();
      }

      updateStats();

    } catch (error) {
      if (
        token ===
        customersSyncToken
      ) {
        showCustomerSyncError(
          error
        );
      }

    } finally {
      if (
        token ===
        customersSyncToken
      ) {
        customersSyncRunning = false;
      }
    }
  }

  /* =======================================================
     FIRESTORE SERVICE — EMPLOYEES
  ======================================================= */

  function getEmployeesCollection() {
    if (!firestoreDb) return null;
    return firestoreDb.collection("employees");
  }

  function buildEmployeeData(employee, user) {
    const now = nowISO();
    const uid = user?.uid || "";
    return {
      id: String(employee.id),
      name: employee.name || "",
      position: employee.position || "",
      department: employee.department || "",
      phone: employee.phone || "",
      email: employee.email || "",
      startDate: employee.startDate || "",
      note: employee.note || "",
      createdAt: employee.createdAt || now,
      updatedAt: now,
      createdBy: employee.createdBy || uid,
      updatedBy: uid
    };
  }

  function mapFirestoreEmployee(doc) {
    return { ...(doc.data() || {}), id: String(doc.id) };
  }

  async function readCloudEmployees(user = currentUser) {
    if (!user) return null;
    if (!initializeFirestore()) return null;
    await waitForFirestore();
    const collection = getEmployeesCollection();
    if (!collection) return null;
    const snapshot = await collection.get();
    return normalizeEmployees(snapshot.docs.map(mapFirestoreEmployee));
  }

  async function writeCloudEmployee(employee, user) {
    const isCreate = !employee?.createdAt;
    if (!hasPermission("employees", isCreate ? "create" : "edit")) {
      throw new Error("PERMISSION_DENIED");
    }
    if (!user) throw new Error("AUTH_REQUIRED");
    if (!initializeFirestore()) throw new Error("FIRESTORE_UNAVAILABLE");
    await waitForFirestore();
    const reference = getEmployeesCollection().doc(String(employee.id));
    await reference.set(buildEmployeeData(employee, user), { merge: true });
    const verification = await reference.get();
    if (!verification.exists) throw new Error("WRITE_VERIFICATION_FAILED");
    return mapFirestoreEmployee(verification);
  }

  async function deleteCloudEmployee(id, user) {
    if (!hasPermission("employees", "delete")) {
      throw new Error("PERMISSION_DENIED");
    }
    if (!user) throw new Error("AUTH_REQUIRED");
    if (!initializeFirestore()) throw new Error("FIRESTORE_UNAVAILABLE");
    await waitForFirestore();
    const reference = getEmployeesCollection().doc(String(id));
    await reference.delete();
    const verification = await reference.get();
    if (verification.exists) throw new Error("DELETE_VERIFICATION_FAILED");
    return true;
  }

  function employeeIds(employees) {
    return normalizeEmployees(employees).map((employee) => String(employee.id)).sort();
  }

  function sameEmployeeIdSet(a, b) {
    const left = employeeIds(a);
    const right = employeeIds(b);
    if (left.length !== right.length) return false;
    return left.every((id, index) => id === right[index]);
  }

  async function verifyEmployeeMigration(expectedEmployees, user) {
    const cloud = await readCloudEmployees(user);
    if (!cloud) return false;
    const expected = normalizeEmployees(expectedEmployees);
    if (cloud.length !== expected.length) return false;
    return sameEmployeeIdSet(cloud, expected);
  }

  function showEmployeeSyncError(error) {
    console.error("GROVA DOCUMENT: Employee Firestore error.", error);
    showToast("Không thể đồng bộ nhân sự. Ứng dụng vẫn đang dùng dữ liệu cục bộ.");
  }

  async function migrateLocalEmployeesIfNeeded(user, localEmployees) {
    if (!user) return false;
    const sourceEmployees = normalizeEmployees(localEmployees);
    if (!sourceEmployees.length) return false;
    const cloud = await readCloudEmployees(user);
    if (!cloud) return false;
    if (cloud.length > 0) {
      setEmployeesCache(cloud);
      writeEmployeeCache(user.uid, cloud);
      return false;
    }
    try {
      for (const employee of sourceEmployees) {
        await getEmployeesCollection().doc(String(employee.id)).set(buildEmployeeData(employee, user));
      }
      if (!await verifyEmployeeMigration(sourceEmployees, user)) {
        throw new Error("MIGRATION_VERIFICATION_FAILED");
      }
      const migratedCloud = await readCloudEmployees(user);
      if (!migratedCloud) throw new Error("MIGRATION_READBACK_FAILED");
      setEmployeesCache(migratedCloud);
      writeEmployeeCache(user.uid, migratedCloud);
      showToast("Đã đồng bộ nhân sự cũ lên Firestore.");
      return true;
    } catch (error) {
      showEmployeeSyncError(error);
      return false;
    }
  }

  async function syncEmployeesFromCloud(user) {
    if (!user) return;
    const token = ++employeesSyncToken;
    employeesSyncRunning = true;
    try {
      if (!initializeFirestore()) return;
      const localEmployees = getBestLocalEmployees(user.uid);
      if (localEmployees.length) {
        setEmployeesCache(localEmployees);
        if (currentPage === "employees") renderEmployees();
        updateStats();
      }
      const cloud = await readCloudEmployees(user);
      if (token !== employeesSyncToken || currentUser?.uid !== user.uid) return;
      if (!cloud) return;
      if (cloud.length > 0) {
        setEmployeesCache(cloud);
        writeEmployeeCache(user.uid, cloud);
        if (currentPage === "employees") renderEmployees();
        updateStats();
        return;
      }
      if (localEmployees.length) {
        const migrated = await migrateLocalEmployeesIfNeeded(user, localEmployees);
        if (token !== employeesSyncToken || currentUser?.uid !== user.uid) return;
        if (currentPage === "employees") renderEmployees();
        updateStats();
        return;
      }
      setEmployeesCache([]);
      writeEmployeeCache(user.uid, []);
      if (currentPage === "employees") renderEmployees();
      updateStats();
    } catch (error) {
      if (token === employeesSyncToken) showEmployeeSyncError(error);
    } finally {
      if (token === employeesSyncToken) employeesSyncRunning = false;
    }
  }

  /* =======================================================
     ID / DATE
  ======================================================= */

  function createId(prefix = "GROVA") {

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

  function formatDate(value) {

    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
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

  function formatDateTime(value) {

    if (!value) {
      return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
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
     ESCAPE HTML
  ======================================================= */

  function escapeHTML(value) {

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }

  function slugStatus(value) {

    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, "-");

  }

  /* =======================================================
     TOAST
  ======================================================= */

  function showToast(message) {

    let container =
      document.querySelector(
        ".toast-container"
      );

    if (!container) {

      container =
        document.createElement("div");

      container.className =
        "toast-container";

      document.body.appendChild(
        container
      );

    }

    const toast =
      document.createElement("div");

    toast.className = "toast";

    toast.textContent = message;

    container.appendChild(toast);

    setTimeout(() => {

      toast.style.opacity = "0";

      toast.style.transform =
        "translateY(8px)";

      setTimeout(() => {
        toast.remove();
      }, 200);

    }, 2600);

  }

  /* =======================================================
     NAVIGATION
  ======================================================= */

  function getPagePermission(page) {
    const map = {
      documents: ["documents", "view"],
      projects: ["projects", "view"],
      customers: ["customers", "view"],
      employees: ["employees", "view"],
      history: ["history", "view"],
      reports: ["reports", "view"],
      ai: ["ai", "view"],
      settings: ["settings", "view"]
    };
    return map[page] || null;
  }

  function canViewPage(page) {
    const required = getPagePermission(page);
    if (!required) return true;
    return hasPermission(required[0], required[1]);
  }

  function permissionDeniedMessage(page) {
    const labels = {
      documents: "Văn bản",
      projects: "Công trình",
      customers: "Khách hàng",
      employees: "Nhân sự",
      history: "Lịch sử",
      reports: "Báo cáo",
      ai: "GROVA AI",
      settings: "Cài đặt"
    };
    return `Bạn không có quyền xem ${labels[page] || "nội dung này"}.`;
  }

  function refreshPermissionUI() {
    const canCreateDocuments =
      hasPermission("documents", "create");

    $$('[data-action="new-document"]').forEach((button) => {
      button.style.display = canCreateDocuments ? "" : "none";
      button.setAttribute(
        "aria-hidden",
        canCreateDocuments ? "false" : "true"
      );
    });

    $$(".nav-item[data-page]").forEach((button) => {
      const page = button.dataset.page;
      const allowed = canViewPage(page);
      button.style.display = allowed ? "" : "none";
      button.setAttribute("aria-hidden", allowed ? "false" : "true");
    });

    if (currentUserProfile?.status !== "active" && !isAdminUser()) {
      $$(".nav-item[data-page]").forEach((button) => {
        const page = button.dataset.page;
        if (page !== "dashboard") button.style.display = "none";
      });
    }
  }

  function showPermissionDenied(page) {
    showToast(permissionDeniedMessage(page));
    return false;
  }

  function showPage(page) {

    if (!PAGE_INFO[page]) {
      page = "dashboard";
    }

    if (page !== "dashboard" && !canViewPage(page)) {
      refreshPermissionUI();
      showPermissionDenied(page);
      page = "dashboard";
    }

    currentPage = page;

    $$(".page").forEach((element) => {

      element.classList.toggle(
        "active",
        element.id === `page-${page}`
      );

    });

    $$(".nav-item").forEach((button) => {

      button.classList.toggle(
        "active",
        button.dataset.page === page
      );

    });

    const info = PAGE_INFO[page];

    $("#pageTitle").textContent =
      info.title;

    $("#pageSubtitle").textContent =
      info.subtitle;

    closeSidebar();

    if (page === "dashboard") {
      renderDashboard();
    }

    if (page === "documents") {
      renderDocuments();
    }

    if (page === "projects") {
      renderProjects();
    }

    if (page === "customers") {
      renderCustomers();
    }

    if (page === "employees") {
      renderEmployees();
    }

    if (page === "history") {
      renderHistory();
    }

    if (page === "reports") {
      renderReports();
    }

    if (page === "ai") {
      renderGrovaAI();
    }

    if (page === "settings") {
      renderSettings();
    }

  }

  function openSidebar() {

    const sidebar = $("#sidebar");

    if (!sidebar) {
      return;
    }

    sidebar.classList.add("open");

    ensureSidebarOverlay();

  }

  function closeSidebar() {

    const sidebar = $("#sidebar");

    if (sidebar) {
      sidebar.classList.remove("open");
    }

    const overlay =
      document.querySelector(
        ".sidebar-overlay"
      );

    if (overlay) {
      overlay.classList.remove("show");
    }

  }

  function ensureSidebarOverlay() {

    let overlay =
      document.querySelector(
        ".sidebar-overlay"
      );

    if (!overlay) {

      overlay =
        document.createElement("div");

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

    overlay.classList.add("show");

  }

  /* =======================================================
     DOCUMENT TEMPLATES
  ======================================================= */

  function getTemplates() {

    return Array.isArray(DATA.templates)
      ? DATA.templates.filter(
          (item) => item && item.enabled !== false
        )
      : [];

  }

  function renderDocumentCard(template) {

    return `
      <article class="doc-card">

        <div class="doc-top">

          <div class="doc-icon">
            ${escapeHTML(template.icon || "📄")}
          </div>

          <span class="doc-code">
            ${escapeHTML(template.code || "")}
          </span>

        </div>

        <h3>
          ${escapeHTML(template.name || template.title || "")}
        </h3>

        <p>
          ${escapeHTML(template.description || "")}
        </p>

        <div class="doc-meta">

          <span class="category">
            ${escapeHTML(template.category || "Văn bản")}
          </span>

          <button
            class="doc-open"
            type="button"
            data-template-id="${escapeHTML(template.id)}"
            ${hasDocumentTemplatePermission(template.id, "create") ? "" : "disabled"}
          >
            ${hasDocumentTemplatePermission(template.id, "create") ? "Tạo văn bản →" : "Chỉ xem"}
          </button>

        </div>

      </article>
    `;

  }

  function renderDocuments() {

    if (!hasPermission("documents", "view")) {
      showPermissionDenied("documents");
      return;
    }

    const templates = getTemplates();

    const search =
      ($("#documentSearch")?.value || "")
        .trim()
        .toLowerCase();

    const category =
      $("#documentCategory")?.value || "";

    const filtered =
      templates.filter((template) => {

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
          template.category === category;

        return (
          matchSearch &&
          matchCategory
        );

      });

    const html =
      filtered.length
        ? filtered
            .map(renderDocumentCard)
            .join("")
        : emptyState(
            "Không tìm thấy mẫu",
            "Thử thay đổi từ khóa hoặc loại văn bản.",
            "🔎"
          );

    if ($("#documentGrid")) {
      $("#documentGrid").innerHTML =
        templates
          .slice(0, 6)
          .map(renderDocumentCard)
          .join("") ||
        emptyState(
          "Chưa có mẫu văn bản",
          "Danh mục mẫu đang trống.",
          "📄"
        );
    }

    if ($("#documentsPageGrid")) {
      $("#documentsPageGrid").innerHTML =
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
      categories.includes(current)
        ? current
        : "";

  }

  function findTemplate(id) {

    return getTemplates().find(
      (template) =>
        String(template.id) ===
        String(id)
    );

  }

  function openTemplate(id) {

    if (!hasPermission("documents", "create")) {
      showPermissionDenied("documents");
      return;
    }

    const template =
      findTemplate(id);

    if (!template) {

      showToast(
        "Không tìm thấy mẫu văn bản."
      );

      return;

    }

    if (!hasDocumentTemplatePermission(template.id, "create")) {
      showToast("Bạn chưa được cấp quyền tạo văn bản này.");
      return;
    }

    if (!template.file) {

      showToast(
        "Mẫu văn bản chưa được cấu hình đường dẫn."
      );

      return;

    }

    /*
      Không chờ Firestore trước khi mở văn bản.
      History được cập nhật local trước, còn đồng bộ cloud
      chạy nền để không làm kẹt luồng mở văn bản sau khi Back.
    */
    void addHistory(template);

    window.location.href =
      template.file;

  }

  /* =======================================================
     NEW DOCUMENT MODAL
  ======================================================= */

  function openTemplatePicker() {

    if (!hasPermission("documents", "create")) {
      showPermissionDenied("documents");
      return;
    }

    const templates =
      getTemplates().filter((template) => hasDocumentTemplatePermission(template.id, "create"));

    if (!templates.length) {

      showToast(
        "Chưa có mẫu văn bản."
      );

      showPage("documents");

      return;

    }

    modalMode =
      "template-picker";

    modalEditId = null;

    $("#modalEyebrow").textContent =
      "GROVA DOCUMENT";

    $("#modalTitle").textContent =
      "Chọn mẫu văn bản";

    $("#modalBody").innerHTML = `

      <div class="template-picker">

        ${templates
          .map(
            (template) => `

              <button
                type="button"
                class="template-option"
                data-picker-template-id="${escapeHTML(template.id)}"
              >

                <span class="template-option-icon">
                  ${escapeHTML(template.icon || "📄")}
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

    $("#modalSave").style.display =
      "none";

    openModal();

  }

  /* =======================================================
     MODAL
  ======================================================= */

  function openModal() {

    const modal = $("#modal");

    if (!modal) {
      return;
    }

    modal.classList.remove("hidden");

    modal.setAttribute(
      "aria-hidden",
      "false"
    );

  }

  function closeModal() {

    const modal = $("#modal");

    if (!modal) {
      return;
    }

    modal.classList.add("hidden");

    modal.setAttribute(
      "aria-hidden",
      "true"
    );

    modalMode = "";

    modalEditId = null;

    if ($("#modalSave")) {
      $("#modalSave").style.display =
        "";
    }

  }

  /* =======================================================
     EMPTY STATE
  ======================================================= */

  function emptyState(
    title,
    description,
    icon = "📁"
  ) {

    return `
      <div class="empty-state">

        <div class="empty-state-icon">
          ${icon}
        </div>

        <h3>
          ${escapeHTML(title)}
        </h3>

        <p>
          ${escapeHTML(description)}
        </p>

      </div>
    `;

  }

  /* =======================================================
     HISTORY — FIRESTORE PHASE 4
  ======================================================= */

  function getHistoryCollection() {
    if (!firestoreDb) return null;
    return firestoreDb.collection("history");
  }

  function buildHistoryData(item, user) {
    const now = nowISO();
    const uid = user?.uid || "";

    return {
      id: String(item.id),
      templateId: String(item.templateId),
      code: item.code || "",
      name: item.name || "",
      icon: item.icon || "📄",
      openedAt: item.openedAt || now,
      createdAt: item.createdAt || now,
      updatedAt: now,
      createdBy: item.createdBy || uid,
      updatedBy: uid,
      type: "document_open"
    };
  }

  function mapFirestoreHistory(doc) {
    return {
      ...(doc.data() || {}),
      id: String(doc.id)
    };
  }

  async function readCloudHistory(user = currentUser) {
    if (!user) return null;
    if (!initializeFirestore()) return null;
    await waitForFirestore();

    const collection = getHistoryCollection();
    if (!collection) return null;

    const snapshot = await collection
      .where("createdBy", "==", user.uid)
      .get();

    return normalizeHistory(
      snapshot.docs.map(mapFirestoreHistory)
    );
  }

  function getHistoryDocumentId(item, user) {
    return (
      "HIS_" +
      encodeURIComponent(String(user?.uid || "")) +
      "_" +
      encodeURIComponent(String(item?.templateId || ""))
    );
  }

  async function writeCloudHistory(item, user) {
    if (!user) throw new Error("AUTH_REQUIRED");
    if (!initializeFirestore()) {
      throw new Error("FIRESTORE_UNAVAILABLE");
    }

    await waitForFirestore();

    const reference = getHistoryCollection().doc(
      getHistoryDocumentId(item, user)
    );

    await reference.set(
      buildHistoryData(item, user),
      { merge: true }
    );

    const verification = await reference.get();
    if (!verification.exists) {
      throw new Error("WRITE_VERIFICATION_FAILED");
    }

    return mapFirestoreHistory(verification);
  }

  async function clearCloudHistory(user) {
    if (!user) throw new Error("AUTH_REQUIRED");
    if (!initializeFirestore()) {
      throw new Error("FIRESTORE_UNAVAILABLE");
    }

    await waitForFirestore();

    const collection = getHistoryCollection();
    const snapshot = await collection
      .where("createdBy", "==", user.uid)
      .get();

    for (const doc of snapshot.docs) {
      await doc.ref.delete();
    }

    const verification = await collection
      .where("createdBy", "==", user.uid)
      .get();

    if (!verification.empty) {
      throw new Error("CLEAR_VERIFICATION_FAILED");
    }

    return true;
  }

  async function verifyHistoryMigration(expectedHistory, user) {
    const cloud = await readCloudHistory(user);
    if (!cloud) return false;

    const expected = normalizeHistory(expectedHistory);
    if (cloud.length !== expected.length) return false;

    const expectedIds = expected
      .map((item) => String(item.id))
      .sort();

    const cloudIds = cloud
      .map((item) => String(item.id))
      .sort();

    return expectedIds.every(
      (id, index) => id === cloudIds[index]
    );
  }

  function showHistorySyncError(error) {
    console.error(
      "GROVA DOCUMENT: History Firestore error.",
      error
    );

    showToast(
      "Không thể đồng bộ lịch sử. Ứng dụng vẫn đang dùng dữ liệu cục bộ."
    );
  }

  async function migrateLocalHistoryIfNeeded(
    user,
    localHistory
  ) {
    if (!user) return false;

    const sourceHistory =
      normalizeHistory(localHistory)
        .map((item) => ({
          ...item,
          createdBy: user.uid
        }));

    if (!sourceHistory.length) return false;

    const cloud = await readCloudHistory(user);
    if (!cloud) return false;

    if (cloud.length > 0) {
      setHistoryCache(cloud);
      writeHistoryCache(user.uid, cloud);
      clearLegacyHistoryStorage();
      return false;
    }

    try {
      for (const item of sourceHistory) {
        await getHistoryCollection()
          .doc(getHistoryDocumentId(item, user))
          .set(buildHistoryData(item, user));
      }

      if (
        !(await verifyHistoryMigration(
          sourceHistory,
          user
        ))
      ) {
        throw new Error(
          "MIGRATION_VERIFICATION_FAILED"
        );
      }

      const migratedCloud =
        await readCloudHistory(user);

      if (!migratedCloud) {
        throw new Error(
          "MIGRATION_READBACK_FAILED"
        );
      }

      setHistoryCache(migratedCloud);
      writeHistoryCache(
        user.uid,
        migratedCloud
      );
      clearLegacyHistoryStorage();

      showToast(
        "Đã đồng bộ lịch sử cũ lên Firestore."
      );

      return true;
    } catch (error) {
      showHistorySyncError(error);
      return false;
    }
  }

  async function syncHistoryFromCloud(user) {
    if (!user) return;

    const token = ++historySyncToken;
    historySyncRunning = true;

    try {
      if (!initializeFirestore()) return;

      const localHistory =
        getBestLocalHistory(user.uid);

      if (localHistory.length) {
        setHistoryCache(localHistory);
        writeHistoryCache(
          user.uid,
          localHistory
        );
        renderRecentDocuments();
        if (currentPage === "history") {
          renderHistory();
        }
        updateStats();
      }

      const cloud =
        await readCloudHistory(user);

      if (
        token !== historySyncToken ||
        currentUser?.uid !== user.uid
      ) {
        return;
      }

      if (!cloud) return;

      /* Cloud có dữ liệu => Cloud thắng. */
      if (cloud.length > 0) {
        setHistoryCache(cloud);
        writeHistoryCache(user.uid, cloud);
        clearLegacyHistoryStorage();
        renderRecentDocuments();
        if (currentPage === "history") {
          renderHistory();
        }
        updateStats();
        return;
      }

      /*
        Cloud đang rỗng: chỉ migrate nếu local thật sự có dữ liệu.
        Không xóa local chỉ vì cloud rỗng.
      */
      if (localHistory.length) {
        const migrated =
          await migrateLocalHistoryIfNeeded(
            user,
            localHistory
          );

        if (
          token !== historySyncToken ||
          currentUser?.uid !== user.uid
        ) {
          return;
        }

        if (migrated) {
          renderRecentDocuments();
          if (currentPage === "history") {
            renderHistory();
          }
          updateStats();
          return;
        }

        /* Migration lỗi => giữ nguyên local cache. */
        renderRecentDocuments();
        if (currentPage === "history") {
          renderHistory();
        }
        updateStats();
        return;
      }

      /* Cả local và cloud đều rỗng. */
      setHistoryCache([]);
      writeHistoryCache(user.uid, []);
      clearLegacyHistoryStorage();
      renderRecentDocuments();
      if (currentPage === "history") {
        renderHistory();
      }
      updateStats();

    } catch (error) {
      if (token === historySyncToken) {
        showHistorySyncError(error);
      }
    } finally {
      if (token === historySyncToken) {
        historySyncRunning = false;
      }
    }
  }

  async function addHistory(template) {

    if (!template) return false;

    const history =
      getHistory();

    const item = {
      id: createId("HIS"),
      templateId: String(template.id),
      code: template.code || "",
      name: template.name || template.title || "",
      icon: template.icon || "📄",
      openedAt: nowISO()
    };

    const filtered =
      history.filter(
        (oldItem) =>
          String(oldItem.templateId) !==
          String(template.id)
      );

    const nextHistory =
      normalizeHistory([
        item,
        ...filtered
      ]);

    /*
      Cập nhật local ngay lập tức.
      Việc mở văn bản không được phụ thuộc vào Firebase.
    */
    setHistoryCache(nextHistory);

    if (currentUser?.uid) {
      writeHistoryCache(
        currentUser.uid,
        nextHistory
      );
    }

    writeStorage(
      STORAGE.history,
      nextHistory
    );

    updateStats();
    renderRecentDocuments();

    if (currentPage === "history") {
      renderHistory();
    }

    if (!currentUser) {
      return true;
    }

    /*
      Đồng bộ Firestore chạy nền.
      openTemplate() không await hàm này.
    */
    try {

      const authUser =
        await getActiveAuthUser();

      if (!authUser) {
        throw new Error("AUTH_REQUIRED");
      }

      const savedItem =
        await writeCloudHistory(
          item,
          authUser
        );

      const latestHistory =
        getHistory();

      const withoutTemplate =
        latestHistory.filter(
          (oldItem) =>
            String(oldItem.templateId) !==
            String(template.id)
        );

      const finalHistory =
        normalizeHistory([
          savedItem,
          ...withoutTemplate
        ]);

      setHistoryCache(finalHistory);

      writeHistoryCache(
        authUser.uid,
        finalHistory
      );

      writeStorage(
        STORAGE.history,
        finalHistory
      );

      updateStats();
      renderRecentDocuments();

      if (currentPage === "history") {
        renderHistory();
      }

      return true;

    } catch (error) {

      console.error(
        "GROVA DOCUMENT: addHistory background sync failed.",
        error
      );

      /*
        Không showToast ở đây vì trang có thể đã chuyển sang
        văn bản. History local vẫn được giữ lại.
      */
      return false;

    }

  }

  function renderHistory() {

    if (!hasPermission("history", "view")) {
      showPermissionDenied("history");
      return;
    }
    const container =
      $("#historyList");

    if (!container) return;

    const history = getHistory();

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
                ${escapeHTML(item.icon || "📄")}
              </div>
              <div class="history-content">
                <b>
                  ${escapeHTML(item.name || "")}
                </b>
                <span>
                  ${escapeHTML(item.code || "")}
                </span>
              </div>
              <div class="history-time">
                ${escapeHTML(
                  formatDateTime(item.openedAt)
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

    if (!container) return;

    const history = getHistory();

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
                ${escapeHTML(item.icon || "📄")}
              </div>
              <div class="history-content">
                <b>
                  ${escapeHTML(item.name || "")}
                </b>
                <span>
                  ${escapeHTML(item.code || "")}
                </span>
              </div>
              <div class="history-time">
                ${escapeHTML(
                  formatDateTime(item.openedAt)
                )}
              </div>
            </div>
          `
        )
        .join("");
  }

  async function clearHistory() {
    const history = getHistory();

    if (!history.length) {
      showToast("Lịch sử đang trống.");
      return;
    }

    const ok = confirm(
      "Bạn có chắc muốn xóa toàn bộ lịch sử hoạt động?"
    );

    if (!ok) return;

    try {
      const authUser =
        await getActiveAuthUser();

      if (!authUser) {
        throw new Error("AUTH_REQUIRED");
      }

      await clearCloudHistory(authUser);

      setHistoryCache([]);
      writeHistoryCache(authUser.uid, []);
      writeStorage(STORAGE.history, []);

      renderHistory();
      renderRecentDocuments();
      updateStats();

      showToast("Đã xóa lịch sử.");
    } catch (error) {
      console.error(
        "GROVA DOCUMENT: clearHistory failed.",
        error
      );

      if (error?.message === "AUTH_REQUIRED") {
        showToast(
          "Chưa đăng nhập. Không thể xóa lịch sử."
        );
      } else {
        showToast(
          "Không thể xóa lịch sử trên hệ thống. Dữ liệu chưa bị thay đổi."
        );
      }
    }
  }

  /* =======================================================
     LIST PRINTING — VERSION 224
     Bản in danh sách A4 chuyên nghiệp, có logo GROVA,
     đầy đủ tiêu đề, phạm vi dữ liệu, điều kiện tìm kiếm/lọc
     và bảng dữ liệu. Không thay đổi dữ liệu, không cấp số.
  ======================================================= */

  function printListDocument(title, columns, rows, scopeLabel, description = "") {

    if (!Array.isArray(rows) || !rows.length) {
      showToast("Không có dữ liệu để in.");
      return;
    }

    const now = new Date();
    const printedAt = now.toLocaleString("vi-VN", {
      dateStyle: "long",
      timeStyle: "short"
    });

    const settings = readStorage(STORAGE.settings) || {};
    const companyName =
      settings.companyName ||
      "CÔNG TY CỔ PHẦN GROVA HOLDINGS";
    const companyTaxCode = settings.taxCode || "";
    const logoUrl = new URL(
      "./data/grova_logo.png",
      window.location.href
    ).href;

    const head = columns
      .map((column) => `<th>${escapeHTML(column.label)}</th>`)
      .join("");

    const body = rows
      .map((row, index) => `
        <tr>
          <td class="stt">${index + 1}</td>
          ${columns.map((column) => `
            <td>${escapeHTML(row[column.key] ?? "")}</td>
          `).join("")}
        </tr>
      `)
      .join("");

    const taxLine = companyTaxCode
      ? `<div class="company-tax">Mã số thuế: ${escapeHTML(companyTaxCode)}</div>`
      : "";

    const descriptionHtml = description
      ? `<p class="description">${escapeHTML(description)}</p>`
      : "";

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHTML(title)}</title>
<style>
  @page { size: A4 landscape; margin: 13mm 12mm 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #171717;
    background: #fff;
    font-size: 11px;
    line-height: 1.45;
  }
  .document {
    width: 100%;
    margin: 0 auto;
  }
  .letterhead {
    display: grid;
    grid-template-columns: 78px 1fr auto;
    gap: 14px;
    align-items: center;
    padding-bottom: 9px;
    border-bottom: 2px solid #222;
  }
  .logo-wrap {
    width: 68px;
    height: 68px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .logo {
    max-width: 68px;
    max-height: 68px;
    object-fit: contain;
  }
  .company-name {
    font-size: 16px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .15px;
  }
  .company-sub {
    margin-top: 3px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .7px;
    text-transform: uppercase;
  }
  .company-tax {
    margin-top: 3px;
    font-size: 9.5px;
  }
  .print-meta {
    text-align: right;
    font-size: 9.5px;
    line-height: 1.55;
    white-space: nowrap;
  }
  .print-meta strong { color: #111; }
  .title-block {
    text-align: center;
    padding: 15px 0 10px;
  }
  h1 {
    margin: 0;
    font-size: 18px;
    line-height: 1.25;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .2px;
  }
  .title-rule {
    width: 70px;
    margin: 7px auto 0;
    border-top: 2px solid #222;
  }
  .description {
    margin: 8px 0 4px;
    text-align: center;
    font-size: 10.5px;
  }
  .scope-box {
    margin: 7px 0 12px;
    padding: 7px 10px;
    border: 1px solid #bdbdbd;
    background: #fafafa;
    font-size: 10px;
  }
  .scope-label {
    font-weight: 700;
    margin-right: 5px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: auto;
  }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  th, td {
    border: 1px solid #777;
    padding: 6px 7px;
    vertical-align: middle;
    overflow-wrap: anywhere;
  }
  th {
    background: #eeeeee;
    font-weight: 800;
    text-align: center;
    line-height: 1.3;
  }
  td { line-height: 1.4; }
  td.stt, th:first-child {
    width: 42px;
    min-width: 42px;
    text-align: center;
  }
  .summary {
    margin-top: 9px;
    padding-top: 7px;
    border-top: 1px solid #777;
    font-size: 10.5px;
  }
  .summary strong { font-size: 11px; }
  .closing {
    margin-top: 18px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 30px;
    page-break-inside: avoid;
  }
  .closing-box {
    min-height: 68px;
    text-align: center;
    font-size: 10px;
  }
  .closing-box strong {
    display: block;
    font-size: 10.5px;
    text-transform: uppercase;
  }
  .signature-space { height: 42px; }
  .footer {
    margin-top: 12px;
    padding-top: 6px;
    border-top: 1px solid #bbb;
    display: flex;
    justify-content: space-between;
    gap: 20px;
    color: #555;
    font-size: 8.5px;
  }
  @media print {
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
  <main class="document">
    <header class="letterhead">
      <div class="logo-wrap">
        <img class="logo" src="${escapeHTML(logoUrl)}" alt="GROVA HOLDINGS">
      </div>
      <div>
        <div class="company-name">${escapeHTML(companyName)}</div>
        <div class="company-sub">GROVA DOCUMENT</div>
        ${taxLine}
      </div>
      <div class="print-meta">
        <div><strong>Ngày in</strong></div>
        <div>${escapeHTML(printedAt)}</div>
      </div>
    </header>

    <section class="title-block">
      <h1>${escapeHTML(title)}</h1>
      <div class="title-rule"></div>
      ${descriptionHtml}
    </section>

    <div class="scope-box">
      <span class="scope-label">Phạm vi dữ liệu:</span>
      <span>${escapeHTML(scopeLabel)}</span>
    </div>

    <table>
      <thead>
        <tr><th>STT</th>${head}</tr>
      </thead>
      <tbody>${body}</tbody>
    </table>

    <div class="summary">
      Tổng số bản ghi trong danh sách: <strong>${rows.length}</strong>
    </div>

    <section class="closing">
      <div class="closing-box">
        <strong>Đơn vị lập danh sách</strong>
        <div class="signature-space"></div>
      </div>
      <div class="closing-box">
        <strong>${escapeHTML(companyName)}</strong>
        <div class="signature-space"></div>
      </div>
    </section>

    <footer class="footer">
      <span>GROVA DOCUMENT</span>
      <span>Danh sách được in từ dữ liệu hiện tại trên hệ thống.</span>
    </footer>
  </main>
</body>
</html>`;

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      showToast("Trình duyệt đã chặn cửa sổ in. Hãy cho phép mở cửa sổ mới rồi thử lại.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    // Safari/iPad có thể không phát sinh load event ổn định sau document.write().
    // Chờ DOM + logo tải xong rồi mới gọi print(), tránh mở trang trắng.
    const triggerPrint = () => {
      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (error) {
          console.error("GROVA DOCUMENT: Không thể mở hộp thoại in.", error);
        }
      }, 500);
    };

    try {
      const logo = printWindow.document.querySelector("img.logo");
      if (logo && !logo.complete) {
        logo.addEventListener("load", triggerPrint, { once: true });
        logo.addEventListener("error", triggerPrint, { once: true });
        setTimeout(triggerPrint, 1500);
      } else {
        triggerPrint();
      }
    } catch (error) {
      triggerPrint();
    }
  }

  function getProjectPrintRows(useFiltered = true) {
    const projects = getProjects();
    if (!useFiltered) return projects;

    const search = $("#projectSearch")?.value || "";
    const status = $("#projectStatus")?.value || "";
    const query = search.trim().toLowerCase();

    return projects.filter((project) => {
      const text = [project.name, project.customer, project.address, project.code, project.note]
        .join(" ").toLowerCase();
      return (!query || text.includes(query)) && (!status || project.status === status);
    });
  }

  function getCustomerPrintRows(useFiltered = true) {
    const customers = getCustomers();
    if (!useFiltered) return customers;

    const search = $("#customerSearch")?.value || "";
    const query = search.trim().toLowerCase();

    return customers.filter((customer) => {
      const text = [customer.name, customer.phone, customer.taxCode, customer.address, customer.email, customer.note]
        .join(" ").toLowerCase();
      return !query || text.includes(query);
    });
  }

  function getEmployeePrintRows(useFiltered = true) {
    const employees = getEmployees();
    if (!useFiltered) return employees;

    const search = $("#employeeSearch")?.value || "";
    const query = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const text = [employee.name, employee.phone, employee.position, employee.department, employee.email, employee.note]
        .join(" ").toLowerCase();
      return !query || text.includes(query);
    });
  }

  function printProjects(useFiltered = true) {
    if (!hasPermission("projects", "view")) {
      showToast(permissionDeniedMessage("projects"));
      return;
    }
    const rows = getProjectPrintRows(useFiltered).map((project) => ({
      name: project.name || "",
      code: project.code || "",
      customer: project.customer || "",
      address: project.address || "",
      status: project.status || "Chuẩn bị"
    }));
    const search = $("#projectSearch")?.value?.trim() || "";
    const status = $("#projectStatus")?.value || "";
    const scope = useFiltered
      ? `Kết quả tìm kiếm/lọc hiện tại${search ? ` — Từ khóa tìm kiếm: “${search}”` : ""}${status ? ` — Trạng thái: ${status}` : ""}`
      : "Toàn bộ danh sách công trình đang được lưu trên hệ thống";
    printListDocument(
      "DANH SÁCH CÔNG TRÌNH",
      [
        { key:"name", label:"Tên công trình" },
        { key:"code", label:"Mã công trình" },
        { key:"customer", label:"Tên khách hàng" },
        { key:"address", label:"Địa chỉ công trình" },
        { key:"status", label:"Trạng thái" }
      ],
      rows,
      scope,
      "Danh sách công trình được tổng hợp từ dữ liệu quản lý công trình trên hệ thống GROVA DOCUMENT."
    );
  }

  function printCustomers(useFiltered = true) {
    if (!hasPermission("customers", "view")) {
      showToast(permissionDeniedMessage("customers"));
      return;
    }
    const rows = getCustomerPrintRows(useFiltered).map((customer) => ({
      name: customer.name || "",
      taxCode: customer.taxCode || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || ""
    }));
    const search = $("#customerSearch")?.value?.trim() || "";
    const scope = useFiltered
      ? `Kết quả tìm kiếm hiện tại${search ? ` — Từ khóa tìm kiếm: “${search}”` : ""}`
      : "Toàn bộ danh sách khách hàng đang được lưu trên hệ thống";
    printListDocument(
      "DANH SÁCH KHÁCH HÀNG",
      [
        { key:"name", label:"Tên khách hàng" },
        { key:"taxCode", label:"Mã số thuế" },
        { key:"phone", label:"Số điện thoại" },
        { key:"email", label:"Địa chỉ thư điện tử" },
        { key:"address", label:"Địa chỉ" }
      ],
      rows,
      scope,
      "Danh sách khách hàng được tổng hợp từ dữ liệu khách hàng trên hệ thống GROVA DOCUMENT."
    );
  }

  function printEmployees(useFiltered = true) {
    if (!hasPermission("employees", "view")) {
      showToast(permissionDeniedMessage("employees"));
      return;
    }
    const rows = getEmployeePrintRows(useFiltered).map((employee) => ({
      name: employee.name || "",
      position: employee.position || "",
      department: employee.department || "",
      phone: employee.phone || "",
      email: employee.email || ""
    }));
    const search = $("#employeeSearch")?.value?.trim() || "";
    const scope = useFiltered
      ? `Kết quả tìm kiếm hiện tại${search ? ` — Từ khóa tìm kiếm: “${search}”` : ""}`
      : "Toàn bộ danh sách nhân sự đang được lưu trên hệ thống";
    printListDocument(
      "DANH SÁCH NHÂN SỰ",
      [
        { key:"name", label:"Họ và tên" },
        { key:"position", label:"Chức vụ" },
        { key:"department", label:"Bộ phận" },
        { key:"phone", label:"Số điện thoại" },
        { key:"email", label:"Địa chỉ thư điện tử" }
      ],
      rows,
      scope,
      "Danh sách nhân sự được tổng hợp từ dữ liệu quản lý nhân sự trên hệ thống GROVA DOCUMENT."
    );
  }

  /* =======================================================
     PROJECTS
  ======================================================= */

  function renderProjects() {

    if (!hasPermission("projects", "view")) {
      const deniedContainer =
        $("#projectsList");
      if (deniedContainer) {
        deniedContainer.innerHTML =
          emptyState(
            "Không có quyền xem",
            permissionDeniedMessage("projects"),
            "🔒"
          );
      }
      return;
    }

    const container =
      $("#projectsList");

    if (!container) {
      return;
    }

    const search =
      ($("#projectSearch")?.value || "")
        .trim()
        .toLowerCase();

    const status =
      $("#projectStatus")?.value || "";

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
            project.status === status;

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

                ${project.latitude && project.longitude ? `
                <p class="sub" style="margin-top:6px;">
                  <span style="display:inline-flex;align-items:center;gap:6px;">
                    📍 Đã ghim vị trí
                  </span>
                </p>
                ` : ""}

              </div>

              <div>

                <span class="status ${slugStatus(project.status)}">
                  ${escapeHTML(
                    project.status ||
                    "Chuẩn bị"
                  )}
                </span>

              </div>

              <div class="data-actions">

                ${project.latitude && project.longitude ? `
                <button
                  type="button"
                  class="small-btn"
                  data-action="open-project-location"
                  data-id="${escapeHTML(project.id)}"
                  title="Mở vị trí công trình trên Google Maps"
                >
                  🗺 Vị trí
                </button>
                ` : ""}

                ${hasPermission("projects", "edit") ? `
                <button
                  type="button"
                  class="small-btn"
                  data-action="edit-project"
                  data-id="${escapeHTML(project.id)}"
                >
                  Sửa
                </button>
                ` : ""}

                ${hasPermission("projects", "delete") ? `
                <button
                  type="button"
                  class="small-btn delete"
                  data-action="delete-project"
                  data-id="${escapeHTML(project.id)}"
                >
                  Xóa
                </button>
                ` : ""}

              </div>

            </div>

          `
        )
        .join("");

  }

  function openProjectModal(id = null) {

    const requiredAction = id ? "edit" : "create";
    if (!hasPermission("projects", requiredAction)) {
      showToast(
        id
          ? "Bạn không có quyền sửa công trình."
          : "Bạn không có quyền thêm công trình."
      );
      return;
    }

    if (id && !hasPermission("projects", "edit")) {
      showToast("Bạn không có quyền sửa công trình.");
      return;
    }
    if (!id && !hasPermission("projects", "create")) {
      showToast("Bạn không có quyền thêm công trình.");
      return;
    }

    modalMode = "project";

    modalEditId = id;

    const project =
      id
        ? getProjects().find(
            (item) =>
              item.id === id
          )
        : null;

    $("#modalEyebrow").textContent =
      "CÔNG TRÌNH";

    $("#modalTitle").textContent =
      project
        ? "Sửa công trình"
        : "Công trình mới";

    $("#modalBody").innerHTML = `

      <div class="modal-form">

        <label class="full">
          Tên công trình

          <input
            id="modalProjectName"
            type="text"
            placeholder="Ví dụ: Công trình nhà anh Nguyễn Văn A"
            value="${escapeHTML(project?.name || "")}"
          >

        </label>

        <label>
          Mã công trình

          <input
            id="modalProjectCode"
            type="text"
            placeholder="CT-001"
            value="${escapeHTML(project?.code || "")}"
          >

        </label>

        <label>
          Khách hàng

          <input
            id="modalProjectCustomer"
            type="text"
            placeholder="Tên khách hàng"
            value="${escapeHTML(project?.customer || "")}"
          >

        </label>

        <label class="full">
          Địa chỉ công trình

          <textarea
            id="modalProjectAddress"
            placeholder="Địa chỉ..."
          >${escapeHTML(project?.address || "")}</textarea>

        </label>

        <div class="full" style="border:1px solid #dbe5df;border-radius:14px;padding:14px;background:#f8fbf9;">
          <div style="font-weight:700;margin-bottom:8px;">📍 Vị trí công trình</div>
          <div style="font-size:13px;color:#66756d;margin-bottom:12px;line-height:1.5;">
            Dùng GPS của thiết bị để ghim đúng vị trí công trình. Vị trí sẽ được lưu cùng công trình.
          </div>

          <input id="modalProjectLatitude" type="hidden" value="${escapeHTML(project?.latitude || "")}">
          <input id="modalProjectLongitude" type="hidden" value="${escapeHTML(project?.longitude || "")}">

          <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
            <button type="button" class="secondary" data-action="pin-project-location">
              📍 Ghim vị trí hiện tại
            </button>
            <button type="button" class="secondary" data-action="import-project-location-link">
              🔗 Nhập từ liên kết
            </button>
            ${project?.latitude && project?.longitude ? `
              <button type="button" class="secondary" data-action="open-project-location">
                🗺 Mở Google Maps
              </button>
            ` : ""}
            <button type="button" class="secondary" data-action="clear-project-location">
              🗑 Xoá vị trí
            </button>
          </div>
          <div id="projectLocationStatus" style="font-size:12px;color:#66756d;margin-top:9px;">
            ${project?.latitude && project?.longitude ? "Đã ghim vị trí. Bấm Lưu nếu anh vừa thay đổi vị trí." : "Chưa ghim vị trí."}
          </div>
        </div>

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
            value="${escapeHTML(project?.startDate || "")}"
          >

        </label>

        <label class="full">
          Ghi chú

          <textarea
            id="modalProjectNote"
            placeholder="Ghi chú thêm..."
          >${escapeHTML(project?.note || "")}</textarea>

        </label>

      </div>
    `;

    $("#modalProjectStatus").value =
      project?.status ||
      "Chuẩn bị";

    $("#modalSave").style.display =
      "";

    openModal();

  }

  function openProjectLocation(id) {

    const project =
      getProjects().find(
        (item) => item.id === id
      );

    if (!project) {
      showToast("Không tìm thấy công trình.");
      return;
    }

    const latitude =
      Number(project.latitude);

    const longitude =
      Number(project.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      showToast("Công trình chưa có tọa độ hợp lệ.");
      return;
    }

    const url =
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${latitude},${longitude}`)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  }

  function extractCoordinatesFromLocationLink(value) {

    const raw = String(value || "").trim();

    if (!raw) return null;

    // 1) geo:20.123,106.456
    let match = raw.match(/geo:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i);
    if (match) return normalizeCoordinates(match[1], match[2]);

    // 2) Google Maps URL with @latitude,longitude
    match = raw.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
    if (match) return normalizeCoordinates(match[1], match[2]);

    // 3) URL parameters: q=lat,lng / query=lat,lng / ll=lat,lng / destination=lat,lng
    try {
      const url = new URL(raw);
      const keys = ["q", "query", "ll", "destination", "daddr"];

      for (const key of keys) {
        const value = url.searchParams.get(key);
        if (!value) continue;

        match = value.match(/(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/);
        if (match) return normalizeCoordinates(match[1], match[2]);
      }
    } catch (error) {
      // Continue with raw coordinate detection below.
    }

    // 4) Pasted plain coordinates: 20.123456, 106.456789
    match = raw.match(/(^|[^\d-])(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)(?!\d)/);
    if (match) return normalizeCoordinates(match[2], match[3]);

    return null;
  }

  function normalizeCoordinates(latitudeValue, longitudeValue) {

    const latitude = Number(latitudeValue);
    const longitude = Number(longitudeValue);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return null;
    }

    return {
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6)
    };
  }

  function importProjectLocationFromLink() {

    const status = $("#projectLocationStatus");

    const link = window.prompt(
      "Dán liên kết vị trí từ Zalo hoặc Google Maps vào đây:\n\nVí dụ: https://www.google.com/maps/..."
    );

    if (link === null) return;

    const coordinates =
      extractCoordinatesFromLocationLink(link);

    if (!coordinates) {
      if (status) {
        status.textContent =
          "Không đọc được tọa độ từ liên kết. Hãy dùng liên kết Google Maps có chứa tọa độ hoặc nhập dạng vĩ độ, kinh độ.";
      }
      showToast("Không tìm thấy tọa độ trong liên kết.");
      return;
    }

    const latInput = $("#modalProjectLatitude");
    const lngInput = $("#modalProjectLongitude");

    if (latInput) latInput.value = coordinates.latitude;
    if (lngInput) lngInput.value = coordinates.longitude;

    if (status) {
      status.textContent =
        "Đã nhập vị trí từ liên kết. Bấm “Lưu” để lưu vị trí.";
    }

    showToast("Đã nhập vị trí. Hãy bấm Lưu để xác nhận.");
  }

  function clearProjectLocation() {

    const latInput =
      $("#modalProjectLatitude");
    const lngInput =
      $("#modalProjectLongitude");
    const status =
      $("#projectLocationStatus");

    if (latInput) latInput.value = "";
    if (lngInput) lngInput.value = "";

    if (status) {
      status.textContent = "Đã xoá vị trí. Bấm “Lưu” để lưu thay đổi.";
    }

    showToast("Đã xoá vị trí. Hãy bấm Lưu để xác nhận.");
  }

  function pinProjectLocation() {

    const status =
      $("#projectLocationStatus");

    if (!navigator.geolocation) {
      if (status) status.textContent = "Thiết bị/trình duyệt không hỗ trợ định vị.";
      showToast("Thiết bị không hỗ trợ định vị GPS.");
      return;
    }

    if (status) {
      status.textContent = "Đang lấy vị trí hiện tại... Hãy cho phép trình duyệt truy cập vị trí nếu được hỏi.";
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude =
          Number(position.coords.latitude);
        const longitude =
          Number(position.coords.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          if (status) status.textContent = "Không nhận được tọa độ hợp lệ.";
          showToast("Không lấy được tọa độ GPS.");
          return;
        }

        const lat = latitude.toFixed(6);
        const lng = longitude.toFixed(6);

        const latInput =
          $("#modalProjectLatitude");
        const lngInput =
          $("#modalProjectLongitude");

        if (latInput) latInput.value = lat;
        if (lngInput) lngInput.value = lng;

        if (status) {
          status.textContent = `Đã ghim: ${lat}, ${lng}. Bấm “Lưu” để lưu vị trí vào công trình.`;
        }

        showToast("Đã lấy vị trí hiện tại. Hãy bấm Lưu để lưu công trình.");
      },
      (error) => {
        let message = "Không thể lấy vị trí hiện tại.";

        if (error?.code === 1) {
          message = "Quyền truy cập vị trí đang bị từ chối. Hãy cho phép trình duyệt dùng vị trí.";
        } else if (error?.code === 2) {
          message = "Không xác định được vị trí hiện tại.";
        } else if (error?.code === 3) {
          message = "Lấy vị trí quá thời gian. Hãy thử lại.";
        }

        if (status) status.textContent = message;
        showToast(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  }

  async function saveProject() {

    if (!hasPermission("projects", modalEditId ? "edit" : "create")) {
      showToast(modalEditId ? "Bạn không có quyền sửa công trình." : "Bạn không có quyền thêm công trình.");
      return;
    }

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

    const projects =
      getProjects();

    const existingProject =
      modalEditId
        ? projects.find(
            (item) =>
              item.id ===
              modalEditId
          )
        : null;

    const now =
      nowISO();

    const data = {

      name,

      code:
        $("#modalProjectCode")
          ?.value
          .trim() || "",

      customer:
        $("#modalProjectCustomer")
          ?.value
          .trim() || "",

      address:
        $("#modalProjectAddress")
          ?.value
          .trim() || "",

      latitude:
        $("#modalProjectLatitude")
          ?.value
          .trim() || "",

      longitude:
        $("#modalProjectLongitude")
          ?.value
          .trim() || "",

      status:
        $("#modalProjectStatus")
          ?.value ||
        "Chuẩn bị",

      startDate:
        $("#modalProjectStart")
          ?.value || "",

      note:
        $("#modalProjectNote")
          ?.value
          .trim() || ""

    };

    const localProject =
      modalEditId && existingProject
        ? {
            ...existingProject,
            ...data,
            updatedAt: now
          }
        : {
            id: createId("CT"),
            ...data,
            createdAt: now,
            updatedAt: now
          };

    const saveButton =
      $("#modalSave");

    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "Đang lưu...";
    }

    try {

      const authUser =
        await getActiveAuthUser();

      if (!authUser) {

        throw new Error(
          "AUTH_REQUIRED"
        );

      }

      const savedProject =
        await writeCloudProject(
          localProject,
          authUser,
          !modalEditId
        );

      setProjectsCache([
        ...projects.filter(
          (item) =>
            item.id !==
            savedProject.id
        ),
        savedProject
      ]);

      writeProjectCache(
        authUser.uid,
        projectsCache
      );

      closeModal();

      renderProjectViews();

      showToast(
        modalEditId
          ? "Đã cập nhật công trình."
          : "Đã thêm công trình."
      );

    } catch (error) {

      console.error(
        "GROVA DOCUMENT: saveProject failed.",
        error
      );

      if (
        error &&
        error.message ===
          "AUTH_REQUIRED"
      ) {

        showToast(
          "Chưa đăng nhập. Không thể lưu công trình."
        );

      } else {

        showToast(
          "Không thể lưu công trình lên hệ thống. Dữ liệu cục bộ chưa bị thay đổi."
        );

      }

    } finally {

      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = "Lưu";
      }

    }

  }

  async function deleteProject(id) {

    if (!hasPermission("projects", "delete")) {
      showToast("Bạn không có quyền xóa công trình.");
      return;
    }

    if (!hasPermission("projects", "delete")) {
      showToast("Bạn không có quyền xóa công trình.");
      return;
    }

    const projects =
      getProjects();

    const project =
      projects.find(
        (item) =>
          item.id === id
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

    try {

      const authUser =
        await getActiveAuthUser();

      if (!authUser) {

        throw new Error(
          "AUTH_REQUIRED"
        );

      }

      await deleteCloudProject(
        id,
        authUser
      );

      const updatedProjects =
        projects.filter(
          (item) =>
            item.id !== id
        );

      setProjectsCache(
        updatedProjects
      );

      writeProjectCache(
        authUser.uid,
        projectsCache
      );

      renderProjectViews();

      showToast(
        "Đã xóa công trình."
      );

    } catch (error) {

      console.error(
        "GROVA DOCUMENT: deleteProject failed.",
        error
      );

      if (
        error &&
        error.message ===
          "AUTH_REQUIRED"
      ) {

        showToast(
          "Chưa đăng nhập. Không thể xóa công trình."
        );

      } else {

        showToast(
          "Không thể xóa công trình. Dữ liệu cục bộ chưa bị thay đổi."
        );

      }

    }

  }

  /* =======================================================
     CUSTOMERS
  ======================================================= */

  function renderCustomers() {

    if (!hasPermission("customers", "view")) {
      const deniedContainer =
        $("#customersList");
      if (deniedContainer) {
        deniedContainer.innerHTML =
          emptyState(
            "Không có quyền xem",
            permissionDeniedMessage("customers"),
            "🔒"
          );
      }
      return;
    }

    const container =
      $("#customersList");

    if (!container) {
      return;
    }

    const search =
      ($("#customerSearch")?.value || "")
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

                ${hasPermission("customers", "edit") ? `
                <button
                  type="button"
                  class="small-btn"
                  data-action="edit-customer"
                  data-id="${escapeHTML(customer.id)}"
                >
                  Sửa
                </button>
                ` : ""}

                ${hasPermission("customers", "delete") ? `
                <button
                  type="button"
                  class="small-btn delete"
                  data-action="delete-customer"
                  data-id="${escapeHTML(customer.id)}"
                >
                  Xóa
                </button>
                ` : ""}

              </div>

            </div>

          `
        )
        .join("");

  }

  function openCustomerModal(id = null) {

    const requiredAction = id ? "edit" : "create";
    if (!hasPermission("customers", requiredAction)) {
      showToast(
        id
          ? "Bạn không có quyền sửa khách hàng."
          : "Bạn không có quyền thêm khách hàng."
      );
      return;
    }

    if (id && !hasPermission("customers", "edit")) {
      showToast("Bạn không có quyền sửa khách hàng.");
      return;
    }
    if (!id && !hasPermission("customers", "create")) {
      showToast("Bạn không có quyền thêm khách hàng.");
      return;
    }

    modalMode = "customer";

    modalEditId = id;

    const customer =
      id
        ? getCustomers().find(
            (item) =>
              item.id === id
          )
        : null;

    $("#modalEyebrow").textContent =
      "KHÁCH HÀNG";

    $("#modalTitle").textContent =
      customer
        ? "Sửa khách hàng"
        : "Khách hàng mới";

    $("#modalBody").innerHTML = `

      <div class="modal-form">

        <label class="full">
          Tên khách hàng / đơn vị

          <input
            id="modalCustomerName"
            type="text"
            placeholder="Tên khách hàng hoặc công ty"
            value="${escapeHTML(customer?.name || "")}"
          >

        </label>

        <label>
          Số điện thoại

          <input
            id="modalCustomerPhone"
            type="tel"
            placeholder="09..."
            value="${escapeHTML(customer?.phone || "")}"
          >

        </label>

        <label>
          Email

          <input
            id="modalCustomerEmail"
            type="email"
            placeholder="email@example.com"
            value="${escapeHTML(customer?.email || "")}"
          >

        </label>

        <label>
          Mã số thuế

          <input
            id="modalCustomerTax"
            type="text"
            value="${escapeHTML(customer?.taxCode || "")}"
          >

        </label>

        <label>
          Người liên hệ

          <input
            id="modalCustomerContact"
            type="text"
            value="${escapeHTML(customer?.contact || "")}"
          >

        </label>

        <label class="full">
          Địa chỉ

          <textarea
            id="modalCustomerAddress"
            placeholder="Địa chỉ..."
          >${escapeHTML(customer?.address || "")}</textarea>

        </label>

        <label class="full">
          Ghi chú

          <textarea
            id="modalCustomerNote"
            placeholder="Ghi chú..."
          >${escapeHTML(customer?.note || "")}</textarea>

        </label>

      </div>
    `;

    $("#modalSave").style.display =
      "";

    openModal();

  }

  async function saveCustomer() {

    if (!hasPermission("customers", modalEditId ? "edit" : "create")) {
      showToast(
        modalEditId
          ? "Bạn không có quyền sửa khách hàng."
          : "Bạn không có quyền thêm khách hàng."
      );
      closeModal();
      return;
    }

    if (!hasPermission("customers", modalEditId ? "edit" : "create")) {
      showToast(modalEditId ? "Bạn không có quyền sửa khách hàng." : "Bạn không có quyền thêm khách hàng.");
      return;
    }

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

    const customers =
      getCustomers();

    const existingCustomer =
      modalEditId
        ? customers.find(
            (item) =>
              item.id ===
              modalEditId
          )
        : null;

    const now =
      nowISO();

    const data = {
      name,

      phone:
        $("#modalCustomerPhone")
          ?.value
          .trim() || "",

      email:
        $("#modalCustomerEmail")
          ?.value
          .trim() || "",

      taxCode:
        $("#modalCustomerTax")
          ?.value
          .trim() || "",

      contact:
        $("#modalCustomerContact")
          ?.value
          .trim() || "",

      address:
        $("#modalCustomerAddress")
          ?.value
          .trim() || "",

      note:
        $("#modalCustomerNote")
          ?.value
          .trim() || ""
    };

    const localCustomer =
      modalEditId && existingCustomer
        ? {
            ...existingCustomer,
            ...data,
            updatedAt: now
          }
        : {
            id: createId("KH"),
            ...data,
            createdAt: now,
            updatedAt: now
          };

    const saveButton =
      $("#modalSave");

    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "Đang lưu...";
    }

    try {

      const authUser =
        await getActiveAuthUser();

      if (!authUser) {
        throw new Error(
          "AUTH_REQUIRED"
        );
      }

      const savedCustomer =
        await writeCloudCustomer(
          localCustomer,
          authUser,
          !modalEditId
        );

      setCustomersCache([
        ...customers.filter(
          (item) =>
            item.id !==
            savedCustomer.id
        ),
        savedCustomer
      ]);

      writeCustomerCache(
        authUser.uid,
        customersCache
      );

      closeModal();

      renderCustomers();

      updateStats();

      showToast(
        modalEditId
          ? "Đã cập nhật khách hàng."
          : "Đã thêm khách hàng."
      );

    } catch (error) {

      console.error(
        "GROVA DOCUMENT: saveCustomer failed.",
        error
      );

      if (
        error &&
        error.message ===
          "AUTH_REQUIRED"
      ) {

        showToast(
          "Chưa đăng nhập. Không thể lưu khách hàng."
        );

      } else {

        showToast(
          "Không thể lưu khách hàng lên hệ thống. Dữ liệu cục bộ chưa bị thay đổi."
        );
      }

    } finally {

      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = "Lưu";
      }
    }
  }

  async function deleteCustomer(id) {

    if (!hasPermission("customers", "delete")) {
      showToast("Bạn không có quyền xóa khách hàng.");
      return;
    }

    const customers =
      getCustomers();

    const customer =
      customers.find(
        (item) =>
          item.id === id
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

    try {

      const authUser =
        await getActiveAuthUser();

      if (!authUser) {
        throw new Error(
          "AUTH_REQUIRED"
        );
      }

      await deleteCloudCustomer(
        id,
        authUser
      );

      const updatedCustomers =
        customers.filter(
          (item) =>
            item.id !== id
        );

      setCustomersCache(
        updatedCustomers
      );

      writeCustomerCache(
        authUser.uid,
        customersCache
      );

      renderCustomers();

      updateStats();

      showToast(
        "Đã xóa khách hàng."
      );

    } catch (error) {

      console.error(
        "GROVA DOCUMENT: deleteCustomer failed.",
        error
      );

      if (
        error &&
        error.message ===
          "AUTH_REQUIRED"
      ) {

        showToast(
          "Chưa đăng nhập. Không thể xóa khách hàng."
        );

      } else {

        showToast(
          "Không thể xóa khách hàng. Dữ liệu cục bộ chưa bị thay đổi."
        );
      }
    }
  }

  /* =======================================================
     EMPLOYEES
  ======================================================= */

  function renderEmployees() {

    if (!hasPermission("employees", "view")) {
      const deniedContainer =
        $("#employeesList");
      if (deniedContainer) {
        deniedContainer.innerHTML =
          emptyState(
            "Không có quyền xem",
            permissionDeniedMessage("employees"),
            "🔒"
          );
      }
      return;
    }

    const container =
      $("#employeesList");

    if (!container) {
      return;
    }

    const search =
      ($("#employeeSearch")?.value || "")
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

                ${hasPermission("employees", "edit") ? `
                <button
                  type="button"
                  class="small-btn"
                  data-action="edit-employee"
                  data-id="${escapeHTML(employee.id)}"
                >
                  Sửa
                </button>
                ` : ""}

                ${hasPermission("employees", "delete") ? `
                <button
                  type="button"
                  class="small-btn delete"
                  data-action="delete-employee"
                  data-id="${escapeHTML(employee.id)}"
                >
                  Xóa
                </button>
                ` : ""}

              </div>

            </div>

          `
        )
        .join("");

  }

  function openEmployeeModal(id = null) {

    const requiredAction = id ? "edit" : "create";
    if (!hasPermission("employees", requiredAction)) {
      showToast(
        id
          ? "Bạn không có quyền sửa nhân sự."
          : "Bạn không có quyền thêm nhân sự."
      );
      return;
    }

    if (id && !hasPermission("employees", "edit")) {
      showToast("Bạn không có quyền sửa nhân sự.");
      return;
    }
    if (!id && !hasPermission("employees", "create")) {
      showToast("Bạn không có quyền thêm nhân sự.");
      return;
    }

    modalMode = "employee";

    modalEditId = id;

    const employee =
      id
        ? getEmployees().find(
            (item) =>
              item.id === id
          )
        : null;

    $("#modalEyebrow").textContent =
      "NHÂN SỰ";

    $("#modalTitle").textContent =
      employee
        ? "Sửa nhân sự"
        : "Nhân sự mới";

    $("#modalBody").innerHTML = `

      <div class="modal-form">

        <label class="full">
          Họ và tên

          <input
            id="modalEmployeeName"
            type="text"
            placeholder="Họ và tên"
            value="${escapeHTML(employee?.name || "")}"
          >

        </label>

        <label>
          Chức vụ

          <input
            id="modalEmployeePosition"
            type="text"
            placeholder="Ví dụ: Kỹ thuật"
            value="${escapeHTML(employee?.position || "")}"
          >

        </label>

        <label>
          Phòng / bộ phận

          <input
            id="modalEmployeeDepartment"
            type="text"
            placeholder="Ví dụ: Kỹ thuật"
            value="${escapeHTML(employee?.department || "")}"
          >

        </label>

        <label>
          Số điện thoại

          <input
            id="modalEmployeePhone"
            type="tel"
            value="${escapeHTML(employee?.phone || "")}"
          >

        </label>

        <label>
          Email

          <input
            id="modalEmployeeEmail"
            type="email"
            value="${escapeHTML(employee?.email || "")}"
          >

        </label>

        <label>
          Ngày vào làm

          <input
            id="modalEmployeeStart"
            type="date"
            value="${escapeHTML(employee?.startDate || "")}"
          >

        </label>

        <label class="full">
          Ghi chú

          <textarea
            id="modalEmployeeNote"
            placeholder="Ghi chú..."
          >${escapeHTML(employee?.note || "")}</textarea>

        </label>

      </div>
    `;

    $("#modalSave").style.display =
      "";

    openModal();

  }

  async function saveEmployee() {

    if (!hasPermission("employees", modalEditId ? "edit" : "create")) {
      showToast(
        modalEditId
          ? "Bạn không có quyền sửa nhân sự."
          : "Bạn không có quyền thêm nhân sự."
      );
      closeModal();
      return;
    }

    if (!hasPermission("employees", modalEditId ? "edit" : "create")) {
      showToast(modalEditId ? "Bạn không có quyền sửa nhân sự." : "Bạn không có quyền thêm nhân sự.");
      return;
    }

    const name =
      $("#modalEmployeeName")?.value.trim();

    if (!name) {
      showToast("Vui lòng nhập họ và tên.");
      return;
    }

    const employees = getEmployees();
    const existingEmployee =
      modalEditId
        ? employees.find((item) => item.id === modalEditId)
        : null;

    const now = nowISO();

    const data = {
      name,
      position: $("#modalEmployeePosition")?.value.trim() || "",
      department: $("#modalEmployeeDepartment")?.value.trim() || "",
      phone: $("#modalEmployeePhone")?.value.trim() || "",
      email: $("#modalEmployeeEmail")?.value.trim() || "",
      startDate: $("#modalEmployeeStart")?.value || "",
      note: $("#modalEmployeeNote")?.value.trim() || ""
    };

    const localEmployee =
      modalEditId && existingEmployee
        ? { ...existingEmployee, ...data, updatedAt: now }
        : { id: createId("NS"), ...data, createdAt: now, updatedAt: now };

    const saveButton = $("#modalSave");
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "Đang lưu...";
    }

    try {

      const authUser = await getActiveAuthUser();
      if (!authUser) throw new Error("AUTH_REQUIRED");

      const savedEmployee =
        await writeCloudEmployee(localEmployee, authUser);

      setEmployeesCache([
        ...employees.filter((item) => item.id !== savedEmployee.id),
        savedEmployee
      ]);

      writeEmployeeCache(authUser.uid, employeesCache);

      closeModal();
      renderEmployees();
      updateStats();

      showToast(
        modalEditId
          ? "Đã cập nhật nhân sự."
          : "Đã thêm nhân sự."
      );

    } catch (error) {

      console.error("GROVA DOCUMENT: saveEmployee failed.", error);

      if (error && error.message === "AUTH_REQUIRED") {
        showToast("Chưa đăng nhập. Không thể lưu nhân sự.");
      } else {
        showToast("Không thể lưu nhân sự lên hệ thống. Dữ liệu cục bộ chưa bị thay đổi.");
      }

    } finally {

      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = "Lưu";
      }

    }

  }

  async function deleteEmployee(id) {

    if (!hasPermission("employees", "delete")) {
      showToast("Bạn không có quyền xóa nhân sự.");
      return;
    }

    const employees = getEmployees();
    const employee = employees.find((item) => item.id === id);
    if (!employee) return;

    const ok = confirm(`Xóa nhân sự "${employee.name}"?`);
    if (!ok) return;

    try {

      const authUser = await getActiveAuthUser();
      if (!authUser) throw new Error("AUTH_REQUIRED");

      await deleteCloudEmployee(id, authUser);

      setEmployeesCache(
        employees.filter((item) => item.id !== id)
      );

      writeEmployeeCache(authUser.uid, employeesCache);

      renderEmployees();
      updateStats();
      showToast("Đã xóa nhân sự.");

    } catch (error) {

      console.error("GROVA DOCUMENT: deleteEmployee failed.", error);

      if (error && error.message === "AUTH_REQUIRED") {
        showToast("Chưa đăng nhập. Không thể xóa nhân sự.");
      } else {
        showToast("Không thể xóa nhân sự trên hệ thống. Dữ liệu cục bộ chưa bị thay đổi.");
      }

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

    if ($("#statDocuments")) {

      $("#statDocuments").textContent =
        history.length;

    }

    if ($("#statProjects")) {

      $("#statProjects").textContent =
        projects.length;

    }

    if ($("#statCustomers")) {

      $("#statCustomers").textContent =
        customers.length;

    }

    if ($("#statEmployees")) {

      $("#statEmployees").textContent =
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

    if (!hasPermission("reports", "view")) {
      showPermissionDenied("reports");
      return;
    }

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

    if ($("#reportCards")) {

      $("#reportCards").innerHTML = `

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

    if ($("#reportProjects")) {

      if (!projects.length) {

        $("#reportProjects").innerHTML =
          emptyState(
            "Chưa có dữ liệu công trình",
            "Thêm công trình để xem báo cáo.",
            "▥"
          );

        return;

      }

      $("#reportProjects").innerHTML = `

        <h3>
          Tổng hợp công trình
        </h3>

        <table class="report-table">

          <thead>

            <tr>

              <th>Công trình</th>

              <th>Khách hàng</th>

              <th>Trạng thái</th>

              <th>Ngày bắt đầu</th>

            </tr>

          </thead>

          <tbody>

            ${projects
              .map(
                (project) => `

                  <tr>

                    <td>
                      ${escapeHTML(
                        project.name || ""
                      )}
                    </td>

                    <td>
                      ${escapeHTML(
                        project.customer || "-"
                      )}
                    </td>

                    <td>
                      <span class="status ${slugStatus(project.status)}">
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
     PHASE 5B.4 — ACCOUNT MANAGEMENT UI
     PHASE 5B.5 — ACCOUNT PROFILE UI
     PHASE 5B.6 — ACCOUNT MANAGEMENT HARDENING
  ======================================================= */

  const ACCOUNT_PERMISSION_META = {
    projects: {
      label: "Công trình",
      actions: [["view", "Xem"], ["create", "Thêm"], ["edit", "Sửa"], ["delete", "Xóa"]]
    },
    customers: {
      label: "Khách hàng",
      actions: [["view", "Xem"], ["create", "Thêm"], ["edit", "Sửa"], ["delete", "Xóa"]]
    },
    employees: {
      label: "Nhân sự",
      actions: [["view", "Xem"], ["create", "Thêm"], ["edit", "Sửa"], ["delete", "Xóa"]]
    },
    documents: {
      label: "Văn bản",
      actions: [["view", "Xem"], ["create", "Thêm"], ["edit", "Sửa"], ["delete", "Xóa"], ["export", "Xuất"]]
    },
    history: {
      label: "Lịch sử",
      actions: [["view", "Xem"]]
    },
    users: {
      label: "Tài khoản",
      actions: [["view", "Xem"], ["create", "Tạo"], ["edit", "Sửa"], ["lock", "Khóa / mở khóa"], ["managePermissions", "Quản lý quyền"]]
    },
    settings: {
      label: "Cài đặt",
      actions: [["view", "Xem"], ["edit", "Sửa"]]
    }
  };

  function accountPermissionMatrixFromProfile(profile) {
    const source = profile?.permissions || {};
    const matrix = clonePermissions(source);

    Object.keys(DEFAULT_PERMISSIONS).forEach((group) => {
      if (!matrix[group]) matrix[group] = {};
      Object.keys(DEFAULT_PERMISSIONS[group]).forEach((action) => {
        matrix[group][action] = Boolean(matrix[group][action]);
      });
    });

    return matrix;
  }

  function backendErrorMessage(error, fallback) {
    const code = String(error?.code || "");
    const known = {
      "functions/unauthenticated": "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
      "functions/permission-denied": "Bạn không có quyền thực hiện thao tác này.",
      "functions/not-found": "Cloud Functions chưa được triển khai hoặc không tìm thấy chức năng.",
      "functions/unavailable": "Cloud Functions hiện chưa khả dụng.",
      "functions/failed-precondition": error?.message || "Điều kiện hệ thống chưa đáp ứng.",
      "functions/invalid-argument": error?.message || "Thông tin gửi lên không hợp lệ.",
      "functions/already-exists": error?.message || "Tài khoản đã tồn tại.",
      "functions/internal": error?.message || "Máy chủ không thể hoàn tất thao tác."
    };
    return known[code] || error?.message || fallback;
  }

  async function saveAccountProfile(uid, payload, options = {}) {
    if (!firestoreDb) throw new Error("FIRESTORE_UNAVAILABLE");
    const id = String(uid || "").trim();
    if (!id) throw new Error("UID_REQUIRED");

    const reference = getUsersCollection()?.doc(id);
    if (!reference) throw new Error("FIRESTORE_UNAVAILABLE");

    const now = nowISO();
    const existing = await reference.get();
    const base = existing.exists ? existing.data() : {};

    const profile = {
      uid: id,
      name: String(payload.name || base.name || "").trim(),
      email: String(payload.email || base.email || "").trim(),
      phone: String(payload.phone || base.phone || "").trim(),
      role: String(payload.role || base.role || "employee"),
      status: payload.status === "disabled" ? "disabled" : (base.status === "disabled" ? "disabled" : "active"),
      permissions: clonePermissions(payload.permissions || base.permissions || getDefaultPermissions("employee")),
      createdAt: base.createdAt || now,
      updatedAt: now,
      createdBy: base.createdBy || currentUser?.uid || "",
      updatedBy: currentUser?.uid || ""
    };

    if (options.createOnly && existing.exists) {
      const error = new Error("USER_PROFILE_EXISTS");
      error.code = "already-exists";
      throw error;
    }

    await reference.set(profile, { merge: false });
    return profile;
  }

  async function updateAccountProfile(uid, payload) {
    if (!firestoreDb) throw new Error("FIRESTORE_UNAVAILABLE");
    const id = String(uid || "").trim();
    const reference = getUsersCollection()?.doc(id);
    if (!reference) throw new Error("FIRESTORE_UNAVAILABLE");

    const snapshot = await reference.get();
    if (!snapshot.exists) {
      const error = new Error("USER_PROFILE_NOT_FOUND");
      error.code = "not-found";
      throw error;
    }

    const existing = snapshot.data() || {};
    const next = {
      name: String(payload.name ?? existing.name ?? "").trim(),
      email: String(payload.email ?? existing.email ?? "").trim(),
      phone: String(payload.phone ?? existing.phone ?? "").trim(),
      updatedAt: nowISO(),
      updatedBy: currentUser?.uid || ""
    };

    if (payload.role) next.role = payload.role;
    if (payload.permissions) next.permissions = clonePermissions(payload.permissions);
    if (payload.status) next.status = payload.status === "disabled" ? "disabled" : "active";

    await reference.set(next, { merge: true });
    return { ...existing, ...next, uid: id };
  }

  async function setAccountProfileStatus(uid, status) {
    return updateAccountProfile(uid, { status });
  }

  function formatAccountDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleString("vi-VN", {
      dateStyle: "short",
      timeStyle: "short"
    });
  }

  /* =======================================================
     PHASE 5B.6 — ACCOUNT MANAGEMENT HARDENING
  ======================================================= */

  function isCurrentAccount(uid) {
    return Boolean(
      uid &&
      currentUser?.uid &&
      String(uid) === String(currentUser.uid)
    );
  }

  function isProtectedAccount(uid) {
    return Boolean(
      uid &&
      String(uid) === String(ADMIN_UID)
    );
  }

  function getAccountStatus(item) {
    if (!item) return "unknown";
    return item.disabled || item.profile?.status === "disabled"
      ? "disabled"
      : "active";
  }

  function accountStatusLabel(status) {
    if (status === "active") return "Đang hoạt động";
    if (status === "disabled") return "Đã khóa";
    return "Chưa xác định";
  }

  function renderAccountManagement() {
    const container = $("#accountManagementSection");
    if (!container) return;

    const profile = getCurrentUserProfile();
    const profileRole = ROLE_LABELS[profile?.role] || (isAdminUser() ? ROLE_LABELS.admin : "Chưa phân quyền");
    const profileStatus = profile
      ? accountStatusLabel(profile.status === "disabled" ? "disabled" : "active")
      : "Chưa có hồ sơ";
    const profileEmail = profile?.email || currentUser?.email || "";
    const profileName = profile?.name || currentUser?.displayName || "Chưa đặt tên";
    const profileUid = profile?.uid || currentUser?.uid || "";

    const profileGroups = Object.entries(ACCOUNT_PERMISSION_META)
      .map(([group, meta]) => {
        const source = profile?.permissions?.[group] || {};
        const granted = meta.actions
          .filter(([action]) => Boolean(source[action]))
          .map(([, label]) => label);

        if (!granted.length) return "";

        return `<div class="setting-note"><strong>${escapeHTML(meta.label)}:</strong> ${escapeHTML(granted.join(", "))}</div>`;
      })
      .filter(Boolean)
      .join("");

    const profileCard = `
      <div class="form-card">
        <div class="page-head">
          <div>
            <h3>Tài khoản hiện tại</h3>
            <p>Thông tin đăng nhập và quyền đang áp dụng cho tài khoản này.</p>
          </div>
          <span class="setting-note">${escapeHTML(profileStatus)}</span>
        </div>

        <div class="form-grid">
          <label>
            Họ tên
            <input type="text" value="${escapeHTML(profileName)}" readonly>
          </label>

          <label>
            Email
            <input type="email" value="${escapeHTML(profileEmail)}" readonly>
          </label>

          <label>
            Vai trò
            <input type="text" value="${escapeHTML(profileRole)}" readonly>
          </label>

          <label>
            UID Firebase
            <input type="text" value="${escapeHTML(profileUid)}" readonly>
          </label>
        </div>

        <div style="margin-top:16px;">
          <h3>Quyền đang được cấp</h3>
          ${profileGroups || `<div class="setting-note">Tài khoản hiện chưa được cấp quyền thao tác.</div>`}
        </div>
      </div>
    `;

    if (!isAdminUser() && currentUserProfile?.role !== "admin") {
      container.innerHTML = profileCard;
      return;
    }

    const canCreate = hasPermission("users", "create");
    const canEdit = hasPermission("users", "edit");
    const canLock = hasPermission("users", "lock");

    const rows = accountUsers.map((item) => {
      const profile = item?.profile || {};
      const name = profile.name || item.displayName || "Chưa đặt tên";
      const role = ROLE_LABELS[profile.role] || "Chưa phân quyền";
      const status = getAccountStatus(item);
      const email = item.email || profile.email || "";
      const lastSignIn = item.lastSignInTime
        ? formatAccountDate(item.lastSignInTime)
        : "Chưa đăng nhập";
      const isProtected = isProtectedAccount(item.uid);
      const isSelf = isCurrentAccount(item.uid);
      const actions = [];

      if (canEdit) {
        actions.push(`
          <button class="secondary" type="button"
            data-action="edit-user"
            data-id="${escapeHTML(item.uid)}">
            Sửa
          </button>
        `);
      }

      if (canLock && !isProtected && !isSelf) {
        actions.push(`
          <button class="secondary" type="button"
            data-action="toggle-user-status"
            data-id="${escapeHTML(item.uid)}"
            data-status="${status === "active" ? "disabled" : "active"}">
            ${status === "active" ? "Khóa" : "Mở khóa"}
          </button>
        `);
      }

      return `
        <tr>
          <td>
            <strong>${escapeHTML(name)}</strong>
            ${isProtected ? `<div class="setting-note">Admin gốc</div>` : ""}
            ${isSelf && !isProtected ? `<div class="setting-note">Tài khoản đang đăng nhập</div>` : ""}
          </td>
          <td>${escapeHTML(email)}</td>
          <td>${escapeHTML(role)}</td>
          <td>${escapeHTML(accountStatusLabel(status))}</td>
          <td>${escapeHTML(lastSignIn)}</td>
          <td>
            ${actions.length
              ? `<div class="action-group">${actions.join("")}</div>`
              : "—"}
          </td>
        </tr>
      `;
    }).join("");

    container.innerHTML = profileCard + `
      <div class="form-card">
        <div class="page-head">
          <div>
            <h3>Tài khoản người dùng</h3>
            <p>
              Quản lý hồ sơ tài khoản và phân quyền GROVA.
              Tài khoản đăng nhập Firebase Authentication được tạo thủ công trong Firebase Console.
            </p>
          </div>

          <div class="action-group">
            <button class="secondary" type="button"
              data-action="refresh-users"
              ${accountUsersLoading ? "disabled" : ""}>
              ${accountUsersLoading ? "Đang tải..." : "Làm mới"}
            </button>

            ${canCreate ? `
              <button class="primary" type="button"
                data-action="new-user">
                + Thêm hồ sơ tài khoản
              </button>
            ` : ""}
          </div>
        </div>

        <div class="setting-note">
          ${accountUsersLoading
            ? "Đang tải danh sách tài khoản..."
            : accountUsersLoadedOnce
              ? "Danh sách tài khoản được lấy từ Firebase Authentication."
              : "Chưa tải danh sách tài khoản. Bấm “Làm mới” để tải."}
        </div>

        ${accountUsers.length ? `
          <div class="table-wrap">
            <table class="data-table account-users-table">
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th>Đăng nhập gần nhất</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        ` : `
          <div class="setting-note">
            ${accountUsersLoading
              ? "Đang lấy dữ liệu từ Firestore..."
              : "Chưa có hồ sơ tài khoản trong Firestore users."}
          </div>
        `}

        ${accountUsersPageToken ? `
          <div class="action-group" style="margin-top:12px;">
            <button class="secondary" type="button"
              data-action="load-more-users"
              ${accountUsersLoading ? "disabled" : ""}>
              ${accountUsersLoading ? "Đang tải..." : "Tải thêm tài khoản"}
            </button>
          </div>
        ` : ""}

        <div class="setting-note">
          Lưu ý: ứng dụng chỉ quản lý hồ sơ trong Firestore.
          Tài khoản đăng nhập Firebase Authentication phải được tạo thủ công
          trong Firebase Console; “Khóa” tại đây chỉ khóa trạng thái hồ sơ GROVA,
          không vô hiệu hóa credential Firebase Authentication.
        </div>
      </div>
    `;
  }

  async function loadAccountUsers(options = {}) {
    if (!isAdminUser() && currentUserProfile?.role !== "admin") return [];
    if (accountUsersLoading) return accountUsers;

    accountUsersLoading = true;
    renderAccountManagement();

    try {
      if (!initializeFirestore()) throw new Error("FIRESTORE_UNAVAILABLE");
      await waitForFirestore();

      const snapshot = await getUsersCollection().get();
      const users = snapshot.docs.map((doc) => {
        const profile = doc.data() || {};
        return {
          uid: doc.id,
          profile: normalizeUserProfile(profile, {
            uid: doc.id,
            displayName: profile.name || "",
            email: profile.email || ""
          }),
          displayName: profile.name || "",
          email: profile.email || "",
          phoneNumber: profile.phone || "",
          lastSignInTime: profile.lastSignInTime || ""
        };
      });

      users.sort((a, b) => {
        const an = String(a.profile?.name || a.email || a.uid || "").toLocaleLowerCase("vi");
        const bn = String(b.profile?.name || b.email || b.uid || "").toLocaleLowerCase("vi");
        return an.localeCompare(bn, "vi");
      });

      accountUsers = users;
      accountUsersPageToken = null;
      accountUsersLoadedOnce = true;
      renderAccountManagement();
      return accountUsers;
    } catch (error) {
      console.warn("GROVA DOCUMENT: loadAccountUsers failed.", error);
      accountUsersLoadedOnce = true;
      renderAccountManagement();
      showToast(
        error?.message === "FIRESTORE_UNAVAILABLE"
          ? "Firestore chưa sẵn sàng."
          : "Không thể tải danh sách hồ sơ tài khoản."
      );
      return [];
    } finally {
      accountUsersLoading = false;
      renderAccountManagement();
    }
  }

  function getAccountUser(uid) {
    return accountUsers.find(
      (item) => String(item?.uid || "") === String(uid || "")
    ) || null;
  }

  function openUserModal(uid = null) {
    const existing = uid ? getAccountUser(uid) : null;
    const canEdit = hasPermission("users", "edit");
    const canCreate = hasPermission("users", "create");
    const canManagePermissions = hasPermission("users", "managePermissions") || isAdminUser();

    if (existing && !canEdit) {
      showToast("Bạn không có quyền sửa hồ sơ tài khoản.");
      return;
    }
    if (!existing && !canCreate) {
      showToast("Bạn không có quyền thêm hồ sơ tài khoản.");
      return;
    }

    modalMode = "user";
    modalEditId = existing?.uid || null;

    const profile = existing?.profile || {};
    const role = profile.role || "employee";
    const permissions = accountPermissionMatrixFromProfile(profile);
    const protectedAdmin = isProtectedAccount(existing?.uid);
    const selfAccount = isCurrentAccount(existing?.uid);
    const restrictRoleAndPermissions = protectedAdmin || selfAccount;

    const roleOptions = [
      ["employee", "Nhân viên"],
      ["viewer", "Chỉ xem"],
      ["manager", "Quản lý"],
      ["custom", "Tùy chỉnh"],
      ["admin", "Administrator"]
    ];

    const roleSelect = roleOptions.map(([value, label]) => `
      <option value="${value}" ${role === value ? "selected" : ""}>${label}</option>
    `).join("");

    const permissionRows = Object.entries(ACCOUNT_PERMISSION_META).map(([group, meta]) => {
      const source = permissions[group] || {};
      const cells = meta.actions.map(([action, label]) => `
        <label>
          <input type="checkbox"
            data-user-permission="${escapeHTML(group)}.${escapeHTML(action)}"
            ${source[action] ? "checked" : ""}
            ${role === "admin" || restrictRoleAndPermissions || !canManagePermissions ? "disabled" : ""}>
          ${escapeHTML(label)}
        </label>
      `).join("");
      return `
        <div class="form-card" style="padding:12px;margin-top:10px;">
          <strong>${escapeHTML(meta.label)}</strong>
          <div class="form-grid" style="margin-top:8px;">${cells}</div>
        </div>
      `;
    }).join("");

    const templatePermissionMap = getDocumentTemplatePermissionMap(profile);
    const baseDocumentPermissions = permissions.documents || {};
    const documentTemplatePermissionRows = getTemplates().map((template) => {
      const templateId = String(template.id);
      const source = templatePermissionMap[templateId] || {
        view: Boolean(baseDocumentPermissions.view), create: Boolean(baseDocumentPermissions.create),
        edit: Boolean(baseDocumentPermissions.edit), delete: Boolean(baseDocumentPermissions.delete), export: Boolean(baseDocumentPermissions.export)
      };
      const actions = [["view", "Xem"], ["create", "Tạo"], ["edit", "Sửa"], ["delete", "Xóa"], ["export", "Xuất"]];
      const cells = actions.map(([action, label]) => `
        <label>
          <input type="checkbox" data-user-document-permission="${escapeHTML(templateId)}.${escapeHTML(action)}" ${source[action] ? "checked" : ""} ${role === "admin" || restrictRoleAndPermissions || !canManagePermissions ? "disabled" : ""}>
          ${escapeHTML(label)}
        </label>
      `).join("");
      return `
        <div class="form-card" style="padding:12px;margin-top:10px;">
          <strong>${escapeHTML(template.code || template.name || template.title || templateId)}</strong>
          <div style="font-size:13px;opacity:.75;margin-top:3px;">${escapeHTML(template.name || template.title || "")}</div>
          <div class="form-grid" style="margin-top:8px;">${cells}</div>
        </div>
      `;
    }).join("");

    $("#modalEyebrow").textContent = "HỒ SƠ TÀI KHOẢN";
    $("#modalTitle").textContent = existing ? "Sửa hồ sơ tài khoản" : "Thêm hồ sơ tài khoản";

    $("#modalBody").innerHTML = `
      <div class="form-grid">
        <label>
          UID Firebase Authentication
          <input id="modalUserUid" type="text"
            value="${escapeHTML(existing?.uid || "")}" 
            ${existing ? "readonly" : ""}
            placeholder="Dán UID từ Firebase Console...">
        </label>

        <label>
          Họ tên
          <input id="modalUserName" type="text"
            value="${escapeHTML(existing?.displayName || profile.name || "")}"
            placeholder="Họ tên người dùng...">
        </label>

        <label>
          Email
          <input id="modalUserEmail" type="email"
            value="${escapeHTML(existing?.email || profile.email || "")}"
            placeholder="Email của tài khoản Firebase...">
        </label>

        <label>
          Số điện thoại
          <input id="modalUserPhone" type="tel"
            value="${escapeHTML(existing?.phoneNumber || profile.phone || "")}"
            placeholder="Số điện thoại...">
        </label>

        <label>
          Vai trò
          <select id="modalUserRole" ${(!canManagePermissions || restrictRoleAndPermissions) ? "disabled" : ""}>
            ${roleSelect}
          </select>
        </label>

        <label>
          Trạng thái hồ sơ
          <select id="modalUserStatus" ${(protectedAdmin || !canManagePermissions) ? "disabled" : ""}>
            <option value="active" ${profile.status !== "disabled" ? "selected" : ""}>Đang hoạt động</option>
            <option value="disabled" ${profile.status === "disabled" ? "selected" : ""}>Đã khóa</option>
          </select>
        </label>
      </div>

      ${protectedAdmin ? `
        <div class="setting-note">
          Tài khoản Admin gốc được bảo vệ. Không thể hạ quyền hoặc khóa hồ sơ này.
        </div>
      ` : selfAccount ? `
        <div class="setting-note">
          Đây là tài khoản đang đăng nhập. Không thể tự thay đổi vai trò hoặc quyền của chính mình tại màn hình này.
        </div>
      ` : `
        <div class="setting-note" style="margin-top:12px;">
          Firebase Authentication account phải được tạo thủ công trong Firebase Console. Màn hình này chỉ lưu hồ sơ users/{UID}.
        </div>
      `}

      <div style="margin-top:16px;">
        <h3>Phân quyền</h3>
        <div class="setting-note">
          ${canManagePermissions ? "Thiết lập quyền chi tiết cho hồ sơ tài khoản." : "Quyền chi tiết do Administrator quản lý."}
        </div>
        ${permissionRows}

        <div style="margin-top:18px;">
          <h3>Phân quyền từng mẫu văn bản</h3>
          <div class="setting-note">Mỗi mẫu có thể cấp riêng quyền Xem, Tạo, Sửa, Xóa và Xuất. Nếu chưa cấu hình riêng, mẫu kế thừa quyền Văn bản chung.</div>
          ${documentTemplatePermissionRows || '<div class="setting-note">Chưa có mẫu văn bản.</div>'}
        </div>
      </div>
    `;

    const roleElement = $("#modalUserRole");
    if (roleElement) {
      roleElement.addEventListener("change", () => {
        const selected = roleElement.value;
        const defaults = getDefaultPermissions(selected);
        $$("#modalBody input[data-user-permission]").forEach((input) => {
          const parts = String(input.dataset.userPermission || "").split(".");
          input.checked = Boolean(defaults?.[parts[0]]?.[parts[1]]);
          input.disabled = !canManagePermissions || restrictRoleAndPermissions || selected === "admin";
        });

        const templateDefaults = getDefaultDocumentTemplatePermissions(selected);
        $$("#modalBody input[data-user-document-permission]").forEach((input) => {
          const parts = String(input.dataset.userDocumentPermission || "").split(".");
          if (parts.length !== 2) return;
          input.checked = Boolean(templateDefaults?.[parts[0]]?.[parts[1]]);
          input.disabled = !canManagePermissions || restrictRoleAndPermissions || selected === "admin";
        });
      });
    }

    $("#modalSave").style.display = "";
    $("#modalSave").textContent = existing ? "Lưu thay đổi" : "Thêm hồ sơ";
    openModal();
  }

  function readUserModalPermissions(role) {
    if (role === "admin") return getDefaultPermissions("admin");

    const permissions = getDefaultPermissions("custom");

    $$("#modalBody input[data-user-permission]").forEach((input) => {
      const parts = String(
        input.dataset.userPermission || ""
      ).split(".");

      if (parts.length !== 2) return;

      if (!permissions[parts[0]]) {
        permissions[parts[0]] = {};
      }

      permissions[parts[0]][parts[1]] = Boolean(input.checked);
    });

    if (!permissions.documents) permissions.documents = {};
    permissions.documents.templates = {};
    $$("#modalBody input[data-user-document-permission]").forEach((input) => {
      const parts = String(input.dataset.userDocumentPermission || "").split(".");
      if (parts.length !== 2) return;
      const [templateId, action] = parts;
      if (!permissions.documents.templates[templateId]) permissions.documents.templates[templateId] = {};
      permissions.documents.templates[templateId][action] = Boolean(input.checked);
    });

    return permissions;
  }

  async function saveUser() {
    const uid = $("#modalUserUid")?.value.trim() || "";
    const name = $("#modalUserName")?.value.trim() || "";
    const email = $("#modalUserEmail")?.value.trim() || "";
    const phone = $("#modalUserPhone")?.value.trim() || "";
    const role = $("#modalUserRole")?.value || "employee";
    const status = $("#modalUserStatus")?.value || "active";

    if (!uid) {
      showToast("Vui lòng nhập UID Firebase Authentication.");
      return;
    }
    if (!email) {
      showToast("Vui lòng nhập email.");
      return;
    }

    const canManagePermissions = hasPermission("users", "managePermissions") || isAdminUser();
    const targetProtected = isProtectedAccount(uid);
    const targetSelf = isCurrentAccount(uid);

    if (targetProtected && !isAdminUser()) {
      showToast("Tài khoản Admin gốc được bảo vệ.");
      return;
    }

    const payload = { name, email, phone };
    if (canManagePermissions && !targetProtected && !targetSelf) {
      payload.role = role;
      payload.status = status;
      payload.permissions = readUserModalPermissions(role);
    }

    const saveButton = $("#modalSave");
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "Đang lưu...";
    }

    try {
      await waitForFirestore();
      if (modalEditId) {
        await updateAccountProfile(modalEditId, payload);
        showToast("Đã cập nhật hồ sơ tài khoản.");
      } else {
        if (!hasPermission("users", "create")) {
          showToast("Bạn không có quyền thêm hồ sơ tài khoản.");
          return;
        }
        if (role === "admin" && !isAdminUser()) {
          showToast("Chỉ Administrator mới có thể cấp vai trò Administrator.");
          return;
        }
        await saveAccountProfile(uid, {
          ...payload,
          role: canManagePermissions ? role : "employee",
          status: canManagePermissions ? status : "active",
          permissions: canManagePermissions ? readUserModalPermissions(role) : getDefaultPermissions("employee")
        }, { createOnly: true });
        showToast("Đã thêm hồ sơ tài khoản.");
      }

      closeModal();
      if (isCurrentAccount(uid)) {
        await syncCurrentUserProfile(currentUser);
      }
      await loadAccountUsers({ reset: true });
    } catch (error) {
      console.error("GROVA DOCUMENT: saveUser failed.", error);
      const code = String(error?.code || "");
      showToast(
        code === "already-exists" ? "UID này đã có hồ sơ trong Firestore." :
        code === "permission-denied" ? "Bạn không có quyền thay đổi hồ sơ tài khoản." :
        code === "not-found" ? "Không tìm thấy hồ sơ tài khoản." :
        "Không thể lưu hồ sơ tài khoản."
      );
    } finally {
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = modalEditId ? "Lưu thay đổi" : "Thêm hồ sơ";
      }
    }
  }

  async function toggleUserStatus(uid, status) {
    if (!hasPermission("users", "lock")) {
      showToast("Bạn không có quyền khóa / mở khóa tài khoản.");
      return;
    }
    if (status !== "active" && status !== "disabled") {
      showToast("Trạng thái hồ sơ không hợp lệ.");
      return;
    }

    const target = getAccountUser(uid);
    if (!target) {
      showToast("Không tìm thấy hồ sơ tài khoản.");
      return;
    }
    if (isProtectedAccount(uid)) {
      showToast("Tài khoản Admin gốc được bảo vệ.");
      return;
    }
    if (isCurrentAccount(uid)) {
      showToast("Không thể tự khóa hồ sơ tài khoản đang đăng nhập.");
      return;
    }

    const label = status === "disabled" ? "khóa" : "mở khóa";
    const name = target.profile?.name || target.email || "tài khoản";
    if (!confirm(`Bạn có chắc muốn ${label} hồ sơ của "${name}"?`)) return;

    try {
      await waitForFirestore();
      await setAccountProfileStatus(uid, status);
      showToast(status === "disabled" ? "Đã khóa hồ sơ tài khoản." : "Đã mở khóa hồ sơ tài khoản.");
      await loadAccountUsers({ reset: true });
    } catch (error) {
      console.error("GROVA DOCUMENT: toggleUserStatus failed.", error);
      showToast(
        error?.code === "permission-denied"
          ? "Bạn không có quyền thay đổi trạng thái hồ sơ."
          : "Không thể thay đổi trạng thái hồ sơ."
      );
    }
  }

  /* =======================================================
     GROVA AI — VERSION 235 / READ-ONLY ASSISTANT
  ======================================================= */

  let grovaAiBusy = false;

  function appendGrovaAIMessage(role, text) {
    const container = $("#grovaAiMessages");
    if (!container) return;

    const item = document.createElement("div");
    item.className = `grova-ai-message ${role === "user" ? "is-user" : "is-assistant"}`;

    const label = document.createElement("small");
    label.textContent = role === "user" ? "Bạn" : "GROVA AI";

    const body = document.createElement("div");
    body.className = "grova-ai-message-body";
    body.textContent = String(text || "");

    item.appendChild(label);
    item.appendChild(body);
    container.appendChild(item);
    container.scrollTop = container.scrollHeight;
  }

  function renderGrovaAI() {
    if (!hasPermission("ai", "view")) {
      showPermissionDenied("ai");
      return;
    }

    const container = $("#grovaAiMessages");
    if (container && !container.dataset.initialized) {
      container.dataset.initialized = "1";
      appendGrovaAIMessage(
        "assistant",
        "Xin chào. Tôi là GROVA AI. Tôi có thể trả lời câu hỏi về dữ liệu GROVA mà tài khoản của bạn được phép xem. Giai đoạn này AI chỉ đọc và phân tích, không tự sửa hoặc xóa dữ liệu."
      );
    }
  }

  function getGrovaFunctions() {
    if (window.firebase && typeof firebase.functions === "function") {
      try {
        return firebase.functions();
      } catch (error) {
        console.warn("GROVA AI: Firebase Functions unavailable.", error);
      }
    }
    return null;
  }

  async function askGrovaAI() {
    if (grovaAiBusy) return;
    if (!hasPermission("ai", "view")) {
      showPermissionDenied("ai");
      return;
    }

    const input = $("#grovaAiInput");
    const question = String(input?.value || "").trim();
    if (!question) {
      showToast("Hãy nhập câu hỏi cho GROVA AI.");
      input?.focus();
      return;
    }

    const functions = getGrovaFunctions();
    if (!functions) {
      showToast("Firebase Functions chưa sẵn sàng.");
      return;
    }

    appendGrovaAIMessage("user", question);
    input.value = "";

    const button = $("#grovaAiSend");
    const status = $("#grovaAiStatus");
    grovaAiBusy = true;
    if (button) {
      button.disabled = true;
      button.textContent = "Đang xử lý...";
    }
    if (status) status.textContent = "GROVA AI đang phân tích dữ liệu được phép truy cập...";

    try {
      const callable = functions.httpsCallable("grovaAiAsk");
      const result = await callable({ question });
      const answer = result?.data?.answer || "GROVA AI không trả về nội dung trả lời.";
      appendGrovaAIMessage("assistant", answer);
    } catch (error) {
      console.error("GROVA AI: ask failed.", error);
      const code = String(error?.code || "");
      let message = "Không thể kết nối GROVA AI.";
      if (code === "functions/unauthenticated") message = "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.";
      if (code === "functions/permission-denied") message = "Tài khoản hiện tại chưa được cấp quyền sử dụng GROVA AI.";
      if (code === "functions/failed-precondition") message = "GROVA AI chưa được cấu hình API trên Firebase.";
      if (code === "functions/resource-exhausted") message = "GROVA AI đang vượt giới hạn sử dụng. Vui lòng thử lại sau.";
      appendGrovaAIMessage("assistant", message);
    } finally {
      grovaAiBusy = false;
      if (button) {
        button.disabled = false;
        button.textContent = "Gửi";
      }
      if (status) status.textContent = "AI chỉ đọc dữ liệu theo quyền của tài khoản.";
      input?.focus();
    }
  }

  function clearGrovaAIChat() {
    const container = $("#grovaAiMessages");
    if (!container) return;
    container.innerHTML = "";
    delete container.dataset.initialized;
    renderGrovaAI();
  }

  /* =======================================================
     SETTINGS
  ======================================================= */

  function renderSettings() {

    if (!hasPermission("settings", "view")) {
      showPermissionDenied("settings");
      return;
    }

    const settings =
      getSettings();

    if ($("#setCompanyName")) {

      $("#setCompanyName").value =
        settings.companyName || "";

    }

    if ($("#setTaxCode")) {

      $("#setTaxCode").value =
        settings.taxCode || "";

    }

    if ($("#setAddress")) {

      $("#setAddress").value =
        settings.address || "";

    }

    if ($("#setRepresentative")) {

      $("#setRepresentative").value =
        settings.representative || "";

    }

    if ($("#setPosition")) {

      $("#setPosition").value =
        settings.position || "";

    }

    if ($("#setUserName")) {

      $("#setUserName").value =
        settings.userName ||
        "Quản trị viên";

    }

    updateUserDisplay();
    renderAccountManagement();

    if (
      hasPermission("users", "view") &&
      !accountUsersLoadedOnce &&
      !accountUsersLoading
    ) {
      void loadAccountUsers({ reset: true });
    }

  }

  function saveSettings() {

    const settings = {

      companyName:
        $("#setCompanyName")
          ?.value
          .trim() || "",

      taxCode:
        $("#setTaxCode")
          ?.value
          .trim() || "",

      address:
        $("#setAddress")
          ?.value
          .trim() || "",

      representative:
        $("#setRepresentative")
          ?.value
          .trim() || "",

      position:
        $("#setPosition")
          ?.value
          .trim() || "",

      userName:
        $("#setUserName")
          ?.value
          .trim() ||
        "Quản trị viên"

    };

    writeStorage(
      STORAGE.settings,
      settings
    );

    updateUserDisplay();

    showToast(
      "Đã lưu cài đặt."
    );

  }

  function updateUserDisplay() {

    const settings =
      getSettings();

    const profileName =
      currentUserProfile?.name ||
      currentUser?.displayName ||
      settings.userName ||
      "Quản trị viên";

    const profileRole =
      ROLE_LABELS[currentUserProfile?.role] ||
      (isAdminUser() ? ROLE_LABELS.admin : ROLE_LABELS.employee);

    if ($("#userName")) {
      $("#userName").textContent = profileName;
    }

    if ($("#currentUserName")) {
      $("#currentUserName").textContent = profileName;
    }

    if ($("#currentUserRole")) {
      $("#currentUserRole").textContent = profileRole;
    }

    const avatar =
      document.querySelector(
        ".avatar"
      );

    if (avatar) {

      avatar.textContent =
        profileName
          .trim()
          .charAt(0)
          .toUpperCase() ||
        "A";

    }

  }

  /* =======================================================
     FULL SYSTEM BACKUP / RESTORE — VERSION 227
  ======================================================= */

  const SYSTEM_BACKUP_VERSION = "237";

  const SYSTEM_BACKUP_FILES = [
    "index.html", "app.js", "style.css", "auth.js", "auth.css", "sw.js",
    "firestore.js", "firestore.rules", "firebase.json", ".firebaserc",
    "manifest.json", "data/data.js", "data/grova_logo.png",
    "assets/icon-192.png", "assets/icon-512.png",
    "functions/index.js", "functions/package.json", "document-permission.js"
  ];

  const SYSTEM_BACKUP_TEMPLATE_FILES = [
    "01-hop-dong-nguyen-tac.html", "02-phu-luc-hop-dong.html",
    "03-de-nghi-thi-cong.html", "04-xac-nhan-phat-sinh.html",
    "05-nghiem-thu-ban-giao.html", "06-de-nghi-thanh-toan.html",
    "07-doi-chieu-cong-no.html", "08-hop-dong-lao-dong.html",
    "09-thanh-ly-hop-dong.html"
  ];

  const SYSTEM_BACKUP_COLLECTIONS = [
    "projects", "customers", "employees", "history", "users",
    "documents", "document_counters"
  ];

  function downloadBackupBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function backupSafeJSON(value) {
    return JSON.stringify(value, (key, item) => {
      if (item && typeof item.toDate === "function") {
        return { __grovaType: "timestamp", value: item.toDate().toISOString() };
      }
      if (item && typeof item.path === "string" && item.firestore) {
        return { __grovaType: "reference", path: item.path };
      }
      if (item instanceof Uint8Array) {
        return { __grovaType: "bytes", value: Array.from(item) };
      }
      return item;
    }, 2);
  }

  function backupRestoreValue(value) {
    if (Array.isArray(value)) return value.map(backupRestoreValue);
    if (!value || typeof value !== "object") return value;
    if (value.__grovaType === "timestamp") {
      return window.firebase?.firestore?.Timestamp
        ? firebase.firestore.Timestamp.fromDate(new Date(value.value))
        : new Date(value.value);
    }
    if (value.__grovaType === "bytes") return new Uint8Array(value.value || []);
    if (value.__grovaType === "reference") return value.path || "";
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, backupRestoreValue(item)]));
  }

  async function fetchBackupFile(path) {
    const response = await fetch(`./${path}?backup=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`BACKUP_FILE_NOT_FOUND:${path}`);
    return response.blob();
  }

  async function collectFirestoreBackup() {
    if (!initializeFirestore()) throw new Error("FIRESTORE_UNAVAILABLE");
    await waitForFirestore();
    const result = {};
    for (const collectionName of SYSTEM_BACKUP_COLLECTIONS) {
      try {
        const snapshot = await firestoreDb.collection(collectionName).get();
        result[collectionName] = snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
      } catch (error) {
        console.warn(`GROVA BACKUP: cannot read ${collectionName}.`, error);
        result[collectionName] = [];
        result.__errors = result.__errors || [];
        result.__errors.push({ collection: collectionName, code: String(error?.code || "unknown"), message: String(error?.message || "") });
      }
    }
    return result;
  }

  async function createFullSystemBackup() {
    if (!isAdminUser()) {
      showToast("Chỉ Administrator mới có thể tạo backup toàn hệ thống.");
      return;
    }
    const button = document.querySelector('[data-action="backup-system"]');
    if (button) { button.disabled = true; button.textContent = "Đang tạo backup..."; }
    try {
      if (!window.JSZip) throw new Error("JSZIP_UNAVAILABLE");
      const now = new Date();
      const stamp = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const root = `GROVA_DOCUMENT_BACKUP_${stamp}`;
      const zip = new JSZip();
      const firestoreData = await collectFirestoreBackup();
      const payload = {
        exportedAt: now.toISOString(),
        app: DATA.app || {},
        company: getSettings(),
        localData: { projects: getProjects(), customers: getCustomers(), employees: getEmployees(), history: getHistory(), templates: getTemplates() },
        firestore: firestoreData
      };

      zip.file(`${root}/BACKUP_INFO.json`, backupSafeJSON({
        backupType: "GROVA_DOCUMENT_FULL_SYSTEM",
        backupVersion: SYSTEM_BACKUP_VERSION,
        createdAt: now.toISOString(),
        appVersion: DATA.app?.version || SYSTEM_BACKUP_VERSION,
        note: "Firebase Authentication credentials/passwords are not exportable from the browser. users profiles are included; Authentication accounts remain in Firebase Auth."
      }));
      zip.file(`${root}/DATA/firestore-and-local-data.json`, backupSafeJSON(payload));

      const sourcePaths = [...SYSTEM_BACKUP_FILES, ...SYSTEM_BACKUP_TEMPLATE_FILES.map((name) => `templates/${name}`)];
      for (const path of sourcePaths) {
        try {
          zip.file(`${root}/SYSTEM/${path}`, await fetchBackupFile(path));
        } catch (error) {
          zip.file(`${root}/SYSTEM_MISSING/${path}.txt`, `Không thể đọc file ${path}.\n${String(error?.message || error)}`);
        }
      }
      zip.file(`${root}/README_RESTORE.txt`,
`GROVA DOCUMENT — HƯỚNG DẪN BACKUP / KHÔI PHỤC\n\n` +
`1. Backup chứa mã nguồn, templates, assets và dữ liệu Firestore mà tài khoản hiện tại được phép đọc.\n` +
`2. Mật khẩu và thông tin đăng nhập Firebase Authentication không thể xuất từ trình duyệt.\n` +
`3. Khôi phục dữ liệu bằng chức năng Khôi phục trong GROVA có thể ghi đè dữ liệu hiện tại.\n` +
`4. Mã nguồn trong SYSTEM là bản lưu để upload/khôi phục thủ công trên GitHub/hosting.\n` +
`5. Giữ lại file backup gốc ở nơi an toàn.`);

      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      downloadBackupBlob(blob, `GROVA-DOCUMENT-FULL-BACKUP-${stamp}.zip`);
      showToast("Đã tạo backup toàn hệ thống.");
    } catch (error) {
      console.error("GROVA BACKUP: create failed.", error);
      showToast(error?.message === "JSZIP_UNAVAILABLE" ? "Chưa tải được thư viện tạo file ZIP. Vui lòng tải lại trang." : "Không thể tạo backup toàn hệ thống.");
    } finally {
      if (button) { button.disabled = false; button.textContent = "Tạo backup toàn hệ thống"; }
    }
  }

  async function restoreFullSystemBackup(file) {
    if (!isAdminUser()) { showToast("Chỉ Administrator mới có thể khôi phục backup."); return; }
    if (!file || !window.JSZip) { showToast("Không thể đọc file backup ZIP. Vui lòng tải lại trang."); return; }
    if (!confirm("CẢNH BÁO KHÔI PHỤC\n\nDữ liệu trong backup sẽ được ghi vào Firestore. Dữ liệu hiện tại có thể bị ghi đè.\n\nBạn chắc chắn muốn tiếp tục?")) return;
    try {
      const zip = await JSZip.loadAsync(file);
      const dataEntry = Object.values(zip.files).find((entry) => /\/DATA\/firestore-and-local-data\.json$/i.test(entry.name));
      if (!dataEntry) throw new Error("BACKUP_DATA_NOT_FOUND");
      const payload = JSON.parse(await dataEntry.async("text"));
      const firestoreData = payload?.firestore || {};
      await waitForFirestore();
      for (const collectionName of SYSTEM_BACKUP_COLLECTIONS) {
        const records = Array.isArray(firestoreData[collectionName]) ? firestoreData[collectionName] : [];
        for (let start = 0; start < records.length; start += 400) {
          const batch = firestoreDb.batch();
          records.slice(start, start + 400).forEach((record) => {
            if (!record?.id || !record?.data) return;
            batch.set(firestoreDb.collection(collectionName).doc(String(record.id)), backupRestoreValue(record.data), { merge: false });
          });
          await batch.commit();
        }
      }
      if (payload.company) writeStorage(STORAGE.settings, payload.company);
      if (payload.localData?.projects) writeStorage(STORAGE.projects, payload.localData.projects);
      if (payload.localData?.customers) writeStorage(STORAGE.customers, payload.localData.customers);
      if (payload.localData?.employees) writeStorage(STORAGE.employees, payload.localData.employees);
      if (payload.localData?.history) writeStorage(STORAGE.history, payload.localData.history);
      showToast("Đã khôi phục dữ liệu từ backup. Vui lòng tải lại trang.");
      setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      console.error("GROVA BACKUP: restore failed.", error);
      showToast(error?.code === "permission-denied" ? "Firebase từ chối khôi phục theo Rules hiện tại." : "Không thể khôi phục backup.");
    }
  }

  /* =======================================================
     EXPORT DATA
  ======================================================= */

  function exportData() {

    const payload = {

      exportedAt:
        nowISO(),

      app:
        DATA.app || {},

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
     RESET DATA
  ======================================================= */

  function resetData() {

    const ok =
      confirm(
        "CẢNH BÁO\n\nBạn có chắc muốn xóa toàn bộ dữ liệu cục bộ của GROVA DOCUMENT trên thiết bị này?\n\nCông trình, khách hàng, nhân sự, lịch sử và cài đặt sẽ bị xóa."
      );

    if (!ok) {
      return;
    }

    Object.values(
      STORAGE
    ).forEach(
      (key) => {
        localStorage.removeItem(
          key
        );
      }
    );

    projectsSyncToken++;
    customersSyncToken++;
    employeesSyncToken++;
    historySyncToken++;

    if (currentUser) {

      localStorage.removeItem(
        getProjectCacheKey(
          currentUser.uid
        )
      );

      localStorage.removeItem(
        getCustomerCacheKey(
          currentUser.uid
        )
      );

      localStorage.removeItem(
        getEmployeeCacheKey(
          currentUser.uid
        )
      );

      localStorage.removeItem(
        getHistoryCacheKey(
          currentUser.uid
        )
      );

    }

    setProjectsCache([]);
    setCustomersCache([]);
    setEmployeesCache([]);
    setHistoryCache([]);

    renderDashboard();

    showPage(
      "dashboard"
    );

    showToast(
      "Đã xóa dữ liệu cục bộ."
    );

  }

  /* =======================================================
     EVENT HANDLERS
  ======================================================= */

  function handleClick(event) {

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
        pickerButton.dataset.pickerTemplateId
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

      case "open-project-location":
        openProjectLocation(
          actionButton.dataset.id
        );
        break;

      case "pin-project-location":
        pinProjectLocation();
        break;

      case "import-project-location-link":
        importProjectLocationFromLink();
        break;

      case "clear-project-location":
        clearProjectLocation();
        break;

      case "delete-project":
        deleteProject(
          actionButton.dataset.id
        );
        break;

      case "print-projects-filtered":
        printProjects(true);
        break;

      case "print-projects-all":
        printProjects(false);
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

      case "print-customers-filtered":
        printCustomers(true);
        break;

      case "print-customers-all":
        printCustomers(false);
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

      case "print-employees-filtered":
        printEmployees(true);
        break;

      case "print-employees-all":
        printEmployees(false);
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

      case "grova-ai-send":
        void askGrovaAI();
        break;

      case "grova-ai-clear":
        clearGrovaAIChat();
        break;

      case "backup-system":
        void createFullSystemBackup();
        break;

      case "restore-system":
        document.getElementById("systemBackupFileInput")?.click();
        break;

      case "reset-data":
        resetData();
        break;

      case "refresh-users":
        void loadAccountUsers({ reset: true });
        break;

      case "load-more-users":
        void loadAccountUsers({ reset: false });
        break;

      case "new-user":
        openUserModal();
        break;

      case "edit-user":
        openUserModal(actionButton.dataset.id);
        break;

      case "toggle-user-status":
        void toggleUserStatus(
          actionButton.dataset.id,
          actionButton.dataset.status
        );
        break;

    }

  }

  function handleInput(event) {

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

      case "user":
        saveUser();
        break;

    }

  }

  /* =======================================================
     KEYBOARD / MODAL
  ======================================================= */

  function handleKeydown(event) {

    if (
      event.key ===
      "Escape"
    ) {

      closeModal();

      closeSidebar();

    }

  }

  function handleModalBackdrop(event) {

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
      "serviceWorker" in navigator
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

    document.addEventListener("change", (event) => {
      if (event.target?.id !== "systemBackupFileInput") return;
      const file = event.target.files?.[0];
      event.target.value = "";
      if (file) void restoreFullSystemBackup(file);
    });

    document.addEventListener(
      "click",
      handleClick
    );

    document.addEventListener(
      "input",
      handleInput
    );

    document.addEventListener(
      "change",
      handleInput
    );

    if ($("#modalSave")) {

      $("#modalSave").addEventListener(
        "click",
        handleModalSave
      );

    }

    if ($("#modal")) {

      $("#modal").addEventListener(
        "click",
        handleModalBackdrop
      );

    }

    if ($("#openSidebar")) {

      $("#openSidebar").addEventListener(
        "click",
        openSidebar
      );

    }

    if ($("#closeSidebar")) {

      $("#closeSidebar").addEventListener(
        "click",
        closeSidebar
      );

    }

    document.addEventListener(
      "keydown",
      handleKeydown
    );

    initDocumentCategories();

    updateUserDisplay();

    renderDashboard();

    /*
      QUAN TRỌNG:
      Firestore bridge chạy SAU khi app đã render.
      Lỗi Firebase/Firestore không được phép chặn init().
    */

    initFirestoreAuthBridge();

    registerServiceWorker();

  }

  /* =======================================================
     PHASE 5A PUBLIC PERMISSION BRIDGE
  ======================================================= */

  window.GROVA_PERMISSIONS = {
    getCurrentUserProfile,
    getDefaultPermissions,
    hasPermission,
    isAdminUser,
    ROLE_LABELS,
    DEFAULT_PERMISSIONS,
    askGrovaAI
  };

  /* =======================================================
     START
  ======================================================= */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init
    );

  } else {

    init();

  }

})();


