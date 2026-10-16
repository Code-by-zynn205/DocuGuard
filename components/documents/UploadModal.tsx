'use client';
import React, { useState } from 'react';
import apiClient from '@/lib/apiClient';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Pháp chế');
  const [department, setDepartment] = useState('Phòng Kế toán');
  const [expiresAt, setExpiresAt] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return alert('Vui lòng chọn tệp');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title || file.name);
    formData.append('category', category);
    formData.append('department', department);
    if (expiresAt) formData.append('expiresAt', expiresAt);
    formData.append('description', description);

    try {
      setLoading(true);
      await apiClient.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onSuccess();
      onClose();
    } catch (err) {
      alert('Tải lên tài liệu thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
        <h2 className="text-lg font-bold mb-4 text-slate-800">Tải lên Tài liệu Mới</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Chọn Tệp *</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
              className="w-full text-sm border p-2 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tên tài liệu</label>
            <input
              type="text"
              placeholder="Tên hợp đồng/tài liệu"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-sm border p-2 rounded-md"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Danh mục</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-sm border p-2 rounded-md"
              >
                <option value="Pháp chế">Pháp chế</option>
                <option value="Tài chính">Tài chính</option>
                <option value="Nhân sự">Nhân sự</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Ngày hết hạn</label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full text-sm border p-2 rounded-md"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Mô tả tóm tắt</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-sm border p-2 rounded-md"
            ></textarea>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border rounded-md hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-slate-300"
            >
              {loading ? 'Đang tải...' : 'Tải lên'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};