

window.GROVA_DATA = {

  app: {
    name: "GROVA DOCUMENT",
    shortName: "GROVA DOC",
    description: "Hệ thống quản lý văn bản và hồ sơ GROVA HOLDINGS",
    version: "201"
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
      id: "00",
      code: "BIA-HĐ",
      name: "Bìa hợp đồng",
      title: "BÌA HỢP ĐỒNG",
      description: "Tạo bìa hợp đồng GROVA theo mẫu A4, nhập thông tin và in/xuất PDF.",
      category: "Hợp đồng",
      icon: "📘",
      file: "./templates/00-bia-hop-dong.html",
      enabled: true
    },

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
    },

    {
      id: "10",
      code: "PĐHKĐH",
      name: "Phiếu đặt hàng khung định hình",
      title: "PHIẾU ĐẶT HÀNG KHUNG ĐỊNH HÌNH",
      description: "Phiếu đặt hàng khung thép thang máy, tự tạo dòng chiều cao tầng theo số tầng nhập tay.",
      category: "Thi công",
      icon: "📐",
      file: "./templates/10-phieu-dat-hang-khung-dinh-hinh.html",
      enabled: true
    },

    {
      id: "11",
      code: "PĐHTM",
      name: "Phiếu đặt hàng thang máy",
      title: "PHIẾU ĐẶT HÀNG THANG MÁY",
      description: "Phiếu đặt hàng thang máy, nhập thông tin công trình, thông số kỹ thuật, ghi chú và ngày giao hàng.",
      category: "Thi công",
      icon: "🛗",
      file: "./templates/11-phieu-dat-hang-thang-may.html",
      enabled: true
    },

    {
      id: "12",
      code: "BG-KT",
      name: "Báo giá khung thép thang máy",
      title: "BÁO GIÁ KHUNG THÉP THANG MÁY",
      description: "Báo giá khung thép thang máy, tự tính tổng, lưu nháp và in/xuất PDF.",
      category: "Báo giá",
      icon: "🧾",
      file: "./templates/12-bao-gia-khung-thep.html",
      enabled: true
    },

    {
      id: "13",
      code: "BG-TM",
      name: "Báo giá thang máy GROVA",
      title: "BÁO GIÁ THANG MÁY GROVA",
      description: "Báo giá thang máy GROVA; có lựa chọn nhập tay cho thiết bị, tùy chọn kỹ thuật và bản in/PDF hiển thị giá trị đã chọn gọn gàng.",
      category: "Báo giá",
      icon: "🛗",
      file: "./templates/13-bao-gia-thang-may-grova.html",
      enabled: true
    },

    {
      id: "14",
      code: "BG-DA",
      name: "Báo giá thang máy Đức Anh",
      title: "BÁO GIÁ THANG MÁY ĐỨC ANH",
      description: "Báo giá thang máy Đức Anh Việt Nam; cấu hình thiết bị, lựa chọn vật liệu, tự tính giá trị và VAT, lưu nháp, in/xuất PDF.",
      category: "Báo giá",
      icon: "🛗",
      file: "./templates/14-bao-gia-thang-may-duc-anh.html",
      enabled: true
    },

    {
      id: "15",
      code: "HDKT-DA",
      name: "Hợp đồng kinh tế thang máy Đức Anh",
      title: "HỢP ĐỒNG KINH TẾ THANG MÁY ĐỨC ANH",
      description: "Hợp đồng kinh tế thang máy Đức Anh; thông tin công trình, điều khoản, giá trị, thanh toán và phụ lục đặc tính kỹ thuật; lưu nháp và xuất PDF.",
      category: "Hợp đồng",
      icon: "📄",
      file: "./templates/15-hop-dong-kinh-te-thang-may-duc-anh.html",
      enabled: true
    },

    {
      id: "16",
      code: "BBHTP",
      name: "Biên bản làm việc tại hiện trường với thầu phụ",
      title: "BIÊN BẢN LÀM VIỆC TẠI HIỆN TRƯỜNG",
      description: "Biên bản kiểm tra tình trạng khung thang máy, ghi nhận kết luận và ký trực tiếp trên điện thoại.",
      category: "Thi công",
      icon: "📝",
      file: "./templates/16-bien-ban-hien-truong-thau-phu.html",
      enabled: true
    },

  ],

  stats: {
    documents: 0,
    projects: 0,
    customers: 0,
    employees: 0
  },

  recentDocuments: []

};
