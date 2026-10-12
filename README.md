# DocuGuard — Kho Tài Liệu Tự Giám Sát và Tự Phục Hồi

> Nền tảng quản lý tài liệu doanh nghiệp có khả năng tự giám sát tình trạng tài liệu, phát hiện bất thường, đánh giá rủi ro, tự động điều phối xử lý sự cố qua n8n và hỗ trợ khôi phục tài liệu an toàn.

---

## 📌 Báo Cáo Thiết Lập Nền Tảng Dự Án

### 1. Cấu trúc thư mục hiện tại

```text
DocuGuard/
├── compose.yaml                          # Cấu hình Docker Compose cho client & server
├── .gitignore                            # Git ignore gốc dự án
├── README.md                             # Tài liệu tổng quan & báo cáo thiết lập
├── docs/                                 # 9 tài liệu kiến trúc & hướng dẫn chi tiết
│   ├── ARCHITECTURE.md                   # Kiến trúc hệ thống và luồng giao tiếp
│   ├── PROJECT_STRUCTURE.md              # Cấu trúc chi tiết & giải thích NestJS
│   ├── ENVIRONMENT_SETUP.md              # Hướng dẫn cấu hình biến môi trường
│   ├── DOCKER_GUIDE.md                   # Vận hành Docker và quản lý container
│   ├── FRONTEND_GUIDE.md                 # Hướng dẫn phát triển frontend Next.js
│   ├── BACKEND_GUIDE.md                  # Hướng dẫn phát triển backend NestJS
│   ├── MONGODB_GUIDE.md                  # Kết nối MongoDB & thiết kế Schema Mongoose
│   ├── N8N_INTEGRATION_GUIDE.md          # Tích hợp workflow n8n và bảo mật webhook
│   └── DEVELOPMENT_ROADMAP.md            # Lộ trình 10 giai đoạn phát triển
├── backend/                              # NestJS (TypeScript NodeNext ESM)
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env.example                      # Mẫu biến môi trường backend
│   ├── nest-cli.json
│   ├── package.json
│   ├── tsconfig.json / tsconfig.build.json
│   └── src/
│       ├── main.ts                       # Entrypoint: Global Prefix /api, CORS, Filters, Interceptors
│       ├── app.module.ts                 # Root Module tích hợp HealthModule
│       ├── config/
│       │   └── app.config.ts             # Quản lý tập trung các biến môi trường
│       ├── common/
│       │   ├── filters/
│       │   │   └── http-exception.filter.ts # Bắt & chuẩn hóa lỗi HTTP format JSON thống nhất
│       │   ├── interceptors/
│       │   │   └── response.interceptor.ts  # Bọc dữ liệu trả về { success: true, data, timestamp }
│       │   ├── decorators/               # Thư mục cho Custom Decorators
│       │   ├── guards/                   # Thư mục cho Auth / API Key Guards
│       │   └── pipes/                    # Thư mục cho Validation Pipes
│       ├── database/
│       │   └── database.module.ts        # Module Mongoose (sẵn sàng cho Giai đoạn 1)
│       ├── modules/
│       │   └── health/                   # Endpoint GET /api/health kiểm tra tình trạng hệ thống
│       │       ├── health.module.ts
│       │       ├── health.controller.ts
│       │       └── health.service.ts
│       └── integrations/
│           └── n8n/                      # Kết nối n8n Webhook an toàn từ backend
│               ├── n8n.module.ts
│               └── n8n.client.ts
└── frontend/                             # Next.js 16 (App Router, Tailwind CSS v4, TypeScript)
    ├── Dockerfile
    ├── .dockerignore
    ├── .env.example                      # Mẫu biến môi trường frontend (NEXT_PUBLIC_API_URL)
    ├── package.json
    ├── next.config.ts
    ├── tsconfig.json
    ├── app/
    │   ├── layout.tsx                    # Root Layout hỗ trợ font và CSS chung
    │   ├── page.tsx                      # Root page (Redirect 307 -> /dashboard)
    │   ├── globals.css
    │   ├── dashboard/page.tsx            # Trang Dashboard cơ sở
    │   ├── documents/                    # Document Vault
    │   ├── health-scanner/               # Health Scanner
    │   ├── incidents/                    # Incident Center
    │   ├── recovery/                     # Safe Recovery
    │   ├── audit-logs/                   # Audit Logs
    │   ├── automation/                   # Automation Center
    │   └── settings/                     # Settings
    ├── components/
    │   ├── layout/                       # Sidebar, Header
    │   ├── common/                       # Các Card, Modal dùng chung
    │   └── ui/                           # Button, Badge primitives
    ├── lib/
    │   └── api.ts                        # Client API tập trung gọi backend có Type-Safe
    ├── hooks/
    │   └── useApi.ts                     # Custom React Hook fetch dữ liệu (kèm loading, error)
    ├── types/
    │   └── index.ts                      # Types TypeScript định nghĩa Document, Incident, AuditLog...
    └── constants/
        └── index.ts                      # Định nghĩa ROUTES, NAV_ITEMS, màu sắc trạng thái...
```

