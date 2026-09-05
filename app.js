/* =========================================================
   GROVA DOCUMENT
   Application Controller
   Version 2
   ========================================================= */

(() => {
    "use strict";

    /* =====================================================
       STATE
    ===================================================== */

    const state = {
        currentPage: "dashboard",
        selectedTemplate: null,

        documents: [],
        projects: [],
        customers: [],
        employees: [],

        initialized: false
    };


    /* =====================================================
       HELPERS
    ===================================================== */

    const $ = (selector, parent = document) =>
        parent.querySelector(selector);

    const $$ = (selector, parent = document) =>
        Array.from(parent.querySelectorAll(selector));


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


    function getInitials(name = "") {

        const parts = String(name)
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        if (!parts.length) {
            return "G";
        }

        if (parts.length === 1) {
            return parts[0]
                .substring(0, 2)
                .toUpperCase();
        }

        return (
            parts[0].charAt(0) +
            parts[parts.length - 1].charAt(0)
        ).toUpperCase();
    }


    function formatDate(value) {

        if (!value) {
            return "";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return new Intl.DateTimeFormat(
            "vi-VN",
            {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }
        ).format(date);
    }


    function showToast(
        message,
        type = "success"
    ) {

        let container =
            $(".toast-container");

        if (!container) {

            container =
                document.createElement("div");

            container.className =
                "toast-container";

            document.body.appendChild(
                container
            );
        }

        const toast =
            document.createElement("div");

        toast.className = "toast";

        if (
            type === "error"
        ) {

            toast.style.borderLeft =
                "4px solid var(--danger)";
        }

        else if (
            type === "warning"
        ) {

            toast.style.borderLeft =
                "4px solid var(--warning)";
        }

        else {

            toast.style.borderLeft =
                "4px solid var(--grova-green)";
        }

        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {

            toast.remove();

        }, 3200);
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

        const data =
            getAppData();

        if (
            Array.isArray(
                data.templates
            )
        ) {

            return data.templates;
        }

        if (
            Array.isArray(
                data.documents
            )
        ) {

            return data.documents;
        }

        if (
            data.documentTemplates &&
            Array.isArray(
                data.documentTemplates
            )
        ) {

            return data.documentTemplates;
        }

        return [];
    }


    function getCompany() {

        const data =
            getAppData();

        return (
            data.company ||
            data.companyInfo ||
            {}
        );
    }


    function getCurrentUser() {

        const data =
            getAppData();

        return (
            data.currentUser ||
            data.user ||
            {
                name: "Người dùng GROVA",
                role: "Nhân viên"
            }
        );
    }


    /* =====================================================
       TEMPLATE NORMALIZATION
    ===================================================== */

    function normalizeTemplate(
        template,
        index
    ) {

        if (!template) {

            return {
                id:
                    `template-${index + 1}`,

                code:
                    String(index + 1)
                        .padStart(2, "0"),

                name:
                    `Văn bản ${index + 1}`,

                title:
                    `Văn bản ${index + 1}`,

                description: "",

                file: "",

                icon: "📄",

                category: "Văn bản",

                enabled: true
            };
        }


        return {

            id:
                template.id ||
                template.key ||
                `template-${index + 1}`,

            code:
                template.code ||
                String(index + 1)
                    .padStart(2, "0"),

            name:
                template.name ||
                template.title ||
                template.label ||
                `Văn bản ${index + 1}`,

            title:
                template.title ||
                template.name ||
                template.label ||
                `Văn bản ${index + 1}`,

            description:
                template.description ||
                template.desc ||
                "",

            file:
                template.file ||
                template.path ||
                template.template ||
                "",

            icon:
                template.icon ||
                "📄",

            category:
                template.category ||
                "Văn bản",

            enabled:
                template.enabled !== false
        };
    }


    function getNormalizedTemplates() {

        return getTemplates()
            .map(
                (template, index) =>
                    normalizeTemplate(
                        template,
                        index
                    )
            )
            .filter(
                template =>
                    template.enabled
            );
    }


    /* =====================================================
       PAGE CONFIGURATION
    ===================================================== */

    const PAGE_CONFIG = {

        dashboard: {
            title: "Tổng quan",
            subtitle:
                "Quản lý văn bản và hồ sơ GROVA"
        },

        documents: {
            title: "Văn bản",
            subtitle:
                "Quản lý và tạo văn bản theo mẫu"
        },

        projects: {
            title: "Công trình",
            subtitle:
                "Quản lý thông tin công trình"
        },

        customers: {
            title: "Khách hàng",
            subtitle:
                "Quản lý thông tin khách hàng"
        },

        employees: {
            title: "Nhân sự",
            subtitle:
                "Quản lý thông tin nhân sự"
        },

        history: {
            title: "Lịch sử",
            subtitle:
                "Lịch sử văn bản và thao tác"
        },

        reports: {
            title: "Báo cáo",
            subtitle:
                "Tổng hợp dữ liệu GROVA"
        },

        settings: {
            title: "Cài đặt",
            subtitle:
                "Thiết lập hệ thống"
        },

        admin: {
            title: "Quản trị",
            subtitle:
                "Quản lý hệ thống GROVA DOCUMENT"
        }
    };


    /* =====================================================
       NAVIGATION
    ===================================================== */

    function switchPage(
        pageName
    ) {

        if (
            !PAGE_CONFIG[pageName]
        ) {

            pageName = "dashboard";
        }

        state.currentPage =
            pageName;


        $$(".page").forEach(
            page => {

                page.classList.add(
                    "hidden"
                );

                page.classList.remove(
                    "active-page"
                );
            }
        );


        const target =
            $(`#page-${pageName}`);


        if (target) {

            target.classList.remove(
                "hidden"
            );

            target.classList.add(
                "active-page"
            );
        }


        /*
         * index.html dùng .menu-item,
         * không phải .nav-item.
         */

        $$(".menu-item[data-page]")
            .forEach(item => {

                item.classList.toggle(
                    "active",
                    item.dataset.page ===
                        pageName
                );
            });


        const config =
            PAGE_CONFIG[pageName];


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


        closeSidebar();


        /*
         * Render riêng từng khu vực.
         */

        if (
            pageName === "documents"
        ) {

            renderDocumentsPage();
        }

        if (
            pageName === "projects"
        ) {

            renderProjectsPage();
        }

        if (
            pageName === "customers"
        ) {

            renderCustomersPage();
        }

        if (
            pageName === "employees"
        ) {

            renderEmployeesPage();
        }

        if (
            pageName === "history"
        ) {

            renderHistoryPage();
        }

        if (
            pageName === "reports"
        ) {

            renderReportsPage();
        }

        if (
            pageName === "settings"
        ) {

            renderSettingsPage();
        }

        if (
            pageName === "admin"
        ) {

            renderAdminPage();
        }
    }


    /* =====================================================
       SIDEBAR
    ===================================================== */

    function openSidebar() {

        const sidebar =
            $("#sidebar");

        if (sidebar) {

            sidebar.classList.add(
                "open"
            );
        }


        let overlay =
            $(".sidebar-overlay");


        if (!overlay) {

            overlay =
                document.createElement(
                    "div"
                );

            overlay.className =
                "sidebar-overlay";

            document.body.appendChild(
                overlay
            );

            overlay.addEventListener(
                "click",
                closeSidebar
            );
        }


        overlay.classList.add(
            "show"
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


        const overlay =
            $(".sidebar-overlay");

        if (overlay) {

            overlay.classList.remove(
                "show"
            );
        }
    }


    /* =====================================================
       USER
    ===================================================== */

    function renderCurrentUser() {

        const user =
            getCurrentUser();


        const name =
            user.name ||
            user.fullName ||
            "Người dùng GROVA";


        const role =
            user.role ||
            user.position ||
            "Nhân viên";


        const nameElement =
            $("#currentUserName");

        const roleElement =
            $("#currentUserRole");


        if (nameElement) {

            nameElement.textContent =
                name;
        }


        if (roleElement) {

            roleElement.textContent =
                role;
        }


        const avatar =
            $(".user-avatar");


        if (avatar) {

            avatar.textContent =
                getInitials(name);
        }
    }


    /* =====================================================
       DOCUMENT CARDS
    ===================================================== */

    function buildDocumentCardsHTML(
        templates
    ) {

        if (!templates.length) {

            return `
                <div class="empty-state">

                    <div class="empty-icon">
                        📄
                    </div>

                    <div class="empty-title">
                        Chưa có mẫu văn bản
                    </div>

                    <div class="empty-text">
                        Các mẫu văn bản sẽ được
                        khai báo trong data/data.js
                    </div>

                </div>
            `;
        }


        return templates
            .map(
                template => `

                    <article
                        class="document-card"
                        data-template-id="${escapeHTML(
                            template.id
                        )}"
                    >

                        <div class="document-card-top">

                            <div class="document-icon">
                                ${escapeHTML(
                                    template.icon
                                )}
                            </div>

                            <div class="document-code">
                                ${escapeHTML(
                                    template.code
                                )}
                            </div>

                        </div>


                        <div class="document-name">
                            ${escapeHTML(
                                template.name
                            )}
                        </div>


                        <div class="document-description">
                            ${escapeHTML(
                                template.description
                            )}
                        </div>


                        <div class="document-meta">

                            <span class="document-tag">
                                ${escapeHTML(
                                    template.category
                                )}
                            </span>

                            <span class="document-tag">
                                Tạo văn bản
                            </span>

                        </div>

                    </article>
                `
            )
            .join("");
    }


    function renderDocumentCards() {

        const templates =
            getNormalizedTemplates();


        const html =
            buildDocumentCardsHTML(
                templates
            );


        const dashboardGrid =
            $("#documentGrid");


        if (dashboardGrid) {

            dashboardGrid.innerHTML =
                html;
        }


        bindDocumentCards();
    }


    /* =====================================================
       DOCUMENTS PAGE
    ===================================================== */

    function renderDocumentsPage() {

        const container =
            $("#documentsPageGrid");


        if (!container) {

            return;
        }


        const templates =
            getNormalizedTemplates();


        container.innerHTML =
            buildDocumentCardsHTML(
                templates
            );


        bindDocumentCards();
    }


    function bindDocumentCards() {

        $$(".document-card")
            .forEach(card => {

                /*
                 * Tránh bind trùng.
                 */

                if (
                    card.dataset.bound ===
                    "true"
                ) {

                    return;
                }


                card.dataset.bound =
                    "true";


                card.addEventListener(
                    "click",
                    () => {

                        const id =
                            card.dataset
                                .templateId;


                        openDocumentCreator(
                            id
                        );
                    }
                );
            });
    }


    /* =====================================================
       DOCUMENT CREATOR MODAL
    ===================================================== */

    function openDocumentCreator(
        templateId = null
    ) {

        const modal =
            $("#documentModal");


        if (!modal) {

            showToast(
                "Không tìm thấy cửa sổ tạo văn bản.",
                "error"
            );

            return;
        }


        const templates =
            getNormalizedTemplates();


        let selected = null;


        if (templateId) {

            selected =
                templates.find(
                    template =>
                        template.id ===
                        String(templateId)
                ) || null;
        }


        state.selectedTemplate =
            selected;


        const selector =
            $("#templateSelector");


        if (selector) {

            renderTemplateSelector(
                selector,
                templates,
                selected
            );
        }


        const modalTitle =
            $("#modalTitle");


        if (modalTitle) {

            modalTitle.textContent =
                selected
                    ? selected.name
                    : "Chọn mẫu văn bản";
        }


        modal.classList.remove(
            "hidden"
        );

        modal.classList.add(
            "show"
        );


        modal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.style.overflow =
            "hidden";
    }


    function closeDocumentCreator() {

        const modal =
            $("#documentModal");


        if (!modal) {

            return;
        }


        modal.classList.remove(
            "show"
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


        state.selectedTemplate =
            null;
    }


    function renderTemplateSelector(
        container,
        templates,
        selected
    ) {

        if (!templates.length) {

            container.innerHTML = `
                <div class="empty-state">

                    <div class="empty-icon">
                        📄
                    </div>

                    <div class="empty-title">
                        Chưa có mẫu văn bản
                    </div>

                </div>
            `;

            return;
        }


        container.innerHTML =
            templates
                .map(
                    template => `

                        <button
                            type="button"
                            class="template-option ${
                                selected &&
                                selected.id ===
                                    template.id
                                    ? "selected"
                                    : ""
                            }"
                            data-template-id="${escapeHTML(
                                template.id
                            )}"
                        >

                            <div
                                class="template-option-title"
                            >
                                ${escapeHTML(
                                    template.name
                                )}
                            </div>

                            <div
                                class="template-option-description"
                            >
                                ${escapeHTML(
                                    template.description
                                )}
                            </div>

                        </button>
                    `
                )
                .join("");


        /*
         * Footer nút mở mẫu.
         * index.html hiện chưa có nút này,
         * nên chúng ta tạo bằng JS.
         */

        const footer =
            document.createElement(
                "div"
            );


        footer.className =
            "modal-actions";


        footer.innerHTML = `

            <button
                type="button"
                class="secondary-button"
                data-modal-close
            >
                Hủy
            </button>

            <button
                type="button"
                class="primary-button"
                data-modal-open-template
            >
                Mở mẫu
            </button>
        `;


        container.appendChild(
            footer
        );


        $$(".template-option", container)
            .forEach(option => {

                option.addEventListener(
                    "click",
                    () => {

                        const id =
                            option.dataset
                                .templateId;


                        state.selectedTemplate =
                            templates.find(
                                template =>
                                    template.id ===
                                    id
                            ) || null;


                        $$(".template-option", container)
                            .forEach(item => {

                                item.classList.remove(
                                    "selected"
                                );
                            });


                        option.classList.add(
                            "selected"
                        );


                        const modalTitle =
                            $("#modalTitle");


                        if (modalTitle) {

                            modalTitle.textContent =
                                state.selectedTemplate
                                    ? state
                                        .selectedTemplate
                                        .name
                                    : "Chọn mẫu văn bản";
                        }
                    }
                );
            });


        const openButton =
            $(
                "[data-modal-open-template]",
                container
            );


        if (openButton) {

            openButton.addEventListener(
                "click",
                startSelectedDocument
            );
        }


        const closeButton =
            $(
                "[data-modal-close]",
                container
            );


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                closeDocumentCreator
            );
        }
    }


    /* =====================================================
       OPEN TEMPLATE
    ===================================================== */

    function startSelectedDocument() {

        if (
            !state.selectedTemplate
        ) {

            showToast(
                "Vui lòng chọn một mẫu văn bản.",
                "warning"
            );

            return;
        }


        const template =
            state.selectedTemplate;


        if (
            !template.file
        ) {

            showToast(
                `Mẫu "${template.name}" chưa có file template.`,
                "warning"
            );

            return;
        }


        /*
         * Đóng modal trước khi chuyển trang.
         */

        closeDocumentCreator();


        /*
         * Không sửa câu chữ template.
         * Chỉ mở file được khai báo
         * trong data/data.js.
         */

        window.location.href =
            template.file;
    }


    /* =====================================================
       NEW DOCUMENT BUTTONS
    ===================================================== */

    function bindNewDocumentButtons() {

        $$(
            '[data-action="new-document"]'
        )
        .forEach(button => {

            if (
                button.dataset.bound ===
                "true"
            ) {

                return;
            }


            button.dataset.bound =
                "true";


            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    openDocumentCreator();
                }
            );
        });
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


        const documents =
            Array.isArray(
                state.documents
            )
                ? state.documents
                : [];


        if (!documents.length) {

            container.innerHTML = `

                <div class="empty-state">

                    <div class="empty-icon">
                        🗂️
                    </div>

                    <div class="empty-title">
                        Chưa có văn bản gần đây
                    </div>

                    <div class="empty-text">
                        Văn bản sau khi được tạo
                        sẽ xuất hiện tại đây.
                    </div>

                </div>
            `;

            return;
        }


        container.innerHTML =
            documents
                .slice(0, 10)
                .map(
                    documentItem => `

                        <div class="recent-item">

                            <div class="recent-icon">
                                📄
                            </div>

                            <div class="recent-content">

                                <div class="recent-title">
                                    ${escapeHTML(
                                        documentItem.name ||
                                        documentItem.title ||
                                        "Văn bản"
                                    )}
                                </div>

                                <div class="recent-meta">
                                    ${escapeHTML(
                                        documentItem.number ||
                                        ""
                                    )}

                                    ${
                                        documentItem.createdAt
                                            ? " · " +
                                              formatDate(
                                                  documentItem.createdAt
                                              )
                                            : ""
                                    }
                                </div>

                            </div>

                            <div class="recent-status">
                                ${escapeHTML(
                                    documentItem.status ||
                                    "Đã tạo"
                                )}
                            </div>

                        </div>
                    `
                )
                .join("");
    }


    /* =====================================================
       STATS
    ===================================================== */

    function renderStats() {

        const mapping = {

            statDocuments:
                state.documents.length,

            statProjects:
                state.projects.length,

            statCustomers:
                state.customers.length,

            statEmployees:
                state.employees.length
        };


        Object.entries(mapping)
            .forEach(
                ([id, value]) => {

                    const element =
                        document.getElementById(
                            id
                        );


                    if (element) {

                        element.textContent =
                            value;
                    }
                }
            );
    }


    /* =====================================================
       LOAD LOCAL DATA
    ===================================================== */

    function loadLocalData() {

        const data =
            getAppData();


        state.documents =
            Array.isArray(
                data.documentHistory
            )
                ? data.documentHistory
                : Array.isArray(
                      data.documentsCreated
                  )
                    ? data.documentsCreated
                    : [];


        state.projects =
            Array.isArray(
                data.projects
            )
                ? data.projects
                : [];


        state.customers =
            Array.isArray(
                data.customers
            )
                ? data.customers
                : [];


        state.employees =
            Array.isArray(
                data.employees
            )
                ? data.employees
                : [];
    }


    /* =====================================================
       GENERIC EMPTY PAGE HELPERS
    ===================================================== */

    function renderEmptyPage(
        pageId,
        icon,
        title,
        text
    ) {

        const page =
            $(`#page-${pageId}`);


        if (!page) {

            return;
        }


        /*
         * Các trang này hiện đã có HTML
         * cố định trong index.html.
         *
         * Chỉ thay thế khi tìm được
         * vùng data-page-content.
         */

        const container =
            $(
                "[data-page-content]",
                page
            );


        if (!container) {

            return;
        }


        container.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    ${icon}
                </div>

                <h3>
                    ${escapeHTML(title)}
                </h3>

                <p>
                    ${escapeHTML(text)}
                </p>

            </div>
        `;
    }


    /* =====================================================
       SIMPLE TABLE
    ===================================================== */

    function renderSimpleTable(
        items,
        title
    ) {

        if (
            !Array.isArray(items) ||
            !items.length
        ) {

            return `
                <div class="empty-state">
                    <div class="empty-title">
                        Chưa có dữ liệu
                    </div>
                </div>
            `;
        }


        const keys =
            Object.keys(
                items[0]
            )
            .filter(
                key =>
                    ![
                        "id",
                        "key",
                        "password"
                    ].includes(key)
            )
            .slice(0, 5);


        return `

            <div class="panel">

                <div class="panel-header">

                    <div class="panel-title">
                        ${escapeHTML(title)}
                    </div>

                </div>


                <div class="table-wrapper">

                    <table class="data-table">

                        <thead>

                            <tr>

                                ${
                                    keys
                                        .map(
                                            key => `
                                                <th>
                                                    ${escapeHTML(
                                                        key
                                                    )}
                                                </th>
                                            `
                                        )
                                        .join("")
                                }

                            </tr>

                        </thead>


                        <tbody>

                            ${
                                items
                                    .map(
                                        item => `

                                            <tr>

                                                ${
                                                    keys
                                                        .map(
                                                            key => `
                                                                <td>
                                                                    ${escapeHTML(
                                                                        item[key]
                                                                    )}
                                                                </td>
                                                            `
                                                        )
                                                        .join("")
                                                }

                                            </tr>
                                        `
                                    )
                                    .join("")
                            }

                        </tbody>

                    </table>

                </div>

            </div>
        `;
    }


    /* =====================================================
       PROJECTS
    ===================================================== */

    function renderProjectsPage() {

        const page =
            $("#page-projects");


        if (!page) {

            return;
        }


        const existingEmpty =
            $(".empty-state", page);


        if (
            state.projects.length
        ) {

            if (existingEmpty) {

                existingEmpty.outerHTML =
                    renderSimpleTable(
                        state.projects,
                        "Công trình"
                    );
            }

            return;
        }
    }


    /* =====================================================
       CUSTOMERS
    ===================================================== */

    function renderCustomersPage() {

        const page =
            $("#page-customers");


        if (!page) {

            return;
        }


        if (
            state.customers.length
        ) {

            const existingEmpty =
                $(".empty-state", page);


            if (existingEmpty) {

                existingEmpty.outerHTML =
                    renderSimpleTable(
                        state.customers,
                        "Khách hàng"
                    );
            }
        }
    }


    /* =====================================================
       EMPLOYEES
    ===================================================== */

    function renderEmployeesPage() {

        const page =
            $("#page-employees");


        if (!page) {

            return;
        }


        if (
            state.employees.length
        ) {

            const existingEmpty =
                $(".empty-state", page);


            if (existingEmpty) {

                existingEmpty.outerHTML =
                    renderSimpleTable(
                        state.employees,
                        "Nhân sự"
                    );
            }
        }
    }


    /* =====================================================
       HISTORY
    ===================================================== */

    function renderHistoryPage() {

        const page =
            $("#page-history");


        if (!page) {

            return;
        }


        if (
            state.documents.length
        ) {

            const existingEmpty =
                $(".empty-state", page);


            if (existingEmpty) {

                existingEmpty.outerHTML =
                    renderSimpleTable(
                        state.documents,
                        "Lịch sử văn bản"
                    );
            }
        }
    }


    /* =====================================================
       REPORTS
    ===================================================== */

    function renderReportsPage() {

        const page =
            $("#page-reports");


        if (!page) {

            return;
        }


        /*
         * Chỉ cập nhật khu vực báo cáo
         * nếu cần thiết.
         *
         * Không phá HTML hiện tại.
         */
    }


    /* =====================================================
       SETTINGS
    ===================================================== */

    function renderSettingsPage() {

        const page =
            $("#page-settings");


        if (!page) {

            return;
        }


        const company =
            getCompany();


        const companyName =
            company.name ||
            "GROVA HOLDINGS";


        /*
         * Không thay đổi layout Settings hiện tại.
         * Chỉ ghi log cấu hình để kiểm tra.
         */

        console.log(
            "GROVA company:",
            companyName
        );


        console.log(
            "Document templates:",
            getNormalizedTemplates().length
        );
    }


    /* =====================================================
       ADMIN
    ===================================================== */

    function renderAdminPage() {

        const page =
            $("#page-admin");


        if (!page) {

            return;
        }


        console.log(
            "GROVA DOCUMENT Admin:",
            getNormalizedTemplates().length,
            "templates"
        );
    }


    /* =====================================================
       NAVIGATION EVENTS
    ===================================================== */

    function bindNavigation() {

        /*
         * index.html dùng:
         *
         * .menu-item[data-page]
         */

        $$(".menu-item[data-page]")
            .forEach(item => {

                if (
                    item.dataset.bound ===
                    "true"
                ) {

                    return;
                }


                item.dataset.bound =
                    "true";


                item.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();


                        const page =
                            item.dataset.page;


                        if (page) {

                            switchPage(
                                page
                            );
                        }
                    }
                );
            });


        /*
         * Các nút text-button có data-page.
         */

        $$("[data-page]")
            .forEach(item => {

                if (
                    item.classList.contains(
                        "menu-item"
                    )
                ) {

                    return;
                }


                if (
                    item.dataset.bound ===
                    "true"
                ) {

                    return;
                }


                item.dataset.bound =
                    "true";


                item.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();


                        const page =
                            item.dataset.page;


                        if (page) {

                            switchPage(
                                page
                            );
                        }
                    }
                );
            });
    }


    /* =====================================================
       MODAL EVENTS
    ===================================================== */

    function bindModal() {

        const closeButton =
            $("#closeModal");


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                closeDocumentCreator
            );
        }


        const modal =
            $("#documentModal");


        if (modal) {

            modal.addEventListener(
                "click",
                event => {

                    /*
                     * Chỉ đóng khi bấm vùng
                     * overlay bên ngoài.
                     */

                    if (
                        event.target ===
                            modal ||
                        event.target.classList.contains(
                            "modal-overlay"
                        )
                    ) {

                        closeDocumentCreator();
                    }
                }
            );
        }
    }


    /* =====================================================
       MOBILE MENU
    ===================================================== */

    function bindMobileMenu() {

        const openButton =
            $("#openSidebar");


        const closeButton =
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


    /* =====================================================
       KEYBOARD
    ===================================================== */

    function bindKeyboard() {

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Escape"
                ) {

                    closeDocumentCreator();

                    closeSidebar();
                }
            }
        );
    }


    /* =====================================================
       INITIALIZE
    ===================================================== */

    function initialize() {

        if (
            state.initialized
        ) {

            return;
        }


        state.initialized =
            true;


        /*
         * 1. Load data
         */

        loadLocalData();


        /*
         * 2. User
         */

        renderCurrentUser();


        /*
         * 3. Stats
         */

        renderStats();


        /*
         * 4. Document templates
         */

        renderDocumentCards();


        /*
         * 5. Recent documents
         */

        renderRecentDocuments();


        /*
         * 6. Events
         */

        bindNavigation();

        bindNewDocumentButtons();

        bindModal();

        bindMobileMenu();

        bindKeyboard();


        /*
         * 7. Dashboard
         */

        switchPage(
            "dashboard"
        );


        /*
         * Diagnostic log
         */

        console.log(
            "===================================="
        );

        console.log(
            "GROVA DOCUMENT initialized"
        );

        console.log(
            "Templates:",
            getNormalizedTemplates()
        );

        console.log(
            "Template count:",
            getNormalizedTemplates()
                .length
        );

        console.log(
            "===================================="
        );
    }


    /* =====================================================
       GLOBAL API
    ===================================================== */

    window.GROVA_DOCUMENT = {

        state,

        getData:
            getAppData,

        getTemplates:
            getNormalizedTemplates,

        openDocument:
            openDocumentCreator,

        closeDocument:
            closeDocumentCreator,

        switchPage,

        refresh() {

            loadLocalData();

            renderCurrentUser();

            renderStats();

            renderDocumentCards();

            renderRecentDocuments();

            switchPage(
                state.currentPage
            );
        }
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
            initialize
        );

    } else {

        initialize();
    }

})();