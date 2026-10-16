'use client';
import React, { useEffect, useState } from 'react';
import apiClient from '@/lib/apiClient';

export default function DashboardPage() {
  const [summary, setSummary] = useState<any>({
    overallHealth: 100,
    totalDocs: 0,
    openIncidents: 0,
    expiringDocs: 0,
  });
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(true);

  useEffect(() => {
    apiClient
      .get('/dashboard/summary')
      .then((res) => {
        setSummary(res.data || {});
        setIsBackendConnected(true);
      })
      .catch((err) => {
        console.error('Dashboard error:', err);
        setIsBackendConnected(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      {/* Thông báo mất kết nối Backend */}
      {!isBackendConnected && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
            <span>
              <strong>Không thể kết nối tới Backend!</strong> Kiểm tra xem NestJS đã chạy ở port 3001 và kết nối MongoDB thành công chưa.
            </span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="underline font-semibold text-xs hover:text-red-900"
          >
            Thử lại
          </button>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-800">Bảng điều khiển</h1>
        <p className="text-sm text-slate-500">DocuGuard Risk Radar & Analytics Overview</p>
      </div>

      {/* Thẻ Thống kê KPI */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-semibold">Điểm Sức khỏe Tổng thể</p>
          <p className="text-3xl font-extrabold text-green-600 mt-2">{summary.overallHealth ?? 100}/100</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-semibold">Tổng số Tài liệu</p>
          <p className="text-3xl font-extrabold text-slate-800 mt-2">{summary.totalDocs ?? 0}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-semibold">Sự cố Đang mở</p>
          <p className="text-3xl font-extrabold text-red-600 mt-2">{summary.openIncidents ?? 0}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs text-slate-500 uppercase font-semibold">Tài liệu Sắp Hết hạn</p>
          <p className="text-3xl font-extrabold text-amber-500 mt-2">{summary.expiringDocs ?? 0}</p>
        </div>
      </div>

      {/* Risk Radar Widget */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-base font-bold text-slate-800 mb-1">Radar Rủi ro (Risk Radar)</h2>
        <p className="text-xs text-slate-500 mb-4">Danh sách các tài liệu nguy cơ cao nhất cần xử lý ngay lập tức.</p>
        <div className="text-sm text-slate-400 text-center py-10 border border-dashed rounded-lg bg-slate-50">
          Kho tài liệu an toàn. Không phát hiện rủi ro nghiêm trọng.
        </div>
      </div>
    </div>
  );
}