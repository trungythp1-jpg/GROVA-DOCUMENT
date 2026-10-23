# GROVA DOCUMENT — Đặc tả thiết kế phân hệ Công nợ & Dòng tiền
**Phiên bản:** 1.0  
**Trạng thái:** Thiết kế đề xuất — chưa triển khai dữ liệu hoặc giao diện  
**Phạm vi:** Admin-only; không sửa module PASS/LOCK; chưa thay đổi schema Firestore hiện tại.

## 1. Quyết định nghiệp vụ đã chốt

- Chức năng công nợ phải thu và phải trả chỉ dành cho tài khoản Admin.
- Nhập và cập nhật thông tin công nợ ngay trong tab Công trình.
- Có thể nhập dữ liệu lịch sử cho công trình cũ; cần trạng thái nhập liệu/đối soát để tránh bỏ sót.
- Mỗi công trình được cấu hình số đợt thanh toán linh hoạt; Admin tự nhập tên đợt, tỷ lệ và điều kiện.
- Tổng tỷ lệ của các đợt trong cùng một lịch thanh toán phải bằng 100% trước khi xác nhận cấu hình.
- Số tiền dự kiến mỗi đợt được tính từ giá trị hợp đồng và tỷ lệ đợt.
- Không tự tính lại giao dịch đã ghi nhận khi sửa giá trị hợp đồng hoặc tỷ lệ; mọi thay đổi phải lưu lịch sử và yêu cầu xác nhận.
- Mỗi đối tác có kỳ thanh toán, hạn chốt hồ sơ, checklist và lịch làm việc riêng.
- Mặc định nhắc chuẩn bị hồ sơ trước hạn chốt 5 ngày làm việc.
- Đợt phụ thuộc vào việc đối tác thu đủ tiền cuối cùng nằm ở trạng thái “Chờ điều kiện”; không mặc định đến hạn sau 2 tháng.
- Khi Admin ghi nhận đối tác đã thu đủ tiền, hệ thống lập kế hoạch theo kỳ thanh toán gần nhất ngày 15/25 hoặc kỳ riêng của đối tác. Nếu đã qua hạn chốt hồ sơ, cảnh báo lỡ kỳ và dùng kỳ tiếp theo phù hợp.
- Không coi đến hạn là đã thu/chi. Chỉ giao dịch thực tế mới làm giảm số dư công nợ.
- Không tự động bù trừ công nợ phải thu với phải trả.

## 2. Phạm vi chức năng đề xuất

1. Khu vực công nợ trong chi tiết công trình: tổng giá trị, các đợt, điều kiện, lịch hồ sơ, số đã thu/trả và số dư.
2. Nhập dữ liệu lịch sử và đối soát công trình cũ.
3. Danh sách công nợ phải thu và phải trả.
4. Cấu hình lịch thanh toán và hạn chốt theo từng đối tác.
5. Checklist hồ sơ theo loại đợt và đối tác.
6. Bảng kê theo kỳ thanh toán, có liên kết đến hồ sơ gốc và xuất báo cáo.
7. Ghi nhận thu/chi từng phần, ngày giao dịch, chứng từ và người xác nhận.
8. Theo dõi trạng thái hồ sơ độc lập với trạng thái tiền.
9. Dashboard Admin, lịch dòng tiền, cảnh báo hồ sơ và khoản quá hạn.
10. Nhật ký thao tác và lịch sử sửa đổi.

## 3. Mô hình dữ liệu đề xuất — chưa áp dụng

Không dùng trường ghi chú hiện tại để chứa dữ liệu công nợ có cấu trúc. Đề xuất tách các nhóm dữ liệu logic sau để duyệt trước khi chọn collection/field thật:

### A. Cấu hình đối tác thanh toán
- Mã đối tác hiện có nếu có.
- Lịch kỳ thanh toán: ngày 15/25 hoặc ngày riêng.
- Hạn chốt hồ sơ theo từng kỳ.
- Số ngày chuẩn bị hồ sơ mặc định (5 ngày làm việc).
- Lịch ngày làm việc/ngày nghỉ.
- Checklist theo đối tác.
- Người liên hệ và ghi chú.
- Người tạo/sửa, thời điểm cập nhật.

### B. Kế hoạch công nợ theo công trình
- Liên kết ID công trình và hợp đồng hiện có.
- Loại nghĩa vụ: phải thu/phải trả.
- Giá trị cơ sở và đơn vị tiền.
- Các đợt: tên, tỷ lệ, giá trị tính toán, điều kiện kích hoạt, trạng thái.
- Các mốc ngày: ký hợp đồng, hoàn tất lắp đặt, xác nhận điều kiện, hạn chốt, kỳ dự kiến.
- Trạng thái hồ sơ độc lập với trạng thái thanh toán.
- Cờ nhập lịch sử/đối soát.
- Nhật ký thay đổi.

### C. Giao dịch thu/chi
- ID nghĩa vụ/đợt liên quan.
- Loại giao dịch: thu hoặc chi.
- Số tiền, ngày giao dịch, phương thức và tham chiếu chứng từ.
- Người ghi nhận và thời điểm.
- Trạng thái xác nhận và lịch sử chỉnh sửa.
- Cơ chế chống ghi trùng.

