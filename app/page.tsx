// 'use client';
// import { useEffect, useState } from 'react';
// import { apiClient } from '@/lib/apiClient';
// import { DashboardSummary } from '@/types';
// import HealthBadge from '@/components/ui/HealthBadge';

// export default function DashboardPage() {
//   const [summary, setSummary] = useState<DashboardSummary>({
//     overallHealthScore: 0,
//     totalDocuments: 0,
//     openIncidentsCount: 0,
//     expiringSoonCount: 0,
//   });

//   useEffect(() => {
//     apiClient.get('/dashboard/summary').then((res) => setSummary(res.data));
//   }, []);

//   return (
//     <div className="p-8 space-y-8">
//       <h1 className="text-2xl font-bold text-slate-800">Bảng Điều Khiển Quản Trị</h1>

//       {/* KPI Cards */}
//       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
//         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
//           <p className="text-sm font-medium text-slate-500">Điểm Sức Khỏe Tổng Thể</p>
//           <div className="mt-2 flex items-baseline gap-2">
//             <span className="text-3xl font-extrabold text-slate-900">{summary.overallHealthScore}</span>
//             <span className="text-slate-500">/ 100</span>
//           </div>
//         </div>

//         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
//           <p className="text-sm font-medium text-slate-500">Tổng Số Tài Liệu</p>
//           <p className="mt-2 text-3xl font-extrabold text-slate-900">{summary.totalDocuments}</p>
//         </div>

//         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
//           <p className="text-sm font-medium text-slate-500">Sự Cố Đang Mở</p>
//           <p className="mt-2 text-3xl font-extrabold text-rose-600">{summary.openIncidentsCount}</p>
//         </div>

//         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
//           <p className="text-sm font-medium text-slate-500">Sắp Hết Hạn (30 Ngày)</p>
//           <p className="mt-2 text-3xl font-extrabold text-amber-600">{summary.expiringSoonCount}</p>
//         </div>
//       </div>
//     </div>
//   );
// }
'use client';

import { useState } from 'react';
import { mockDashboardSummary } from '@/constants/mockData';

export default function DashboardPage() {
  const [summary] = useState(mockDashboardSummary);

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Bảng Điều Khiển Quản Trị</h1>
        <p className="text-slate-500 text-sm mt-1">Tổng quan sức khỏe và trạng thái an toàn toàn bộ kho tài liệu</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Điểm Sức Khỏe Tổng Thể</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600">{summary.overallHealthScore}</span>
            <span className="text-slate-500">/ 100</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Tổng Số Tài Liệu</p>
          <p className="mt-2 text-3xl font-extrabold text-slate-900">{summary.totalDocuments}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Sự Cố Đang Mở</p>
          <p className="mt-2 text-3xl font-extrabold text-rose-600">{summary.openIncidentsCount}</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Sắp Hết Hạn (30 Ngày)</p>
          <p className="mt-2 text-3xl font-extrabold text-amber-600">{summary.expiringSoonCount}</p>
        </div>
      </div>
    </div>
  );
}