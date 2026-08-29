"use client";

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { AddPurchaseModal } from '@/components/purchases/AddPurchaseModal';
import { EditPurchaseModal } from '@/components/purchases/EditPurchaseModal';
import { AddPaymentModal } from '@/components/payments/AddPaymentModal';
import { PrintReceiptModal, ReceiptData } from '@/components/common/PrintReceiptModal';
import { FinancialSummaryBar, TimelineFilter } from '@/components/common/FinancialSummaryBar';
import { FarmerCategoryModal } from '@/components/farmers/FarmerCategoryModal';
import { useLanguage } from '@/context/LanguageContext';
import { apiGetPurchases, apiUpdatePurchase, apiCreatePayment, apiUpdateFarmerBalance, getTenantId } from '@/lib/api';

const parseDateRobust = (dateStr: string): Date => {
  if (!dateStr) return new Date(0);
  let d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      if (!isNaN(d.getTime())) return d;
    }
  }
  
  const months: { [key: string]: number } = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };
  const cleaned = dateStr.replace(/\s+/g, ' ').trim();
  const parts = cleaned.split(' ');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const monthStr = parts[1].toLowerCase().substring(0, 3);
    const year = parseInt(parts[2], 10);
    if (months[monthStr] !== undefined && !isNaN(day) && !isNaN(year)) {
      d = new Date(year, months[monthStr], day);
      if (!isNaN(d.getTime())) return d;
    }
  }
  
  return new Date(dateStr);
};
import {
  ShoppingBag,
  Scale,
  TrendingUp,
  Users,
  Search,
  Download,
  Filter,
  Printer,
  Database,
  DollarSign,
  Inbox,
  Edit3,
  Clock,
  History
} from 'lucide-react';

