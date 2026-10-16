'use client';
import React from 'react';
import { Sidebar } from '@/components/common/Sidebar';
import { Header } from '@/components/common/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 antialiased overflow-hidden">
      {/* Thanh điều hướng bên trái */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header trên cùng */}
        <Header />

        {/* Nội dung chính của các trang */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}