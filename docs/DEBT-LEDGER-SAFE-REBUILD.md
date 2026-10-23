# GROVA DOCUMENT — Công nợ an toàn (thiết kế triển khai)

## Trạng thái
- Nhánh phát triển: `feature/debt-ledger-safe-rebuild`
- Điểm xuất phát: bản ZIP ổn định `a0b215d50c7140f0b9a0f89154e2a1ebefc3936b`
- Chưa tích hợp vào `main`; chưa thay đổi Firestore Rules hoặc dữ liệu thật.
- Module này chỉ được bật sau khi kiểm thử quyền truy cập và các tình huống ghi đồng thời.

## Nguyên tắc không được phá vỡ
1. Không sửa `app.js`, `auth.js`, `firestore.js`, `firestore.rules`, hoặc luồng đăng nhập để thêm công nợ trong giai đoạn đầu.
2. Không đổi schema/logic các module đang PASS.
3. Không tự động tạo hồ sơ người dùng, không tự động nâng quyền.
4. Không cho phép thao tác chỉ dựa vào ẩn/hiện nút giao diện; mọi thao tác dữ liệu phải được Firestore Rules kiểm soát.
5. Không dùng localStorage làm nguồn dữ liệu kế toán chính; cache chỉ để hiển thị, không được dùng để ghi đè dữ liệu cloud.
6. Không triển khai Rules hoặc đưa mã vào `main` trước khi hoàn tất test và duyệt.

## Mô hình dữ liệu đề xuất (chưa tạo trên Firestore)
### `project_debts/{projectId}` — một hồ sơ tổng hợp cho mỗi công trình
- `projectId`: ID tài liệu, bằng ID công trình hiện hữu để ngăn tạo hồ sơ trùng theo công trình.
- `projectCode`, `projectName`, `customerName`: thông tin hiển thị snapshot; dữ liệu công trình gốc không bị sửa.
- `contractAmount`: số nguyên VND, không dùng số thực.
- `receivableAmount`, `payableAmount`: số nguyên VND, tách rõ phải thu và phải trả.
- `status`: `open | partial | settled | disputed`.
- `createdAt`, `createdBy`, `updatedAt`, `updatedBy`: audit metadata.
- `schemaVersion`: số phiên bản tài liệu.

### `project_debts/{projectId}/transactions/{transactionId}` — nhật ký thu/chi
- `transactionId`: UUID tạo một lần phía client trước thao tác lưu; retry phải dùng lại ID này.
- `direction`: `receivable | payable`.
- `amount`: số nguyên VND > 0.
- `date`, `method`, `reference`, `note`: thông tin chứng từ/thanh toán.
- `createdAt`, `createdBy`: bất biến sau khi ghi.
- `voidedAt`, `voidedBy`, `voidReason`: dùng để hủy có dấu vết; không xóa giao dịch đã ghi sổ.

## Quy tắc nghiệp vụ
- Một công trình chỉ có một hồ sơ tổng hợp; ID hồ sơ xác định bằng `projectId`, không sinh ID ngẫu nhiên cho hồ sơ.
- Tạo hồ sơ dùng thao tác create-only/transaction; nếu đã tồn tại thì báo rõ và mở hồ sơ cũ, không ghi thêm bản thứ hai.
- Mỗi giao dịch có ID ổn định để thao tác lưu lặp lại không tạo giao dịch trùng.
- Không cập nhật đè giao dịch đã ghi sổ; điều chỉnh bằng bút toán đảo/hủy có lý do và người thao tác.
- Số dư được tính từ hồ sơ và các giao dịch hợp lệ; không tin số tổng do trình duyệt gửi lên.
- Tiền VND lưu dạng integer, giới hạn an toàn và kiểm tra giá trị dương.
- Tổng hợp phải phân biệt phải thu và phải trả; không cộng trừ lẫn hai chiều.
- Xóa công trình không được tự động xóa lịch sử thu/chi; cần kiểm tra liên kết và chính sách lưu trữ riêng.

## Quyền hạn đề xuất
- Admin: tạo/sửa hồ sơ, ghi nhận giao dịch, điều chỉnh có audit.
- Nhân viên: chỉ xem theo quyền được cấp; quyền ghi giao dịch phải được xác định rõ trong ma trận quyền trước khi bật.
- Firestore Rules phải xác minh người dùng đang đăng nhập, profile đang active, vai trò/quyền được phép, dữ liệu đầu vào hợp lệ, và các trường bất biến.
- Không mở quyền rộng theo kiểu `allow read, write: if signedIn()`.

## Kế hoạch triển khai an toàn
1. Hoàn tất thiết kế và rà soát quy tắc nghiệp vụ.
2. Viết module riêng không nhập vào ứng dụng đang chạy.
3. Kiểm thử thuần: tính số dư, số tiền âm/0, trùng ID, giao dịch lặp, hủy giao dịch.
4. Thiết kế Rules tối thiểu và kiểm thử Emulator/sandbox; không deploy lên production trong bước này.
5. Kiểm tra vai trò Admin, nhân viên, viewer, tài khoản bị khóa; xác nhận module cũ vẫn dùng được.
6. Chỉ sau khi đạt test mới thêm menu/route và cache-busting vào giao diện.
7. Deploy từng bước, kiểm tra ngay sau deploy; có phương án quay về commit ổn định.

## Điều kiện nghiệm thu
- Không thay đổi bất kỳ tệp lõi hoặc Rules nào trước khi duyệt.
- Không tạo dữ liệu thật trong quá trình kiểm thử.
- Không thể tạo hai hồ sơ cho cùng một công trình.
- Retry không tạo giao dịch thứ hai.
- Tài khoản không đủ quyền bị từ chối cả ở giao diện lẫn Firestore.
- Không mất lịch sử thanh toán; giao dịch đã ghi sổ không bị xóa vật lý.
- Các tài khoản và module cũ vẫn hoạt động bình thường.
