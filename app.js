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


    /*
     * Ghi nhận hoạt động trước khi chuyển
     * sang trang mẫu văn bản.
     */

    saveRecentDocument(template);


    /*
     * Chuyển tới mẫu văn bản.
     */

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


  /* ==========================================
     SAVE RECENT ACTIVITY
     ========================================== */

  function saveRecentDocument(template) {

    if (!template) {
      return;
    }


    var list = getRecentDocuments();


    var activity = {

      id: template.id || "",

      code: template.code || "",

      name: template.name || "",

      title: template.title || "",

      description: template.description || "",

      category: template.category || "Văn bản",

      icon: template.icon || "📄",

      file: template.file || "",

      action: "Mở văn bản",

      createdAt: new Date().toISOString()

    };


    /*
     * Đưa hoạt động mới nhất lên đầu.
     */

    list.unshift(activity);


    /*
     * Giữ tối đa 20 hoạt động.
     */

    list = list.slice(0, 20);


    try {

      localStorage.setItem(
        "GROVA_DOCUMENT_RECENT",
        JSON.stringify(list)
      );

    } catch (error) {

      console.warn(
        "Không thể lưu hoạt động gần đây.",
        error
      );

    }


    /*
     * Nếu đang ở trang Dashboard,
     * cập nhật ngay giao diện.
     */

    renderRecentDocuments();

    updateStats();

  }


  /* ==========================================
     FORMAT TIME
     ========================================== */

  function formatRecentTime(value) {

    if (!value) {
      return "";
    }


    var date = new Date(value);


    if (isNaN(date.getTime())) {
      return "";
    }


    var now = new Date();

    var diff =
      now.getTime() -
      date.getTime();


    var minute =
      60 * 1000;

    var hour =
      60 * minute;

    var day =
      24 * hour;


    /*
     * Vừa thực hiện.
     */

    if (diff >= 0 && diff < minute) {

      return "Vừa xong";

    }


    /*
     * Trong vòng 1 giờ.
     */

    if (diff >= minute && diff < hour) {

      var minutes =
        Math.floor(diff / minute);

      return minutes + " phút trước";

    }


    /*
     * Trong ngày.
     */

    if (diff >= hour && diff < day) {

      var hours =
        Math.floor(diff / hour);

      return hours + " giờ trước";

    }


    /*
     * Nếu khác ngày,
     * hiển thị ngày + giờ.
     */

    try {

      return date.toLocaleDateString(
        "vi-VN",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        }
      ) +
      " • " +
      date.toLocaleTimeString(
        "vi-VN",
        {
          hour: "2-digit",
          minute: "2-digit"
        }
      );

    } catch (error) {

      return date.toLocaleString();

    }

  }


  /* ==========================================
     RENDER RECENT DOCUMENTS
     ========================================== */

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

      var row =
        document.createElement("button");


      row.type = "button";

      row.className = "recent-row";


      row.setAttribute(
        "data-template-id",
        item.id || ""
      );


      row.innerHTML =

        '<span class="recent-row-icon">' +

          escapeHtml(
            item.icon || "📄"
          ) +

        '</span>' +

        '<span class="recent-row-content">' +

          '<strong>' +
            escapeHtml(
              item.name || item.title || ""
            ) +
          '</strong>' +

          '<small>' +

            '<span>' +
              escapeHtml(
                item.code || ""
              ) +
            '</span>' +

            '<span class="recent-row-separator">•</span>' +

            '<span>' +
              escapeHtml(
                item.action || "Mở văn bản"
              ) +
            '</span>' +

            '<span class="recent-row-separator">•</span>' +

            '<span>' +
              escapeHtml(
                formatRecentTime(
                  item.createdAt
                )
              ) +
            '</span>' +

          '</small>' +

        '</span>' +

        '<span class="recent-row-arrow">→</span>';


      row.addEventListener(
        "click",
        function () {

          if (!item.file) {
            return;
          }


          /*
           * Không ghi thêm một hoạt động
           * khi chỉ mở lại từ lịch sử.
           */

          window.location.href =
            item.file;

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
        String(
          getRecentDocuments().length
        );

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


    /*
     * Khi mở trang Lịch sử,
     * luôn lấy dữ liệu mới nhất.
     */

    if (pageName === "history") {

      renderRecentDocuments();

    }


    /*
     * Khi quay về Dashboard,
     * cập nhật lại Hoạt động gần đây.
     */

    if (pageName === "dashboard") {

      renderRecentDocuments();

      updateStats();

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

    document.body.classList.add(
      "sidebar-open"
    );

  }


  function closeSidebarMobile() {

    var sidebar =
      $("#sidebar");


    if (!sidebar) {
      return;
    }


    sidebar.classList.remove("open");

    document.body.classList.remove(
      "sidebar-open"
    );

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

    getRecentDocuments: getRecentDocuments,

    saveRecentDocument: saveRecentDocument,

    renderRecentDocuments: renderRecentDocuments,

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