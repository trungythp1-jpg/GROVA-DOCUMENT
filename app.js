/*
============================================================
GROVA DOCUMENT
APP.JS
============================================================
*/

(function () {

    "use strict";

    console.log("GROVA DOCUMENT - APP START");


    /* ======================================================
       DATA
    ====================================================== */

    var DATA = window.GROVA_DATA;

    if (!DATA) {

        console.error(
            "GROVA DOCUMENT: Không tìm thấy window.GROVA_DATA"
        );

        return;
    }


    if (!Array.isArray(DATA.templates)) {

        console.error(
            "GROVA DOCUMENT: DATA.templates không phải Array"
        );

        return;
    }


    console.log(
        "GROVA DOCUMENT: Số mẫu:",
        DATA.templates.length
    );


    /* ======================================================
       HELPERS
    ====================================================== */

    function $(id) {
        return document.getElementById(id);
    }


    function escapeHTML(value) {

        return String(
            value == null ? "" : value
        )
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

    }


    function getTemplates() {

        return DATA.templates.filter(
            function (item) {

                return (
                    item &&
                    item.enabled !== false
                );

            }
        );

    }


    /* ======================================================
       DOCUMENT CARD
    ====================================================== */

    function documentCard(template) {

        return `
            <article
                class="document-card"
                data-template-id="${escapeHTML(template.id)}"
            >

                <div class="document-card-top">

                    <div class="document-icon">
                        ${escapeHTML(template.icon || "📄")}
                    </div>

                    <span class="document-category">
                        ${escapeHTML(template.category || "Văn bản")}
                    </span>

                </div>


                <div class="document-card-body">

                    <h3 class="document-name">
                        ${escapeHTML(template.name)}
                    </h3>

                    <p class="document-description">
                        ${escapeHTML(template.description || "")}
                    </p>

                </div>


                <div class="document-card-footer">

                    <span class="document-code">
                        ${escapeHTML(template.code || template.id)}
                    </span>

                    <span class="document-open">
                        Mở mẫu →
                    </span>

                </div>

            </article>
        `;

    }


    /* ======================================================
       RENDER DOCUMENTS
    ====================================================== */

    function renderDocuments() {

        var templates =
            getTemplates();


        var grid =
            $("documentGrid");


        var pageGrid =
            $("documentsPageGrid");


        var html =
            templates
                .map(documentCard)
                .join("");


        if (grid) {

            grid.innerHTML = html;

        }


        if (pageGrid) {

            pageGrid.innerHTML = html;

        }


        console.log(
            "GROVA DOCUMENT: Đã render",
            templates.length,
            "mẫu"
        );

    }


    /* ======================================================
       OPEN TEMPLATE
    ====================================================== */

    function openTemplateById(id) {

        var templates =
            getTemplates();


        var template =
            templates.find(
                function (item) {

                    return String(item.id) ===
                           String(id);

                }
            );


        if (!template) {

            console.error(
                "Không tìm thấy template:",
                id
            );

            return;
        }


        if (!template.file) {

            alert(
                "Mẫu văn bản chưa có đường dẫn."
            );

            return;
        }


        console.log(
            "GROVA DOCUMENT: Mở",
            template.file
        );


        window.location.href =
            template.file;

    }


    /* ======================================================
       CARD CLICK
    ====================================================== */

    function bindDocumentCards() {

        var cards =
            document.querySelectorAll(
                ".document-card"
            );


        cards.forEach(
            function (card) {

                card.addEventListener(
                    "click",
                    function () {

                        var id =
                            card.dataset.templateId;


                        openTemplateById(
                            id
                        );

                    }
                );

            }
        );

    }


    /* ======================================================
       MODAL
    ====================================================== */

    var selectedTemplateId = null;


    function openModal() {

        var modal =
            $("documentModal");


        var selector =
            $("templateSelector");


        if (!modal || !selector) {
            return;
        }


        var templates =
            getTemplates();


        if (!templates.length) {

            selector.innerHTML = `
                <div class="empty-state">

                    <h3>
                        Chưa có mẫu văn bản
                    </h3>

                </div>
            `;

            return;
        }


        selectedTemplateId =
            templates[0].id;


        selector.innerHTML =
            templates
                .map(
                    function (template) {

                        return `
                            <button
                                type="button"
                                class="template-option"
                                data-template-id="${escapeHTML(template.id)}"
                            >

                                <span class="template-option-icon">
                                    ${escapeHTML(template.icon || "📄")}
                                </span>

                                <span class="template-option-content">

                                    <strong>
                                        ${escapeHTML(template.name)}
                                    </strong>

                                    <small>
                                        ${escapeHTML(template.description || "")}
                                    </small>

                                </span>

                                <span class="template-option-category">
                                    ${escapeHTML(template.category || "")}
                                </span>

                            </button>
                        `;

                    }
                )
                .join("");


        var options =
            selector.querySelectorAll(
                ".template-option"
            );


        options.forEach(
            function (option) {

                option.addEventListener(
                    "click",
                    function () {

                        selectedTemplateId =
                            option.dataset.templateId;


                        options.forEach(
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


        if (options.length) {

            options[0].classList.add(
                "selected"
            );

        }


        modal.classList.remove(
            "hidden"
        );


        modal.setAttribute(
            "aria-hidden",
            "false"
        );

    }


    function closeModal() {

        var modal =
            $("documentModal");


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

    }


    function openSelectedTemplate() {

        if (!selectedTemplateId) {
            return;
        }


        openTemplateById(
            selectedTemplateId
        );

    }


    /* ======================================================
       NAVIGATION
    ====================================================== */

    var pageInfo = {

        dashboard: [
            "Tổng quan",
            "Hệ thống quản lý hồ sơ và văn bản"
        ],

        documents: [
            "Văn bản",
            "Quản lý và tạo các mẫu văn bản GROVA"
        ],

        projects: [
            "Công trình",
            "Quản lý dữ liệu công trình"
        ],

        customers: [
            "Khách hàng",
            "Quản lý thông tin khách hàng"
        ],

        employees: [
            "Nhân sự",
            "Quản lý hồ sơ nhân sự"
        ],

        history: [
            "Lịch sử",
            "Theo dõi các văn bản đã tạo"
        ],

        reports: [
            "Báo cáo",
            "Tổng hợp dữ liệu hệ thống"
        ],

        settings: [
            "Cài đặt",
            "Cấu hình GROVA DOCUMENT"
        ],

        admin: [
            "Quản trị hệ thống",
            "Quản lý người dùng, mẫu văn bản và dữ liệu"
        ]

    };


    function showPage(page) {

        var pages =
            document.querySelectorAll(
                ".page"
            );


        pages.forEach(
            function (item) {

                item.classList.add(
                    "hidden"
                );

                item.classList.remove(
                    "active-page"
                );

            }
        );


        var target =
            $("page-" + page);


        if (!target) {

            page = "dashboard";

            target =
                $("page-dashboard");

        }


        if (target) {

            target.classList.remove(
                "hidden"
            );

            target.classList.add(
                "active-page"
            );

        }


        var menus =
            document.querySelectorAll(
                ".menu-item[data-page]"
            );


        menus.forEach(
            function (menu) {

                menu.classList.toggle(
                    "active",
                    menu.dataset.page === page
                );

            }
        );


        if (pageInfo[page]) {

            $("pageTitle").textContent =
                pageInfo[page][0];

            $("pageSubtitle").textContent =
                pageInfo[page][1];

        }

    }


    /* ======================================================
       STATISTICS
    ====================================================== */

    function renderStats() {

        var templates =
            getTemplates();


        if ($("statDocuments")) {

            $("statDocuments").textContent =
                templates.length;

        }


        if ($("statProjects")) {

            $("statProjects").textContent =
                DATA.stats &&
                DATA.stats.projects != null
                    ? DATA.stats.projects
                    : 0;

        }


        if ($("statCustomers")) {

            $("statCustomers").textContent =
                DATA.stats &&
                DATA.stats.customers != null
                    ? DATA.stats.customers
                    : 0;

        }


        if ($("statEmployees")) {

            $("statEmployees").textContent =
                DATA.stats &&
                DATA.stats.employees != null
                    ? DATA.stats.employees
                    : 0;

        }

    }


    /* ======================================================
       INIT
    ====================================================== */

    function init() {

        console.log(
            "GROVA DOCUMENT: INIT"
        );


        /*
         * 1. Văn bản
         */

        renderDocuments();


        /*
         * 2. Card click
         */

        bindDocumentCards();


        /*
         * 3. Thống kê
         */

        renderStats();


        /*
         * 4. Menu
         */

        document
            .querySelectorAll(
                ".menu-item[data-page]"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            showPage(
                                button.dataset.page
                            );

                        }
                    );

                }
            );


        /*
         * 5. Các nút data-page
         */

        document
            .querySelectorAll(
                "[data-page]:not(.menu-item)"
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        function () {

                            showPage(
                                button.dataset.page
                            );

                        }
                    );

                }
            );


        /*
         * 6. Tạo văn bản
         */

        document
            .querySelectorAll(
                '[data-action="new-document"]'
            )
            .forEach(
                function (button) {

                    button.addEventListener(
                        "click",
                        openModal
                    );

                }
            );


        /*
         * 7. Modal
         */

        if ($("closeModal")) {

            $("closeModal")
                .addEventListener(
                    "click",
                    closeModal
                );

        }


        if ($("cancelModal")) {

            $("cancelModal")
                .addEventListener(
                    "click",
                    closeModal
                );

        }


        if ($("openTemplate")) {

            $("openTemplate")
                .addEventListener(
                    "click",
                    openSelectedTemplate
                );

        }


        var overlay =
            document.querySelector(
                ".modal-overlay"
            );


        if (overlay) {

            overlay.addEventListener(
                "click",
                closeModal
            );

        }


        /*
         * 8. Sidebar mobile
         */

        if ($("openSidebar")) {

            $("openSidebar")
                .addEventListener(
                    "click",
                    function () {

                        $("sidebar")
                            .classList.add(
                                "sidebar-open"
                            );

                    }
                );

        }


        if ($("closeSidebar")) {

            $("closeSidebar")
                .addEventListener(
                    "click",
                    function () {

                        $("sidebar")
                            .classList.remove(
                                "sidebar-open"
                            );

                    }
                );

        }


        /*
         * 9. Escape đóng modal
         */

        document.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key === "Escape"
                ) {

                    closeModal();

                }

            }
        );


        console.log(
            "GROVA DOCUMENT: INIT COMPLETE"
        );

    }


    /* ======================================================
       START
    ====================================================== */

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