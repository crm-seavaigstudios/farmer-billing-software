"use client";

import React, { useState, useEffect } from 'react';
import { apiGetPurchases } from '@/lib/api';

export const RecentPurchasesTable: React.FC = () => {
  const [purchases, setPurchases] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const cached = typeof window !== 'undefined' ? localStorage.getItem('seavaig_purchases_cache') : null;
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) setPurchases(parsed.slice(0, 5));
        } catch {}
      }
      const db = await apiGetPurchases();
      if (Array.isArray(db)) {
        setPurchases(db.slice(0, 5));
      }
    }
    load();
  }, []);
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-extrabold text-slate-800">Recent Purchases</h3>
        <button className="text-blue-600 hover:text-blue-700 text-xs font-semibold hover:underline">
          View All
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100 pb-2">
              <th className="pb-2">ID</th>
              <th className="pb-2">Farmer Name</th>
              <th className="pb-2">Crop</th>
              <th className="pb-2">Weight</th>
              <th className="pb-2 text-right">Amount</th>
              <th className="pb-2 text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {purchases.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-2.5 font-bold text-blue-600">{row.id}</td>
                <td className="py-2.5 font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  {row.farmerName}
                </td>
                <td className="py-2.5 text-slate-500 font-normal">{row.crop}</td>
                <td className="py-2.5 text-slate-600 font-semibold">{row.weight}</td>
                <td className="py-2.5 text-right font-extrabold text-slate-900">₹{Number(String(row.amount || 0).replace(/[^0-9.-]+/g, '')).toLocaleString('en-IN')}</td>
                <td className="py-2.5 text-right text-slate-400 text-[11px]">{row.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
