# Hướng dẫn Phát triển Backend (NestJS)

## Tổng quan

Backend DocuGuard dùng **NestJS 12** với TypeScript ESM (ES Modules).

### Điểm khác biệt ESM so với CommonJS

Dự án dùng `"type": "module"` trong `package.json`. Điều này có nghĩa:

```typescript
// ✅ Đúng — phải có .js extension khi import nội bộ
import { AppModule } from './app.module.js';

// ❌ Sai — thiếu .js extension
import { AppModule } from './app.module';

// ✅ Đúng — import thư viện không cần extension
import { Injectable } from '@nestjs/common';
```

---

## Tự tạo module mới

### Ví dụ: Tạo module Documents (Giai đoạn 2)

**Bước 1:** Tạo thư mục

```bash
mkdir -p backend/src/modules/documents
```

**Bước 2:** Tạo DTO

```typescript
// src/modules/documents/dto/create-document.dto.ts
export class CreateDocumentDto {
  title: string;        // Tên tài liệu
  description?: string; // Mô tả (tùy chọn)
  expiresAt?: string;   // Ngày hết hạn ISO 8601 (tùy chọn)
}
```

Sau này sẽ thêm validation:
```typescript
import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
```

**Bước 3:** Tạo Service

```typescript
// src/modules/documents/documents.service.ts
import { Injectable } from '@nestjs/common';
import { CreateDocumentDto } from './dto/create-document.dto.js';

@Injectable()
export class DocumentsService {
  // TODO: Inject InjectModel sau khi tạo Schema

  async create(dto: CreateDocumentDto) {
    // Logic tạo tài liệu sẽ viết ở đây
    // 1. Nhận file từ request (sẽ xử lý ở Giai đoạn 2)
    // 2. Tính SHA-256 hash (Giai đoạn 3)
    // 3. Lưu vào MongoDB (Giai đoạn 2)
    // 4. Trigger n8n health scan (Giai đoạn 5)
    throw new Error('Chưa triển khai');
  }

  async findAll() {
    throw new Error('Chưa triển khai');
  }

  async findOne(id: string) {
    throw new Error('Chưa triển khai');
  }
}
```

**Bước 4:** Tạo Controller

```typescript
// src/modules/documents/documents.controller.ts
import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { DocumentsService } from './documents.service.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  findAll() {
    return this.documentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.documentsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateDocumentDto) {
    return this.documentsService.create(dto);
  }
}
```

**Bước 5:** Tạo Module

```typescript
// src/modules/documents/documents.module.ts
import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
```

**Bước 6:** Đăng ký vào `app.module.ts`

```typescript
// src/app.module.ts
import { DocumentsModule } from './modules/documents/documents.module.js';

@Module({
  imports: [
    HealthModule,
    DocumentsModule,  // ← Thêm vào đây
  ],
})
export class AppModule {}
```

---

## Kiểm tra API

### Dùng curl

```bash
# GET /api/health
curl http://localhost:3001/api/health

# GET /api/documents
curl http://localhost:3001/api/documents

# POST /api/documents
curl -X POST http://localhost:3001/api/documents \
  -H "Content-Type: application/json" \
  -d '{"title": "Hợp đồng A"}'
```

### Format response chuẩn (thành công)

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-10-12T16:00:00.000Z"
}
```

### Format response lỗi

```json
{
  "success": false,
  "statusCode": 404,
  "message": "Không tìm thấy tài liệu",
  "timestamp": "2026-10-12T16:00:00.000Z",
  "path": "/api/documents/abc123"
}
```

---

## Vòng đời Request trong NestJS

```
HTTP Request
    ↓
Middleware (ghi log, parse token...)
    ↓
Guard (kiểm tra quyền: có JWT không? có role phù hợp không?)
    ↓
Interceptor (pre-processing)
    ↓
Pipe (validate và transform dữ liệu vào)
    ↓
Controller (định tuyến đến đúng method)
    ↓
Service (xử lý nghiệp vụ)
    ↓
Interceptor (post-processing: bọc response)
    ↓
HTTP Response
```

---

## Các lệnh hữu ích

```bash
# Chạy development (hot reload)
cd backend
npm run start:dev

# Build production
npm run build

# Chạy test
npm test

# Kiểm tra TypeScript
npx tsc --noEmit -p tsconfig.build.json

# Lint
npm run lint
```

---

## Thứ tự tạo module theo giai đoạn

| Giai đoạn | Module | Endpoint chính |
|---|---|---|
| 1 | `health` (✅ đã có) | GET /api/health |
| 2 | `documents` | GET/POST /api/documents |
| 3 | `documents` (mở rộng) | Hash, version tracking |
| 4 | `document-health`, `health-scanner` | Health Score |
| 5 | `n8n` (tích hợp) | Webhook trigger |
| 6 | `incidents` | CRUD sự cố |
| 7 | `recovery` | Khôi phục tài liệu |
| 8 | `audit-logs`, `automation` | Log và monitoring |
