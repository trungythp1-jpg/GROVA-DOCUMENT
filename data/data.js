/*
 * GROVA DOCUMENT
 * DATA
 */

window.GROVA_DATA = {

  app: {
    name: "GROVA DOCUMENT",
    shortName: "GROVA DOC",
    description: "Hệ thống quản lý văn bản và hồ sơ GROVA HOLDINGS"
  },

  company: {
    name: "CÔNG TY CỔ PHẦN GROVA HOLDINGS",
    taxCode: "0202328361",
    address: "49A/348 Trần Nguyên Hãn, Phường An Biên, Thành phố Hải Phòng",
    representative: "PHẠM VĂN HỌC",
    position: "Giám Đốc"
  },

  templates: [

    {
      id: "01",
      code: "HĐNT",
      name: "Hợp đồng nguyên tắc",
      title: "HỢP ĐỒNG NGUYÊN TẮC",
      description: "Thi công lắp đặt khung thép thang máy",
      category: "Hợp đồng",
      icon: "📄",
      file: "./templates/01-hop-dong-nguyen-tac.html",
      enabled: true
    },

    {
      id: "02",
      code: "PLHĐ",
      name: "Phụ lục hợp đồng",
      title: "PHỤ LỤC HỢP ĐỒNG THI CÔNG",
      description: "Phụ lục công trình thi công khung thép thang máy",
      category: "Hợp đồng",
      icon: "📋",
      file: "./templates/02-phu-luc-hop-dong.html",
      enabled: true
    },

    {
      id: "03",
      code: "PĐNTC",
      name: "Phiếu đề nghị thi công",
      title: "PHIẾU ĐỀ NGHỊ THI CÔNG",
      description: "Phiếu đề nghị thi công nội bộ công ty",
      category: "Thi công",
      icon: "📝",
      file: "./templates/03-de-nghi-thi-cong.html",
      enabled: true
    },

    {
      id: "04",
      code: "BBPS",
      name: "Biên bản xác nhận phát sinh",
      title: "BIÊN BẢN XÁC NHẬN PHÁT SINH",
      description: "Xác nhận các nội dung phát sinh của công trình",
      category: "Thi công",
      icon: "➕",
      file: "./templates/04-xac-nhan-phat-sinh.html",
      enabled: true
    },

    {
      id: "05",
      code: "BBNTBG",
      name: "Biên bản nghiệm thu và bàn giao",
      title: "BIÊN BẢN NGHIỆM THU VÀ BÀN GIAO",
      description: "Nghiệm thu và bàn giao khung thép thang máy",
      category: "Nghiệm thu",
      icon: "✅",
      file: "./templates/05-nghiem-thu-ban-giao.html",
      enabled: true
    },

    {
      id: "06",
      code: "ĐNTT",
      name: "Đề nghị thanh toán",
      title: "ĐỀ NGHỊ THANH TOÁN",
      description: "Đề nghị thanh toán giá trị thi công lắp khung thép thang máy",
      category: "Thanh toán",
      icon: "💰",
      file: "./templates/06-de-nghi-thanh-toan.html",
      enabled: true
    },

    {
      id: "07",
      code: "ĐCCN",
      name: "Đối chiếu công nợ",
      title: "BIÊN BẢN ĐỐI CHIẾU VÀ XÁC NHẬN CÔNG NỢ",
      description: "Đối chiếu và xác nhận công nợ giữa hai bên",
      category: "Công nợ",
      icon: "🧾",
      file: "./templates/07-doi-chieu-cong-no.html",
      enabled: true
    },

    {
      id: "08",
      code: "HĐLĐ",
      name: "Hợp đồng lao động",
      title: "HỢP ĐỒNG LAO ĐỘNG",
      description: "Hợp đồng lao động",
      category: "Nhân sự",
      icon: "👤",
      file: "./templates/08-hop-dong-lao-dong.html",
      enabled: true
    },

    {
      id: "09",
      code: "BBTLHĐ",
      name: "Biên bản thanh lý hợp đồng",
      title: "BIÊN BẢN THANH LÝ HỢP ĐỒNG",
      description: "Thanh lý hợp đồng thi công lắp đặt khung thép thang máy",
      category: "Hợp đồng",
      icon: "📑",
      file: "./templates/09-thanh-ly-hop-dong.html",
      enabled: true
    }

  ],

  stats: {
    documents: 0,
    projects: 0,
    customers: 0,
    employees: 0
  },

  recentDocuments: []

};