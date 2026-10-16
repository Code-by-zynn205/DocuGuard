'use client';
import React from 'react';

export default function AutomationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Giám sát Tự động hóa (n8n Engine)</h1>
        <p className="text-sm text-slate-500">Trạng thái xử lý quy trình quét độc lập và Webhook kết nối.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800">Trạng thái n8n Engine</h2>
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-xs text-slate-500">Kết nối trực tiếp tới workflow n8n qua Webhook Secret key.</p>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono text-xs text-slate-600">
            Endpoint: http://localhost:5678
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800">Cấu hình Webhook</h2>
          <p className="text-xs text-slate-500">Các sự kiện tự động kích hoạt quét định kỳ tài liệu hết hạn hoặc sai mã Hash.</p>
          <button className="text-sm font-semibold text-blue-600 hover:text-blue-800 underline">
            Kiểm tra kết nối Webhook ngay
          </button>
        </div>
      </div>
    </div>
  );
}