# Hướng dẫn Docker — DocuGuard

## Tổng quan container

| Container | Quản lý bởi | Image | Cổng |
|---|---|---|---|
| `docuguard-client` | `compose.yaml` | `docuguard-client` | 3000 |
| `docuguard-server` | `compose.yaml` | `docuguard-server` | 3001 |
| `mongodb` | Tự quản lý | `mongo:8.2` | 27017 |
| `n8n` | Tự quản lý | `docker.n8n.io/n8nio/n8n` | 5678 |

**`compose.yaml` chỉ quản lý `client` và `server`.** MongoDB và n8n phải đang chạy trước.

---

## Lần đầu khởi động

### Bước 1: Đảm bảo network và container nền đang chạy

```bash
# Kiểm tra network đã tồn tại chưa
docker network ls | grep docuguard-network

# Nếu chưa có:
docker network create docuguard-network

# Kiểm tra mongodb và n8n đang chạy
docker ps | grep -E "mongodb|n8n"
```

### Bước 2: Build và khởi động

```bash
# Từ thư mục gốc DocuGuard/
docker compose up -d --build

# Giải thích:
# up       → khởi động service
# -d       → detached (chạy nền)
# --build  → build lại image trước khi chạy
```

### Bước 3: Kiểm tra đã chạy chưa

```bash
docker compose ps
```

---

## Các lệnh thường dùng

### Xem log

```bash
# Xem log tất cả service (theo thời gian thực)
docker compose logs -f

# Chỉ xem log backend
docker compose logs -f server

# Chỉ xem log frontend
docker compose logs -f client

# Xem 50 dòng cuối
docker compose logs --tail 50 server
```

### Dừng và khởi động lại

```bash
# Dừng (KHÔNG xóa dữ liệu)
docker compose down

# Dừng và xóa volume của compose (KHÔNG ảnh hưởng mongodb/n8n)
docker compose down -v

# Chỉ restart 1 service
docker compose restart server

# Khởi động lại sau khi sửa code (không build lại)
docker compose up -d

# Khởi động lại và build lại image
docker compose up -d --build
```

### Rebuild image sau khi thay đổi code

```bash
# Rebuild cả hai
docker compose up -d --build

# Chỉ rebuild backend
docker compose up -d --build server

# Chỉ rebuild frontend
docker compose up -d --build client
```

---

## Kiểm tra kết nối network

```bash
# Xem tất cả container trong network docuguard-network
docker network inspect docuguard-network --format '{{range .Containers}}{{.Name}} {{end}}'

# Kết quả mong đợi: mongodb n8n docuguard-server docuguard-client
```

### Kiểm tra backend gọi được MongoDB

```bash
# Vào container backend và ping mongodb
docker exec -it docuguard-server sh -c "wget -qO- http://mongodb:27017 2>&1 | head -1"

# Hoặc kiểm tra qua API health (sau khi kết nối MongoDB trong Giai đoạn 1)
curl http://localhost:3001/api/health
```

### Kiểm tra backend gọi được n8n

```bash
docker exec -it docuguard-server sh -c "wget -qO- http://n8n:5678/healthz"
```

---

## Giải thích Dockerfile

### Frontend Dockerfile (`frontend/Dockerfile`)

```dockerfile
FROM node:22-alpine      # Image Node.js nhẹ

WORKDIR /app             # Thư mục làm việc trong container

COPY package*.json ./    # Copy trước để cache layer này
RUN npm ci               # Cài dependencies (dùng package-lock.json)

COPY . .                 # Copy toàn bộ source code

EXPOSE 3000              # Khai báo cổng (chỉ là documentation)

CMD ["npm", "run", "dev", "--", "-H", "0.0.0.0"]
# → Chạy Next.js dev server, lắng nghe mọi interface (không chỉ localhost)
```

> **Lưu ý:** Dockerfile hiện tại dùng `dev` mode. Khi production, nên dùng `next build` + `next start` với multi-stage build.

### Backend Dockerfile (`backend/Dockerfile`)

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build        # Compile TypeScript → JavaScript (dist/)
EXPOSE 3001
CMD ["npm", "run", "start:prod"]  # Chạy: node dist/main
```

---

## Cấu hình cổng

| Cổng host | Cổng container | Service |
|---|---|---|
| 3000 | 3000 | Frontend |
| 3001 | 3001 | Backend |
| 27017 | 27017 | MongoDB (chỉ localhost) |
| 5678 | 5678 | n8n (chỉ localhost) |

MongoDB và n8n bind `127.0.0.1:port` → chỉ truy cập từ máy host, không từ internet.

---

## Xử lý sự cố thường gặp

### Container không khởi động được

```bash
# Xem log lỗi
docker compose logs server

# Thường gặp: lỗi TypeScript compile → chạy build cục bộ trước
cd backend && npm run build
```

### Backend không kết nối được MongoDB

```bash
# Kiểm tra cả 2 đang trong cùng network
docker network inspect docuguard-network

# Nếu mongodb chưa join network
docker network connect docuguard-network mongodb
```

### Port đã bị chiếm

```bash
# Tìm process đang dùng cổng 3001
lsof -i :3001
# hoặc
ss -tlnp | grep 3001
```

### Rebuild từ đầu (khi gặp vấn đề kỳ lạ)

```bash
# Chỉ rebuild image, KHÔNG xóa volume dữ liệu
docker compose down
docker compose build --no-cache
docker compose up -d
```
