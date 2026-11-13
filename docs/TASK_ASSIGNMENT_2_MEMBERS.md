# Bản Phân Công Nhiệm Vụ Chính Thức Dự Án DocuGuard
# Thành viên: Vy (Backend + DB) & Thuận (Frontend + Automation)
# Hạn chót: 16/10

---

## 👥 Phân chia Container theo yêu cầu của Thầy
- **Vy**: `docuguard-server` (NestJS 12) + `mongodb` (MongoDB 8.2)
- **Thuận**: `docuguard-client` (Next.js 16) + `n8n` (Workflow Automation)

---

## 🧑‍💻 Checklist của VY (`docuguard-server` + `mongodb`)

### Tối 14/10:
- [ ] **Task 1.1**: Cài Mongoose: `cd backend && npm install @nestjs/mongoose mongoose`
- [ ] **Task 1.2**: Kích hoạt `DatabaseModule` và kiểm tra `GET /api/health` trả về `database: "ok"`
- [ ] **Task 1.3**: Tạo Schema `Document` trong MongoDB
- [ ] **Task 1.4**: Cấu hình Multer upload tệp vào `storage/documents/`

### Sáng 15/10:
- [ ] **Task 1.5**: Viết hàm tính mã hash SHA-256 (Node.js crypto)
- [ ] **Task 1.6**: Viết thuật toán tính điểm Health Score (0-100)
- [ ] **Task 1.7**: Hoàn thiện API `POST /api/documents` và `GET /api/documents`

### Chiều 15/10:
- [ ] **Task 1.8**: API kiểm tra toàn vẹn `POST /api/documents/:id/verify-integrity`
- [ ] **Task 1.9**: Schema `Incident` và tự động sinh sự cố khi hash bị lệch

### Tối 15/10:
- [ ] **Task 1.10**: Cơ chế lưu bản backup vào `storage/backups/`
- [ ] **Task 1.11**: API khôi phục an toàn `POST /api/documents/:id/recover`

### Ngày 16/10:
- [ ] **Task 1.12**: API thống kê `GET /api/dashboard/summary`
- [ ] **Task 1.13**: Kiểm tra Docker Compose chạy mượt mà

---

## 🎨 Checklist của THUẬN (`docuguard-client` + `n8n`)

### Tối 14/10:
- [ ] **Task 2.1**: Dựng Component `Sidebar` menu điều hướng
- [ ] **Task 2.2**: Bọc Sidebar vào layout chung của ứng dụng
- [ ] **Task 2.3**: Mở `http://localhost:5678` tạo workflow n8n `DocuGuard-Scan`

### Sáng 15/10:
- [ ] **Task 2.4**: Bảng danh sách tài liệu tại `/documents` (gọi `GET /api/documents`)
- [ ] **Task 2.5**: Badge hiển thị màu theo điểm Health Score (Xanh/Vàng/Đỏ)
- [ ] **Task 2.6**: Modal upload file gửi `FormData` lên backend

### Chiều 15/10:
- [ ] **Task 2.7**: Dựng workflow n8n quét tự động và cảnh báo qua Telegram/Discord/Email
- [ ] **Task 2.8**: Dựng trang Trung tâm sự cố `/incidents`

### Tối 15/10:
- [ ] **Task 2.9**: Thêm nút "Kiểm tra toàn vẹn" & "Khôi phục an toàn" trên giao diện
- [ ] **Task 2.10**: Phối hợp cùng Vy chạy thử kịch bản Demo liên hoàn

### Ngày 16/10:
- [ ] **Task 2.11**: Hoàn thiện Dashboard trực quan (`/dashboard`)
- [ ] **Task 2.12**: Chuẩn bị Slide & Kịch bản thuyết trình với Thầy
