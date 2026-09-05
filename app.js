/* =========================================================
   GROVA DOCUMENT
   APP.JS
   Version: 2.0
   ========================================================= */

(function () {
    "use strict";

    /* =====================================================
       STATE
    ===================================================== */

    const state = {
        currentPage: "dashboard",
        selectedTemplate: null,
        initialized: false,
        currentUser: {
            name: "Người dùng GROVA",
            role: "Nhân viên"
        }
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

    function escapeHtml(value) {
        return String(value ?? "")
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


    function normalizeTemplate(template, index) {
        if (!template) {
            return null;
        }

        return {
            id: String(
                template.id ??
                String(index + 1).padStart(2, "0")
            ),

            code:
                template.code ||
                `VB${String(index + 1).padStart(2, "0")}`,

            name:
                template.name ||
                template.title ||
                "Mẫu văn bản",

            title:
                template.title ||
                template.name ||
                "Mẫu văn bản",

            description:
                template.description ||
                "",

            category:
                template.category ||
                "Văn bản",

            icon:
                template.icon ||
                "📄",

            file:
                template.file ||
                "",

            enabled:
                template.enabled !== false
        };
    }


    function getTemplates() {
        const data = getAppData();

        if (!data || !Array.isArray(data.templates)) {
            return [];
        }

        return data.templates
            .map(normalizeTemplate)
            .filter(Boolean)
            .filter(template => template.enabled !== false);
    }


    /*
     * Trường hợp Safari/iOS còn giữ data.js cũ.
     * Nếu chưa có mẫu, tải lại data.js bằng URL mới.
     */
    function ensureFreshData(callback) {
        const templates = getTemplates();

        if (templates.length > 0) {
            callback();
            return;
        }

        const oldScript = document.querySelector(
            'script[data-grova-refresh="true"]'
        );

        if (oldScript) {
            callback();
            return;
        }

        const script = document.createElement("script");

        script.src =
            "./data/data.js?v=" +
            Date.now();

        script.dataset.grovaRefresh = "true";

        script.onload = function () {
            callback();
        };

        script.onerror = function () {
            callback();
        };

        document.head.appendChild(script);
    }


    /* =====================================================
       USER
    ===================================================== */

    function renderCurrentUser() {
        const nameElement = $("#currentUserName");
        const roleElement = $("#currentUserRole");
        const avatarElement = $(".user-avatar");

        if (nameElement) {
            nameElement.textContent =
                state.currentUser.name;
        }

        if (roleElement) {
            roleElement.textContent =
                state.currentUser.role;
        }

        if (avatarElement) {
            avatarElement.textContent =
                getInitials(state.currentUser.name);
        }
    }


    function getInitials(name) {
        const parts = String(name || "")
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


    /* =====================================================
       STATISTICS
    ===================================================== */

    function getStats() {
        const data = getAppData();

        return {
            documents:
                Number(data?.stats?.documents || 0),

            projects:
                Number(data?.stats?.projects || 0),

            customers:
                Number(data?.stats?.customers || 0),

            employees:
                Number(data?.stats?.employees || 0)
        };
    }


    function renderStats() {
        const stats = getStats();

        const documents = $("#statDocuments");
        const projects = $("#statProjects");
        const customers = $("#statCustomers");
        const employees = $("#statEmployees");

        if (documents) {
            documents.textContent = stats.documents;
        }

        if (projects) {
            projects.textContent = stats.projects;
        }

        if (customers) {
            customers.textContent = stats.customers;
        }

        if (employees) {
            employees.textContent = stats.employees;
        }
    }


    /* =====================================================
       DOCUMENT CARDS
    ===================================================== */

    function renderDocumentCards() {
        const templates = getTemplates();

        const grids = [
            $("#documentGrid"),
            $("#documentsPageGrid")
        ].filter(Boolean);

        grids.forEach(grid => {
            grid.innerHTML = "";

            if (!templates.length) {
                grid.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">📄</div>

                        <div class="empty-title">
                            Chưa có mẫu văn bản
                        </div>

                        <div class="empty-text">
                            Các mẫu văn bản sẽ được khai báo trong
                            data/data.js
                        </div>
                    </div>
                `;

                return;
            }

            templates.forEach(template => {
                const card =
                    document.createElement("article");

                card.className = "document-card";

                card.dataset.templateId =
                    template.id;

                card.innerHTML = `
                    <div class="document-card-top">

                        <div class="document-icon">
                            ${escapeHtml(template.icon)}
                        </div>

                        <span class="document-code">
                            ${escapeHtml(template.code)}
                        </span>

                    </div>

                    <div class="document-name">
                        ${escapeHtml(template.name)}
                    </div>

                    <div class="document-description">
                        ${escapeHtml(template.description)}
                    </div>

                    <div class="document-meta">

                        <span class="document-tag">
                            ${escapeHtml(template.category)}
                        </span>

                        <span class="document-tag">
                            Tạo văn bản
                        </span>

                    </div>
                `;

                card.addEventListener(
                    "click",
                    function () {
                        openDocumentModal(
                            template.id
                        );
                    }
                );

                grid.appendChild(card);
            });
        });
    }


    /* =====================================================
       RECENT DOCUMENTS
    ===================================================== */

    function getRecentDocuments() {
        const data = getAppData();

        if (
            data &&
            Array.isArray(data.recentDocuments)
        ) {
            return data.recentDocuments;
        }

        return [];
    }


    function renderRecentDocuments() {
        const container =
            $("#recentDocuments");

        if (!container) {
            return;
        }

        const recent =
            getRecentDocuments();

        if (!recent.length) {
            container.innerHTML = `
                <div class="empty-state">

                    <div class="empty-icon">
                        🗂️
                    </div>

                    <div class="empty-title">
                        Chưa có văn bản gần đây
                    </div>

                    <div class="empty-text">
                        Văn bản sau khi được tạo sẽ xuất hiện tại đây.
                    </div>

                </div>
            `;

            return;
        }

        container.innerHTML = `
            <div class="recent-list">

                ${recent
                    .slice(0, 8)
                    .map(item => `
                        <div class="recent-item">

                            <div class="recent-icon">
                                📄
                            </div>

                            <div class="recent-content">

                                <div class="recent-title">
                                    ${escapeHtml(
                                        item.name ||
                                        item.title ||
                                        "Văn bản"
                                    )}
                                </div>

                                <div class="recent-meta">
                                    ${escapeHtml(
                                        item.date ||
                                        item.createdAt ||
                                        ""
                                    )}
                                </div>

                            </div>

                            <span class="recent-status">
                                ${escapeHtml(
                                    item.status ||
                                    "Đã tạo"
                                )}
                            </span>

                        </div>
                    `)
                    .join("")}

            </div>
        `;
    }


    /* =====================================================
       DOCUMENTS PAGE
    ===================================================== */

    function renderDocumentsPage() {
        renderDocumentCards();
    }


    /* =====================================================
       PAGE NAVIGATION
    ===================================================== */

    const PAGE_CONFIG = {

        dashboard: {
            title: "Tổng quan",
            subtitle:
                "Quản lý hồ sơ và văn bản GROVA"
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
                "Theo dõi các hồ sơ đã tạo"
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
                "Quản lý người dùng, mẫu và dữ liệu"
        }

    };


    function switchPage(pageName) {
        const page =
            $("#page-" + pageName);

        if (!page) {
            return;
        }

        $$(".page").forEach(item => {
            item.classList.add("hidden");
            item.classList.remove("active-page");
        });

        page.classList.remove("hidden");
        page.classList.add("active-page");

        state.currentPage =
            pageName;

        $$(".menu-item[data-page]").forEach(
            item => {
                item.classList.toggle(
                    "active",
                    item.dataset.page === pageName
                );
            }
        );

        const config =
            PAGE_CONFIG[pageName];

        if (config) {

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

        if (pageName === "documents") {
            renderDocumentsPage();
        }

        if (pageName === "dashboard") {
            renderDocumentCards();
            renderRecentDocuments();
            renderStats();
        }

        closeMobileSidebar();
    }


    /* =====================================================
       NAVIGATION BINDING
    ===================================================== */

    function bindNavigation() {

        /*
         * Quan trọng:
         * index.html dùng .menu-item,
         * không phải .nav-item.
         */
        $$("[data-page]").forEach(item => {

            item.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();

                    const page =
                        item.dataset.page;

                    if (!page) {
                        return;
                    }

                    switchPage(page);
                }
            );

        });
    }


    /* =====================================================
       NEW DOCUMENT BUTTONS
    ===================================================== */

    function bindNewDocumentButtons() {

        $$(
            '[data-action="new-document"]'
        ).forEach(button => {

            button.addEventListener(
                "click",
                function () {
                    openDocumentModal();
                }
            );

        });
    }


    /* =====================================================
       DOCUMENT MODAL
    ===================================================== */

    function getTemplateById(id) {

        return getTemplates().find(
            template =>
                String(template.id) ===
                String(id)
        );
    }


    function openDocumentModal(templateId) {

        const modal =
            $("#documentModal");

        if (!modal) {
            return;
        }

        const title =
            $("#modalTitle");

        if (title) {
            title.textContent =
                "Chọn mẫu văn bản";
        }

        state.selectedTemplate =
            templateId
                ? getTemplateById(templateId)
                : null;

        renderTemplateSelector();

        modal.classList.add("show");

        document.body.style.overflow =
            "hidden";
    }


    function closeDocumentModal() {

        const modal =
            $("#documentModal");

        if (!modal) {
            return;
        }

        modal.classList.remove("show");

        document.body.style.overflow =
            "";

        state.selectedTemplate =
            null;
    }


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
                        📄
                    </div>

                    <div class="empty-title">
                        Chưa có mẫu văn bản
                    </div>

                    <div class="empty-text">
                        Kiểm tra file data/data.js
                    </div>
                </div>
            `;

            return;
        }

        container.innerHTML = templates
            .map(template => {

                const selected =
                    state.selectedTemplate &&
                    String(
                        state.selectedTemplate.id
                    ) ===
                    String(template.id);

                return `
                    <button
                        type="button"
                        class="template-option ${
                            selected
                                ? "selected"
                                : ""
                        }"
                        data-template-id="${
                            escapeHtml(template.id)
                        }"
                    >

                        <div class="template-option-title">
                            ${escapeHtml(
                                template.name
                            )}
                        </div>

                        <div class="template-option-description">
                            ${escapeHtml(
                                template.description
                            )}
                        </div>

                    </button>
                `;
            })
            .join("");

        /*
         * Footer được tạo bằng JS để không cần
         * sửa index.html.
         */
        const footer =
            document.createElement("div");

        footer.className =
            "modal-footer";

        footer.innerHTML = `
            <button
                type="button"
                class="btn btn-secondary"
                data-modal-cancel
            >
                Hủy
            </button>

            <button
                type="button"
                class="btn btn-primary"
                data-modal-open
            >
                Mở mẫu
            </button>
        `;

        container.parentNode.appendChild(
            footer
        );

        $$(".template-option", container)
            .forEach(option => {

                option.addEventListener(
                    "click",
                    function () {

                        const id =
                            option.dataset.templateId;

                        state.selectedTemplate =
                            getTemplateById(id);

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

        const cancelButton =
            footer.querySelector(
                "[data-modal-cancel]"
            );

        if (cancelButton) {
            cancelButton.addEventListener(
                "click",
                closeDocumentModal
            );
        }

        const openButton =
            footer.querySelector(
                "[data-modal-open]"
            );

        if (openButton) {
            openButton.addEventListener(
                "click",
                startSelectedDocument
            );
        }
    }


    /* =====================================================
       OPEN SELECTED TEMPLATE
    ===================================================== */

    function startSelectedDocument() {

        const template =
            state.selectedTemplate;

        if (!template) {

            alert(
                "Vui lòng chọn mẫu văn bản."
            );

            return;
        }

        if (!template.file) {

            alert(
                "Mẫu văn bản chưa được khai báo file."
            );

            return;
        }

        /*
         * Đóng modal trước khi chuyển trang.
         */
        closeDocumentModal();

        /*
         * Mở template HTML.
         */
        window.location.href =
            template.file;
    }


    /* =====================================================
       MODAL EVENTS
    ===================================================== */

    function bindModal() {

        const modal =
            $("#documentModal");

        if (!modal) {
            return;
        }

        const closeButton =
            $("#closeModal");

        if (closeButton) {
            closeButton.addEventListener(
                "click",
                closeDocumentModal
            );
        }

        const overlay =
            $(".modal-overlay", modal);

        if (overlay) {
            overlay.addEventListener(
                "click",
                closeDocumentModal
            );
        }
    }


    /* =====================================================
       MOBILE SIDEBAR
    ===================================================== */

    function openMobileSidebar() {

        const sidebar =
            $("#sidebar");

        if (!sidebar) {
            return;
        }

        sidebar.classList.add("open");
    }


    function closeMobileSidebar() {

        const sidebar =
            $("#sidebar");

        if (!sidebar) {
            return;
        }

        sidebar.classList.remove("open");
    }


    function bindMobileMenu() {

        const openButton =
            $("#openSidebar");

        const closeButton =
            $("#closeSidebar");

        if (openButton) {
            openButton.addEventListener(
                "click",
                openMobileSidebar
            );
        }

        if (closeButton) {
            closeButton.addEventListener(
                "click",
                closeMobileSidebar
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
                    event.key === "Escape"
                ) {
                    closeDocumentModal();
                    closeMobileSidebar();
                }

            }
        );
    }


    /* =====================================================
       STORAGE
    ===================================================== */

    function loadLocalData() {

        /*
         * Chừa sẵn kiến trúc để sau này kết nối
         * database / authentication.
         *
         * Không tự ghi đè data.js.
         */
        try {

            const savedUser =
                localStorage.getItem(
                    "grova_current_user"
                );

            if (savedUser) {

                const user =
                    JSON.parse(savedUser);

                if (user && user.name) {
                    state.currentUser =
                        user;
                }
            }

        } catch (error) {

            console.warn(
                "Không thể đọc dữ liệu local.",
                error
            );

        }
    }


    /* =====================================================
       TEMPLATE LINKS
    ===================================================== */

    function bindTemplateLinks() {

        /*
         * Cho phép các phần tử khác trong giao diện
         * gọi trực tiếp bằng data-template-id.
         */
        $$("[data-template-id]")
            .forEach(element => {

                if (
                    element.classList.contains(
                        "template-option"
                    )
                ) {
                    return;
                }

                element.addEventListener(
                    "click",
                    function () {

                        const id =
                            element.dataset.templateId;

                        const template =
                            getTemplateById(id);

                        if (template) {
                            openDocumentModal(
                                template.id
                            );
                        }
                    }
                );
            });
    }


    /* =====================================================
       INITIALIZE
    ===================================================== */

    function initializeApp() {

        if (state.initialized) {
            return;
        }

        ensureFreshData(function () {

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
                "GROVA DOCUMENT đã khởi tạo."
            );

            console.log(
                "Số mẫu:",
                getTemplates().length
            );

        });
    }


    /* =====================================================
       START
    ===================================================== */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            initializeApp
        );

    } else {

        initializeApp();

    }


    /* =====================================================
       GLOBAL API
       Dành cho các template HTML sau này
    ===================================================== */

    window.GROVA_DOCUMENT = {

        getData: getAppData,

        getTemplates: getTemplates,

        getTemplateById: getTemplateById,

        openDocumentModal:
            openDocumentModal,

        closeDocumentModal:
            closeDocumentModal,

        startSelectedDocument:
            startSelectedDocument,

        switchPage:
            switchPage

    };

})();