import { NextResponse, type NextRequest } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  AUTH_ROLE_COOKIE_NAME,
  ROUTES,
} from '@/constants';

const PROTECTED_PREFIXES = [
  ROUTES.DASHBOARD,
  ROUTES.DOCUMENTS,
  ROUTES.HEALTH_SCANNER,
  ROUTES.INCIDENTS,
  ROUTES.RECOVERY,
  ROUTES.AUDIT_LOGS,
  ROUTES.AUTOMATION,
  ROUTES.DRIVE_CLIPPER,
  ROUTES.SETTINGS,
];

/**
 * Next.js 16 Proxy (thay thế quy ước middleware.ts đã deprecated)
 * Bảo vệ các route nội bộ và chuyển hướng về /login nếu chưa có token.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const role = request.cookies.get(AUTH_ROLE_COOKIE_NAME)?.value;

  if (pathname === ROUTES.HOME) {
    return NextResponse.redirect(
      new URL(token ? ROUTES.DASHBOARD : ROUTES.LOGIN, request.url),
    );
  }

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !token) {
    const loginUrl = new URL(ROUTES.LOGIN, request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === ROUTES.LOGIN && token) {
    return NextResponse.redirect(new URL(ROUTES.DASHBOARD, request.url));
  }

  // RBAC cơ bản: chặn tài khoản chỉ xem (viewer) truy cập trang cấu hình hệ thống
  if (
    (pathname === ROUTES.SETTINGS ||
      pathname.startsWith(`${ROUTES.SETTINGS}/`)) &&
    role === 'viewer'
  ) {
    return NextResponse.redirect(new URL(ROUTES.DASHBOARD, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/dashboard/:path*',
    '/documents/:path*',
    '/health-scanner/:path*',
    '/incidents/:path*',
    '/recovery/:path*',
    '/audit-logs/:path*',
    '/automation/:path*',
    '/drive-clipper/:path*',
    '/settings/:path*',
  ],
};
