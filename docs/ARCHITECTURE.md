# Kiến trúc DocuGuard

## Tổng quan

DocuGuard là nền tảng quản lý tài liệu doanh nghiệp với khả năng **tự giám sát và tự phục hồi**. Hệ thống được ví như "bác sĩ quản lý sức khỏe tài liệu" — liên tục kiểm tra, phát hiện bất thường, điều phối xử lý và kiểm tra lại kết quả.

## Sơ đồ kiến trúc

```
┌─────────────────────────────────────────────────────────────┐
│                      Người dùng (Browser)                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP (port 3000)
┌──────────────────────────▼──────────────────────────────────┐
│              Frontend — Next.js (docuguard-client)           │
│  App Router / React / TypeScript / Tailwind CSS              │
│  Cổng: 3000                                                  │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP REST API (port 3001)
                           │ NEXT_PUBLIC_API_URL → localhost:3001
┌──────────────────────────▼──────────────────────────────────┐
│              Backend — NestJS (docuguard-server)              │
│  TypeScript / ESM / Express                                  │
│  Cổng: 3001                                                  │
│                                                              │
│  Trách nhiệm:                                                │
│  ✅ Xử lý nghiệp vụ (document, health, incident, recovery)  │
│  ✅ Kiểm tra quyền và bảo mật                                │
│  ✅ Lưu/đọc dữ liệu từ MongoDB                              │
│  ✅ Trigger workflow n8n qua webhook                         │
│  ✅ Cung cấp REST API cho frontend                           │
└───────────┬────────────────────────┬────────────────────────┘
            │ Mongoose ODM           │ HTTP Webhook
            │ port 27017             │ port 5678
┌───────────▼──────────┐  ┌─────────▼───────────────────────┐
│  MongoDB (mongodb)    │  │     n8n (n8n)                   │
│  mongo:8.2            │  │  docker.n8n.io/n8nio/n8n        │
│  Database: docuguard  │  │  SQLite nội bộ                  │
│                       │  │                                  │
│  Collections:         │  │  Workflow dự kiến:              │
│  - documents          │  │  - Document Health Scan         │
│  - document_versions  │  │  - Incident Auto-Resolution     │
│  - incidents          │  │  - Safe Recovery                │
│  - audit_logs         │  │  - Workflow Failure Monitor     │
│  - health_scans       │  │                                  │
└───────────────────────┘  └──────────────────────────────────┘

                    ──── Docker Network: docuguard-network ────
```

## Luồng xử lý chính

### 1. Người dùng upload tài liệu

```
Browser → POST /api/documents (Frontend)
       → POST /api/documents (Backend NestJS)
       → Lưu file vào storage/documents/
       → Tính SHA-256 hash
       → Lưu Document + DocumentVersion vào MongoDB
       → Trigger n8n webhook "document-health-scan"
       → n8n kiểm tra các quy tắc sức khỏe
       → n8n gọi lại Backend để cập nhật HealthScore
       → Backend lưu kết quả vào MongoDB
       → Frontend hiển thị điểm sức khỏe mới
```

### 2. Phát hiện bất thường (tự động)

```
n8n Cron Job (định kỳ)
       → Gọi Backend API: GET /api/documents/scan
       → Backend kiểm tra toàn bộ tài liệu
       → Phát hiện: hết hạn / trùng lặp / thiếu thông tin / ...
       → Backend tạo Incident mới trong MongoDB
       → Backend trigger n8n "incident-resolution"
       → n8n gửi thông báo + tạo task xử lý
       → Frontend hiển thị sự cố trong Incident Center
```

### 3. Khôi phục tài liệu (Safe Recovery)

```
Phát hiện file bị thay đổi (hash không khớp)
       → Backend tạo Incident loại "integrity_violation"
       → Trigger n8n "safe-recovery"
       → n8n kiểm tra backup có tồn tại không
       → Nếu cần: yêu cầu phê duyệt từ Admin
       → Sau khi được phê duyệt: khôi phục file
       → Ghi AuditLog chi tiết
       → Cập nhật trạng thái Incident = resolved
```

## Các thành phần Docker

| Container | Image | Cổng | Vai trò |
|---|---|---|---|
| `docuguard-client` | `docuguard-client` | 3000 | Frontend Next.js |
| `docuguard-server` | `docuguard-server` | 3001 | Backend NestJS |
| `mongodb` | `mongo:8.2` | 27017 | Database |
| `n8n` | `docker.n8n.io/n8nio/n8n` | 5678 | Workflow automation |

Tất cả trong cùng Docker Network: **docuguard-network**

## Nguyên tắc phân tách trách nhiệm

| Trách nhiệm | Backend | n8n | Frontend |
|---|---|---|---|
| Xử lý nghiệp vụ | ✅ | ❌ | ❌ |
| Lưu dữ liệu | ✅ | ❌ | ❌ |
| Kiểm tra quyền | ✅ | ❌ | ❌ |
| Điều phối workflow | ❌ | ✅ | ❌ |
| Gửi thông báo | ❌ | ✅ | ❌ |
| Hiển thị UI | ❌ | ❌ | ✅ |
| Gọi API backend | ❌ | ✅ | ✅ |
| Truy cập secret n8n | ✅ | ✅ | ❌ |

> **Lưu ý bảo mật:** Frontend KHÔNG được biết N8N_WEBHOOK_SECRET. Frontend chỉ giao tiếp với backend.
