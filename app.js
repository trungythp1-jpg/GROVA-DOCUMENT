/* =========================================================
   GROVA DOCUMENT
   Main Application
   Version: 2.0
   ========================================================= */

(() => {
  "use strict";

  /* =========================================================
     STATE
     ========================================================= */

  const state = {
    initialized: false,
    currentPage: "dashboard",
    currentTemplate: null,
    selectedTemplateId: null,
    templates: [],
    data: null,
    currentUser: {
      name: "Người dùng GROVA",
      role: "Nhân viên",
      initials: "NG"
    }
  };


  /* =========================================================
     HELPERS
     ========================================================= */

  const $ = (selector, root = document) => {
    return root.querySelector(selector);
  };

  const $$ = (selector, root = document) => {
    return Array.from(root.querySelectorAll(selector));
  };

  const escapeHTML = (value) => {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const getAppData = () => {
    return (
      window.GROVA_DATA ||
      window.grovaData ||
      window.GROVA ||
      {}
    );
  };


  /* =========================================================
     TEMPLATE DATA
     ========================================================= */

  function normalizeTemplate(template) {
    if (!template) return null;

    return {
      id: String(template.id ?? ""),
      code: template.code || "",
      name: template.name || template.title || "Mẫu văn bản",
      title: template.title || template.name || "Mẫu văn bản",
      description: template.description || "",
      category: template.category || "Khác",
      icon: template.icon || "📄",
      file: template.file || "",
      enabled: template.enabled !== false
    };
  }


  function getTemplates() {
    const data = getAppData();

    if (!data || !Array.isArray(data.templates)) {
      return [];
    }

    return data.templates
      .map(normalizeTemplate)
      .filter(Boolean)
      .filter(template => template.enabled);
  }


  /*
   * Nếu trình duyệt đang giữ data.js cũ trong cache,
   * tự tải lại data.js với query mới.
   */
  function ensureFreshData(callback) {

    const currentTemplates = getTemplates();

    if (currentTemplates.length > 0) {
      callback();
      return;
    }

    const script = document.createElement("script");

    script.src = "./data/data.js?v=" + Date.now();

    script.onload = () => {
      callback();
    };

    script.onerror = () => {
      callback();
    };

    document.head.appendChild(script);
  }


  /* =========================================================
     USER
     ========================================================= */

  function renderCurrentUser() {

    const data = getAppData();

    const user = data.currentUser || state.currentUser;

    state.currentUser = {
      name: user.name || "Người dùng GROVA",
      role: user.role || "Nhân viên",
      initials:
        user.initials ||
        getInitials(user.name || "Người dùng GROVA")
    };

    const nameElements = $$(
      "[data-user-name], #currentUserName, .current-user-name"
    );

    nameElements.forEach(element => {
      element.textContent = state.currentUser.name;
    });

    const roleElements = $$(
      "[data-user-role], #currentUserRole, .current-user-role"
    );

    roleElements.forEach(element => {
      element.textContent = state.currentUser.role;
    });

    const initialsElements = $$(
      "[data-user-initials], #currentUserInitials, .user-avatar"
    );

    initialsElements.forEach(element => {

      /*
       * Không ghi đè nếu element là ảnh/logo.
       */
      if (
        element.tagName !== "IMG" &&
        element.classList.contains("user-avatar")
      ) {
        element.textContent = state.currentUser.initials;
      }
    });
  }


  function getInitials(name) {

    const words = String(name)
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!words.length) return "NG";

    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }

    return (
      words[0].charAt(0) +
      words[words.length - 1].charAt(0)
    ).toUpperCase();
  }


  /* =========================================================
     STATISTICS
     ========================================================= */

  function renderStats() {

    const data = getAppData();

    const stats = {
      documents: Number(data.stats?.documents || 0),
      projects: Number(data.stats?.projects || 0),
      customers: Number(data.stats?.customers || 0),
      employees: Number(data.stats?.employees || 0)
    };

    const mapping = {
      documents: [
        "#statDocuments",
        "[data-stat='documents']"
      ],
      projects: [
        "#statProjects",
        "[data-stat='projects']"
      ],
      customers: [
        "#statCustomers",
        "[data-stat='customers']"
      ],
      employees: [
        "#statEmployees",
        "[data-stat='employees']"
      ]
    };

    Object.keys(mapping).forEach(key => {

      mapping[key].forEach(selector => {

        $$(selector).forEach(element => {
          element.textContent = stats[key];
        });

      });

    });
  }


  /* =========================================================
     DOCUMENT CARDS
     ========================================================= */

  function renderDocumentCards() {

    state.templates = getTemplates();

    const containers = [
      $("#documentGrid"),
      $("#documentsPageGrid")
    ].filter(Boolean);

    if (!containers.length) return;

    containers.forEach(container => {

      if (!state.templates.length) {

        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📄</div>

            <h3>Chưa có mẫu văn bản</h3>

            <p>
              Các mẫu văn bản sẽ được khai báo trong data/data.js
            </p>
          </div>
        `;

        return;
      }

      container.innerHTML = state.templates
        .map(template => createDocumentCard(template))
        .join("");

    });
  }


  function createDocumentCard(template) {

    return `
      <article
        class="document-card"
        data-template-id="${escapeHTML(template.id)}"
      >

        <div class="document-card-top">

          <div class="document-icon">
            ${escapeHTML(template.icon)}
          </div>

          <span class="document-code">
            ${escapeHTML(template.code)}
          </span>

        </div>

        <div class="document-card-content">

          <h3>
            ${escapeHTML(template.name)}
          </h3>

          <p>
            ${escapeHTML(template.description)}
          </p>

        </div>

        <div class="document-card-bottom">

          <span class="document-category">
            ${escapeHTML(template.category)}
          </span>

          <button
            type="button"
            class="create-document-button"
            data-create-template="${escapeHTML(template.id)}"
          >
            Tạo văn bản
          </button>

        </div>

      </article>
    `;
  }


  /* =========================================================
     RECENT DOCUMENTS
     ========================================================= */

  function renderRecentDocuments() {

    const data = getAppData();

    const recent = Array.isArray(data.recentDocuments)
      ? data.recentDocuments
      : [];

    const containers = [
      $("#recentDocuments"),
      $("#recentDocumentsList"),
      $("#activityList")
    ].filter(Boolean);

    containers.forEach(container => {

      if (!recent.length) {

        container.innerHTML = `
          <div class="empty-state compact">
            <div class="empty-state-icon">📂</div>

            <h3>Chưa có văn bản gần đây</h3>

            <p>
              Văn bản sau khi được tạo sẽ xuất hiện tại đây.
            </p>
          </div>
        `;

        return;
      }

      container.innerHTML = recent
        .map(item => {

          return `
            <div class="recent-document-item">

              <div class="recent-document-icon">
                📄
              </div>

              <div class="recent-document-info">

                <strong>
                  ${escapeHTML(item.name || "Văn bản")}
                </strong>

                <span>
                  ${escapeHTML(item.date || "")}
                </span>

              </div>

            </div>
          `;

        })
        .join("");
    });
  }


  /* =========================================================
     DOCUMENT SELECTOR MODAL
     ========================================================= */

  function renderTemplateSelector() {

    const container = $("#templateSelector");

    if (!container) return;

    if (!state.templates.length) {

      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📄</div>
          <h3>Chưa có mẫu văn bản</h3>
        </div>
      `;

      return;
    }

    container.innerHTML = state.templates
      .map(template => {

        const selected =
          state.selectedTemplateId === template.id
            ? "selected"
            : "";

        return `
          <button
            type="button"
            class="template-option ${selected}"
            data-template-select="${escapeHTML(template.id)}"
          >

            <strong>
              ${escapeHTML(template.name)}
            </strong>

            <span>
              ${escapeHTML(template.description)}
            </span>

          </button>
        `;

      })
      .join("");

    /*
     * Nút mở mẫu
     */
    const modalBody =
      container.closest(".modal-content") ||
      container.parentElement;

    if (
      modalBody &&
      !$(".template-open-button", modalBody)
    ) {

      const footer = document.createElement("div");

      footer.className = "template-modal-footer";

      footer.innerHTML = `
        <button
          type="button"
          class="secondary-button"
          data-close-modal
        >
          Hủy
        </button>

        <button
          type="button"
          class="primary-button template-open-button"
        >
          Mở mẫu
        </button>
      `;

      modalBody.appendChild(footer);
    }
  }


  function openDocumentModal(templateId = null) {

    state.selectedTemplateId =
      templateId ||
      state.templates[0]?.id ||
      null;

    renderTemplateSelector();

    const modal =
      $("#documentModal") ||
      $("#templateModal") ||
      $(".modal-overlay");

    if (!modal) return;

    modal.classList.add("active");
    modal.classList.remove("hidden");

    document.body.classList.add("modal-open");

    renderTemplateSelector();
  }


  function closeDocumentModal() {

    const modals = [
      $("#documentModal"),
      $("#templateModal"),
      $(".modal-overlay")
    ].filter(Boolean);

    modals.forEach(modal => {

      modal.classList.remove("active");
      modal.classList.add("hidden");

    });

    document.body.classList.remove("modal-open");
  }


  /* =========================================================
     OPEN TEMPLATE
     ========================================================= */

  function startSelectedDocument() {

    const template = state.templates.find(
      item => item.id === state.selectedTemplateId
    );

    if (!template) {
      alert("Vui lòng chọn mẫu văn bản.");
      return;
    }

    if (!template.file) {
      alert("Mẫu văn bản chưa được khai báo đường dẫn.");
      return;
    }

    closeDocumentModal();

    state.currentTemplate = template;

    /*
     * Mở template HTML.
     */
    window.location.href = template.file;
  }


  /* =========================================================
     NAVIGATION
     ========================================================= */

  function switchPage(pageName) {

    if (!pageName) return;

    const pages = $$(
      ".page, [data-page-container]"
    );

    if (!pages.length) return;

    state.currentPage = pageName;

    pages.forEach(page => {

      const pageId =
        page.dataset.pageContainer ||
        page.id ||
        "";

      const normalized =
        pageId
          .replace(/Page$/i, "")
          .toLowerCase();

      const target =
        pageName.toLowerCase();

      const active =
        normalized === target ||
        pageId.toLowerCase() === `${target}page`;

      page.classList.toggle("active", active);
      page.classList.toggle("hidden", !active);
    });


    /*
     * Navigation active state
     */
    $$(
      ".menu-item, .nav-item, [data-page]"
    ).forEach(item => {

      const target = item.dataset.page;

      if (!target) return;

      item.classList.toggle(
        "active",
        target === pageName
      );
    });


    /*
     * Trang văn bản
     */
    if (pageName === "documents") {
      renderDocumentsPage();
    }


    /*
     * Trang dashboard
     */
    if (pageName === "dashboard") {
      renderDocumentCards();
      renderRecentDocuments();
      renderStats();
    }


    /*
     * Đóng menu mobile
     */
    document.body.classList.remove("menu-open");
  }


  /*
   * Quan trọng:
   * Hàm này trước đây bị thiếu trong app.js cũ.
   */
  function renderDocumentsPage() {
    renderDocumentCards();
  }


  function bindNavigation() {

    /*
     * HTML hiện tại dùng .menu-item,
     * code cũ lại chỉ tìm .nav-item.
     *
     * Vì vậy dùng [data-page] làm chuẩn.
     */
    $$(
      ".menu-item[data-page], " +
      ".nav-item[data-page], " +
      "[data-page]"
    ).forEach(item => {

      if (item.dataset.navigationBound === "1") {
        return;
      }

      item.dataset.navigationBound = "1";

      item.addEventListener("click", event => {

        event.preventDefault();

        const pageName =
          item.dataset.page;

        if (pageName) {
          switchPage(pageName);
        }

      });

    });
  }


  /* =========================================================
     NEW DOCUMENT BUTTONS
     ========================================================= */

  function bindNewDocumentButtons() {

    document.addEventListener("click", event => {

      const button =
        event.target.closest(
          "[data-create-template]"
        );

      if (!button) return;

      event.preventDefault();

      const templateId =
        button.dataset.createTemplate;

      openDocumentModal(templateId);
    });
  }


  /* =========================================================
     MODAL EVENTS
     ========================================================= */

  function bindModal() {

    document.addEventListener("click", event => {

      /*
       * Chọn template
       */
      const option =
        event.target.closest(
          "[data-template-select]"
        );

      if (option) {

        event.preventDefault();

        state.selectedTemplateId =
          option.dataset.templateSelect;

        $$(".template-option").forEach(item => {
          item.classList.toggle(
            "selected",
            item.dataset.templateSelect ===
            state.selectedTemplateId
          );
        });

        return;
      }


      /*
       * Mở mẫu
       */
      const openButton =
        event.target.closest(
          ".template-open-button"
        );

      if (openButton) {

        event.preventDefault();

        startSelectedDocument();

        return;
      }


      /*
       * Đóng modal
       */
      const closeButton =
        event.target.closest(
          "[data-close-modal], " +
          ".modal-close, " +
          ".close-modal"
        );

      if (closeButton) {

        event.preventDefault();

        closeDocumentModal();

        return;
      }


      /*
       * Click nền modal
       */
      if (
        event.target.classList.contains(
          "modal-overlay"
        )
      ) {
        closeDocumentModal();
      }

    });


    /*
     * ESC
     */
    document.addEventListener(
      "keydown",
      event => {

        if (event.key === "Escape") {
          closeDocumentModal();
        }

      }
    );
  }


  /* =========================================================
     TEMPLATE LINKS
     ========================================================= */

  function bindTemplateLinks() {

    document.addEventListener("click", event => {

      const card =
        event.target.closest(
          ".document-card"
        );

      if (!card) return;

      /*
       * Nếu click vào nút Tạo văn bản,
       * handler phía trên sẽ xử lý.
       */
      if (
        event.target.closest(
          "[data-create-template]"
        )
      ) {
        return;
      }

      const templateId =
        card.dataset.templateId;

      if (templateId) {
        openDocumentModal(templateId);
      }
    });
  }


  /* =========================================================
     MOBILE MENU
     ========================================================= */

  function bindMobileMenu() {

    const menuButtons = $$(
      ".menu-toggle, " +
      ".mobile-menu-button, " +
      "[data-menu-toggle]"
    );

    menuButtons.forEach(button => {

      button.addEventListener(
        "click",
        event => {

          event.preventDefault();

          document.body.classList.toggle(
            "menu-open"
          );

        }
      );
    });
  }


  /* =========================================================
     KEYBOARD
     ========================================================= */

  function bindKeyboard() {

    document.addEventListener(
      "keydown",
      event => {

        /*
         * Ctrl/Cmd + K:
         * mở danh sách tạo văn bản.
         */
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "k"
        ) {

          event.preventDefault();

          openDocumentModal();
        }

      }
    );
  }


  /* =========================================================
     LOCAL DATA
     ========================================================= */

  function loadLocalData() {

    try {

      const saved =
        localStorage.getItem(
          "grova_document_data"
        );

      if (!saved) return;

      const localData =
        JSON.parse(saved);

      if (!localData) return;

      /*
       * Không ghi đè data.js.
       * Chỉ bổ sung dữ liệu động.
       */
      window.GROVA_LOCAL_DATA =
        localData;

    } catch (error) {

      console.warn(
        "Không thể đọc dữ liệu local:",
        error
      );
    }
  }


  /* =========================================================
     SAVE LOCAL DATA
     ========================================================= */

  function saveLocalData(data) {

    try {

      localStorage.setItem(
        "grova_document_data",
        JSON.stringify(data)
      );

    } catch (error) {

      console.warn(
        "Không thể lưu dữ liệu local:",
        error
      );
    }
  }


  /* =========================================================
     GENERIC TABLE / PAGE SUPPORT
     ========================================================= */

  function renderSimpleEmptyState(
    selector,
    title,
    description,
    icon = "📄"
  ) {

    const container = $(selector);

    if (!container) return;

    container.innerHTML = `
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


  function renderGenericPages() {

    /*
     * Các module này sẽ được phát triển
     * sau khi hệ thống mẫu văn bản ổn định.
     *
     * Không tự tạo dữ liệu giả.
     */

    renderSimpleEmptyState(
      "#projectsList",
      "Chưa có công trình",
      "Công trình sẽ xuất hiện sau khi được tạo.",
      "🏗️"
    );

    renderSimpleEmptyState(
      "#customersList",
      "Chưa có khách hàng",
      "Khách hàng sẽ xuất hiện sau khi được khai báo.",
      "🏢"
    );

    renderSimpleEmptyState(
      "#employeesList",
      "Chưa có nhân sự",
      "Nhân sự sẽ xuất hiện sau khi được khai báo.",
      "👤"
    );

  }


  /* =========================================================
     PRINT / PDF
     ========================================================= */

  function bindPrintButtons() {

    document.addEventListener(
      "click",
      event => {

        const button =
          event.target.closest(
            "[data-print], " +
            ".print-button, " +
            ".pdf-button"
          );

        if (!button) return;

        event.preventDefault();

        window.print();
      }
    );
  }


  /* =========================================================
     BACK BUTTON
     ========================================================= */

  function bindBackButtons() {

    document.addEventListener(
      "click",
      event => {

        const button =
          event.target.closest(
            "[data-back], " +
            ".back-button"
          );

        if (!button) return;

        event.preventDefault();

        if (document.referrer) {
          history.back();
        } else {
          window.location.href =
            "./index.html";
        }

      }
    );
  }


  /* =========================================================
     INITIALIZE
     ========================================================= */

  function initialize() {

    if (state.initialized) {
      return;
    }

    /*
     * Đảm bảo data.js mới nhất được tải.
     */
    ensureFreshData(() => {

      state.data = getAppData();

      state.templates = getTemplates();

      loadLocalData();

      renderCurrentUser();

      renderStats();

      renderDocumentCards();

      renderRecentDocuments();

      renderGenericPages();

      bindNavigation();

      bindNewDocumentButtons();

      bindModal();

      bindMobileMenu();

      bindKeyboard();

      bindTemplateLinks();

      bindPrintButtons();

      bindBackButtons();

      state.initialized = true;

      /*
       * Dashboard mặc định.
       */
      switchPage("dashboard");

      console.log(
        "GROVA DOCUMENT initialized:",
        {
          templates: state.templates.length,
          data: state.data
        }
      );

    });
  }


  /* =========================================================
     PUBLIC API
     ========================================================= */

  window.GROVA_DOCUMENT = {

    getData: getAppData,

    getTemplates,

    openDocumentModal,

    closeDocumentModal,

    startSelectedDocument,

    switchPage,

    renderDocumentCards,

    renderDocumentsPage,

    saveLocalData

  };


  /* =========================================================
     START
     ========================================================= */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      { once: true }
    );

  } else {

    initialize();

  }

})();