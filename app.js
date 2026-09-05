(function () {

  "use strict";


  /* ==========================================
     GROVA DOCUMENT APP
     ========================================== */


  var DATA = window.GROVA_DATA || {};

  var templates = Array.isArray(DATA.templates)
    ? DATA.templates
    : [];


  /* ==========================================
     DOM
     ========================================== */

  function $(selector) {
    return document.querySelector(selector);
  }


  function $$(selector) {
    return Array.prototype.slice.call(
      document.querySelectorAll(selector)
    );
  }


  /* ==========================================
     PAGE CONFIG
     ========================================== */

  var pageConfig = {

    dashboard: {
      title: "Tổng quan",
      subtitle: "Hệ thống quản lý hồ sơ và văn bản"
    },

    documents: {
      title: "Văn bản",
      subtitle: "Danh mục mẫu văn bản GROVA"
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
      subtitle: "Theo dõi hoạt động hồ sơ"
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
      subtitle: "Quản lý hệ thống GROVA DOCUMENT"
    }

  };


  /* ==========================================
     ENABLED TEMPLATES
     ========================================== */

  function getTemplates() {

    return templates.filter(function (item) {

      return item &&
             item.enabled !== false &&
             item.file;

    });

  }


  /* ==========================================
     CARD
     ========================================== */

  function createCard(template) {

    var card = document.createElement("article");

    card.className = "document-card";

    card.setAttribute(
      "data-template-id",
      template.id
    );

    card.setAttribute(
      "data-file",
      template.file
    );


    card.innerHTML =

      '<div class="document-icon">' +
        escapeHtml(template.icon || "📄") +
      '</div>' +

      '<div class="document-content">' +

        '<div class="document-code">' +
          escapeHtml(template.code || "") +
        '</div>' +

        '<h3>' +
          escapeHtml(template.name || "") +
        '</h3>' +

        '<p>' +
          escapeHtml(template.description || "") +
        '</p>' +

        '<span class="document-category">' +
          escapeHtml(template.category || "Văn bản") +
        '</span>' +

      '</div>' +

      '<div class="document-arrow">→</div>';


    card.addEventListener(
      "click",
      function () {

        openTemplate(template);

      }
    );


    return card;
  }


  /* ==========================================
     ESCAPE HTML
     ========================================== */

  function escapeHtml(value) {

    var text = String(value == null ? "" : value);

    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }


  /* ==========================================
     RENDER DOCUMENTS PAGE
     ========================================== */

  function renderDocumentsPage() {

    var grid = $("#documentsPageGrid");

    if (!grid) {
      return;
    }


    grid.innerHTML = "";


    getTemplates().forEach(function (template) {

      grid.appendChild(
        createCard(template)
      );

    });

  }


  /* ==========================================
     SYNC DASHBOARD
     ========================================== */

  function syncDashboardCards() {

    var grid = $("#documentGrid");

    if (!grid) {
      return;
    }


    /*
     * Dashboard đã có HTML fallback.
     * Không xoá nếu JS/data không có.
     *
     * Nếu data có đủ 9 mẫu thì đồng bộ lại.
     */

    if (getTemplates().length === 0) {
      return;
    }


    grid.innerHTML = "";


    getTemplates().forEach(function (template) {

      grid.appendChild(
        createCard(template)
      );

    });

  }


  /* ==========================================
     MODAL
     ========================================== */

  var selectedTemplate = null;


  function openModal() {

    var modal = $("#documentModal");

    if (!modal) {
      return;
    }


    renderTemplateSelector();


    modal.classList.remove("hidden");

    document.body.classList.add("modal-open");


    selectedTemplate = null;

    updateModalButton();

  }


  function closeModal() {

    var modal = $("#documentModal");

    if (!modal) {
      return;
    }


    modal.classList.add("hidden");

    document.body.classList.remove("modal-open");

    selectedTemplate = null;

  }


  function renderTemplateSelector() {

    var box = $("#templateSelector");

    if (!box) {
      return;
    }


    box.innerHTML = "";


    getTemplates().forEach(function (template) {

      var item = document.createElement("button");

      item.type = "button";

      item.className = "template-option";


      item.innerHTML =

        '<span class="template-option-icon">' +
          escapeHtml(template.icon || "📄") +
        '</span>' +

        '<span class="template-option-content">' +

          '<strong>' +
            escapeHtml(template.name || "") +
          '</strong>' +

          '<small>' +
            escapeHtml(template.description || "") +
          '</small>' +

        '</span>' +

        '<span class="template-option-check">✓</span>';


      item.addEventListener(
        "click",
        function () {

          selectedTemplate = template;


          $$(".template-option").forEach(
            function (element) {

              element.classList.remove("selected");

            }
          );


          item.classList.add("selected");

          updateModalButton();

        }
      );


      box.appendChild(item);

    });

  }


  function updateModalButton() {

    var button = $("#openTemplate");

    if (!button) {
      return;
    }


    button.disabled = !selectedTemplate;

  }


  function openSelectedTemplate() {

    if (!selectedTemplate) {
      return;
    }


    openTemplate(selectedTemplate);

  }


  /* ==========================================
     OPEN TEMPLATE
     ========================================== */

  function openTemplate(template) {

    if (!template || !template.file) {
      return;
    }


    saveRecentDocument(template);


    window.location.href = template.file;

  }


  /* ==========================================
     RECENT DOCUMENTS
     ========================================== */

  function getRecentDocuments() {

    try {

      var raw =
        localStorage.getItem(
          "GROVA_DOCUMENT_RECENT"
        );


      if (!raw) {
        return [];
      }


      var parsed = JSON.parse(raw);


      return Array.isArray(parsed)
        ? parsed
        : [];

    } catch (error) {

      return [];

    }

  }


  function saveRecentDocument(template) {

    if (!template) {
      return;
    }


    var list = getRecentDocuments();


    list.unshift({

      id: template.id,

      code: template.code,

      name: template.name,

      file: template.file,

      createdAt: new Date().toISOString()

    });


    list = list.slice(0, 20);


    try {

      localStorage.setItem(
        "GROVA_DOCUMENT_RECENT",
        JSON.stringify(list)
      );

    } catch (error) {

      console.warn(
        "Không thể lưu lịch sử.",
        error
      );

    }

  }


  function renderRecentDocuments() {

    var container = $("#recentDocuments");

    if (!container) {
      return;
    }


    var list = getRecentDocuments();


    if (!list.length) {

      container.innerHTML =

        '<div class="empty-state">' +

          '<div class="empty-icon">◷</div>' +

          '<h3>Chưa có lịch sử</h3>' +

          '<p>' +
            'Các văn bản được tạo sẽ xuất hiện tại đây.' +
          '</p>' +

        '</div>';

      return;

    }


    container.innerHTML = "";


    list.forEach(function (item) {

      var row = document.createElement("button");

      row.type = "button";

      row.className = "recent-row";


      row.innerHTML =

        '<span class="recent-row-icon">📄</span>' +

        '<span class="recent-row-content">' +

          '<strong>' +
            escapeHtml(item.name || "") +
          '</strong>' +

          '<small>' +
            escapeHtml(item.code || "") +
          '</small>' +

        '</span>' +

        '<span class="recent-row-arrow">→</span>';


      row.addEventListener(
        "click",
        function () {

          window.location.href = item.file;

        }
      );


      container.appendChild(row);

    });

  }


  /* ==========================================
     STATS
     ========================================== */

  function updateStats() {

    var documents =
      $("#statDocuments");

    if (documents) {

      documents.textContent =
        String(getRecentDocuments().length);

    }


    var projects =
      $("#statProjects");

    if (projects) {

      projects.textContent =
        String(
          DATA.stats &&
          DATA.stats.projects
            ? DATA.stats.projects
            : 0
        );

    }


    var customers =
      $("#statCustomers");

    if (customers) {

      customers.textContent =
        String(
          DATA.stats &&
          DATA.stats.customers
            ? DATA.stats.customers
            : 0
        );

    }


    var employees =
      $("#statEmployees");

    if (employees) {

      employees.textContent =
        String(
          DATA.stats &&
          DATA.stats.employees
            ? DATA.stats.employees
            : 0
        );

    }

  }


  /* ==========================================
     NAVIGATION
     ========================================== */

  function showPage(pageName) {

    if (!pageConfig[pageName]) {
      pageName = "dashboard";
    }


    $$(".page").forEach(
      function (page) {

        page.classList.remove("active");

      }
    );


    var target =
      $("#page-" + pageName);


    if (target) {

      target.classList.add("active");

    }


    $$(".menu-item").forEach(
      function (item) {

        item.classList.toggle(
          "active",
          item.getAttribute("data-page") === pageName
        );

      }
    );


    var config =
      pageConfig[pageName];


    var title =
      $("#pageTitle");


    var subtitle =
      $("#pageSubtitle");


    if (title) {
      title.textContent =
        config.title;
    }


    if (subtitle) {
      subtitle.textContent =
        config.subtitle;
    }


    closeSidebarMobile();

  }


  function bindNavigation() {

    $$(".menu-item").forEach(
      function (item) {

        item.addEventListener(
          "click",
          function () {

            showPage(
              item.getAttribute("data-page")
            );

          }
        );

      }
    );


    $$("[data-page-target]").forEach(
      function (button) {

        button.addEventListener(
          "click",
          function () {

            showPage(
              button.getAttribute(
                "data-page-target"
              )
            );

          }
        );

      }
    );

  }


  /* ==========================================
     SIDEBAR
     ========================================== */

  function openSidebarMobile() {

    var sidebar =
      $("#sidebar");

    if (!sidebar) {
      return;
    }


    sidebar.classList.add("open");

    document.body.classList.add("sidebar-open");

  }


  function closeSidebarMobile() {

    var sidebar =
      $("#sidebar");

    if (!sidebar) {
      return;
    }


    sidebar.classList.remove("open");

    document.body.classList.remove("sidebar-open");

  }


  function bindSidebar() {

    var open =
      $("#openSidebar");


    var close =
      $("#closeSidebar");


    if (open) {

      open.addEventListener(
        "click",
        openSidebarMobile
      );

    }


    if (close) {

      close.addEventListener(
        "click",
        closeSidebarMobile
      );

    }

  }


  /* ==========================================
     MODAL EVENTS
     ========================================== */

  function bindModal() {

    $$("[data-action='new-document']")
      .forEach(
        function (button) {

          button.addEventListener(
            "click",
            openModal
          );

        }
      );


    var close =
      $("#closeModal");


    if (close) {

      close.addEventListener(
        "click",
        closeModal
      );

    }


    var cancel =
      $("#cancelModal");


    if (cancel) {

      cancel.addEventListener(
        "click",
        closeModal
      );

    }


    var openTemplateButton =
      $("#openTemplate");


    if (openTemplateButton) {

      openTemplateButton.addEventListener(
        "click",
        openSelectedTemplate
      );

    }


    var modal =
      $("#documentModal");


    if (modal) {

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


    document.addEventListener(
      "keydown",
      function (event) {

        if (event.key === "Escape") {

          closeModal();

        }

      }
    );

  }


  /* ==========================================
     INIT
     ========================================== */

  function init() {

    /*
     * Dashboard có fallback HTML.
     * JS chỉ nâng cấp nó.
     */

    syncDashboardCards();

    renderDocumentsPage();

    renderRecentDocuments();

    updateStats();

    bindNavigation();

    bindSidebar();

    bindModal();

  }


  /* ==========================================
     PUBLIC API
     ========================================== */

  window.GROVA_DOCUMENT = {

    data: DATA,

    templates: templates,

    showPage: showPage,

    openModal: openModal,

    closeModal: closeModal,

    openTemplate: openTemplate,

    refresh: init

  };


  /* ==========================================
     START
     ========================================== */

  if (
    document.readyState === "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      init
    );

  } else {

    init();

  }


})();