/* =========================================================
   GROVA DOCUMENT
   DOCUMENT PERMISSION GUARD — VERSION 237
   Shared permission layer for /templates/*.html

   Actions:
   view / create / edit / delete / export

   The guard reads users/{uid}.permissions.documents.templates
   and falls back to group-level documents permissions when an
   individual template/action is not explicitly defined.
========================================================= */
(function () {
  "use strict";

  var ADMIN_UID = "nJmKgjEILgVOEjWKYWTsuonxbO03";
  var TEMPLATE_ACTIONS = ["view", "create", "edit", "delete", "export"];

  var state = {
    ready: false,
    denied: false,
    templateId: "",
    mode: "view",
    user: null,
    profile: null,
    permissions: {
      view: false,
      create: false,
      edit: false,
      delete: false,
      export: false
    }
  };

  var readyResolve;
  var readyPromise = new Promise(function (resolve) {
    readyResolve = resolve;
  });

  function detectTemplateId() {
    var path = String(window.location.pathname || "");
    var match = path.match(/\/([0-9]{2})-[^/]+\.html$/i);
    return match ? match[1] : "";
  }

  function detectMode() {
    try {
      var params = new URLSearchParams(window.location.search || "");
      var mode = String(params.get("mode") || "view").trim().toLowerCase();
      return mode === "create" ? "create" : "view";
    } catch (error) {
      return "view";
    }
  }

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value || {}));
    } catch (error) {
      return {};
    }
  }

  var FIREBASE_CONFIG = {
    apiKey: "AIzaSyBcqgrkL64utUMwyZz9wmb_cM0gA5Hy8II",
    authDomain: "grova-document.firebaseapp.com",
    projectId: "grova-document",
    storageBucket: "grova-document.firebasestorage.app",
    messagingSenderId: "220105094085",
    appId: "1:220105094085:web:5a7263b0653333baed51ac",
    measurementId: "G-TNVNP286G4"
  };

  function ensureFirebase() {
    if (!window.firebase) return null;
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }
      return firebase.app();
    } catch (error) {
      console.error("GROVA DOCUMENT: Firebase initialization failed.", error);
      return null;
    }
  }

  function getAuth() {
    if (window.GROVA_AUTH && window.GROVA_AUTH.auth) return window.GROVA_AUTH.auth;
    var app = ensureFirebase();
    if (app && typeof app.auth === "function") {
      try { return app.auth(); } catch (error) { console.warn("GROVA DOCUMENT: Firebase Auth unavailable.", error); }
    }
    return null;
  }

  function getDb() {
    var app = ensureFirebase();
    if (app && typeof app.firestore === "function") {
      try { return app.firestore(); } catch (error) { console.warn("GROVA DOCUMENT: Firestore unavailable.", error); }
    }
    return null;
  }

  function showOverlay(title, message, denied) {
    if (document.documentElement) {
      document.documentElement.classList.remove("grova-permission-loading");
    }

    var existing = document.getElementById("grovaDocumentPermissionOverlay");
    if (existing) existing.remove();

    var overlay = document.createElement("div");
    overlay.id = "grovaDocumentPermissionOverlay";
    overlay.setAttribute("role", "alert");
    overlay.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:2147483647",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "padding:24px",
      "background:#eef3f1"
    ].join(";");

    var card = document.createElement("div");
    card.style.cssText = [
      "width:min(520px,100%)",
      "background:#fff",
      "border:1px solid #dce5e1",
      "border-radius:18px",
      "box-shadow:0 12px 40px rgba(20,38,31,.14)",
      "padding:28px",
      "font-family:Arial,Helvetica,sans-serif",
      "text-align:center"
    ].join(";");

    var h = document.createElement("h1");
    h.textContent = title;
    h.style.cssText = "margin:0 0 10px;color:#15382c;font-size:22px;";

    var p = document.createElement("p");
    p.textContent = message;
    p.style.cssText = "margin:0;color:#5d6a64;font-size:14px;line-height:1.6;";

    card.appendChild(h);
    card.appendChild(p);

    if (denied) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = "← Quay lại GROVA DOCUMENT";
      b.style.cssText = "margin-top:18px;border:0;border-radius:10px;padding:11px 16px;background:#0b7a5a;color:#fff;font-weight:700;cursor:pointer;";
      b.addEventListener("click", function () {
        if (document.referrer && document.referrer.indexOf(window.location.origin) === 0) {
          window.history.back();
        } else {
          window.location.href = "../index.html";
        }
      });
      card.appendChild(b);
    }

    overlay.appendChild(card);
    (document.body || document.documentElement).appendChild(overlay);
  }

  function addLoadingStyle() {
    if (document.documentElement) {
      document.documentElement.classList.add("grova-permission-loading");
    }

    if (!document.getElementById("grovaDocumentPermissionStyle")) {
      var style = document.createElement("style");
      style.id = "grovaDocumentPermissionStyle";
      style.textContent = "html.grova-permission-loading body{visibility:hidden!important;} body.grova-document-readonly .form-body input,body.grova-document-readonly .form-body textarea,body.grova-document-readonly .form-body select{background:#f6f8f7!important;color:#66726c!important;}";
      (document.head || document.documentElement).appendChild(style);
    }
  }

  function getGroupPermission(profile, action) {
    return Boolean(profile && profile.permissions && profile.permissions.documents && profile.permissions.documents[action] === true);
  }

  function getTemplatePermission(profile, templateId, action) {
    if (!profile || !action) return false;
    if (String(profile.uid || "") === ADMIN_UID || profile.role === "admin") return true;

    var templates = profile.permissions && profile.permissions.documents && profile.permissions.documents.templates;
    var entry = templates && typeof templates === "object" ? templates[String(templateId)] : null;

    if (entry && Object.prototype.hasOwnProperty.call(entry, action)) {
      return Boolean(entry[action]);
    }

    return getGroupPermission(profile, action);
  }

  function applyActionUI() {
    if (state.denied || !state.ready) return;

    var canEdit = state.mode === "create"
      ? state.permissions.create
      : state.permissions.edit;
    var canDelete = state.permissions.delete;
    var canExport = state.permissions.export;

    document.body.classList.toggle("grova-document-readonly", !canEdit);

    document.querySelectorAll(".form-body input, .form-body textarea, .form-body select").forEach(function (element) {
      element.disabled = !canEdit;
    });

    document.querySelectorAll("button, input[type='button'], input[type='submit']").forEach(function (button) {
      var onclick = String(button.getAttribute("onclick") || "").toLowerCase();
      var text = String(button.textContent || button.value || "").trim().toLowerCase();

      var isSave = onclick.indexOf("savedraft") >= 0 || text.indexOf("lưu nháp") >= 0;
      var isDelete = onclick.indexOf("cleardraft") >= 0 || onclick.indexOf("resetdraft") >= 0 || text.indexOf("xóa") >= 0 || text.indexOf("xoá") >= 0 || text.indexOf("làm mới") >= 0;
      var isExport = onclick.indexOf("window.print") >= 0 || onclick.indexOf("printdocument") >= 0 || text.indexOf("in /") >= 0 || text.indexOf("in văn bản") >= 0 || text.indexOf("in phiếu") >= 0 || text.indexOf("in hợp đồng") >= 0 || text.indexOf("xuất pdf") >= 0;

      if (isSave) {
        button.disabled = !canEdit;
        button.style.display = canEdit ? "" : "none";
      }

      if (isDelete) {
        button.disabled = !canDelete;
        button.style.display = canDelete ? "" : "none";
      }

      if (isExport) {
        button.disabled = !canExport;
        button.style.display = canExport ? "" : "none";
      }
    });

    if (!canEdit) {
      var actions = document.querySelector(".actions");
      if (actions && !actions.querySelector(".grova-readonly-note")) {
        var note = document.createElement("div");
        note.className = "grova-readonly-note";
        note.textContent = state.mode === "create"
          ? "🔒 Tài khoản này không được Tạo mẫu văn bản."
          : "🔒 Chế độ chỉ xem — tài khoản này không được Sửa mẫu văn bản.";
        note.style.cssText = "margin-top:12px;padding:10px 12px;border-radius:9px;background:#f6f8f7;color:#66726c;font-size:11px;line-height:1.5;";
        actions.parentNode.insertBefore(note, actions.nextSibling);
      }
    }

    if (document.documentElement) {
      document.documentElement.classList.remove("grova-permission-loading");
    }
  }

  function blockUnauthorizedActions() {
    document.addEventListener("click", function (event) {
      if (!state.ready || state.denied) return;

      var target = event.target && event.target.closest
        ? event.target.closest("button, a, input[type='button'], input[type='submit']")
        : null;

      if (!target) return;

      var onclick = String(target.getAttribute("onclick") || "").toLowerCase();
      var text = String(target.textContent || target.value || "").trim().toLowerCase();

      var isSave = onclick.indexOf("savedraft") >= 0 || text.indexOf("lưu nháp") >= 0;
      var isDelete = onclick.indexOf("cleardraft") >= 0 || onclick.indexOf("resetdraft") >= 0 || text.indexOf("xóa") >= 0 || text.indexOf("xoá") >= 0 || text.indexOf("làm mới") >= 0;
      var isExport = onclick.indexOf("window.print") >= 0 || onclick.indexOf("printdocument") >= 0 || text.indexOf("in /") >= 0 || text.indexOf("in văn bản") >= 0 || text.indexOf("in phiếu") >= 0 || text.indexOf("in hợp đồng") >= 0 || text.indexOf("xuất pdf") >= 0;

      if ((isSave && !(state.permissions.create || state.permissions.edit)) ||
          (isDelete && !state.permissions.delete) ||
          (isExport && !state.permissions.export)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }, true);
  }

  async function loadPermission() {
    state.templateId = detectTemplateId();
    state.mode = detectMode();

    if (!state.templateId) {
      state.denied = true;
      state.ready = true;
      showOverlay("Không xác định được mẫu văn bản", "Đường dẫn mẫu văn bản không hợp lệ.", true);
      readyResolve(false);
      return false;
    }

    var auth = getAuth();
    var db = getDb();

    if (!auth || !db) {
      state.denied = true;
      state.ready = true;
      showOverlay("Không thể kiểm tra quyền", "Không thể kết nối Firebase Authentication/Firestore.", true);
      readyResolve(false);
      return false;
    }

    var user = null;

    try {
      user = await new Promise(function (resolve) {
        var settled = false;
        var unsubscribe = null;

        function finish(value) {
          if (settled) return;
          settled = true;
          if (typeof unsubscribe === "function") unsubscribe();
          resolve(value || null);
        }

        try {
          unsubscribe = auth.onAuthStateChanged(function (currentUser) {
            finish(currentUser);
          }, function (error) {
            console.error("GROVA DOCUMENT: Auth state error.", error);
            finish(null);
          });
        } catch (error) {
          console.error("GROVA DOCUMENT: Auth listener failed.", error);
          finish(null);
        }

        if (auth.currentUser) finish(auth.currentUser);
      });
    } catch (error) {
      console.error("GROVA DOCUMENT: Auth readiness failed.", error);
      user = null;
    }

    if (!user) {
      state.denied = true;
      state.ready = true;
      if (document.documentElement) {
        document.documentElement.classList.remove("grova-permission-loading");
      }
      showOverlay("Chưa đăng nhập", "Bạn cần đăng nhập GROVA DOCUMENT trước khi mở mẫu văn bản.", true);
      readyResolve(false);
      return false;
    }

    state.user = user;

    try {
      var snapshot = await db.collection("users").doc(String(user.uid)).get();
      var profile = snapshot.exists ? (snapshot.data() || {}) : null;

      if (!profile || profile.status !== "active") {
        state.denied = true;
        state.ready = true;
        showOverlay("Tài khoản chưa được cấp quyền", "Tài khoản này chưa có hồ sơ GROVA DOCUMENT đang hoạt động.", true);
        readyResolve(false);
        return false;
      }

      profile.uid = profile.uid || user.uid;
      profile.permissions = clone(profile.permissions);
      state.profile = profile;

      TEMPLATE_ACTIONS.forEach(function (action) {
        state.permissions[action] = getTemplatePermission(profile, state.templateId, action);
      });

      if (!state.permissions.view) {
        state.denied = true;
        state.ready = true;
        showOverlay("Không có quyền xem", "Tài khoản của bạn không được cấp quyền Xem mẫu văn bản này.", true);
        readyResolve(false);
        return false;
      }

      if (state.mode === "create" && !state.permissions.create) {
        state.denied = true;
        state.ready = true;
        showOverlay("Không có quyền tạo", "Tài khoản của bạn không được cấp quyền Tạo mẫu văn bản này.", true);
        readyResolve(false);
        return false;
      }

      state.ready = true;
      readyResolve(true);

      if (document.readyState !== "loading") {
        applyActionUI();
      } else {
        document.addEventListener("DOMContentLoaded", applyActionUI, { once: true });
      }

      return true;
    } catch (error) {
      console.error("GROVA DOCUMENT: Permission check failed.", error);
      state.denied = true;
      state.ready = true;
      showOverlay("Không thể kiểm tra quyền", "Không thể đọc hồ sơ quyền của tài khoản. Vui lòng thử lại.", true);
      readyResolve(false);
      return false;
    }
  }

  addLoadingStyle();
  blockUnauthorizedActions();

  window.GROVA_DOCUMENT_PERMISSION = {
    ready: readyPromise,
    templateId: function () { return state.templateId; },
    can: function (action) { return state.ready && !state.denied && state.permissions[action] === true; },
    isReadOnly: function () {
      return state.ready && !state.denied && (state.mode === "create" ? !state.permissions.create : !state.permissions.edit);
    },
    run: function (callback) {
      return readyPromise.then(function (allowed) {
        if (!allowed) return false;
        return typeof callback === "function" ? callback() : true;
      });
    },
    runAction: function (action, callback) {
      return readyPromise.then(function (allowed) {
        if (!allowed || state.permissions[action] !== true) return false;
        return typeof callback === "function" ? callback() : true;
      });
    },
    getState: function () {
      return {
        templateId: state.templateId,
        mode: state.mode,
        permissions: clone(state.permissions),
        user: state.user ? { uid: state.user.uid, email: state.user.email || "" } : null,
        profile: clone(state.profile)
      };
    }
  };

  loadPermission();
})();
