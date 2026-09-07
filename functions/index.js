/**
 * GROVA DOCUMENT — PHASE 5B.2
 * Secure Account API
 *
 * Purpose:
 * - Keep Firebase Admin SDK on the trusted server side.
 * - Authenticate the caller on every account-management operation.
 * - Enforce GROVA users.* permissions before changing Firebase Auth or users/{uid}.
 * - Provide create/list/update/lock/unlock operations for the future account UI.
 *
 * This phase does NOT connect the API to app.js yet.
 * It also does NOT hard-delete Firebase Auth accounts.
 */

const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

initializeApp();

const auth = getAuth();
const db = getFirestore();

const BOOTSTRAP_ADMIN_UID = "nJmKgjEILgVOEjWKYWTsuonxbO03";
const USERS_COLLECTION = "users";
const ROLE_LABELS = {
  admin: "Administrator",
  manager: "Quản lý",
  employee: "Nhân viên",
  viewer: "Chỉ xem",
  custom: "Tùy chỉnh"
};

const PERMISSION_KEYS = [
  "projects",
  "customers",
  "employees",
  "documents",
  "history",
  "users",
  "settings"
];

const DEFAULT_PERMISSIONS = {
  admin: {
    projects: { view: true, create: true, edit: true, delete: true },
    customers: { view: true, create: true, edit: true, delete: true },
    employees: { view: true, create: true, edit: true, delete: true },
    documents: { view: true, create: true, edit: true, delete: true, export: true },
    history: { view: true },
    users: { view: true, create: true, edit: true, lock: true, managePermissions: true },
    settings: { view: true, edit: true }
  },
  manager: {
    projects: { view: true, create: true, edit: true, delete: true },
    customers: { view: true, create: true, edit: true, delete: true },
    employees: { view: true, create: true, edit: true, delete: true },
    documents: { view: true, create: true, edit: true, delete: true, export: true },
    history: { view: true },
    users: { view: false, create: false, edit: false, lock: false, managePermissions: false },
    settings: { view: true, edit: true }
  },
  employee: {
    projects: { view: true, create: true, edit: true, delete: false },
    customers: { view: true, create: true, edit: true, delete: false },
    employees: { view: true, create: false, edit: false, delete: false },
    documents: { view: true, create: true, edit: false, delete: false, export: true },
    history: { view: true },
    users: { view: false, create: false, edit: false, lock: false, managePermissions: false },
    settings: { view: false, edit: false }
  },
  viewer: {
    projects: { view: true, create: false, edit: false, delete: false },
    customers: { view: true, create: false, edit: false, delete: false },
    employees: { view: true, create: false, edit: false, delete: false },
    documents: { view: true, create: false, edit: false, delete: false, export: false },
    history: { view: true },
    users: { view: false, create: false, edit: false, lock: false, managePermissions: false },
    settings: { view: false, edit: false }
  },
  custom: {
    projects: { view: false, create: false, edit: false, delete: false },
    customers: { view: false, create: false, edit: false, delete: false },
    employees: { view: false, create: false, edit: false, delete: false },
    documents: { view: false, create: false, edit: false, delete: false, export: false },
    history: { view: false },
    users: { view: false, create: false, edit: false, lock: false, managePermissions: false },
    settings: { view: false, edit: false }
  }
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizePermissions(input, role = "employee") {
  const base = clone(DEFAULT_PERMISSIONS[role] || DEFAULT_PERMISSIONS.employee);
  if (!input || typeof input !== "object") return base;

  for (const group of PERMISSION_KEYS) {
    if (!input[group] || typeof input[group] !== "object") continue;
    for (const key of Object.keys(base[group])) {
      if (typeof input[group][key] === "boolean") {
        base[group][key] = input[group][key];
      }
    }
  }

  return base;
}

function makeAdminPermissions() {
  return clone(DEFAULT_PERMISSIONS.admin);
}

function normalizeRole(role) {
  return Object.prototype.hasOwnProperty.call(ROLE_LABELS, role) ? role : "employee";
}

function cleanString(value, maxLength = 200) {
  if (value === undefined || value === null) return "";
  return String(value).trim().slice(0, maxLength);
}

function isBootstrapAdmin(uid) {
  return uid === BOOTSTRAP_ADMIN_UID;
}

function isAdminProfile(profile, uid) {
  return isBootstrapAdmin(uid) || (profile && profile.status === "active" && profile.role === "admin");
}

async function getUserProfile(uid) {
  const snap = await db.collection(USERS_COLLECTION).doc(uid).get();
  return snap.exists ? snap.data() : null;
}

async function requireCaller(request, permission) {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError("unauthenticated", "Bạn phải đăng nhập để sử dụng GROVA backend.");
  }

  const uid = request.auth.uid;
  const profile = await getUserProfile(uid);

  if (isBootstrapAdmin(uid)) {
    return {
      uid,
      profile: {
        uid,
        role: "admin",
        status: "active",
        permissions: makeAdminPermissions()
      }
    };
  }

  if (!profile || profile.status !== "active") {
    throw new HttpsError("permission-denied", "Tài khoản không có quyền sử dụng chức năng này.");
  }

  if (profile.role === "admin") {
    return { uid, profile };
  }

  if (!profile.permissions || !profile.permissions.users || profile.permissions.users[permission] !== true) {
    throw new HttpsError("permission-denied", "Bạn không có quyền quản lý tài khoản.");
  }

  return { uid, profile };
}

