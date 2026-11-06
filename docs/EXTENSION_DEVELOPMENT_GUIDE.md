# Hướng dẫn Phát triển Extension — Qsang_vbook_pro

Tài liệu chuẩn mực hướng dẫn xây dựng, kiểm thử và tối ưu hóa extension cho app vBook trên khung sườn **Qsang_vbook_pro**.

---

## 1. Vòng đời chuẩn của một Extension

Mỗi extension là một gói `plugin.zip` gồm file khai báo `plugin.json`, biểu tượng `icon.png`, và các script trong thư mục `src/*.js`.

Thứ tự chạy trong ứng dụng vBook:
```
home / genre  →  search  →  detail  →  (page)  →  toc  →  chap
```

| Script | Vai trò & Kết quả trả về |
|---|---|
| `home.js` | Danh sách tab / danh mục trang chủ. Trả về `Response.success([{title, input, script}, ...])`. |
| `genre.js` | Danh sách thể loại truyện. Trả về `Response.success([{title, input, script}, ...])`. |
| `gen.js` (hoặc `book.js`) | Bộ kết xuất danh sách truyện chung cho tab khám phá/thể loại. Trả về `Response.success(items, next)`. |
| `search.js` | Tìm kiếm theo từ khóa. Trả về `Response.success(items, next)`. |
| `detail.js` | Chi tiết truyện: tên, tác giả, ảnh bìa, thể loại, mô tả, trạng thái, gợi ý. |
| `toc.js` | Mục lục danh sách chương (`name`, `url`, `host`, `lock`). |
| `chap.js` | Nội dung chữ của chương. Trả về `Response.success(content, chapterTitle)`. |

---

## 2. Các quy tắc bắt buộc (Non-negotiable Rules)

### Quy tắc 1: Giới hạn của hàm `load()` trong Rhino ES6
> [!IMPORTANT]
> - Hàm `load('file.js')` là cơ chế chèn văn bản (text substitution) cấp engine. Nó **chỉ load file ở top level của thư mục `src/` trong cùng extension**.
> - **KHÔNG ĐƯỢC ĐỆ QUY**: Một file đã được `load()` vào thì **tuyệt đối không được gọi `load()` thêm bất kỳ file nào khác**.
> - Vì vậy: `config.js` **không bao giờ được gọi `load()`**. Các file script chính (`chap.js`, `detail.js`, `gen.js`) tự gọi `load('config.js')` và `load('cleanHtml.js')` ở đầu file của chính mình.
> - Các file tab tĩnh như `home.js` và `genre.js` nếu không cần config thì **không cần load bất kỳ file nào**.

### Quy tắc 2: Tương thích Rhino ES6
- Chỉ dùng cú pháp: `var`, `function`, nối chuỗi bằng toán tử `+`.
- **KHÔNG DÙNG**: `const`, `let`, `async/await`, Arrow function (`() => {}`), Template literal (`` `...` ``), Optional chaining (`?.`), Nullish coalescing (`??`), Destructuring, Object spread (`...`).
- Xử lý lỗi luôn trả về `Response.error("Thông báo tiếng Việt")`, không bao giờ `return null`.

### Quy tắc 3: Chuẩn hóa Locale & Type
- `locale`: `vi_VN`, `zh_CN`, `ja_JP`, `en_US`, `zh_TW`, `ko_KR`, hoặc `global`.
- `type`: `novel`, `chinese_novel`, `comic`, `video`, `audio`, `translate`, `tts`, `ai`.

---

## 3. Mẫu xử lý các website hiện đại (Next.js App Router)

### A. Bóc tách Mục lục qua Server Action (`toc.js`)
Nhiều trang web Next.js không render danh sách chương trong HTML tĩnh mà dùng Server Action:
```javascript
load("config.js");

function execute(url) {
    url = normalizeUrl(url);
    var html = fetch(url).text();
    var bookId = "";
    var m = html.match(/\\?"bookId\\?":\s*\\?"([a-f0-9]{24})\\?"/);
    if (m) bookId = m[1];

    if (bookId) {
        var res = fetch(url, {
            method: "POST",
            headers: {
                "Next-Action": CHAPTERS_ACTION_ID,
                "Content-Type": "application/json",
                "Accept": "text/x-component"
            },
            body: JSON.stringify([bookId])
        });
        if (res && res.ok) {
            var text = res.text();
            var lines = text.split("\n");
            for (var i = 0; i < lines.length; i++) {
                if (lines[i].indexOf("1:[") === 0) {
                    var chapters = JSON.parse(lines[i].substring(2));
                    // Xử lý danh sách chương...
                }
            }
        }
    }
}
```

### B. Bóc tách Nội dung Chương qua Streaming RSC (`chap.js`)
Trích xuất text chương từ các khối `self.__next_f.push` dạng `:T<hex>,`:
```javascript
load("config.js");
load("cleanHtml.js");

function execute(url) {
    url = normalizeUrl(url);
    var res = fetch(url);
    var html = res.text();

    var pushes = [];
    var re = /self\.__next_f\.push\(\[1,\s*"([\s\S]*?)"\]\)/g;
    var match;
    while ((match = re.exec(html)) !== null) pushes.push(match[1]);
    var fullRsc = pushes.join("");

    var tMatch = fullRsc.match(/:T[0-9a-f]+,([\s\S]*?)(?:\\n[0-9a-f]+:|"\]\)|$)/);
    if (tMatch) {
        var rawText = tMatch[1].replace(/\\n/g, "<br><br>").replace(/\\"/g, "\"");
        return Response.success(CleanHtml.clean(rawText));
    }
    // Fallback sang DOM...
}
```

---

## 4. Quy trình đóng gói và kiểm thử

1. **Kiểm tra cú pháp & tính hợp lệ:**
   ```bash
   node scripts/cli.js validate
   ```
2. **Build extension và đóng gói zip:**
   ```bash
   node scripts/cli.js build extensions/<loại>/<tên>
   ```
3. **Cập nhật Catalog trung tâm:**
   ```bash
   node scripts/cli.js build-catalog
   ```
4. **Kiểm thử trên điện thoại:**
   ```bash
   node scripts/cli.js test extensions/<loại>/<tên> search.js "kiếm hiệp"
   ```
5. **Cài đặt trực tiếp lên app:**
   ```bash
   node scripts/cli.js install extensions/<loại>/<tên>
   ```
