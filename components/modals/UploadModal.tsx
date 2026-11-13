'use client';
import React, { useState } from 'react';
import { X, UploadCloud, File, Loader2 } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newDoc: any) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Pháp chế');
  const [expiresAt, setExpiresAt] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert('Vui lòng chọn tệp');

    setLoading(true);
    setTimeout(() => {
      const newDoc = {
        _id: `doc-${Date.now()}`,
        title: title || file.name,
        category,
        department: 'Phòng Kế toán',
        fileHash: 'c4ca4238a0b923820dcc509a6f75849b6556f8f53a1e2f3d4e5f6a7b8c9d0e1f',
        healthScore: 100,
        healthStatus: 'healthy',
        expiresAt: expiresAt || '2027-12-31',
        isDuplicate: false,
        createdAt: new Date().toISOString().split('T')[0],
        description,
      };

      onSuccess(newDoc);
      setLoading(false);
      onClose();
      alert('🎉 Tải lên tài liệu thành công!');
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Tải lên Tài liệu Mới</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Chọn Tệp *</label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer relative">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-blue-600 font-medium text-sm">
                  <File className="w-5 h-5" />
                  <span className="truncate max-w-[250px]">{file.name}</span>
                </div>
              ) : (
                <div className="space-y-1">
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-xs text-slate-600 font-medium">Nhấp hoặc kéo thả file vào đây</p>
                  <p className="text-[10px] text-slate-400">Hỗ trợ PDF, DOCX, PNG, JPG...</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Tên tài liệu</label>
            <input
              type="text"
              placeholder="Tên hợp đồng/tài liệu..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm border border-slate-200 p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Danh mục</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm border border-slate-200 p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all bg-white"
              >
                <option value="Pháp chế">Pháp chế</option>
                <option value="Tài chính">Tài chính</option>
                <option value="Nhân sự">Nhân sự</option>
                <option value="Hành chính">Hành chính</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Ngày hết hạn</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full text-sm border border-slate-200 p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Mô tả tóm tắt</label>
            <textarea
              rows={2}
              placeholder="Nhập ghi chú hoặc mô tả ngắn..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm border border-slate-200 p-2.5 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-medium bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Đang tải...' : 'Tải lên'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};