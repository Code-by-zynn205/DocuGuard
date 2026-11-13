'use client';

import { useState } from 'react';
import { mockDashboardSummary } from '@/constants/mockData';
import { ShieldCheck, FileText, AlertOctagon, Clock, ArrowUpRight, ShieldAlert, Plus, RefreshCw } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [summary] = useState(mockDashboardSummary);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bảng Điều Khiển Quản Trị</h1>
          <p className="text-slate-500 text-sm mt-1">
            Tổng quan sức khỏe và trạng thái an toàn toàn bộ kho tài liệu hệ thống.
          </p>
        </div>

        <Link
          href="/documents"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Tải lên tài liệu
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Điểm Sức Khỏe</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900 tracking-tight">{summary.overallHealthScore}</span>
            <span className="text-slate-400 font-medium text-sm">/ 100</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${summary.overallHealthScore}%` }}></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng Số Tài Liệu</span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-slate-900 tracking-tight">{summary.totalDocuments}</span>
            <Link href="/documents" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5">
              Chi tiết <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <p className="text-xs text-slate-400 mt-3">Đang lưu trữ trong kho mã hóa</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sự Cố Đang Mở</span>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl group-hover:scale-110 transition-transform">
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-rose-600 tracking-tight">{summary.openIncidentsCount}</span>
            <Link href="/incidents" className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-0.5">
              Xử lý ngay <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <p className="text-xs text-slate-400 mt-3">Cần xác minh tính toàn vẹn</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sắp Hết Hạn (30 Ngày)</span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-black text-amber-600 tracking-tight">{summary.expiringSoonCount}</span>
            <span className="text-xs font-medium text-slate-400">Tài liệu</span>
          </div>
          <p className="text-xs text-slate-400 mt-3">Yêu cầu gia hạn hoặc lưu trữ lại</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-slate-800">Lối Tắt Quản Trị Nhanh</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/documents" className="p-4 rounded-xl border border-slate-200/80 hover:border-blue-500 hover:bg-blue-50/50 transition-all flex items-center gap-3 group">
            <div className="p-2.5 bg-blue-100/70 text-blue-700 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Quản lý Kho Tài liệu</p>
              <p className="text-xs text-slate-500">Xem toàn bộ tệp & mã Hash</p>
            </div>
          </Link>

          <Link href="/incidents" className="p-4 rounded-xl border border-slate-200/80 hover:border-rose-500 hover:bg-rose-50/50 transition-all flex items-center gap-3 group">
            <div className="p-2.5 bg-rose-100/70 text-rose-700 rounded-lg group-hover:bg-rose-600 group-hover:text-white transition-colors">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Trung tâm Sự cố</p>
              <p className="text-xs text-slate-500">Khôi phục tệp bị can thiệp</p>
            </div>
          </Link>

          <Link href="/automation" className="p-4 rounded-xl border border-slate-200/80 hover:border-emerald-500 hover:bg-emerald-50/50 transition-all flex items-center gap-3 group">
            <div className="p-2.5 bg-emerald-100/70 text-emerald-700 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Giám sát n8n Engine</p>
              <p className="text-xs text-slate-500">Kiểm tra Workflow tự động</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}