import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block animate-pulse"></span>
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">System Normal</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-800">Admin User</p>
          <p className="text-xs text-slate-500">Quản trị viên Hệ thống</p>
        </div>
      </div>
    </header>
  );
};