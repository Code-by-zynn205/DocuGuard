# Hướng dẫn Cấu hình Môi trường

## Tại sao cần biến môi trường?

Biến môi trường giúp tách **cấu hình** khỏi **code**. Cùng một codebase có thể chạy:
- Trên máy developer (trỏ đến localhost)
- Trên server production (trỏ đến server thực)

Không cần sửa code, chỉ thay đổi biến môi trường.

---

## Biến môi trường Backend

File mẫu: `backend/.env.example`

| Biến | Mô tả | Giá trị development | Giá trị Docker |
|---|---|---|---|
| `NODE_ENV` | Môi trường chạy | `development` | `production` |
| `PORT` | Cổng backend | `3001` | `3001` |
| `MONGODB_URI` | URI kết nối MongoDB | `mongodb://localhost:27017/docuguard` | `mongodb://mongodb:27017/docuguard` |
| `N8N_BASE_URL` | URL n8n | `http://localhost:5678` | `http://n8n:5678` |
| `N8N_WEBHOOK_SECRET` | Secret xác thực webhook | Chuỗi bất kỳ | Chuỗi ngẫu nhiên mạnh |
| `FRONTEND_ORIGIN` | Origin CORS | `http://localhost:3000` | `http://localhost:3000` |
| `DOCUMENT_STORAGE_PATH` | Thư mục lưu file | `./storage/documents` | `/app/storage/documents` |

### Tại sao MongoDB URI khác nhau?

- **Chạy local** (`npm run start:dev`): backend chạy trực tiếp trên máy → dùng `localhost:27017`
- **Chạy Docker** (`docker compose up`): backend chạy trong container → MongoDB được truy cập qua tên container `mongodb` trong cùng network → dùng `mongodb:27017`

### Tạo N8N_WEBHOOK_SECRET mạnh

```bash
# Cách 1: dùng openssl
openssl rand -hex 32

# Cách 2: dùng node
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Biến môi trường Frontend

File mẫu: `frontend/.env.example`

| Biến | Mô tả |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL backend mà **browser** truy cập |

### QUAN TRỌNG: `NEXT_PUBLIC_*`

Trong Next.js, chỉ biến có tiền tố `NEXT_PUBLIC_` mới được gửi đến browser.

```
NEXT_PUBLIC_API_URL=http://localhost:3001   ✅ Browser biết
DATABASE_PASSWORD=secret123                ✅ Server biết, browser KHÔNG biết
```

**Không đặt secret vào `NEXT_PUBLIC_*`!**

### Tại sao dùng `localhost:3001` thay vì `http://docuguard-server:3001`?

Vì `NEXT_PUBLIC_API_URL` được browser sử dụng, không phải Next.js server.
Browser chạy trên máy người dùng — không trong Docker. Vì vậy:
- `http://docuguard-server:3001` → ❌ Browser không biết hostname này
- `http://localhost:3001` → ✅ Browser gọi đến máy host, Docker forward đến container

---

## Thiết lập cho lần đầu

### Chạy local (không dùng Docker)

```bash
# 1. Tạo file .env từ template
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 2. Sửa backend/.env
#    Đổi MONGODB_URI nếu MongoDB của bạn dùng auth
#    Ví dụ: mongodb://user:password@localhost:27017/docuguard

# 3. Chạy backend
cd backend
npm run start:dev

# 4. Chạy frontend (terminal khác)
cd frontend
npm run dev
```

### Chạy với Docker Compose

```bash
# Biến môi trường được cấu hình sẵn trong compose.yaml
# Không cần tạo file .env riêng cho Docker

# Chỉ cần đổi N8N_WEBHOOK_SECRET trong compose.yaml trước khi production
docker compose up -d --build
```

---

## Kiểm tra cấu hình đúng chưa?

### Kiểm tra backend đọc được biến môi trường

```bash
# Vào terminal backend (khi chạy local)
cd backend
node -e "import('./src/config/app.config.js').then(m => console.log(m.appConfig))"
```

### Kiểm tra API health

```bash
curl http://localhost:3001/api/health
```

Kết quả mong đợi:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "docuguard-backend",
    "environment": "development"
  }
}
```

### Kiểm tra biến trong frontend

```bash
# Trong Next.js, log biến môi trường trong một Server Component
console.log(process.env.NEXT_PUBLIC_API_URL);
```

---

## Cẩn thận với .gitignore

```
# backend/.gitignore đã có:
.env
.env.development.local
.env.test.local
.env.production.local
.env.local

# frontend/.gitignore đã có:
.env*
```

**KHÔNG commit file `.env` chứa giá trị thực vào Git.**
Chỉ commit file `.env.example` với giá trị placeholder.
