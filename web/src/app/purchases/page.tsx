"use client";

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { AddPurchaseModal } from '@/components/purchases/AddPurchaseModal';
import { AddPaymentModal } from '@/components/payments/AddPaymentModal';
import { PrintReceiptModal, ReceiptData } from '@/components/common/PrintReceiptModal';
import { FinancialSummaryBar, TimelineFilter } from '@/components/common/FinancialSummaryBar';
import { FarmerCategoryModal } from '@/components/farmers/FarmerCategoryModal';
import { useLanguage } from '@/context/LanguageContext';
import { apiGetPurchases } from '@/lib/api';
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
  Inbox
} from 'lucide-react';

export default function PurchasesPage() {
  const { t } = useLanguage();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [selectedBillToSettle, setSelectedBillToSettle] = useState<any>(null);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLiveSynced, setIsLiveSynced] = useState(false);

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryModalTitle, setCategoryModalTitle] = useState('');
  const [categoryType, setCategoryType] = useState<'ADVANCE' | 'PAID' | 'UNPAID' | 'OUTSTANDING'>('PAID');
  const [categoryModalFarmers, setCategoryModalFarmers] = useState<any[]>([]);

  useEffect(() => {
    const cached = typeof window !== 'undefined' ? localStorage.getItem('seavaig_purchases_cache') : null;
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) setPurchases(parsed);
      } catch {}
    }

    async function loadData() {
      const dbPurchases = await apiGetPurchases();
      if (dbPurchases && Array.isArray(dbPurchases) && dbPurchases.length > 0) {
        const formatted = dbPurchases.map((p: any) => ({
          id: p.purchaseNo || p.id,
          farmerId: p.farmerId || '',
          farmerName: p.farmer?.name || p.farmerName || 'Unknown Farmer',
          phone: p.farmer?.phone || '',
          village: p.farmer?.village || '',
          crop: p.items?.[0]?.cropName || p.crop || 'Crop',
          category: p.items?.[0]?.packagingCategory || 'कॅरेट',
          weight: `${p.totalWeight} ${p.items?.[0]?.unit || 'KG'}`,
          rate: `₹${p.items?.[0]?.ratePerKg || 0}/${p.items?.[0]?.unit || 'KG'}`,
          amount: `₹${p.totalAmount?.toLocaleString('en-IN') || '0'}`,
          rawAmount: p.totalAmount || 0,
          dueAmount: `₹${p.dueAmount?.toLocaleString('en-IN') || '0'}`,
          rawDue: p.dueAmount || 0,
          paymentStatus: p.paymentStatus || 'UNPAID',
          time: 'Today',
          date: new Date(p.createdAt || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        }));
        setPurchases(formatted);
        setIsLiveSynced(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('seavaig_purchases_cache', JSON.stringify(formatted));
        }
      }
    }
    loadData();
  }, []);

  const handleAddPurchase = (newPurchase: any) => {
    const updated = [newPurchase, ...purchases];
    setPurchases(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('seavaig_purchases_cache', JSON.stringify(updated));
    }
  };

  const handleSettleBillClick = (row: any) => {
    setSelectedBillToSettle(row);
    setIsSettleModalOpen(true);
  };

  const handleBillSettled = (payment: any) => {
    if (selectedBillToSettle) {
      setPurchases(
        purchases.map((p) => {
          if (p.id === selectedBillToSettle.id) {
            return {
              ...p,
              dueAmount: '₹0',
              rawDue: 0,
              paymentStatus: 'PAID',
            };
          }
          return p;
        })
      );
    }
    setIsSettleModalOpen(false);
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
  const totalAdvance = 0;
  const totalPaid = purchases.filter(p => p.paymentStatus === 'PAID').reduce((acc, p) => acc + (p.rawAmount || 0), 0);
  const paidFarmersCount = purchases.filter(p => p.paymentStatus === 'PAID').length;

  const totalUnpaid = purchases.filter(p => p.paymentStatus === 'UNPAID' || p.paymentStatus === 'PARTIAL').reduce((acc, p) => acc + (p.rawDue || 0), 0);
  const unpaidFarmersCount = purchases.filter(p => p.paymentStatus === 'UNPAID' || p.paymentStatus === 'PARTIAL').length;

  const totalOutstanding = totalUnpaid;
  const outstandingFarmersCount = unpaidFarmersCount;

  const handleTimelineChange = (filter: TimelineFilter, startDate?: string, endDate?: string) => {
    console.log('Timeline changed to:', filter, startDate, endDate);
  };

  const handleCategoryClick = (category: 'ADVANCE' | 'PAID' | 'UNPAID' | 'OUTSTANDING') => {
    setCategoryType(category);
    if (category === 'ADVANCE') {
      setCategoryModalTitle('Farmers with Advance Credit (अ‍ॅडव्हान्स जमा)');
      setCategoryModalFarmers([]);
    } else if (category === 'PAID') {
      setCategoryModalTitle(`Fully Paid Purchase Bills (${paidFarmersCount} Farmers)`);
      setCategoryModalFarmers(purchases.filter(p => p.paymentStatus === 'PAID').map(p => ({ id: p.farmerId, farmerIdCode: p.id, name: p.farmerName, phone: p.phone, village: p.village, totalPaid: p.rawAmount })));
    } else if (category === 'UNPAID' || category === 'OUTSTANDING') {
      setCategoryModalTitle(`Farmers with Pending Outstanding Bills (${unpaidFarmersCount} Farmers)`);
      setCategoryModalFarmers(purchases.filter(p => p.paymentStatus !== 'PAID').map(p => ({ id: p.farmerId, farmerIdCode: p.id, name: p.farmerName, phone: p.phone, village: p.village, dueAmount: p.rawDue, outstandingAmount: p.rawDue })));
    }
    setIsCategoryModalOpen(true);
  };

  const filteredPurchases = purchases.filter(
    (p) =>
      p.farmerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.village.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.crop.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            totalAdvance={totalAdvance}
            totalPaid={totalPaid}
            paidFarmersCount={paidFarmersCount}
            totalUnpaid={totalUnpaid}
            unpaidFarmersCount={unpaidFarmersCount}
            totalOutstanding={totalOutstanding}
            outstandingFarmersCount={outstandingFarmersCount}
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
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
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
                        <td className="py-3.5 px-4 font-black text-slate-900">{row.amount}</td>
                        <td className="py-3.5 px-4 font-bold text-amber-600">{row.dueAmount}</td>
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
                          <div className="flex items-center justify-end gap-1.5">
                            {row.paymentStatus !== 'PAID' && (
                              <button
                                onClick={() => handleSettleBillClick(row)}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all"
                                title="Settle Bill Instantly"
                              >
                                <DollarSign className="w-3 h-3" />
                                <span>Settle Bill</span>
                              </button>
                            )}

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

      <AddPaymentModal
        isOpen={isSettleModalOpen}
        onClose={() => setIsSettleModalOpen(false)}
        onAddPayment={handleBillSettled}
      />

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
