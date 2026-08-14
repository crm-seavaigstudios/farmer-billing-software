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
  const [activeTab, setActiveTab] = useState<'CROPS' | 'MATERIALS'>('CROPS');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [timeFilter, setTimeFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const [materialPurchases, setMaterialPurchases] = useState<any[]>([]);
  const [materialIssues, setMaterialIssues] = useState<any[]>([]);

  const defaultBatches: any[] = [];

  useEffect(() => {
    const cached = typeof window !== 'undefined' ? localStorage.getItem('seavaig_inventory_cache') : null;
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBatches(parsed);
        } else {
          setBatches(defaultBatches);
        }
      } catch {
        setBatches(defaultBatches);
      }
    } else {
      setBatches(defaultBatches);
    }

    async function loadData() {
      const res: any = await apiGetInventory();
      if (res && !Array.isArray(res)) {
        setMetrics({
          totalStockKg: res.totalStockKg || 1200,
          totalStockValue: res.totalStockValue || '₹2,32,000',
          capacityUtilization: res.capacityUtilization || '68%',
          spoilageRate: res.spoilageRate || '0.8%',
          temperature: res.temperature || '2.4°C',
          gradesAStock: res.grades?.find((g: any) => g.grade?.includes('A Grade') || g.grade?.includes('A_GRADE'))?.stockKg || 300,
        });

        if (res.grades && Array.isArray(res.grades) && res.grades.length > 0) {
          const formatted = res.grades.map((g: any, i: number) => ({
            id: `STK-2026-${1000 + i}`,
            room: 'Cold Room #1 (Satpur)',
            grade: g.grade,
            weight: `${g.stockKg} KG`,
            temp: res.temperature,
            humidity: '85%',
            valuation: g.val || '₹0',
            status: g.status,
          }));
          setBatches(formatted);
          if (typeof window !== 'undefined') {
            localStorage.setItem('seavaig_inventory_cache', JSON.stringify(formatted));
          }
        }
      }
    }
      const cachedTraderPurchases = typeof window !== 'undefined' ? localStorage.getItem('seavaig_trader_purchases_cache') : null;
      if (cachedTraderPurchases) {
        try {
          const parsed = JSON.parse(cachedTraderPurchases);
          if (Array.isArray(parsed)) setMaterialPurchases(parsed);
        } catch {}
      }

      const cachedMaterialIssues = typeof window !== 'undefined' ? localStorage.getItem('seavaig_material_supplies_cache') : null;
      if (cachedMaterialIssues) {
        try {
          const parsed = JSON.parse(cachedMaterialIssues);
          if (Array.isArray(parsed)) setMaterialIssues(parsed);
        } catch {}
      }
    loadData();
  }, []);

  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [newGrade, setNewGrade] = useState('Strawberry (A Grade)');
  const [newRoom, setNewRoom] = useState('Cold Room #1 (Satpur)');
  const [newWeight, setNewWeight] = useState('200');
  const [newRate, setNewRate] = useState('300');

  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    const val = (Number(newWeight) || 0) * (Number(newRate) || 0);
    const newB = {
      id: `STK-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      room: newRoom,
      grade: newGrade,
      weight: `${newWeight} KG`,
      temp: '2.4°C',
      humidity: '85%',
      valuation: `₹${val.toLocaleString('en-IN')}`,
      status: 'OPTIMAL',
    };
    const updated = [newB, ...batches];
    setBatches(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('seavaig_inventory_cache', JSON.stringify(updated));
    }
    setIsAddStockOpen(false);
  };

  const handleStockTransfer = (id: string) => {
    const updated = batches.map((b) =>
      b.id === id ? { ...b, room: b.room.includes('Transferred') ? b.room : `${b.room} (Transferred)` } : b
    );
    setBatches(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('seavaig_inventory_cache', JSON.stringify(updated));
    }
    setTransferSuccess(true);
    setTimeout(() => setTransferSuccess(false), 3000);
  };

  const totalStockKgSum = batches.reduce((acc, b) => acc + (parseFloat(b.weight) || 0), 0);
  const totalValuationSum = batches.reduce((acc, b) => {
    const val = parseFloat(String(b.valuation).replace(/[^0-9.-]+/g, '')) || 0;
    return acc + val;
  }, 0);

  const filteredCrops = batches.filter((b) => {
    const matchSearch =
      (b.grade || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.room || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.id || '').toLowerCase().includes(searchQuery.toLowerCase());

    let matchGrade = true;
    if (gradeFilter !== 'ALL') {
      if (gradeFilter === 'A_GRADE') matchGrade = b.grade.toLowerCase().includes('a grade') || b.grade.toLowerCase().includes('a_grade');
      if (gradeFilter === 'B_GRADE') matchGrade = b.grade.toLowerCase().includes('b grade') || b.grade.toLowerCase().includes('b_grade');
      if (gradeFilter === 'C_GRADE') matchGrade = b.grade.toLowerCase().includes('c grade') || b.grade.toLowerCase().includes('c_grade');
    }

    return matchSearch && matchGrade;
  });

  const materialSummaryItems = [
    {
      item: 'Packaging Crates (कॅरेट)',
      category: 'PACKAGING',
      purchasedQty: materialPurchases.filter(m => m.itemName?.includes('Crates') || m.itemName?.includes('कॅरेट') || m.itemName?.includes('Crate')).reduce((acc, m) => acc + (Number(m.quantity) || 0), 0) + 1000,
      issuedQty: materialIssues.filter(m => m.itemName?.includes('Crates') || m.itemName?.includes('कॅरेट') || m.materialName?.includes('Crates') || m.materialName?.includes('कॅरेट') || m.materialName?.includes('Crate')).reduce((acc, m) => acc + (Number(m.quantity) || 0), 0) + 400,
      unit: 'QTY'
    },
    {
      item: 'Fertilizers & Nutrients',
      category: 'INPUTS',
      purchasedQty: materialPurchases.filter(m => m.itemName?.includes('Fertilizer') || m.itemName?.includes('खत')).reduce((acc, m) => acc + (Number(m.quantity) || 0), 0) + 150,
      issuedQty: materialIssues.filter(m => m.itemName?.includes('Fertilizer') || m.itemName?.includes('खत') || m.materialName?.includes('Fertilizer') || m.materialName?.includes('खत')).reduce((acc, m) => acc + (Number(m.quantity) || 0), 0) + 85,
      unit: 'Bags'
    },
    {
      item: 'Drip Irrigation Pipes',
      category: 'HARDWARE',
      purchasedQty: materialPurchases.filter(m => m.itemName?.includes('Pipe') || m.itemName?.includes('नळी')).reduce((acc, m) => acc + (Number(m.quantity) || 0), 0) + 50,
      issuedQty: materialIssues.filter(m => m.itemName?.includes('Pipe') || m.itemName?.includes('नळी') || m.materialName?.includes('Pipe') || m.materialName?.includes('नळी')).reduce((acc, m) => acc + (Number(m.quantity) || 0), 0) + 20,
      unit: 'Bundles'
    }
  ];

  const filteredMaterials = materialSummaryItems.filter(m => 
    m.item.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-slateCanvas font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header primaryButtonLabel="+ Stock Inflow" onPrimaryClick={() => setIsAddStockOpen(true)} />

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

          {/* Stock Inflow Modal */}
          {isAddStockOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                    <Boxes className="w-5 h-5 text-blue-600" />
                    Record Stock Inflow (कोल्ड स्टोरेज साठा)
                  </h3>
                  <button onClick={() => setIsAddStockOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>
                <form onSubmit={handleAddStock} className="space-y-3 text-xs">
                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">Crop / Variety Grade</label>
                    <input type="text" value={newGrade} onChange={(e) => setNewGrade(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold" required />
                  </div>
                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">Cold Room Storage Chamber</label>
                    <select value={newRoom} onChange={(e) => setNewRoom(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold">
                      <option value="Cold Room #1 (Satpur)">Cold Room #1 (Satpur)</option>
                      <option value="Cold Room #2 (Pimpalgaon)">Cold Room #2 (Pimpalgaon)</option>
                      <option value="Cold Room #3 (Yeola)">Cold Room #3 (Yeola)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-extrabold text-slate-700 block mb-1">Quantity (KG)</label>
                      <input type="number" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold" required />
                    </div>
                    <div>
                      <label className="font-extrabold text-slate-700 block mb-1">Est. Rate per KG (₹)</label>
                      <input type="number" value={newRate} onChange={(e) => setNewRate(e.target.value)} className="w-full p-2.5 bg-slate-50 border rounded-xl font-bold" required />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-3">
                    <button type="button" onClick={() => setIsAddStockOpen(false)} className="flex-1 py-2.5 bg-slate-100 font-bold rounded-xl text-slate-700">Cancel</button>
                    <button type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 font-extrabold text-white rounded-xl shadow-lg shadow-blue-600/20">Save Stock Inflow</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Metric Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Boxes className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Total Crop Stock Qty / Weight</span>
                <h3 className="text-2xl font-black text-slate-900">{totalStockKgSum.toLocaleString('en-IN')} KG</h3>
                <span className="text-[10px] font-bold text-blue-600">Active Storage Batches</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Total Inventory Asset Valuation</span>
                <h3 className="text-2xl font-black text-slate-900">₹{totalValuationSum.toLocaleString('en-IN')}</h3>
                <span className="text-[10px] font-bold text-purple-600">Calculated Market Value</span>
              </div>
            </div>
          </div>

          {/* Batches Table with Tab selector */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle space-y-4">
            
            {/* Tabs Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between border-b pb-3 gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('CROPS')}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    activeTab === 'CROPS' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  🍓 Crop Stock Inventory
                </button>
                <button
                  onClick={() => setActiveTab('MATERIALS')}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    activeTab === 'MATERIALS' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  📦 Input Materials Ledger
                </button>
              </div>

              {/* Custom Grade Selector Filter */}
              {activeTab === 'CROPS' && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Grade:</span>
                  <select
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value)}
                    className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 focus:outline-none"
                  >
                    <option value="ALL">All Grades</option>
                    <option value="A_GRADE">A Grade</option>
                    <option value="B_GRADE">B Grade</option>
                    <option value="C_GRADE">C Grade</option>
                  </select>
                </div>
              )}
            </div>

            {/* Search Bar */}
            <div className="flex items-center justify-between">
              <div className="relative w-80">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={activeTab === 'CROPS' ? "Search crop, batch or cold room..." : "Search packaging materials, crates..."}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            {activeTab === 'CROPS' ? (
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
                    {filteredCrops.map((b) => (
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
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-3">
                      <th className="py-3 px-3">MATERIAL ITEM</th>
                      <th className="py-3 px-3">CATEGORY</th>
                      <th className="py-3 px-3 text-center">TOTAL PROCUREMENT</th>
                      <th className="py-3 px-3 text-center">ISSUED TO FARMERS</th>
                      <th className="py-3 px-3 text-right">REMAINING IN-STOCK</th>
                      <th className="py-3 px-3 text-center">STOCK STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMaterials.map((m, idx) => {
                      const remaining = Math.max(0, m.purchasedQty - m.issuedQty);
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-extrabold text-slate-900">{m.item}</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-bold border border-slate-200">
                              {m.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-blue-600">{m.purchasedQty} {m.unit}</td>
                          <td className="py-3 px-3 text-center font-bold text-amber-600">{m.issuedQty} {m.unit}</td>
                          <td className="py-3 px-3 text-right font-black text-emerald-600">{remaining} {m.unit}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              remaining > 100 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                            }`}>
                              {remaining > 100 ? 'IN STOCK' : 'LOW STOCK'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
