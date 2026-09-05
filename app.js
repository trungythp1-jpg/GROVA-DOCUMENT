/* =========================================================
   GROVA DOCUMENT
   app.js
   Version: 1.1
   ========================================================= */

(function () {
  "use strict";

  /* =======================================================
     1. STATE
     ======================================================= */

  const state = {
    currentPage: "dashboard",
    selectedTemplate: null,
    initialized: false
  };


  /* =======================================================
     2. HELPERS
     ======================================================= */

  const $ = (selector, parent = document) => {
    return parent.querySelector(selector);
  };

  const $$ = (selector, parent = document) => {
    return Array.from(parent.querySelectorAll(selector));
  };

  function escapeHTML(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getAppData() {
    return (
      window.GROVA_DATA ||
      window.grovaData ||
      window.GROVA ||
      {}
    );
  }

  function getTemplates() {
    const data = getAppData();

    if (!Array.isArray(data.templates)) {
      return [];
    }

    return data.templates
      .filter(template => template && template.enabled !== false)
      .map((template, index) => {
        return {
          id:
            template.id ||
            template.code ||
            String(index + 1),

          code:
            template.code ||
            template.id ||
            String(index + 1),

          name:
            template.name ||
            template.title ||
            "Biểu mẫu",

          title:
            template.title ||
            template.name ||
            "Biểu mẫu",

          description:
            template.description ||
            template.desc ||
            "",

          category:
            template.category ||
            template.type ||
            "Văn bản",

          file:
            template.file ||
            template.path ||
            template.url ||
            "",

          enabled:
            template.enabled !== false
        };
      });
  }

  function getTemplateById(id) {
    return getTemplates().find(
      template => String(template.id) === String(id)
    );
  }

  function getCompany() {
    const data = getAppData();

    return (
      data.company ||
      data.organization ||
      {}
    );
  }

  function getCompanyName() {
    const company = getCompany();

    return (
      company.name ||
      company.companyName ||
      "CÔNG TY CỔ PHẦN GROVA HOLDINGS"
    );
  }

  function getInitials(name) {
    const text = String(name || "").trim();

    if (!text) {
      return "G";
    }

    const parts = text
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }

    return (
      parts[0].charAt(0) +
      parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }


  /* =======================================================
     3. PAGE CONFIG
     ======================================================= */

  const PAGE_CONFIG = {
    dashboard: {
      title: "Tổng quan",
      subtitle: "Quản lý hồ sơ và biểu mẫu GROVA"
    },

    documents: {
      title: "Biểu mẫu",
      subtitle: "Danh sách biểu mẫu văn bản"
    },

    projects: {
      title: "Công trình",
      subtitle: "Quản lý thông tin công trình"
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
      title: "Lịch sử",
      subtitle: "Lịch sử tạo và xử lý văn bản"
    },

    reports: {
      title: "Báo cáo",
      subtitle: "Tổng hợp dữ liệu hệ thống"
    },

    settings: {
      title: "Cài đặt",
      subtitle: "Thiết lập hệ thống GROVA DOCUMENT"
    },

    admin: {
      title: "Quản trị",
      subtitle: "Quản lý hệ thống"
    }
  };


  /* =======================================================
     4. CURRENT USER
     ======================================================= */

  function renderCurrentUser() {
    const data = getAppData();

    const user =
      data.currentUser ||
      data.user ||
      {};

    const userName =
      user.name ||
      user.fullName ||
      "Quản trị viên";

    const userRole =
      user.role ||
      user.position ||
      "GROVA HOLDINGS";

    const avatar =
      $(".user-avatar");

    const name =
      $(".user-info strong");

    const role =
      $(".user-info span");

    if (avatar) {
      avatar.textContent = getInitials(userName);
    }

    if (name) {
      name.textContent = userName;
    }

    if (role) {
      role.textContent = userRole;
    }
  }


  /* =======================================================
     5. PAGE HEADER
     ======================================================= */

  function updatePageHeader(pageId) {
    const config =
      PAGE_CONFIG[pageId] ||
      PAGE_CONFIG.dashboard;

    const title =
      $(".page-title h1");

    const subtitle =
      $(".page-title p");

    if (title) {
      title.textContent = config.title;
    }

    if (subtitle) {
      subtitle.textContent = config.subtitle;
    }
  }


  /* =======================================================
     6. STATS
     ======================================================= */

  function getStats() {
    const data = getAppData();

    return (
      data.stats ||
      {}
    );
  }

  function renderStats() {
    const stats = getStats();

    const values = {
      documents:
        stats.documents ??
        stats.totalDocuments ??
        0,

      projects:
        stats.projects ??
        stats.totalProjects ??
        0,

      customers:
        stats.customers ??
        stats.totalCustomers ??
        0,

      employees:
        stats.employees ??
        stats.totalEmployees ??
        0
    };

    const mappings = {
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

    Object.keys(mappings).forEach(key => {
      mappings[key].forEach(selector => {
        const element = $(selector);

        if (element) {
          element.textContent = values[key];
        }
      });
    });
  }


  /* =======================================================
     7. DOCUMENT CARDS
     ======================================================= */

  function renderDocumentCards() {
    const templates = getTemplates();

    const containers = [
      ...$$(".document-grid"),
      ...$$("[data-template-grid]")
    ];

    if (!containers.length) {
      return;
    }

    containers.forEach(container => {
      if (
        container.closest(".template-selector") ||
        container.dataset.excludeRender === "true"
      ) {
        return;
      }

      if (!templates.length) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📄</div>
            <h3>Chưa có biểu mẫu</h3>
            <p>Hiện chưa có biểu mẫu nào được cấu hình.</p>
          </div>
        `;

        return;
      }

      container.innerHTML = templates
        .map(template => {
          return `
            <article
              class="document-card"
              data-template-id="${escapeHTML(template.id)}"
            >

              <div>
                <span class="document-tag">
                  ${escapeHTML(template.category)}
                </span>
              </div>

              <h3 class="document-name">
                ${escapeHTML(template.name)}
              </h3>

              <p class="document-description">
                ${escapeHTML(template.description)}
              </p>
            ` +
            `
              <div class="document-meta">
                <span class="document-category">
                  Mẫu ${escapeHTML(template.code)}
                </span>

                <button
                  type="button"
                  class="document-action"
                  data-action="open-template"
                  data-template-id="${escapeHTML(template.id)}"
                >
                  Mở biểu mẫu →
                </button>
              </div>

            </article>
          `;
        })
        .join("");
    });
  }


  /* =======================================================
     8. RECENT DOCUMENTS
     ======================================================= */

  function renderRecentDocuments() {
    const data = getAppData();

    const recent =
      Array.isArray(data.recentDocuments)
        ? data.recentDocuments
        : [];

    const containers = $$(
      "[data-recent-documents]"
    );

    if (!containers.length) {
      return;
    }

    containers.forEach(container => {
      if (!recent.length) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">🗂️</div>
            <h3>Chưa có văn bản gần đây</h3>
            <p>
              Các văn bản bạn tạo sau này sẽ xuất hiện tại đây.
            </p>
          </div>
        `;

        return;
      }

      container.innerHTML = recent
        .map(item => {
          const name =
            item.name ||
            item.title ||
            "Văn bản";

          const date =
            item.date ||
            item.createdAt ||
            "";

          const status =
            item.status ||
            "Đã tạo";

          return `
            <div class="recent-document">
              <div>
                <strong>
                  ${escapeHTML(name)}
                </strong>

                <small>
                  ${escapeHTML(date)}
                </small>
              </div>

              <span class="badge badge-success">
                ${escapeHTML(status)}
              </span>
            </div>
          `;
        })
        .join("");
    });
  }


  /* =======================================================
     9. PAGE SWITCHING
     ======================================================= */

  function switchPage(pageId) {
    if (!pageId) {
      return;
    }

    const target =
      document.getElementById(pageId);

    if (!target) {
      return;
    }

    $$(".page").forEach(page => {
      page.classList.remove("active");
      page.classList.add("hidden");
    });

    target.classList.remove("hidden");
    target.classList.add("active");

    state.currentPage = pageId;

    $$(".nav-item").forEach(item => {
      const itemPage =
        item.dataset.page ||
        item.getAttribute("data-page");

      item.classList.toggle(
        "active",
        itemPage === pageId
      );
    });

    updatePageHeader(pageId);

    closeSidebar();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }


  /* =======================================================
     10. NAVIGATION
     ======================================================= */

  function bindNavigation() {
    $$(".nav-item").forEach(item => {
      item.addEventListener("click", event => {
        event.preventDefault();

        const pageId =
          item.dataset.page ||
          item.getAttribute("data-page");

        if (pageId) {
          switchPage(pageId);
        }
      });
    });
  }


  /* =======================================================
     11. DOCUMENT MODAL
     ======================================================= */

  function getDocumentModal() {
    return (
      $("#documentModal") ||
      $(".document-modal")
    );
  }

  function openModal(modal) {
    if (!modal) {
      return;
    }

    modal.classList.add("open");
    modal.classList.add("active");

    modal.removeAttribute("aria-hidden");

    document.body.style.overflow = "hidden";
  }

  function closeModal(modal) {
    if (!modal) {
      return;
    }

    modal.classList.remove("open");
    modal.classList.remove("active");

    modal.setAttribute(
      "aria-hidden",
      "true"
    );

    document.body.style.overflow = "";
  }

  function closeAllModals() {
    $$(".modal").forEach(modal => {
      closeModal(modal);
    });
  }


  /* =======================================================
     12. TEMPLATE SELECTOR
     ======================================================= */

  function renderTemplateSelector() {
    const templates = getTemplates();

    const containers = $$(
      ".template-selector"
    );

    if (!containers.length) {
      return;
    }

    containers.forEach(container => {
      if (!templates.length) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📄</div>
            <h3>Chưa có biểu mẫu</h3>
            <p>
              Vui lòng cấu hình biểu mẫu trong data/data.js.
            </p>
          </div>
        `;

        return;
      }

      container.innerHTML = templates
        .map(template => {
          return `
            <label
              class="template-option"
              data-template-id="${escapeHTML(template.id)}"
            >

              <input
                type="radio"
                name="grovaTemplate"
                value="${escapeHTML(template.id)}"
              >

              <div class="template-option-title">
                ${escapeHTML(template.name)}
              </div>

              <div class="template-option-description">
                ${escapeHTML(template.description)}
              </div>

            </label>
          `;
        })
        .join("");

      $$(
        ".template-option",
        container
      ).forEach(option => {
        option.addEventListener(
          "click",
          () => {
            selectTemplate(
              option.dataset.templateId,
              container
            );
          }
        );
      });
    });
  }

  function selectTemplate(
    templateId,
    container = document
  ) {
    const template =
      getTemplateById(templateId);

    if (!template) {
      return;
    }

    state.selectedTemplate =
      String(template.id);

    $$(".template-option", container)
      .forEach(option => {
        option.classList.toggle(
          "selected",
          String(option.dataset.templateId) ===
          String(template.id)
        );

        const radio =
          $("input[type='radio']", option);

        if (radio) {
          radio.checked =
            String(radio.value) ===
            String(template.id);
        }
      });

    $$(".template-option")
      .filter(option => {
        return option.closest(
          ".template-selector"
        ) !== container;
      })
      .forEach(option => {
        option.classList.toggle(
          "selected",
          String(option.dataset.templateId) ===
          String(template.id)
        );

        const radio =
          $("input[type='radio']", option);

        if (radio) {
          radio.checked =
            String(radio.value) ===
            String(template.id);
        }
      });
  }


  /* =======================================================
     13. NEW DOCUMENT
     ======================================================= */

  function openNewDocumentModal(
    templateId = null
  ) {
    const modal =
      getDocumentModal();

    if (!modal) {
      if (templateId) {
        openTemplate(templateId);
      }

      return;
    }

    renderTemplateSelector();

    openModal(modal);

    if (templateId) {
      selectTemplate(
        templateId,
        $(".template-selector", modal) || modal
      );
    } else {
      state.selectedTemplate = null;

      $$(".template-option", modal)
        .forEach(option => {
          option.classList.remove(
            "selected"
          );

          const radio =
            $("input[type='radio']", option);

          if (radio) {
            radio.checked = false;
          }
        });
    }
  }


  /* =======================================================
     14. OPEN TEMPLATE
     ======================================================= */

  function openTemplate(templateId) {
    const template =
      getTemplateById(templateId);

    if (!template) {
      console.warn(
        "Không tìm thấy biểu mẫu:",
        templateId
      );

      return;
    }

    if (!template.file) {
      console.warn(
        "Biểu mẫu chưa có đường dẫn:",
        template
      );

      return;
    }

    state.selectedTemplate =
      String(template.id);

    window.location.href =
      template.file;
  }


  /* =======================================================
     15. START SELECTED DOCUMENT
     ======================================================= */

  function startSelectedDocument() {
    let templateId =
      state.selectedTemplate;

    if (!templateId) {
      const checked =
        $(".template-option input[type='radio']:checked");

      if (checked) {
        templateId =
          checked.value;
      }
    }

    if (!templateId) {
      alert(
        "Vui lòng chọn một biểu mẫu trước khi tiếp tục."
      );

      return;
    }

    closeAllModals();

    openTemplate(templateId);
  }


  /* =======================================================
     16. MODAL BINDING
     ======================================================= */

  function bindModal() {
    const modal =
      getDocumentModal();

    if (!modal) {
      return;
    }

    $$(".modal-close", modal)
      .forEach(button => {
        button.addEventListener(
          "click",
          event => {
            event.preventDefault();

            closeModal(modal);
          }
        );
      });

    $$(".modal-overlay", modal)
      .forEach(overlay => {
        overlay.addEventListener(
          "click",
          () => {
            closeModal(modal);
          }
        );
      });

    modal.addEventListener(
      "click",
      event => {
        if (
          event.target === modal
        ) {
          closeModal(modal);
        }
      }
    );
  }


  /* =======================================================
     17. DOCUMENT ACTIONS
     ======================================================= */

  function bindDocumentActions() {
    document.addEventListener(
      "click",
      event => {

        const target =
          event.target.closest(
            "[data-action]"
          );

        if (!target) {
          return;
        }

        const action =
          target.dataset.action;

        if (
          action ===
          "open-template"
        ) {
          event.preventDefault();

          const templateId =
            target.dataset.templateId;

          openNewDocumentModal(
            templateId
          );

          return;
        }

        if (
          action ===
          "new-document"
        ) {
          event.preventDefault();

          openNewDocumentModal();

          return;
        }

        if (
          action ===
          "start-document"
        ) {
          event.preventDefault();

          startSelectedDocument();

          return;
        }

        if (
          action ===
          "close-modal"
        ) {
          event.preventDefault();

          closeAllModals();

          return;
        }
      }
    );
  }


  /* =======================================================
     18. NEW DOCUMENT BUTTONS
     ======================================================= */

  function bindNewDocumentButtons() {

    $$(
      "[data-new-document]"
    ).forEach(button => {
      button.addEventListener(
        "click",
        event => {
          event.preventDefault();

          openNewDocumentModal();
        }
      );
    });

    $$(
      "#newDocumentBtn"
    ).forEach(button => {
      button.addEventListener(
        "click",
        event => {
          event.preventDefault();

          openNewDocumentModal();
        }
      );
    });

    $$(
      "[data-start-document]"
    ).forEach(button => {
      button.addEventListener(
        "click",
        event => {
          event.preventDefault();

          startSelectedDocument();
        }
      );
    });

    $$(
      "#startDocumentBtn"
    ).forEach(button => {
      button.addEventListener(
        "click",
        event => {
          event.preventDefault();

          startSelectedDocument();
        }
      );
    });
  }


  /* =======================================================
     19. SIDEBAR
     ======================================================= */

  function getSidebar() {
    return $(".sidebar");
  }

  function createSidebarBackdrop() {
    let backdrop =
      $(".sidebar-backdrop");

    if (backdrop) {
      return backdrop;
    }

    backdrop =
      document.createElement("div");

    backdrop.className =
      "sidebar-backdrop";

    backdrop.addEventListener(
      "click",
      closeSidebar
    );

    document.body.appendChild(
      backdrop
    );

    return backdrop;
  }

  function openSidebar() {
    const sidebar =
      getSidebar();

    if (!sidebar) {
      return;
    }

    sidebar.classList.add("open");

    const backdrop =
      createSidebarBackdrop();

    backdrop.classList.add(
      "active"
    );
  }

  function closeSidebar() {
    const sidebar =
      getSidebar();

    if (sidebar) {
      sidebar.classList.remove(
        "open"
      );
    }

    const backdrop =
      $(".sidebar-backdrop");

    if (backdrop) {
      backdrop.classList.remove(
        "active"
      );
    }
  }

  function bindSidebar() {
    const buttons = [
      ...$$(".menu-toggle"),
      ...$$("[data-menu-toggle]")
    ];

    buttons.forEach(button => {
      button.addEventListener(
        "click",
        event => {
          event.preventDefault();

          const sidebar =
            getSidebar();

          if (
            sidebar &&
            sidebar.classList.contains(
              "open"
            )
          ) {
            closeSidebar();
          } else {
            openSidebar();
          }
        }
      );
    });
  }


  /* =======================================================
     20. ESC KEY
     ======================================================= */

  function bindKeyboard() {
    document.addEventListener(
      "keydown",
      event => {
        if (
          event.key ===
          "Escape"
        ) {
          closeAllModals();
          closeSidebar();
        }
      }
    );
  }


  /* =======================================================
     21. RESPONSIVE SIDEBAR
     ======================================================= */

  function bindResize() {
    window.addEventListener(
      "resize",
      () => {
        if (
          window.innerWidth >
          900
        ) {
          closeSidebar();
        }
      }
    );
  }


  /* =======================================================
     22. SERVICE WORKER
     ======================================================= */

  function registerServiceWorker() {
    if (
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    window.addEventListener(
      "load",
      () => {
        navigator.serviceWorker
          .register("./sw.js")
          .catch(error => {
            console.warn(
              "Service Worker registration failed:",
              error
            );
          });
      }
    );
  }


  /* =======================================================
     23. PWA UPDATE
     ======================================================= */

  function listenForServiceWorkerUpdate() {
    if (
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => {
        /*
         * Không tự reload cưỡng bức.
         * Tránh làm mất dữ liệu người dùng
         * đang nhập trong biểu mẫu.
         */
      }
    );
  }


  /* =======================================================
     24. GLOBAL REFRESH
     ======================================================= */

  function refreshUI() {
    renderCurrentUser();
    renderStats();
    renderDocumentCards();
    renderRecentDocuments();
    renderTemplateSelector();
    updatePageHeader(
      state.currentPage
    );
  }


  /* =======================================================
     25. INITIALIZE
     ======================================================= */

  function init() {
    if (state.initialized) {
      return;
    }

    state.initialized = true;

    bindNavigation();
    bindModal();
    bindDocumentActions();
    bindNewDocumentButtons();
    bindSidebar();
    bindKeyboard();
    bindResize();

    refreshUI();

    registerServiceWorker();
    listenForServiceWorkerUpdate();

    /*
     * Nếu index.html chưa đánh dấu page active,
     * mặc định mở Dashboard.
     */
    const activePage =
      $(".page.active");

    if (!activePage) {
      switchPage(
        state.currentPage
      );
    } else {
      state.currentPage =
        activePage.id ||
        "dashboard";

      updatePageHeader(
        state.currentPage
      );
    }
  }


  /* =======================================================
     26. PUBLIC API
     ======================================================= */

  window.GROVA_DOCUMENT = {
    state,

    getAppData,
    getTemplates,
    getTemplateById,

    switchPage,

    openNewDocumentModal,
    openTemplate,

    closeModal,
    closeAllModals,

    openSidebar,
    closeSidebar,

    refreshUI,

    init
  };


  /* =======================================================
     27. START
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