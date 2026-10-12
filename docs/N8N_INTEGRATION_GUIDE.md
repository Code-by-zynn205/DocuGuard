# Hướng dẫn Tích hợp n8n

## Tổng quan

n8n là bộ máy tự động hóa của DocuGuard. Backend và n8n giao tiếp **2 chiều**:

```
Backend → n8n:  Backend gọi webhook n8n để trigger workflow
n8n → Backend:  n8n gọi API backend để đọc/ghi dữ liệu
```

---

## Thông tin kết nối

| Thông số | Giá trị |
|---|---|
| URL nội bộ (trong Docker) | `http://n8n:5678` |
| URL từ máy host | `http://localhost:5678` |
| Giao diện quản lý n8n | `http://localhost:5678` (mở trình duyệt) |

---

## Nguyên tắc bảo mật

1. **Backend** lưu `N8N_WEBHOOK_SECRET` trong biến môi trường.
2. Khi gọi webhook n8n, backend gửi kèm header `X-DocuGuard-Secret`.
3. n8n Webhook Node kiểm tra header này.
4. Khi n8n gọi lại Backend API, backend kiểm tra header bằng Guard.
5. **Frontend không bao giờ biết secret này.**

---

## Bước 1: Hiểu cách n8n Webhook hoạt động

### Trong n8n, Webhook Node là gì?

Webhook Node là điểm nhận request HTTP từ bên ngoài vào workflow.

Khi bạn tạo Webhook Node trong n8n:
- n8n sinh ra một URL dạng: `http://n8n:5678/webhook/tên-của-bạn`
- Backend gọi URL này để trigger workflow

### Hai loại Webhook URL trong n8n

| Loại | URL | Dùng khi |
|---|---|---|
| Test | `/webhook-test/tên` | Đang phát triển, workflow chưa kích hoạt |
| Production | `/webhook/tên` | Workflow đã kích hoạt (Active) |

---

## Bước 2: Tạo workflow đầu tiên trong n8n (Giai đoạn 5)

### Workflow: Document Health Scan

**Bước 2.1:** Mở n8n tại `http://localhost:5678`

**Bước 2.2:** Tạo workflow mới → Thêm node đầu tiên

Chọn: **Webhook** node
- HTTP Method: `POST`
- Path: `document-health-scan`
- Authentication: Header Auth
  - Name: `X-DocuGuard-Secret`
  - Value: (giá trị của `N8N_WEBHOOK_SECRET`)

→ URL sẽ là: `http://n8n:5678/webhook/document-health-scan`

**Bước 2.3:** Thêm node tiếp theo

Chọn: **HTTP Request** node (gọi lại Backend để lấy thông tin tài liệu)
- Method: `GET`
- URL: `http://docuguard-server:3001/api/documents/{{ $json.documentId }}`

**Bước 2.4:** Thêm logic kiểm tra

Dùng các node:
- **If** node: kiểm tra điều kiện
- **Code** node: viết JavaScript xử lý

**Bước 2.5:** Gửi kết quả về Backend

Thêm **HTTP Request** node:
- Method: `PATCH`
- URL: `http://docuguard-server:3001/api/documents/{{ $json.id }}/health`
- Body: `{ "healthScore": ..., "healthStatus": "..." }`

**Bước 2.6:** Kích hoạt workflow

Bấm **Active** toggle → Workflow chuyển sang production mode.

---

## Bước 3: Test webhook từ backend

### Test bằng curl (trước khi code backend)

```bash
# Gọi webhook n8n trực tiếp (Test mode — workflow chưa Active)
curl -X POST http://localhost:5678/webhook-test/document-health-scan \
  -H "Content-Type: application/json" \
  -H "X-DocuGuard-Secret: your-secret-here" \
  -d '{"documentId": "test-123"}'
```

### Implement trong N8nClient (Giai đoạn 5)

```typescript
// src/integrations/n8n/n8n.client.ts
async triggerHealthScan(payload: { documentId: string }): Promise<void> {
  const webhookUrl = `${this.baseUrl}/webhook/document-health-scan`;

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: this.getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`n8n health scan failed: ${response.status}`);
  }
}
```

---

## Bước 4: n8n gọi lại Backend

Khi n8n cần đọc/ghi dữ liệu vào Backend, nó dùng HTTP Request node:

```
n8n HTTP Request Node:
URL:    http://docuguard-server:3001/api/documents
Method: GET
Headers:
  Authorization: Bearer <API_KEY>  (Giai đoạn 10: thêm sau)
```

> Hiện tại, chưa có authentication. Sau Giai đoạn 10 sẽ thêm API Key guard.

---

## Các workflow dự kiến

### WORKFLOW 1: Document Health Scan
```
Trigger: Webhook (POST /webhook/document-health-scan)
       hoặc Cron (mỗi ngày lúc 2:00 AM)
       ↓
Lấy danh sách tài liệu từ Backend
       ↓
Kiểm tra từng tài liệu (hết hạn, thiếu thông tin, trùng lặp)
       ↓
Tính Health Score
       ↓
Gửi kết quả về Backend PATCH /api/documents/:id/health
       ↓
Nếu phát hiện vấn đề → Trigger WORKFLOW 2
```

### WORKFLOW 2: Incident Auto-Resolution
```
Trigger: Webhook (POST /webhook/incident-resolution)
       ↓
Phân loại severity (low/medium/high/critical)
       ↓
Tạo Incident trong Backend POST /api/incidents
       ↓
Gửi thông báo (Email/Slack — tùy cấu hình)
       ↓
Giao nhiệm vụ xử lý
       ↓
Cron: Theo dõi tiến độ mỗi 1 giờ
```

### WORKFLOW 3: Safe Recovery
```
Trigger: Webhook (POST /webhook/safe-recovery)
       ↓
Kiểm tra backup tồn tại
       ↓
Kiểm tra điều kiện an toàn
       ↓
Nếu cần phê duyệt: gửi email + chờ
       ↓
Sau phê duyệt: gọi Backend POST /api/recovery/execute
       ↓
Ghi AuditLog
```

---

## Kiểm tra n8n đang chạy

```bash
# Từ máy host
curl http://localhost:5678/healthz

# Từ container backend (trong Docker)
docker exec -it docuguard-server wget -qO- http://n8n:5678/healthz
```

---

## Lưu ý

- n8n đang dùng SQLite → workflow data lưu trong volume của container n8n.
- Backup n8n bằng cách export workflow (JSON) từ giao diện n8n.
- Khi n8n container restart, workflow vẫn còn (SQLite trong volume).
- **Test webhook**: dùng `webhook-test/` URL khi workflow chưa Active.
- **Production webhook**: dùng `webhook/` URL sau khi bấm Active.
