# Hướng dẫn Đóng góp (Contributing Guide)

Cảm ơn bạn đã đóng góp cho dự án **Qsang_vbook_pro**! Để duy trì chất lượng kho extension chuyên nghiệp, ổn định và tự động hóa cao, vui lòng tuân thủ các hướng dẫn dưới đây.

---

## 1. Nguyên tắc làm việc

1. **Một PR cho một Nguồn**: Mỗi Pull Request chỉ nên thêm hoặc sửa một extension duy nhất để thuận tiện cho việc review và chạy CI.
2. **Tuân thủ quy chuẩn mã nguồn**:
   - Sử dụng cú pháp tương thích Rhino ES6 (`var`, `function`, không dùng `const`/`let`/arrow functions).
   - Đảm bảo Rule 1: Không gọi `load()` đệ quy. `config.js` không được gọi `load()`.
3. **Luôn đi kèm Golden Fixture (`test.json`)**: Mọi extension mới bắt buộc phải có ít nhất 2 test case trong `test.json` để hệ thống CI tự động quét tình trạng hoạt động mỗi ngày.
4. **Tăng phiên bản (Bump Version)**: Khi cập nhật một extension, hãy tăng trường `version` trong file `plugin.json` của extension đó. Sau đó chạy:
   ```bash
   node scripts/cli.js build extensions/<loại>/<tên>
   node scripts/cli.js build-catalog
   node scripts/cli.js validate
   ```

---

## 2. Các bước gửi đóng góp

1. Tạo nhánh mới từ `main`:
   ```bash
   git checkout -b feat/add-new-source
   ```
2. Thêm hoặc cập nhật code trong `extensions/<loại>/<tên>/`.
3. Chạy kiểm tra tĩnh toàn diện:
   ```bash
   node scripts/cli.js validate
   ```
4. Đẩy commit và mở Pull Request trên GitHub. CI GitHub Actions sẽ tự động kiểm tra cú pháp và chạy health-check thử nghiệm.
