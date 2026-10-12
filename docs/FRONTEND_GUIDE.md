# Hướng dẫn Phát triển Frontend

## Tổng quan

Frontend DocuGuard dùng **Next.js 16 App Router** với TypeScript và Tailwind CSS v4.

### Quy ước đặt tên file

| Loại file | Đặt ở | Đặt tên |
|---|---|---|
| Trang (page) | `app/tên-route/page.tsx` | `page.tsx` |
| Layout lồng | `app/tên-route/layout.tsx` | `layout.tsx` |
| Component tái sử dụng | `components/` | `PascalCase.tsx` |
| Custom hook | `hooks/` | `useXxx.ts` |
| Utility function | `lib/` | `camelCase.ts` |
| TypeScript types | `types/` | `index.ts` hoặc `feature.ts` |

---

## Tự tạo trang mới

### Ví dụ: Tạo trang Documents

**Bước 1:** Tạo file `app/documents/page.tsx`

```tsx
// app/documents/page.tsx

// Đây là Server Component (mặc định trong App Router)
// Có thể fetch dữ liệu trực tiếp, không cần useEffect
export default function DocumentsPage() {
  return (
    <main className="flex-1 p-8">
      <h1 className="text-2xl font-bold mb-4">Kho tài liệu</h1>
      {/* Sẽ thêm danh sách tài liệu ở Giai đoạn 2 */}
    </main>
  );
}
```

**Bước 2:** Thêm metadata (SEO)

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kho tài liệu — DocuGuard',
};

export default function DocumentsPage() { ... }
```

**Bước 3:** Thêm vào Navigation (sau khi tạo `components/layout/Sidebar.tsx`)

---

## Tự tạo component

### Ví dụ: Component thẻ tài liệu

```tsx
// components/common/DocumentCard.tsx
'use client';  // ← Chỉ cần nếu dùng hook React hoặc browser API

import type { Document } from '@/types';
import { HEALTH_STATUS_COLORS } from '@/constants';

interface DocumentCardProps {
  document: Document;
  onClick?: () => void;
}

export function DocumentCard({ document, onClick }: DocumentCardProps) {
  const statusColor = HEALTH_STATUS_COLORS[document.healthStatus ?? 'unknown'];

  return (
    <div
      className="border rounded-lg p-4 hover:shadow-md cursor-pointer transition"
      onClick={onClick}
    >
      <h3 className="font-semibold text-gray-900">{document.title}</h3>
      <span className={`text-xs px-2 py-1 rounded-full ${statusColor}`}>
        {document.healthStatus ?? 'unknown'}
      </span>
    </div>
  );
}
```

---

## Gọi API backend

### Cách 1: Dùng `useApi` hook (Client Component)

```tsx
'use client';

import { useApi } from '@/hooks/useApi';
import type { Document } from '@/types';

export function DocumentList() {
  const { data, loading, error } = useApi<Document[]>('/documents');

  if (loading) return <p>Đang tải...</p>;
  if (error) return <p className="text-red-500">Lỗi: {error}</p>;
  if (!data) return null;

  return (
    <ul>
      {data.map((doc) => (
        <li key={doc._id}>{doc.title}</li>
      ))}
    </ul>
  );
}
```

### Cách 2: Fetch trực tiếp trong Server Component

```tsx
// app/documents/page.tsx (Server Component)
import { apiClient } from '@/lib/api';
import type { Document } from '@/types';

export default async function DocumentsPage() {
  // Fetch chạy ở server-side (không qua browser)
  const result = await apiClient.get<Document[]>('/documents');

  return (
    <main>
      {result.data.map((doc) => (
        <div key={doc._id}>{doc.title}</div>
      ))}
    </main>
  );
}
```

> **Khi nào dùng cái nào?**
> - **Server Component + async fetch**: cho dữ liệu tĩnh hoặc ít thay đổi (tốt cho SEO)
> - **Client Component + useApi**: cho dữ liệu cần cập nhật real-time hoặc tương tác người dùng

### Cách 3: Gửi form / POST request

```tsx
'use client';

import { apiClient } from '@/lib/api';

export function CreateDocumentForm() {
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const title = (form.elements.namedItem('title') as HTMLInputElement).value;

    try {
      await apiClient.post('/documents', { title });
      alert('Tạo tài liệu thành công!');
    } catch (err) {
      alert('Lỗi: ' + (err as Error).message);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" placeholder="Tên tài liệu" required />
      <button type="submit">Tạo mới</button>
    </form>
  );
}
```

---

## Tailwind CSS v4

Dự án dùng Tailwind v4 với Turbopack. Không cần file `tailwind.config.js`.

```tsx
// Dùng class trực tiếp trong JSX
<div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow">
  <span className="text-green-600 font-semibold">Healthy</span>
</div>
```

---

## Kiểm tra kết quả

```bash
# Chạy frontend local
cd frontend
npm run dev
# → Truy cập http://localhost:3000

# Kiểm tra TypeScript không có lỗi
npx tsc --noEmit

# Kiểm tra lint
npm run lint
```

---

## Các thư mục chờ triển khai

| Thư mục | Giai đoạn | Nội dung dự kiến |
|---|---|---|
| `components/layout/` | 2 | Sidebar, Header, Breadcrumb |
| `components/common/` | 2 | DocumentCard, IncidentBadge, HealthBadge |
| `components/ui/` | 2 | Button, Modal, Table, Spinner |
| `app/documents/` | 2 | Danh sách, tìm kiếm, upload tài liệu |
| `app/health-scanner/` | 4 | Kết quả quét sức khỏe |
| `app/incidents/` | 6 | Danh sách và chi tiết sự cố |
| `app/recovery/` | 7 | Lịch sử khôi phục |
| `app/audit-logs/` | 8 | Nhật ký hoạt động |
| `app/automation/` | 8 | Trạng thái workflow n8n |
| `app/dashboard/` | 9 | Tổng quan health score |
