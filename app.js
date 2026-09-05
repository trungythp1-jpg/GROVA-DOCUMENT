/* =========================================================
   GROVA DOCUMENT
   Application Controller
   Stable Version
   ========================================================= */

(() => {

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

    function $(selector, parent = document) {

        return parent.querySelector(selector);

    }


    function $$(selector, parent = document) {

        return Array.from(
            parent.querySelectorAll(selector)
        );

    }


    function escapeHTML(value) {

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


    function getTemplates() {

        const data = getAppData();


        if (!data) {

            return [];

        }


        if (
            Array.isArray(
                data.templates
            )
        ) {

            return data.templates

                .filter(
                    template =>
                        template &&
                        template.enabled !== false
                )

                .map(
                    (template, index) => ({

                        id:
                            String(
                                template.id ??
                                String(
                                    index + 1
                                ).padStart(
                                    2,
                                    "0"
                                )
                            ),

                        code:
                            template.code ||
                            `VB${String(
                                index + 1
                            ).padStart(
                                2,
                                "0"
                            )}`,

                        name:
                            template.name ||
                            template.title ||
                            `Văn bản ${index + 1}`,

                        title:
                            template.title ||
                            template.name ||
                            `Văn bản ${index + 1}`,

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

                    })
                );

        }


        return [];

    }


    function getTemplateById(id) {

        return getTemplates().find(

            template =>

                String(
                    template.id
                ) ===
                String(id)

        );

    }


    /* =====================================================
       PAGE CONFIG
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


    /* =====================================================
       USER
    ===================================================== */

    function getCurrentUser() {

        const data = getAppData();

        return (

            data.currentUser ||

            data.user ||

            {

                name: "Quản trị viên",

                role: "Administrator"

            }

        );

    }


    function getInitials(name) {

        const parts = String(
            name || ""
        )

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

            parts[
                parts.length - 1
            ].charAt(0)

        ).toUpperCase();

    }


    function renderCurrentUser() {

        const user =
            getCurrentUser();


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

            avatar.textContent =
                getInitials(name);

        }

    }


    /* =====================================================
       STATISTICS
    ===================================================== */

    function renderStats() {

        const data =
            getAppData();


        const stats =
            data.stats || {};


        const documents =
            $("#statDocuments");


        const projects =
            $("#statProjects");


        const customers =
            $("#statCustomers");


        const employees =
            $("#statEmployees");


        if (documents) {

            documents.textContent =
                Number(
                    stats.documents || 0
                );

        }


        if (projects) {

            projects.textContent =
                Number(
                    stats.projects || 0
                );

        }


        if (customers) {

            customers.textContent =
                Number(
                    stats.customers || 0
                );

        }


        if (employees) {

            employees.textContent =
                Number(
                    stats.employees || 0
                );

        }

    }


    /* =====================================================
       DOCUMENT CARDS
    ===================================================== */

    function renderDocumentCards() {

        const grids = [

            $("#documentGrid"),

            $("#documentsPageGrid")

        ].filter(Boolean);


        if (!grids.length) {

            return;

        }


        const templates =
            getTemplates();


        grids.forEach(grid => {

            grid.innerHTML = "";


            if (!templates.length) {

                grid.innerHTML = `

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


            templates.forEach(
                template => {

                    const card =
                        document.createElement(
                            "article"
                        );


                    card.className =
                        "document-card";


                    card.dataset.templateId =
                        template.id;


                    card.setAttribute(
                        "role",
                        "button"
                    );


                    card.setAttribute(
                        "tabindex",
                        "0"
                    );


                    card.innerHTML = `

                        <div class="document-card-top">

                            <div class="document-icon">
                                ${escapeHTML(
                                    template.icon
                                )}
                            </div>

                            <span class="document-code">
                                ${escapeHTML(
                                    template.code
                                )}
                            </span>

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

                    `;


                    card.addEventListener(
                        "click",
                        () => {

                            openDocumentModal(
                                template.id
                            );

                        }
                    );


                    card.addEventListener(
                        "keydown",
                        event => {

                            if (
                                event.key ===
                                "Enter" ||

                                event.key ===
                                " "
                            ) {

                                event.preventDefault();

                                openDocumentModal(
                                    template.id
                                );

                            }

                        }
                    );


                    grid.appendChild(
                        card
                    );

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
                                    ${escapeHTML(
                                        item.name ||
                                        item.title ||
                                        "Văn bản"
                                    )}
                                </div>

                                <div class="recent-meta">
                                    ${escapeHTML(
                                        item.date ||
                                        item.createdAt ||
                                        ""
                                    )}
                                </div>

                            </div>

                            <span class="recent-status">
                                ${escapeHTML(
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
       PAGE SWITCH
    ===================================================== */

    function switchPage(pageName) {

        if (
            !PAGE_CONFIG[
                pageName
            ]
        ) {

            pageName =
                "dashboard";

        }


        const target =
            $(
                "#page-" +
                pageName
            );


        if (!target) {

            return;

        }


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


        target.classList.remove(
            "hidden"
        );


        target.classList.add(
            "active-page"
        );


        state.currentPage =
            pageName;


        $$(".menu-item[data-page]")
            .forEach(item => {

                item.classList.toggle(

                    "active",

                    item.dataset.page ===
                    pageName

                );

            });


        const config =
            PAGE_CONFIG[
                pageName
            ];


        const pageTitle =
            $("#pageTitle");


        const pageSubtitle =
            $("#pageSubtitle");


        if (pageTitle) {

            pageTitle.textContent =
                config.title;

        }


        if (pageSubtitle) {

            pageSubtitle.textContent =
                config.subtitle;

        }


        if (
            pageName ===
            "dashboard"
        ) {

            renderDocumentCards();

            renderRecentDocuments();

            renderStats();

        }


        if (
            pageName ===
            "documents"
        ) {

            renderDocumentCards();

        }


        closeMobileSidebar();

    }


    /* =====================================================
       NAVIGATION
    ===================================================== */

    function bindNavigation() {

        $$(".menu-item[data-page]")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        const page =
                            button.dataset.page;


                        if (!page) {

                            return;

                        }


                        switchPage(page);

                    }
                );

            });


        $$(".text-button[data-page]")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    event => {

                        event.preventDefault();

                        switchPage(
                            button.dataset.page
                        );

                    }
                );

            });

    }


    /* =====================================================
       NEW DOCUMENT
    ===================================================== */

    function bindNewDocumentButtons() {

        $$(
            '[data-action="new-document"]'
        ).forEach(button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    openDocumentModal();

                }
            );

        });

    }


    /* =====================================================
       MODAL
    ===================================================== */

    function openDocumentModal(
        templateId = null
    ) {

        const modal =
            $("#documentModal");


        if (!modal) {

            return;

        }


        state.selectedTemplate =
            templateId
                ? getTemplateById(
                    templateId
                )
                : null;


        const title =
            $("#modalTitle");


        if (title) {

            title.textContent =
                "Chọn mẫu văn bản";

        }


        renderTemplateSelector();


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


    function closeDocumentModal() {

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


    function renderTemplateSelector() {

        const container =
            $("#templateSelector");


        if (!container) {

            return;

        }


        const templates =
            getTemplates();


        container.innerHTML = "";


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


        templates.forEach(
            template => {

                const button =
                    document.createElement(
                        "button"
                    );


                button.type =
                    "button";


                button.className =
                    "template-option";


                if (
                    state.selectedTemplate &&

                    String(
                        state.selectedTemplate.id
                    ) ===
                    String(
                        template.id
                    )
                ) {

                    button.classList.add(
                        "selected"
                    );

                }


                button.dataset.templateId =
                    template.id;


                button.setAttribute(
                    "aria-pressed",
                    state.selectedTemplate &&
                    String(
                        state.selectedTemplate.id
                    ) ===
                    String(
                        template.id
                    )
                        ? "true"
                        : "false"
                );


                button.innerHTML = `

                    <span class="template-option-icon">
                        ${escapeHTML(
                            template.icon
                        )}
                    </span>


                    <span class="template-option-content">

                        <span class="template-option-code">
                            ${escapeHTML(
                                template.code
                            )}
                        </span>

                        <span class="template-option-title">
                            ${escapeHTML(
                                template.name
                            )}
                        </span>

                        <span class="template-option-description">
                            ${escapeHTML(
                                template.description
                            )}
                        </span>

                    </span>


                    <span
                        class="template-option-check"
                        aria-hidden="true"
                    >
                        ✓
                    </span>

                `;


                button.addEventListener(
                    "click",
                    () => {

                        state.selectedTemplate =
                            getTemplateById(
                                template.id
                            );


                        $$(".template-option")
                            .forEach(
                                item => {

                                    item.classList.remove(
                                        "selected"
                                    );

                                    item.setAttribute(
                                        "aria-pressed",
                                        "false"
                                    );

                                }
                            );


                        button.classList.add(
                            "selected"
                        );


                        button.setAttribute(
                            "aria-pressed",
                            "true"
                        );

                    }
                );


                container.appendChild(
                    button
                );

            }
        );

    }


    /* =====================================================
       OPEN TEMPLATE
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


        closeDocumentModal();


        window.location.href =
            template.file;

    }


    /* =====================================================
       MODAL BUTTONS
    ===================================================== */

    function bindModal() {

        const modal =
            $("#documentModal");


        if (!modal) {

            return;

        }


        const closeButton =
            $("#closeModal");


        const cancelButton =
            $("#cancelModal");


        const openButton =
            $("#openTemplate");


        const overlay =
            $(".modal-overlay", modal);


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    closeDocumentModal();

                }
            );

        }


        if (cancelButton) {

            cancelButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    closeDocumentModal();

                }
            );

        }


        if (openButton) {

            openButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    startSelectedDocument();

                }
            );

        }


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


        sidebar.classList.add(
            "open"
        );

    }


    function closeMobileSidebar() {

        const sidebar =
            $("#sidebar");


        if (!sidebar) {

            return;

        }


        sidebar.classList.remove(
            "open"
        );

    }


    function bindMobileMenu() {

        const openButton =
            $("#openSidebar");


        const closeButton =
            $("#closeSidebar");


        if (openButton) {

            openButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    openMobileSidebar();

                }
            );

        }


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    closeMobileSidebar();

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
            event => {

                if (
                    event.key ===
                    "Escape"
                ) {

                    closeDocumentModal();

                    closeMobileSidebar();

                }

            }
        );

    }


    /* =====================================================
       INITIALIZE
    ===================================================== */

    function initializeApp() {

        if (
            state.initialized
        ) {

            return;

        }


        state.initialized =
            true;


        renderCurrentUser();

        renderStats();

        renderDocumentCards();

        renderRecentDocuments();


        bindNavigation();

        bindNewDocumentButtons();

        bindModal();

        bindMobileMenu();

        bindKeyboard();


        switchPage(
            "dashboard"
        );


        console.log(
            "GROVA DOCUMENT đã khởi tạo."
        );


        console.log(
            "Số mẫu:",
            getTemplates().length
        );

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
    ===================================================== */

    window.GROVA_DOCUMENT = {

        getData:
            getAppData,

        getTemplates:
            getTemplates,

        getTemplateById:
            getTemplateById,

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