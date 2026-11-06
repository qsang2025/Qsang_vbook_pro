# Qsang_vbook_pro — Professional vBook Extension Framework

Khung sườn phát triển extension vBook chuyên nghiệp, độc lập và toàn diện, được đúc kết từ việc phân tích sâu 33 kho extension vBook thực tế và khắc phục triệt để các điểm yếu cố hữu của hệ sinh thái hiện tại.

Hợp đồng API duy nhất: [`extension-api.md`](extension-api.md) (nguyên văn 2.336 dòng từ chuẩn tham chiếu Darkrai9x).

---

## 🌟 Điểm nổi bật & Khác biệt vượt trội

So với 33 repository extension hiện hữu (kể cả chuẩn tham chiếu `Darkrai9x` hay `kychitoge`):

| Tính năng | 33 Repo Hiện Hữu | Qsang_vbook_pro |
| :--- | :---: | :---: |
| **CI Health-Check tự động** | ❌ Không có (0/33 repo) | ✅ Chạy định kỳ qua GitHub Actions, tự mở Issue khi web đổi domain/gãy |
| **Báo cáo trạng thái tự động** | ❌ Thủ công / Không có | ✅ Tự động cập nhật [`STATUS.md`](STATUS.md) sau mỗi lần quét |
| **Golden Fixtures (`test.json`)** | ❌ Không có | ✅ Định nghĩa kỳ vọng kết quả để phát hiện site đổi giao diện sớm |
| **Mirror Failover trong Fetch** | ❌ Hardcode 1 domain | ✅ Tự động đảo sang mirror phụ khi mirror chính bị chặn hoặc lỗi 5xx/504 |
| **Rate-limit 429 Retry** | ❌ Gặp 429 là crash | ✅ Đọc header `Retry-After`, tự động `sleep()` và retry thông minh |
| **Next.js Server Actions** | ❌ Chỉ hỗ trợ GET đơn giản | ✅ Hỗ trợ POST với header `Next-Action` và JSON payload |
| **Quản lý thư viện dùng chung** | ⚠️ Thường thiếu file khi zip | ✅ Tự động copy file `lib/` vào `src/` khi build, validate độ toàn vẹn của zip |
| **Linter cú pháp Rhino ES6** | ❌ Gặp lỗi runtime trên app | ✅ Linter tĩnh chặn arrow function, async/await, template string, spread |
| **Registry `plugin.json`** | ⚠️ Sửa tay / lệch dữ liệu | ✅ Tự động sinh 100% bằng CLI `build-catalog`, cấm sửa tay |
| **Dependency bên ngoài** | ⚠️ Cần npm package, python... | ✅ **Zero Dependency** — 100% Node.js thuần (fs, path, http, zlib) |

---

## 📁 Cấu trúc thư mục

```text
Qsang_vbook_pro/
├── .agents/
│   └── skills/
│       └── vbook-extensions/          # Skill hướng dẫn AI Agent (5 modes)
│           ├── SKILL.md
│           ├── modes/                 # create, fix, test, audit, refactor
│           ├── reference/             # extension-api.md, runtime.md, cli.md...
│           └── scripts/               # vbook.js & servers.example.json
├── .github/
│   └── workflows/
│       ├── validate.yml               # CI kiểm tra cú pháp Rhino ES6 & schema trên PR/Push
│       └── health-check.yml           # CI chạy định kỳ, cập nhật STATUS.md, mở issue báo lỗi
├── extensions/                        # Cấu trúc chuẩn theo loại
│   ├── novel/                         # Truyện chữ thông thường
│   ├── chinese_novel/                 # Truyện chữ tiếng Trung (GBK/zh_CN)
│   ├── comic/                         # Truyện tranh
│   ├── video/                         # Phim / Hoạt hình
│   ├── audio/                         # Sách nói / Nhạc
│   ├── translate/                     # Máy dịch
│   ├── tts/                           # Giọng đọc Text-to-Speech
│   └── ai/                            # Trợ lý AI (OpenAI API stream)
├── lib/                               # Thư viện dùng chung (Rhino ES6)
│   ├── cleanHtml.js                   # Lọc rác, xóa quảng cáo, chuẩn hóa đoạn văn
│   ├── config-helpers.js              # Chuẩn hóa URL, đọc config an toàn, định dạng detail Rule 9
│   ├── fetch-helpers.js               # Failover mirror, 429 Retry-After, POST Next-Action
│   └── gbk.js                         # Mã hóa URL GBK cho web tiếng Trung
├── scripts/                           # CLI công cụ chuẩn (Node.js thuần, 0 dependency)
│   ├── cli.js                         # Entrypoint duy nhất cho mọi lệnh
│   ├── validate.js                    # Kiểm tra cú pháp Rhino, schema manifest, lib in zip
│   ├── build.js                       # Bundle lib vào src/ và đóng gói plugin.zip
│   ├── build-catalog.js               # Quét extensions/ và sinh root plugin.json tự động
│   ├── health-check.js                # Chạy probe kiểm tra nguồn & golden fixtures
│   └── vbook.js                       # Kết nối điện thoại, test, build, install
├── templates/                         # Khung sườn mẫu đầy đủ cho cả 8 loại extension
├── extension-api.md                   # Hợp đồng API chuẩn (nguyên văn 2.336 dòng)
├── plugin.json                        # Danh mục registry gốc (sinh tự động)
├── STATUS.md                          # Bảng trạng thái nguồn truyện (cập nhật tự động)
└── README.md
```

