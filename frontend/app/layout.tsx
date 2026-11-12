import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { AppShell } from '@/components/layout/AppShell';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'DocuGuard — Nền tảng bảo mật & giám sát tài liệu',
  description:
    'Hệ thống quản lý tài liệu doanh nghiệp chuẩn Cybersecurity SaaS: kiểm tra toàn vẹn SHA-256, phát hiện bất thường và Safe Recovery 1-Click.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
        <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
          <AppShell>{children}</AppShell>
        </Suspense>
      </body>
    </html>
  );
}
