"use client";

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useLanguage } from '@/context/LanguageContext';
import { apiGetInventory, apiGetPurchases, apiGetSales, apiGetAllFarmerMaterials, apiGetTraderPurchases, apiGetLocations, apiAddLocation, getTenantId } from '@/lib/api';
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
  const [roomFilter, setRoomFilter] = useState('ALL');

  const [materialPurchases, setMaterialPurchases] = useState<any[]>([]);
  const [materialIssues, setMaterialIssues] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  const defaultBatches: any[] = [];

  useEffect(() => {
    const tenantId = getTenantId();
    const cacheKey = tenantId ? `seavaig_inventory_cache_${tenantId}` : 'seavaig_inventory_cache';
    const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
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
      const [allPurchases, allSales, traderPurchases, farmerIssues, locs] = await Promise.all([
        apiGetPurchases(),
        apiGetSales(),
        apiGetTraderPurchases(),
        apiGetAllFarmerMaterials(),
        apiGetLocations(),
      ]);

      if (locs) {
        setLocations(locs);
      }

      if (traderPurchases && Array.isArray(traderPurchases)) {
        setMaterialPurchases(traderPurchases);
      }
      if (farmerIssues && Array.isArray(farmerIssues)) {
        setMaterialIssues(farmerIssues);
      }

      const stockMap: { [key: string]: { weight: number, quantity: number, valuation: number, rate: number, unit: string, room: string } } = {};
      
      allPurchases.forEach((p: any) => {
        const crop = p.crop || 'Strawberry';
        const room = p.storageLocation || 'Main Cold Room';
        const key = `${crop}|${room}`;
        
        const wtStr = String(p.weight || '0').replace(/[^0-9.-]+/g, '');
        const numericVal = parseFloat(wtStr) || 0;
        const amt = typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount).replace(/[^0-9.-]+/g, '')) || 0;
        const rateVal = numericVal > 0 ? amt / numericVal : 350;
        const isKg = String(p.weight || '').toUpperCase().includes('KG');

        if (!stockMap[key]) {
          stockMap[key] = { weight: 0, quantity: 0, valuation: 0, rate: rateVal, unit: isKg ? 'KG' : 'QTY', room };
        }
        
        if (isKg) {
          stockMap[key].weight += numericVal;
        } else {
          stockMap[key].quantity += numericVal;
        }
        stockMap[key].valuation += amt;
      });

      allSales.forEach((s: any) => {
        if (s.farmerBatches && Array.isArray(s.farmerBatches) && s.farmerBatches.length > 0) {
          const numBatches = s.farmerBatches.length;
          const wtPerBatch = (Number(s.totalWeight) || 0) / numBatches;
          s.farmerBatches.forEach((pid: string) => {
            const relatedPurchase = allPurchases.find((p: any) => p.id === pid);
            if (relatedPurchase) {
              const crop = relatedPurchase.crop || 'Strawberry';
              const room = relatedPurchase.storageLocation || 'Main Cold Room';
              const key = `${crop}|${room}`;
              if (stockMap[key]) {
                stockMap[key].weight = Math.max(0, stockMap[key].weight - wtPerBatch);
                stockMap[key].valuation = stockMap[key].weight * stockMap[key].rate;
              }
            }
          });
        } else {
          // Fallback parsing if farmerBatches is missing
          let crop = 'Strawberry';
          if (s.items && typeof s.items === 'string') {
            crop = s.items.split(' (')[0].trim();
          }
          if (!stockMap[crop]) crop = 'Strawberry';
          const wt = Number(s.totalWeight || 0);
          if (stockMap[crop]) {
            stockMap[crop].weight = Math.max(0, stockMap[crop].weight - wt);
            stockMap[crop].valuation = stockMap[crop].weight * stockMap[crop].rate;
          }
        }
      });

      const formatted = Object.keys(stockMap).map((key, i) => {
        const item = stockMap[key as any];
        const isKg = item.unit === 'KG';
        const cropName = key.split('|')[0];
        const roomName = (item as any).room || 'Main Cold Room';
        return {
          id: `STK-2026-${1000 + i}`,
          room: roomName,
          grade: cropName,
          weight: isKg ? `${item.weight.toLocaleString('en-IN')} KG` : `${item.quantity.toLocaleString('en-IN')} QTY`,
          rawWeight: item.weight,
          rawQuantity: item.quantity,
          temp: '2.4°C',
          humidity: '85%',
          valuation: `₹${Math.round(item.valuation).toLocaleString('en-IN')}`,
          status: (item.weight > 0 || item.quantity > 0) ? 'OPTIMAL' : 'OUT OF STOCK',
        };
      });

      setBatches(formatted);
      const tenantId = getTenantId();
      const cacheKey = tenantId ? `seavaig_inventory_cache_${tenantId}` : 'seavaig_inventory_cache';
      if (typeof window !== 'undefined') {
        localStorage.setItem(cacheKey, JSON.stringify(formatted));
      }
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
    const tenantId = getTenantId();
    const cacheKey = tenantId ? `seavaig_inventory_cache_${tenantId}` : 'seavaig_inventory_cache';
    if (typeof window !== 'undefined') {
      localStorage.setItem(cacheKey, JSON.stringify(updated));
    }
    setIsAddStockOpen(false);
  };

  const handleStockTransfer = (id: string) => {
    const updated = batches.map((b) =>
      b.id === id ? { ...b, room: b.room.includes('Transferred') ? b.room : `${b.room} (Transferred)` } : b
    );
    setBatches(updated);
    const tenantId = getTenantId();
    const cacheKey = tenantId ? `seavaig_inventory_cache_${tenantId}` : 'seavaig_inventory_cache';
    if (typeof window !== 'undefined') {
      localStorage.setItem(cacheKey, JSON.stringify(updated));
    }
    setTransferSuccess(true);
    setTimeout(() => setTransferSuccess(false), 3000);
  };

  const totalStockKgSum = batches.reduce((acc, b) => acc + (b.rawWeight || 0), 0);
  const totalStockQtySum = batches.reduce((acc, b) => acc + (b.rawQuantity || 0), 0);
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

    let matchRoom = true;
    if (roomFilter !== 'ALL') {
      matchRoom = (b.room || '') === roomFilter;
    }

    return matchSearch && matchGrade && matchRoom;
  });

  const materialSummaryItems = [
    {
      item: 'Packaging Crates (कॅरेट)',
      category: 'PACKAGING',
      purchasedQty: materialPurchases.filter(m => m.itemName?.includes('Crates') || m.itemName?.includes('कॅरेट') || m.itemName?.includes('Crate')).reduce((acc, m) => acc + (Number(m.quantity) || 0), 0),
      issuedQty: materialIssues.filter(m => m.itemName?.includes('Crates') || m.itemName?.includes('कॅरेट') || m.materialName?.includes('Crates') || m.materialName?.includes('कॅरेट') || m.materialName?.includes('Crate')).reduce((acc, m) => acc + (Number(m.quantity) || 0), 0),
      unit: 'QTY'
    },
    {
      item: 'Fertilizers & Nutrients',
      category: 'INPUTS',
      purchasedQty: materialPurchases.filter(m => m.itemName?.includes('Fertilizer') || m.itemName?.includes('खत')).reduce((acc, m) => acc + (Number(m.quantity) || 0), 0),
      issuedQty: materialIssues.filter(m => m.itemName?.includes('Fertilizer') || m.itemName?.includes('खत') || m.materialName?.includes('Fertilizer') || m.materialName?.includes('खत')).reduce((acc, m) => acc + (Number(m.quantity) || 0), 0),
      unit: 'Bags'
    },
    {
      item: 'Drip Irrigation Pipes',
      category: 'HARDWARE',
      purchasedQty: materialPurchases.filter(m => m.itemName?.includes('Pipe') || m.itemName?.includes('नळी')).reduce((acc, m) => acc + (Number(m.quantity) || 0), 0),
      issuedQty: materialIssues.filter(m => m.itemName?.includes('Pipe') || m.itemName?.includes('नळी') || m.materialName?.includes('Pipe') || m.materialName?.includes('नळी')).reduce((acc, m) => acc + (Number(m.quantity) || 0), 0),
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Boxes className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Stock by Weight (KG)</span>
                <h3 className="text-2xl font-black text-slate-900">{totalStockKgSum.toLocaleString('en-IN')} KG</h3>
                <span className="text-[10px] font-bold text-blue-600">Total KG Stock</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Stock by Units / Qty</span>
                <h3 className="text-2xl font-black text-slate-900">{totalStockQtySum.toLocaleString('en-IN')} Units</h3>
                <span className="text-[10px] font-bold text-emerald-600">Total Nag / Crates</span>
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
                <button
                  onClick={() => setActiveTab('LOCATIONS' as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    activeTab === 'LOCATIONS' as any ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  🏢 Storage Rooms / Locations
                </button>
              </div>

              {/* Custom Grade Selector Filter */}
              {activeTab === 'CROPS' && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Room:</span>
                  <select
                    value={roomFilter}
                    onChange={(e) => setRoomFilter(e.target.value)}
                    className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 focus:outline-none"
                  >
                    <option value="ALL">All Rooms</option>
                    {Array.from(new Set(batches.map(b => b.room))).filter(Boolean).map((room, idx) => (
                      <option key={idx} value={room as string}>{room as string}</option>
                    ))}
                  </select>

                  <span className="text-[10px] font-bold text-slate-400 uppercase ml-2">Grade:</span>
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
            ) : activeTab === 'MATERIALS' ? (
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
            ) : (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button 
                    onClick={() => {
                      const newLoc = prompt("Enter new Storage Room / Location name:");
                      if (newLoc && newLoc.trim()) {
                        apiAddLocation(newLoc.trim()).then(loc => {
                          setLocations([...locations, loc]);
                        });
                      }
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-500/20"
                  >
                    + Add New Location
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {locations.map((loc) => (
                    <div key={loc.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                        <Thermometer className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-900">{loc.name}</h4>
                        <span className="text-[10px] font-semibold text-slate-500">{loc.id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
