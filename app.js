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
     ESCAPE HTML
     ========================================== */

  function escapeHtml(value) {

    var text = String(
      value == null ? "" : value
    );

    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }


  /* ==========================================
     DOCUMENT CARD
     ========================================== */

  function createCard(template) {

    var card =
      document.createElement("article");


    card.className =
      "document-card";


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

        escapeHtml(
          template.icon || "📄"
        ) +

      '</div>' +


      '<div class="document-content">' +

        '<div class="document-code">' +

          escapeHtml(
            template.code || ""
          ) +

        '</div>' +


        '<h3>' +

          escapeHtml(
            template.name || ""
          ) +

        '</h3>' +


        '<p>' +

          escapeHtml(
            template.description || ""
          ) +

        '</p>' +


        '<span class="document-category">' +

          escapeHtml(
            template.category || "Văn bản"
          ) +

        '</span>' +

      '</div>' +


      '<div class="document-arrow">' +
        "→" +
      '</div>';


    card.addEventListener(
      "click",
      function () {

        openTemplate(template);

      }
    );


    return card;

  }


  /* ==========================================
     DOCUMENTS PAGE
     ========================================== */

  function renderDocumentsPage() {

    var grid =
      $("#documentsPageGrid");


    if (!grid) {
      return;
    }


    grid.innerHTML = "";


    getTemplates().forEach(
      function (template) {

        grid.appendChild(
          createCard(template)
        );

      }
    );

  }


  /* ==========================================
     DASHBOARD CARDS
     ========================================== */

  function syncDashboardCards() {

    var grid =
      $("#documentGrid");


    if (!grid) {
      return;
    }


    grid.innerHTML = "";


    getTemplates().forEach(
      function (template) {

        grid.appendChild(
          createCard(template)
        );

      }
    );

  }


  /* ==========================================
     MODAL
     ========================================== */

  var selectedTemplate = null;


  function openModal() {

    var modal =
      $("#documentModal");


    if (!modal) {
      return;
    }


    renderTemplateSelector();


    modal.classList.remove(
      "hidden"
    );


    modal.setAttribute(
      "aria-hidden",
      "false"
    );


    document.body.classList.add(
      "modal-open"
    );


    selectedTemplate = null;


    updateModalButton();

  }


  function closeModal() {

    var modal =
      $("#documentModal");


    if (!modal) {
      return;
    }


    modal.classList.add(
      "hidden"
    );


    modal.setAttribute(
      "aria-hidden",
      "true"
    );


    document.body.classList.remove(
      "modal-open"
    );


    selectedTemplate = null;

  }


  function renderTemplateSelector() {

    var box =
      $("#templateSelector");


    if (!box) {
      return;
    }


    box.innerHTML = "";


    getTemplates().forEach(
      function (template) {

        var item =
          document.createElement(
            "button"
          );


        item.type =
          "button";


        item.className =
          "template-option";


        item.innerHTML =

          '<span class="template-option-icon">' +

            escapeHtml(
              template.icon || "📄"
            ) +

          '</span>' +


          '<span class="template-option-content">' +

            '<strong>' +

              escapeHtml(
                template.name || ""
              ) +

            '</strong>' +


            '<small>' +

              escapeHtml(
                template.description || ""
              ) +

            '</small>' +

          '</span>' +


          '<span class="template-option-check">' +
            "✓" +
          '</span>';


        item.addEventListener(
          "click",
          function () {

            selectedTemplate =
              template;


            $$(".template-option")
              .forEach(
                function (element) {

                  element.classList.remove(
                    "selected"
                  );

                }
              );


            item.classList.add(
              "selected"
            );


            updateModalButton();

          }
        );


        box.appendChild(
          item
        );

      }
    );

  }


  function updateModalButton() {

    var button =
      $("#openTemplate");


    if (!button) {
      return;
    }


    button.disabled =
      !selectedTemplate;

  }


  function openSelectedTemplate() {

    if (!selectedTemplate) {
      return;
    }


    openTemplate(
      selectedTemplate
    );

  }


  /* ==========================================
     OPEN TEMPLATE
     ========================================== */

  function openTemplate(template) {

    if (
      !template ||
      !template.file
    ) {
      return;
    }


    saveRecentDocument(
      template
    );


    window.location.href =
      template.file;

  }


  /* ==========================================
     HISTORY STORAGE
     ========================================== */

  var HISTORY_KEY =
    "GROVA_DOCUMENT_RECENT";


  function getRecentDocuments() {

    try {

      var raw =
        localStorage.getItem(
          HISTORY_KEY
        );


      if (!raw) {
        return [];
      }


      var parsed =
        JSON.parse(raw);


      if (!Array.isArray(parsed)) {
        return [];
      }


      return parsed.filter(
        function (item) {

          return item &&
                 typeof item === "object";

        }
      );

    } catch (error) {

      console.warn(
        "Không thể đọc lịch sử.",
        error
      );

      return [];

    }

  }


  /* ==========================================
     SAVE HISTORY
     ========================================== */

  function saveRecentDocument(template) {

    if (!template) {
      return;
    }


    var list =
      getRecentDocuments();


    var activity = {

      id:
        template.id || "",

      code:
        template.code || "",

      name:
        template.name || "",

      title:
        template.title || "",

      description:
        template.description || "",

      category:
        template.category || "Văn bản",

      icon:
        template.icon || "📄",

      file:
        template.file || "",

      action:
        "Mở văn bản",

      createdAt:
        new Date().toISOString()

    };


    list.unshift(
      activity
    );


    /*
     * Giữ tối đa 20 hoạt động.
     */

    list =
      list.slice(0, 20);


    try {

      localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(list)
      );

    } catch (error) {

      console.warn(
        "Không thể lưu hoạt động gần đây.",
        error
      );

    }


    renderRecentDocuments();

    renderHistoryDocuments();

    updateStats();

  }


  /* ==========================================
     FORMAT TIME
     ========================================== */

  function formatRecentTime(value) {

    if (!value) {
      return "";
    }


    var date =
      new Date(value);


    if (isNaN(date.getTime())) {
      return "";
    }


    var now =
      new Date();


    var diff =
      now.getTime() -
      date.getTime();


    var minute =
      60 * 1000;


    var hour =
      60 * minute;


    var day =
      24 * hour;


    if (diff < 0) {
      diff = 0;
    }


    if (diff < minute) {

      return "Vừa xong";

    }


    if (diff < hour) {

      return (
        Math.floor(
          diff / minute
        ) +
        " phút trước"
      );

    }


    if (diff < day) {

      return (
        Math.floor(
          diff / hour
        ) +
        " giờ trước"
      );

    }


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
     CREATE HISTORY ROW
     ========================================== */

  function createHistoryRow(item) {

    var row =
      document.createElement(
        "button"
      );


    row.type =
      "button";


    row.className =
      "recent-row";


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
            item.name ||
            item.title ||
            "Văn bản"
          ) +

        '</strong>' +


        '<small>' +

          '<span>' +

            escapeHtml(
              item.code || ""
            ) +

          '</span>' +


          '<span class="recent-row-separator">' +
            "•" +
          '</span>' +


          '<span>' +

            escapeHtml(
              item.action ||
              "Mở văn bản"
            ) +

          '</span>' +


          '<span class="recent-row-separator">' +
            "•" +
          '</span>' +


          '<span class="recent-time">' +

            escapeHtml(
              formatRecentTime(
                item.createdAt
              )
            ) +

          '</span>' +

        '</small>' +

      '</span>' +


      '<span class="recent-row-arrow">' +
        "→" +
      '</span>';


    row.addEventListener(
      "click",
      function () {

        if (!item.file) {
          return;
        }


        /*
         * Mở lại văn bản.
         * Không ghi thêm lịch sử.
         */

        window.location.href =
          item.file;

      }
    );


    return row;

  }


  /* ==========================================
     EMPTY STATE
     ========================================== */

  function renderEmptyState(
    container,
    history
  ) {

    if (!container) {
      return;
    }


    container.innerHTML =

      '<div class="empty-state">' +

        '<div class="empty-icon">' +
          "◷" +
        '</div>' +


        '<h3>' +
          "Chưa có lịch sử" +
        '</h3>' +


        '<p>' +

          (
            history
              ? "Các văn bản được mở và xử lý sẽ xuất hiện tại đây."
              : "Các văn bản được mở sẽ xuất hiện tại đây."
          ) +

        '</p>' +

      '</div>';

  }


  /* ==========================================
     HISTORY CONTAINER
     ========================================== */

  function ensureHistoryContainer() {

    var page =
      $("#page-history");


    if (!page) {
      return null;
    }


    var container =
      $("#historyDocuments");


    if (container) {
      return container;
    }


    /*
     * index.html hiện tại chưa có
     * #historyDocuments.
     *
     * Tạo container ngay bên trong
     * trang Lịch sử để app.js tự quản lý.
     */

    var existingEmpty =
      page.querySelector(
        ".empty-state"
      );


    container =
      document.createElement(
        "div"
      );


    container.id =
      "historyDocuments";


    container.className =
      "activity-list history-list";


    if (existingEmpty) {

      existingEmpty.parentNode.replaceChild(
        container,
        existingEmpty
      );

    } else {

      page.appendChild(
        container
      );

    }


    return container;

  }


  /* ==========================================
     DASHBOARD RECENT
     ========================================== */

  function renderRecentDocuments() {

    var container =
      $("#recentDocuments");


    if (!container) {
      return;
    }


    var list =
      getRecentDocuments();


    /*
     * Dashboard chỉ hiển thị
     * 4 hoạt động mới nhất.
     */

    var recent =
      list.slice(0, 4);


    if (!recent.length) {

      renderEmptyState(
        container,
        false
      );

      return;

    }


    container.innerHTML = "";


    recent.forEach(
      function (item) {

        container.appendChild(
          createHistoryRow(item)
        );

      }
    );

  }


  /* ==========================================
     HISTORY PAGE
     ========================================== */

    /* ==========================================
     HISTORY PAGE
     ========================================== */

  function renderHistoryDocuments() {

    /*
     * Trang Lịch sử hiện tại trong index.html
     * dùng #recentDocuments.
     *
     * Dashboard cũng có #recentDocuments,
     * vì vậy phải tìm riêng bên trong
     * #page-history.
     */

    var historyPage =
      $("#page-history");


    if (!historyPage) {
      return;
    }


    var container =
      historyPage.querySelector(
        "#historyDocuments"
      );


    /*
     * Nếu không có #historyDocuments,
     * sử dụng #recentDocuments của riêng
     * trang Lịch sử.
     */

    if (!container) {

      container =
        historyPage.querySelector(
          "#recentDocuments"
        );

    }


    if (!container) {
      return;
    }


    var list =
      getRecentDocuments();


    if (!list.length) {

      renderEmptyState(
        container,
        true
      );

      return;

    }


    container.innerHTML = "";


    /* ========================================
       THANH CÔNG CỤ
       ======================================== */

    var toolbar =
      document.createElement(
        "div"
      );


    toolbar.className =
      "history-toolbar";


    var count =
      document.createElement(
        "span"
      );


    count.className =
      "history-count";


    count.textContent =
      list.length +
      " hoạt động";


    toolbar.appendChild(
      count
    );


    var clear =
      document.createElement(
        "button"
      );


    clear.type =
      "button";


    clear.className =
      "secondary-button history-clear-button";


    clear.textContent =
      "Xóa lịch sử";


    clear.addEventListener(
      "click",
      function () {

        var confirmed =
          window.confirm(
            "Bạn có chắc muốn xóa toàn bộ lịch sử hoạt động?"
          );


        if (!confirmed) {
          return;
        }


        try {

          localStorage.removeItem(
            "GROVA_DOCUMENT_RECENT"
          );

        } catch (error) {

          console.warn(
            "Không thể xóa lịch sử.",
            error
          );

        }


        renderRecentDocuments();

        renderHistoryDocuments();

        updateStats();

      }
    );


    toolbar.appendChild(
      clear
    );


    container.appendChild(
      toolbar
    );


    /* ========================================
       DANH SÁCH LỊCH SỬ
       ======================================== */

    list.forEach(
      function (item) {

        container.appendChild(
          createHistoryRow(item)
        );

      }
    );

  } {

    var container =
      ensureHistoryContainer();


    if (!container) {
      return;
    }


    var list =
      getRecentDocuments();


    if (!list.length) {

      renderEmptyState(
        container,
        true
      );

      return;

    }


    container.innerHTML = "";


    /*
     * Thanh công cụ lịch sử.
     */

    var toolbar =
      document.createElement(
        "div"
      );


    toolbar.className =
      "history-toolbar";


    var count =
      document.createElement(
        "span"
      );


    count.className =
      "history-count";


    count.textContent =
      list.length +
      " hoạt động";


    toolbar.appendChild(
      count
    );


    var clear =
      document.createElement(
        "button"
      );


    clear.type =
      "button";


    clear.className =
      "secondary-button history-clear-button";


    clear.textContent =
      "Xóa lịch sử";


    clear.addEventListener(
      "click",
      function () {

        var confirmed =
          window.confirm(
            "Bạn có chắc muốn xóa toàn bộ lịch sử hoạt động?"
          );


        if (!confirmed) {
          return;
        }


        try {

          localStorage.removeItem(
            HISTORY_KEY
          );

        } catch (error) {

          console.warn(
            "Không thể xóa lịch sử.",
            error
          );

        }


        renderRecentDocuments();

        renderHistoryDocuments();

        updateStats();

      }
    );


    toolbar.appendChild(
      clear
    );


    container.appendChild(
      toolbar
    );


    /*
     * Hiển thị toàn bộ tối đa 20 hoạt động.
     */

    list.forEach(
      function (item) {

        container.appendChild(
          createHistoryRow(item)
        );

      }
    );

  }


  /* ==========================================
     REFRESH TIME
     ========================================== */

  function refreshRecentTimes() {

    var rows =
      $$(".recent-row");


    if (!rows.length) {
      return;
    }


    var list =
      getRecentDocuments();


    rows.forEach(
      function (row) {

        var id =
          row.getAttribute(
            "data-template-id"
          );


        var item =
          list.find(
            function (entry) {

              return String(
                entry.id || ""
              ) === String(
                id || ""
              );

            }
          );


        if (!item) {
          return;
        }


        var time =
          row.querySelector(
            ".recent-time"
          );


        if (time) {

          time.textContent =
            formatRecentTime(
              item.createdAt
            );

        }

      }
    );

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

      pageName =
        "dashboard";

    }


    /*
     * Hỗ trợ cả cấu trúc hiện tại:
     * .page
     * .active-page
     */

    $$(".page").forEach(
      function (page) {

        page.classList.remove(
          "active"
        );

        page.classList.remove(
          "active-page"
        );

      }
    );


    var target =
      $("#page-" + pageName);


    if (target) {

      target.classList.add(
        "active-page"
      );

    }


    $$(".menu-item").forEach(
      function (item) {

        item.classList.toggle(
          "active",
          item.getAttribute(
            "data-page"
          ) === pageName
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
     * Dashboard.
     */

    if (pageName === "dashboard") {

      renderRecentDocuments();

      updateStats();

    }


    /*
     * Văn bản.
     */

    if (pageName === "documents") {

      renderDocumentsPage();

    }


    /*
     * Lịch sử.
     */

    if (pageName === "history") {

      renderHistoryDocuments();

    }


    closeSidebarMobile();

  }


  function bindNavigation() {

    /*
     * Menu bên trái.
     */

    $$(".menu-item").forEach(
      function (item) {

        item.addEventListener(
          "click",
          function () {

            showPage(
              item.getAttribute(
                "data-page"
              )
            );

          }
        );

      }
    );


    /*
     * Các nút dùng data-page-target.
     */

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


    /*
     * Nút "Xem tất cả" ở Dashboard
     * của index.html hiện tại dùng:
     *
     * data-page="history"
     */

    $$(".text-button[data-page]").forEach(
      function (button) {

        button.addEventListener(
          "click",
          function () {

            showPage(
              button.getAttribute(
                "data-page"
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


    sidebar.classList.add(
      "open"
    );


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


    sidebar.classList.remove(
      "open"
    );


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

          /*
           * index.html hiện tại dùng
           * .modal-overlay.
           */

          if (
            event.target === modal ||
            event.target.classList.contains(
              "modal-overlay"
            )
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

    syncDashboardCards();

    renderDocumentsPage();

    renderRecentDocuments();

    renderHistoryDocuments();

    updateStats();

    bindNavigation();

    bindSidebar();

    bindModal();

  }


  /* ==========================================
     PUBLIC API
     ========================================== */

  window.GROVA_DOCUMENT = {

    data:
      DATA,

    templates:
      templates,

    showPage:
      showPage,

    openModal:
      openModal,

    closeModal:
      closeModal,

    openTemplate:
      openTemplate,

    getRecentDocuments:
      getRecentDocuments,

    saveRecentDocument:
      saveRecentDocument,

    renderRecentDocuments:
      renderRecentDocuments,

    renderHistoryDocuments:
      renderHistoryDocuments,

    updateStats:
      updateStats,

    clearHistory:
      function () {

        try {

          localStorage.removeItem(
            HISTORY_KEY
          );

        } catch (error) {

          console.warn(
            "Không thể xóa lịch sử.",
            error
          );

        }


        renderRecentDocuments();

        renderHistoryDocuments();

        updateStats();

      },

    refresh:
      init

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


  /* ==========================================
     UPDATE TIME
     ========================================== */

  window.setInterval(
    function () {

      refreshRecentTimes();

    },
    60 * 1000
  );


})();