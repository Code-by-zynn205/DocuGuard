'use client';

import { useContext } from 'react';
import { ToastContext, type ToastContextValue } from '@/components/ui/Toast';

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast phải được sử dụng bên trong ToastProvider');
  }
  return ctx;
}