export default function PurchasesPage() {
  const { t } = useLanguage();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyBill, setHistoryBill] = useState<any>(null);
  const [billPayments, setBillPayments] = useState<any[]>([]);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLiveSynced, setIsLiveSynced] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBillToEdit, setSelectedBillToEdit] = useState<any>(null);

  const handleEditPurchase = async (updatedBill: any) => {
    const oldBill = purchases.find((p) => p.id === updatedBill.id);
    if (!oldBill) return;

    const oldAmount = Number(oldBill.amount || 0);
    const oldDue = Number(oldBill.dueAmount || 0);
    const newAmount = parseFloat(String(updatedBill.amount).replace(/[^0-9.-]+/g, '')) || 0;
    const newDue = parseFloat(String(updatedBill.dueAmount).replace(/[^0-9.-]+/g, '')) || 0;

    const diffPaid = (newAmount - newDue) - (oldAmount - oldDue);
    const diffDue = newDue - oldDue;

    const parsedBill = {
      ...updatedBill,
      amount: newAmount,
      dueAmount: newDue,
    };

    // 1. Call apiUpdatePurchase to save to Supabase
    await apiUpdatePurchase(updatedBill.id, {
      crop: parsedBill.crop,
      weight: parsedBill.weight,
      rate: parsedBill.rate,
      amount: parsedBill.amount,
      dueAmount: parsedBill.dueAmount,
      paymentStatus: parsedBill.paymentStatus,
    });

    // 2. Call apiUpdateFarmerBalance to adjust farmer totals in Supabase/Cache
    if (parsedBill.farmerId) {
      await apiUpdateFarmerBalance(parsedBill.farmerId, diffPaid, diffDue);
    }

    // 3. Update React state
    const updated = purchases.map((p) => (p.id === updatedBill.id ? parsedBill : p));
    setPurchases(updated);
  };

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryModalTitle, setCategoryModalTitle] = useState('');
  const [categoryType, setCategoryType] = useState<'ADVANCE' | 'PAID' | 'UNPAID' | 'OUTSTANDING'>('PAID');
  const [categoryModalFarmers, setCategoryModalFarmers] = useState<any[]>([]);

  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>('MONTH');
  const [customStartDate, setCustomStartDate] = useState<string | undefined>();
  const [customEndDate, setCustomEndDate] = useState<string | undefined>();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const search = params.get('search');
      if (search) setSearchQuery(search);
    }

    const tenantId = getTenantId();
    const cacheKey = tenantId ? `seavaig_purchases_cache_${tenantId}` : 'seavaig_purchases_cache';
    const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.map((p: any) => {
            const cleanAmt = typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount || 0).replace(/[^0-9.-]+/g, '')) || 0;
            const cleanDue = typeof p.dueAmount === 'number' ? p.dueAmount : parseFloat(String(p.dueAmount || 0).replace(/[^0-9.-]+/g, '')) || 0;
            return {
              ...p,
              amount: cleanAmt,
              dueAmount: cleanDue,
            };
          });
          setPurchases(cleaned);
        }
      } catch {}
    }

    async function loadData() {
      const dbPurchases = await apiGetPurchases();
      if (dbPurchases && Array.isArray(dbPurchases) && dbPurchases.length > 0) {
        setPurchases(dbPurchases);
        setIsLiveSynced(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem(cacheKey, JSON.stringify(dbPurchases));
        }
      }
    }
    loadData();

    const handleUpdate = () => {
      const tenantId = getTenantId();
      const cached = localStorage.getItem(tenantId ? `seavaig_purchases_cache_${tenantId}` : 'seavaig_purchases_cache');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) setPurchases(parsed);
        } catch {}
      }
    };
    window.addEventListener('purchases_changed', handleUpdate);
    return () => window.removeEventListener('purchases_changed', handleUpdate);
  }, []);

  const handleAddPurchase = (newPurchase: any) => {
    const updated = [newPurchase, ...purchases];
    setPurchases(updated);
    const tenantId = getTenantId();
    const cacheKey = tenantId ? `seavaig_purchases_cache_${tenantId}` : 'seavaig_purchases_cache';
    if (typeof window !== 'undefined') {
      localStorage.setItem(cacheKey, JSON.stringify(updated));
    }
  };

  const handleViewHistory = async (e: React.MouseEvent, row: any) => {
    e.stopPropagation();
    setHistoryBill(row);
    
    // Fetch complete transaction history for this farmer
    const { apiGetPayments, apiGetPurchases, apiGetFarmerMaterials } = await import('@/lib/api');
    const [allPayments, allPurchases, allMaterials] = await Promise.all([
      apiGetPayments(),
      apiGetPurchases(),
      apiGetFarmerMaterials(row.farmerId)
    ]);
    
    const fp = allPurchases.filter((p: any) => p.farmerId === row.farmerId);
    const fpay = allPayments.filter((p: any) => p.farmerId === row.farmerId);
    const fmat = allMaterials || [];
    
    let allItems: any[] = [];
    fp.forEach((x: any) => {
      const amt = typeof x.amount === 'number' ? x.amount : parseFloat(String(x.amount).replace(/[^0-9.-]+/g, '')) || 0;
      allItems.push({
         dateStr: x.date,
         timestamp: x.createdAt ? new Date(x.createdAt).getTime() : parseDateRobust(x.purchaseDate || x.date).getTime() || 0,
         refNo: x.id,
         type: 'PURCHASE',
         description: x.crop || 'Crop Purchase',
         debitVal: 0,
         creditVal: amt,
      });
    });
    
    fpay.forEach((x: any) => {
      const amt = typeof x.amount === 'number' ? x.amount : parseFloat(String(x.amount).replace(/[^0-9.-]+/g, '')) || 0;
      allItems.push({
         dateStr: x.date,
         timestamp: x.createdAt ? new Date(x.createdAt).getTime() : parseDateRobust(x.date).getTime() || 0,
         refNo: x.id,
         type: 'PAYMENT',
         description: `Payment (${x.method})`,
         debitVal: amt,
         creditVal: 0,
      });
    });

    fmat.forEach((x: any) => {
      const amt = typeof x.totalAmount === 'number' ? x.totalAmount : parseFloat(String(x.totalAmount).replace(/[^0-9.-]+/g, '')) || 0;
      allItems.push({
         dateStr: x.createdAt ? parseDateRobust(x.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Unknown',
         timestamp: x.createdAt ? new Date(x.createdAt).getTime() : 0,
         refNo: x.id,
         type: 'MATERIAL',
         description: `Material Issue: ${x.itemName}`,
         debitVal: amt,
         creditVal: 0,
      });
    });
    
    const typeOrder: any = { 'MATERIAL': 1, 'PURCHASE': 2, 'PAYMENT': 3 };
    allItems.sort((a, b) => {
      if (a.timestamp !== b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      return typeOrder[a.type] - typeOrder[b.type];
    });
    
    let bal = 0;
    const computed = allItems.map(item => {
       bal = bal + item.creditVal - item.debitVal;
       return {
          date: item.dateStr,
          refNo: item.refNo,
          type: item.type,
          description: item.description,
          debit: item.debitVal,
          credit: item.creditVal,
          balance: bal
       };
    });
    
    setBillPayments(computed.reverse()); // Show newest first
    setIsHistoryModalOpen(true);
  };

  const openPrintModal = (row: any) => {
    setActiveReceipt({
      type: 'FARMER_PURCHASE',
      title: 'Farmer Harvest Purchase Receipt (पावती)',
      receiptNo: row.id,
      date: row.date,
      partyName: row.farmerName,
      partyPhone: row.phone || '',
      partyVillageOrAddress: row.village || '',
      gradeOrItems: row.crop,
      weightOrQty: row.weight,
      ratePerKg: row.rate,
      totalAmount: row.amount,
      balanceAmount: row.dueAmount || '₹0',
      category: row.category,
    });
  };

  // Dynamic Financial Summary Totals
  const parseNum = (val: any) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    return parseFloat(String(val).replace(/[^0-9.-]+/g, '')) || 0;
  };

  const filteredPurchases = purchases.filter((p) => {
    let dateMatch = true;
    if (timelineFilter !== 'ALL_TIME' && (p.purchaseDate || p.date)) {
      const pDate = parseDateRobust(p.purchaseDate || p.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (timelineFilter === 'TODAY') {
        dateMatch = pDate >= today;
      } else if (timelineFilter === 'YESTERDAY') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        dateMatch = pDate >= yesterday && pDate < today;
      } else if (timelineFilter === 'THIS_WEEK' || timelineFilter === 'WEEK') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateMatch = pDate >= weekAgo;
      } else if (timelineFilter === 'THIS_MONTH' || timelineFilter === 'MONTH') {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateMatch = pDate >= monthAgo;
      } else if (timelineFilter === 'CUSTOM' && customStartDate && customEndDate) {
        const s = new Date(customStartDate);
        const e = new Date(customEndDate);
        dateMatch = pDate >= s && pDate <= e;
      }
    }

    const textMatch = 
      (p.farmerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.village || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.crop || '').toLowerCase().includes(searchQuery.toLowerCase());
      
    return dateMatch && textMatch;
  });

  const totalPurchased = filteredPurchases.reduce((acc, p) => acc + parseNum(p.amount), 0);
  const totalPaid = filteredPurchases.reduce((acc, p) => acc + parseNum(p.paidAmount), 0);
  const paidFarmersCount = new Set(filteredPurchases.filter(p => parseNum(p.paidAmount) > 0).map(p => p.farmerId)).size;

  const totalUnpaid = filteredPurchases.reduce((acc, p) => acc + parseNum(p.dueAmount), 0);
  const unpaidFarmersCount = new Set(filteredPurchases.filter(p => parseNum(p.dueAmount) > 0).map(p => p.farmerId)).size;

  const totalFarmers = new Set(filteredPurchases.map(p => p.farmerId)).size;

  const handleTimelineChange = (filter: TimelineFilter, startDate?: string, endDate?: string) => {
    setTimelineFilter(filter);
    setCustomStartDate(startDate);
    setCustomEndDate(endDate);
  };



  const handleCategoryClick = (category: 'PURCHASED' | 'PAID' | 'UNPAID' | 'FARMERS') => {
    setCategoryType(category as any);
    if (category === 'PURCHASED') {
      setCategoryModalTitle('All Purchases (सर्व खरेदी)');
      setCategoryModalFarmers(filteredPurchases.map(p => ({ id: p.farmerId, farmerIdCode: p.id, name: p.farmerName, phone: p.phone, village: p.village, dueAmount: parseNum(p.amount) })));
    } else if (category === 'PAID') {
      setCategoryModalTitle(`Fully Paid Purchase Bills (${paidFarmersCount} Farmers)`);
      setCategoryModalFarmers(filteredPurchases.filter(p => parseNum(p.paidAmount) > 0).map(p => ({ id: p.farmerId, farmerIdCode: p.id, name: p.farmerName, phone: p.phone, village: p.village, totalPaid: parseNum(p.paidAmount) })));
    } else if (category === 'UNPAID') {
      setCategoryModalTitle(`Farmers with Pending Outstanding Bills (${unpaidFarmersCount} Farmers)`);
      setCategoryModalFarmers(filteredPurchases.filter(p => parseNum(p.dueAmount) > 0).map(p => ({ id: p.farmerId, farmerIdCode: p.id, name: p.farmerName, phone: p.phone, village: p.village, dueAmount: parseNum(p.dueAmount), outstandingAmount: parseNum(p.dueAmount) })));
    } else if (category === 'FARMERS') {
      setCategoryModalTitle(`All Unique Farmers (${totalFarmers} Farmers)`);
      setCategoryModalFarmers(filteredPurchases.map(p => ({ id: p.farmerId, farmerIdCode: p.id, name: p.farmerName, phone: p.phone, village: p.village })));
    }
    setIsCategoryModalOpen(true);
  };


  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 antialiased selection:bg-blue-500 selection:text-white">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {/* Header section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                  {t.purchaseManagement || 'शेतकरी आवक व खरेदी'}
                </h1>
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Database className="w-3 h-3" />
                  Live Database Connected
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Multi-Crop Billing • PDF Generation • Direct WhatsApp PDF Sharing • Clean Database
              </p>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all hover:scale-102"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Record Crop Purchase</span>
            </button>
          </div>

          {/* FINANCIAL SUMMARY BAR WITH TIMELINE FILTER & DRILL-DOWN */}
          <FinancialSummaryBar
            totalPurchased={totalPurchased}
            totalPaid={totalPaid}
            paidFarmersCount={paidFarmersCount}
            totalUnpaid={totalUnpaid}
            unpaidFarmersCount={unpaidFarmersCount}
            totalFarmers={totalFarmers}
            onTimelineChange={handleTimelineChange}
            onCategoryClick={handleCategoryClick}
          />

          {/* Search and Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search invoice, farmer or crop..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-slate-200">
                  <Filter className="w-3.5 h-3.5" />
                  Filter
                </button>
                <button className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-slate-200">
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Receipt No</th>
                    <th className="py-3.5 px-4">Farmer Name</th>
                    <th className="py-3.5 px-4">Crop & Category</th>
                    <th className="py-3.5 px-4">Weight / Qty</th>
                    <th className="py-3.5 px-4">Rate</th>
                    <th className="py-3.5 px-4">Total Amount</th>
                    <th className="py-3.5 px-4">Remaining Due</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center">
                        <Inbox className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm font-bold text-slate-800">No Harvest Purchases Recorded Yet</p>
                        <p className="text-xs text-slate-500 mt-1">Click "Record Crop Purchase" above to add your first entry.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((row, idx) => (
                      <tr 
                        key={idx} 
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedBillToEdit(row);
                          setIsEditModalOpen(true);
                        }}
                      >
                        <td className="py-3.5 px-4 font-bold text-blue-600 flex items-center gap-1.5">
                          <ShoppingBag className="w-3.5 h-3.5 text-blue-500" />
                          {row.id}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{row.farmerName}</div>
                          <div className="text-[10px] text-slate-500">{row.village} • {row.phone}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-700">{row.crop}</div>
                          <div className="text-[10px] text-blue-600 font-bold">{row.category || 'कॅरेट'}</div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">{row.weight}</td>
                        <td className="py-3.5 px-4 text-slate-500">{row.rate}</td>
                        <td className="py-3.5 px-4 font-black text-slate-900">₹{Number(row.amount || 0).toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4 font-bold text-amber-600">₹{Number(row.dueAmount || 0).toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                            row.paymentStatus === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : row.paymentStatus === 'PARTIAL'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {row.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                             <button
                              onClick={(e) => handleViewHistory(e, row)}
                              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all"
                              title="View Payment History"
                            >
                              <History className="w-3 h-3" />
                              <span>History</span>
                            </button>

                             <button
                              onClick={() => {
                                setSelectedBillToEdit(row);
                                setIsEditModalOpen(true);
                              }}
                              className="p-1.5 text-blue-500 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                              title="Edit Purchase Bill"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => openPrintModal(row)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                              title="Print / Download PDF / Share"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <AddPurchaseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddPurchase={handleAddPurchase}
      />

      <EditPurchaseModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        purchase={selectedBillToEdit}
        onEditPurchase={handleEditPurchase}
      />

      {/* History Modal */}
      {isHistoryModalOpen && historyBill && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-600" />
                  Total Transaction History
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-1">Farmer: <span className="font-black text-blue-700">{historyBill.farmerName}</span></p>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {billPayments.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">No transactions found for this farmer.</p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="text-[10px] font-black text-slate-400 uppercase">
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3 text-right">Credit (₹)</th>
                      <th className="py-2 px-3 text-right">Debit (₹)</th>
                      <th className="py-2 px-3 text-right text-blue-600">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {billPayments.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{p.date}</div>
                          <div className="text-[9px] text-slate-400">{p.refNo}</div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border ${
                            p.type === 'PURCHASE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            p.type === 'PAYMENT' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {p.description}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                          {p.credit > 0 ? `₹${p.credit.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                          {p.debit > 0 ? `-₹${p.debit.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-blue-700">
                          ₹{p.balance.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      <PrintReceiptModal
        isOpen={!!activeReceipt}
        onClose={() => setActiveReceipt(null)}
        data={activeReceipt}
      />

      <FarmerCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={categoryModalTitle}
        categoryType={categoryType}
        farmers={categoryModalFarmers}
      />
    </div>
  );
}
