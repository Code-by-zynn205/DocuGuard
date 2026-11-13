# DocuGuard — Kho Tài Liệu Tự Giám Sát, Tự Phục Hồi & Smart Web Clipper AI

> Nền tảng quản trị và bảo vệ toàn vẹn tài liệu doanh nghiệp / cá nhân: tự động giám sát SHA-256, phát hiện sự cố, điều phối xử lý qua n8n, phê duyệt **Safe Recovery 1-Click qua Gmail**, đồng bộ **Google Drive**, và thu thập phân loại thông minh từ **Google / Facebook** bằng **Groq AI**.

---

## 1. Tính năng cốt lõi (v1.0.0)

- **Document Vault & Integrity Watch**: Quản lý tài liệu, băm SHA-256 theo từng phiên bản, sao lưu an toàn, cách ly tài liệu nghi ngờ giả mạo và xóa mềm.
- **Health Scanner & Risk Radar**: Quét định kỳ/thủ công toàn bộ kho tài liệu, chấm điểm sức khỏe (`healthScore`), phát hiện tài liệu sắp hết hạn hoặc sai lệch toàn vẹn.
- **Incident Center & Audit Logs**: Tự động tạo sự cố khi phát hiện sai lệch hash, ghi nhận toàn bộ nhật ký kiểm toán (`AuditLog`) trên toàn hệ thống.
- **Safe Recovery 1-Click qua Gmail**: Phê duyệt khôi phục bản sao lưu an toàn trực tiếp từ email xác nhận gửi qua Gmail API.
- **Google OAuth2 & Google Drive Sync**: Đăng nhập trực tiếp bằng Gmail và đồng bộ tài liệu từ Google Drive cá nhân vào DocuGuard.
- **Smart Web Clipper AI + Chrome Extension (`chrome-extension/`)**: Bôi đen đoạn dữ liệu khi lướt Google Search hoặc Facebook → Groq AI (`llama-3.3-70b-versatile`) tự phân loại và lưu vào kho cá nhân + Google Drive + thông báo Gmail.
- **Automation Center (n8n)**: 4 workflow tự động hóa trong `n8n/workflows/`:
  - `document-health-scan.json`
  - `incident-auto-resolution.json`
  - `safe-recovery.json`
  - `web-clipper-ai.json`

---

## 2. Cấu trúc dự án

```text
DocuGuard/
├── compose.yaml                      # Docker Compose chạy client (3000), server (3001), mongo-express (8081)
├── .github/workflows/                # CI/CD kiểm thử và validate build
├── backend/                          # NestJS 12 (TypeScript NodeNext ESM) + Mongoose
│   ├── Dockerfile
│   ├── .env.example                  # Mẫu biến môi trường (MongoDB, JWT, n8n, Google OAuth2, Groq AI)
│   └── src/
│       ├── main.ts                   # Global prefix /api, CORS, Filters & Interceptors
│       ├── app.module.ts             # Kết nối đầy đủ các module hệ thống
│       ├── config/app.config.ts      # Quản lý cấu hình tập trung từ biến môi trường
│       ├── database/                 # Schemas Mongoose & seed.ts (admin@docuguard.io / Admin@123456)
│       ├── integrations/n8n/         # N8nClient gọi webhook có xác thực X-DocuGuard-Secret
│       └── modules/
│           ├── audit/                # AuditModule — Nhật ký kiểm toán hệ thống
│           ├── auth/                 # AuthModule — JWT, RBAC & Google OAuth2 callback
│           ├── automation/           # AutomationModule — Quản lý & kích hoạt workflow n8n
│           ├── dashboard/            # DashboardModule — Thống kê tổng quan & Risk Radar
│           ├── documents/            # DocumentsModule — Kho tài liệu, hash SHA-256, soft-delete
│           ├── google/               # GoogleModule — Google Drive Sync & Gmail Workspace
│           ├── health/               # HealthModule — GET /api/health
│           ├── health-scanner/       # HealthScannerModule — Quét sức khỏe & toàn vẹn tài liệu
│           ├── incidents/            # IncidentsModule — Trung tâm xử lý sự cố
│           ├── recovery/             # RecoveryModule — Khôi phục an toàn & duyệt 1-click Gmail
│           ├── settings/             # SettingsModule — Chính sách hệ thống & webhook n8n
│           └── web-clipper/          # WebClipperModule — Phân loại Groq AI & lưu dữ liệu web
├── frontend/                         # Next.js 16 (App Router, Tailwind CSS v4, TypeScript)
│   ├── Dockerfile
│   ├── proxy.ts                      # Bảo vệ route & redirect chưa đăng nhập
│   └── app/                          # dashboard, documents, drive-clipper, health-scanner,
│                                     # incidents, recovery, audit-logs, automation, settings, login
├── chrome-extension/                 # Extension Chrome bôi đen dữ liệu trên Google / Facebook
└── n8n/                              # 4 workflow JSON & script kiểm thử test-workflows.mjs
```

---

## 3. Cấu hình môi trường (`backend/.env`)

Sao chép `backend/.env.example` thành `backend/.env` và điền các khóa tích hợp:

- **Cơ sở dữ liệu & n8n**:
  - Chạy trực tiếp ngoài host: `MONGODB_URI=mongodb://127.0.0.1:27017/docuguard`, `N8N_BASE_URL=http://localhost:5678`
  - Chạy trong Docker (`compose.yaml` cùng mạng `docuguard-network`): `MONGODB_URI=mongodb://mongodb:27017/docuguard`, `N8N_BASE_URL=http://n8n:5678`
- **Google OAuth2 (Google Drive API + Gmail API)**:
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback`
  - Authorized JavaScript origins: `http://localhost:3000`
- **Groq AI (Smart Web Clipper)**:
  - `GROQ_API_KEY`, `GROQ_MODEL=llama-3.3-70b-versatile`

---

## 4. Khởi động nhanh

### Chạy với Docker Compose

```bash
# 1. Đảm bảo network docuguard-network cùng container mongodb (27017) và n8n (5678) đang chạy
docker network ls | grep docuguard-network
docker ps | grep -E "mongodb|n8n"

# 2. Build và khởi động client & server
docker compose up -d --build

# 3. Nạp dữ liệu mẫu (nếu database trống)
docker exec -it docuguard-server node dist/database/seed.js
```

### Kiểm thử thủ công trên máy dev

```bash
# Kiểm tra backend (type-check, build, vitest)
cd backend && npx tsc --noEmit && npm run build && npm run test

# Kiểm tra frontend (type-check, build)
cd frontend && npx tsc --noEmit && npm run build

# Kiểm tra hợp lệ 4 workflow n8n
node n8n/test-workflows.mjs
```

---

## 5. Cài đặt Chrome Extension & n8n Workflows

1. **n8n Workflows**: Truy cập `http://localhost:5678`, lần lượt **Import from File** 4 tệp trong `n8n/workflows/` và bật **Active**.
2. **Chrome Extension**: Mở `chrome://extensions` → bật **Developer mode** → **Load unpacked** → chọn thư mục `chrome-extension/`.

---

## 6. Quy trình GitFlow của dự án

- `main`: Nhánh phát hành ổn định (chỉ nhận merge qua Pull Request từ `develop`).
- `develop`: Nhánh tích hợp các tính năng đã hoàn thiện.
- `feat/*`, `fix/*`, `docs/*`: Nhánh công việc tách từ `develop`, tuân thủ Conventional Commits trước khi mở PR vào `develop`.
