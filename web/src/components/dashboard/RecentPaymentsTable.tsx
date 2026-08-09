"use client";

import React from 'react';

const payments: any[] = [];

export const RecentPaymentsTable: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-extrabold text-slate-800">Recent Payments</h3>
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
              <th className="pb-2 text-right">Amount</th>
              <th className="pb-2 text-center">Mode</th>
              <th className="pb-2 text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-2.5 font-bold text-blue-600">{row.id}</td>
                <td className="py-2.5 font-semibold text-slate-800">{row.farmer}</td>
                <td className="py-2.5 text-right font-extrabold text-emerald-600">{row.amount}</td>
                <td className="py-2.5 text-center">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                    {row.mode}
                  </span>
                </td>
                <td className="py-2.5 text-right text-slate-400 text-[11px]">{row.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
