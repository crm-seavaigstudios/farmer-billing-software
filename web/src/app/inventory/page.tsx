"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useLanguage } from '@/context/LanguageContext';
import { 
  apiGetInventory, 
  apiGetPurchases, 
  apiGetSales, 
  apiGetAllFarmerMaterials, 
  apiGetTraderPurchases, 
  apiGetLocations, 
  apiAddLocation, 
  apiDeleteLocation,
  apiGetMaterialItems, 
  getTenantId 
} from '@/lib/api';
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
  CheckCircle,
  Trash2,
  AlertTriangle,
  X,
  Building2,
  Sparkles,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';

export default function InventoryPage() {
  const { t, language } = useLanguage();
  const [batches, setBatches] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [transferSuccess, setTransferSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'CROPS' | 'MATERIALS' | 'LOCATIONS'>('CROPS');
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [roomFilter, setRoomFilter] = useState('ALL');

  const [materialPurchases, setMaterialPurchases] = useState<any[]>([]);
  const [materialIssues, setMaterialIssues] = useState<any[]>([]);
  const [materialCatalog, setMaterialCatalog] = useState<any[]>([]);
  const [materialAdjustments, setMaterialAdjustments] = useState<Record<string, number>>({});
  const [locations, setLocations] = useState<any[]>([]);

  // Modals state
  const [isAddStockOpen, setIsAddStockOpen] = useState(false);
  const [isAddLocationOpen, setIsAddLocationOpen] = useState(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [itemToClear, setItemToClear] = useState<any | null>(null);

  // New stock form
  const [newGrade, setNewGrade] = useState('Strawberry (A Grade)');
  const [newRoom, setNewRoom] = useState('Cold Room #1 (Satpur)');
  const [newWeight, setNewWeight] = useState('200');
  const [newRate, setNewRate] = useState('300');

  // New location form
  const [newLocationName, setNewLocationName] = useState('');
  const [newLocationCapacity, setNewLocationCapacity] = useState('10,000 KG');
  const [newLocationTemp, setNewLocationTemp] = useState('2.4°C');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    loadAllInventoryData();
  }, []);

  const loadAllInventoryData = async () => {
    const tenantId = getTenantId();
    const cacheKey = tenantId ? `seavaig_inventory_cache_${tenantId}` : 'seavaig_inventory_cache';
    const adjKey = tenantId ? `seavaig_material_adjustments_${tenantId}` : 'seavaig_material_adjustments';
    
    if (typeof window !== 'undefined') {
      try {
        const cachedAdj = localStorage.getItem(adjKey);
        if (cachedAdj) setMaterialAdjustments(JSON.parse(cachedAdj));
      } catch {}
    }

    const [allPurchases, allSales, traderPurchases, farmerIssues, locs, catalog] = await Promise.all([
      apiGetPurchases(),
      apiGetSales(),
      apiGetTraderPurchases(),
      apiGetAllFarmerMaterials(),
      apiGetLocations(),
      apiGetMaterialItems()
    ]);

    if (locs) setLocations(locs);
    if (catalog && Array.isArray(catalog)) setMaterialCatalog(catalog);
    if (traderPurchases && Array.isArray(traderPurchases)) setMaterialPurchases(traderPurchases);
    if (farmerIssues && Array.isArray(farmerIssues)) setMaterialIssues(farmerIssues);

    const stockMap: { [key: string]: { weight: number, quantity: number, valuation: number, rate: number, unit: string, room: string } } = {};
    
    allPurchases.forEach((p: any) => {
      const crop = p.crop || (p.items && p.items[0] && p.items[0].cropName) || 'Strawberry';
      const rawRoom = p.storageLocation || 'Main Cold Room';
      const cleanRoom = String(rawRoom).replace(/\s*\[(VISIBLE_TO_FARMER|HIDDEN_FROM_FARMER)\]/g, '').trim() || 'Main Cold Room';
      const key = `${crop}|${cleanRoom}`;
      
      const wtStr = String(p.weight || p.totalWeight || '0').replace(/[^0-9.-]+/g, '');
      const numericVal = parseFloat(wtStr) || 0;
      const amt = typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount || p.totalAmount).replace(/[^0-9.-]+/g, '')) || 0;
      const rateVal = numericVal > 0 ? amt / numericVal : 350;

      const rawUnit = String(p.unit || (p.items && p.items[0] && p.items[0].unit) || '').toUpperCase();
      const rawPkg = String(p.packagingCategory || p.category || (p.items && p.items[0] && p.items[0].packagingCategory) || '').toUpperCase();
      const rawWeightStr = String(p.weight || '').toUpperCase();

      const isQtyBased = 
        rawUnit === 'UNIT' || 
        rawUnit === 'QTY' || 
        rawUnit === 'NAG' || 
        rawPkg.includes('NAG') || 
        rawPkg.includes('QTY') || 
        rawPkg.includes('UNIT') ||
        String(p.packagingCategory || '').includes('नग') ||
        String(p.category || '').includes('नग') ||
        rawPkg.includes('CRATE') || 
        rawPkg.includes('BOX') || 
        rawPkg.includes('BUNDLE') || 
        rawWeightStr.includes('NAG') || 
        rawWeightStr.includes('QTY') || 
        rawWeightStr.includes('UNIT') ||
        String(p.weight || '').includes('नग');

      const isKg = !isQtyBased && (rawUnit === 'KG' || rawUnit === 'QUINTAL' || rawUnit === 'TON' || rawWeightStr.includes('KG'));

      if (!stockMap[key]) {
        stockMap[key] = { weight: 0, quantity: 0, valuation: 0, rate: rateVal, unit: isKg ? 'KG' : 'QTY', room: cleanRoom };
      }
      
      if (isKg) {
        stockMap[key].weight += numericVal;
      } else {
        stockMap[key].quantity += numericVal;
      }
      stockMap[key].valuation += amt;
    });

    allSales.forEach((s: any) => {
      const isSaleQty = 
        String(s.unit || s.packaging || s.items || '').toUpperCase().includes('NAG') || 
        String(s.unit || s.packaging || s.items || '').toUpperCase().includes('QTY') || 
        String(s.unit || s.packaging || s.items || '').toUpperCase().includes('UNIT') || 
        String(s.unit || s.packaging || s.items || '').includes('नग');

      if (s.farmerBatches && Array.isArray(s.farmerBatches) && s.farmerBatches.length > 0) {
        const numBatches = s.farmerBatches.length;
        const wtPerBatch = (Number(s.totalWeight) || 0) / numBatches;
        s.farmerBatches.forEach((pid: string) => {
          const relatedPurchase = allPurchases.find((p: any) => p.id === pid);
          if (relatedPurchase) {
            const crop = relatedPurchase.crop || (relatedPurchase.items && relatedPurchase.items[0] && relatedPurchase.items[0].cropName) || 'Strawberry';
            const rawRoom = relatedPurchase.storageLocation || 'Main Cold Room';
            const cleanRoom = String(rawRoom).replace(/\s*\[(VISIBLE_TO_FARMER|HIDDEN_FROM_FARMER)\]/g, '').trim() || 'Main Cold Room';
            const key = `${crop}|${cleanRoom}`;
            if (stockMap[key]) {
              if (isSaleQty) {
                stockMap[key].quantity = Math.max(0, stockMap[key].quantity - wtPerBatch);
              } else {
                stockMap[key].weight = Math.max(0, stockMap[key].weight - wtPerBatch);
              }
              stockMap[key].valuation = (stockMap[key].weight + stockMap[key].quantity) * stockMap[key].rate;
            }
          }
        });
      } else {
        let crop = 'Strawberry';
        if (s.items && typeof s.items === 'string') {
          crop = s.items.split(' (')[0].trim();
        }
        if (!stockMap[crop]) crop = 'Strawberry';
        const wt = Number(s.totalWeight || 0);
        if (stockMap[crop]) {
          if (isSaleQty) {
            stockMap[crop].quantity = Math.max(0, stockMap[crop].quantity - wt);
          } else {
            stockMap[crop].weight = Math.max(0, stockMap[crop].weight - wt);
          }
          stockMap[crop].valuation = (stockMap[crop].weight + stockMap[crop].quantity) * stockMap[crop].rate;
        }
      }
    });

    // Check if there are saved manual cleared overrides in cache
    let clearedBatches: Record<string, boolean> = {};
    if (typeof window !== 'undefined') {
      try {
        const clr = localStorage.getItem(`seavaig_cleared_batches_${tenantId}`);
        if (clr) clearedBatches = JSON.parse(clr);
      } catch {}
    }

    const formatted = Object.keys(stockMap).map((key, i) => {
      const item = stockMap[key as any];
      const cropName = key.split('|')[0];
      const roomName = (item as any).room || 'Main Cold Room';
      const isCleared = clearedBatches[key] === true;

      const finalWeight = isCleared ? 0 : item.weight;
      const finalQuantity = isCleared ? 0 : item.quantity;
      const finalValuation = isCleared ? 0 : Math.round(item.valuation);
      
      let displayWeight = '';
      if (finalWeight > 0 && finalQuantity > 0) {
        displayWeight = `${finalWeight.toLocaleString('en-IN')} KG + ${finalQuantity.toLocaleString('en-IN')} Qty (नग)`;
      } else if (finalWeight > 0) {
        displayWeight = `${finalWeight.toLocaleString('en-IN')} KG`;
      } else if (finalQuantity > 0) {
        displayWeight = `${finalQuantity.toLocaleString('en-IN')} Qty (नग)`;
      } else {
        displayWeight = '0 KG / 0 Qty';
      }

      return {
        id: `STK-2026-${1000 + i}`,
        batchKey: key,
        room: roomName,
        grade: cropName,
        weight: displayWeight,
        rawWeight: finalWeight,
        rawQuantity: finalQuantity,
        temp: '2.4°C',
        humidity: '85%',
        valuation: `₹${finalValuation.toLocaleString('en-IN')}`,
        status: (finalWeight > 0 || finalQuantity > 0) ? 'OPTIMAL' : 'OUT OF STOCK',
      };
    });

    setBatches(formatted);
    if (typeof window !== 'undefined') {
      localStorage.setItem(cacheKey, JSON.stringify(formatted));
    }
  };

  // ----------------------------------------------------
  // CLEAR STOCK HANDLERS
  // ----------------------------------------------------
  const handleClearSingleBatch = (batch: any) => {
    const tenantId = getTenantId();
    let clearedBatches: Record<string, boolean> = {};
    const clrKey = `seavaig_cleared_batches_${tenantId}`;
    try {
      const clr = localStorage.getItem(clrKey);
      if (clr) clearedBatches = JSON.parse(clr);
    } catch {}
    
    clearedBatches[batch.batchKey || `${batch.grade}|${batch.room}`] = true;
    localStorage.setItem(clrKey, JSON.stringify(clearedBatches));

    const updated = batches.map((b) => {
      if (b.id === batch.id || b.batchKey === batch.batchKey) {
        return {
          ...b,
          weight: '0 KG',
          rawWeight: 0,
          rawQuantity: 0,
          valuation: '₹0',
          status: 'OUT OF STOCK',
        };
      }
      return b;
    });

    setBatches(updated);
    const cacheKey = tenantId ? `seavaig_inventory_cache_${tenantId}` : 'seavaig_inventory_cache';
    localStorage.setItem(cacheKey, JSON.stringify(updated));
    showToast(`Stock for ${batch.grade} (${batch.room}) forcefully cleared to 0!`);
    setItemToClear(null);
  };

  const handleClearMaterialStock = (itemName: string) => {
    const tenantId = getTenantId();
    const adjKey = tenantId ? `seavaig_material_adjustments_${tenantId}` : 'seavaig_material_adjustments';
    
    const key = itemName.trim().toLowerCase();
    const updatedAdj = { ...materialAdjustments, [key]: 0 };
    setMaterialAdjustments(updatedAdj);
    localStorage.setItem(adjKey, JSON.stringify(updatedAdj));
    showToast(`Inventory for "${itemName}" forcefully cleared to 0 in-stock!`);
  };

  const handleClearLocationStock = (roomName: string) => {
    const tenantId = getTenantId();
    let clearedBatches: Record<string, boolean> = {};
    const clrKey = `seavaig_cleared_batches_${tenantId}`;
    try {
      const clr = localStorage.getItem(clrKey);
      if (clr) clearedBatches = JSON.parse(clr);
    } catch {}

    batches.forEach((b) => {
      if (b.room === roomName) {
        clearedBatches[b.batchKey || `${b.grade}|${b.room}`] = true;
      }
    });
    localStorage.setItem(clrKey, JSON.stringify(clearedBatches));

    const updated = batches.map((b) => {
      if (b.room === roomName) {
        return {
          ...b,
          weight: '0 KG',
          rawWeight: 0,
          rawQuantity: 0,
          valuation: '₹0',
          status: 'OUT OF STOCK',
        };
      }
      return b;
    });

    setBatches(updated);
    const cacheKey = tenantId ? `seavaig_inventory_cache_${tenantId}` : 'seavaig_inventory_cache';
    localStorage.setItem(cacheKey, JSON.stringify(updated));
    showToast(`All crop produce batches inside "${roomName}" forcefully cleared!`);
  };

  const handleClearAllInventory = () => {
    const tenantId = getTenantId();
    
    // 1. Clear all crop batches
    let clearedBatches: Record<string, boolean> = {};
    batches.forEach((b) => {
      clearedBatches[b.batchKey || `${b.grade}|${b.room}`] = true;
    });
    localStorage.setItem(`seavaig_cleared_batches_${tenantId}`, JSON.stringify(clearedBatches));

    const updatedBatches = batches.map((b) => ({
      ...b,
      weight: '0 KG',
      rawWeight: 0,
      rawQuantity: 0,
      valuation: '₹0',
      status: 'OUT OF STOCK',
    }));
    setBatches(updatedBatches);
    localStorage.setItem(`seavaig_inventory_cache_${tenantId}`, JSON.stringify(updatedBatches));

    // 2. Clear all materials
    const newAdj: Record<string, number> = {};
    materialSummaryItems.forEach((m) => {
      newAdj[m.item.trim().toLowerCase()] = 0;
    });
    setMaterialAdjustments(newAdj);
    localStorage.setItem(`seavaig_material_adjustments_${tenantId}`, JSON.stringify(newAdj));

    setIsClearAllModalOpen(false);
    showToast('All crop stocks and input materials inventory forcefully cleared to 0!');
  };

  // ----------------------------------------------------
  // ADD STOCK & LOCATION
  // ----------------------------------------------------
  const handleAddStock = (e: React.FormEvent) => {
    e.preventDefault();
    const val = (Number(newWeight) || 0) * (Number(newRate) || 0);
    const newB = {
      id: `STK-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      batchKey: `${newGrade}|${newRoom}`,
      room: newRoom,
      grade: newGrade,
      weight: `${newWeight} KG`,
      rawWeight: Number(newWeight) || 0,
      rawQuantity: 0,
      temp: '2.4°C',
      humidity: '85%',
      valuation: `₹${val.toLocaleString('en-IN')}`,
      status: 'OPTIMAL',
    };

    // Remove from cleared overrides if present
    const tenantId = getTenantId();
    const clrKey = `seavaig_cleared_batches_${tenantId}`;
    try {
      const clr = localStorage.getItem(clrKey);
      if (clr) {
        const parsed = JSON.parse(clr);
        delete parsed[newB.batchKey];
        localStorage.setItem(clrKey, JSON.stringify(parsed));
      }
    } catch {}

    const updated = [newB, ...batches];
    setBatches(updated);
    const cacheKey = tenantId ? `seavaig_inventory_cache_${tenantId}` : 'seavaig_inventory_cache';
    localStorage.setItem(cacheKey, JSON.stringify(updated));
    setIsAddStockOpen(false);
    showToast('New stock batch added successfully!');
  };

  const handleAddStorageRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName.trim()) return;

    const loc = await apiAddLocation(newLocationName.trim());
    setLocations((prev) => [...prev, loc]);
    setIsAddLocationOpen(false);
    setNewLocationName('');
    showToast(`Storage Chamber "${loc.name}" added successfully!`);
  };

  const handleDeleteLocation = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove storage room "${name}"?`)) return;
    const updated = await apiDeleteLocation(id);
    if (updated) setLocations(updated);
    showToast(`Storage Room "${name}" removed.`);
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

  // Metrics
  const totalStockKgSum = batches.reduce((acc, b) => acc + (b.rawWeight || 0), 0);
  const totalStockQtySum = batches.reduce((acc, b) => acc + (b.rawQuantity || 0), 0);
  const totalValuationSum = batches.reduce((acc, b) => {
    const val = parseFloat(String(b.valuation).replace(/[^0-9.-]+/g, '')) || 0;
    return acc + val;
  }, 0);

  // Filters
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

  // Dynamic Input Materials Aggregation with Forceful Clear overrides
  const materialSummaryItems = useMemo(() => {
    const itemMap = new Map<string, {
      item: string;
      category: string;
      purchasedQty: number;
      issuedQty: number;
      unit: string;
    }>();

    materialCatalog.forEach((cat: any) => {
      const name = cat.name || cat.itemName;
      if (!name) return;
      const key = name.trim().toLowerCase();
      if (!itemMap.has(key)) {
        itemMap.set(key, {
          item: name.trim(),
          category: cat.category || 'INPUTS',
          purchasedQty: 0,
          issuedQty: 0,
          unit: cat.unit || 'QTY'
        });
      }
    });

    materialPurchases.forEach((p: any) => {
      const rawName = p.itemName || p.item || p.name || 'General Material';
      const name = rawName.trim();
      const key = name.toLowerCase();
      const qty = parseFloat(String(p.quantity || p.qty || '0').replace(/[^0-9.-]+/g, '')) || 0;
      const unit = p.unit || (name.toLowerCase().includes('crate') ? 'QTY' : (name.toLowerCase().includes('bag') ? 'Bags' : (name.toLowerCase().includes('kg') ? 'KG' : 'QTY')));
      const cat = p.category || (name.toLowerCase().includes('crate') || name.toLowerCase().includes('box') || name.toLowerCase().includes('paper') ? 'PACKAGING' : (name.toLowerCase().includes('seed') || name.toLowerCase().includes('fertilizer') ? 'INPUTS' : (name.toLowerCase().includes('pipe') ? 'HARDWARE' : 'GENERAL')));

      if (!itemMap.has(key)) {
        itemMap.set(key, { item: name, category: cat, purchasedQty: 0, issuedQty: 0, unit });
      }
      const rec = itemMap.get(key)!;
      rec.purchasedQty += qty;
      if (p.unit && rec.unit === 'QTY') rec.unit = p.unit;
    });

    materialIssues.forEach((issue: any) => {
      const rawName = issue.itemName || issue.materialName || issue.name || 'General Material';
      const name = rawName.trim();
      const key = name.toLowerCase();
      const qty = parseFloat(String(issue.quantity || issue.qty || '0').replace(/[^0-9.-]+/g, '')) || 0;
      const unit = issue.unit || 'QTY';
      const cat = issue.category || (name.toLowerCase().includes('crate') || name.toLowerCase().includes('box') || name.toLowerCase().includes('paper') ? 'PACKAGING' : (name.toLowerCase().includes('seed') || name.toLowerCase().includes('fertilizer') ? 'INPUTS' : 'GENERAL'));

      if (!itemMap.has(key)) {
        itemMap.set(key, { item: name, category: cat, purchasedQty: 0, issuedQty: 0, unit });
      }
      const rec = itemMap.get(key)!;
      rec.issuedQty += qty;
    });

    if (itemMap.size === 0) {
      return [
        { item: 'Packaging Crates (कॅरेट)', category: 'PACKAGING', purchasedQty: 0, issuedQty: 0, unit: 'QTY' },
        { item: 'Packing Paper & Punnets (कागद / डबे)', category: 'PACKAGING', purchasedQty: 0, issuedQty: 0, unit: 'Boxes' },
        { item: 'Seeds & Saplings (बियाणे / रोपे)', category: 'INPUTS', purchasedQty: 0, issuedQty: 0, unit: 'Packs' },
        { item: 'Fertilizers & Nutrients (खते)', category: 'INPUTS', purchasedQty: 0, issuedQty: 0, unit: 'Bags' },
        { item: 'Drip Irrigation Pipes (नळी)', category: 'HARDWARE', purchasedQty: 0, issuedQty: 0, unit: 'Bundles' }
      ];
    }

    return Array.from(itemMap.values()).map((m) => {
      const key = m.item.trim().toLowerCase();
      if (materialAdjustments[key] !== undefined) {
        return {
          ...m,
          issuedQty: m.purchasedQty, // Equalize to force remaining to 0
        };
      }
      return m;
    });
  }, [materialCatalog, materialPurchases, materialIssues, materialAdjustments]);

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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>🍓</span>
                <span>{language === 'mr' ? 'स्ट्रॉबेरी साठा आणि कोल्ड स्टोरेज (Inventory)' : 'Cold Storage & Crop Inventory'}</span>
              </h1>
              <p className="text-xs font-semibold text-slate-400 mt-1 flex items-center gap-1">
                <span>{t.dashboard}</span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="text-slate-600">{t.inventoryManagement}</span>
              </p>
            </div>

            {/* Global Actions */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={() => setIsClearAllModalOpen(true)}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                title="Forcefully clear all inventory to 0"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
                <span>Clear All Inventory (सर्व साठा साफ करा)</span>
              </button>

              <button
                onClick={() => setIsAddStockOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Stock Inflow</span>
              </button>
            </div>
          </div>

          {/* Toast Notification */}
          {toastMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {transferSuccess && (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Stock Batch Transferred Successfully!
            </span>
          )}

          {/* Metric Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
                <Boxes className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Stock by Weight (KG)</span>
                <h3 className="text-2xl font-black text-slate-900">{totalStockKgSum.toLocaleString('en-IN')} KG</h3>
                <span className="text-[10px] font-bold text-blue-600">Total KG Stock (वजन साठा)</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-2xs">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block mb-0.5">Stock by Units / Qty (नग)</span>
                <h3 className="text-2xl font-black text-slate-900">{totalStockQtySum.toLocaleString('en-IN')} Qty (नग)</h3>
                <span className="text-[10px] font-bold text-emerald-600">Total Nag / Units Stock (नग / संख्या)</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-2xs">
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
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setActiveTab('CROPS')}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    activeTab === 'CROPS' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  🍓 Crop Stock Inventory ({batches.length})
                </button>
                <button
                  onClick={() => setActiveTab('MATERIALS')}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    activeTab === 'MATERIALS' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  📦 Input Materials Ledger ({materialSummaryItems.length})
                </button>
                <button
                  onClick={() => setActiveTab('LOCATIONS')}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    activeTab === 'LOCATIONS' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  🏢 Storage Rooms / Locations ({locations.length})
                </button>
              </div>

              {/* Custom Grade Selector Filter */}
              {activeTab === 'CROPS' && (
                <div className="flex items-center gap-2 flex-wrap">
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
                  placeholder={
                    activeTab === 'CROPS' 
                      ? "Search crop, batch or cold room..." 
                      : activeTab === 'MATERIALS'
                      ? "Search packaging materials, crates..."
                      : "Search storage rooms..."
                  }
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {activeTab === 'LOCATIONS' && (
                <button
                  onClick={() => setIsAddLocationOpen(true)}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Storage Room</span>
                </button>
              )}
            </div>

            {/* TAB 1: CROPS */}
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
                      <th className="py-3 px-3 text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCrops.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 font-semibold text-xs">
                          No crop inventory batches found. Click "+ Stock Inflow" to add.
                        </td>
                      </tr>
                    ) : (
                      filteredCrops.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-bold text-blue-600">{b.id}</td>
                          <td className="py-3 px-3 font-extrabold text-slate-900">{b.room}</td>
                          <td className="py-3 px-3 font-semibold text-slate-700">
                            <span className="px-2 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-100 font-bold">
                              {b.grade}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-black text-slate-800">
                            {b.rawWeight === 0 && b.rawQuantity === 0 ? (
                              <span className="text-slate-400 italic">0 KG (Cleared)</span>
                            ) : (
                              b.weight
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-200">
                              {b.temp} ({b.humidity})
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-black text-slate-900">{b.valuation}</td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleStockTransfer(b.id)}
                                className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 flex items-center gap-1 cursor-pointer"
                                title="Transfer Batch Room"
                              >
                                <ArrowRightLeft className="w-3 h-3 text-blue-600" />
                                <span>Transfer</span>
                              </button>

                              <button
                                onClick={() => setItemToClear(b)}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                                title="Forcefully Clear Row Stock"
                              >
                                <Trash2 className="w-3 h-3 text-rose-600" />
                                <span>Clear Stock</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            ) : activeTab === 'MATERIALS' ? (
              /* TAB 2: INPUT MATERIALS */
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
                      <th className="py-3 px-3 text-right">ACTIONS</th>
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
                          <td className="py-3 px-3 text-right font-black text-emerald-600">
                            {remaining === 0 ? <span className="text-slate-400 italic">0 {m.unit}</span> : `${remaining} ${m.unit}`}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                              remaining > 100 
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                : remaining > 0
                                ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                : 'bg-slate-100 text-slate-500 border border-slate-200'
                            }`}>
                              {remaining > 100 ? 'IN STOCK' : remaining > 0 ? 'LOW STOCK' : 'CLEARED'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleClearMaterialStock(m.item)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                              title="Forcefully clear in-stock balance for this material"
                            >
                              <Trash2 className="w-3 h-3 text-rose-600" />
                              <span>Reset Stock</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* TAB 3: STORAGE ROOMS (CLEAN UI - NO RAW CODES) */
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {locations.map((loc) => {
                    const roomBatches = batches.filter((b) => b.room === loc.name && (b.rawWeight > 0 || b.rawQuantity > 0));
                    const totalStoredKg = roomBatches.reduce((sum, b) => sum + (b.rawWeight || 0), 0);

                    return (
                      <div 
                        key={loc.id} 
                        className="p-5 bg-gradient-to-br from-slate-50 to-blue-50/20 border border-slate-200/80 rounded-2xl space-y-3.5 shadow-xs"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                              <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-extrabold text-slate-900">{loc.name}</h4>
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 inline-block mt-0.5">
                                🟢 सक्रिय दालन • Active Cold Room
                              </span>
                            </div>
                          </div>

                          <span className="text-[11px] font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200/60">
                            2.4°C
                          </span>
                        </div>

                        {/* Room stats */}
                        <div className="p-3 bg-white border border-slate-200/60 rounded-xl space-y-1 text-xs">
                          <div className="flex justify-between font-bold text-slate-600">
                            <span>Current Stored Stock:</span>
                            <span className="text-slate-900 font-black">{totalStoredKg.toLocaleString('en-IN')} KG</span>
                          </div>
                          <div className="flex justify-between font-semibold text-slate-500 text-[11px]">
                            <span>Active Batches:</span>
                            <span>{roomBatches.length} Batches</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between gap-2 pt-1">
                          <button
                            onClick={() => handleClearLocationStock(loc.name)}
                            className="flex-1 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                            title="Clear all batches stored in this chamber"
                          >
                            <Trash2 className="w-3 h-3 text-amber-700" />
                            <span>Vacate Stock</span>
                          </button>

                          <button
                            onClick={() => handleDeleteLocation(loc.id, loc.name)}
                            className="p-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                            title="Delete this Storage Room"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* MODAL 1: ADD STOCK INFLOW */}
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
                  {locations.length > 0 ? (
                    locations.map((loc) => (
                      <option key={loc.id} value={loc.name}>{loc.name}</option>
                    ))
                  ) : (
                    <>
                      <option value="Cold Room #1 (Satpur)">Cold Room #1 (Satpur)</option>
                      <option value="Cold Room #2 (Pimpalgaon)">Cold Room #2 (Pimpalgaon)</option>
                      <option value="Cold Room #3 (Yeola)">Cold Room #3 (Yeola)</option>
                    </>
                  )}
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

      {/* MODAL 2: ADD STORAGE ROOM (REPLACES PROMPT) */}
      {isAddLocationOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Add New Storage Chamber (नवीन कोल्ड स्टोरेज दालन)
              </h3>
              <button onClick={() => setIsAddLocationOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleAddStorageRoom} className="space-y-3.5 text-xs">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Storage Chamber Name *</label>
                <input 
                  type="text" 
                  placeholder="उदा. Cold Room #4 (Dindori), Warehouse A"
                  value={newLocationName} 
                  onChange={(e) => setNewLocationName(e.target.value)} 
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20" 
                  required 
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Total Capacity</label>
                  <input 
                    type="text" 
                    value={newLocationCapacity} 
                    onChange={(e) => setNewLocationCapacity(e.target.value)} 
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold" 
                  />
                </div>
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Optimal Temp</label>
                  <input 
                    type="text" 
                    value={newLocationTemp} 
                    onChange={(e) => setNewLocationTemp(e.target.value)} 
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold" 
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-3">
                <button 
                  type="button" 
                  onClick={() => setIsAddLocationOpen(false)} 
                  className="flex-1 py-2.5 bg-slate-100 font-bold rounded-xl text-slate-700"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 font-extrabold text-white rounded-xl shadow-lg shadow-blue-600/20"
                >
                  Create Chamber
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CONFIRM CLEAR SINGLE ROW STOCK */}
      {itemToClear && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-black text-slate-900">Force Clear Batch Stock?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to forcefully clear <b>{itemToClear.grade}</b> in <b>{itemToClear.room}</b> to 0 KG?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button 
                type="button" 
                onClick={() => setItemToClear(null)} 
                className="flex-1 py-2.5 bg-slate-100 font-bold rounded-xl text-xs text-slate-700"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={() => handleClearSingleBatch(itemToClear)} 
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 font-extrabold text-white rounded-xl text-xs shadow-lg shadow-rose-600/20"
              >
                Yes, Clear to 0
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CONFIRM CLEAR ALL INVENTORY */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-black text-slate-900">Clear All Inventory (सर्व साठा साफ करा)?</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                This will forcefully zero out all Crop produce weights across all cold rooms and reset remaining input material ledger balances.
              </p>
            </div>
            <div className="flex gap-2 pt-3">
              <button 
                type="button" 
                onClick={() => setIsClearAllModalOpen(false)} 
                className="flex-1 py-2.5 bg-slate-100 font-bold rounded-xl text-xs text-slate-700"
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleClearAllInventory} 
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 font-extrabold text-white rounded-xl text-xs shadow-lg shadow-rose-600/20"
              >
                Force Clear All Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
