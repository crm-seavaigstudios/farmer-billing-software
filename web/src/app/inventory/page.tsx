"use client";

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useLanguage } from '@/context/LanguageContext';
import { apiGetInventory } from '@/lib/api';
import {
  Package,
  Thermometer,
  Boxes,
  TrendingUp,
  Search,
  Download,
  Plus,
  ChevronRight,
  ArrowRightLeft,
  CheckCircle
} from 'lucide-react';

export default function InventoryPage() {
  const { t, language } = useLanguage();
  const [batches, setBatches] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    totalStockKg: 0,
    totalStockValue: '₹0',
    capacityUtilization: '0%',
    spoilageRate: '0%',
    temperature: '2.4°C',
    gradesAStock: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [transferSuccess, setTransferSuccess] = useState(false);

  useEffect(() => {
    async function loadData() {
      const res = await apiGetInventory();
      if (res) {
        setMetrics({
          totalStockKg: res.totalStockKg || 0,
          totalStockValue: res.totalStockValue || '₹0',
          capacityUtilization: res.capacityUtilization || '0%',
          spoilageRate: res.spoilageRate || '0%',
          temperature: res.temperature || '2.4°C',
          gradesAStock: res.grades?.find((g: any) => g.grade.includes('A Grade') || g.grade.includes('A_GRADE'))?.stockKg || 0,
        });
        
        if (res.grades && Array.isArray(res.grades)) {
          setBatches(res.grades.map((g: any, i: number) => ({
            id: `STK-2026-${1000 + i}`,
            room: 'Cold Room #1 (Satpur)',
            grade: g.grade,
            weight: `${g.stockKg} KG`,
            temp: res.temperature,
            humidity: '85%',
            valuation: g.val || '₹0',
            status: g.status,
          })));
        }
      }
    }
    loadData();
  }, []);

  const handleStockTransfer = (id: string) => {
    setBatches((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, room: 'Cold Room #1 (Satpur - Transferred)' } : b
      )
    );
    setTransferSuccess(true);
    setTimeout(() => setTransferSuccess(false), 3000);
  };

  const filtered = batches.filter(
    (b) =>
      b.grade.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.room.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-slateCanvas font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header primaryButtonLabel="+ Stock Transfer" onPrimaryClick={() => handleStockTransfer('STK-2026-802')} />

        <main className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {language === 'mr' ? 'स्ट्रॉबेरी साठा आणि कोल्ड स्टोरेज (Inventory)' : 'Cold Storage Strawberry Inventory'}
              </h1>
              <p className="text-xs font-semibold text-slate-400 mt-1 flex items-center gap-1">
                <span>{t.dashboard}</span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="text-slate-600">{t.inventoryManagement}</span>
              </p>
            </div>

            {transferSuccess && (
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Stock Batch Transferred Successfully!
              </span>
            )}
          </div>

          {/* Metric Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Boxes className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Total Stock Weight</span>
                <h3 className="text-xl font-extrabold text-slate-900">{metrics.totalStockKg} KG</h3>
                <span className="text-[10px] font-bold text-blue-600">Across 3 Cold Rooms</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Thermometer className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Cold Room Temp</span>
                <h3 className="text-xl font-extrabold text-slate-900">{metrics.temperature}</h3>
                <span className="text-[10px] font-bold text-emerald-600">{metrics.capacityUtilization} Utilization</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Total Stock Valuation</span>
                <h3 className="text-xl font-extrabold text-slate-900">{metrics.totalStockValue}</h3>
                <span className="text-[10px] font-bold text-purple-600">Current Market Rate</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Grade A Stock</span>
                <h3 className="text-xl font-extrabold text-slate-900">{metrics.gradesAStock} KG</h3>
                <span className="text-[10px] font-bold text-amber-600">Export Quality Punnets</span>
              </div>
            </div>
          </div>

          {/* Batches Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle space-y-4">
            <div className="flex items-center justify-between">
              <div className="relative w-80">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search stock batch, grade, cold room..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-3">
                    <th className="py-3 px-3">BATCH ID</th>
                    <th className="py-3 px-3">COLD STORAGE ROOM</th>
                    <th className="py-3 px-3">STRAWBERRY GRADE</th>
                    <th className="py-3 px-3">STOCK WEIGHT</th>
                    <th className="py-3 px-3 text-center">TEMP & HUMIDITY</th>
                    <th className="py-3 px-3 text-right">VALUATION</th>
                    <th className="py-3 px-3 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-bold text-blue-600">{b.id}</td>
                      <td className="py-3 px-3 font-extrabold text-slate-900">{b.room}</td>
                      <td className="py-3 px-3 font-semibold text-slate-700">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-100">
                          {b.grade}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-800">{b.weight}</td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-200">
                          {b.temp} ({b.humidity})
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900">{b.valuation}</td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleStockTransfer(b.id)}
                          className="px-3 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 flex items-center gap-1 mx-auto cursor-pointer"
                        >
                          <ArrowRightLeft className="w-3 h-3 text-blue-600" />
                          <span>Transfer Batch</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
