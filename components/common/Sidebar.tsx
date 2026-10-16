'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { label: 'Bảng điều khiển', href: '/' },
    { label: 'Kho tài liệu', href: '/documents' },
    { label: 'Trung tâm sự cố', href: '/incidents' },
    { label: 'Giám sát n8n', href: '/automation' },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen p-4 flex flex-col justify-between">
      <div>
        <div className="mb-8 px-2">
          <h1 className="text-xl font-bold tracking-wide text-blue-400">DocuGuard</h1>
          <p className="text-xs text-slate-400">Document Vault Core</p>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="text-xs text-slate-500 px-2">v1.0.0 • DocuGuard Platform</div>
    </aside>
  );
};