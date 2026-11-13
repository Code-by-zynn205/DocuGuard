# Hướng dẫn MongoDB — DocuGuard

## Tổng quan

DocuGuard dùng **MongoDB 8.2** kết nối qua **Mongoose** (thư viện ODM — Object Document Mapper).

### Thông tin kết nối

| Môi trường | URI |
|---|---|
| Local development | `mongodb://localhost:27017/docuguard` |
| Docker (nội bộ) | `mongodb://mongodb:27017/docuguard` |
| Database | `docuguard` |

---

## Bước 1: Cài Mongoose (Giai đoạn 1)

```bash
cd backend
npm install @nestjs/mongoose mongoose
```

Sau khi cài, uncomment `DatabaseModule` trong `app.module.ts`:

```typescript
// src/app.module.ts
import { DatabaseModule } from './database/database.module.js';

@Module({
  imports: [
    HealthModule,
    DatabaseModule,  // ← Uncomment dòng này
  ],
})
```

### Xác nhận kết nối thành công

Khi backend khởi động, bạn sẽ thấy log:
```
[NestFactory] Starting Nest application...
[MongooseModule] Connected to MongoDB
🚀 DocuGuard Backend đang chạy tại cổng 3001
```

---

## Bước 2: Hiểu cách tạo Schema

Mongoose Schema = Bản thiết kế của một Collection MongoDB.

### Ví dụ đơn giản

```typescript
// src/modules/documents/schemas/document.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// Kiểu TypeScript cho document sau khi query từ MongoDB
export type DocumentSchemaDocument = HydratedDocument<DocumentSchema>;

@Schema({
  timestamps: true,     // Tự động thêm createdAt, updatedAt
  collection: 'documents',  // Tên collection trong MongoDB
})
export class DocumentSchema {
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  fileHash: string;  // SHA-256 của nội dung file

  @Prop({ default: 'active', enum: ['active', 'archived', 'deleted'] })
  status: string;

  @Prop({ min: 0, max: 100 })
  healthScore: number;

  @Prop()
  expiresAt: Date;
}

// Factory tạo Mongoose Schema từ class trên
export const DocumentSchemaDefinition = SchemaFactory.createForClass(DocumentSchema);
```

### Đăng ký Schema vào Module

```typescript
// src/modules/documents/documents.module.ts
import { MongooseModule } from '@nestjs/mongoose';
import { DocumentSchema, DocumentSchemaDefinition } from './schemas/document.schema.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DocumentSchema.name, schema: DocumentSchemaDefinition },
    ]),
  ],
  ...
})
```

### Inject vào Service và dùng

```typescript
// src/modules/documents/documents.service.ts
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DocumentSchema, DocumentSchemaDocument } from './schemas/document.schema.js';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(DocumentSchema.name)
    private readonly documentModel: Model<DocumentSchemaDocument>,
  ) {}

  async findAll() {
    return this.documentModel.find({ status: 'active' }).exec();
  }

  async create(data: Partial<DocumentSchema>) {
    return this.documentModel.create(data);
  }

  async findById(id: string) {
    return this.documentModel.findById(id).exec();
  }
}
```

---

## Thiết kế Model theo từng giai đoạn

### Model Document (Giai đoạn 2)

```
Collection: documents
Fields:
  - _id: ObjectId (tự động)
  - title: String (bắt buộc)
  - description: String
  - originalFileName: String
  - mimeType: String
  - fileSize: Number (bytes)
  - filePath: String (đường dẫn trong storage)
  - fileHash: String (SHA-256, Giai đoạn 3)
  - status: Enum ['active', 'archived', 'deleted']
  - healthScore: Number 0-100 (Giai đoạn 4)
  - healthStatus: Enum ['healthy', 'warning', 'critical']
  - expiresAt: Date
  - tags: [String]
  - metadata: Object
  - createdAt: Date (timestamps)
  - updatedAt: Date (timestamps)
```

### Model DocumentVersion (Giai đoạn 3)

```
Collection: document_versions
Fields:
  - _id: ObjectId
  - documentId: ObjectId (ref: documents)
  - versionNumber: Number (1, 2, 3...)
  - fileHash: String (SHA-256)
  - filePath: String
  - fileSize: Number
  - changeReason: String
  - changedBy: String (userId sau này)
  - createdAt: Date
```

### Model Incident (Giai đoạn 6)

```
Collection: incidents
Fields:
  - _id: ObjectId
  - documentId: ObjectId (ref: documents, tùy chọn)
  - type: Enum ['duplicate', 'missing_info', 'expired', 'integrity_violation', ...]
  - title: String
  - description: String
  - severity: Enum ['low', 'medium', 'high', 'critical']
  - status: Enum ['open', 'in_progress', 'resolved', 'closed']
  - assignedTo: String
  - resolvedAt: Date
  - n8nWorkflowId: String (ID của workflow n8n liên quan)
  - createdAt: Date
  - updatedAt: Date
```

### Model AuditLog (Giai đoạn 8)

```
Collection: audit_logs
Fields:
  - _id: ObjectId
  - action: String ('document.created', 'document.deleted', 'recovery.executed')
  - entityType: String ('document', 'incident', 'recovery')
  - entityId: String
  - userId: String
  - ipAddress: String
  - metadata: Object (dữ liệu bổ sung tùy action)
  - createdAt: Date
```

---

## Kiểm tra dữ liệu trong MongoDB

```bash
# Vào MongoDB shell
docker exec -it mongodb mongosh

# Chọn database
use docuguard

# Xem tất cả collection
show collections

# Xem tài liệu
db.documents.find().pretty()

# Tìm theo điều kiện
db.documents.find({ status: 'active' })

# Đếm số lượng
db.documents.countDocuments()
```

---

## Lưu ý quan trọng

1. **Không hardcode URI** — luôn đọc từ `MONGODB_URI` trong biến môi trường.
2. **Index** — tạo index cho các field thường dùng tìm kiếm (`fileHash`, `status`, `expiresAt`).
3. **Không xóa volume** khi chỉ muốn restart container — dùng `docker compose down` (không có `-v`).
4. **Backup** trước khi chạy migration schema.
