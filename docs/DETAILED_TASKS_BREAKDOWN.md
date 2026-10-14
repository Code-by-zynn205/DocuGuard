# Bảng Phân Rã Chi Tiết Từng Task (Task Breakdown)
# Dự án DocuGuard (Nhóm 2 người - 4 Containers)

---

# PHẦN 1: BẠN A (`docuguard-server` + `mongodb`)

---

## CỤM TASK 1: KẾT NỐI DATABASE & KIỂM TRA SỨC KHỎE
> **Mục tiêu:** Backend kết nối được với MongoDB và báo trạng thái thật.

### 🔹 Task A1.1: Cài đặt thư viện Mongoose
- **Chức năng làm gì:** Cài `@nestjs/mongoose` và `mongoose` vào `backend/package.json`.
- **File tác động:** `backend/package.json`
- **Lệnh thực hiện:** `cd backend && npm install @nestjs/mongoose mongoose`
- **Cách test:** `package.json` xuất hiện 2 package trên, chạy `npm run build` không lỗi.

### 🔹 Task A1.2: Kích hoạt `DatabaseModule`
- **Chức năng làm gì:** Kết nối NestJS với MongoDB theo URI cấu hình từ biến môi trường (`mongodb://mongodb:27017/docuguard`).
- **File tác động:**
  - Sửa `backend/src/database/database.module.ts`: Uncomment đoạn code dùng `MongooseModule.forRoot()`.
  - Sửa `backend/src/app.module.ts`: Import `DatabaseModule` vào mảng `imports`.
- **Cách test:** Chạy container backend, xem log không bị lỗi `ECONNREFUSED`.

### 🔹 Task A1.3: Cập nhật Health Check API kiểm tra MongoDB
- **Chức năng làm gì:** Kiểm tra kết nối MongoDB qua `mongoose.connection.readyState`. Nếu bằng `1` (Connected) thì báo `"ok"`, ngược lại báo `"disconnected"`.
- **File tác động:** `backend/src/modules/health/health.service.ts`
- **Input:** Request `GET /api/health`
- **Output:**
  ```json
  {
    "success": true,
    "data": {
      "status": "ok",
      "checks": { "server": "ok", "database": "ok", "n8n": "not_checked" }
    }
  }
  ```
- **Cách test:** `curl http://localhost:3001/api/health` trả về `"database": "ok"`.

---

## CỤM TASK 2: QUẢN LÝ TÀI LIỆU (DOCUMENT VAULT CORE)
> **Mục tiêu:** Upload tài liệu, lưu file vào ổ đĩa, lưu thông tin vào MongoDB.

### 🔹 Task A2.1: Thiết kế `DocumentSchema`
- **Chức năng làm gì:** Tạo bảng `documents` trong MongoDB với các trường:
  - `title`: Tên tài liệu (String, bắt buộc)
  - `description`: Mô tả (String)
  - `fileName`: Tên file gốc (String)
  - `storedPath`: Đường dẫn file trên ổ đĩa (String)
  - `mimeType`: Định dạng file (String, vd: `application/pdf`)
  - `fileSize`: Kích thước file (Number, tính bằng bytes)
  - `fileHash`: Mã băm SHA-256 của file (String)
  - `healthScore`: Điểm sức khỏe 0-100 (Number, mặc định 100)
  - `healthStatus`: Trạng thái (`healthy`, `warning`, `critical`)
  - `expiresAt`: Ngày hết hạn (Date)
- **File cần tạo:** `backend/src/modules/documents/schemas/document.schema.ts`
- **Cách test:** Module biên dịch không lỗi TypeScript.

### 🔹 Task A2.2: Cấu hình Upload File (Multer) & Lưu Trữ
- **Chức năng làm gì:** Nhận file upload từ client và lưu vào thư mục `storage/documents/`. Tự động tạo thư mục nếu chưa có.
- **File cần tạo/sửa:**
  - `backend/src/modules/documents/documents.controller.ts`: Dùng `@UseInterceptors(FileInterceptor('file'))`.
  - Dùng đường dẫn từ `appConfig.documentStoragePath`.
- **Cách test:** Dùng Postman hoặc curl gửi file test lên, kiểm tra thư mục `storage/documents` có file được lưu.

### 🔹 Task A2.3: API Tạo & Lưu Tài Liệu (`POST /api/documents`)
- **Chức năng làm gì:** Nhận file + thông tin (title, description, expiresAt) -> Lưu file vào đĩa -> Lưu bản ghi vào MongoDB.
- **File tác động:**
  - `backend/src/modules/documents/dto/create-document.dto.ts`
  - `backend/src/modules/documents/documents.service.ts`
  - `backend/src/modules/documents/documents.controller.ts`
