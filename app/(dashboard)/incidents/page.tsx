'use client';

import { useState } from 'react';
import { mockIncidents } from '@/constants/mockData';
import { IncidentItem } from '@/types';
import { SeverityBadge } from '@/components/ui/SeverityBadge';
import { CheckCircle2, ShieldCheck, AlertOctagon, Search, Filter, RefreshCw } from 'lucide-react';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<IncidentItem[]>(mockIncidents);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const handleResolve = (id: string) => {
    setIncidents((prev) =>
      prev.map((item) => (item._id === id ? { ...item, status: 'resolved' } : item))
    );
    alert('🎉 Đã đánh dấu sự cố là Đã giải quyết!');
  };

  const filteredIncidents = incidents.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.incidentCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Trung Tâm Xử Lý Sự Cố</h1>
          <p className="text-slate-500 text-sm mt-1">Danh sách rủi ro và vi phạm an toàn tài liệu được tự động ghi nhận.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã, tiêu đề sự cố..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto text-sm border border-slate-200 rounded-xl p-2 bg-slate-50 focus:bg-white outline-none font-medium text-slate-700"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="open">Đang mở (Open)</option>
            <option value="in_progress">Đang xử lý (In Progress)</option>
            <option value="resolved">Đã giải quyết (Resolved)</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4 pl-6">Mã Sự Cố</th>
                <th className="p-4">Thông Tin Sự Cố</th>
                <th className="p-4">Mức Độ</th>
                <th className="p-4">Trạng Thái</th>
                <th className="p-4 pr-6 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-emerald-500/60" />
                    Không có sự cố nào cần xử lý. Hệ thống an toàn!
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="p-4 pl-6 font-mono text-xs font-bold text-slate-700 whitespace-nowrap">
                      <span className="bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200/60 text-slate-800">
                        {item.incidentCode}
                      </span>
                    </td>
                    <td className="p-4 max-w-md">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-rose-50 text-rose-600 rounded-lg shrink-0 mt-0.5">
                          <AlertOctagon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900">{item.title}</h4>
                          {item.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <SeverityBadge level={item.severity} />
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {item.status === 'resolved' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đã giải quyết
                        </span>
                      ) : item.status === 'in_progress' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span> Đang xử lý
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span> Mới ghi nhận
                        </span>
                      )}
                    </td>
                    <td className="p-4 pr-6 text-right whitespace-nowrap">
                      {item.status !== 'resolved' ? (
                        <button
                          onClick={() => handleResolve(item._id)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all active:scale-95 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Giải Quyết
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium italic">Đã xử lý xong</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}