function assertTargetUid(targetUid) {
  const uid = cleanString(targetUid, 128);
  if (!uid) {
    throw new HttpsError("invalid-argument", "Thiếu UID tài khoản.");
  }
  return uid;
}

async function assertNotProtectedAdminTarget(caller, targetUid, action) {
  if (targetUid !== BOOTSTRAP_ADMIN_UID) return;

  if (caller.uid !== BOOTSTRAP_ADMIN_UID) {
    throw new HttpsError("permission-denied", "Không được phép thay đổi tài khoản Admin gốc.");
  }

  if (action === "lock" || action === "unlock") {
    throw new HttpsError("failed-precondition", "Không thể khóa hoặc mở khóa tài khoản Admin gốc.");
  }
}

async function countActiveAdmins() {
  const snap = await db.collection(USERS_COLLECTION)
    .where("role", "==", "admin")
    .where("status", "==", "active")
    .get();
  return snap.size;
}

function buildAuthUserResponse(userRecord, profile) {
  return {
    uid: userRecord.uid,
    email: userRecord.email || "",
    displayName: userRecord.displayName || "",
    phoneNumber: userRecord.phoneNumber || "",
    disabled: Boolean(userRecord.disabled),
    emailVerified: Boolean(userRecord.emailVerified),
    creationTime: userRecord.metadata && userRecord.metadata.creationTime
      ? userRecord.metadata.creationTime
      : null,
    lastSignInTime: userRecord.metadata && userRecord.metadata.lastSignInTime
      ? userRecord.metadata.lastSignInTime
      : null,
    profile: profile || null
  };
}

exports.grovaBackendStatus = onCall((request) => {
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Bạn phải đăng nhập để sử dụng GROVA backend."
    );
  }

  return {
    ok: true,
    service: "GROVA DOCUMENT",
    phase: "5B.2",
    backend: "cloud-functions-2nd-gen",
    callerUid: request.auth.uid,
    isBootstrapAdmin: request.auth.uid === BOOTSTRAP_ADMIN_UID
  };
});

exports.grovaListUsers = onCall(async (request) => {
  const caller = await requireCaller(request, "view");
  const pageToken = cleanString(request.data && request.data.pageToken, 2048) || undefined;
  const maxResultsRaw = Number(request.data && request.data.maxResults);
  const maxResults = Number.isInteger(maxResultsRaw) && maxResultsRaw >= 1 && maxResultsRaw <= 1000
    ? maxResultsRaw
    : 100;

  const result = await auth.listUsers(maxResults, pageToken);
  const users = [];

  for (const userRecord of result.users) {
    const profile = await getUserProfile(userRecord.uid);
    users.push(buildAuthUserResponse(userRecord, profile));
  }

  return {
    ok: true,
    users,
    nextPageToken: result.pageToken || null,
    requestedBy: caller.uid
  };
});

