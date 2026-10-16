'use client';
import React, { useEffect, useState } from 'react';
import apiClient from '@/lib/apiClient';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);

  useEffect(() => {
    apiClient
      .get('/incidents')
      .then((res) => setIncidents(Array.isArray(res.data) ? res.data : []))
      .catch((err) => console.error('Error fetching incidents', err));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Trung tâm sự cố</h1>
        <p className="text-sm text-slate-500">Theo dõi các cảnh báo vi phạm tính toàn vẹn tài liệu và rủi ro an ninh.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        {incidents.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            Hệ thống đang hoạt động an toàn. Không có sự cố nào được ghi nhận.
          </div>
        ) : (
          <div className="space-y-4">
            {incidents.map((incident) => (
              <div key={incident._id} className="p-4 rounded-lg border border-red-100 bg-red-50/50 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">{incident.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{incident.description}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                  {incident.severity || 'HIGH'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}