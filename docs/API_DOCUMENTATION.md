# Tài liệu vBook Developer Server REST API

Khi bật tính năng Developer Mode (Chế độ nhà phát triển) trong ứng dụng vBook, app sẽ khởi động một máy chủ HTTP cục bộ ngay trên điện thoại. CLI `scripts/vbook.js` giao tiếp trực tiếp với máy chủ này để kiểm thử và cài đặt extension mà không cần cài file APK trung gian.

---

## 1. `GET /connect`

Kiểm tra kết nối tới thiết bị và lấy tên thiết bị.

- **Request**: Không body.
- **Response**:
  ```json
  {
    "code": 200,
    "data": "Pixel 7 Pro (Android 14)"
  }
  ```

---

## 2. `POST /extension/test`

Chạy thử nghiệm một script cụ thể của extension mà không cần cài đặt lên ứng dụng.

- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "plugin": "{\"metadata\":{...},\"script\":{...}}",
    "src": "{\"detail.js\":\"function execute(url){...}\",\"config.js\":\"...\"}",
    "input": "{\"script\":\"detail.js\",\"vararg\":[\"https://site.com/truyen/1\"]}",
    "icon": ""
  }
  ```
- **Response thành công**:
  ```json
  {
    "code": 200,
    "log": "Nhật ký Console.log trong script...",
    "data": { ... }
  }
  ```
- **Response lỗi**:
  ```json
  {
    "code": 500,
    "log": "Chi tiết lỗi...",
    "message": "Thông báo lỗi"
  }
  ```

---

## 3. `POST /extension/install`

Biên dịch và cài đặt trực tiếp extension vào danh sách extension của ứng dụng vBook trên điện thoại.

- **Headers**: `Content-Type: application/json`
- **Request Body**: Gồm `plugin`, `src`, và `icon` (chuỗi Base64 của file `icon.png`).
- **Response**:
  ```json
  {
    "code": 200,
    "message": "Success"
  }
  ```

---

## 4. `POST /extension/build`

Yêu cầu máy chủ vBook đóng gói và mã hóa (nếu có cấu hình mã hóa) thành file `.zip`.

- **Response**:
  ```json
  {
    "code": 200,
    "data": "<base64 encoded zip bytes>"
  }
  ```