- **Input:** `multipart/form-data` chứa `file`, `title`, `description`, `expiresAt`.
- **Output:** Object Document vừa được tạo kèm `_id`.

### 🔹 Task A2.4: API Lấy Danh Sách & Chi Tiết Tài Liệu
- **Chức năng làm gì:**
  - `GET /api/documents`: Lấy danh sách tài liệu mới nhất (sắp xếp giảm dần theo thời gian tạo).
  - `GET /api/documents/:id`: Lấy chi tiết 1 tài liệu.
- **File tác động:** `backend/src/modules/documents/documents.service.ts` & `documents.controller.ts`.
- **Cách test:** Gọi `GET http://localhost:3001/api/documents` thấy dữ liệu vừa upload.

---

## CỤM TASK 3: TÍNH TOÀN VẸN TỆP & CHẤM ĐIỂM SỨC KHỎE
> **Mục tiêu:** "Bác sĩ tài liệu" tự động tính hash và cho điểm sức khỏe tài liệu.

### 🔹 Task A3.1: Thuật toán tính Hash SHA-256 (File Integrity Watch)
- **Chức năng làm gì:** Dùng thư viện built-in `crypto` của Node.js để tính mã băm SHA-256 từ nội dung file ngay khi upload, lưu mã này vào trường `fileHash`.
- **File tác động:** `backend/src/modules/documents/documents.service.ts`
- **Cách test:** Upload 1 file -> Xem trong MongoDB trường `fileHash` có chuỗi 64 ký tự hexa.

### 🔹 Task A3.2: Thuật toán chấm điểm Health Score
- **Chức năng làm gì:** Tính điểm từ 0 đến 100 theo bộ quy tắc:
  - Bắt đầu: 100 điểm.
  - Thiếu mô tả tài liệu: trừ 10 điểm.
  - Hết hạn (`expiresAt < now`): trừ 35 điểm.
  - Sắp hết hạn (trong vòng 30 ngày): trừ 15 điểm.
  - Dung lượng file = 0 bytes (file rỗng): trừ 50 điểm.
  - Điểm >= 80: `healthy` | 50 - 79: `warning` | < 50: `critical`.
- **File tác động:** `backend/src/modules/documents/documents.service.ts`
- **Cách test:** Upload tài liệu không có mô tả -> Health Score còn 90 (`healthy`). Đặt ngày hết hạn ở quá khứ -> Health Score còn 55 (`warning`).

### 🔹 Task A3.3: API Kiểm Tra Tính Toàn Vẹn (`POST /api/documents/:id/verify-integrity`)
- **Chức năng làm gì:** Đọc lại file thực tế trên ổ đĩa -> Tính lại SHA-256 -> So sánh với `fileHash` lưu trong database.
  - Khớp: Báo file nguyên vẹn (`intact: true`).
  - Lệch: Báo file đã bị sửa đổi trái phép (`intact: false`), tự động trừ 50 điểm sức khỏe và trả về cảnh báo.
- **File tác động:** `backend/src/modules/documents/documents.controller.ts` & `documents.service.ts`.
- **Cách test:** Cố tình mở file trên đĩa bằng text editor sửa 1 chữ -> Gọi API kiểm tra -> Báo `intact: false`!

---

## CỤM TASK 4: QUẢN LÝ SỰ CỐ & SAO LƯU AN TOÀN (SAFE RECOVERY)
> **Mục tiêu:** Ghi nhận sự cố khi phát hiện bất thường và hỗ trợ khôi phục.

### 🔹 Task A4.1: Tạo Module & Schema `Incident`
- **Chức năng làm gì:** Tạo bảng `incidents` lưu các sự cố:
  - `documentId`: ID tài liệu liên quan
  - `title`: Tiêu đề sự cố (Vd: "Phát hiện file bị thay đổi trái phép")
  - `severity`: Mức độ (`critical`, `high`, `medium`, `low`)
  - `status`: Trạng thái (`open`, `in_progress`, `resolved`)
  - `description`: Chi tiết lỗi phát hiện
- **File cần tạo:**
  - `backend/src/modules/incidents/schemas/incident.schema.ts`
  - `backend/src/modules/incidents/incidents.service.ts`
  - `backend/src/modules/incidents/incidents.controller.ts`
  - `backend/src/modules/incidents/incidents.module.ts`

