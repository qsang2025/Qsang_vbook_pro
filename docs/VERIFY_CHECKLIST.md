# Bảng Kiểm tra Trước khi Phát hành (Verify Checklist)

Trước khi commit mã nguồn hoặc tạo Pull Request, kiểm tra kỹ danh sách các tiêu chuẩn sau:

- [ ] **Kiểm tra Rule 1**: Không có bất kỳ file nào được `load()` mà lại đi gọi `load()` thêm file khác. Đặc biệt `config.js` không được chứa lệnh `load()`.
- [ ] **Kiểm tra cú pháp Rhino ES6**:
  - [ ] Không có `const`, `let`.
  - [ ] Không có arrow function (`=>`).
  - [ ] Không có template literal (`` ` ``).
  - [ ] Không có optional chaining (`?.`).
- [ ] **Khớp nối Script Map**: Mọi script khai báo trong `script` của `plugin.json` đều tồn tại trên đĩa trong thư mục `src/`.
- [ ] **Bảo vệ Thông tin Nhạy cảm**: Tuyệt đối không commit token, cookie cá nhân, mật khẩu tài khoản thật.
- [ ] **Xử lý Lỗi chuẩn vBook**: Mọi trường hợp ngoại lệ đều trả về `Response.error("Thông báo tiếng Việt")`, không trả về `null`.
- [ ] **Tên miền & Cấu hình**: Domain chính nằm trong `config.js`, hỗ trợ override qua `DOMAIN` và các mirror dự phòng.
- [ ] **Golden Fixture (`test.json`)**: Có ít nhất 2 test case (kiểm tra search và detail/chap).
- [ ] **Tự động hóa Build & Catalog**:
  - [ ] Đã chạy `node scripts/cli.js build <ext-dir>` thành công.
  - [ ] Đã chạy `node scripts/cli.js build-catalog`.
  - [ ] Đã chạy `node scripts/cli.js validate` đạt trạng thái `[PASS]`.
