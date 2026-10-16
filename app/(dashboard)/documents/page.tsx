'use client';
import React, { useEffect, useState } from 'react';
import apiClient from '@/lib/apiClient';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    apiClient
      .get('/documents')
      .then((res) => {
        setDocuments(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching documents', err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Kho tài liệu</h1>
          <p className="text-sm text-slate-500">Quản lý, xác thực mã Hash SHA-256 và khôi phục an toàn.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg text-sm transition shadow-sm">
          + Tải lên tài liệu
        </button>
      </div>

      {/* Bảng danh sách tài liệu */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase font-semibold">
              <th className="py-3 px-4">Tên Tài liệu</th>
              <th className="py-3 px-4">Mã Hash (SHA-256)</th>
              <th className="py-3 px-4">Trạng thái Toàn vẹn</th>
              <th className="py-3 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center py-6 text-slate-400">Đang tải dữ liệu...</td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-slate-400">Chưa có tài liệu nào trong hệ thống.</td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc._id} className="hover:bg-slate-50 transition">
                  <td className="py-3.5 px-4 font-medium text-slate-800">{doc.filename}</td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-500 truncate max-w-xs">{doc.hash}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                      An toàn
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button className="text-blue-600 hover:text-blue-800 font-medium text-xs mr-3">Kiểm tra Hash</button>
                    <button className="text-emerald-600 hover:text-emerald-800 font-medium text-xs">Safe Recovery</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}