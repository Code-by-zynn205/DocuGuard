'use client';

import { useState } from 'react';
import { mockDocuments } from '@/constants/mockData';
import { DocumentItem } from '@/types';
import HealthBadge from '@/components/ui/HealthBadge';
import { UploadModal } from '@/components/modals/UploadModal';
import { ShieldCheck, RotateCcw, Search, Copy, Check, FileText, Filter, Plus } from 'lucide-react';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>(mockDocuments);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const handleVerifyIntegrity = (id: string) => {
    const doc = documents.find((d) => d._id === id);
    if (doc?.healthStatus === 'critical') {
      alert('🚨 CẢNH BÁO: Phát hiện mã SHA-256 bị lệch! Tệp đã bị chỉnh sửa trái phép.');
    } else {
      alert('✅ Mã SHA-256 trùng khớp! Tệp an toàn nguyên vẹn.');
    }
  };

  const handleRecover = (id: string) => {
    if (!confirm('Bạn có chắc muốn khôi phục tệp này về bản sao lưu gốc?')) return;
    setDocuments((prev) =>
      prev.map((doc) =>
        doc._id === id
          ? { ...doc, healthScore: 100, healthStatus: 'healthy' }
          : doc
      )
    );
    alert('🎉 Khôi phục tệp thành công! Điểm sức khỏe đã phục hồi 100/100.');
  };

  const handleAddDocument = (newDoc: DocumentItem) => {
    setDocuments((prev) => [newDoc, ...prev]);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          doc.fileHash.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Kho Tài Liệu Doanh Nghiệp</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý, theo dõi tính toàn vẹn và khôi phục tài liệu an toàn.</p>
        </div>
        <button
          onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Tải lên tài liệu
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mã SHA-256..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full sm:w-auto text-sm border border-slate-200 rounded-xl p-2 bg-slate-50 focus:bg-white outline-none font-medium text-slate-700"
          >
            <option value="all">Tất cả danh mục</option>
            <option value="Pháp chế">Pháp chế</option>
            <option value="Hành chính">Hành chính</option>
            <option value="Nhân sự">Nhân sự</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="p-4 pl-6">Tên Tài Liệu</th>
                <th className="p-4">Mã Hash (SHA-256)</th>
                <th className="p-4">Sức Khỏe</th>
                <th className="p-4">Hạn Dùng</th>
                <th className="p-4 pr-6 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                    Không tìm thấy tài liệu phù hợp.
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => (
                  <tr key={doc._id} className="hover:bg-slate-50/60 transition-colors group">
                    <td className="p-4 pl-6 font-semibold text-slate-800 flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p>{doc.title}</p>
                        <span className="text-[11px] text-slate-400 font-normal">{doc.category} • {doc.department}</span>
                      </div>
                    </td>
                    <td className="p-4 font-mono text-xs text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-slate-100 px-2 py-1 rounded text-slate-600">
                          {doc.fileHash.substring(0, 12)}...
                        </span>
                        <button
                          onClick={() => copyToClipboard(doc.fileHash, doc._id)}
                          className="p-1 hover:text-slate-800 text-slate-400 transition-colors cursor-pointer"
                          title="Sao chép SHA-256"
                        >
                          {copiedId === doc._id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                    <td className="p-4">
                      <HealthBadge score={doc.healthScore} status={doc.healthStatus} />
                    </td>
                    <td className="p-4 text-slate-600 font-medium text-xs">
                      {doc.expiresAt}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleVerifyIntegrity(doc._id)}
                          className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          title="Kiểm tra toàn vẹn SHA-256"
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </button>

                        {doc.healthStatus === 'critical' && (
                          <button
                            onClick={() => handleRecover(doc._id)}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors animate-bounce cursor-pointer"
                            title="Khôi phục tệp an toàn (1-Click)"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={handleAddDocument}
      />
    </div>
  );
}