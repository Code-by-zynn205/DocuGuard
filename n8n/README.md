# Hướng dẫn Quản lý & Vận hành Luồng n8n (DocuGuard)

DocuGuard sử dụng **3 luồng tự động hóa trọng tâm (Automated Workflows)** chạy trên nền tảng n8n:

1. **`document-health-scan.json`**: Quét định kỳ (Cron 2:00 AM) hoặc kích hoạt qua Webhook (`/webhook/document-health-scan`) để đánh giá toàn bộ tài liệu, phát hiện rủi ro và tạo sự cố tự động.
2. **`incident-auto-resolution.json`**: Kích hoạt khi phát hiện vi phạm toàn vẹn tệp (lệch hash SHA-256) qua Webhook (`/webhook/incident-resolution`), tự động ghi nhận sự cố và thực hiện Safe Recovery khôi phục dữ liệu gốc.
3. **`safe-recovery.json`**: Điều phối quy trình khôi phục an toàn qua Webhook (`/webhook/safe-recovery`), tự động phân loại tài liệu thường vs. tài liệu tối mật để kích hoạt quy trình phê duyệt hoặc khôi phục tức thì.

---

## 🚀 Cách Import và Chạy Trên Giao Diện Web n8n

### Bước 1: Mở giao diện n8n
Truy cập vào trình duyệt:
```
http://localhost:5678
```

### Bước 2: Nhập (Import) từng Workflow
1. Tại menu bên trái, chọn **Workflows** -> Bấm nút **Add workflow** (hoặc dấu `+`).
2. Ở góc trên bên phải màn hình n8n, click vào biểu tượng menu ba chấm `...` -> Chọn **Import from File...**.
3. Chọn lần lượt các file trong thư mục `n8n/workflows/`:
   - `n8n/workflows/document-health-scan.json`
   - `n8n/workflows/incident-auto-resolution.json`
   - `n8n/workflows/safe-recovery.json`

### Bước 3: Kiểm tra cấu hình và Biến môi trường
- Các node HTTP Request trong workflow trỏ tới biến môi trường `BACKEND_INTERNAL_URL` (mặc định là `http://docuguard-server:3001` trong mạng Docker hoặc `http://localhost:3001` khi chạy máy local).
- Xác thực header: Webhook kiểm tra `X-DocuGuard-Secret` khớp với cấu hình trong `backend/.env`.

### Bước 4: Kích hoạt (Activate) Workflow
- Bấm nút gạt **Active** ở góc trên bên phải của workflow từ `Inactive` sang `Active`.
- Khi Active, webhook sẽ lắng nghe tại:
  - `http://localhost:5678/webhook/document-health-scan`
  - `http://localhost:5678/webhook/incident-resolution`
  - `http://localhost:5678/webhook/safe-recovery`

---

## 🧪 Cách Test Workflow Trực Tiếp Trên Web n8n

### Test Thủ Công (Manual Execution Test):
1. Mở workflow trên giao diện n8n.
2. Bấm nút **Test step** hoặc **Test workflow** ở thanh công cụ dưới đáy.
3. Chạy script gửi request test hoặc curl:

```bash
# Test Document Health Scan Webhook
curl -X POST http://localhost:5678/webhook-test/document-health-scan \
  -H "Content-Type: application/json" \
  -H "X-DocuGuard-Secret: docuguard-n8n-secret-key-2026" \
  -d '{"documentId": "test-doc-id"}'

# Test Incident Auto-Resolution Webhook
curl -X POST http://localhost:5678/webhook-test/incident-resolution \
  -H "Content-Type: application/json" \
  -H "X-DocuGuard-Secret: docuguard-n8n-secret-key-2026" \
  -d '{"documentId": "test-doc-id", "expectedHash": "abc", "actualHash": "xyz"}'
```

4. Trên giao diện n8n, quan sát các node chuyển màu xanh lá cây và hiển thị dữ liệu đầu ra JSON của từng bước.

---

## 🤖 Chạy Tự Động Với Kịch Bản Test (Automated Verification)

Chạy file kịch bản Node.js để kiểm tra tính hợp lệ và cấu trúc của toàn bộ 3 file workflow:
```bash
node n8n/test-workflows.mjs
```
