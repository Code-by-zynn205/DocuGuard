'use client';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { DocumentItem } from '@/types';
import HealthBadge from '@/components/ui/HealthBadge';
import { ShieldCheck, RotateCcw, Download } from 'lucide-react';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  const fetchDocuments = () => {
    apiClient.get('/documents').then((res) => setDocuments(res.data));
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Xử lý Kiểm tra toàn vẹn (File Integrity Check)
  const handleVerifyIntegrity = async (id: string) => {
    try {
      const res = await apiClient.post(`/documents/${id}/verify-integrity`);
      if (res.data.isValid) {
        alert('✅ Mã SHA-256 trùng khớp! File an toàn nguyên vẹn.');
      } else {
        alert('🚨 CẢNH BÁO: File bị can thiệp trái phép hoặc bị thay đổi nội dung!');
      }
      fetchDocuments();
    } catch {
      alert('Lỗi kiểm tra toàn vẹn tệp');
    }
  };

  // Xử lý Khôi phục an toàn (1-Click Safe Recovery)
  const handleRecover = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn khôi phục tệp này về bản gốc ban đầu?')) return;
    try {
      await apiClient.post(`/documents/${id}/recover`);
      alert('🎉 Khôi phục tệp thành công! Điểm sức khỏe đã phục hồi 100%.');
      fetchDocuments();
    } catch {
      alert('Lỗi khi khôi phục tài liệu');
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Kho Tài Liệu Doanh Nghiệp</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <tr>
              <th className="p-4">Tên Tài Liệu</th>
              <th className="p-4">Mã Hash (SHA-256)</th>
              <th className="p-4">Sức Khỏe</th>
              <th className="p-4">Hạn Dùng</th>
              <th className="p-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {documents.map((doc) => (
              <tr key={doc._id} className="hover:bg-slate-50">
                <td className="p-4 font-medium text-slate-900">{doc.title}</td>
                <td className="p-4 font-mono text-xs text-slate-500">
                  {doc.fileHash ? `${doc.fileHash.substring(0, 10)}...` : 'N/A'}
                </td>
                <td className="p-4">
                  <HealthBadge score={doc.healthScore} status={doc.healthStatus} />
                </td>
                <td className="p-4 text-slate-600">
                  {doc.expiresAt ? new Date(doc.expiresAt).toLocaleDateString('vi-VN') : 'Vĩnh viễn'}
                </td>
                <td className="p-4 text-right space-x-2">
                  <button
                    onClick={() => handleVerifyIntegrity(doc._id)}
                    className="p-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title="Kiểm tra toàn vẹn SHA-256"
                  >
                    <ShieldCheck className="w-5 h-5" />
                  </button>

                  {doc.healthStatus === 'critical' && (
                    <button
                      onClick={() => handleRecover(doc._id)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Khôi phục tệp an toàn (1-Click)"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                  )}

                  <a
                    href={`${process.env.NEXT_PUBLIC_API_URL}/documents/${doc._id}/download`}
                    target="_blank"
                    className="inline-block p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Download className="w-5 h-5" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}