# Kế hoạch Sprint Cấp tốc DocuGuard (14/10 - 16/10)
# Dành cho Nhóm 2 Thành viên (4 Containers)

---

## 👥 Phân chia Container & Trách nhiệm

| Thành viên | Container chịu trách nhiệm | Công nghệ | Phạm vi công việc |
|---|---|---|---|
| **Bạn A** | `docuguard-server`<br>`mongodb` | NestJS 12 ESM<br>MongoDB 8.2 (Mongoose) | - Thiết kế Schemas & Models<br>- API upload, lưu file vào volume<br>- SHA-256 Hash Integrity Watch<br>- Logic chấm điểm Health Score<br>- API CRUD Documents & Incidents |
| **Bạn B** | `docuguard-client`<br>`n8n` | Next.js 16 (React 19)<br>n8n Automation Engine | - Dựng giao diện UI, Sidebar, Dashboard<br>- Gọi API backend hiển thị dữ liệu thực<br>- Dựng Workflow n8n tự động quét tài liệu<br>- Cấu hình Webhook & Cảnh báo sự cố<br>- Kịch bản Demo thực nghiệm |

---

## ⏱️ Chi tiết Checklist theo khung giờ

### 🌙 TỐI NGÀY 14/10: Khởi động nền tảng Data & UI Base

- **Bạn A (`docuguard-server` + `mongodb`)**:
  - [ ] **Task A1**: Cài Mongoose, kích hoạt `DatabaseModule`.
  - [ ] **Task A2**: Kiểm tra `GET /api/health` trả về `checks.database: "ok"`.
  - [ ] **Task A3**: Tạo `DocumentSchema` và API upload file cơ bản (`POST /api/documents`).

- **Bạn B (`docuguard-client` + `n8n`)**:
  - [ ] **Task B1**: Dựng Sidebar Menu chuẩn (Dashboard, Kho tài liệu, Sự cố, Tự động hóa).
  - [ ] **Task B2**: Dựng khung giao diện trang Kho tài liệu (`/documents`) gồm nút upload và bảng danh sách.
  - [ ] **Task B3**: Đăng nhập n8n tại `http://localhost:5678` tạo sẵn 1 workflow trống tên `DocuGuard-Health-Scan`.

---

### ☀️ SÁNG NGÀY 15/10: File Integrity & Health Score & UI Binding

- **Bạn A**:
  - [ ] **Task A4**: Viết hàm tính SHA-256 hash khi lưu file, lưu vào database.
  - [ ] **Task A5**: Viết logic chấm điểm Health Score (0 - 100) dựa trên hạn sử dụng, mô tả, định dạng tệp.
  - [ ] **Task A6**: Endpoint `GET /api/documents` trả về danh sách kèm hash và điểm sức khỏe.

- **Bạn B**:
  - [ ] **Task B4**: Ghép API upload tệp thực tế từ Next.js lên NestJS.
  - [ ] **Task B5**: Hiển thị bảng danh sách tài liệu thật, có badge màu theo Health Score (Xanh: Healthy, Vàng: Warning, Đỏ: Critical).
  - [ ] **Task B6**: Tạo Webhook Node trong n8n nhận `documentId` để chuẩn bị quét.

---

### 🌤️ CHIỀU NGÀY 15/10: n8n Auto-Remediation & Incident Center

- **Bạn A**:
  - [ ] **Task A7**: Tạo `IncidentSchema` và module `incidents` (CRUD sự cố).
  - [ ] **Task A8**: Viết hàm tự động tạo sự cố khi phát hiện hash file bị sai lệch hoặc tài liệu hết hạn.

- **Bạn B**:
  - [ ] **Task B7**: Dựng workflow n8n: nhận Webhook từ backend → phân loại rủi ro (Risk Radar) → gửi thông báo hoặc trigger API.
  - [ ] **Task B8**: Dựng trang Incident Center (`/incidents`) trên Next.js hiển thị danh sách sự cố và mức độ nghiêm trọng.

---

### 🌙 TỐI NGÀY 15/10: Safe Recovery & Test luồng liên hoàn (End-to-End)

- **Cả 2 bạn cùng làm**:
  - [ ] **Task A9**: Bạn A làm API Safe Recovery (sao lưu file gốc, khôi phục lại khi phát hiện file hỏng).
  - [ ] **Task B9**: Bạn B thêm nút "Khôi phục an toàn" trên giao diện khi tài liệu có cảnh báo.
  - [ ] **Task AB1**: Chạy thử kịch bản:
    1. Upload 1 file PDF/Word từ giao diện.
    2. Cố tình sửa nội dung file trên đĩa server.
    3. n8n quét phát hiện hash sai lệch → Bắn sự cố lên Incident Center.
    4. Bấm "Khôi phục" → File trở về nguyên vẹn → Điểm sức khỏe phục hồi.

---

### ☀️ SÁNG & CHIỀU NGÀY 16/10: Dashboard tổng quan & Hoàn thiện báo cáo

- **Bạn A**:
  - [ ] **Task A10**: API `GET /api/dashboard/summary` (tổng tài liệu, điểm sức khỏe trung bình, sự cố đang mở).
  - [ ] **Task A11**: Tối ưu Docker build & kiểm tra lại volume dữ liệu.

- **Bạn B**:
  - [ ] **Task B10**: Hoàn thiện Dashboard trực quan (Cards thống kê, Health Score Radar).
  - [ ] **Task B11**: Soạn tài liệu demo (chụp ảnh luồng chạy, chuẩn bị kịch bản thuyết trình với thầy).
