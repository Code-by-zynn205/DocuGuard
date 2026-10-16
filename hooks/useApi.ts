/**
 * hooks/useApi.ts
 *
 * Custom hook để gọi API backend từ React component.
 *
 * MỤC ĐÍCH:
 * - Gom logic fetch + loading + error vào 1 hook.
 * - Tránh lặp code trong mỗi component.
 *
 * CÁCH DÙNG:
 * const { data, loading, error } = useApi<Document[]>('/documents');
 *
 * LƯU Ý:
 * Hook này chỉ dành cho dữ liệu GET (đọc).
 * Với POST/PUT/DELETE, dùng apiClient trực tiếp trong handler.
 *
 * XEM THÊM: docs/FRONTEND_GUIDE.md
 */

'use client';

import { useState, useEffect } from 'react';
import { apiClient, ApiException } from '@/lib/api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook tự động fetch data khi component mount.
 *
 * @param path - Đường dẫn API, ví dụ: '/health' hoặc '/documents'
 */
export function useApi<T>(path: string): UseApiState<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const response = await apiClient.get<T>(path);
        if (!cancelled) {
          setState({ data: response.data, loading: false, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof ApiException
              ? err.message
              : 'Lỗi kết nối đến server';
          setState({ data: null, loading: false, error: message });
        }
      }
    }

    void fetchData();

    // Cleanup: hủy cập nhật state nếu component đã unmount
    return () => {
      cancelled = true;
    };
  }, [path]);

  return state;
}
