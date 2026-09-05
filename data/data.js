/* =========================================================
   GROVA DOCUMENT
   DATA CENTER
   =========================================================
   File này là nơi quản lý dữ liệu cấu hình của hệ thống.

   KHÔNG đặt mật khẩu tài khoản thật ở đây.
   Dữ liệu thật sẽ chuyển sang Database khi kết nối Backend.
   ========================================================= */

const GROVA_DATA = {

    /* =====================================================
       THÔNG TIN CÔNG TY
       ===================================================== */

    company: {

        name: "CÔNG TY CỔ PHẦN GROVAHOLDINGS SJC",

        shortName: "GROVA HOLDINGS",

        internationalName:
            "GROVA HOLDINGS JOINT STOCK COMPANY",

        address:
            "Số 49A/348 Trần Nguyên Hãn, Phường An Biên, Thành phố Hải Phòng, Việt Nam",

        taxCode:
            "0202328361",

        representative:
            "Phạm Văn Học",

        position:
            "Giám đốc"

    },


    /* =====================================================
       CẤU HÌNH HỆ THỐNG
       ===================================================== */

    system: {

        appName:
            "GROVA DOCUMENT",

        shortName:
            "GROVA DOC",

        version:
            "1.0.0",

        language:
            "vi-VN",

        paperSize:
            "A4",

        outputFormat:
            "PDF"

    },


    /* =====================================================
       NHÓM VĂN BẢN
       ===================================================== */

    documentGroups: [

        {
            id: "contract",
            name: "Hợp đồng"
        },

        {
            id: "construction",
            name: "Thi công"
        },

        {
            id: "acceptance",
            name: "Nghiệm thu"
        },

        {
            id: "payment",
            name: "Thanh toán"
        },

        {
            id: "debt",
            name: "Công nợ"
        },

        {
            id: "hr",
            name: "Nhân sự"
        },

        {
            id: "other",
            name: "Khác"
        }

    ],


    /* =====================================================
       KHO MẪU VĂN BẢN
       
       Có thể thêm mẫu mới mà KHÔNG phải sửa app.js.
       ===================================================== */

    templates: [

        {
            id: "HDNT",

            code: "01",

            name:
                "Hợp đồng nguyên tắc",

            description:
                "Hợp đồng nguyên tắc thi công lắp đặt khung thép thang máy",

            group:
                "contract",

            file:
                "01-hop-dong-nguyen-tac.html",

            enabled:
                true
        },


        {
            id: "PLHD",

            code: "02",

            name:
                "Phụ lục hợp đồng",

            description:
                "Phụ lục hợp đồng thi công",

            group:
                "contract",

            file:
                "02-phu-luc-hop-dong.html",

            enabled:
                true
        },


        {
            id: "PXDTC",

            code: "03",

            name:
                "Phiếu đề nghị thi công",

            description:
                "Phiếu đề nghị thi công nội bộ công ty",

            group:
                "construction",

            file:
                "03-de-nghi-thi-cong.html",

            enabled:
                true
        },


        {
            id: "BBPS",

            code: "04",

            name:
                "Biên bản xác nhận phát sinh",

            description:
                "Biên bản xác nhận khối lượng và giá trị phát sinh",

            group:
                "construction",

            file:
                "04-xac-nhan-phat-sinh.html",

            enabled:
                true
        },


        {
            id: "BBNT",

            code: "05",

            name:
                "Biên bản nghiệm thu và bàn giao",

            description:
                "Biên bản nghiệm thu và bàn giao công trình",

            group:
                "acceptance",

            file:
                "05-nghiem-thu-ban-giao.html",

            enabled:
                true
        },


        {
            id: "DNTT",

            code: "06",

            name:
                "Đề nghị thanh toán",

            description:
                "Đề nghị thanh toán theo hồ sơ",

            group:
                "payment",

            file:
                "06-de-nghi-thanh-toan.html",

            enabled:
                true
        },


        {
            id: "DCCN",

            code: "07",

            name:
                "Đối chiếu công nợ",

            description:
                "Biên bản đối chiếu và xác nhận công nợ",

            group:
                "debt",

            file:
                "07-doi-chieu-cong-no.html",

            enabled:
                true
        },


        {
            id: "HDLD",

            code: "08",

            name:
                "Hợp đồng lao động",

            description:
                "Hợp đồng lao động",

            group:
                "hr",

            file:
                "08-hop-dong-lao-dong.html",

            enabled:
                true
        }

    ],


    /* =====================================================
       CẤU HÌNH QUYỀN
       ===================================================== */

    roles: [

        {
            id: "admin",

            name:
                "Quản trị hệ thống",

            permissions: [

                "view",
                "create",
                "edit",
                "delete",
                "manage_users",
                "manage_templates",
                "manage_data",
                "export_pdf"
            ]
        },


        {
            id: "employee",

            name:
                "Nhân viên",

            permissions: [

                "view",
                "create",
                "edit_own",
                "export_pdf"
            ]
        }

    ],


    /* =====================================================
       QUY TẮC PDF
       ===================================================== */

    pdf: {

        format:
            "A4",

        orientation:
            "portrait",

        marginTop:
            "20mm",

        marginRight:
            "20mm",

        marginBottom:
            "20mm",

        marginLeft:
            "20mm",

        output:
            "PDF"

    }

};


/* =========================================================
   HÀM TIỆN ÍCH
   ========================================================= */

function getTemplateById(id) {

    return GROVA_DATA.templates.find(
        template => template.id === id
    );

}


function getTemplateByCode(code) {

    return GROVA_DATA.templates.find(
        template => template.code === code
    );

}


function getTemplatesByGroup(group) {

    return GROVA_DATA.templates.filter(
        template =>
            template.group === group &&
            template.enabled === true
    );

}


function getCompanyData() {

    return GROVA_DATA.company;

}