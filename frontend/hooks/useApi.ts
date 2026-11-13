/**
 * hooks/useApi.ts
 *
 * Custom React Hook quản lý gọi API GET từ Client Component.
 * Hỗ trợ tự động hủy request cũ (AbortController), theo dõi trạng thái
 * data / loading / error và cung cấp hàm refetch ổn định.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  apiClient,
  normalizeApiError,
  type QueryParamValue,
} from '@/lib/api';

export interface UseApiOptions<T> {
  /** Bật/tắt tự động gọi API khi mount hoặc dependencies thay đổi (mặc định: true) */
  enabled?: boolean;
  /** Dữ liệu khởi tạo trước khi có response */
  initialData?: T | null;
  /** Query parameters nối vào URL */
  params?: Record<string, QueryParamValue>;
  /** Bearer token ghi đè cho request này */
  token?: string;
  /** Cho phép dùng mock fallback data khi backend chưa chạy (mặc định: true) */
  mockFallback?: boolean;
  /** Timeout cho request tính theo ms */
  timeoutMs?: number;
  /** Callback chạy khi fetch thành công */
  onSuccess?: (data: T) => void;
  /** Callback chạy khi fetch thất bại */
  onError?: (error: string) => void;
}

export interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  isMock: boolean;
  refetch: () => Promise<T | null>;
}

/**
 * Custom hook fetch dữ liệu type-safe với loading, error và refetch.
 *
 * @example
 * const { data, loading, error, refetch } = useApi<Document[]>('/documents');
 */
export function useApi<T>(
  path: string | null,
  options: UseApiOptions<T> = {},
): UseApiResult<T> {
  const {
    enabled = true,
    initialData = null,
    params,
    token,
    mockFallback = true,
    timeoutMs,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState<boolean>(Boolean(path && enabled));
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState<boolean>(false);

  const paramsKey = JSON.stringify(params ?? {});
  const abortControllerRef = useRef<AbortController | null>(null);
  const callbacksRef = useRef({ onSuccess, onError });

  useEffect(() => {
    callbacksRef.current = { onSuccess, onError };
  }, [onSuccess, onError]);

  const executeFetch = useCallback(async (): Promise<T | null> => {
    if (!path) {
      return null;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const parsedParams = JSON.parse(paramsKey) as Record<
        string,
        QueryParamValue
      >;

      const response = await apiClient.get<T>(path, {
        params: parsedParams,
        token,
        mockFallback,
        timeoutMs,
        signal: controller.signal,
      });

      if (controller.signal.aborted) {
        return null;
      }

      setData(response.data);
      setIsMock(Boolean(response.isMock));
      setLoading(false);
      callbacksRef.current.onSuccess?.(response.data);
      return response.data;
    } catch (err) {
      if (controller.signal.aborted) {
        return null;
      }

      const message = normalizeApiError(err);
      setError(message);
      setLoading(false);
      callbacksRef.current.onError?.(message);
      return null;
    }
  }, [path, paramsKey, token, mockFallback, timeoutMs]);

  useEffect(() => {
    if (!path || !enabled) {
      return;
    }

    let active = true;
    void Promise.resolve().then(() => {
      if (active) {
        void executeFetch();
      }
    });

    return () => {
      active = false;
      abortControllerRef.current?.abort();
    };
  }, [path, enabled, executeFetch]);

  return {
    data,
    loading,
    error,
    isMock,
    refetch: executeFetch,
  };
}