---

## 🛠️ Hướng dẫn sử dụng CLI

Tất cả lệnh chạy qua `scripts/cli.js` bằng Node.js thuần, không cần `npm install`:

### 1. Kiểm tra toàn bộ mã nguồn (Validator)
Kiểm tra cú pháp Rhino ES6 (bắt lỗi arrow function, async/await, template literal...), kiểm tra manifest, kiểm tra ràng buộc `load()` và file zip:
```bash
node scripts/cli.js validate
```

### 2. Đóng gói Extension (Build)
Tự động quét các hàm `load('xyz.js')` trong `src/*.js`. Nếu extension cần helper trong `lib/`, builder tự động copy vào `src/` trước khi đóng gói `plugin.zip`:
```bash
# Build toàn bộ extensions
node scripts/cli.js build

# Hoặc build một extension cụ thể
node scripts/cli.js build extensions/novel/truyenfull
```

### 3. Tái tạo danh mục gốc (Build Catalog)
Quét toàn bộ thư mục `extensions/` và sinh lại `plugin.json` ở root repository với URL GitHub raw chuẩn:
```bash
node scripts/cli.js build-catalog
```

### 4. Kiểm tra sức khỏe nguồn truyện (Health Check)
Quét các nguồn web thực tế và đối chiếu với `test.json` (golden fixtures) để phát hiện site đổi giao diện, sau đó cập nhật `STATUS.md`:
```bash
node scripts/cli.js health-check
```

### 5. Kết nối & thử nghiệm trực tiếp trên điện thoại (vBook Dev Server)
Bật Developer Mode trong cài đặt app vBook trên điện thoại để mở máy chủ nội bộ:
```bash
# Kiểm tra kết nối tới thiết bị
node scripts/cli.js connect --server http://192.168.1.100:8080

# Chạy thử một file script trên thiết bị
node scripts/cli.js test extensions/novel/truyenfull search.js "kiem hiep" 1

# Cài đặt extension thẳng vào app vBook
node scripts/cli.js install extensions/novel/truyenfull
```

---

## 📐 Quy tắc bắt buộc khi phát triển

1. **Chỉ dùng Rhino ES6:** Chỉ sử dụng `var` và `function`, nối chuỗi bằng toán tử `+`. Tuyệt đối không dùng `async`/`await`, `() => {}`, template literals, optional chaining (`?.`), spread (`...`), `flat`/`flatMap`.
2. **Xử lý lỗi chuẩn:** Luôn trả `Response.error("Thông báo tiếng Việt")` khi gặp lỗi dự kiến, không return `null`.
3. **Minh bạch mã nguồn:** Tuyệt đối không bật `encrypt: true` mặc định. Mã nguồn đẩy lên repository phải đọc được.
4. **Bảo mật tuyệt đối:** Không commit token, cookie, tài khoản, mật khẩu hoặc khóa bí mật thật vào repository.
5. **Artifacts:** `plugin.zip` là sản phẩm đóng gói sinh ra khi build, không commit lên git (được chặn bởi `.gitignore`).
6. **Phiên bản đồng bộ:** Mỗi khi sửa extension, phải tăng `version` trong `plugin.json` của extension đó và chạy `node scripts/cli.js build-catalog` để cập nhật danh mục gốc.

---

## 📄 Bản quyền & Ghi nhận (Attribution)

- Hệ thống tham chiếu đặc tả và hợp đồng API dựa trên `vbook-extensions` của tác giả **Darkrai9x**.
- Mã hóa `gbk.js` kế thừa từ đóng góp của cộng đồng vBook (**hajljnopera**, **TuanHai03**, **seyah24**).
- Khung sườn kiến trúc, bộ thư viện mở rộng `FetchPro`, `CleanHtml`, `ConfigHelpers`, hệ thống CI Health-Check, Golden Fixtures và CLI thuần Node.js được thiết kế và xây dựng độc lập bởi **qsang2025**.
