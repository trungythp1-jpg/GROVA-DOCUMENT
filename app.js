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
     * Dashboard có HTML fallback.
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
     * Ghi nhận hoạt động trước khi
     * chuyển sang trang mẫu.
     */

    saveRecentDocument(template);


    window.location.href = template.file;

  }


  /* ==========================================
     RECENT STORAGE
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


      var parsed =
        JSON.parse(raw);


      if (!Array.isArray(parsed)) {
        return [];
      }


      /*
       * Lọc dữ liệu lỗi.
       */

      return parsed.filter(function (item) {

        return item &&
               typeof item === "object";

      });


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


    /*
     * Hoạt động mới nhất lên đầu.
     */

    list.unshift(activity);


    /*
     * Chỉ giữ tối đa 20 hoạt động.
     */

    list =
      list.slice(0, 20);


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


    /*
     * Trường hợp thời gian tương lai
     * do đồng hồ thiết bị lệch.
     */

    if (diff < 0) {

      diff = 0;

    }


    if (diff < minute) {

      return "Vừa xong";

    }


    if (diff < hour) {

      var minutes =
        Math.floor(
          diff / minute
        );

      return minutes +
        " phút trước";

    }


    if (diff < day) {

      var hours =
        Math.floor(
          diff / hour
        );

      return hours +
        " giờ trước";

    }


    /*
     * Khác ngày:
     * DD/MM/YYYY • HH:MM
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
     CREATE RECENT ROW
     ========================================== */

  function createRecentRow(item) {

    var row =
      document.createElement("button");


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
         * Mở lại văn bản không tạo
         * thêm một dòng lịch sử mới.
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

  function renderRecentEmpty(
    container,
    historyPage
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
            historyPage
              ? "Các văn bản được mở và xử lý sẽ xuất hiện tại đây."
              : "Các văn bản được mở sẽ xuất hiện tại đây."
          ) +

        '</p>' +

      '</div>';

  }


  /* ==========================================
     CLEAR HISTORY BUTTON
     ========================================== */

  function createClearHistoryButton() {

    var button =
      document.createElement("button");


    button.type =
      "button";


    button.className =
      "secondary-button history-clear-button";


    button.textContent =
      "Xóa lịch sử";


    button.addEventListener(
      "click",
      function () {

        var list =
          getRecentDocuments();


        if (!list.length) {
          return;
        }


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

        updateStats();

      }
    );


    return button;

  }


  /* ==========================================
     RENDER RECENT DOCUMENTS
     ========================================== */

  function renderRecentDocuments() {

    /*
     * Có thể có 2 vùng:
     *
     * 1. Dashboard
     * 2. Lịch sử
     *
     * Vì index.html có hai phần
     * dùng cùng id recentDocuments,
     * ta lấy toàn bộ bằng $$().
     */

    var containers =
      $$("#recentDocuments");


    if (!containers.length) {
      return;
    }


    var list =
      getRecentDocuments();


    containers.forEach(
      function (container, index) {

        var isHistoryPage =
          index > 0;


        /*
         * Dashboard chỉ hiện
         * 4 hoạt động gần nhất.
         */

        var displayList =
          isHistoryPage
            ? list
            : list.slice(0, 4);


        if (!displayList.length) {

          renderRecentEmpty(
            container,
            isHistoryPage
          );

          return;

        }


        container.innerHTML = "";


        /*
         * Trang Lịch sử có nút xóa.
         */

        if (isHistoryPage) {

          var historyToolbar =
            document.createElement("div");


          historyToolbar.className =
            "history-toolbar";


          var historyCount =
            document.createElement("span");


          historyCount.className =
            "history-count";


          historyCount.textContent =
            list.length +
            " hoạt động";


          historyToolbar.appendChild(
            historyCount
          );


          historyToolbar.appendChild(
            createClearHistoryButton()
          );


          container.appendChild(
            historyToolbar
          );

        }


        displayList.forEach(
          function (item) {

            container.appendChild(
              createRecentRow(item)
            );

          }
        );

      }
    );

  }


  /* ==========================================
     UPDATE RELATIVE TIMES
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
              ) === String(id || "");

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


    $$(".page").forEach(
      function (page) {

        page.classList.remove(
          "active"
        );

      }
    );


    var target =
      $("#page-" + pageName);


    if (target) {

      target.classList.add(
        "active"
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
     * Luôn render lại khi mở Lịch sử.
     */

    if (pageName === "history") {

      renderRecentDocuments();

    }


    /*
     * Luôn render lại Dashboard
     * khi quay về.
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
              item.getAttribute(
                "data-page"
              )
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
     */

    syncDashboardCards();


    /*
     * Trang Văn bản.
     */

    renderDocumentsPage();


    /*
     * Hoạt động gần đây + Lịch sử.
     */

    renderRecentDocuments();


    /*
     * Thống kê.
     */

    updateStats();


    /*
     * Navigation.
     */

    bindNavigation();


    /*
     * Sidebar.
     */

    bindSidebar();


    /*
     * Modal.
     */

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

    updateStats:
      updateStats,

    clearHistory:
      function () {

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
     REFRESH TIME
     ========================================== */

  /*
   * Cập nhật "Vừa xong",
   * "5 phút trước", "1 giờ trước"...
   * mà không cần tải lại trang.
   */

  window.setInterval(
    function () {

      refreshRecentTimes();

    },
    60 * 1000
  );


})();