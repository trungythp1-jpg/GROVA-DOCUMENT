/*
 * ============================================================
 * GROVA DOCUMENT
 * Application Controller
 * ============================================================
 *
 * File này:
 * - Đọc cấu hình từ window.GROVA_DATA
 * - Hiển thị danh sách mẫu văn bản
 * - Điều hướng các trang
 * - Mở modal chọn mẫu
 * - Mở đúng file template
 * - Hiển thị thống kê
 * - Hiển thị hoạt động gần đây
 *
 * Không chứa nội dung của các mẫu văn bản.
 * ============================================================
 */

(function () {

    "use strict";


    /* ========================================================
       GLOBAL DATA
    ======================================================== */

    var DATA = window.GROVA_DATA;


    /* ========================================================
       DOM HELPERS
    ======================================================== */

    function $(selector) {
        return document.querySelector(selector);
    }


    function $all(selector) {
        return Array.prototype.slice.call(
            document.querySelectorAll(selector)
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


    /* ========================================================
       ERROR STATE
    ======================================================== */

    function showApplicationError(message) {

        console.error(
            "[GROVA DOCUMENT]",
            message
        );

        var grids = [
            $("#documentGrid"),
            $("#documentsPageGrid")
        ];

        grids.forEach(function (grid) {

            if (!grid) {
                return;
            }

            grid.innerHTML = `
                <div class="empty-state grova-error-state">

                    <div class="empty-icon">
                        !
                    </div>

                    <h3>
                        Không thể tải danh sách văn bản
                    </h3>

                    <p>
                        ${escapeHTML(message)}
                    </p>

                    <button
                        type="button"
                        class="primary-button"
                        onclick="window.location.reload()"
                    >
                        Tải lại trang
                    </button>

                </div>
            `;

        });

    }


    /* ========================================================
       VALIDATE DATA
    ======================================================== */

    function validateData() {

        if (!DATA) {

            showApplicationError(
                "Không tìm thấy GROVA_DATA. Hãy kiểm tra file data/data.js."
            );

            return false;
        }


        if (!Array.isArray(DATA.templates)) {

            showApplicationError(
                "Danh sách templates không hợp lệ trong data/data.js."
            );

            return false;
        }


        return true;
    }


    /* ========================================================
       TEMPLATE DATA
    ======================================================== */

    function getTemplates() {

        if (
            !DATA ||
            !Array.isArray(DATA.templates)
        ) {
            return [];
        }


        return DATA.templates.filter(function (template) {

            return (
                template &&
                template.enabled !== false
            );

        });

    }


    function getTemplateId(template) {

        if (!template) {
            return "";
        }

        return (
            template.id ||
            template.code ||
            ""
        );

    }


    function getTemplateName(template) {

        if (!template) {
            return "Văn bản";
        }

        return (
            template.name ||
            template.title ||
            "Văn bản"
        );

    }


    function getTemplateDescription(template) {

        if (!template) {
            return "";
        }

        return (
            template.description ||
            ""
        );

    }


    function getTemplateCategory(template) {

        if (!template) {
            return "Văn bản";
        }

        return (
            template.category ||
            "Văn bản"
        );

    }


    function getTemplateIcon(template) {

        if (!template) {
            return "📄";
        }

        return (
            template.icon ||
            "📄"
        );

    }


    function getTemplateFile(template) {

        if (!template) {
            return "";
        }

        return (
            template.file ||
            template.path ||
            ""
        );

    }


    /* ========================================================
       DOCUMENT CARD
    ======================================================== */

    function createDocumentCard(template) {

        var id = getTemplateId(template);

        var name = getTemplateName(template);

        var description =
            getTemplateDescription(template);

        var category =
            getTemplateCategory(template);

        var icon =
            getTemplateIcon(template);


        return `
            <article
                class="document-card"
                data-template-id="${escapeHTML(id)}"
            >

                <div class="document-card-top">

                    <div class="document-icon">
                        ${escapeHTML(icon)}
                    </div>

                    <span class="document-category">
                        ${escapeHTML(category)}
                    </span>

                </div>


                <div class="document-card-body">

                    <h3 class="document-name">
                        ${escapeHTML(name)}
                    </h3>

                    <p class="document-description">
                        ${escapeHTML(description)}
                    </p>

                </div>


                <div class="document-card-footer">

                    <span class="document-code">
                        ${escapeHTML(id)}
                    </span>

                    <span class="document-open">
                        Mở mẫu →
                    </span>

                </div>

            </article>
        `;
    }


    /* ========================================================
       RENDER DOCUMENTS
    ======================================================== */

    function renderDocumentGrid(container) {

        if (!container) {
            return;
        }


        var templates = getTemplates();


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
                        Chưa có mẫu văn bản nào được kích hoạt.
                    </p>

                </div>
            `;

            return;
        }


        container.innerHTML = templates
            .map(createDocumentCard)
            .join("");


        bindDocumentCards(container);
    }


    function renderDocuments() {

        renderDocumentGrid(
            $("#documentGrid")
        );


        renderDocumentGrid(
            $("#documentsPageGrid")
        );
    }


    /* ========================================================
       DOCUMENT CARD EVENTS
    ======================================================== */

    function bindDocumentCards(container) {

        var cards =
            container.querySelectorAll(
                ".document-card"
            );


        Array.prototype.forEach.call(
            cards,
            function (card) {

                card.addEventListener(
                    "click",
                    function () {

                        var id =
                            card.getAttribute(
                                "data-template-id"
                            );


                        var template =
                            getTemplates().find(
                                function (item) {

                                    return (
                                        String(
                                            getTemplateId(item)
                                        ) === String(id)
                                    );

                                }
                            );


                        if (!template) {

                            console.warn(
                                "Không tìm thấy mẫu:",
                                id
                            );

                            return;
                        }


                        openTemplate(template);

                    }
                );

            }
        );

    }


    /* ========================================================
       TEMPLATE MODAL
    ======================================================== */

    var selectedTemplateId = null;


    function getModal() {
        return $("#documentModal");
    }


    function getTemplateSelector() {
        return $("#templateSelector");
    }


    function openModal() {

        var modal =
            getModal();

        var selector =
            getTemplateSelector();


        if (!modal || !selector) {
            return;
        }


        var templates =
            getTemplates();


        if (!templates.length) {

            selector.innerHTML = `
                <div class="empty-state">

                    <div class="empty-icon">
                        ▤
                    </div>

                    <h3>
                        Chưa có mẫu văn bản
                    </h3>

                    <p>
                        Không có mẫu văn bản đang được kích hoạt.
                    </p>

                </div>
            `;

            selectedTemplateId = null;

        } else {

            selectedTemplateId =
                getTemplateId(
                    templates[0]
                );


            selector.innerHTML =
                templates
                    .map(
                        createTemplateSelectorItem
                    )
                    .join("");


            bindTemplateSelector();
        }


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

    }


    function closeModal() {

        var modal =
            getModal();


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

    }


    function createTemplateSelectorItem(template) {

        var id =
            getTemplateId(template);

        var name =
            getTemplateName(template);

        var description =
            getTemplateDescription(template);

        var category =
            getTemplateCategory(template);

        var icon =
            getTemplateIcon(template);


        var selected =
            String(id) ===
            String(selectedTemplateId);


        return `
            <button
                type="button"
                class="template-option ${selected ? "selected" : ""}"
                data-template-id="${escapeHTML(id)}"
            >

                <span class="template-option-icon">
                    ${escapeHTML(icon)}
                </span>


                <span class="template-option-content">

                    <strong>
                        ${escapeHTML(name)}
                    </strong>

                    <small>
                        ${escapeHTML(description)}
                    </small>

                </span>


                <span class="template-option-category">
                    ${escapeHTML(category)}
                </span>

            </button>
        `;
    }


    function bindTemplateSelector() {

        var selector =
            getTemplateSelector();


        if (!selector) {
            return;
        }


        var options =
            selector.querySelectorAll(
                ".template-option"
            );


        Array.prototype.forEach.call(
            options,
            function (option) {

                option.addEventListener(
                    "click",
                    function () {

                        selectedTemplateId =
                            option.getAttribute(
                                "data-template-id"
                            );


                        Array.prototype.forEach.call(
                            options,
                            function (item) {

                                item.classList.remove(
                                    "selected"
                                );

                            }
                        );


                        option.classList.add(
                            "selected"
                        );

                    }
                );

            }
        );

    }


    /* ========================================================
       OPEN TEMPLATE
    ======================================================== */

    function openSelectedTemplate() {

        if (!selectedTemplateId) {
            return;
        }


        var templates =
            getTemplates();


        var template =
            templates.find(
                function (item) {

                    return (
                        String(
                            getTemplateId(item)
                        ) ===
                        String(
                            selectedTemplateId
                        )
                    );

                }
            );


        if (!template) {

            alert(
                "Không tìm thấy mẫu văn bản."
            );

            return;
        }


        openTemplate(template);
    }


    function openTemplate(template) {

        var file =
            getTemplateFile(template);


        if (!file) {

            alert(
                "Mẫu văn bản chưa được cấu hình đường dẫn."
            );

            return;
        }


        var normalizedFile =
            normalizeTemplatePath(file);


        /*
         * Lưu lịch sử mở mẫu.
         */

        saveRecentDocument(
            template
        );


        /*
         * Đóng modal trước khi chuyển trang.
         */

        closeModal();


        /*
         * Mở file template.
         */

        window.location.href =
            normalizedFile;

    }


    function normalizeTemplatePath(path) {

        if (!path) {
            return "";
        }


        var value =
            String(path).trim();


        /*
         * Nếu data.js đã có "./templates/..."
         * thì giữ nguyên.
         */

        if (
            value.indexOf("./") === 0
        ) {
            return value;
        }


        /*
         * Nếu chỉ có "templates/..."
         */

        if (
            value.indexOf("templates/") === 0
        ) {
            return "./" + value;
        }


        return value;

    }


    /* ========================================================
       RECENT DOCUMENTS
    ======================================================== */

    function getRecentDocuments() {

        try {

            var raw =
                localStorage.getItem(
                    "grova_document_recent"
                );


            if (!raw) {
                return [];
            }


            var parsed =
                JSON.parse(raw);


            if (!Array.isArray(parsed)) {
                return [];
            }


            return parsed;

        } catch (error) {

            console.warn(
                "Không thể đọc lịch sử:",
                error
            );

            return [];

        }

    }


    function saveRecentDocument(template) {

        if (!template) {
            return;
        }


        try {

            var recent =
                getRecentDocuments();


            var item = {

                id:
                    getTemplateId(template),

                name:
                    getTemplateName(template),

                category:
                    getTemplateCategory(template),

                time:
                    new Date().toISOString()

            };


            recent =
                recent.filter(
                    function (oldItem) {

                        return (
                            String(oldItem.id) !==
                            String(item.id)
                        );

                    }
                );


            recent.unshift(
                item
            );


            recent =
                recent.slice(
                    0,
                    10
                );


            localStorage.setItem(
                "grova_document_recent",
                JSON.stringify(recent)
            );

        } catch (error) {

            console.warn(
                "Không thể lưu lịch sử:",
                error
            );

        }

    }


    function renderRecentDocuments() {

        var container =
            $("#recentDocuments");


        if (!container) {
            return;
        }


        var recent =
            getRecentDocuments();


        if (!recent.length) {

            container.innerHTML = `
                <div class="empty-state compact-empty">

                    <div class="empty-icon">
                        ◷
                    </div>

                    <h3>
                        Chưa có lịch sử
                    </h3>

                    <p>
                        Các văn bản được tạo sẽ xuất hiện tại đây.
                    </p>

                </div>
            `;

            return;
        }


        container.innerHTML =
            recent
                .map(
                    function (item) {

                        var date =
                            formatDate(
                                item.time
                            );


                        return `
                            <div class="activity-item">

                                <div class="activity-icon">
                                    📄
                                </div>

                                <div class="activity-content">

                                    <strong>
                                        ${escapeHTML(item.name)}
                                    </strong>

                                    <small>
                                        ${escapeHTML(item.category || "Văn bản")}
                                    </small>

                                </div>

                                <time>
                                    ${escapeHTML(date)}
                                </time>

                            </div>
                        `;

                    }
                )
                .join("");

    }


    function formatDate(value) {

        if (!value) {
            return "";
        }


        try {

            var date =
                new Date(value);


            if (
                isNaN(
                    date.getTime()
                )
            ) {
                return "";
            }


            return date.toLocaleDateString(
                "vi-VN",
                {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric"
                }
            );

        } catch (error) {

            return "";

        }

    }


    /* ========================================================
       STATISTICS
    ======================================================== */

    function renderStatistics() {

        var documents =
            $("#statDocuments");

        var projects =
            $("#statProjects");

        var customers =
            $("#statCustomers");

        var employees =
            $("#statEmployees");


        if (documents) {

            documents.textContent =
                getTemplates().length;

        }


        /*
         * Các dữ liệu này hiện vẫn lấy từ data.js.
         * Không tự tạo dữ liệu giả.
         */

        if (projects) {

            projects.textContent =
                getStat(
                    "projects"
                );

        }


        if (customers) {

            customers.textContent =
                getStat(
                    "customers"
                );

        }


        if (employees) {

            employees.textContent =
                getStat(
                    "employees"
                );

        }

    }


    function getStat(key) {

        if (
            DATA &&
            DATA.stats &&
            DATA.stats[key] !== undefined
        ) {

            return DATA.stats[key];

        }


        return 0;

    }


    /* ========================================================
       NAVIGATION
    ======================================================== */

    var pageTitles = {

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
                "Theo dõi các văn bản đã tạo"
        },

        reports: {
            title: "Báo cáo",
            subtitle:
                "Tổng hợp dữ liệu hệ thống"
        },

        settings: {
            title: "Cài đặt",
            subtitle:
                "Cấu hình GROVA DOCUMENT"
        },

        admin: {
            title: "Quản trị hệ thống",
            subtitle:
                "Quản lý người dùng, mẫu văn bản và dữ liệu"
        }

    };


    function showPage(pageName) {

        if (!pageName) {
            pageName = "dashboard";
        }


        var pages =
            $all(
                ".page"
            );


        pages.forEach(
            function (page) {

                page.classList.add(
                    "hidden"
                );

                page.classList.remove(
                    "active-page"
                );

            }
        );


        var target =
            document.getElementById(
                "page-" + pageName
            );


        if (!target) {

            console.warn(
                "Không tìm thấy page:",
                pageName
            );

            target =
                document.getElementById(
                    "page-dashboard"
                );

            pageName =
                "dashboard";

        }


        if (target) {

            target.classList.remove(
                "hidden"
            );

            target.classList.add(
                "active-page"
            );

        }


        /*
         * Active menu
         */

        var menuItems =
            $all(
                ".menu-item[data-page]"
            );


        menuItems.forEach(
            function (item) {

                item.classList.toggle(
                    "active",
                    item.getAttribute(
                        "data-page"
                    ) === pageName
                );

            }
        );


        /*
         * Header
         */

        var title =
            $("#pageTitle");

        var subtitle =
            $("#pageSubtitle");


        var config =
            pageTitles[pageName];


        if (config) {

            if (title) {
                title.textContent =
                    config.title;
            }


            if (subtitle) {
                subtitle.textContent =
                    config.subtitle;
            }

        }


        /*
         * Đóng sidebar mobile
         */

        closeSidebar();

    }


    function bindNavigation() {

        var menuItems =
            $all(
                ".menu-item[data-page]"
            );


        menuItems.forEach(
            function (item) {

                item.addEventListener(
                    "click",
                    function () {

                        var page =
                            item.getAttribute(
                                "data-page"
                            );


                        showPage(
                            page
                        );

                    }
                );

            }
        );


        /*
         * Các nút có data-page nhưng không
         * phải menu item.
         */

        var pageButtons =
            $all(
                "[data-page]:not(.menu-item)"
            );


        pageButtons.forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        var page =
                            button.getAttribute(
                                "data-page"
                            );


                        if (page) {

                            showPage(
                                page
                            );

                        }

                    }
                );

            }
        );

    }


    /* ========================================================
       SIDEBAR
    ======================================================== */

    function openSidebar() {

        var sidebar =
            $("#sidebar");


        if (!sidebar) {
            return;
        }


        sidebar.classList.add(
            "sidebar-open"
        );


        document.body.classList.add(
            "sidebar-open"
        );

    }


    function closeSidebar() {

        var sidebar =
            $("#sidebar");


        if (!sidebar) {
            return;
        }


        sidebar.classList.remove(
            "sidebar-open"
        );


        document.body.classList.remove(
            "sidebar-open"
        );

    }


    function bindSidebar() {

        var openButton =
            $("#openSidebar");

        var closeButton =
            $("#closeSidebar");


        if (openButton) {

            openButton.addEventListener(
                "click",
                openSidebar
            );

        }


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                closeSidebar
            );

        }

    }


    /* ========================================================
       MODAL EVENTS
    ======================================================== */

    function bindModal() {

        var newDocumentButtons =
            $all(
                '[data-action="new-document"]'
            );


        newDocumentButtons.forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        openModal();

                    }
                );

            }
        );


        var closeButton =
            $("#closeModal");

        var cancelButton =
            $("#cancelModal");

        var overlay =
            document.querySelector(
                ".modal-overlay"
            );

        var openButton =
            $("#openTemplate");


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                closeModal
            );

        }


        if (cancelButton) {

            cancelButton.addEventListener(
                "click",
                closeModal
            );

        }


        if (overlay) {

            overlay.addEventListener(
                "click",
                closeModal
            );

        }


        if (openButton) {

            openButton.addEventListener(
                "click",
                openSelectedTemplate
            );

        }


        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Escape"
                ) {

                    var modal =
                        getModal();


                    if (
                        modal &&
                        !modal.classList.contains(
                            "hidden"
                        )
                    ) {

                        closeModal();

                    }

                }

            }
        );

    }


    /* ========================================================
       USER INFORMATION
    ======================================================== */

    function renderUser() {

        var name =
            $("#currentUserName");

        var role =
            $("#currentUserRole");


        if (name) {

            name.textContent =
                "Quản trị viên";

        }


        if (role) {

            role.textContent =
                "Administrator";

        }

    }


    /* ========================================================
       APP INIT
    ======================================================== */

    function init() {

        console.log(
            "GROVA DOCUMENT: khởi tạo ứng dụng..."
        );


        /*
         * Kiểm tra dữ liệu trước.
         */

        if (!validateData()) {
            return;
        }


        console.log(
            "GROVA_DATA:",
            DATA
        );


        console.log(
            "Số mẫu văn bản:",
            getTemplates().length
        );


        /*
         * Render chính.
         */

        renderDocumentGrid(
            $("#documentGrid")
        );


        renderDocumentGrid(
            $("#documentsPageGrid")
        );


        renderRecentDocuments();

        renderStatistics();

        renderUser();


        /*
         * Events.
         */

        bindNavigation();

        bindSidebar();

        bindModal();


        /*
         * Dashboard mặc định.
         */

        showPage(
            "dashboard"
        );


        console.log(
            "GROVA DOCUMENT: khởi tạo hoàn tất."
        );

    }


    /* ========================================================
       DOM READY
    ======================================================== */

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


    /* ========================================================
       PUBLIC API
    ======================================================== */

    window.GROVA_DOCUMENT = {

        openModal:
            openModal,

        closeModal:
            closeModal,

        openTemplate:
            openTemplate,

        showPage:
            showPage,

        render:
            function () {

                renderDocuments();

                renderRecentDocuments();

                renderStatistics();

            }

    };


})();