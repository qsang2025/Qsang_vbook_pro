# Qsang_vbook_pro — Professional vBook Extension Framework

Khung sườn phát triển extension vBook chuyên nghiệp, độc lập và toàn diện, được đúc kết từ việc phân tích sâu 33 kho extension vBook thực tế và khắc phục triệt để các điểm yếu cố hữu của hệ sinh thái hiện tại.

- **Hợp đồng API chuẩn duy nhất**: [`extension-api.md`](extension-api.md) (nguyên văn 2.336 dòng từ chuẩn tham chiếu Darkrai9x).
- **Quy tắc làm việc cho Agent & Developer**: [`AGENTS.md`](AGENTS.md)
- **Tài liệu hướng dẫn phát triển đầy đủ**: [`docs/EXTENSION_DEVELOPMENT_GUIDE.md`](docs/EXTENSION_DEVELOPMENT_GUIDE.md)
- **Danh mục kho extension thượng nguồn**: [`repository.json`](repository.json)

---

## 🌟 Bảng So Sánh Toàn Diện

| Tính năng / Tiêu chí | 33 Repo Cộng Đồng | Qsang_vbook | Qsang_vbook_pro |
| :--- | :---: | :---: | :---: |
| **CI Health-Check tự động** | ❌ Không có | ⚠️ Chạy tay / Cần điện thoại | ✅ **Chạy tự động mỗi ngày (GitHub Actions)** |
| **Tự mở GitHub Issue khi nguồn gãy** | ❌ Không có | ❌ Không có | ✅ **Tự động mở Issue gắn nhãn `bug`** |
| **Báo cáo trạng thái tự động** | ❌ Thủ công / Không có | ⚠️ Báo cáo tĩnh | ✅ **Tự động cập nhật [`STATUS.md`](STATUS.md)** |
| **Golden Fixtures (`test.json`)** | ❌ Không có | ⚠️ Chỉ kiểm tra định dạng | ✅ **Kiểm tra trực tiếp markup & text kỳ vọng** |
| **Kiến trúc Next.js App Router** | ❌ Không hỗ trợ | ⚠️ DOM thô | ✅ **Streaming RSC (`:T<hex>,`) + Server Actions** |
| **Server Action POST (`Next-Action`)** | ❌ Không có | ⚠️ Viết riêng từng ext | ✅ **Sẵn trong thư viện dùng chung `FetchHelpers`** |
| **Mirror Failover & Rate-limit 429** | ❌ Crash khi gặp 429 | ⚠️ Cơ bản | ✅ **Xoay UA, đọc `Retry-After`, Jitter Backoff** |
| **Bộ công cụ Dòng lệnh (CLI)** | ⚠️ Phân mảnh, phụ thuộc Python | ⚠️ Chia 2 thư mục `tools` & `scripts` | ✅ **Unified CLI `scripts/cli.js` (0-dependency Node)** |
| **Kiểm thử trên thiết bị (test / testall)** | ⚠️ Chỉ có trong Darkrai9x | ✅ Có `vbook.js testall` | ✅ **`testall` với tự động phục hồi kết nối** |
| **Bộ Extension VS Code Tester** | ❌ Không có | ✅ Có file VSIX | ✅ **Tích hợp sẵn trong `tools/vscode/`** |
| **Mẫu khung sườn (Templates)** | ⚠️ 1 - 3 loại | ✅ Đủ 8 loại | ✅ **Đủ 8 loại + Golden Fixture Boilerplate** |
| **Quy tắc Rule 1 (Rhino ES6 load)** | ❌ Dễ gây crash app | ✅ Tuân thủ nghiêm ngặt | ✅ **Linter tự động kiểm tra tĩnh 100%** |

---

