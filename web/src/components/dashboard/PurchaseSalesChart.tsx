"use client";

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { Info } from 'lucide-react';

const data = [
  { date: '1 Aug', purchase: 0, sales: 0 },
  { date: '5 Aug', purchase: 0, sales: 0 },
  { date: '10 Aug', purchase: 0, sales: 0 },
  { date: '15 Aug', purchase: 0, sales: 0 },
  { date: '20 Aug', purchase: 0, sales: 0 },
  { date: '25 Aug', purchase: 0, sales: 0 },
  { date: '31 Aug', purchase: 0, sales: 0 },
];

export const PurchaseSalesChart: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle flex flex-col justify-between h-[340px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-extrabold text-slate-800">Purchase & Sales Overview</h3>
          <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-slate-600" />
        </div>
        <select className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-600 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20">
          <option>This Month</option>
          <option>Last Month</option>
          <option>This Year</option>
        </select>
      </div>

      {/* Recharts Dual Area / Line Chart */}
      <div className="w-full h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorPurchase" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0}/>
              </linearGradient>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v/1000}K`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
              formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, '']}
            />
            <Area type="monotone" dataKey="sales" name="Sales (₹)" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" dot={{ r: 4, fill: '#10b981' }} />
            <Area type="monotone" dataKey="purchase" name="Purchase (₹)" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPurchase)" dot={{ r: 4, fill: '#2563eb' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Custom Legend */}
      <div className="flex items-center gap-6 pt-2 border-t border-slate-100 text-xs font-semibold">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
          <span className="text-slate-600">Purchase (₹)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-slate-600">Sales (₹)</span>
        </div>
      </div>
    </div>
  );
};