### D. Hồ sơ và bảng kê
- Liên kết đến biểu mẫu/hồ sơ gốc, không sao chép nội dung tài liệu.
- Kỳ thanh toán, ngày lập bảng kê, trạng thái gửi/duyệt/bổ sung.
- Các đợt được đưa vào bảng kê và tổng tiền.
- Nhật ký người lập, người duyệt và thời điểm.

**Lưu ý:** Đây là nhóm dữ liệu logic để thảo luận, không phải schema Firestore đã duyệt. Chưa tạo collection, chưa ghi dữ liệu.

## 4. Quy tắc tính toán

- Giá trị đợt = giá trị cơ sở hợp đồng × tỷ lệ đợt / 100.
- Tổng tỷ lệ các đợt của một lịch phải bằng 100% khi xác nhận lịch.
- Số dư mỗi đợt = giá trị nghĩa vụ đã chốt − tổng giao dịch thực tế hợp lệ liên quan.
- Giao dịch từng phần được hỗ trợ.
- Nếu sửa lịch sau khi đã có giao dịch, phải lưu phiên bản lịch và xác nhận tác động; không tự động ghi đè lịch sử.
- Ngày chuẩn bị hồ sơ = lùi 5 ngày làm việc từ hạn chốt hồ sơ theo lịch đối tác.
- Nếu chưa cấu hình hạn chốt/kỳ của đối tác, hiển thị “Thiếu cấu hình lịch đối tác”, không tự đoán.
- Nếu ngày xác nhận điều kiện sau hạn chốt của kỳ, cảnh báo và đề xuất kỳ kế tiếp.
- Ngày dự kiến không được coi là ngày thực nhận/thực chi.

## 5. Ma trận quyền đề xuất

| Hành động | Admin | Tài khoản khác |
|---|---:|---:|
| Thấy menu và dashboard công nợ | Có | Không |
| Xem công nợ, số tiền, hồ sơ, báo cáo | Có | Không |
| Tạo/sửa cấu hình và đợt | Có | Không |
| Ghi nhận thu/chi | Có | Không |
| Xác nhận điều kiện và hồ sơ | Có | Không |
| Xuất bảng kê/báo cáo | Có | Không |

Ẩn menu không đủ để bảo mật. Trước triển khai phải rà soát Firebase Auth, permission core và Firestore Rules. Không được thay toàn bộ rules một cách mù quáng hoặc làm ảnh hưởng các module hiện có. Quyền dữ liệu công nợ phải được bảo vệ ở phía dữ liệu và mọi truy cập trực tiếp.

## 6. Tích hợp vào GROVA DOCUMENT

- Tab Công trình là điểm nhập dữ liệu công nợ.
- Dashboard Công nợ & Dòng tiền chỉ tổng hợp từ nguồn dữ liệu đã xác nhận.
- Liên kết với hợp đồng, nghiệm thu, đề nghị thanh toán và đối chiếu công nợ hiện có.
- Không sửa logic hoặc giao diện các module PASS/LOCK ngoài phần tích hợp được duyệt.
- Các biểu mẫu gốc vẫn là nguồn tài liệu chính; bảng kê tham chiếu hồ sơ, không tạo bản sao độc lập gây lệch số liệu.
- Không yêu cầu Firebase Blaze.

## 7. Kiểm thử nghiệm thu bắt buộc

1. Tỷ lệ 40/40/20 và số đợt khác nhau được tính đúng; tổng khác 100% không thể xác nhận.
2. Công trình cũ nhập lịch sử được phân biệt với công trình mới.
3. Khoản đợt cuối chờ xác nhận không có ngày đáo hạn giả định.
4. Xác nhận điều kiện trước/sau hạn chốt cho ra kỳ phù hợp và cảnh báo đúng.
5. Hồ sơ và trạng thái tiền không bị nhập làm một.
6. Thu/chi từng phần tính số dư đúng; giao dịch trùng bị chặn/cảnh báo.
7. Sửa điều khoản không thay đổi âm thầm lịch sử giao dịch.
8. Tài khoản không phải Admin không thể thấy giao diện hoặc đọc/ghi dữ liệu công nợ trực tiếp.
9. Công nợ phải thu và phải trả được báo cáo riêng, không tự bù trừ.
10. Các module PASS/LOCK vượt qua kiểm thử hồi quy.

## 8. Điều kiện trước khi triển khai

1. Duyệt mô hình dữ liệu logic và cách liên kết với schema hiện tại.
2. Rà soát chính xác cấu trúc Firestore, quyền hiện tại và các biểu mẫu liên quan.
3. Trình schema bổ sung, quy tắc bảo mật và kế hoạch migration riêng.
4. Chỉ sau khi được duyệt mới triển khai code trên nhánh riêng và kiểm thử.
5. Không sửa trực tiếp main trong giai đoạn thiết kế.

## 9. Trạng thái hiện tại

Đã tạo tài liệu đặc tả trên nhánh thiết kế để review. Chưa thêm menu, chưa sửa module Công trình, chưa tạo collection và chưa thay đổi schema Firestore.