## 📁 Cấu trúc Thư mục Chuẩn

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
│   ├── ISSUE_TEMPLATE/                # Mẫu yêu cầu nguồn mới & báo lỗi
│   │   ├── request_source.yml
│   │   └── bug_report.yml
│   └── workflows/
│       ├── validate.yml               # CI kiểm tra cú pháp Rhino ES6 & schema trên PR/Push
│       └── health-check.yml           # CI chạy định kỳ, cập nhật STATUS.md, mở issue báo lỗi
├── docs/                              # Tài liệu kỹ thuật chuyên sâu
│   ├── EXTENSION_DEVELOPMENT_GUIDE.md # Hướng dẫn chi tiết vòng đời & phương pháp viết extension
│   ├── VERIFY_CHECKLIST.md            # Bảng kiểm tra trước khi phát hành
│   ├── API_DOCUMENTATION.md           # Đặc tả REST API của Developer Server trên điện thoại
│   └── CONTRIBUTING.md                # Quy định gửi đóng góp và Pull Request
├── extensions/                        # Cấu trúc chuẩn theo 8 loại extension
│   ├── novel/                         # Truyện chữ thông thường
│   ├── chinese_novel/                 # Truyện chữ tiếng Trung (GBK/zh_CN)
│   ├── comic/                         # Truyện tranh
│   ├── video/                         # Phim / Hoạt hình
│   ├── audio/                         # Sách nói / Nhạc
│   ├── translate/                     # Máy dịch
│   ├── tts/                           # Giọng đọc Text-to-Speech
│   └── ai/                            # Trợ lý AI
├── lib/                               # Thư viện dùng chung (Rhino ES6)
│   ├── cleanHtml.js                   # Lọc rác, xóa quảng cáo, chuẩn hóa văn bản
│   ├── config-helpers.js              # Chuẩn hóa URL, formatDetail, unwrapCover
│   ├── fetch-helpers.js               # Failover mirror, 429 Retry-After, Next-Action POST
│   └── gbk.js                         # Mã hóa URL GBK cho web tiếng Trung
├── scripts/                           # CLI công cụ chuẩn (Node.js thuần, 0 dependency)
│   ├── cli.js                         # Entrypoint hợp nhất cho toàn bộ hệ thống
│   ├── validate.js                    # Kiểm tra cú pháp Rhino, Rule 1, schema manifest
│   ├── build.js                       # Tự động inline lib vào src/ và đóng gói plugin.zip
│   ├── build-catalog.js               # Quét extensions/ và sinh root plugin.json tự động
│   ├── health-check.js                # Chạy probe kiểm tra nguồn & golden fixtures
│   └── vbook.js                       # Kết nối điện thoại, test, testall, build, install
├── templates/                         # Khung sườn mẫu đầy đủ cho cả 8 loại extension
├── tools/
│   └── vscode/                        # Plugin mở rộng cho VS Code (vbook-vscode-tester)
├── AGENTS.md                          # Hiến pháp và quy tắc hoạt động cho Agent & Dev
├── extension-api.md                   # Hợp đồng API chuẩn (nguyên văn 2.336 dòng)
├── plugin.json                        # Danh mục registry gốc (sinh tự động)
├── repository.json                    # Danh mục các repository vBook thượng nguồn
├── STATUS.md                          # Bảng trạng thái sức khỏe nguồn truyện (tự động)
└── README.md
```

---

## 🛠️ Bộ Công Cụ Dòng Lệnh (CLI)

Tất cả lệnh chạy qua `scripts/cli.js` bằng Node.js thuần, không cần cài bất kỳ thư viện npm bên ngoài nào:

```bash
# 1. Kiểm tra tính toàn vẹn và cú pháp Rhino ES6 toàn bộ repo
node scripts/cli.js validate

# 2. Đóng gói một extension (tự động copy lib cần thiết vào src/ và đóng zip)
node scripts/cli.js build extensions/novel/apptruyenchu

# 3. Tái tạo danh mục plugin.json gốc
node scripts/cli.js build-catalog

# 4. Kiểm tra sức khỏe nguồn thực tế & đối soát Golden Fixture (cập nhật STATUS.md)
node scripts/cli.js health-check

# 5. Kết nối & kiểm thử trên điện thoại thật (Developer Server)
node scripts/cli.js connect --server http://192.168.1.100:8080
node scripts/cli.js test extensions/novel/apptruyenchu search.js "kiem"
node scripts/cli.js testall --query "kiem"
node scripts/cli.js install extensions/novel/apptruyenchu
```

---

## 📐 Quy Tắc Vàng (The Golden Rules)

1. **Rule 1 (Cấm load() đệ quy)**: Hàm `load()` chỉ nạp file top-level trong `src/`. File được `load()` tuyệt đối không được gọi `load()` thêm file khác. `config.js` không được chứa lệnh `load()`.
2. **Rhino ES6 thuần**: Chỉ dùng `var` và `function`, nối chuỗi bằng `+`. Cấm `const`, `let`, `async/await`, arrow functions, template literals, optional chaining.
3. **Luôn có Golden Fixture (`test.json`)**: Định nghĩa case kiểm thử với chuỗi kỳ vọng để phát hiện website đổi giao diện sớm.
4. **Xử lý lỗi tiếng Việt**: Luôn trả về `Response.error("Thông báo chi tiết")`, không bao giờ `return null`.
5. **Nguồn sự thật duy nhất**: Thư mục `src/` là nơi duy nhất để sửa mã nguồn; không sửa tay trong `plugin.zip`.

---

## 📄 Bản quyền & Ghi nhận (Attribution)

- Hệ thống tham chiếu đặc tả và hợp đồng API dựa trên `vbook-extensions` của tác giả **Darkrai9x**.
- Ý tưởng và thuật toán bóc tách Next.js, mã hóa GBK, xử lý bypass Cloudflare kế thừa từ tinh hoa cộng đồng vBook (**SPRINGPEACHVINH**, **lequang0996**, **kychitoge**, **mizhm**, **hajljnopera**, **TuanHai03**, **duongden**, **sonzin**).
- Khung sườn kiến trúc thế hệ mới, bộ CLI 0-dependency, hệ thống CI Health-Check & Auto Issue Reporting được thiết kế độc lập và xây dựng hoàn chỉnh bởi **qsang2025**.
