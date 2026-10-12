# Cấu trúc Dự án DocuGuard

## Cây thư mục

```
DocuGuard/
├── compose.yaml              ← Quản lý frontend + backend bằng Docker Compose
├── docs/                     ← Toàn bộ tài liệu hướng dẫn (tiếng Việt)
│
├── frontend/                 ← Next.js App Router (TypeScript + Tailwind)
│   ├── app/                  ← Tất cả trang (Next.js App Router)
│   │   ├── layout.tsx        ← Layout gốc, áp dụng cho toàn bộ app
│   │   ├── page.tsx          ← Trang / → redirect đến /dashboard
│   │   ├── globals.css       ← CSS toàn cục (Tailwind directives)
│   │   ├── dashboard/        ← Trang tổng quan
│   │   ├── documents/        ← Kho tài liệu
│   │   ├── health-scanner/   ← Kết quả quét sức khỏe
│   │   ├── incidents/        ← Trung tâm sự cố
│   │   ├── recovery/         ← Lịch sử khôi phục
│   │   ├── audit-logs/       ← Nhật ký hoạt động
│   │   ├── automation/       ← Giám sát workflow n8n
│   │   └── settings/         ← Cài đặt hệ thống
│   │
│   ├── components/           ← React components tái sử dụng
│   │   ├── layout/           ← Sidebar, Header, Navigation
│   │   ├── common/           ← Button, Modal, Loading, Alert...
│   │   └── ui/               ← Primitive UI: Badge, Card, Table...
│   │
│   ├── lib/
│   │   └── api.ts            ← API client gọi Backend (fetch wrapper)
│   │
│   ├── hooks/
│   │   └── useApi.ts         ← Custom hook fetch + loading + error
│   │
│   ├── types/
│   │   └── index.ts          ← TypeScript types phản ánh API backend
│   │
│   ├── constants/
│   │   └── index.ts          ← ROUTES, NAV_ITEMS, màu trạng thái
│   │
│   ├── .env.example          ← Biến môi trường mẫu cho frontend
│   ├── Dockerfile            ← Build image docuguard-client
│   ├── next.config.ts        ← Cấu hình Next.js
│   └── package.json
│
└── backend/                  ← NestJS (TypeScript ESM)
    ├── src/
    │   ├── main.ts           ← Điểm khởi động: port, CORS, filters
    │   ├── app.module.ts     ← Module gốc: tập hợp tất cả module
    │   │
    │   ├── config/
    │   │   └── app.config.ts ← Đọc biến môi trường → export appConfig
    │   │
    │   ├── common/           ← Tái sử dụng toàn ứng dụng
    │   │   ├── filters/
    │   │   │   └── http-exception.filter.ts  ← Chuẩn hóa lỗi HTTP
    │   │   ├── interceptors/
    │   │   │   └── response.interceptor.ts   ← Bọc response thành công
    │   │   ├── decorators/   ← (trống, dùng sau)
    │   │   ├── guards/       ← (trống, dùng sau — JWT, Role)
    │   │   └── pipes/        ← (trống, dùng sau — ValidationPipe)
    │   │
    │   ├── database/
    │   │   └── database.module.ts ← Kết nối MongoDB qua Mongoose
    │   │
    │   ├── modules/          ← Các module nghiệp vụ
    │   │   ├── health/       ← Endpoint GET /api/health
    │   │   │   ├── health.module.ts
    │   │   │   ├── health.controller.ts
    │   │   │   └── health.service.ts
    │   │   │
    │   │   │   ── (các module dưới đây sẽ tạo trong từng giai đoạn) ──
    │   │   ├── auth/         ← Giai đoạn 10: xác thực JWT
    │   │   ├── users/        ← Giai đoạn 10: quản lý người dùng
    │   │   ├── documents/    ← Giai đoạn 2: upload, lưu trữ tài liệu
    │   │   ├── document-health/ ← Giai đoạn 4: Health Score
    │   │   ├── health-scanner/  ← Giai đoạn 4: quét và kiểm tra
    │   │   ├── incidents/    ← Giai đoạn 6: quản lý sự cố
    │   │   ├── recovery/     ← Giai đoạn 7: khôi phục tài liệu
    │   │   ├── audit-logs/   ← Giai đoạn 8: nhật ký hoạt động
    │   │   └── automation/   ← Giai đoạn 8: giám sát workflow
    │   │
    │   └── integrations/
    │       └── n8n/
    │           ├── n8n.module.ts  ← Đăng ký N8nClient
    │           └── n8n.client.ts  ← Gọi webhook n8n từ backend
    │
    ├── .env.example          ← Biến môi trường mẫu cho backend
    ├── Dockerfile            ← Build image docuguard-server
    ├── nest-cli.json         ← Cấu hình NestJS CLI
    ├── tsconfig.json         ← TypeScript (ESM, NodeNext)
    └── package.json
```

## Giải thích các thành phần NestJS

### Module
Là "hộp" tổ chức code. Mỗi tính năng có 1 module riêng.
```typescript
@Module({
  imports: [],      // Module khác cần dùng
  controllers: [],  // Xử lý HTTP request
  providers: [],    // Service, logic nghiệp vụ
  exports: [],      // Cho phép module khác dùng provider này
})
```

### Controller
Nhận và định tuyến HTTP request. KHÔNG viết logic phức tạp ở đây.
```typescript
@Controller('documents')
class DocumentsController {
  @Get()              // GET /api/documents
  findAll() { ... }

  @Post()             // POST /api/documents
  create() { ... }

  @Get(':id')         // GET /api/documents/:id
  findOne(@Param('id') id: string) { ... }
}
```

### Service
Nơi chứa toàn bộ logic nghiệp vụ: tính toán, gọi database, gọi n8n.
```typescript
@Injectable()
class DocumentsService {
  async create(dto: CreateDocumentDto) {
    // 1. Tính hash file
    // 2. Lưu vào MongoDB
    // 3. Trigger n8n health scan
    // 4. Trả về document đã tạo
  }
}
```

### DTO (Data Transfer Object)
Định nghĩa cấu trúc dữ liệu vào/ra của API.
```typescript
class CreateDocumentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
```

### Schema/Model (Mongoose)
Ánh xạ collection MongoDB thành TypeScript class.
```typescript
@Schema({ timestamps: true })
class Document {
  @Prop({ required: true })
  title: string;

  @Prop()
  fileHash: string;
}
```

### Guard
Kiểm tra điều kiện trước khi cho phép vào controller.
```typescript
@Injectable()
class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Kiểm tra JWT token
    // Trả về true = cho phép, false = từ chối (401)
  }
}
```

### Interceptor
Xử lý request/response: logging, chuẩn hóa format, cache.
```typescript
@Injectable()
class ResponseInterceptor implements NestInterceptor {
  intercept(context, next) {
    return next.handle().pipe(
      map(data => ({ success: true, data, timestamp: ... }))
    );
  }
}
```

### Exception Filter
Bắt lỗi và định dạng lại response lỗi theo chuẩn thống nhất.
```typescript
@Catch(HttpException)
class HttpExceptionFilter implements ExceptionFilter {
  catch(exception, host) {
    // Trả về: { success: false, statusCode, message, ... }
  }
}
```
