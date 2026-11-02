"use client";

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { PrintReceiptModal, ReceiptData } from '@/components/common/PrintReceiptModal';
import { AddLogisticsSaleModal } from '@/components/sales/AddLogisticsSaleModal';
import { UpdateSalePaymentModal } from '@/components/sales/UpdateSalePaymentModal';
import { PattiSettlementModal } from '@/components/sales/PattiSettlementModal';
import { useLanguage } from '@/context/LanguageContext';
import { useTenant } from '@/context/TenantContext';
import { shareSaleOnWhatsApp } from '@/lib/whatsapp';
import { apiGetSales, apiUpdateSale, getTenantId } from '@/lib/api';
import { isDateInTimeline, TimelineFilter } from '@/lib/dateUtils';
import {
  Tag,
  TrendingUp,
  UserCheck,
  Hourglass,
  Search,
  Download,
  Filter,
  Eye,
  Printer,
  ChevronRight,
  MessageCircle,
  Truck,
  IndianRupee,
  CreditCard,
  Scale,
  Lock,
  CheckCircle2,
  Calendar
} from 'lucide-react';

export default function SalesPage() {
  const { t, language } = useLanguage();
  const { tenant } = useTenant();
  const [sales, setSales] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSaleForPayment, setSelectedSaleForPayment] = useState<any | null>(null);
  const [selectedSaleForPatti, setSelectedSaleForPatti] = useState<any | null>(null);
  
  const [timelineFilter, setTimelineFilter] = useState<TimelineFilter>('ALL_TIME');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_TRANSIT' | 'RECEIVED' | 'PATTI_PENDING' | 'PATTI_CLEARED' | 'UNPAID'>('ALL');

  const loadData = async () => {
    const cached = typeof window !== 'undefined' ? localStorage.getItem('seavaig_sales_cache') : null;
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) setSales(parsed);
      } catch {}
    }

    const res = await apiGetSales();
    if (res && Array.isArray(res)) {
      setSales(res);
      if (typeof window !== 'undefined') {
        localStorage.setItem('seavaig_sales_cache', JSON.stringify(res));
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateSaleInStateAndCache = (updatedSale: any) => {
    const updated = sales.map(s => s.id === updatedSale.id ? updatedSale : s);
    setSales(updated);
    const tenantId = getTenantId();
    const cacheKey = tenantId ? `seavaig_sales_cache_${tenantId}` : 'seavaig_sales_cache';
    if (typeof window !== 'undefined') {
      localStorage.setItem(cacheKey, JSON.stringify(updated));
      localStorage.setItem('seavaig_sales_cache', JSON.stringify(updated));
    }
  };

  const handleTogglePattiReceived = async (sale: any) => {
    const nextVal = !sale.isPattiReceived;
    const patch = {
      isPattiReceived: nextVal,
      pattiStatus: nextVal ? (sale.isRateFixedNow ? 'CONFIRMED' : 'PATTI_RECEIVED') : 'RATE_PENDING',
    };
    const updatedSale = { ...sale, ...patch };
    updateSaleInStateAndCache(updatedSale);
    await apiUpdateSale(sale.id, patch);
  };

  const handleToggleRateFixed = async (sale: any) => {
    const nextVal = !sale.isRateFixedNow;
    const patch = {
      isRateFixedNow: nextVal,
      rateBasis: nextVal ? 'FIXED' : 'PATTI_BASIS',
      pattiStatus: nextVal ? 'CONFIRMED' : (sale.isPattiReceived ? 'PATTI_RECEIVED' : 'RATE_PENDING')
    };
    const updatedSale = { ...sale, ...patch };
    updateSaleInStateAndCache(updatedSale);
    await apiUpdateSale(sale.id, patch);
  };

  const handleAddSale = (newSale: any) => {
    const updated = [newSale, ...sales];
    setSales(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('seavaig_sales_cache', JSON.stringify(updated));
    }
  };

  const openPrintModal = (row: any) => {
    const formattedBillNo = row.billNo || row.saleNo || row.id;
    const isPatti = row.status === 'PATTI_CLEARED' || row.deliveryStatus === 'PATTI_CLEARED' || !!row.pattiDetails;
    setActiveReceipt({
      type: isPatti ? 'PATTI_CLEAR' : 'B2B_SALE',
      title: isPatti ? 'APMC Mandi Vikri Patti (विक्री पट्टी)' : 'Tax Invoice / Sales Bill (कर बीजक)',
      receiptNo: formattedBillNo,
      billNo: formattedBillNo,
      date: row.date,
      partyName: row.customerName,
      partyPhone: row.phone,
      partyVillageOrAddress: row.address,
      gradeOrItems: row.items,
      items: row.itemsData || row.itemsList,
      totalAmount: `₹${Number(row.amount || 0).toLocaleString('en-IN')}`,
      paidAmount: (row.pattiDetails?.netPayable || row.paidAmount) ? `₹${Number(row.pattiDetails?.netPayable || row.paidAmount || 0).toLocaleString('en-IN')}` : undefined,
      balanceAmount: row.dueAmount ? `₹${Number(row.dueAmount || 0).toLocaleString('en-IN')}` : undefined,
      paymentMode: row.paymentStatus || row.status,
      vehicleNo: row.vehicleNo,
      driverName: row.driverName,
      driverPhone: row.driverPhone,
      pattiDetails: row.pattiDetails,
    });
  };

  const filtered = sales.filter((s) => {
    const dateMatch = isDateInTimeline(s.date || s.createdAt, timelineFilter);
    const textMatch = 
      (s.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.billNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.items || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.vehicleNo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.driverName || '').toLowerCase().includes(searchQuery.toLowerCase());
      
    if (!dateMatch || !textMatch) return false;

    if (statusFilter === 'IN_TRANSIT') {
      return s.deliveryStatus === 'IN_TRANSIT' && s.status !== 'PATTI_CLEARED';
    }
    if (statusFilter === 'RECEIVED') {
      return (s.deliveryStatus === 'RECEIVED' || s.status === 'RECEIVED') && s.status !== 'PATTI_CLEARED';
    }
    if (statusFilter === 'PATTI_PENDING') {
      return !s.isPattiReceived || s.pattiStatus === 'RATE_PENDING' || s.pattiStatus === 'PATTI_DRAFT';
    }
    if (statusFilter === 'PATTI_CLEARED') {
      return s.status === 'PATTI_CLEARED' || s.deliveryStatus === 'PATTI_CLEARED' || s.pattiRateLock;
    }
    if (statusFilter === 'UNPAID') {
      return s.paymentStatus !== 'PAID';
    }

    return true;
  });

  const totalSalesVal = filtered.reduce((acc: number, s: any) => acc + (Number(s.amount) || 0), 0);
  const totalVolumeVal = filtered.reduce((acc: number, s: any) => acc + (Number(s.totalWeight) || 0), 0);
  const pendingVal = filtered.filter((s: any) => s.status !== 'PAID').length;

  return (
    <div className="flex min-h-screen bg-slateCanvas font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header primaryButtonLabel="+ New Sale Invoice" />

        <main className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t.salesManagement}</h1>
              <p className="text-xs font-semibold text-slate-400 mt-1 flex items-center gap-1">
                <span>{t.dashboard}</span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="text-slate-600">{t.salesManagement}</span>
              </p>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              <span>+ Create B2B Invoice & Logistics Manifest</span>
            </button>
          </div>

          {/* Metric Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Total B2B Revenue</span>
                <h3 className="text-xl font-extrabold text-slate-900">₹{totalSalesVal.toLocaleString('en-IN')}</h3>
                <span className="text-[10px] font-bold text-emerald-600">Live Database</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Tag className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Volume Sold (KG)</span>
                <h3 className="text-xl font-extrabold text-slate-900">{totalVolumeVal.toLocaleString('en-IN')} KG</h3>
                <span className="text-[10px] font-bold text-blue-600">Total Weight Out</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Corporate Clients</span>
                <h3 className="text-xl font-extrabold text-slate-900">Live Customers</h3>
                <span className="text-[10px] font-bold text-emerald-600">Active B2B Buyers</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Hourglass className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Pending Invoices</span>
                <h3 className="text-xl font-extrabold text-slate-900">{pendingVal} Pending</h3>
                <span className="text-[10px] font-bold text-amber-600">Requires Follow-up</span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle space-y-4">
            {/* Quick Status Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                  statusFilter === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                सर्व विक्री (All - {sales.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('IN_TRANSIT')}
                className={`px-3 py-1.5 rounded-xl font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  statusFilter === 'IN_TRANSIT'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>मार्गात (In Transit)</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('RECEIVED')}
                className={`px-3 py-1.5 rounded-xl font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  statusFilter === 'RECEIVED'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>पोहचले (Received)</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PATTI_PENDING')}
                className={`px-3 py-1.5 rounded-xl font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  statusFilter === 'PATTI_PENDING'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                }`}
              >
                <Hourglass className="w-3.5 h-3.5" />
                <span>पट्टी बाकी (Patti Pending)</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('PATTI_CLEARED')}
                className={`px-3 py-1.5 rounded-xl font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  statusFilter === 'PATTI_CLEARED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>पट्टी क्लिअर (Patti Cleared)</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('UNPAID')}
                className={`px-3 py-1.5 rounded-xl font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                  statusFilter === 'UNPAID'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                }`}
              >
                <span>बाकी बिले (Unpaid Due)</span>
              </button>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="खरेदीदार/दलाल, बिल क्र., माल, गाडी किंवा ड्रायव्हर शोधा..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={timelineFilter}
                  onChange={(e) => setTimelineFilter(e.target.value as TimelineFilter)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="ALL_TIME">All Time (एकूण)</option>
                  <option value="TODAY">Today (आज)</option>
                  <option value="YESTERDAY">Yesterday (काल)</option>
                  <option value="THIS_WEEK">This Week (या आठवड्यात)</option>
                  <option value="THIS_MONTH">This Month (या महिन्यात)</option>
                  <option value="THIS_YEAR">This Year (या वर्षात)</option>
                </select>
                <button className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer">
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Export Sales</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-3">
                    <th className="py-3 px-3">INVOICE NO</th>
                    <th className="py-3 px-3">CUSTOMER / SELLER</th>
                    <th className="py-3 px-3">ORDER & PATTI STATUS</th>
                    <th className="py-3 px-3 text-right">TOTAL / DUE</th>
                    <th className="py-3 px-3 text-center">STATUS</th>
                    <th className="py-3 px-3 text-right">DATE</th>
                    <th className="py-3 px-3 text-center">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3">
                        <div className="font-black text-blue-600">{row.billNo || row.saleNo || row.id}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{row.vehicleNo || 'Vehicle N/A'}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-black text-slate-900">{row.customerName}</div>
                        <div className="text-[10px] text-slate-400">{row.phone || row.address || ''}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-700 font-semibold">{row.items}</div>
                        
                        {/* 1-Click Interactive Patti & Rate Toggles */}
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <label onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 cursor-pointer bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 hover:bg-slate-100">
                            <input
                              type="checkbox"
                              checked={!!row.isPattiReceived}
                              onChange={() => handleTogglePattiReceived(row)}
                              className="w-3.5 h-3.5 text-blue-600 rounded"
                            />
                            <span className={`text-[10px] font-extrabold ${row.isPattiReceived ? 'text-blue-700' : 'text-slate-500'}`}>
                              {row.isPattiReceived ? '✓ पट्टी मिळाली' : ' पट्टी बाकी'}
                            </span>
                          </label>

                          <label onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 cursor-pointer bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 hover:bg-slate-100">
                            <input
                              type="checkbox"
                              checked={row.isRateFixedNow !== false}
                              onChange={() => handleToggleRateFixed(row)}
                              className="w-3.5 h-3.5 text-amber-600 rounded"
                            />
                            <span className={`text-[10px] font-extrabold ${row.isRateFixedNow !== false ? 'text-emerald-700' : 'text-amber-700'}`}>
                              {row.isRateFixedNow !== false ? '✓ दर निश्चित' : '📑 दर बाकी (Patti Basis)'}
                            </span>
                          </label>
                        </div>

                        {/* Seller Advance for this specific patti */}
                        {Number(row.sellerPattiAdvance) > 0 && (
                          <div className="mt-1 text-[9px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded inline-flex items-center gap-1">
                            <IndianRupee className="w-2.5 h-2.5" />
                            <span>या पट्टीचा अ‍ॅडव्हान्स: ₹{Number(row.sellerPattiAdvance).toLocaleString('en-IN')}</span>
                          </div>
                        )}

                        {row.farmerBatches && row.farmerBatches.length > 0 && (
                          <div className="text-[9px] text-emerald-700 font-black mt-1 flex items-center gap-1 flex-wrap">
                            <span className="mr-0.5">🌾 Origin Batches:</span>
                            {row.farmerBatches.map((batchId: string, bIdx: number) => (
                              <a
                                key={bIdx}
                                href={`/purchases?search=${batchId}`}
                                className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 hover:text-emerald-800 transition-colors cursor-pointer"
                                title="Click to view purchase bill"
                              >
                                {batchId}
                              </a>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="font-black text-slate-900">₹{Number(row.amount || 0).toLocaleString('en-IN')}</div>
                        {Number(row.dueAmount) > 0 && (
                          <div className="text-[10px] font-extrabold text-rose-600">
                            बाकी: ₹{Number(row.dueAmount).toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                            row.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-600'
                              : row.status === 'PARTIAL'
                              ? 'bg-amber-50 text-amber-600'
                              : 'bg-rose-50 text-rose-600'
                          }`}>
                            {row.status}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                            row.status === 'PATTI_CLEARED' || row.deliveryStatus === 'PATTI_CLEARED'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : row.status === 'RECEIVED' || row.deliveryStatus === 'RECEIVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-50 text-blue-700 border border-blue-100'
                          }`}>
                            {row.status === 'PATTI_CLEARED' || row.deliveryStatus === 'PATTI_CLEARED'
                              ? '⚖️ PATTI CLEARED'
                              : (row.status === 'RECEIVED' || row.deliveryStatus === 'RECEIVED') ? '✓ RECEIVED' : '🚚 IN TRANSIT'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400 text-[11px]">{row.date}</td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          <button
                            onClick={() => setSelectedSaleForPatti(row)}
                            className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[10px] font-black flex items-center gap-1 transition-colors cursor-pointer"
                            title="APMC Patti Settlement"
                          >
                            <Scale className="w-3 h-3 text-amber-700" />
                            <span>{row.pattiRateLock ? 'Patti View' : 'पट्टी हिशोब'}</span>
                          </button>
                          <button
                            onClick={() => setSelectedSaleForPayment(row)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-black flex items-center gap-1 transition-colors cursor-pointer"
                            title="Record Payment / Edit Invoice"
                          >
                            <IndianRupee className="w-3 h-3" />
                            <span>Payment</span>
                          </button>
                          <button
                            onClick={() => shareSaleOnWhatsApp(row, language === 'mr' ? tenant.businessNameMr || tenant.businessName : tenant.businessName)}
                            className="p-1 text-emerald-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 cursor-pointer"
                            title="Share Invoice on WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openPrintModal(row)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                            title="Print Invoice / Patti"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <PrintReceiptModal
        isOpen={!!activeReceipt}
        onClose={() => setActiveReceipt(null)}
        data={activeReceipt}
      />

      <AddLogisticsSaleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          loadData();
        }}
      />

      {selectedSaleForPayment && (
        <UpdateSalePaymentModal
          isOpen={!!selectedSaleForPayment}
          sale={selectedSaleForPayment}
          onClose={() => setSelectedSaleForPayment(null)}
          onSuccess={() => {
            setSelectedSaleForPayment(null);
            loadData();
          }}
        />
      )}

      {selectedSaleForPatti && (
        <PattiSettlementModal
          isOpen={!!selectedSaleForPatti}
          sale={selectedSaleForPatti}
          onClose={() => setSelectedSaleForPatti(null)}
          onSuccess={() => {
            setSelectedSaleForPatti(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
