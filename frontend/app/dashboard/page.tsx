'use client';

import React, { useEffect, useState } from 'react';

interface DashboardStats {
  totalDocuments: number;
  healthyDocuments: number;
  warningDocuments: number;
  criticalDocuments: number;
  averageHealthScore: number;
  openIncidents: number;
  expiringIn30DaysDocuments: number;
  topRiskRadar: Array<{
    documentId: string;
    title: string;
    department: string;
    healthScore: number;
    primaryRiskReason: string;
  }>;
}

interface IncidentItem {
  _id: string;
  incidentCode: string;
  title: string;
  severity: string;
  status: string;
  createdAt: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggeringScan, setTriggeringScan] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, incRes] = await Promise.all([
        fetch('http://localhost:3001/api/dashboard/stats').then((r) => r.json()),
        fetch('http://localhost:3001/api/incidents').then((r) => r.json()),
      ]);

      if (statsRes.success) setStats(statsRes.data);
      if (incRes.success) setIncidents(incRes.data || []);
    } catch (err) {
      console.error('Lỗi nạp dữ liệu dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerN8nScan = async () => {
    setTriggeringScan(true);
    setScanResult(null);
    try {
      const res = await fetch('http://localhost:5678/webhook/document-health-scan', {
        method: 'POST',
      });
      const data = await res.json();
      setScanResult(data.message || 'Quét sức khỏe hoàn tất qua n8n!');
      await loadData();
    } catch {
      setScanResult('Đã gửi yêu cầu quét tới n8n webhook.');
    } finally {
      setTriggeringScan(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow">
            DG
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">DocuGuard</h1>
            <p className="text-xs text-gray-500">Document Security & Health Automation Platform</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Backend: Online (3001)
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            n8n Automation: Sẵn sàng (5678)
          </span>
          <button
            onClick={triggerN8nScan}
            disabled={triggeringScan}
            className="ml-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow transition flex items-center gap-2 disabled:opacity-60"
          >
            {triggeringScan ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                n8n Đang Quét...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Kích Hoạt n8n Quét Ngay
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {scanResult && (
          <div className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">✅</span>
              <span>{scanResult}</span>
            </div>
            <button onClick={() => setScanResult(null)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
        )}

        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Health Score */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Điểm Sức Khỏe TB</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-4xl font-extrabold ${
                (stats?.averageHealthScore ?? 0) >= 80 ? 'text-green-600' : (stats?.averageHealthScore ?? 0) >= 60 ? 'text-amber-500' : 'text-red-600'
              }`}>
                {loading ? '...' : `${stats?.averageHealthScore ?? 0}%`}
              </span>
              <span className="text-xs text-gray-400">/ 100</span>
            </div>
            <span className="text-xs text-gray-400 mt-2">Được chấm bởi 5 luật tự động</span>
          </div>

          {/* Total Documents */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổng Tài Liệu</span>
            <div className="mt-2">
              <span className="text-4xl font-extrabold text-gray-900">
                {loading ? '...' : (stats?.totalDocuments ?? 0)}
              </span>
            </div>
            <span className="text-xs text-green-600 mt-2 font-medium">
              {stats?.healthyDocuments ?? 0} tài liệu khỏe mạnh
            </span>
          </div>

          {/* Warning */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Cần Lưu Ý (Warning)</span>
            <div className="mt-2">
              <span className="text-4xl font-extrabold text-amber-500">
                {loading ? '...' : (stats?.warningDocuments ?? 0)}
              </span>
            </div>
            <span className="text-xs text-gray-400 mt-2">Điểm 60 - 79 điểm</span>
          </div>

          {/* Critical */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">Nguy Hiểm (Critical)</span>
            <div className="mt-2">
              <span className="text-4xl font-extrabold text-red-600">
                {loading ? '...' : (stats?.criticalDocuments ?? 0)}
              </span>
            </div>
            <span className="text-xs text-red-500 mt-2 font-medium">Lệch hash hoặc dưới 60đ</span>
          </div>

          {/* Open Incidents */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Sự Cố Đang Xử Lý</span>
            <div className="mt-2">
              <span className="text-4xl font-extrabold text-purple-600">
                {loading ? '...' : (stats?.openIncidents ?? 0)}
              </span>
            </div>
            <span className="text-xs text-gray-400 mt-2">Tự động tạo từ n8n</span>
          </div>
        </div>

        {/* Risk Radar & Recent Incidents Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Risk Radar */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎯</span>
                <h2 className="font-bold text-gray-900 text-base">Radar Rủi Ro (Top Tài Liệu Yếu)</h2>
              </div>
              <span className="text-xs text-gray-500">Ưu tiên khắc phục</span>
            </div>

            <div className="p-6 flex-1 divide-y divide-gray-100">
              {stats?.topRiskRadar && stats.topRiskRadar.length > 0 ? (
                stats.topRiskRadar.map((item, idx) => (
                  <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Phòng ban: <span className="font-medium text-gray-700">{item.department}</span>
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        ⚠️ {item.primaryRiskReason}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800">
                        {item.healthScore} điểm
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 py-8 text-center">Không có tài liệu nào thuộc diện nguy cơ cao.</p>
              )}
            </div>
          </div>

          {/* Recent Incidents Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <span className="text-lg">🚨</span>
                <h2 className="font-bold text-gray-900 text-base">Sự Cố Hệ Thống (Gần Đây)</h2>
              </div>
              <span className="text-xs text-gray-500">Giám sát 24/7</span>
            </div>

            <div className="p-6 flex-1 divide-y divide-gray-100 overflow-y-auto max-h-96">
              {incidents && incidents.length > 0 ? (
                incidents.map((inc) => (
                  <div key={inc._id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-blue-600">{inc.incidentCode}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          inc.severity === 'critical' ? 'bg-red-100 text-red-700' :
                          inc.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {inc.severity}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-800 mt-1 truncate">{inc.title}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        inc.status === 'open' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {inc.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 py-8 text-center">Chưa có sự cố nào được ghi nhận.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
