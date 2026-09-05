/* =========================================================
   GROVA DOCUMENT
   app.js
   Version 1.2
   Compatible with current index.html
   ========================================================= */

(function () {
    "use strict";


    /* =====================================================
       STATE
    ===================================================== */

    const state = {
        currentPage: "dashboard",
        selectedTemplate: null,
        initialized: false
    };


    /* =====================================================
       HELPERS
    ===================================================== */

    function $(selector, parent) {
        return (parent || document).querySelector(selector);
    }


    function $$(selector, parent) {
        return Array.from(
            (parent || document).querySelectorAll(selector)
        );
    }


    function escapeHTML(value) {

        if (
            value === null ||
            value === undefined
        ) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }


    /* =====================================================
       DATA
    ===================================================== */

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

        if (
            !Array.isArray(data.templates)
        ) {
            return [];
        }

        return data.templates.filter(
            function (template) {

                return (
                    template &&
                    template.enabled !== false
                );

            }
        );
    }


    function getTemplateById(id) {

        return getTemplates().find(
            function (template) {

                return String(
                    template.id ??
                    template.code
                ) === String(id);

            }
        );
    }


    /* =====================================================
       PAGE CONFIG
    ===================================================== */

    const PAGE_CONFIG = {

        dashboard: {
            title: "Tổng quan",
            subtitle:
                "Hệ thống quản lý hồ sơ và văn bản"
        },

        documents: {
            title: "Văn bản",
            subtitle:
                "Quản lý và tạo các mẫu văn bản GROVA"
        },

        projects: {
            title: "Công trình",
            subtitle:
                "Quản lý dữ liệu công trình"
        },

        customers: {
            title: "Khách hàng",
            subtitle:
                "Quản lý thông tin khách hàng"
        },

        employees: {
            title: "Nhân sự",
            subtitle:
                "Quản lý hồ sơ nhân sự"
        },

        history: {
            title: "Lịch sử",
            subtitle:
                "Theo dõi các văn bản đã tạo và xuất PDF"
        },

        reports: {
            title: "Báo cáo",
            subtitle:
                "Tổng hợp dữ liệu hồ sơ và công trình"
        },

        settings: {
            title: "Cài đặt",
            subtitle:
                "Cấu hình GROVA DOCUMENT"
        },

        admin: {
            title: "Quản trị hệ thống",
            subtitle:
                "Quản lý người dùng, mẫu văn bản và cấu hình hệ thống"
        }

    };


    /* =====================================================
       HEADER
    ===================================================== */

    function updateHeader(page) {

        const config =
            PAGE_CONFIG[page] ||
            PAGE_CONFIG.dashboard;

        const title =
            $("#pageTitle");

        const subtitle =
            $("#pageSubtitle");

        if (title) {
            title.textContent =
                config.title;
        }

        if (subtitle) {
            subtitle.textContent =
                config.subtitle;
        }
    }


    /* =====================================================
       USER
    ===================================================== */

    function renderUser() {

        const data =
            getAppData();

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

        const nameElement =
            $("#currentUserName");

        const roleElement =
            $("#currentUserRole");

        const avatar =
            $(".user-avatar");

        if (nameElement) {
            nameElement.textContent =
                name;
        }

        if (roleElement) {
            roleElement.textContent =
                role;
        }

        if (avatar) {

            const words =
                String(name)
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
                    String(name)
                        .substring(0, 2)
                        .toUpperCase();

            }
        }
    }


    /* =====================================================
       STATS
    ===================================================== */

    function renderStats() {

        const data =
            getAppData();

        const stats =
            data.stats || {};

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


        const mapping = {

            documents:
                "#statDocuments",

            projects:
                "#statProjects",

            customers:
                "#statCustomers",

            employees:
                "#statEmployees"

        };


        Object.keys(mapping).forEach(
            function (key) {

                const element =
                    $(mapping[key]);

                if (element) {

                    element.textContent =
                        values[key];

                }

            }
        );
    }


    /* =====================================================
       DOCUMENT CARD
    ===================================================== */

    function createDocumentCard(
        template
    ) {

        const id =
            template.id ??
            template.code ??
            "";

        const name =
            template.name ??
            template.title ??
            `Mẫu ${id}`;

        const description =
            template.description ??
            "";

        const category =
            template.category ??
            "Văn bản";


        return `

            <article
                class="document-card"
                data-template-id="${escapeHTML(id)}"
            >

                <div class="document-card-top">

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


                <div class="document-card-footer">

                    <span class="document-category">
                        Mẫu ${escapeHTML(id)}
                    </span>


                    <button
                        type="button"
                        class="document-action"
                        data-action="open-template"
                        data-template-id="${escapeHTML(id)}"
                    >
                        Mở mẫu →
                    </button>

                </div>

            </article>

        `;
    }


    /* =====================================================
       RENDER DOCUMENTS
    ===================================================== */

    function renderDocuments() {

        const templates =
            getTemplates();


        const dashboardGrid =
            $("#documentGrid");

        const documentsGrid =
            $("#documentsPageGrid");


        if (
            !templates.length
        ) {

            const emptyHTML = `

                <div class="empty-state">

                    <div class="empty-icon">
                        ▤
                    </div>

                    <h3>
                        Chưa có mẫu văn bản
                    </h3>

                    <p>
                        Kiểm tra cấu hình trong
                        data/data.js.
                    </p>

                </div>

            `;


            if (dashboardGrid) {
                dashboardGrid.innerHTML =
                    emptyHTML;
            }

            if (documentsGrid) {
                documentsGrid.innerHTML =
                    emptyHTML;
            }

            return;
        }


        const html =
            templates
                .map(createDocumentCard)
                .join("");


        if (dashboardGrid) {

            dashboardGrid.innerHTML =
                html;

        }


        if (documentsGrid) {

            documentsGrid.innerHTML =
                html;

        }
    }


    /* =====================================================
       RECENT DOCUMENTS
    ===================================================== */

    function renderRecentDocuments() {

        const container =
            $("#recentDocuments");

        if (!container) {
            return;
        }


        const data =
            getAppData();

        const recent =
            Array.isArray(
                data.recentDocuments
            )
                ? data.recentDocuments
                : [];


        if (!recent.length) {

            container.innerHTML = `

                <div class="empty-state">

                    <div class="empty-icon">
                        ◷
                    </div>

                    <h3>
                        Chưa có hoạt động
                    </h3>

                    <p>
                        Các hồ sơ vừa xử lý
                        sẽ xuất hiện tại đây.
                    </p>

                </div>

            `;

            return;
        }


        container.innerHTML =
            recent
                .map(
                    function (item) {

                        const name =
                            item.name ||
                            item.title ||
                            "Văn bản";

                        const date =
                            item.date ||
                            item.createdAt ||
                            "";


                        return `

                            <div
                                class="activity-item"
                            >

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

                    }
                )
                .join("");
    }


    /* =====================================================
       PAGE SWITCH
    ===================================================== */

    function switchPage(page) {

        const pageElement =
            document.getElementById(
                "page-" + page
            );

        if (!pageElement) {

            console.warn(
                "Không tìm thấy page:",
                page
            );

            return;
        }


        $$(".page").forEach(
            function (element) {

                element.classList.remove(
                    "active-page"
                );

                element.classList.add(
                    "hidden"
                );

            }
        );


        pageElement.classList.remove(
            "hidden"
        );

        pageElement.classList.add(
            "active-page"
        );


        $$(".menu-item").forEach(
            function (item) {

                if (
                    item.dataset.page ===
                    page
                ) {

                    item.classList.add(
                        "active"
                    );

                } else {

                    item.classList.remove(
                        "active"
                    );

                }

            }
        );


        state.currentPage =
            page;


        updateHeader(page);


        closeSidebar();


        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }


    /* =====================================================
       NAVIGATION
    ===================================================== */

    function bindNavigation() {

        $$(".menu-item[data-page]")
            .forEach(
                function (item) {

                    item.addEventListener(
                        "click",
                        function (event) {

                            event.preventDefault();

                            switchPage(
                                item.dataset.page
                            );

                        }
                    );

                }
            );


        /*
         * Các nút "Xem tất cả"
         */

        $$("[data-page]").forEach(
            function (element) {

                if (
                    element.classList.contains(
                        "menu-item"
                    )
                ) {
                    return;
                }


                element.addEventListener(
                    "click",
                    function (event) {

                        const page =
                            element.dataset.page;

                        if (!page) {
                            return;
                        }

                        event.preventDefault();

                        switchPage(page);

                    }
                );

            }
        );
    }


    /* =====================================================
       MODAL
    ===================================================== */

    function getModal() {

        return $("#documentModal");
    }


    function openModal() {

        const modal =
            getModal();

        if (!modal) {
            return;
        }


        renderTemplateSelector();


        modal.classList.remove(
            "hidden"
        );

        modal.classList.add(
            "open"
        );

        modal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.style.overflow =
            "hidden";
    }


    function closeModal() {

        const modal =
            getModal();

        if (!modal) {
            return;
        }


        modal.classList.remove(
            "open"
        );

        modal.classList.add(
            "hidden"
        );

        modal.setAttribute(
            "aria-hidden",
            "true"
        );


        document.body.style.overflow =
            "";
    }


    /* =====================================================
       TEMPLATE SELECTOR
    ===================================================== */

    function renderTemplateSelector() {

        const container =
            $("#templateSelector");

        if (!container) {
            return;
        }


        const templates =
            getTemplates();


        if (!templates.length) {

            container.innerHTML = `

                <div class="empty-state">

                    <div class="empty-icon">
                        ▤
                    </div>

                    <h3>
                        Chưa có mẫu văn bản
                    </h3>

                    <p>
                        Không tìm thấy mẫu trong data.js.
                    </p>

                </div>

            `;

            return;
        }


        container.innerHTML =
            templates
                .map(
                    function (template) {

                        const id =
                            template.id ??
                            template.code ??
                            "";

                        const name =
                            template.name ??
                            template.title ??
                            `Mẫu ${id}`;

                        const description =
                            template.description ??
                            "";


                        return `

                            <button
                                type="button"
                                class="template-option"
                                data-template-id="${escapeHTML(id)}"
                            >

                                <span class="template-option-number">
                                    ${escapeHTML(id)}
                                </span>


                                <span class="template-option-content">

                                    <strong>
                                        ${escapeHTML(name)}
                                    </strong>

                                    <small>
                                        ${escapeHTML(description)}
                                    </small>

                                </span>

                            </button>

                        `;

                    }
                )
                .join("");


        updateTemplateSelection();
    }


    /* =====================================================
       SELECT TEMPLATE
    ===================================================== */

    function selectTemplate(id) {

        const template =
            getTemplateById(id);

        if (!template) {

            console.warn(
                "Không tìm thấy template:",
                id
            );

            return;
        }


        state.selectedTemplate =
            String(
                template.id ??
                template.code
            );


        updateTemplateSelection();
    }


    function updateTemplateSelection() {

        $$(".template-option")
            .forEach(
                function (option) {

                    const isSelected =
                        String(
                            option.dataset.templateId
                        ) ===
                        String(
                            state.selectedTemplate
                        );


                    option.classList.toggle(
                        "selected",
                        isSelected
                    );

                }
            );
    }


    /* =====================================================
       OPEN NEW DOCUMENT
    ===================================================== */

    function openNewDocument() {

        state.selectedTemplate =
            null;

        openModal();
    }


    /* =====================================================
       OPEN SELECTED TEMPLATE
    ===================================================== */

    function openSelectedTemplate() {

        let id =
            state.selectedTemplate;


        /*
         * Nếu chưa chọn bằng click,
         * lấy option đang selected.
         */

        if (!id) {

            const selected =
                $(".template-option.selected");

            if (selected) {

                id =
                    selected.dataset.templateId;

            }

        }


        if (!id) {

            alert(
                "Vui lòng chọn một mẫu văn bản."
            );

            return;
        }


        const template =
            getTemplateById(id);


        if (!template) {

            alert(
                "Không tìm thấy mẫu văn bản."
            );

            return;
        }


        const file =
            template.file ||
            template.path ||
            template.url;


        if (!file) {

            alert(
                "Mẫu văn bản chưa được cấu hình đường dẫn."
            );

            return;
        }


        closeModal();


        /*
         * Đảm bảo đường dẫn luôn tính từ thư mục
         * GROVA-DOCUMENT.
         */

        let target = file;


        if (
            target.startsWith("./")
        ) {

            target =
                target.substring(2);

        }


        window.location.href =
            "./" + target;
    }


    /* =====================================================
       ACTIONS
    ===================================================== */

    function bindActions() {

        /*
         * Tạo văn bản
         */

        $$(
            "[data-action='new-document']"
        ).forEach(
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


        /*
         * Mở mẫu
         */

        document.addEventListener(
            "click",
            function (event) {

                const button =
                    event.target.closest(
                        "[data-action='open-template']"
                    );


                if (!button) {
                    return;
                }


                event.preventDefault();


                const id =
                    button.dataset.templateId;


                if (id) {

                    const template =
                        getTemplateById(id);


                    if (!template) {

                        alert(
                            "Không tìm thấy mẫu văn bản."
                        );

                        return;
                    }


                    const file =
                        template.file ||
                        template.path ||
                        template.url;


                    if (!file) {

                        alert(
                            "Mẫu văn bản chưa có đường dẫn."
                        );

                        return;
                    }


                    let target = file;


                    if (
                        target.startsWith("./")
                    ) {

                        target =
                            target.substring(2);

                    }


                    window.location.href =
                        "./" + target;

                }

            }
        );


        /*
         * Chọn mẫu trong modal
         */

        document.addEventListener(
            "click",
            function (event) {

                const option =
                    event.target.closest(
                        ".template-option"
                    );


                if (!option) {
                    return;
                }


                event.preventDefault();


                selectTemplate(
                    option.dataset.templateId
                );

            }
        );


        /*
         * Nút Mở mẫu
         */

        const openButton =
            $("#openTemplate");


        if (openButton) {

            openButton.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    openSelectedTemplate();

                }
            );

        }


        /*
         * Nút Hủy
         */

        const cancelButton =
            $("#cancelModal");


        if (cancelButton) {

            cancelButton.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    closeModal();

                }
            );

        }


        /*
         * Nút X đóng modal
         */

        const closeButton =
            $("#closeModal");


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    closeModal();

                }
            );

        }


        /*
         * Click nền modal
         */

        const modal =
            $("#documentModal");


        if (modal) {

            const overlay =
                $(".modal-overlay", modal);


            if (overlay) {

                overlay.addEventListener(
                    "click",
                    function () {

                        closeModal();

                    }
                );

            }

        }

    }


    /* =====================================================
       SIDEBAR
    ===================================================== */

    function openSidebar() {

        const sidebar =
            $("#sidebar");

        if (!sidebar) {
            return;
        }


        sidebar.classList.add(
            "open"
        );


        let backdrop =
            $(".sidebar-backdrop");


        if (!backdrop) {

            backdrop =
                document.createElement(
                    "div"
                );

            backdrop.className =
                "sidebar-backdrop";


            backdrop.addEventListener(
                "click",
                closeSidebar
            );


            document.body.appendChild(
                backdrop
            );
        }


        backdrop.classList.add(
            "active"
        );
    }


    function closeSidebar() {

        const sidebar =
            $("#sidebar");


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

        const openButton =
            $("#openSidebar");


        const closeButton =
            $("#closeSidebar");


        if (openButton) {

            openButton.addEventListener(
                "click",
                function () {

                    openSidebar();

                }
            );

        }


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                function () {

                    closeSidebar();

                }
            );

        }

    }


    /* =====================================================
       KEYBOARD
    ===================================================== */

    function bindKeyboard() {

        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key ===
                    "Escape"
                ) {

                    closeModal();

                    closeSidebar();

                }

            }
        );
    }


    /* =====================================================
       REFRESH
    ===================================================== */

    function refresh() {

        renderUser();

        renderStats();

        renderDocuments();

        renderRecentDocuments();

        updateHeader(
            state.currentPage
        );
    }


    /* =====================================================
       SERVICE WORKER
    ===================================================== */

    function registerServiceWorker() {

        /*
         * index.html đã có đoạn đăng ký Service Worker.
         *
         * Vì vậy app.js KHÔNG đăng ký lần nữa.
         *
         * Tránh đăng ký trùng.
         */
    }


    /* =====================================================
       INIT
    ===================================================== */

    function init() {

        if (
            state.initialized
        ) {
            return;
        }


        state.initialized =
            true;


        bindNavigation();

        bindActions();

        bindSidebar();

        bindKeyboard();


        refresh();


        /*
         * Đảm bảo dashboard là trang mặc định.
         */

        const dashboard =
            $("#page-dashboard");


        const activePage =
            $(".page.active-page");


        if (activePage) {

            const id =
                activePage.id;


            if (
                id &&
                id.startsWith(
                    "page-"
                )
            ) {

                state.currentPage =
                    id.substring(5);

            }

        } else if (dashboard) {

            switchPage(
                "dashboard"
            );

        }

    }


    /* =====================================================
       PUBLIC API
    ===================================================== */

    window.GROVA_DOCUMENT = {

        state,

        getAppData,

        getTemplates,

        getTemplateById,

        switchPage,

        openNewDocument,

        openSelectedTemplate,

        selectTemplate,

        closeModal,

        openSidebar,

        closeSidebar,

        refresh,

        init

    };


    /* =====================================================
       START
    ===================================================== */

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