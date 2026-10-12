/**
 * app/dashboard/page.tsx
 *
 * Trang Dashboard — tổng quan sức khỏe hệ thống tài liệu.
 *
 * GIAI ĐOẠN HIỆN TẠI:
 * Hiển thị placeholder — đủ để frontend build và chạy được.
 * Không có dữ liệu giả hay mock.
 *
 * GIAI ĐOẠN 9 (triển khai thực tế):
 * Kết nối API GET /api/dashboard/summary
 * Hiển thị: HealthScore, tổng tài liệu, sự cố đang mở, tài liệu hết hạn.
 *
 * XEM: docs/FRONTEND_GUIDE.md để biết cách tự xây dựng trang này.
 */

export default function DashboardPage() {
  return (
    <main className="flex-1 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-500 mb-8">
          Tổng quan sức khỏe kho tài liệu DocuGuard
        </p>

        {/* Placeholder — sẽ thay bằng dữ liệu thực ở Giai đoạn 9 */}
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <p className="text-gray-400 text-sm">
            📋 Dashboard đang được xây dựng.
          </p>
          <p className="text-gray-400 text-xs mt-2">
            Xem <code className="font-mono">docs/DEVELOPMENT_ROADMAP.md</code> để
            biết lộ trình triển khai.
          </p>
        </div>
      </div>
    </main>
  );
}
