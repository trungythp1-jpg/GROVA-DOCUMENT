/* =========================================================
   GROVA DOCUMENT
   APP.JS — VERSION 209
   FIRESTORE PHASE 3 — PROJECTS + CUSTOMERS + EMPLOYEES
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
  const EMPLOYEE_CACHE_PREFIX = "GROVA_EMPLOYEES_V2_";

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

  let currentPage = "dashboard";

  let modalMode = "";

  let modalEditId = null;

  let toastTimer = null;

  /* =======================================================
     PROJECT FIRESTORE STATE
  ======================================================= */

  let currentUser = null;

  let projectsCache = [];

  let firestoreDb = null;

  let firestoreReadyPromise = null;

  let projectsSyncToken = 0;

  let firestoreSyncRunning = false;

  let customersCache = [];

  let customersSyncToken = 0;

  let customersSyncRunning = false;

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
    return (
      EMPLOYEE_CACHE_PREFIX +
      String(uid || "")
    );
  }

  function readEmployeeCache(uid) {
    if (!uid) {
      return [];
    }

    return readStorage(
      getEmployeeCacheKey(uid),
      []
    );
  }

  function writeEmployeeCache(uid, employees) {
    if (!uid) {
      return false;
    }

    return writeStorage(
      getEmployeeCacheKey(uid),
      Array.isArray(employees)
        ? employees
        : []
    );
  }

  function normalizeEmployees(employees) {
    if (!Array.isArray(employees)) {
      return [];
    }

    return employees
      .filter(
        (employee) =>
          employee &&
          employee.id
      )
      .map(
        (employee) => ({
          ...employee,
          id: String(employee.id)
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

  function setEmployeesCache(employees) {
    employeesCache =
      normalizeEmployees(employees);
  }

  function getBestLocalEmployees(uid) {
    const scopedCache =
      normalizeEmployees(
        readEmployeeCache(uid)
      );

    if (scopedCache.length) {
      return scopedCache;
    }

    return normalizeEmployees(
      readStorage(
        STORAGE.employees,
        []
      )
    );
  }

  function getEmployees() {
    if (currentUser) {
      return employeesCache.slice();
    }

    return normalizeEmployees(
      readStorage(
        STORAGE.employees,
        []
      )
    );
  }

  function getHistory() {
    return readStorage(STORAGE.history, []);
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

    currentUser =
      user || null;

    if (!user) {

      setProjectsCache([]);
      setCustomersCache([]);
      setEmployeesCache([]);

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
      getBestLocalProjects(
        user.uid
      );

    setProjectsCache(
      cachedProjects
    );

    const cachedCustomers =
      getBestLocalCustomers(
        user.uid
      );

    setCustomersCache(
      cachedCustomers
    );

    const cachedEmployees =
      getBestLocalEmployees(
        user.uid
      );

    setEmployeesCache(
      cachedEmployees
    );

    renderProjectViews();

    if (currentPage === "customers") {
      renderCustomers();
    }

    if (currentPage === "employees") {
      renderEmployees();
    }

    syncProjectsFromCloud(
      user
    );

    syncCustomersFromCloud(
      user
    );

    syncEmployeesFromCloud(
      user
    );

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

    auth.onAuthStateChanged(
      (user) => {

        handleAuthUser(
          user
        );

      }
    );

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

  /*
    Employee actions must not depend only on the app's cached
    currentUser variable. Firebase Auth can already have a
    signed-in user while the Auth state bridge is still catching up.
  */
  async function getActiveAuthUser() {

    if (currentUser) {
      return currentUser;
    }

    const auth =
      getAuthObject();

    if (auth) {

      /*
        Firebase Auth có thể đang ở trạng thái khởi tạo trong
        đúng thời điểm người dùng vừa mở app. Khi đó currentUser
        tạm thời có thể là null dù phiên đăng nhập vẫn hợp lệ.
        Chờ Auth hoàn tất trạng thái ban đầu trước khi kết luận
        rằng người dùng chưa đăng nhập.
      */
      if (typeof auth.authStateReady === "function") {
        try {
          await auth.authStateReady();
        } catch (error) {
          console.warn(
            "GROVA DOCUMENT: Không thể chờ Firebase Auth sẵn sàng.",
            error
          );
        }
      }

      if (auth.currentUser) {
        currentUser =
          auth.currentUser;

        return currentUser;
      }

      /*
        Fallback cho trường hợp SDK không cung cấp authStateReady:
        dùng đúng observer của Firebase để chờ trạng thái Auth.
      */
      if (typeof auth.onAuthStateChanged === "function") {
        const observedUser =
          await new Promise((resolve) => {
            let unsubscribe = null;
            let settled = false;

            const finish = (user) => {
              if (settled) {
                return;
              }

              settled = true;

              if (unsubscribe) {
                unsubscribe();
              }

              resolve(user || null);
            };

            try {
              unsubscribe =
                auth.onAuthStateChanged(
                  (user) => finish(user)
                );
            } catch (error) {
              console.warn(
                "GROVA DOCUMENT: Không thể đọc trạng thái Firebase Auth.",
                error
              );
              finish(null);
            }
          });

        if (observedUser) {
          currentUser =
            observedUser;

          return currentUser;
        }
      }
    }

    if (
      window.GROVA_AUTH &&
      typeof window.GROVA_AUTH.getCurrentUser === "function"
    ) {

      const user =
        window.GROVA_AUTH.getCurrentUser();

      if (user) {
        currentUser =
          user;

        return currentUser;
      }
    }

    return null;
  }

  function getEmployeesCollection() {
    if (!firestoreDb) {
      return null;
    }

    return firestoreDb.collection("employees");
  }

  function buildEmployeeData(employee, user, isCreate = false) {
    const now =
      nowISO();

    const uid =
      user?.uid || "";

    return {
      id:
        String(employee.id),

      name:
        employee.name || "",

      position:
        employee.position || "",

      department:
        employee.department || "",

      phone:
        employee.phone || "",

      email:
        employee.email || "",

      startDate:
        employee.startDate || "",

      note:
        employee.note || "",

      createdAt:
        employee.createdAt ||
        now,

      updatedAt:
        employee.updatedAt ||
        now,

      createdBy:
        employee.createdBy ||
        uid,

      updatedBy:
        uid
    };
  }

  function mapFirestoreEmployee(doc) {
    const data =
      doc.data() || {};

    return {
      ...data,
      id:
        String(doc.id)
    };
  }

  async function readCloudEmployees() {
    if (!currentUser) {
      return null;
    }

    if (!initializeFirestore()) {
      return null;
    }

    await waitForFirestore();

    const collection =
      getEmployeesCollection();

    if (!collection) {
      return null;
    }

    const snapshot =
      await collection.get();

    return normalizeEmployees(
      snapshot.docs.map(
        mapFirestoreEmployee
      )
    );
  }

  async function writeCloudEmployee(employee, user, isCreate = false) {
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
      buildEmployeeData(
        employee,
        user,
        isCreate
      );

    const reference =
      getEmployeesCollection()
        .doc(String(employee.id));

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

    return mapFirestoreEmployee(
      verification
    );
  }

  async function deleteCloudEmployee(id, user) {
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
      getEmployeesCollection()
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

  function employeeIds(employees) {
    return normalizeEmployees(employees)
      .map(
        (employee) =>
          String(employee.id)
      )
      .sort();
  }

  function sameEmployeeIdSet(a, b) {
    const left =
      employeeIds(a);

    const right =
      employeeIds(b);

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

  async function verifyEmployeeMigration(expectedEmployees) {
    const cloud =
      await readCloudEmployees();

    if (!cloud) {
      return false;
    }

    const expected =
      normalizeEmployees(
        expectedEmployees
      );

    if (
      cloud.length !==
      expected.length
    ) {
      return false;
    }

    return sameEmployeeIdSet(
      cloud,
      expected
    );
  }

  function showEmployeeSyncError(error) {
    console.error(
      "GROVA DOCUMENT: Employee Firestore error.",
      error
    );

    showToast(
      "Không thể đồng bộ nhân sự. Ứng dụng vẫn đang dùng dữ liệu cục bộ."
    );
  }

  async function migrateLocalEmployeesIfNeeded(
    user,
    localEmployees
  ) {
    if (!user) {
      return false;
    }

    const sourceEmployees =
      normalizeEmployees(
        localEmployees
      );

    if (!sourceEmployees.length) {
      return false;
    }

    try {
      if (!initializeFirestore()) {
        throw new Error(
          "FIRESTORE_UNAVAILABLE"
        );
      }

      await waitForFirestore();

      const collection =
        getEmployeesCollection();

      if (!collection) {
        throw new Error(
          "FIRESTORE_UNAVAILABLE"
        );
      }

      for (
        const employee of sourceEmployees
      ) {
        const data =
          buildEmployeeData(
            employee,
            user,
            !employee.createdBy
          );

        await collection
          .doc(String(employee.id))
          .set(
            data,
            {
              merge: true
            }
          );
      }

      const verified =
        await verifyEmployeeMigration(
          sourceEmployees
        );

      if (!verified) {
        throw new Error(
          "MIGRATION_VERIFICATION_FAILED"
        );
      }

      const migratedCloud =
        await readCloudEmployees();

      if (!migratedCloud) {
        throw new Error(
          "MIGRATION_READBACK_FAILED"
        );
      }

      setEmployeesCache(
        migratedCloud
      );

      writeEmployeeCache(
        user.uid,
        migratedCloud
      );

      showToast(
        "Đã đồng bộ nhân sự cũ lên Firestore."
      );

      return true;

    } catch (error) {
      showEmployeeSyncError(
        error
      );

      return false;
    }
  }

  async function syncEmployeesFromCloud(user) {
    if (!user) {
      return;
    }

    const token =
      ++employeesSyncToken;

    employeesSyncRunning = true;

    try {
      const initialized =
        initializeFirestore();

      if (!initialized) {
        return;
      }

      const localEmployees =
        getBestLocalEmployees(
          user.uid
        );

      if (localEmployees.length) {
        setEmployeesCache(
          localEmployees
        );

        if (currentPage === "employees") {
          renderEmployees();
        }

        updateStats();
      }

      const cloud =
        await readCloudEmployees();

      if (
        token !==
          employeesSyncToken ||
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
        setEmployeesCache(
          cloud
        );

        writeEmployeeCache(
          user.uid,
          cloud
        );

        if (currentPage === "employees") {
          renderEmployees();
        }

        updateStats();

        return;
      }

      /*
        Cloud đang rỗng:
        chỉ migrate nếu local thật sự có dữ liệu.
        Không bao giờ xóa cache chỉ vì cloud rỗng.
      */
      if (localEmployees.length) {
        const migrated =
          await migrateLocalEmployeesIfNeeded(
            user,
            localEmployees
          );

        if (
          token !==
            employeesSyncToken ||
          currentUser?.uid !==
            user.uid
        ) {
          return;
        }

        if (migrated) {
          if (currentPage === "employees") {
            renderEmployees();
          }

          updateStats();

          return;
        }

        /* Migration lỗi => giữ nguyên local cache. */
        if (currentPage === "employees") {
          renderEmployees();
        }

        updateStats();

        return;
      }

      /* Cả local và cloud đều rỗng. */
      setEmployeesCache([]);

      writeEmployeeCache(
        user.uid,
        []
      );

      if (currentPage === "employees") {
        renderEmployees();
      }

      updateStats();

    } catch (error) {
      if (
        token ===
        employeesSyncToken
      ) {
        showEmployeeSyncError(
          error
        );
      }

    } finally {
      if (
        token ===
        employeesSyncToken
      ) {
        employeesSyncRunning = false;
      }
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

  function showPage(page) {

    if (!PAGE_INFO[page]) {
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
          >
            Mở mẫu →
          </button>

        </div>

      </article>
    `;

  }

  function renderDocuments() {

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

    const template =
      findTemplate(id);

    if (!template) {

      showToast(
        "Không tìm thấy mẫu văn bản."
      );

      return;

    }

    addHistory(template);

    if (template.file) {

      window.location.href =
        template.file;

      return;

    }

    showToast(
      "Mẫu văn bản chưa được cấu hình đường dẫn."
    );

  }

  /* =======================================================
     NEW DOCUMENT MODAL
  ======================================================= */

  function openTemplatePicker() {

    const templates =
      getTemplates();

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
     HISTORY
  ======================================================= */

  function addHistory(template) {

    const history =
      getHistory();

    const item = {

      id: createId("HIS"),

      templateId:
        template.id,

      code:
        template.code || "",

      name:
        template.name ||
        template.title ||
        "",

      icon:
        template.icon ||
        "📄",

      openedAt:
        nowISO()

    };

    const filtered =
      history.filter(
        (oldItem) =>
          oldItem.templateId !==
          template.id
      );

    filtered.unshift(item);

    writeStorage(
      STORAGE.history,
      filtered.slice(0, 100)
    );

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

  function clearHistory() {

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

    writeStorage(
      STORAGE.history,
      []
    );

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

                <button
                  type="button"
                  class="small-btn"
                  data-action="edit-project"
                  data-id="${escapeHTML(project.id)}"
                >
                  Sửa
                </button>

                <button
                  type="button"
                  class="small-btn delete"
                  data-action="delete-project"
                  data-id="${escapeHTML(project.id)}"
                >
                  Xóa
                </button>

              </div>

            </div>

          `
        )
        .join("");

  }

  function openProjectModal(id = null) {

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

      if (!currentUser) {

        throw new Error(
          "AUTH_REQUIRED"
        );

      }

      const savedProject =
        await writeCloudProject(
          localProject,
          currentUser,
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
        currentUser.uid,
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

      if (!currentUser) {

        throw new Error(
          "AUTH_REQUIRED"
        );

      }

      await deleteCloudProject(
        id,
        currentUser
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
        currentUser.uid,
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

                <button
                  type="button"
                  class="small-btn"
                  data-action="edit-customer"
                  data-id="${escapeHTML(customer.id)}"
                >
                  Sửa
                </button>

                <button
                  type="button"
                  class="small-btn delete"
                  data-action="delete-customer"
                  data-id="${escapeHTML(customer.id)}"
                >
                  Xóa
                </button>

              </div>

            </div>

          `
        )
        .join("");

  }

  function openCustomerModal(id = null) {

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

      if (!currentUser) {
        throw new Error(
          "AUTH_REQUIRED"
        );
      }

      const savedCustomer =
        await writeCloudCustomer(
          localCustomer,
          currentUser,
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
        currentUser.uid,
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

      if (!currentUser) {
        throw new Error(
          "AUTH_REQUIRED"
        );
      }

      await deleteCloudCustomer(
        id,
        currentUser
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
        currentUser.uid,
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

                <button
                  type="button"
                  class="small-btn"
                  data-action="edit-employee"
                  data-id="${escapeHTML(employee.id)}"
                >
                  Sửa
                </button>

                <button
                  type="button"
                  class="small-btn delete"
                  data-action="delete-employee"
                  data-id="${escapeHTML(employee.id)}"
                >
                  Xóa
                </button>

              </div>

            </div>

          `
        )
        .join("");

  }

  function openEmployeeModal(id = null) {

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

    const employees =
      getEmployees();

    const existingEmployee =
      modalEditId
        ? employees.find(
            (item) =>
              item.id ===
              modalEditId
          )
        : null;

    const now =
      nowISO();

    const data = {

      name,

      position:
        $("#modalEmployeePosition")
          ?.value
          .trim() || "",

      department:
        $("#modalEmployeeDepartment")
          ?.value
          .trim() || "",

      phone:
        $("#modalEmployeePhone")
          ?.value
          .trim() || "",

      email:
        $("#modalEmployeeEmail")
          ?.value
          .trim() || "",

      startDate:
        $("#modalEmployeeStart")
          ?.value || "",

      note:
        $("#modalEmployeeNote")
          ?.value
          .trim() || ""

    };

    const localEmployee =
      modalEditId && existingEmployee
        ? {
            ...existingEmployee,
            ...data,
            updatedAt: now
          }
        : {
            id: createId("NS"),
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

      const savedEmployee =
        await writeCloudEmployee(
          localEmployee,
          authUser,
          !modalEditId
        );

      setEmployeesCache([
        ...employees.filter(
          (item) =>
            item.id !==
            savedEmployee.id
        ),
        savedEmployee
      ]);

      writeEmployeeCache(
        authUser.uid,
        employeesCache
      );

      closeModal();

      renderEmployees();

      updateStats();

      showToast(
        modalEditId
          ? "Đã cập nhật nhân sự."
          : "Đã thêm nhân sự."
      );

    } catch (error) {

      console.error(
        "GROVA DOCUMENT: saveEmployee failed.",
        error
      );

      if (
        error &&
        error.message ===
          "AUTH_REQUIRED"
      ) {

        showToast(
          "Chưa đăng nhập. Không thể lưu nhân sự."
        );

      } else {

        showToast(
          "Không thể lưu nhân sự lên hệ thống. Dữ liệu cục bộ chưa bị thay đổi."
        );
      }

    } finally {

      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = "Lưu";
      }
    }
  }

  async function deleteEmployee(id) {

    const employees =
      getEmployees();

    const employee =
      employees.find(
        (item) =>
          item.id === id
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

    try {

      const authUser =
        await getActiveAuthUser();

      if (!authUser) {
        throw new Error(
          "AUTH_REQUIRED"
        );
      }

      await deleteCloudEmployee(
        id,
        authUser
      );

      const updatedEmployees =
        employees.filter(
          (item) =>
            item.id !== id
        );

      setEmployeesCache(
        updatedEmployees
      );

      writeEmployeeCache(
        authUser.uid,
        employeesCache
      );

      renderEmployees();

      updateStats();

      showToast(
        "Đã xóa nhân sự."
      );

    } catch (error) {

      console.error(
        "GROVA DOCUMENT: deleteEmployee failed.",
        error
      );

      if (
        error &&
        error.message ===
          "AUTH_REQUIRED"
      ) {

        showToast(
          "Chưa đăng nhập. Không thể xóa nhân sự."
        );

      } else {

        showToast(
          "Không thể xóa nhân sự. Dữ liệu cục bộ chưa bị thay đổi."
        );
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
     SETTINGS
  ======================================================= */

  function renderSettings() {

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

    if ($("#userName")) {

      $("#userName").textContent =
        settings.userName ||
        "Quản trị viên";

    }

    const avatar =
      document.querySelector(
        ".avatar"
      );

    if (avatar) {

      const name =
        settings.userName ||
        "Quản trị viên";

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

    }

    setProjectsCache([]);
    setCustomersCache([]);
    setEmployeesCache([]);

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