exports.grovaCreateUser = onCall(async (request) => {
  const caller = await requireCaller(request, "create");
  const data = request.data && typeof request.data === "object" ? request.data : {};

  const email = cleanString(data.email, 320).toLowerCase();
  const password = typeof data.password === "string" ? data.password : "";
  const displayName = cleanString(data.name || data.displayName, 200);
  const phoneNumber = cleanString(data.phoneNumber, 40);
  const requestedRole = normalizeRole(cleanString(data.role, 30));

  if (!email) throw new HttpsError("invalid-argument", "Email là bắt buộc.");
  if (!password || password.length < 6) {
    throw new HttpsError("invalid-argument", "Mật khẩu phải có ít nhất 6 ký tự.");
  }

  if (requestedRole === "admin" && !isAdminProfile(caller.profile, caller.uid)) {
    throw new HttpsError("permission-denied", "Chỉ Administrator mới được tạo tài khoản Administrator.");
  }

  const canManagePermissions = isAdminProfile(caller.profile, caller.uid)
    || caller.profile.permissions?.users?.managePermissions === true;

  if ((data.permissions !== undefined || requestedRole !== "employee") && !canManagePermissions) {
    throw new HttpsError("permission-denied", "Bạn không có quyền thiết lập role hoặc permissions.");
  }

  const role = requestedRole;
  const permissions = role === "admin"
    ? makeAdminPermissions()
    : normalizePermissions(data.permissions, role);

  const authData = {
    email,
    password,
    displayName: displayName || undefined,
    disabled: false
  };

  if (phoneNumber) authData.phoneNumber = phoneNumber;

  let userRecord;
  try {
    userRecord = await auth.createUser(authData);
  } catch (error) {
    throw new HttpsError("already-exists", "Không thể tạo tài khoản. Email hoặc thông tin tài khoản có thể đã tồn tại.");
  }

  const profile = {
    uid: userRecord.uid,
    name: displayName || "",
    email,
    role,
    status: "active",
    permissions,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    createdBy: caller.uid,
    updatedBy: caller.uid
  };

  try {
    await db.collection(USERS_COLLECTION).doc(userRecord.uid).set(profile);
  } catch (error) {
    try {
      await auth.deleteUser(userRecord.uid);
    } catch (rollbackError) {
      console.error("GROVA account creation rollback failed", rollbackError);
    }
    throw new HttpsError("internal", "Không thể hoàn tất hồ sơ tài khoản. Tài khoản tạo mới đã được hủy nếu có thể.");
  }

  return {
    ok: true,
    user: buildAuthUserResponse(userRecord, {
      ...profile,
      createdAt: null,
      updatedAt: null
    })
  };
});