### 🔹 Task A4.2: Tự Động Sinh Sự Cố
- **Chức năng làm gì:** Khi Task A3.3 phát hiện file bị sửa đổi (lệch hash) hoặc Health Score < 50, tự động gọi `incidentsService.create()` để ghi lại sự cố mức `critical`.
- **Cách test:** Khi verify file bị hỏng, kiểm tra `GET /api/incidents` thấy sự cố mới tự động xuất hiện.

### 🔹 Task A4.3: Cơ Chế Khôi Phục An Toàn (`POST /api/documents/:id/recover`)
- **Chức năng làm gì:**
  - Khi upload file: tự động tạo 1 bản sao lưu trong thư mục `storage/backups/`.
  - Khi gọi API khôi phục: Lấy file từ `storage/backups/` đè lại file bị hỏng -> Tính lại hash -> Đưa Health Score trở lại bình thường -> Cập nhật trạng thái sự cố thành `resolved`.
- **File tác động:** `backend/src/modules/documents/documents.service.ts`.
- **Cách test:** File bị sửa -> Bấm recover -> File phục hồi nội dung gốc -> Hash khớp lại!

---
---

# PHẦN 2: BẠN B (`docuguard-client` + `n8n`)

---

## CỤM TASK 5: GIAO DIỆN CHUNG & ĐIỀU HƯỚNG (LAYOUT & NAVIGATION)
> **Mục tiêu:** Dựng khung giao diện web chuyên nghiệp với menu điều hướng hoàn chỉnh.

### 🔹 Task B1.1: Component `Sidebar`
- **Chức năng làm gì:** Thanh điều hướng cố định bên trái màn hình với logo DocuGuard và các liên kết:
  - 📊 Dashboard (`/dashboard`)
  - 📁 Kho tài liệu (`/documents`)
  - ⚠️ Trung tâm sự cố (`/incidents`)
  - ⚡ Tự động hóa (`/automation`)
  - ⚙️ Cài đặt (`/settings`)
- **File cần tạo:** `frontend/components/layout/Sidebar.tsx`
- **Cách test:** Click menu nào chuyển đúng URL đó và hiển thị trạng thái active (đổi màu nổi bật).

### 🔹 Task B1.2: Component `Header` & Khung Dashboard Layout
- **Chức năng làm gì:**
  - Header trên cùng hiển thị tiêu đề trang hiện tại, trạng thái kết nối backend, avatar người dùng.
  - Bọc layout chung để tất cả các trang đều có sẵn Sidebar và Header.
- **File cần tạo/sửa:**
  - `frontend/components/layout/Header.tsx`
  - Sửa `frontend/app/layout.tsx` hoặc tạo `frontend/app/(dashboard)/layout.tsx`.
- **Cách test:** Mọi trang con đều có khung Sidebar bên trái, Header bên trên.

---

## CỤM TASK 6: KHO TÀI LIỆU (DOCUMENT VAULT UI)
> **Mục tiêu:** Người dùng xem được danh sách tài liệu và upload tệp từ giao diện.

### 🔹 Task B2.1: Bảng Danh Sách Tài Liệu (`/documents`)
- **Chức năng làm gì:** Gọi `GET /api/documents` qua `apiClient` hoặc `useApi` và hiển thị bảng:
  - Cột 1: Tên tài liệu & mô tả
  - Cột 2: Kích thước file & định dạng (PDF/Word/...)
  - Cột 3: Mã hash SHA-256 (rút gọn: `e3b0c44...8b6d`)
  - Cột 4: Điểm sức khỏe kèm Badge màu (Xanh: Healthy, Vàng: Warning, Đỏ: Critical)
  - Cột 5: Hành động (Nút "Kiểm tra toàn vẹn", Nút "Khôi phục")
- **File tác động:** `frontend/app/documents/page.tsx`
- **Cách test:** Khi backend có tài liệu, trang `/documents` hiển thị danh sách dạng bảng đẹp mắt.

### 🔹 Task B2.2: Form / Modal Upload Tài Liệu Mới
- **Chức năng làm gì:** Modal bật lên khi ấn nút "+ Tải lên tài liệu":
  - Cho phép kéo thả hoặc chọn file từ máy tính.
  - Ô nhập Tên tài liệu, Mô tả, Chọn Ngày hết hạn.
  - Nút "Tải lên" gửi `FormData` lên `POST /api/documents`.
  - Hiển thị spinner loading khi đang upload. Upload xong tự tải lại bảng danh sách.
