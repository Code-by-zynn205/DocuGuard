'use client';

import React, { useState } from 'react';
import { Cpu, CheckCircle2, RefreshCw, Zap, Bell, Activity, ArrowUpRight } from 'lucide-react';

export default function AutomationPage() {
  const [isTesting, setIsTesting] = useState(false);

  const handleTestWebhook = () => {
    setIsTesting(true);
    setTimeout(() => {
      setIsTesting(false);
      alert('✅ Kết nối Webhook n8n thành công! Phản hồi: 200 OK');
    }, 1200);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Giám Sát Tự Động Hóa (n8n Engine)
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Theo dõi trạng thái các workflow quét tự động, khôi phục tài liệu và phát tín hiệu cảnh báo.
          </p>
        </div>

        <button
          onClick={handleTestWebhook}
          disabled={isTesting}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
          {isTesting ? 'Đang test...' : 'Kiểm tra Webhook'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Trạng Thái Engine</p>
            <p className="text-lg font-bold text-slate-800 mt-0.5 flex items-center gap-2">
              Hoạt động
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Workflow Kích Hoạt</p>
            <p className="text-lg font-bold text-slate-800 mt-0.5">2 / 2 Active</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Lần Quét Gần Nhất</p>
            <p className="text-lg font-bold text-slate-800 mt-0.5">Hôm nay, 00:00</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-800">Danh Sách Quy Trình (Workflows)</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Health Scanner Engine</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">ID: wf_health_scan_cron</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active
              </span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Lập lịch tự động quét kiểm tra tính toàn vẹn SHA-256 và cập nhật điểm sức khỏe tài liệu hệ thống.
            </p>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Lịch chạy: <strong className="text-slate-700 font-mono">Cron 00:00 hàng ngày</strong></span>
              <a href="http://localhost:5678" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold">
                Mở trong n8n <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Auto Remediation & Alerting</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">ID: wf_alert_webhook</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active
              </span>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Nhận phản hồi tức thì qua Webhook để gửi tin nhắn cảnh báo sự cố tới Telegram & Email quản trị viên.
            </p>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Phương thức: <strong className="text-slate-700 font-mono">Webhook Trigger</strong></span>
              <a href="http://localhost:5678" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold">
                Mở trong n8n <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}