---

### 2. Các file nền tảng quan trọng đã thiết lập

- **`backend/src/config/app.config.ts`**: Quản lý tập trung mọi biến môi trường từ `process.env`.
- **`backend/src/common/filters/http-exception.filter.ts`**: Chuẩn hóa định dạng lỗi toàn cục:
  ```json
  { "success": false, "statusCode": 404, "message": "...", "timestamp": "...", "path": "..." }
  ```
- **`backend/src/common/interceptors/response.interceptor.ts`**: Bọc toàn bộ phản hồi API thành công:
  ```json
  { "success": true, "data": { ... }, "timestamp": "..." }
  ```
- **`backend/src/modules/health/`**: Cung cấp endpoint `GET /api/health` kiểm tra sức khỏe hệ thống.
- **`backend/src/integrations/n8n/n8n.client.ts`**: Cung cấp interface giao tiếp webhook với n8n, hỗ trợ xác thực header bí mật.
- **`frontend/lib/api.ts`**: Thư viện client API chuẩn hoá, hỗ trợ bắt lỗi typed `ApiException`.
- **`frontend/hooks/useApi.ts`**: Custom hook hỗ trợ tải dữ liệu bất đồng bộ kèm trạng thái loading/error.

---

### 3. Cấu hình Docker & Môi trường

Hệ thống hoạt động trên Docker network ngoài: **`docuguard-network`**.

| Dịch vụ | Tên Container | Cổng Host -> Container | Vai trò | Trạng thái |
|---|---|---|---|---|
| **Frontend** | `docuguard-client` | `3000:3000` | Next.js 16 App Router | Running |
| **Backend** | `docuguard-server` | `3001:3001` | NestJS 12 ESM | Running |
| **Database** | `mongodb` | `127.0.0.1:27017:27017` | MongoDB 8.2 | Running |
| **Automation** | `n8n` | `127.0.0.1:5678:5678` | n8n (SQLite nội bộ) | Running |

---

### 4. Kết quả kiểm tra thực tế

- **Build Backend**: Biên dịch thành công với `nest build`.
- **Build Frontend**: Biên dịch thành công với `next build`.
- **API Health Check**:
  ```bash
  curl http://localhost:3001/api/health
  ```
  Phản hồi:
  ```json
  {
    "success": true,
    "data": {
      "status": "ok",
      "service": "docuguard-backend",
      "version": "0.1.0",
      "environment": "production",
      "checks": {
        "server": "ok",
        "database": "not_checked",
        "n8n": "not_checked"
      }
    },
    "timestamp": "2026-10-12T16:23:17.264Z"
  }
  ```
- **Frontend HTTP Check**:
  - `GET http://localhost:3000/` trả về `307 Temporary Redirect` -> `/dashboard`
  - `GET http://localhost:3000/dashboard` trả về `200 OK`

---

### 5. Khởi động nhanh dự án

```bash
# 1. Đảm bảo network và container nền đang chạy
docker network ls | grep docuguard-network
docker ps | grep -E "mongodb|n8n"

# 2. Khởi động ứng dụng
docker compose up -d --build

# 3. Xem log
docker compose logs -f server
docker compose logs -f client
```

---

### 6. Lộ trình phát triển tiếp theo (10 Giai đoạn)

- **Giai đoạn 1**: Kết nối backend với MongoDB và hoàn thiện API kiểm tra sức khỏe hệ thống.
- **Giai đoạn 2**: Xây dựng chức năng quản lý và upload tài liệu.
- **Giai đoạn 3**: Xây dựng cơ chế hash SHA-256 và theo dõi phiên bản tài liệu.
- **Giai đoạn 4**: Xây dựng Document Health Score và các quy tắc kiểm tra.
- **Giai đoạn 5**: Tạo workflow n8n đầu tiên để kiểm tra tài liệu định kỳ.
- **Giai đoạn 6**: Xây dựng Incident Center và quy trình xử lý sự cố.
- **Giai đoạn 7**: Xây dựng cơ chế sao lưu và khôi phục tài liệu an toàn.
- **Giai đoạn 8**: Xây dựng Audit Log và giám sát workflow.
- **Giai đoạn 9**: Hoàn thiện giao diện quản trị và dashboard.
- **Giai đoạn 10**: Kiểm thử, bảo mật và triển khai production.