exports.grovaUpdateUser = onCall(async (request) => {
  const caller = await requireCaller(request, "edit");
  const data = request.data && typeof request.data === "object" ? request.data : {};
  const targetUid = assertTargetUid(data.uid);

  await assertNotProtectedAdminTarget(caller, targetUid, "edit");

  const existingProfile = await getUserProfile(targetUid);
  if (!existingProfile) {
    throw new HttpsError("not-found", "Không tìm thấy hồ sơ tài khoản.");
  }

  const targetIsAdmin = existingProfile.role === "admin";
  if (targetIsAdmin && !isAdminProfile(caller.profile, caller.uid)) {
    throw new HttpsError("permission-denied", "Chỉ Administrator mới được thay đổi tài khoản Administrator.");
  }
  const requestedRole = data.role === undefined ? existingProfile.role : normalizeRole(cleanString(data.role, 30));
  const canManagePermissions = isAdminProfile(caller.profile, caller.uid)
    || caller.profile.permissions?.users?.managePermissions === true;

  if ((data.role !== undefined || data.permissions !== undefined) && !canManagePermissions) {
    throw new HttpsError("permission-denied", "Bạn không có quyền thay đổi role hoặc permissions.");
  }

  if (targetUid === BOOTSTRAP_ADMIN_UID && requestedRole !== "admin") {
    throw new HttpsError("failed-precondition", "Không thể hạ quyền Admin gốc.");
  }

  if (requestedRole === "admin" && !isAdminProfile(caller.profile, caller.uid)) {
    throw new HttpsError("permission-denied", "Chỉ Administrator mới được cấp role Administrator.");
  }

  if (targetIsAdmin && requestedRole !== "admin") {
    const activeAdmins = await countActiveAdmins();
    if (activeAdmins <= 1) {
      throw new HttpsError("failed-precondition", "Không thể hạ quyền Administrator cuối cùng.");
    }
  }

  const authUpdate = {};
  if (data.email !== undefined) {
    const email = cleanString(data.email, 320).toLowerCase();
    if (!email) throw new HttpsError("invalid-argument", "Email không được để trống.");
    authUpdate.email = email;
  }
  if (data.displayName !== undefined || data.name !== undefined) {
    authUpdate.displayName = cleanString(data.name ?? data.displayName, 200) || null;
  }
  if (data.phoneNumber !== undefined) {
    const phone = cleanString(data.phoneNumber, 40);
    authUpdate.phoneNumber = phone || null;
  }
  if (data.password !== undefined) {
    if (typeof data.password !== "string" || data.password.length < 6) {
      throw new HttpsError("invalid-argument", "Mật khẩu phải có ít nhất 6 ký tự.");
    }
    authUpdate.password = data.password;
  }

  let userRecord;
  try {
    userRecord = Object.keys(authUpdate).length
      ? await auth.updateUser(targetUid, authUpdate)
      : await auth.getUser(targetUid);
  } catch (error) {
    throw new HttpsError("invalid-argument", "Không thể cập nhật thông tin Firebase Authentication.");
  }

  const profileUpdate = {
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: caller.uid
  };

  if (data.email !== undefined) profileUpdate.email = userRecord.email || "";
  if (data.displayName !== undefined || data.name !== undefined) profileUpdate.name = userRecord.displayName || "";
  if (data.role !== undefined) profileUpdate.role = requestedRole;
  if (data.permissions !== undefined) {
    profileUpdate.permissions = requestedRole === "admin"
      ? makeAdminPermissions()
      : normalizePermissions(data.permissions, requestedRole);
  } else if (data.role !== undefined) {
    profileUpdate.permissions = requestedRole === "admin"
      ? makeAdminPermissions()
      : normalizePermissions(existingProfile.permissions, requestedRole);
  }
  if (data.phoneNumber !== undefined) profileUpdate.phone = userRecord.phoneNumber || "";

  await db.collection(USERS_COLLECTION).doc(targetUid).update(profileUpdate);
  const freshProfile = await getUserProfile(targetUid);
  return { ok: true, user: buildAuthUserResponse(userRecord, freshProfile) };
});

exports.grovaSetUserStatus = onCall(async (request) => {
  const data = request.data && typeof request.data === "object" ? request.data : {};
  const status = cleanString(data.status, 30);
  const action = status === "disabled" ? "lock" : status === "active" ? "unlock" : "";
  if (!action) {
    throw new HttpsError("invalid-argument", "Trạng thái phải là active hoặc disabled.");
  }

  const caller = await requireCaller(request, "lock");
  const targetUid = assertTargetUid(data.uid);
  await assertNotProtectedAdminTarget(caller, targetUid, action);

  if (targetUid === caller.uid) {
    throw new HttpsError("failed-precondition", "Không thể tự khóa hoặc tự mở khóa tài khoản đang đăng nhập.");
  }

  const targetProfile = await getUserProfile(targetUid);
  if (!targetProfile) {
    throw new HttpsError("not-found", "Không tìm thấy hồ sơ tài khoản.");
  }

  if (targetProfile.role === "admin" && !isAdminProfile(caller.profile, caller.uid)) {
    throw new HttpsError("permission-denied", "Chỉ Administrator mới được khóa hoặc mở khóa Administrator.");
  }

  if (targetProfile.role === "admin" && status === "disabled") {
    const activeAdmins = await countActiveAdmins();
    if (activeAdmins <= 1) {
      throw new HttpsError("failed-precondition", "Không thể khóa Administrator cuối cùng.");
    }
  }

  let userRecord;
  try {
    userRecord = await auth.updateUser(targetUid, { disabled: status === "disabled" });
    await db.collection(USERS_COLLECTION).doc(targetUid).update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: caller.uid
    });
  } catch (error) {
    throw new HttpsError("internal", "Không thể cập nhật trạng thái tài khoản.");
  }

  const freshProfile = await getUserProfile(targetUid);
  return { ok: true, user: buildAuthUserResponse(userRecord, freshProfile) };
});
