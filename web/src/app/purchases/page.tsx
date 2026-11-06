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
import { useTenant } from '@/context/TenantContext';
import { sharePurchaseOnWhatsApp } from '@/lib/whatsapp';
import { 
  apiGetPurchases, 
  apiUpdatePurchase, 
  apiTogglePurchaseFarmerVisibility,
  apiCreatePayment, 
  apiUpdateFarmerBalance, 
  apiGetPayments, 
  apiGetAllFarmerMaterials, 
  apiGetFarmers, 
  isFarmerMatch, 
  getTenantId 
} from '@/lib/api';
import { parseDateRobust, isDateInTimeline } from '@/lib/dateUtils';
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
  History,
  MessageCircle
} from 'lucide-react';

export default function PurchasesPage() {
  const { t, language } = useLanguage();
  const { tenant } = useTenant();
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
      const [dbPurchases, dbPayments, dbMaterials, dbFarmers] = await Promise.all([
        apiGetPurchases(),
        apiGetPayments(),
        apiGetAllFarmerMaterials(),
        apiGetFarmers(),
      ]);

      if (dbPurchases && Array.isArray(dbPurchases)) {
        const paymentsList = Array.isArray(dbPayments) ? dbPayments : [];
        const materialsList = Array.isArray(dbMaterials) ? dbMaterials : [];
        const farmersList = Array.isArray(dbFarmers) ? dbFarmers : [];

        const getTimestamp = (x: any) => {
          const raw = x.createdAt || x.date || x.purchaseDate || x.paymentDate;
          if (!raw) return 0;
          const t = new Date(raw).getTime();
          return isNaN(t) ? 0 : t;
        };

        const cleaned = dbPurchases.map((p: any) => {
          const cleanAmt = typeof p.amount === 'number' ? p.amount : parseFloat(String(p.amount || 0).replace(/[^0-9.-]+/g, '')) || 0;
          return {
            ...p,
            amount: cleanAmt,
          };
        });

        // Group purchases by farmer and compute FIFO allocation
        const farmerGroups: Record<string, any[]> = {};
        cleaned.forEach((p: any) => {
          const key = p.farmerId || p.phone || p.farmerName || 'UNKNOWN';
          if (!farmerGroups[key]) farmerGroups[key] = [];
          farmerGroups[key].push(p);
        });

        const fifoResultMap: Record<string, { paidAmount: number; dueAmount: number; paymentStatus: string }> = {};

        Object.entries(farmerGroups).forEach(([key, fPurchases]) => {
          const firstP = fPurchases[0];
          const matchedFarmer = farmersList.find((f: any) => isFarmerMatch(firstP, f)) || { id: firstP.farmerId, phone: firstP.phone, name: firstP.farmerName };

          const fPayments = paymentsList.filter((pay: any) => isFarmerMatch(pay, matchedFarmer));
          const fMaterials = materialsList.filter((mat: any) => isFarmerMatch(mat, matchedFarmer));

          const totalPaid = fPayments.reduce((sum: number, pay: any) => sum + (Number(pay.amount) || 0), 0);
          const totalMaterial = fMaterials.reduce((sum: number, m: any) => {
            const qty = Number(m.quantity || 1);
            const price = Number(m.unitPrice || 0);
            return sum + Number(m.totalAmount || m.totalPrice || m.amount || (qty * price) || 0);
          }, 0);

          const advanceAlreadyAppliedOnBills = fPurchases.reduce((sum: number, p: any) => {
            let adv = Number(p.advanceApplied || 0);
            if (!adv && p.storageLocation) {
              const m = String(p.storageLocation).match(/DED:ADV=(\d+)/);
              if (m) adv = Number(m[1]);
            }
            return sum + adv;
          }, 0);

          const materialAlreadyDeductedOnBills = fPurchases.reduce((sum: number, p: any) => {
            let mat = Number(p.materialDeducted || 0);
            if (!mat && p.storageLocation) {
              const m = String(p.storageLocation).match(/MTL=(\d+)/);
              if (m) mat = Number(m[1]);
            }
            return sum + mat;
          }, 0);

          const unallocatedPayments = Math.max(0, totalPaid - advanceAlreadyAppliedOnBills);
          const unallocatedMaterials = Math.max(0, totalMaterial - materialAlreadyDeductedOnBills);
          let remainingSettlementPool = unallocatedPayments + unallocatedMaterials;
          const sorted = [...fPurchases].sort((a, b) => getTimestamp(a) - getTimestamp(b));

          sorted.forEach((p) => {
            const billAmt = Number(p.amount || 0);
            let billAdv = Number(p.advanceApplied || 0);
            let billMat = Number(p.materialDeducted || 0);
            if ((!billAdv || !billMat) && p.storageLocation) {
              const mAdv = String(p.storageLocation).match(/DED:ADV=(\d+)/);
              if (mAdv && !billAdv) billAdv = Number(mAdv[1]);
              const mMat = String(p.storageLocation).match(/MTL=(\d+)/);
              if (mMat && !billMat) billMat = Number(mMat[1]);
            }
            const directDeductions = billAdv + billMat;
            const remainingBillAmt = Math.max(0, billAmt - directDeductions);

            const allocatedPaid = Math.min(remainingBillAmt, Math.max(0, remainingSettlementPool));
            remainingSettlementPool = Math.max(0, remainingSettlementPool - allocatedPaid);
            const totalAllocatedPaid = directDeductions + allocatedPaid;
            const allocatedDue = Math.max(0, billAmt - totalAllocatedPaid);
            const status = allocatedDue <= 0 ? 'PAID' : (totalAllocatedPaid > 0 ? 'PARTIAL' : 'UNPAID');

            fifoResultMap[p.id] = {
              paidAmount: totalAllocatedPaid,
              dueAmount: allocatedDue,
              paymentStatus: status,
            };
          });
        });

        const finalPurchases = cleaned.map((p: any) => {
          const fifo = fifoResultMap[p.id];
          const hasExplicitDue = p.dueAmount !== undefined && p.dueAmount !== null && !isNaN(Number(p.dueAmount));
          const hasExplicitPaid = p.paidAmount !== undefined && p.paidAmount !== null && !isNaN(Number(p.paidAmount));
          
          if (fifo) {
            // Reconcile with actual payments: never allow bill to claim PAID if payments are missing
            const reconciledPaid = Math.max(Number(p.paidAmount || 0), fifo.paidAmount);
            const reconciledDue = Math.max(0, Number(p.amount || 0) - reconciledPaid);
            const status = reconciledDue <= 0 ? 'PAID' : (reconciledPaid > 0 ? 'PARTIAL' : 'UNPAID');
            return {
              ...p,
              paidAmount: reconciledPaid,
              dueAmount: reconciledDue,
              paymentStatus: status,
            };
          }

          if (hasExplicitDue && hasExplicitPaid) {
            const cleanDue = Math.max(0, Number(p.dueAmount));
            const cleanPaid = Math.max(0, Number(p.paidAmount));
            const status = p.paymentStatus || (cleanDue <= 0 ? 'PAID' : (cleanPaid > 0 ? 'PARTIAL' : 'UNPAID'));
            return {
              ...p,
              paidAmount: cleanPaid,
              dueAmount: cleanDue,
              paymentStatus: status,
            };
          }
          const cleanDue = typeof p.dueAmount === 'number' ? p.dueAmount : parseFloat(String(p.dueAmount || 0).replace(/[^0-9.-]+/g, '')) || 0;
          return {
            ...p,
            dueAmount: cleanDue,
          };
        });

        setPurchases(finalPurchases);
        setIsLiveSynced(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem(cacheKey, JSON.stringify(finalPurchases));
        }
      }
    }
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('purchases_changed', handleUpdate);
      window.addEventListener('payments_changed', handleUpdate);
      window.addEventListener('farmer_materials_changed', handleUpdate);
      window.addEventListener('farmers_changed', handleUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('purchases_changed', handleUpdate);
        window.removeEventListener('payments_changed', handleUpdate);
        window.removeEventListener('farmer_materials_changed', handleUpdate);
        window.removeEventListener('farmers_changed', handleUpdate);
      }
    };
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
    
    let orderIdx = 0;
    let allItems: any[] = [];
    fp.forEach((x: any) => {
      const amt = typeof x.amount === 'number' ? x.amount : parseFloat(String(x.amount).replace(/[^0-9.-]+/g, '')) || 0;
      allItems.push({
         dateStr: x.date,
         timestamp: x.createdAt ? new Date(x.createdAt).getTime() : parseDateRobust(x.purchaseDate || x.date).getTime() || 0,
         orderIdx: ++orderIdx,
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
         orderIdx: ++orderIdx,
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
         orderIdx: ++orderIdx,
         refNo: x.id,
         type: 'MATERIAL',
         description: `Material Issue: ${x.itemName}`,
         debitVal: amt,
         creditVal: 0,
      });
    });
    
    // Strict time-based bank-passbook sequence
    allItems.sort((a, b) => {
      if (a.timestamp !== b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      return (a.orderIdx || 0) - (b.orderIdx || 0);
    });
    
    let bal = 0;
    const computed = allItems.map((item, idx) => {
       bal = bal + item.creditVal - item.debitVal;
       return {
          srNo: idx + 1,
          date: item.dateStr,
          refNo: item.refNo,
          type: item.type,
          description: item.description,
          debit: item.debitVal,
          credit: item.creditVal,
          balance: bal
       };
    });
    
    // Chronological bank statement passbook order
    setBillPayments(computed);
    setIsHistoryModalOpen(true);
  };

  const openPrintModal = (row: any) => {
    const tot = typeof row.amount === 'number' ? row.amount : parseFloat(String(row.amount).replace(/[^0-9.-]+/g, '')) || 0;
    const due = typeof row.dueAmount === 'number' ? row.dueAmount : parseFloat(String(row.dueAmount || '0').replace(/[^0-9.-]+/g, '')) || 0;
    const paid = row.paidAmount !== undefined 
      ? (typeof row.paidAmount === 'number' ? row.paidAmount : parseFloat(String(row.paidAmount).replace(/[^0-9.-]+/g, '')) || 0)
      : Math.max(0, tot - due);

    setActiveReceipt({
      type: 'FARMER_PURCHASE',
      title: 'Farmer Harvest Purchase Receipt (पावती)',
      receiptNo: row.id || row.purchaseNo,
      date: row.date,
      partyName: row.farmerName,
      partyPhone: row.phone || '',
      partyVillageOrAddress: row.village || '',
      gradeOrItems: row.crop,
      weightOrQty: row.weight,
      ratePerKg: row.rate,
      totalAmount: tot,
      paidAmount: paid,
      dueAmount: due,
      balanceAmount: due,
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
    const dateMatch = isDateInTimeline(p.purchaseDate || p.date || p.createdAt, timelineFilter, customStartDate, customEndDate);

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
                    <th className="py-3.5 px-4">कपात तपशील (Deductions)</th>
                    <th className="py-3.5 px-4">Remaining Due</th>
                    <th className="py-3.5 px-4">Farmer View</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center">
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
                        {/* Separate Deductions Column */}
                        <td className="py-3.5 px-4">
                          {(() => {
                            let adv = Number(row.advanceApplied || 0);
                            let mat = Number(row.materialDeducted || 0);
                            if ((!adv || !mat) && row.storageLocation) {
                              const mAdv = String(row.storageLocation).match(/DED:ADV=(\d+)/);
                              if (mAdv && !adv) adv = Number(mAdv[1]);
                              const mMat = String(row.storageLocation).match(/MTL=(\d+)/);
                              if (mMat && !mat) mat = Number(mMat[1]);
                            }
                            if (adv === 0 && mat === 0) {
                              return <span className="text-[11px] text-slate-400 font-semibold">— (कपात नाही)</span>;
                            }
                            return (
                              <div className="flex flex-col gap-1 text-[10px]">
                                {adv > 0 && (
                                  <span className="font-black px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 inline-block w-fit">
                                    ⚡ उचल: -₹{adv.toLocaleString('en-IN')}
                                  </span>
                                )}
                                {mat > 0 && (
                                  <span className="font-black px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 inline-block w-fit">
                                    📦 साहित्य: -₹{mat.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-amber-600">
                          <div>₹{Number(row.dueAmount || 0).toLocaleString('en-IN')}</div>
                          {(() => {
                            let adv = Number(row.advanceApplied || 0);
                            let mat = Number(row.materialDeducted || 0);
                            if ((!adv || !mat) && row.storageLocation) {
                              const mAdv = String(row.storageLocation).match(/DED:ADV=(\d+)/);
                              if (mAdv && !adv) adv = Number(mAdv[1]);
                              const mMat = String(row.storageLocation).match(/MTL=(\d+)/);
                              if (mMat && !mat) mat = Number(mMat[1]);
                            }
                            const totalPaid = Number(row.paidAmount || 0);
                            const cashPayout = Math.max(0, totalPaid - (adv + mat));
                            if (cashPayout > 0) {
                              return (
                                <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                                  रोख भरणा: ₹{cashPayout.toLocaleString('en-IN')}
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </td>
                        <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={async () => {
                              const newVis = !row.isVisibleToFarmer;
                              await apiTogglePurchaseFarmerVisibility(row.id, newVis);
                              setPurchases((prev) =>
                                prev.map((p) => (p.id === row.id ? { ...p, isVisibleToFarmer: newVis } : p))
                              );
                            }}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black border flex items-center gap-1.5 transition-all cursor-pointer ${
                              row.isVisibleToFarmer
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                            }`}
                            title="Toggle visibility on Farmer Portal"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${row.isVisibleToFarmer ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            <span>{row.isVisibleToFarmer ? 'दृश्यमान (ON)' : 'लपवलेले (OFF)'}</span>
                          </button>
                        </td>
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
                              onClick={() => sharePurchaseOnWhatsApp(row, language === 'mr' ? tenant.businessNameMr || tenant.businessName : tenant.businessName, null, purchases)}
                              className="p-1.5 text-emerald-600 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                              title="Share Purchase Bill on WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
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
                      <th className="py-2 px-2.5 text-center w-8">#</th>
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
                        <td className="py-2.5 px-2.5 text-center font-bold text-slate-400 text-[10px]">
                          {p.srNo || (idx + 1)}
                        </td>
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
