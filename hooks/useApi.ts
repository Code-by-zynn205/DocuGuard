'use client';

import { useState, useEffect } from 'react';
import { apiClient, ApiException } from '@/lib/api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

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

    return () => {
      cancelled = true;
    };
  }, [path]);

  return state;
}