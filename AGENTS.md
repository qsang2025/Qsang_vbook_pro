# Qsang_vbook_pro — Quy tắc Vận hành & Tiêu chuẩn Kỹ thuật (AGENTS.md)

Chào mừng bạn và các Agent AI đến với kho khung sườn **Qsang_vbook_pro** — Khung sườn Extension vBook chuyên nghiệp thế hệ mới.

Nhánh mặc định của kho mã nguồn: **`main`**.

---

## 1. Hợp đồng API Chuẩn duy nhất: `extension-api.md`

- Mọi định dạng dữ liệu, hàm hệ thống và vòng đời script đều phải tuân theo đúng nội dung của file **`extension-api.md`** (2.336 dòng) ở thư mục gốc repo và bản sao trong `.agents/skills/vbook-extensions/reference/extension-api.md`.
- Tuyệt đối không tự suy diễn API vBook từ trí nhớ hoặc từ code của các phiên bản app cũ.
- Khi hợp đồng có cập nhật, cả hai bản phải được cập nhật đồng thời và có cùng mã băm SHA-256.

---

## 2. Nguồn Sự thật Duy nhất: `src/`

- Thư mục `extensions/<loại>/<tên>/src/` trên đĩa là **nguồn sự thật duy nhất** (Single Source of Truth).
- File `plugin.zip` là thành phẩm đóng gói (artifact) do hệ thống build tự động sinh ra từ `src/` cùng các thư viện trong `lib/`.
- Tuyệt đối không chỉnh sửa code trực tiếp bên trong file zip. Mọi sửa đổi phải thực hiện trong `src/` rồi build lại.

---

## 3. Quy tắc Bắt buộc với Mọi Extension

1. **Quy tắc 1 (Rhino ES6 `load()` Constraint)**:
   - Cơ chế `load('file.js')` của vBook là chèn văn bản cấp engine, chỉ load file ở top level của `src/` trong cùng extension.
   - **Tuyệt đối không đệ quy**: File được `load()` vào không được phép gọi `load()` thêm bất kỳ file nào khác.
   - **`config.js` KHÔNG ĐƯỢC chứa lệnh `load()`**. Các file script chính (`detail.js`, `chap.js`, `gen.js`) tự load các file thư viện cần thiết ở đầu file.
   - Các file tab tĩnh như `home.js`, `genre.js` trả về mảng tĩnh không cần gọi `load('config.js')`.

2. **Cú pháp tương thích Rhino ES6**:
   - Chỉ dùng: `var`, `function`, nối chuỗi bằng `+`.
   - Cấm dùng: `const`, `let`, `async/await`, Arrow functions (`() => {}`), Template literals (`` `...` ``), Optional chaining (`?.`), Nullish coalescing (`??`), Spread operators (`...`).
   - Xử lý lỗi luôn trả về `Response.error("Thông báo tiếng Việt")`, không bao giờ `return null`.

3. **Cấu hình Tên miền Linh hoạt (`config.js`)**:
   - Không hardcode domain trong các script con. Mọi URL gốc đều lấy từ `BASE_URL`.
   - Hỗ trợ người dùng thay đổi domain thông qua biến cấu hình `DOMAIN` được app vBook inject trong `try/catch`.

4. **Khai thác Kiến trúc Web Hiện đại**:
   - Với các trang web Next.js App Router, ưu tiên:
     - **TOC**: Bóc tách qua Server Action (`Next-Action` header + POST JSON payload).
     - **Nội dung chương**: Bóc tách qua Streaming RSC flight chunks (`:T<hex>,`).
     - **Thông tin truyện**: Bóc tách qua Schema chuẩn SEO `<script type="application/ld+json">`.

5. **Bộ lọc Rác & Trình bày Đọc truyện**:
   - Loại bỏ các chuỗi điều hướng thừa ("CHƯƠNG N", "Chương trước", "Chương sau", "Báo lỗi", quảng cáo, timestamp).
   - Truyền tiêu đề chương chuẩn vào tham số thứ hai của `Response.success(content, chapterTitle)` để app vBook hiển thị tên chương trên thanh công cụ đọc.

---

## 4. Bộ Công cụ Dòng lệnh Chuẩn (Zero External Dependencies)

Mọi thao tác quản trị, kiểm tra và phát hành đều thực hiện qua bộ CLI chuẩn tại `scripts/cli.js`:

```bash
# Kiểm tra cú pháp, Rule 1 và tính toàn vẹn của repo
node scripts/cli.js validate

# Build extension (tự động inline lib/ và đóng gói plugin.zip)
node scripts/cli.js build extensions/<loại>/<tên>

# Cập nhật registry trung tâm plugin.json ở root
node scripts/cli.js build-catalog

# Chạy kiểm thử sức khỏe nguồn & đối soát Golden Fixture
node scripts/cli.js health-check

# Kết nối & kiểm thử trên điện thoại thật qua Developer Server
node scripts/cli.js connect
node scripts/cli.js test extensions/<loại>/<tên> search.js "kiếm hiệp"
node scripts/cli.js testall
node scripts/cli.js install extensions/<loại>/<tên>
```

---

## 5. Golden Fixture (`test.json`) & Giám sát CI Tự động

- Mỗi extension trong `extensions/` bắt buộc phải có file `test.json` chứa các trường hợp kiểm thử mẫu (Golden Fixtures) với URL và kết quả kỳ vọng (`expectedPattern`).
- Hệ thống CI chạy lịch quét mỗi ngày:
  - Tự động kiểm tra HTTP status và độ trễ phản hồi của từng nguồn.
  - Tự động đối chiếu mẫu dữ liệu để phát hiện website đổi giao diện sớm.
  - Tự động cập nhật `STATUS.md`.
  - Tự động mở GitHub Issue gắn nhãn `bug` khi phát hiện nguồn bị gãy.

---

## 6. Bảo mật & Bản quyền (Attribution)

- **Tuyệt đối không commit token, cookie cá nhân, mật khẩu hay API key thật vào repo**.
- Giữ nguyên vẹn chú thích bản quyền và nguồn gốc thuật toán mượn từ các cộng đồng nguồn mở.
- Không đưa nội dung vi phạm bản quyền hay nội dung người lớn vào catalog chung.
