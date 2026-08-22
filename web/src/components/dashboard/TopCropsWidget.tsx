"use client";

import React from 'react';

import { apiGetPurchases } from '@/lib/api';

export const TopCropsWidget: React.FC = () => {
  const [cropsData, setCropsData] = React.useState<any[]>([]);

  React.useEffect(() => {
    async function fetchData() {
      try {
        const purchases = await apiGetPurchases();
        
        const cropMap: Record<string, { weight: number, value: number }> = {};
        const parseNum = (val: any) => parseFloat(String(val).replace(/[^0-9.-]+/g, '')) || 0;
        
        purchases.forEach((p: any) => {
          (p.items || []).forEach((item: any) => {
             const c = item.cropName || 'Unknown';
             if (!cropMap[c]) cropMap[c] = { weight: 0, value: 0 };
             cropMap[c].weight += parseNum(item.weightKg);
             cropMap[c].value += parseNum(item.totalAmount);
          });
        });
        
        const arr = Object.keys(cropMap).map(k => ({
          name: k,
          weight: cropMap[k].weight,
          value: cropMap[k].value,
          trend: '+0%', // static
          image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?q=80&w=100&auto=format&fit=crop'
        }));
        
        arr.sort((a, b) => b.weight - a.weight);
        setCropsData(arr.slice(0, 5));
      } catch(e) {}
    }
    fetchData();
  }, []);
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle flex flex-col justify-between h-[340px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-extrabold text-slate-800">Top Crops <span className="text-slate-400 font-normal">(By Purchase)</span></h3>
        <select className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-600 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/20">
          <option>This Month</option>
          <option>Last Month</option>
        </select>
      </div>

      <div className="space-y-3.5 divide-y divide-slate-100">
        {cropsData.map((crop, idx) => (
          <div key={crop.name} className={`flex items-center justify-between ${idx > 0 ? 'pt-3.5' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-red-50 flex items-center justify-center border border-red-100 flex-shrink-0">
                <img
                  src={crop.image}
                  alt={crop.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <span className="text-sm font-extrabold text-red-500">🍓</span>
              </div>
              <div className="flex flex-col">
                <h4 className="text-xs font-bold text-slate-800">{crop.name}</h4>
                <p className="text-[11px] font-medium text-slate-400">Total volume purchased</p>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-xs font-black text-slate-900">{crop.weight.toLocaleString('en-IN')} KG</span>
              <span className="text-[10px] font-bold text-emerald-600">₹{crop.value.toLocaleString('en-IN')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
