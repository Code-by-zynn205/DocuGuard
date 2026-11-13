import {
  AUTH_COOKIE_NAME,
  AUTH_ROLE_COOKIE_NAME,
  AUTH_USER_STORAGE_KEY,
} from '@/constants';
import { clearAuthToken, setAuthToken } from '@/lib/api';
import type { UserRole } from '@/types';

export interface AuthSessionUser {
  _id: string;
  email: string;
  fullName: string;
  role: UserRole;
  department: string;
  title: string;
}

export const AUTH_CHANGE_EVENT = 'docuguard:auth-change';

export const DEMO_ACCOUNTS: Record<'admin' | 'auditor', AuthSessionUser> = {
  admin: {
    _id: 'usr_admin_01',
    email: 'admin@docuguard.io',
    fullName: 'Nguyễn Minh Quân',
    role: 'admin',
    department: 'Security Operations Center',
    title: 'SOC Administrator',
  },
  auditor: {
    _id: 'usr_auditor_01',
    email: 'auditor@docuguard.io',
    fullName: 'Trần Thảo Vy',
    role: 'auditor',
    department: 'Kiểm toán nội bộ',
    title: 'Lead Security Auditor',
  },
};

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24; // 24 giờ

export function setAuthSession(token: string, user: AuthSessionUser): void {
  setAuthToken(token);

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
    document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
    document.cookie = `${AUTH_ROLE_COOKIE_NAME}=${encodeURIComponent(user.role)}; path=/; max-age=${COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
}

export function getAuthUser(): AuthSessionUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSessionUser;
  } catch {
    return null;
  }
}

export function clearAuthSession(): void {
  clearAuthToken();

  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
    document.cookie = `${AUTH_ROLE_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  }
}

export function getUserInitials(fullName?: string): string {
  if (!fullName) return 'DG';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