- **File cần tạo:** `frontend/components/documents/UploadModal.tsx`
- **Cách test:** Chọn 1 file PDF từ máy -> Bấm Tải lên -> Bảng danh sách lập tức xuất hiện tài liệu mới.

### 🔹 Task B2.3: Nút Kiểm Tra Toàn Vẹn & Nút Khôi Phục Trên Giao Diện
- **Chức năng làm gì:**
  - Nút "Kiểm tra toàn vẹn": Gọi `POST /api/documents/:id/verify-integrity`. Nếu file bị sửa -> Hiện thông báo cảnh báo màu đỏ ngay trên màn hình.
  - Nút "Khôi phục an toàn": Gọi `POST /api/documents/:id/recover`. Khôi phục thành công -> Hiện thông báo xanh và badge sức khỏe xanh trở lại.
- **File tác động:** `frontend/app/documents/page.tsx`

---

## CỤM TASK 7: TỰ ĐỘNG HÓA VỚI N8N (WORKFLOW AUTOMATION)
> **Mục tiêu:** n8n đóng vai trò bác sĩ tự động điều phối quét và gửi cảnh báo.

### 🔹 Task B3.1: Dựng Workflow Quét Sức Khỏe Định Kỳ (`Document Health Scan`)
- **Chức năng làm gì trong n8n:**
  1. **Node Webhook** (hoặc **Schedule Cron**): Nhận trigger từ backend hoặc kích hoạt mỗi ngày.
  2. **Node HTTP Request**: Gọi `GET http://docuguard-server:3001/api/documents` để lấy toàn bộ danh sách tài liệu.
  3. **Node Code (JavaScript)**: Lọc ra các tài liệu có Health Score < 80 hoặc sắp hết hạn.
  4. **Node IF**: Nếu có tài liệu nguy hiểm -> Chuyển sang Task B3.2.
- **Giao diện làm việc:** Truy cập `http://localhost:5678` để kéo thả node.
- **Cách test:** Bấm "Test workflow" trong n8n -> n8n kéo được danh sách tài liệu từ backend thành công.

### 🔹 Task B3.2: Dựng Workflow Điều Phối Xử Lý Sự Cố (`Incident Auto-Resolution`)
- **Chức năng làm gì trong n8n:**
  1. Khi phát hiện tài liệu có vấn đề: Gửi request `POST http://docuguard-server:3001/api/incidents` để tự động tạo sự cố.
  2. **Node Email** (hoặc Discord/Telegram/Slack webhook test): Gửi cảnh báo: *"DocuGuard phát hiện tài liệu [Tên] bị lỗi tính toàn vẹn! Vui lòng kiểm tra."*
- **Cách test:** Kích hoạt workflow -> Thấy sự cố mới được tạo trong backend mà không cần người dùng thao tác bằng tay.

---

## CỤM TASK 8: TRUNG TÂM SỰ CỐ & DASHBOARD (INCIDENT & DASHBOARD UI)
> **Mục tiêu:** Màn hình tổng quan rủi ro và quản lý danh sách sự cố.

### 🔹 Task B4.1: Trang Trung Tâm Sự Cố (`/incidents`)
- **Chức năng làm gì:**
  - Gọi `GET /api/incidents` hiển thị danh sách sự cố.
  - Bộ lọc theo mức độ: `Tất cả` | `Khẩn cấp (Critical)` | `Cảnh báo (Warning)` | `Đã xử lý (Resolved)`.
  - Nút "Đánh dấu đã xử lý" để cập nhật trạng thái sự cố.
- **File cần tạo:** `frontend/app/incidents/page.tsx`
- **Cách test:** Các sự cố do n8n hoặc backend tạo tự động hiển thị đầy đủ tại đây.

### 🔹 Task B4.2: Trang Dashboard Tổng Quan (`/dashboard`)
- **Chức năng làm gì:**
  - 4 Thẻ thống kê (Cards):
    1. Tổng số tài liệu trong kho.
    2. Điểm sức khỏe trung bình của toàn kho (Vd: 87/100).
    3. Số sự cố đang mở cần xử lý.
    4. Số tài liệu sắp hết hạn.
  - Widget "Risk Radar": Liệt kê top 3 tài liệu có nguy cơ cao nhất cần chú ý.
- **File tác động:** `frontend/app/dashboard/page.tsx`
- **Cách test:** Mở `http://localhost:3000/dashboard` hiển thị các con số thống kê thực tế lấy từ backend.
