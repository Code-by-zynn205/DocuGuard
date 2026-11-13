'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FolderKanban, AlertOctagon, Cpu, Shield } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    { label: 'Bảng điều khiển', href: '/', icon: LayoutDashboard },
    { label: 'Kho tài liệu', href: '/documents', icon: FolderKanban },
    { label: 'Trung tâm sự cố', href: '/incidents', icon: AlertOctagon },
    { label: 'Giám sát n8n', href: '/automation', icon: Cpu },
  ];

  return (
    <aside className="w-64 bg-slate-950 text-slate-300 min-h-screen p-4 flex flex-col justify-between border-r border-slate-800/60 select-none shrink-0">
      <div>
        <div className="mb-8 px-3 py-2 flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/30">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide text-white">DocuGuard</h1>
            <p className="text-[10px] text-blue-400 font-mono tracking-widest uppercase">Document Vault</p>
          </div>
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-slate-800/80 px-3">
        <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>Nền tảng DocuGuard</span>
          <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-400">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
};