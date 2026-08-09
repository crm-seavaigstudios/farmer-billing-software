"use client";

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const data = [
  { name: 'Paid', value: 0, percentage: '0%', color: '#10b981' },
  { name: 'Partial', value: 0, percentage: '0%', color: '#f59e0b' },
  { name: 'Pending', value: 0, percentage: '0%', color: '#ef4444' },
];

export const PaymentStatusChart: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle flex flex-col justify-between h-[340px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-extrabold text-slate-800">Payment Status</h3>
        <select className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-600 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20">
          <option>This Month</option>
          <option>Last Month</option>
        </select>
      </div>

      {/* Donut Chart with Centered Total */}
      <div className="relative w-full h-44 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={75}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center overlay label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-base font-extrabold text-slate-900 leading-none">
            ₹0
          </span>
          <span className="text-[10px] font-medium text-slate-400 mt-1">
            Total Pending
          </span>
        </div>
      </div>

      {/* Legend list */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="font-semibold text-slate-700">{item.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-slate-900">₹{item.value.toLocaleString('en-IN')}</span>
              <span className="text-slate-400 font-medium text-[11px]">({item.percentage})</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
