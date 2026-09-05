/* =========================================================
   GROVA DOCUMENT
   Application Controller
   ========================================================= */

(() => {
    "use strict";

    /* =====================================================
       GLOBAL STATE
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
        [...parent.querySelectorAll(selector)];

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

    function getInitials(name = "") {
        const parts = String(name)
            .trim()
            .split(/\s+/)
            .filter(Boolean);

        if (!parts.length) {
            return "G";
        }

        if (parts.length === 1) {
            return parts[0].substring(0, 2).toUpperCase();
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
            return value;
        }

        return new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }).format(date);
    }

    function showToast(message, type = "success") {
        let container = $(".toast-container");

        if (!container) {
            container = document.createElement("div");
            container.className = "toast-container";
            document.body.appendChild(container);
        }

        const toast = document.createElement("div");
        toast.className = "toast";

        if (type === "error") {
            toast.style.borderLeft = "4px solid var(--danger)";
        } else if (type === "warning") {
            toast.style.borderLeft = "4px solid var(--warning)";
        } else {
            toast.style.borderLeft = "4px solid var(--grova-green)";
        }

        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3200);
    }

    /* =====================================================
       DATA CONNECTION
       ===================================================== */

    function getAppData() {
        /*
         * data.js is loaded before app.js.
         *
         * The application accepts either:
         *   window.GROVA_DATA
         * or
         *   window.grovaData
         *
         * This keeps the application flexible when the central
         * data structure is expanded later.
         */

        return (
            window.GROVA_DATA ||
            window.grovaData ||
            window.GROVA ||
            {}
        );
    }

    function getTemplates() {
        const data = getAppData();

        if (Array.isArray(data.templates)) {
            return data.templates;
        }

        if (Array.isArray(data.documents)) {
            return data.documents;
        }

        if (
            data.documentTemplates &&
            Array.isArray(data.documentTemplates)
        ) {
            return data.documentTemplates;
        }

        return [];
    }

    function getCompany() {
        const data = getAppData();

        return (
            data.company ||
            data.companyInfo ||
            {}
        );
    }

    function getCurrentUser() {
        const data = getAppData();

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
       NORMALIZE TEMPLATE
       ===================================================== */

    function normalizeTemplate(template, index) {
        if (!template) {
            return {
                id: `template-${index + 1}`,
                code: String(index + 1).padStart(2, "0"),
                name: `Văn bản ${index + 1}`,
                description: "",
                file: "",
                icon: "📄"
            };
        }

        return {
            id:
                template.id ||
                template.key ||
                `template-${index + 1}`,

            code:
                template.code ||
                String(index + 1).padStart(2, "0"),

            name:
                template.name ||
                template.title ||
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
            .map(normalizeTemplate)
            .filter(template => template.enabled);
    }

    /* =====================================================
       PAGE CONFIG
       ===================================================== */

    const PAGE_CONFIG = {
        dashboard: {
            title: "Tổng quan",
            subtitle: "Quản lý văn bản và hồ sơ GROVA"
        },

        documents: {
            title: "Văn bản",
            subtitle: "Quản lý và tạo văn bản theo mẫu"
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
            subtitle: "Lịch sử văn bản và thao tác"
        },

        reports: {
            title: "Báo cáo",
            subtitle: "Tổng hợp dữ liệu GROVA"
        },

        settings: {
            title: "Cài đặt",
            subtitle: "Thiết lập hệ thống"
        },

        admin: {
            title: "Quản trị",
            subtitle: "Quản lý hệ thống GROVA DOCUMENT"
        }
    };

    /* =====================================================
       NAVIGATION
       ===================================================== */

    function switchPage(pageName) {
        if (!PAGE_CONFIG[pageName]) {
            pageName = "dashboard";
        }

        state.currentPage = pageName;

        $$(".page").forEach(page => {
            page.classList.add("hidden");
        });

        const targetPage =
            $(`#page-${pageName}`);

        if (targetPage) {
            targetPage.classList.remove("hidden");
        }

        $$(".nav-item").forEach(item => {
            item.classList.toggle(
                "active",
                item.dataset.page === pageName
            );
        });

        const config = PAGE_CONFIG[pageName];

        const pageTitle = $("#pageTitle");
        const pageSubtitle = $("#pageSubtitle");

        if (pageTitle) {
            pageTitle.textContent = config.title;
        }

        if (pageSubtitle) {
            pageSubtitle.textContent = config.subtitle;
        }

        closeSidebar();

        if (pageName === "documents") {
            renderDocumentsPage();
        }

        if (pageName === "projects") {
            renderProjectsPage();
        }

        if (pageName === "customers") {
            renderCustomersPage();
        }

        if (pageName === "employees") {
            renderEmployeesPage();
        }

        if (pageName === "history") {
            renderHistoryPage();
        }

        if (pageName === "reports") {
            renderReportsPage();
        }

        if (pageName === "settings") {
            renderSettingsPage();
        }

        if (pageName === "admin") {
            renderAdminPage();
        }
    }

    /* =====================================================
       SIDEBAR
       ===================================================== */

    function openSidebar() {
        const sidebar = $("#sidebar");

        if (sidebar) {
            sidebar.classList.add("open");
        }

        let overlay = $(".sidebar-overlay");

        if (!overlay) {
            overlay = document.createElement("div");
            overlay.className = "sidebar-overlay";
            document.body.appendChild(overlay);

            overlay.addEventListener(
                "click",
                closeSidebar
            );
        }

        overlay.classList.add("show");
    }

    function closeSidebar() {
        const sidebar = $("#sidebar");

        if (sidebar) {
            sidebar.classList.remove("open");
        }

        const overlay = $(".sidebar-overlay");

        if (overlay) {
            overlay.classList.remove("show");
        }
    }

    /* =====================================================
       USER
       ===================================================== */

    function renderCurrentUser() {
        const user = getCurrentUser();

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
            nameElement.textContent = name;
        }

        if (roleElement) {
            roleElement.textContent = role;
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

    function renderDocumentCards() {
        const containers = [
            $("#documentGrid"),
            $("#documentsPageGrid")
        ].filter(Boolean);

        if (!containers.length) {
            return;
        }

        const templates =
            getNormalizedTemplates();

        const html = templates.length
            ? templates.map(template => `
                <article
                    class="document-card"
                    data-template-id="${escapeHTML(template.id)}"
                >
                    <div class="document-card-top">
                        <div class="document-icon">
                            ${escapeHTML(template.icon)}
                        </div>

                        <div class="document-code">
                            ${escapeHTML(template.code)}
                        </div>
                    </div>

                    <div class="document-name">
                        ${escapeHTML(template.name)}
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
            `).join("")
            : `
                <div class="empty-state">
                    <div class="empty-icon">📄</div>
                    <div class="empty-title">
                        Chưa có mẫu văn bản
                    </div>
                    <div class="empty-text">
                        Các mẫu văn bản sẽ được khai báo
                        trong data/data.js
                    </div>
                </div>
            `;

        containers.forEach(container => {
            container.innerHTML = html;
        });

        $$(".document-card").forEach(card => {
            card.addEventListener(
                "click",
                () => {
                    const id =
                        card.dataset.templateId;

                    openDocumentCreator(id);
                }
            );
        });
    }

    /* =====================================================
       DOCUMENT MODAL
       ===================================================== */

    function openDocumentCreator(templateId = null) {
        const modal =
            $("#documentModal");

        if (!modal) {
            showToast(
                "Chức năng tạo văn bản chưa được kết nối.",
                "warning"
            );

            return;
        }

        const templates =
            getNormalizedTemplates();

        let template = null;

        if (templateId) {
            template =
                templates.find(
                    item =>
                        item.id === templateId
                );
        }

        state.selectedTemplate =
            template || null;

        const selector =
            $("#templateSelector");

        if (selector) {
            renderTemplateSelector(
                selector,
                templates,
                template
            );
        }

        modal.classList.add("show");
        modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.style.overflow = "hidden";
    }

    function closeDocumentCreator() {
        const modal =
            $("#documentModal");

        if (!modal) {
            return;
        }

        modal.classList.remove("show");
        modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.style.overflow = "";

        state.selectedTemplate = null;
    }

    function renderTemplateSelector(
        container,
        templates,
        selected
    ) {
        if (!templates.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📄</div>
                    <div class="empty-title">
                        Chưa có mẫu văn bản
                    </div>
                </div>
            `;

            return;
        }

        container.innerHTML =
            templates.map(template => `
                <button
                    type="button"
                    class="template-option ${
                        selected &&
                        selected.id === template.id
                            ? "selected"
                            : ""
                    }"
                    data-template-id="${escapeHTML(
                        template.id
                    )}"
                >
                    <div class="template-option-title">
                        ${escapeHTML(
                            template.name
                        )}
                    </div>

                    <div class="template-option-description">
                        ${escapeHTML(
                            template.description
                        )}
                    </div>
                </button>
            `).join("");

        $$(".template-option", container)
            .forEach(option => {

                option.addEventListener(
                    "click",
                    () => {

                        const id =
                            option.dataset.templateId;

                        state.selectedTemplate =
                            templates.find(
                                item =>
                                    item.id === id
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
                    }
                );
            });
    }

    /* =====================================================
       OPEN TEMPLATE
       ===================================================== */

    function startSelectedDocument() {
        if (!state.selectedTemplate) {
            showToast(
                "Vui lòng chọn một mẫu văn bản.",
                "warning"
            );

            return;
        }

        const template =
            state.selectedTemplate;

        /*
         * Later:
         * This function will open the actual
         * HTML document template and generate
         * the variable-field form.
         */

        if (template.file) {
            const target =
                template.file;

            /*
             * We intentionally do NOT modify the
             * template wording here.
             */

            window.location.href = target;

            return;
        }

        showToast(
            `Đã chọn: ${template.name}`,
            "success"
        );
    }

    /* =====================================================
       NEW DOCUMENT BUTTONS
       ===================================================== */

    function bindNewDocumentButtons() {
        $$('[data-action="new-document"]')
            .forEach(button => {

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
            Array.isArray(state.documents)
                ? state.documents
                : [];

        if (!documents.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🗂️</div>

                    <div class="empty-title">
                        Chưa có văn bản gần đây
                    </div>

                    <div class="empty-text">
                        Văn bản sau khi được tạo sẽ
                        xuất hiện tại đây.
                    </div>
                </div>
            `;

            return;
        }

        container.innerHTML =
            documents.slice(0, 10)
                .map(document => `
                    <div class="recent-item">

                        <div class="recent-icon">
                            📄
                        </div>

                        <div class="recent-content">

                            <div class="recent-title">
                                ${escapeHTML(
                                    document.name ||
                                    document.title ||
                                    "Văn bản"
                                )}
                            </div>

                            <div class="recent-meta">
                                ${escapeHTML(
                                    document.number ||
                                    ""
                                )}
                                ${
                                    document.createdAt
                                        ? " · " +
                                          formatDate(
                                              document.createdAt
                                          )
                                        : ""
                                }
                            </div>

                        </div>

                        <div class="recent-status">
                            ${
                                escapeHTML(
                                    document.status ||
                                    "Đã tạo"
                                )
                            }
                        </div>

                    </div>
                `)
                .join("");
    }

    /* =====================================================
       DASHBOARD STATS
       ===================================================== */

    function renderStats() {
        const values = {
            documents:
                state.documents.length,

            projects:
                state.projects.length,

            customers:
                state.customers.length,

            employees:
                state.employees.length
        };

        const mapping = {
            statDocuments:
                values.documents,

            statProjects:
                values.projects,

            statCustomers:
                values.customers,

            statEmployees:
                values.employees
        };

        Object.entries(mapping)
            .forEach(([id, value]) => {

                const element =
                    document.getElementById(id);

                if (element) {
                    element.textContent =
                        value;
                }
            });
    }

    /* =====================================================
       DATA LOAD
       ===================================================== */

    function loadLocalData() {
        /*
         * These arrays are intentionally separate
         * from the document templates.
         *
         * Later they can be replaced by API/database
         * data without rebuilding the interface.
         */

        const data = getAppData();

        state.documents =
            Array.isArray(data.documentHistory)
                ? data.documentHistory
                : Array.isArray(data.documentsCreated)
                    ? data.documentsCreated
                    : [];

        state.projects =
            Array.isArray(data.projects)
                ? data.projects
                : [];

        state.customers =
            Array.isArray(data.customers)
                ? data.customers
                : [];

        state.employees =
            Array.isArray(data.employees)
                ? data.employees
                : [];
    }

    /* =====================================================
       GENERIC PAGE RENDERERS
       ===================================================== */

    function renderProjectsPage() {
        const page =
            $("#page-projects");

        if (!page) {
            return;
        }

        const container =
            $("[data-page-content]", page);

        if (!container) {
            return;
        }

        if (!state.projects.length) {
            container.innerHTML = `
                <div class="panel">
                    <div class="empty-state">
                        <div class="empty-icon">🏗️</div>

                        <div class="empty-title">
                            Chưa có dữ liệu công trình
                        </div>

                        <div class="empty-text">
                            Danh sách công trình sẽ được
                            kết nối với dữ liệu trung tâm.
                        </div>
                    </div>
                </div>
            `;

            return;
        }

        container.innerHTML =
            renderSimpleTable(
                state.projects,
                "Công trình"
            );
    }

    function renderCustomersPage() {
        const page =
            $("#page-customers");

        if (!page) {
            return;
        }

        const container =
            $("[data-page-content]", page);

        if (!container) {
            return;
        }

        if (!state.customers.length) {
            container.innerHTML = `
                <div class="panel">
                    <div class="empty-state">
                        <div class="empty-icon">👥</div>

                        <div class="empty-title">
                            Chưa có dữ liệu khách hàng
                        </div>

                        <div class="empty-text">
                            Thông tin khách hàng sẽ được
                            dùng chung cho các văn bản.
                        </div>
                    </div>
                </div>
            `;

            return;
        }

        container.innerHTML =
            renderSimpleTable(
                state.customers,
                "Khách hàng"
            );
    }

    function renderEmployeesPage() {
        const page =
            $("#page-employees");

        if (!page) {
            return;
        }

        const container =
            $("[data-page-content]", page);

        if (!container) {
            return;
        }

        if (!state.employees.length) {
            container.innerHTML = `
                <div class="panel">
                    <div class="empty-state">
                        <div class="empty-icon">👤</div>

                        <div class="empty-title">
                            Chưa có dữ liệu nhân sự
                        </div>

                        <div class="empty-text">
                            Danh sách nhân sự sẽ được
                            quản lý tập trung.
                        </div>
                    </div>
                </div>
            `;

            return;
        }

        container.innerHTML =
            renderSimpleTable(
                state.employees,
                "Nhân sự"
            );
    }

    function renderHistoryPage() {
        const page =
            $("#page-history");

        if (!page) {
            return;
        }

        const container =
            $("[data-page-content]", page);

        if (!container) {
            return;
        }

        if (!state.documents.length) {
            container.innerHTML = `
                <div class="panel">
                    <div class="empty-state">
                        <div class="empty-icon">🕘</div>

                        <div class="empty-title">
                            Chưa có lịch sử
                        </div>

                        <div class="empty-text">
                            Lịch sử tạo và xử lý văn bản
                            sẽ xuất hiện tại đây.
                        </div>
                    </div>
                </div>
            `;

            return;
        }

        container.innerHTML =
            renderSimpleTable(
                state.documents,
                "Lịch sử"
            );
    }

    function renderReportsPage() {
        const page =
            $("#page-reports");

        if (!page) {
            return;
        }

        const container =
            $("[data-page-content]", page);

        if (!container) {
            return;
        }

        container.innerHTML = `
            <div class="stats-grid">

                <div class="stat-card">
                    <div class="stat-label">
                        Tổng văn bản
                    </div>

                    <div class="stat-value">
                        ${state.documents.length}
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-label">
                        Công trình
                    </div>

                    <div class="stat-value">
                        ${state.projects.length}
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-label">
                        Khách hàng
                    </div>

                    <div class="stat-value">
                        ${state.customers.length}
                    </div>
                </div>

                <div class="stat-card">
                    <div class="stat-label">
                        Nhân sự
                    </div>

                    <div class="stat-value">
                        ${state.employees.length}
                    </div>
                </div>

            </div>
        `;
    }

    function renderSettingsPage() {
        const page =
            $("#page-settings");

        if (!page) {
            return;
        }

        const container =
            $("[data-page-content]", page);

        if (!container) {
            return;
        }

        const company =
            getCompany();

        container.innerHTML = `
            <div class="settings-grid">

                <div class="settings-card">
                    <div class="settings-card-title">
                        Thông tin doanh nghiệp
                    </div>

                    <div class="settings-card-text">
                        ${
                            escapeHTML(
                                company.name ||
                                "GROVA HOLDINGS"
                            )
                        }
                    </div>
                </div>

                <div class="settings-card">
                    <div class="settings-card-title">
                        Hệ thống văn bản
                    </div>

                    <div class="settings-card-text">
                        ${
                            getNormalizedTemplates()
                                .length
                        } mẫu văn bản đang được khai báo.
                    </div>
                </div>

                <div class="settings-card">
                    <div class="settings-card-title">
                        PWA
                    </div>

                    <div class="settings-card-text">
                        GROVA DOCUMENT được thiết kế
                        để cài đặt như ứng dụng trên
                        iPhone, iPad và máy tính.
                    </div>
                </div>

                <div class="settings-card">
                    <div class="settings-card-title">
                        Phiên bản giao diện
                    </div>

                    <div class="settings-card-text">
                        GROVA DOCUMENT Web App
                    </div>
                </div>

            </div>
        `;
    }

    function renderAdminPage() {
        const page =
            $("#page-admin");

        if (!page) {
            return;
        }

        const container =
            $("[data-page-content]", page);

        if (!container) {
            return;
        }

        container.innerHTML = `
            <div class="admin-grid">

                <div class="admin-card">
                    <div class="admin-card-title">
                        Mẫu văn bản
                    </div>

                    <div class="admin-card-text">
                        ${
                            getNormalizedTemplates()
                                .length
                        } mẫu đang được cấu hình.
                    </div>
                </div>

                <div class="admin-card">
                    <div class="admin-card-title">
                        Người dùng
                    </div>

                    <div class="admin-card-text">
                        Khu vực quản lý tài khoản nhân viên
                        và quyền truy cập.
                    </div>
                </div>

                <div class="admin-card">
                    <div class="admin-card-title">
                        Đánh số văn bản
                    </div>

                    <div class="admin-card-text">
                        Hệ thống đánh số tập trung sẽ được
                        kết nối ở bước backend.
                    </div>
                </div>

                <div class="admin-card">
                    <div class="admin-card-title">
                        Cơ sở dữ liệu
                    </div>

                    <div class="admin-card-text">
                        Kiến trúc hiện tại đã tách dữ liệu
                        khỏi giao diện để sẵn sàng kết nối
                        database.
                    </div>
                </div>

            </div>
        `;
    }

    /* =====================================================
       SIMPLE TABLE
       ===================================================== */

    function renderSimpleTable(items, title) {
        if (!items.length) {
            return `
                <div class="empty-state">
                    <div class="empty-title">
                        Chưa có dữ liệu
                    </div>
                </div>
            `;
        }

        const keys = Object.keys(items[0])
            .filter(key =>
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
                                    keys.map(key => `
                                        <th>
                                            ${escapeHTML(
                                                key
                                            )}
                                        </th>
                                    `).join("")
                                }
                            </tr>
                        </thead>

                        <tbody>
                            ${
                                items.map(item => `
                                    <tr>
                                        ${
                                            keys.map(key => `
                                                <td>
                                                    ${escapeHTML(
                                                        item[key]
                                                    )}
                                                </td>
                                            `).join("")
                                        }
                                    </tr>
                                `).join("")
                            }
                        </tbody>

                    </table>

                </div>

            </div>
        `;
    }

    /* =====================================================
       NAVIGATION EVENTS
       ===================================================== */

    function bindNavigation() {
        $$(".nav-item").forEach(item => {

            item.addEventListener(
                "click",
                event => {

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

                    if (
                        event.target === modal
                    ) {
                        closeDocumentCreator();
                    }
                }
            );
        }

        const selector =
            $("#templateSelector");

        if (selector) {
            selector.addEventListener(
                "click",
                event => {

                    const option =
                        event.target.closest(
                            ".template-option"
                        );

                    if (!option) {
                        return;
                    }

                    const id =
                        option.dataset.templateId;

                    state.selectedTemplate =
                        getNormalizedTemplates()
                            .find(
                                template =>
                                    template.id === id
                            ) || null;
                }
            );
        }
    }

    /* =====================================================
       MOBILE EVENTS
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
                    event.key === "Escape"
                ) {
                    closeDocumentCreator();
                    closeSidebar();
                }
            }
        );
    }

    /* =====================================================
       TEMPLATE LINK EVENTS
       ===================================================== */

    function bindTemplateLinks() {
        document.addEventListener(
            "click",
            event => {

                const card =
                    event.target.closest(
                        "[data-template-id]"
                    );

                if (!card) {
                    return;
                }

                if (
                    card.classList.contains(
                        "template-option"
                    )
                ) {
                    return;
                }

                const templateId =
                    card.dataset.templateId;

                if (templateId) {
                    openDocumentCreator(
                        templateId
                    );
                }
            }
        );
    }

    /* =====================================================
       INITIALIZATION
       ===================================================== */

    function initialize() {

        if (state.initialized) {
            return;
        }

        state.initialized = true;

        loadLocalData();

        renderCurrentUser();

        renderStats();

        renderDocumentCards();

        renderRecentDocuments();

        bindNavigation();

        bindNewDocumentButtons();

        bindModal();

        bindMobileMenu();

        bindKeyboard();

        bindTemplateLinks();

        switchPage("dashboard");

        console.log(
            "GROVA DOCUMENT initialized."
        );
    }

    /* =====================================================
       GLOBAL API
       ===================================================== */

    window.GROVA_DOCUMENT = {
        state,

        getData: getAppData,

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