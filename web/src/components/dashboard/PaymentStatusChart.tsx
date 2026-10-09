"use client";

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { apiGetPurchases, parseRecordAmount } from '@/lib/api';

export const PaymentStatusChart: React.FC = () => {
  const [chartData, setChartData] = React.useState<any[]>([]);
  const [totalPending, setTotalPending] = React.useState<number>(0);
  const [timeframe, setTimeframe] = React.useState<'THIS_MONTH' | 'LAST_MONTH' | 'ALL_TIME'>('THIS_MONTH');

  React.useEffect(() => {
    async function fetchData() {
      try {
        const purchases = await apiGetPurchases();

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const isMatch = (dateStr: string) => {
          if (!dateStr || timeframe === 'ALL_TIME') return true;
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return true;
          const y = d.getFullYear();
          const m = d.getMonth();

          if (timeframe === 'THIS_MONTH') return y === currentYear && m === currentMonth;
          if (timeframe === 'LAST_MONTH') {
            const lm = currentMonth === 0 ? 11 : currentMonth - 1;
            const ly = currentMonth === 0 ? currentYear - 1 : currentYear;
            return y === ly && m === lm;
          }
          return true;
        };

        const filtered = purchases.filter((p: any) => isMatch(p.date || p.purchaseDate || p.createdAt));
        
        let paid = 0, partial = 0, pending = 0, totalDueAmt = 0;
        const parseNum = (val: any) => parseFloat(String(val).replace(/[^0-9.-]+/g, '')) || 0;

        filtered.forEach((p: any) => {
          const amt = parseRecordAmount(p);
          const due = parseNum(p.dueAmount || p.rawDue);
          if (due === 0 && amt > 0) paid += amt;
          else if (due > 0 && due < amt) partial += amt;
          else pending += amt;
          totalDueAmt += due;
        });

        setTotalPending(totalDueAmt);
        const total = paid + partial + pending || 1; // avoid div by 0
        
        setChartData([
          { name: 'Paid', value: paid, percentage: `${Math.round((paid/total)*100)}%`, color: '#10b981' },
          { name: 'Partial', value: partial, percentage: `${Math.round((partial/total)*100)}%`, color: '#f59e0b' },
          { name: 'Pending', value: pending, percentage: `${Math.round((pending/total)*100)}%`, color: '#ef4444' },
        ]);
      } catch(e) {}
    }
    fetchData();
  }, [timeframe]);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle flex flex-col justify-between h-[340px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-extrabold text-slate-800">Payment Status</h3>
        <select 
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value as any)}
          className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-600 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
        >
          <option value="THIS_MONTH">This Month</option>
          <option value="LAST_MONTH">Last Month</option>
          <option value="ALL_TIME">All Time</option>
        </select>
      </div>

      {/* Donut Chart with Centered Total */}
      <div className="relative w-full h-44 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={75}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center overlay label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-base font-extrabold text-slate-900 leading-none">
            ₹{totalPending.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] font-medium text-slate-400 mt-1">
            Total Pending
          </span>
        </div>
      </div>

      {/* Legend list */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        {chartData.map((item, idx) => (
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
