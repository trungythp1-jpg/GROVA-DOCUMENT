/**
 * GROVA DOCUMENT — VERSION 228
 * GROVA AI — READ-ONLY, PERMISSION-AWARE BACKEND
 *
 * Security model:
 * - Firebase Auth must authenticate the caller.
 * - The server reads users/{uid} with Firebase Admin SDK.
 * - Client-supplied roles/permissions are never trusted.
 * - Only Firestore collections allowed by the user's view permissions are
 *   included in the AI context.
 * - GROVA AI v1 is read-only: it does not create/edit/delete Firestore data.
 * - OpenAI API key stays server-side in Firebase Secret Manager.
 */

const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

initializeApp();

const db = getFirestore();
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const BOOTSTRAP_ADMIN_UID = "nJmKgjEILgVOEjWKYWTsuonxbO03";
const DEFAULT_MODEL = "gpt-5.6-luna";
const MAX_DOCS_PER_COLLECTION = 120;
const MAX_STRING_LENGTH = 1800;
const MAX_CONTEXT_CHARS = 90000;

const COLLECTION_PERMISSION_MAP = {
  projects: "projects",
  customers: "customers",
  employees: "employees",
  history: "history",
  documents: "documents",
  users: "users"
};

function isAdmin(uid) {
  return uid === BOOTSTRAP_ADMIN_UID;
}

function defaultPermissions(role) {
  const common = {
    projects: { view: false },
    customers: { view: false },
    employees: { view: false },
    documents: { view: false },
    history: { view: false },
    users: { view: false },
    settings: { view: false },
    ai: { view: false }
  };

  if (role === "admin") {
    Object.keys(common).forEach((key) => { common[key].view = true; });
  } else if (role === "manager" || role === "employee") {
    ["projects", "customers", "employees", "documents", "history", "ai"].forEach((key) => {
      common[key].view = true;
    });
  } else if (role === "viewer") {
    ["projects", "customers", "employees", "documents", "history", "ai"].forEach((key) => {
      common[key].view = true;
    });
  }

  return common;
}

function getPermissions(profile, uid) {
  if (isAdmin(uid)) return defaultPermissions("admin");
  const role = String(profile?.role || "employee");
  const permissions = profile?.permissions && typeof profile.permissions === "object"
    ? profile.permissions
    : defaultPermissions(role);
  return permissions;
}

function canView(permissions, group) {
  return Boolean(permissions?.[group]?.view);
}

function sanitizeValue(value, depth = 0) {
  if (depth > 4) return "[nested object omitted]";
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return value.slice(0, MAX_STRING_LENGTH);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizeValue(item, depth + 1));
  if (typeof value === "object") {
    const result = {};
    for (const [key, item] of Object.entries(value).slice(0, 80)) {
      if (/password|token|secret|api.?key/i.test(key)) continue;
      result[key] = sanitizeValue(item, depth + 1);
    }
    return result;
  }
  return String(value).slice(0, MAX_STRING_LENGTH);
}

function extractOutputText(response) {
  if (typeof response?.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const chunks = [];
  for (const item of Array.isArray(response?.output) ? response.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }
  return chunks.join("\n").trim();
}

async function loadAllowedContext(uid, profile, permissions) {
  const context = {
    user: {
      uid,
      name: profile?.name || "",
      email: profile?.email || "",
      role: profile?.role || (isAdmin(uid) ? "admin" : "employee")
    },
    collections: {}
  };

  let chars = JSON.stringify(context).length;

  for (const [collection, group] of Object.entries(COLLECTION_PERMISSION_MAP)) {
    if (!canView(permissions, group)) continue;

    try {
      const snapshot = await db.collection(collection).limit(MAX_DOCS_PER_COLLECTION).get();
      const records = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...sanitizeValue(doc.data())
      }));
      const serialized = JSON.stringify(records);
      if (chars + serialized.length > MAX_CONTEXT_CHARS) {
        context.collections[collection] = {
          truncated: true,
          note: "Dữ liệu bị giới hạn để bảo vệ hiệu năng và chi phí AI.",
          records: records.slice(0, 20)
        };
      } else {
        context.collections[collection] = records;
        chars += serialized.length;
      }
    } catch (error) {
      console.warn(`GROVA AI: cannot read ${collection}.`, error);
      context.collections[collection] = {
        unavailable: true,
        reason: "Không thể đọc collection này ở thời điểm hiện tại."
      };
    }
  }

  return context;
}

