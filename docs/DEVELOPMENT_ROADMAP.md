# Lộ trình Phát triển DocuGuard

## Trạng thái hiện tại ✅

Nền tảng kỹ thuật đã được thiết lập:
- Docker Compose quản lý frontend + backend
- Network `docuguard-network` kết nối tất cả container
- Backend: HealthModule hoạt động tại `GET /api/health`
- Frontend: cấu trúc thư mục đúng, build được
- Tài liệu hướng dẫn bằng tiếng Việt tại `docs/`
- File `.env.example` cho cả frontend và backend

---

## Giai đoạn 1: Kết nối MongoDB và Health Check nâng cao

**Mục tiêu:** Backend kết nối thành công với MongoDB, health check hiển thị trạng thái database.

**Các bước bạn cần làm:**

1. Cài thư viện Mongoose:
   ```bash
   cd backend && npm install @nestjs/mongoose mongoose
   ```

2. Uncomment `DatabaseModule` trong `app.module.ts`

3. Tạo file `backend/.env` từ `.env.example`

4. Mở rộng `health.service.ts` để kiểm tra `mongoose.connection.readyState`

5. Rebuild và kiểm tra:
   ```bash
   docker compose up -d --build server
   curl http://localhost:3001/api/health
   ```

**Kết quả mong đợi:**
```json
{
  "data": {
    "checks": {
      "server": "ok",
      "database": "ok"   ← Giai đoạn 1 hoàn thành khi thấy điều này
    }
  }
}
```

---

## Giai đoạn 2: Quản lý tài liệu cơ bản

**Mục tiêu:** Upload tài liệu, lưu metadata, lấy danh sách.

**Các bước:**
1. Tạo `DocumentSchema` trong `src/modules/documents/schemas/`
2. Tạo `DocumentsService` với CRUD cơ bản
3. Tạo `DocumentsController` với endpoints:
   - `GET /api/documents` — danh sách
   - `POST /api/documents` — tạo mới (có file upload)
   - `GET /api/documents/:id` — chi tiết
4. Cài `multer` để xử lý file upload
5. Xây dựng trang `Documents` ở frontend

**Tài liệu tham khảo:** `docs/BACKEND_GUIDE.md`, `docs/MONGODB_GUIDE.md`

---

## Giai đoạn 3: File Integrity Watch

**Mục tiêu:** Tính và lưu SHA-256 hash khi upload; phát hiện thay đổi trái phép.

**Các bước:**
1. Tính hash bằng Node.js built-in `crypto`:
   ```typescript
   import { createHash } from 'crypto';
   const hash = createHash('sha256').update(fileBuffer).digest('hex');
   ```
2. Tạo `DocumentVersion` schema để lưu lịch sử phiên bản
3. Mỗi khi file được cập nhật: tạo bản ghi `DocumentVersion` mới
4. Thêm endpoint kiểm tra tính toàn vẹn: so sánh hash hiện tại vs hash lưu trữ

---

## Giai đoạn 4: Document Health Score

**Mục tiêu:** Đánh giá sức khỏe từng tài liệu theo bộ quy tắc.

**Các quy tắc dự kiến:**
- Thiếu mô tả: -10 điểm
- Hết hạn: -30 điểm
- Sắp hết hạn (30 ngày): -15 điểm
- Thiếu tag phân loại: -5 điểm
- File lớn hơn giới hạn: -10 điểm

**Cách tính:**
```typescript
// Điểm bắt đầu: 100
// Trừ điểm theo từng vấn đề phát hiện
// Score = max(0, 100 - tổng điểm trừ)
// Healthy: 80-100, Warning: 50-79, Critical: 0-49
```

---

## Giai đoạn 5: Workflow n8n đầu tiên

**Mục tiêu:** Tạo workflow "Document Health Scan" trong n8n, kết nối với backend.

**Các bước:**
1. Mở n8n tại `http://localhost:5678`
2. Tạo workflow theo hướng dẫn trong `docs/N8N_INTEGRATION_GUIDE.md`
3. Implement `N8nClient.triggerHealthScan()` trong backend
4. Test toàn bộ luồng: gọi API → backend trigger n8n → n8n gọi lại backend

---

## Giai đoạn 6: Incident Center

**Mục tiêu:** Quản lý sự cố — tạo, cập nhật, theo dõi.

**Các bước:**
1. Tạo `IncidentSchema`
2. Tạo `IncidentsModule` với CRUD
3. Backend tự động tạo Incident khi health scan phát hiện vấn đề
4. Workflow n8n "Incident Auto-Resolution" gửi thông báo
5. Frontend: trang Incident Center hiển thị danh sách và chi tiết

---

## Giai đoạn 7: Safe Recovery

**Mục tiêu:** Khôi phục tài liệu từ bản sao lưu an toàn, có xác nhận.

**Các bước:**
1. Thiết kế cơ chế backup (copy file sang thư mục backup khi upload)
2. Tạo endpoint `POST /api/recovery/request` — yêu cầu khôi phục
3. Workflow n8n kiểm tra điều kiện an toàn
4. Endpoint `POST /api/recovery/execute` — thực hiện sau khi được duyệt
5. Ghi đầy đủ AuditLog cho mọi thao tác recovery

---

## Giai đoạn 8: Audit Log và Workflow Monitoring

**Mục tiêu:** Ghi lại mọi hành động quan trọng; theo dõi trạng thái workflow n8n.

**Các bước:**
1. Tạo `AuditLogSchema` và middleware tự động ghi log
2. Endpoint `GET /api/audit-logs` với filter
3. Endpoint `GET /api/automation/workflows` — lấy trạng thái workflow từ n8n API
4. Frontend: trang Audit Log và Automation Center

---

## Giai đoạn 9: Dashboard và giao diện hoàn chỉnh

**Mục tiêu:** Dashboard với số liệu thực, navigation đầy đủ.

**Các bước:**
1. Endpoint `GET /api/dashboard/summary` — tổng hợp số liệu
2. Tạo `Sidebar` và `Header` component
3. Tạo `DashboardLayout` chứa sidebar cho các trang nội bộ
4. Kết nối dashboard với dữ liệu thực từ MongoDB
5. Polishing: loading states, empty states, error handling

---

## Giai đoạn 10: Bảo mật và triển khai production

**Mục tiêu:** Authentication, authorization, cấu hình production.

**Các bước:**
1. Thêm JWT authentication (`@nestjs/jwt`, `passport`)
2. Tạo `AuthModule` và `UsersModule`
3. Bảo vệ endpoints bằng `AuthGuard`
4. Phân quyền theo role (Admin, Reviewer, Viewer)
5. Rate limiting, helmet, validation pipe toàn cục
6. Cấu hình multi-stage Dockerfile tối ưu
7. Kiểm thử bảo mật

---

## Thứ tự ưu tiên khi bắt đầu

> **Bắt đầu ngay với Giai đoạn 1** — đây là nền tảng cho mọi thứ tiếp theo.

1. Cài `@nestjs/mongoose mongoose`
2. Chạy `docker compose up -d --build server`
3. Kiểm tra `curl http://localhost:3001/api/health`
4. Khi health check trả về `"database": "ok"` → Giai đoạn 1 hoàn thành
5. Tiếp tục Giai đoạn 2

---

## Khi gặp vấn đề

Hỏi tôi (AI assistant) theo format:
```
Tôi đang ở Giai đoạn [X].
Tôi đang cố [mô tả việc đang làm].
Lỗi gặp phải: [paste lỗi].
File liên quan: [tên file].
```
