/* =========================================================
   GROVA DOCUMENT
   app.js
   Stable version
   ========================================================= */

(function () {
  "use strict";

  /* =======================================================
     STATE
     ======================================================= */

  const state = {
    currentPage: "dashboard",
    selectedTemplate: null,
    initialized: false
  };


  /* =======================================================
     HELPERS
     ======================================================= */

  function $(selector, parent) {
    return (parent || document).querySelector(selector);
  }

  function $$(selector, parent) {
    return Array.from(
      (parent || document).querySelectorAll(selector)
    );
  }

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


  /* =======================================================
     DATA
     ======================================================= */

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

    return data.templates.filter(function (item) {
      return item && item.enabled !== false;
    });
  }

  function getTemplateById(id) {
    const templates = getTemplates();

    return templates.find(function (template) {
      return String(
        template.id
      ) === String(id);
    });
  }


  /* =======================================================
     PAGE CONFIG
     ======================================================= */

  const PAGE_CONFIG = {
    dashboard: {
      title: "Tổng quan",
      subtitle: "Hệ thống quản lý hồ sơ và văn bản"
    },

    documents: {
      title: "Văn bản",
      subtitle: "Quản lý các biểu mẫu văn bản"
    },

    projects: {
      title: "Công trình",
      subtitle: "Quản lý dữ liệu công trình"
    },

    customers: {
      title: "Khách hàng",
      subtitle: "Quản lý thông tin khách hàng"
    },

    employees: {
      title: "Nhân sự",
      subtitle: "Quản lý hồ sơ nhân sự"
    },

    history: {
      title: "Lịch sử",
      subtitle: "Theo dõi các văn bản đã tạo"
    },

    reports: {
      title: "Báo cáo",
      subtitle: "Tổng hợp dữ liệu hệ thống"
    },

    settings: {
      title: "Cài đặt",
      subtitle: "Cấu hình GROVA DOCUMENT"
    },

    admin: {
      title: "Quản trị hệ thống",
      subtitle: "Quản lý người dùng, mẫu văn bản và dữ liệu"
    }
  };


  /* =======================================================
     HEADER
     ======================================================= */

  function updateHeader(pageId) {
    const config =
      PAGE_CONFIG[pageId] ||
      PAGE_CONFIG.dashboard;

    const title = $(".page-title h1");
    const subtitle = $(".page-title p");

    if (title) {
      title.textContent = config.title;
    }

    if (subtitle) {
      subtitle.textContent = config.subtitle;
    }
  }


  /* =======================================================
     USER
     ======================================================= */

  function renderUser() {
    const data = getAppData();

    const user =
      data.currentUser ||
      data.user ||
      {};

    const name =
      user.name ||
      user.fullName ||
      "Quản trị viên";

    const role =
      user.role ||
      user.position ||
      "Administrator";

    const avatar = $(".user-avatar");
    const userName = $(".user-info strong");
    const userRole = $(".user-info span");

    if (avatar) {
      const words = name
        .trim()
        .split(/\s+/)
        .filter(Boolean);

      if (words.length >= 2) {
        avatar.textContent =
          (
            words[0][0] +
            words[words.length - 1][0]
          ).toUpperCase();
      } else {
        avatar.textContent =
          name.substring(0, 2).toUpperCase();
      }
    }

    if (userName) {
      userName.textContent = name;
    }

    if (userRole) {
      userRole.textContent = role;
    }
  }


  /* =======================================================
     STATISTICS
     ======================================================= */

  function renderStats() {
    const data = getAppData();
    const stats = data.stats || {};

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

    const selectors = {
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

    Object.keys(selectors).forEach(function (key) {
      selectors[key].forEach(function (selector) {
        const element = $(selector);

        if (element) {
          element.textContent = values[key];
        }
      });
    });
  }


  /* =======================================================
     FIND DOCUMENT GRID
     ======================================================= */

  function findDocumentContainers() {
    const result = [];

    $$(
      "[data-template-grid]"
    ).forEach(function (element) {
      if (!result.includes(element)) {
        result.push(element);
      }
    });

    /*
     * Nếu index.html không có data-template-grid,
     * tìm khu vực Văn bản dựa trên heading.
     */

    $$(".document-grid").forEach(function (element) {
      if (!result.includes(element)) {
        result.push(element);
      }
    });

    /*
     * Không tự động lấy mọi .document-grid nếu đó là
     * khu vực khác. Chỉ xử lý grid thực sự rỗng.
     */

    return result;
  }


  /* =======================================================
     DOCUMENT CARDS
     ======================================================= */

  function renderDocumentCards() {
    const templates = getTemplates();
    const containers = findDocumentContainers();

    /*
     * Không có container thì không làm gì.
     * Điều này giúp app không phá HTML hiện tại.
     */

    if (!containers.length) {
      return;
    }

    containers.forEach(function (container) {

      /*
       * Nếu HTML đã có nội dung mẫu và không phải
       * container được app quản lý thì giữ nguyên.
       */

      if (
        container.dataset.managed !== "true" &&
        container.children.length > 0 &&
        !container.hasAttribute("data-template-grid")
      ) {
        return;
      }

      container.dataset.managed = "true";

      if (!templates.length) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📄</div>
            <h3>Chưa có biểu mẫu</h3>
            <p>
              Chưa có biểu mẫu nào được cấu hình trong hệ thống.
            </p>
          </div>
        `;

        return;
      }

      container.innerHTML = templates
        .map(function (template) {

          const id =
            template.id ||
            template.code ||
            "";

          const name =
            template.name ||
            template.title ||
            "Biểu mẫu";

          const description =
            template.description ||
            "";

          const category =
            template.category ||
            "Văn bản";

          return `
            <article
              class="document-card"
              data-template-id="${escapeHTML(id)}"
            >

              <div>
                <span class="document-tag">
                  ${escapeHTML(category)}
                </span>
              </div>

              <h3 class="document-name">
                ${escapeHTML(name)}
              </h3>

              <p class="document-description">
                ${escapeHTML(description)}
              </p>

              <div class="document-meta">

                <span class="document-category">
                  Mẫu ${escapeHTML(id)}
                </span>

                <button
                  type="button"
                  class="document-action"
                  data-action="open-template"
                  data-template-id="${escapeHTML(id)}"
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
     RECENT DOCUMENTS
     ======================================================= */

  function renderRecentDocuments() {
    const data = getAppData();

    const recent =
      Array.isArray(data.recentDocuments)
        ? data.recentDocuments
        : [];

    const containers =
      $$("[data-recent-documents]");

    if (!containers.length) {
      return;
    }

    containers.forEach(function (container) {

      if (!recent.length) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">🗂️</div>
            <h3>Chưa có lịch sử</h3>
            <p>
              Các văn bản được tạo sẽ xuất hiện tại đây.
            </p>
          </div>
        `;

        return;
      }

      container.innerHTML = recent
        .map(function (item) {

          const name =
            item.name ||
            item.title ||
            "Văn bản";

          const date =
            item.date ||
            item.createdAt ||
            "";

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

            </div>
          `;
        })
        .join("");
    });
  }


  /* =======================================================
     PAGE SWITCH
     ======================================================= */

  function switchPage(pageId) {
    const target =
      document.getElementById(pageId);

    if (!target) {
      return;
    }

    $$(".page").forEach(function (page) {
      page.classList.remove("active");
      page.classList.add("hidden");
    });

    target.classList.remove("hidden");
    target.classList.add("active");

    state.currentPage = pageId;

    $$(".nav-item").forEach(function (item) {
      const itemPage =
        item.dataset.page;

      item.classList.toggle(
        "active",
        itemPage === pageId
      );
    });

    updateHeader(pageId);

    closeSidebar();

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }


  /* =======================================================
     NAVIGATION
     ======================================================= */

  function bindNavigation() {
    $$(".nav-item").forEach(function (item) {

      item.addEventListener(
        "click",
        function (event) {

          event.preventDefault();

          const page =
            item.dataset.page;

          if (page) {
            switchPage(page);
          }

        }
      );

    });
  }


  /* =======================================================
     TEMPLATE MODAL
     ======================================================= */

  function getModal() {
    return (
      document.getElementById(
        "documentModal"
      ) ||
      $(".modal")
    );
  }

  function getTemplateSelector(modal) {
    if (!modal) {
      return null;
    }

    return $(
      ".template-selector",
      modal
    );
  }


  function renderTemplateSelector() {
    const modal = getModal();

    if (!modal) {
      return;
    }

    const selector =
      getTemplateSelector(modal);

    if (!selector) {
      return;
    }

    const templates =
      getTemplates();

    if (!templates.length) {
      selector.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📄</div>
          <h3>Chưa có biểu mẫu</h3>
          <p>
            Kiểm tra file data/data.js.
          </p>
        </div>
      `;

      return;
    }

    selector.innerHTML =
      templates.map(function (template) {

        const id =
          template.id ||
          template.code ||
          "";

        const name =
          template.name ||
          template.title ||
          "Biểu mẫu";

        const description =
          template.description ||
          "";

        return `
          <label
            class="template-option"
            data-template-id="${escapeHTML(id)}"
          >

            <input
              type="radio"
              name="grovaTemplate"
              value="${escapeHTML(id)}"
            >

            <div class="template-option-title">
              ${escapeHTML(name)}
            </div>

            <div class="template-option-description">
              ${escapeHTML(description)}
            </div>

          </label>
        `;
      }).join("");

    $$(".template-option", selector)
      .forEach(function (option) {

        option.addEventListener(
          "click",
          function () {

            selectTemplate(
              option.dataset.templateId
            );

          }
        );

      });
  }


  /* =======================================================
     SELECT TEMPLATE
     ======================================================= */

  function selectTemplate(id) {
    const template =
      getTemplateById(id);

    if (!template) {
      return;
    }

    state.selectedTemplate =
      String(
        template.id ||
        template.code
      );

    $$(".template-option")
      .forEach(function (option) {

        const selected =
          String(
            option.dataset.templateId
          ) ===
          String(
            state.selectedTemplate
          );

        option.classList.toggle(
          "selected",
          selected
        );

        const radio =
          $("input[type='radio']", option);

        if (radio) {
          radio.checked = selected;
        }

      });
  }


  /* =======================================================
     OPEN MODAL
     ======================================================= */

  function openModal() {
    const modal = getModal();

    if (!modal) {
      return false;
    }

    renderTemplateSelector();

    modal.classList.add("open");
    modal.classList.add("active");

    modal.removeAttribute(
      "aria-hidden"
    );

    document.body.style.overflow =
      "hidden";

    return true;
  }


  function closeModal() {
    const modal = getModal();

    if (!modal) {
      return;
    }

    modal.classList.remove("open");
    modal.classList.remove("active");

    modal.setAttribute(
      "aria-hidden",
      "true"
    );

    document.body.style.overflow =
      "";
  }


  /* =======================================================
     OPEN TEMPLATE
     ======================================================= */

  function openTemplate(id) {
    const template =
      getTemplateById(id);

    if (!template) {
      alert(
        "Không tìm thấy biểu mẫu."
      );

      return;
    }

    const file =
      template.file ||
      template.path ||
      template.url;

    if (!file) {
      alert(
        "Biểu mẫu chưa được cấu hình đường dẫn."
      );

      return;
    }

    state.selectedTemplate =
      String(
        template.id ||
        template.code
      );

    window.location.href = file;
  }


  /* =======================================================
     NEW DOCUMENT
     ======================================================= */

  function openNewDocument() {
    state.selectedTemplate = null;

    const modalOpened =
      openModal();

    if (!modalOpened) {
      console.warn(
        "Không tìm thấy #documentModal."
      );
    }
  }


  /* =======================================================
     START DOCUMENT
     ======================================================= */

  function startSelectedDocument() {

    let id =
      state.selectedTemplate;

    if (!id) {
      const checked =
        $("input[name='grovaTemplate']:checked");

      if (checked) {
        id = checked.value;
      }
    }

    if (!id) {
      alert(
        "Vui lòng chọn một biểu mẫu."
      );

      return;
    }

    closeModal();

    openTemplate(id);
  }


  /* =======================================================
     GLOBAL ACTIONS
     ======================================================= */

  function bindActions() {

    document.addEventListener(
      "click",
      function (event) {

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
          "new-document"
        ) {
          event.preventDefault();

          openNewDocument();

          return;
        }

        if (
          action ===
          "open-template"
        ) {
          event.preventDefault();

          const id =
            target.dataset.templateId;

          if (id) {
            openTemplate(id);
          }

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

          closeModal();

          return;
        }

      }
    );


    /*
     * Hỗ trợ cả nút cũ nếu index.html
     * đang dùng ID thay vì data-action.
     */

    $$("#newDocumentBtn").forEach(
      function (button) {

        button.addEventListener(
          "click",
          function (event) {

            event.preventDefault();

            openNewDocument();

          }
        );

      }
    );


    $$("#startDocumentBtn").forEach(
      function (button) {

        button.addEventListener(
          "click",
          function (event) {

            event.preventDefault();

            startSelectedDocument();

          }
        );

      }
    );


    $$("[data-new-document]").forEach(
      function (button) {

        button.addEventListener(
          "click",
          function (event) {

            event.preventDefault();

            openNewDocument();

          }
        );

      }
    );

  }


  /* =======================================================
     MODAL EVENTS
     ======================================================= */

  function bindModal() {

    const modal = getModal();

    if (!modal) {
      return;
    }

    $$(".modal-close", modal)
      .forEach(function (button) {

        button.addEventListener(
          "click",
          function (event) {

            event.preventDefault();

            closeModal();

          }
        );

      });


    $$(".modal-overlay", modal)
      .forEach(function (overlay) {

        overlay.addEventListener(
          "click",
          function () {

            closeModal();

          }
        );

      });


    modal.addEventListener(
      "click",
      function (event) {

        if (
          event.target === modal
        ) {
          closeModal();
        }

      }
    );

  }


  /* =======================================================
     SIDEBAR
     ======================================================= */

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
      $(".sidebar");

    if (!sidebar) {
      return;
    }

    sidebar.classList.add(
      "open"
    );

    createSidebarBackdrop()
      .classList.add("active");
  }


  function closeSidebar() {

    const sidebar =
      $(".sidebar");

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

    buttons.forEach(function (button) {

      button.addEventListener(
        "click",
        function (event) {

          event.preventDefault();

          const sidebar =
            $(".sidebar");

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
     KEYBOARD
     ======================================================= */

  function bindKeyboard() {

    document.addEventListener(
      "keydown",
      function (event) {

        if (
          event.key === "Escape"
        ) {
          closeModal();
          closeSidebar();
        }

      }
    );

  }


  /* =======================================================
     SERVICE WORKER
     ======================================================= */

  function registerServiceWorker() {

    if (
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    window.addEventListener(
      "load",
      function () {

        navigator.serviceWorker
          .register("./sw.js")
          .catch(function (error) {

            console.warn(
              "Service Worker:",
              error
            );

          });

      }
    );
  }


  /* =======================================================
     REFRESH
     ======================================================= */

  function refresh() {

    renderUser();
    renderStats();
    renderDocumentCards();
    renderRecentDocuments();
    updateHeader(
      state.currentPage
    );

  }


  /* =======================================================
     INIT
     ======================================================= */

  function init() {

    if (state.initialized) {
      return;
    }

    state.initialized = true;

    bindNavigation();
    bindActions();
    bindModal();
    bindSidebar();
    bindKeyboard();

    refresh();

    registerServiceWorker();


    /*
     * Xác định trang ban đầu.
     */

    const activePage =
      $(".page.active");

    if (activePage) {

      state.currentPage =
        activePage.id ||
        "dashboard";

      updateHeader(
        state.currentPage
      );

    } else {

      switchPage(
        "dashboard"
      );

    }

  }


  /* =======================================================
     PUBLIC API
     ======================================================= */

  window.GROVA_DOCUMENT = {

    state: state,

    getAppData:
      getAppData,

    getTemplates:
      getTemplates,

    getTemplateById:
      getTemplateById,

    switchPage:
      switchPage,

    openNewDocument:
      openNewDocument,

    openTemplate:
      openTemplate,

    selectTemplate:
      selectTemplate,

    startSelectedDocument:
      startSelectedDocument,

    closeModal:
      closeModal,

    openSidebar:
      openSidebar,

    closeSidebar:
      closeSidebar,

    refresh:
      refresh,

    init:
      init

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