function buildSystemPrompt(context) {
  return [
    "Bạn là GROVA AI, trợ lý nội bộ của GROVA DOCUMENT.",
    "Bạn chỉ được trả lời dựa trên dữ liệu GROVA được cung cấp trong context và câu hỏi của người dùng.",
    "Không được suy đoán dữ liệu không có trong context. Nếu thiếu dữ liệu, hãy nói rõ là chưa có dữ liệu.",
    "Không tiết lộ hoặc suy luận quyền truy cập của người dùng khác.",
    "Không tự tạo số liệu. Khi tính toán, hãy tính từ dữ liệu được cung cấp và nói rõ nếu dữ liệu đã bị giới hạn.",
    "Giai đoạn AI v1 là READ-ONLY: không được yêu cầu hoặc thực hiện thao tác sửa, xóa, tạo dữ liệu.",
    "Trả lời bằng tiếng Việt, rõ ràng, ngắn gọn, ưu tiên gạch đầu dòng và số liệu.",
    "Nếu người dùng yêu cầu hành động thay đổi dữ liệu, hãy giải thích rằng GROVA AI v1 chưa thực hiện thao tác đó.",
    "\nDỮ LIỆU GROVA ĐƯỢC PHÉP SỬ DỤNG:\n" + JSON.stringify(context)
  ].join("\n");
}

exports.grovaBackendStatus = onCall((request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Bạn phải đăng nhập để sử dụng GROVA backend.");
  }

  return {
    ok: true,
    service: "GROVA DOCUMENT",
    phase: "5B.1",
    backend: "cloud-functions-2nd-gen",
    callerUid: request.auth.uid,
    isBootstrapAdmin: request.auth.uid === BOOTSTRAP_ADMIN_UID
  };
});

exports.grovaAiAsk = onCall(
  {
    secrets: [OPENAI_API_KEY],
    timeoutSeconds: 120,
    memory: "512MiB"
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Bạn phải đăng nhập để sử dụng GROVA AI.");
    }

    const uid = String(request.auth.uid);
    const question = String(request.data?.question || "").trim();

    if (!question) {
      throw new HttpsError("invalid-argument", "Câu hỏi không được để trống.");
    }
    if (question.length > 5000) {
      throw new HttpsError("invalid-argument", "Câu hỏi quá dài.");
    }

    let profile = null;
    try {
      const profileSnapshot = await db.collection("users").doc(uid).get();
      profile = profileSnapshot.exists ? profileSnapshot.data() : null;
    } catch (error) {
      console.error("GROVA AI: user profile read failed.", error);
      throw new HttpsError("internal", "Không thể xác thực hồ sơ quyền của tài khoản.");
    }

    const status = profile?.status || (isAdmin(uid) ? "active" : "disabled");
    if (status !== "active") {
      throw new HttpsError("permission-denied", "Tài khoản chưa được phép sử dụng GROVA AI.");
    }

    const permissions = getPermissions(profile, uid);
    if (!isAdmin(uid) && !canView(permissions, "ai")) {
      throw new HttpsError("permission-denied", "Tài khoản chưa được cấp quyền sử dụng GROVA AI.");
    }

    const apiKey = OPENAI_API_KEY.value();
    if (!apiKey) {
      throw new HttpsError("failed-precondition", "OPENAI_API_KEY chưa được cấu hình trên Firebase.");
    }

    const context = await loadAllowedContext(uid, profile, permissions);
    const model = process.env.GROVA_AI_MODEL || DEFAULT_MODEL;

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: buildSystemPrompt(context) }]
          },
          {
            role: "user",
            content: [{ type: "input_text", text: question }]
          }
        ],
        max_output_tokens: 1200
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("GROVA AI: OpenAI request failed.", openaiResponse.status, errorText.slice(0, 2000));
      if (openaiResponse.status === 429) {
        throw new HttpsError("resource-exhausted", "OpenAI đang giới hạn yêu cầu hoặc tài khoản API chưa đủ hạn mức.");
      }
      throw new HttpsError("internal", "OpenAI không trả lời được yêu cầu GROVA AI.");
    }

    const response = await openaiResponse.json();
    const answer = extractOutputText(response);
    if (!answer) {
      throw new HttpsError("internal", "GROVA AI không trả về nội dung.");
    }

    return {
      ok: true,
      model,
      answer,
      readOnly: true,
      permissionsApplied: true
    };
  }
);
