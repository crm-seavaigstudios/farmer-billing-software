"use client";

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useLanguage } from '@/context/LanguageContext';
import { useTenant } from '@/context/TenantContext';
import {
  Truck,
  Package,
  DollarSign,
  UserPlus,
  Search,
  Plus,
  ChevronRight,
  X,
  FileText,
  Building2,
  CheckCircle2,
  History,
  Printer
} from 'lucide-react';
import {
  apiGetTraders,
  apiCreateTrader,
  apiCreateTraderPurchase,
  apiUpdateTraderPurchase,
  apiUpdateTraderBalance,
  apiGetMaterialItems,
  apiAddMaterialItem,
  apiGetTraderPurchases,
  getTenantId
} from '@/lib/api';

export default function TradersPage() {
  const { t, language } = useLanguage();
  const { tenant } = useTenant();
  const [traders, setTraders] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalPurchased: '₹0',
    totalPaid: '₹0',
    dueAmount: '₹0',
  });
  const [activeTab, setActiveTab] = useState<'PURCHASES' | 'TRADERS'>('PURCHASES');
  const [searchQuery, setSearchQuery] = useState('');
  const [timelineFilter, setTimelineFilter] = useState('ALL_TIME');
  const [materials, setMaterials] = useState<any[]>([]);

  // Modals
  const [isAddTraderOpen, setIsAddTraderOpen] = useState(false);
  const [isAddPurchaseOpen, setIsAddPurchaseOpen] = useState(false);

  // Forms
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<any>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyBill, setHistoryBill] = useState<any>(null);
  const [isPrintBillModalOpen, setIsPrintBillModalOpen] = useState(false);
  const [billToPrint, setBillToPrint] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [gstNumber, setGstNumber] = useState('');

  // Purchase Form
  const [selectedTraderId, setSelectedTraderId] = useState('');
  const [itemName, setItemName] = useState('Packaging Crates (कॅरेट)');
  const [category, setCategory] = useState('PACKAGING');
  const [quantity, setQuantity] = useState('100');
  const [unit, setUnit] = useState('QTY');
  const [rate, setRate] = useState('350');
  const [paidAmount, setPaidAmount] = useState('35000');
  const [vehicleNo, setVehicleNo] = useState('MH-15-AB-1234');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);

  const parseNum = (val: any) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    return parseFloat(String(val).replace(/[^0-9.-]+/g, '')) || 0;
  };

  const filteredPurchases = purchases.filter((p) => {
    let dateMatch = true;
    if (timelineFilter !== 'ALL_TIME' && p.date) {
      const pDate = new Date(p.date.split('/').reverse().join('-') || p.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (timelineFilter === 'TODAY') {
        dateMatch = pDate >= today;
      } else if (timelineFilter === 'YESTERDAY') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        dateMatch = pDate >= yesterday && pDate < today;
      } else if (timelineFilter === 'THIS_WEEK') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        dateMatch = pDate >= weekAgo;
      } else if (timelineFilter === 'THIS_MONTH') {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        dateMatch = pDate >= monthAgo;
      }
    }

    const textMatch = 
      (p.traderName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.itemName || '').toLowerCase().includes(searchQuery.toLowerCase());
      
    return dateMatch && textMatch;
  });

  const filteredTraders = traders.filter(t => 
    (t.name || t.businessName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.phone || '').includes(searchQuery)
  );

  useEffect(() => {
    const totalPurchased = filteredPurchases.reduce((acc, p) => acc + parseNum(p.totalAmount), 0);
    const totalPaidVal = filteredPurchases.reduce((acc, p) => acc + parseNum(p.paidAmount), 0);
    const totalDue = totalPurchased - totalPaidVal;

    setSummary({
      totalPurchased: `₹${totalPurchased.toLocaleString('en-IN')}`,
      totalPaid: `₹${totalPaidVal.toLocaleString('en-IN')}`,
      dueAmount: `₹${totalDue.toLocaleString('en-IN')}`,
    });
  }, [filteredPurchases]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const tenantId = getTenantId();
    const cachedTraders = typeof window !== 'undefined' && tenantId ? localStorage.getItem(`seavaig_traders_cache_${tenantId}`) : null;
    const cachedPurchases = typeof window !== 'undefined' && tenantId ? localStorage.getItem(`seavaig_trader_purchases_cache_${tenantId}`) : null;

    if (cachedTraders) {
      try {
        const parsed = JSON.parse(cachedTraders);
        if (Array.isArray(parsed) && parsed.length > 0) setTraders(parsed);
      } catch {}
    }
    if (cachedPurchases) {
      try {
        const parsed = JSON.parse(cachedPurchases);
        if (Array.isArray(parsed) && parsed.length > 0) setPurchases(parsed);
      } catch {}
    }

    const [tRes, pRes, mRes] = await Promise.all([apiGetTraders(), apiGetTraderPurchases(), apiGetMaterialItems()]);
    if (mRes) {
      setMaterials(mRes);
    }
    if (tRes && Array.isArray(tRes) && tRes.length > 0) {
      setTraders(tRes);
      if (tRes.length > 0) setSelectedTraderId(tRes[0].id);
      if (typeof window !== 'undefined' && tenantId) {
        localStorage.setItem(`seavaig_traders_cache_${tenantId}`, JSON.stringify(tRes));
      }
    }
    if (pRes) {
      const list = Array.isArray(pRes) ? pRes : ((pRes as any)?.data || []);
      if (list && list.length > 0) {
        setPurchases(list);
        if ((pRes as any)?.summary) setSummary((pRes as any).summary);
        if (typeof window !== 'undefined' && tenantId) {
          localStorage.setItem(`seavaig_trader_purchases_cache_${tenantId}`, JSON.stringify(list));
        }
      }
    }
  }

  const handleCreateTrader = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const tenantId = getTenantId();
    const traderCode = `TRD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTrader = {
      id: `trd-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      traderCode,
      name,
      businessName: businessName || name,
      phone,
      gstNumber
    };
    try {
      await apiCreateTrader(newTrader);
      const updated = [newTrader, ...traders.filter(t => t.id !== newTrader.id)];
      setTraders(updated);
      if (typeof window !== 'undefined' && tenantId) {
        localStorage.setItem(`seavaig_traders_cache_${tenantId}`, JSON.stringify(updated));
      }
      setIsAddTraderOpen(false);
      setName('');
      setBusinessName('');
      setPhone('');
      setGstNumber('');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const tenantId = getTenantId();
    const selectedTrader = traders.find((t) => t.id === selectedTraderId) || traders[0];
    const totalAmt = (Number(quantity) || 1) * (Number(rate) || 0);

    const newPur = {
      id: `TBILL-${Date.now().toString().slice(-4)}-${Math.floor(100 + Math.random() * 900)}`,
      traderName: selectedTrader?.name || 'Trader',
      businessName: selectedTrader?.businessName || selectedTrader?.name || 'Business',
      itemName,
      category,
      quantity: Number(quantity) || 1,
      unit,
      rate: Number(rate) || 0,
      totalAmount: totalAmt,
      paidAmount: Number(paidAmount) || 0,
      dueAmount: Math.max(0, totalAmt - (Number(paidAmount) || 0)),
      vehicleNo,
      notes,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    };

    try {
      const created = await apiCreateTraderPurchase({
        traderId: selectedTraderId,
        itemName,
        category,
        quantity: Number(quantity) || 1,
        unit,
        rate: Number(rate) || 0,
        paidAmount: Number(paidAmount) || 0,
        vehicleNo,
        notes,
      });

      const updatedPurchases = [created || newPur, ...purchases];
      setPurchases(updatedPurchases);
      if (typeof window !== 'undefined' && tenantId) {
        localStorage.setItem(`seavaig_trader_purchases_cache_${tenantId}`, JSON.stringify(updatedPurchases));
      }
      setIsAddPurchaseOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordTraderPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillForPayment) return;

    const amt = Number(paymentAmount) || 0;
    const totalAmt = Number(selectedBillForPayment.quantity || 1) * Number(selectedBillForPayment.rate || 0);
    const newPaid = Number(selectedBillForPayment.paidAmount || 0) + amt;
    const newDue = Math.max(0, totalAmt - newPaid);

    await apiUpdateTraderPurchase(selectedBillForPayment.id, {
      paidAmount: newPaid,
      dueAmount: newDue,
      paymentStatus: newDue === 0 ? 'PAID' : (newPaid > 0 ? 'PARTIAL' : 'UNPAID')
    });

    if (selectedBillForPayment.traderId) {
      await apiUpdateTraderBalance(selectedBillForPayment.traderId, amt, -amt);
    }

    const updated = purchases.map((p) => {
      if (p.id === selectedBillForPayment.id) {
        return {
          ...p,
          paidAmount: newPaid,
          dueAmount: newDue,
          paymentStatus: newDue === 0 ? 'PAID' : (newPaid > 0 ? 'PARTIAL' : 'UNPAID')
        };
      }
      return p;
    });

    setPurchases(updated);
    setIsPaymentModalOpen(false);
    setSelectedBillForPayment(null);
    setPaymentAmount('');
    setPaymentNotes('');
  };

  const handleViewHistory = (p: any) => {
    setHistoryBill(p);
    setIsHistoryModalOpen(true);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                {language === 'mr' ? 'व्यापारी व साहित्य खरेदी (Traders & Supplies)' : 'Traders & Material Supplies Billing'}
              </h1>
              <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1">
                <span>{t.dashboard}</span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="text-slate-600">Traders & Supplies Ledger</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={timelineFilter}
                onChange={(e) => setTimelineFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="ALL_TIME">All Time</option>
                <option value="TODAY">Today</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="THIS_WEEK">This Week</option>
                <option value="THIS_MONTH">This Month</option>
              </select>
              <button
                onClick={() => setIsAddTraderOpen(true)}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>Register Trader</span>
              </button>
              <button
                onClick={() => setIsAddPurchaseOpen(true)}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-blue-600/20 flex items-center gap-2 cursor-pointer"
              >
                <Package className="w-4 h-4" />
                <span>Record Supply Order</span>
              </button>
            </div>
          </div>

          {/* Metric Summary Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Total Supply Purchases</span>
                <h3 className="text-xl font-extrabold text-slate-900">{summary.totalPurchased}</h3>
                <span className="text-[10px] font-bold text-blue-600">Crates, Fuel, Fertilizers</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Total Paid to Traders</span>
                <h3 className="text-xl font-extrabold text-slate-900">{summary.totalPaid}</h3>
                <span className="text-[10px] font-bold text-emerald-600">Disbursed Settlements</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Outstanding Due Amount</span>
                <h3 className="text-xl font-extrabold text-slate-900">{summary.dueAmount}</h3>
                <span className="text-[10px] font-bold text-amber-600">Pending Trader Invoices</span>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('PURCHASES')}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    activeTab === 'PURCHASES' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Supply Bills ({filteredPurchases.length})
                </button>
                <button
                  onClick={() => setActiveTab('TRADERS')}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    activeTab === 'TRADERS' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Trader Directory ({filteredTraders.length})
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search item, bill or trader..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none"
                />
              </div>
            </div>

            {activeTab === 'PURCHASES' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Bill No</th>
                      <th className="py-3.5 px-4">Trader Name</th>
                      <th className="py-3.5 px-4">Item & Category</th>
                      <th className="py-3.5 px-4">Qty & Rate</th>
                      <th className="py-3.5 px-4">Total Amount</th>
                      <th className="py-3.5 px-4">Remaining Due</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredPurchases.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                          No Supply Purchases Recorded Yet.
                        </td>
                      </tr>
                    ) : (
                      filteredPurchases.map((p) => {
                        const totalNum = parseNum(p.totalAmount);
                        const paidNum = parseNum(p.paidAmount);
                        const dueNum = Math.max(0, totalNum - paidNum);
                        const statusStr = dueNum === 0 ? 'PAID' : (paidNum > 0 ? 'PARTIAL' : 'UNPAID');

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-4 font-black text-blue-600">{p.id}</td>
                            <td className="py-3.5 px-4 font-extrabold text-slate-900">{p.traderName}</td>
                            <td className="py-3.5 px-4 font-semibold text-slate-700">
                              {p.itemName}
                              <span className="text-[10px] text-blue-600 font-bold block">{p.category}</span>
                            </td>
                            <td className="py-3.5 px-4 text-slate-600">{p.quantity} @ ₹{p.rate || 0}</td>
                            <td className="py-3.5 px-4 font-black text-slate-900">₹{totalNum.toLocaleString('en-IN')}</td>
                            <td className="py-3.5 px-4 font-bold text-amber-600">₹{dueNum.toLocaleString('en-IN')}</td>
                            <td className="py-3.5 px-4">
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                statusStr === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : statusStr === 'PARTIAL' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}>
                                {statusStr}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setBillToPrint(p);
                                    setIsPrintBillModalOpen(true);
                                  }}
                                  className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold cursor-pointer flex items-center gap-1"
                                  title="Print Supply Bill Receipt"
                                >
                                  <Printer className="w-3 h-3" />
                                  Print
                                </button>
                                {dueNum > 0 && (
                                  <button
                                    onClick={() => {
                                      setSelectedBillForPayment(p);
                                      setPaymentAmount(String(dueNum));
                                      setIsPaymentModalOpen(true);
                                    }}
                                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold cursor-pointer"
                                    title="Make Payment / Settlement"
                                  >
                                    Pay Due
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    const shareText = `🧾 *Trader Supply Order Receipt* 🧾\n` +
                                      `Bill ID: ${p.id}\n` +
                                      `Trader: ${p.traderName}\n` +
                                      `Item: ${p.itemName} (${p.category})\n` +
                                      `Qty: ${p.quantity} @ ₹${p.rate}\n` +
                                      `Total: ₹${totalNum.toLocaleString('en-IN')}\n` +
                                      `Paid: ₹${paidNum.toLocaleString('en-IN')}\n` +
                                      `Remaining Due: ₹${dueNum.toLocaleString('en-IN')}\n` +
                                      `Thank you!`;
                                    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
                                  }}
                                  className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-bold cursor-pointer"
                                  title="Share Bill on WhatsApp"
                                >
                                  Share
                                </button>
                                <button
                                  onClick={() => handleViewHistory(p)}
                                  className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[10px] font-bold cursor-pointer"
                                  title="View Bill Details & History"
                                >
                                  Details
                                </button>
                                <button
                                  onClick={() => {
                                    const updated = purchases.filter((item) => item.id !== p.id);
                                    setPurchases(updated);
                                    if (typeof window !== 'undefined') localStorage.setItem('seavaig_trader_purchases_cache', JSON.stringify(updated));
                                  }}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-[10px] font-bold cursor-pointer"
                                  title="Delete Supply Bill"
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4">Trader Code</th>
                      <th className="py-3.5 px-4">Name & Business</th>
                      <th className="py-3.5 px-4">Phone</th>
                      <th className="py-3.5 px-4">GSTIN ID</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredTraders.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 text-xs italic">
                          No traders found matching your search.
                        </td>
                      </tr>
                    ) : (
                      filteredTraders.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-black text-blue-600">{t.traderCode || `TRD-${t.id.slice(0, 5)}`}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{t.name}</div>
                          <div className="text-[10px] text-slate-400">{t.businessName}</div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">{t.phone}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-500">{t.gstNumber || 'N/A'}</td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => {
                              const updated = traders.filter((item) => item.id !== t.id);
                              setTraders(updated);
                              if (typeof window !== 'undefined') localStorage.setItem('seavaig_traders_cache', JSON.stringify(updated));
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg text-xs font-extrabold cursor-pointer"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Register Trader Modal */}
      {isAddTraderOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">Register New Material Trader / Vendor</h2>
              <button onClick={() => setIsAddTraderOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTrader} className="space-y-3">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Trader / Representative Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  required
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Business / Firm Name</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  placeholder="e.g. Nashik Packaging Corp"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">GSTIN Number</label>
                  <input
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold uppercase"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddTraderOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 font-bold rounded-xl text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 font-extrabold rounded-xl text-white shadow-lg"
                >
                  Register Trader
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Supply Purchase Modal */}
      {isAddPurchaseOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">Record Material / Supply Order from Trader</h2>
              <button onClick={() => setIsAddPurchaseOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePurchase} className="space-y-3">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Select Trader / Supplier</label>
                <select
                  value={selectedTraderId}
                  onChange={(e) => setSelectedTraderId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  {traders.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.businessName || t.traderCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Item Description</label>
                <div className="flex gap-2">
                  <select
                    value={itemName}
                    onChange={(e) => {
                      if (e.target.value === 'ADD_CUSTOM') {
                        const custom = prompt("Enter new custom material name:");
                        if (custom && custom.trim()) {
                          apiAddMaterialItem(custom.trim()).then(newItem => {
                            setMaterials([...materials, newItem]);
                            setItemName(newItem.name);
                          });
                        }
                      } else {
                        setItemName(e.target.value);
                      }
                    }}
                    className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="Packaging Crates (कॅरेट)">Packaging Crates (कॅरेट)</option>
                    {materials.map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                    <option value="ADD_CUSTOM" className="text-blue-600 font-extrabold">+ Add Custom Material...</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Quantity</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Rate (₹)</label>
                  <input
                    type="number"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-blue-600"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Paid Amount (₹)</label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-600"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddPurchaseOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 font-bold rounded-xl text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 font-extrabold rounded-xl text-white shadow-lg shadow-blue-600/20"
                >
                  Save Trader Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Trader Payment Modal */}
      {isPaymentModalOpen && selectedBillForPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">Make Payment to Trader</h2>
              <button onClick={() => setIsPaymentModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordTraderPayment} className="space-y-3">
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <p className="font-bold text-slate-700">Bill ID: <span className="text-blue-600">{selectedBillForPayment.id}</span></p>
                <p className="font-semibold text-slate-600">Trader Name: {selectedBillForPayment.traderName}</p>
                <p className="font-semibold text-slate-600">Total Purchase Value: ₹{Number(selectedBillForPayment.quantity * selectedBillForPayment.rate).toLocaleString('en-IN')}</p>
                <p className="font-bold text-rose-600">Remaining Due: ₹{Math.max(0, Number(selectedBillForPayment.quantity * selectedBillForPayment.rate) - Number(selectedBillForPayment.paidAmount)).toLocaleString('en-IN')}</p>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Payment Amount (₹) *</label>
                <input
                  type="number"
                  max={Math.max(0, Number(selectedBillForPayment.quantity * selectedBillForPayment.rate) - Number(selectedBillForPayment.paidAmount))}
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Notes / Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. UPI Payout, Cash, Bank Transfer"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 font-bold rounded-xl text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 font-extrabold rounded-xl text-white shadow-lg cursor-pointer"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && historyBill && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />
                Trader Bill Details ({historyBill.id})
              </h3>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-600">
                Trader: <span className="font-bold text-slate-900">{historyBill.traderName}</span>
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Item:</span>
                  <span className="font-bold text-slate-900">{historyBill.itemName} ({historyBill.category})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Purchase:</span>
                  <span className="font-bold text-slate-900">{historyBill.quantity} @ ₹{historyBill.rate}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="text-slate-500">Total Amount:</span>
                  <span className="font-black text-slate-900">₹{(historyBill.quantity * historyBill.rate).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paid Amount:</span>
                  <span className="font-bold text-emerald-600">₹{(historyBill.paidAmount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Remaining Due:</span>
                  <span className="font-bold text-rose-600">₹{Math.max(0, (historyBill.quantity * historyBill.rate) - (historyBill.paidAmount || 0)).toLocaleString('en-IN')}</span>
                </div>
                {historyBill.notes && (
                  <div className="flex justify-between border-t border-slate-200 pt-2">
                    <span className="text-slate-500">Notes:</span>
                    <span className="font-semibold text-slate-700">{historyBill.notes}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setBillToPrint(historyBill);
                    setIsHistoryModalOpen(false);
                    setIsPrintBillModalOpen(true);
                  }}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 font-extrabold rounded-xl text-white shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Supply Bill / पावती प्रिंट करा</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trader Supply Bill Print Modal */}
      {isPrintBillModalOpen && billToPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex justify-between items-center no-print">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/80 flex items-center justify-center text-white">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">व्यापारी पुरवठा पावती (Trader Supply Receipt)</h3>
                  <p className="text-xs text-slate-300">{tenant?.businessName || 'Agro Agency'} • {tenant?.phone || ''}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsPrintBillModalOpen(false);
                  setBillToPrint(null);
                }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs font-sans">
              {/* Agency & Trader Details */}
              <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                <div className="flex items-start gap-3.5">
                  <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-200 flex-shrink-0 overflow-hidden shadow-xs p-1">
                    {tenant?.logoUrl ? (
                      <img src={tenant.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Building2 className="w-8 h-8 text-emerald-700" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 uppercase leading-snug">{tenant?.businessNameMr || tenant?.businessName || 'Agro Agency'}</h2>
                    <p className="text-[11px] text-slate-600 font-semibold mt-0.5">{tenant?.addressMr || tenant?.address || 'Market Yard / Procurement Center'}</p>
                    <p className="text-[11px] text-slate-500 font-semibold mt-0.5">📞 {tenant?.phone || (tenant as any)?.ownerPhone || '—'} {tenant?.gstin ? `| GSTIN: ${tenant.gstin}` : ''}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 font-black text-xs border border-blue-200 block mb-1">
                    {billToPrint.id || 'TB-001'}
                  </span>
                  <p className="text-[10px] text-slate-400 font-bold">
                    Date: {billToPrint.date || new Date().toLocaleDateString('en-IN')}
                  </p>
                </div>
              </div>

              {/* Trader Info Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">व्यापारी / Trader:</span>
                  <span className="font-black text-slate-900">{billToPrint.traderName || 'Trader'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">व्यवसाय / Business:</span>
                  <span className="font-bold text-slate-800">{billToPrint.businessName || '—'}</span>
                </div>
                {billToPrint.vehicleNo && (
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">वाहन क्र. / Vehicle No:</span>
                    <span className="font-bold text-slate-800">{billToPrint.vehicleNo}</span>
                  </div>
                )}
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">पेमेंट स्थिती / Status:</span>
                  <span className={`font-black ${
                    billToPrint.paymentStatus === 'PAID' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {billToPrint.paymentStatus || 'UNPAID'}
                  </span>
                </div>
              </div>

              {/* Itemized Order Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-[10px] font-black uppercase tracking-wider text-white">
                    <tr>
                      <th className="py-2.5 px-3">साहित्य / Item Description</th>
                      <th className="py-2.5 px-3 text-right">नग / Qty</th>
                      <th className="py-2.5 px-3 text-right">दर / Rate</th>
                      <th className="py-2.5 px-3 text-right">रक्कम / Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-slate-50 font-bold">
                      <td className="py-2.5 px-3 font-extrabold text-slate-900">
                        {billToPrint.itemName}
                        <span className="ml-1 text-[10px] text-slate-400 font-bold">({billToPrint.category || 'SUPPLY'})</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-700">{billToPrint.quantity} {billToPrint.unit || 'QTY'}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-700">₹{billToPrint.rate}</td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-900">
                        ₹{(Number(billToPrint.quantity || 1) * Number(billToPrint.rate || 0)).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Financial Breakdown */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between items-center font-bold text-slate-700">
                  <span>एकूण रक्कम (Gross Amount):</span>
                  <span>₹{(Number(billToPrint.quantity || 1) * Number(billToPrint.rate || 0)).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center font-bold text-emerald-700">
                  <span>जमा रक्कम (Paid Amount):</span>
                  <span>₹{Number(billToPrint.paidAmount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm font-black text-slate-900">
                  <span>शिल्लक बाकी (Remaining Due):</span>
                  <span className={Math.max(0, (Number(billToPrint.quantity || 1) * Number(billToPrint.rate || 0)) - Number(billToPrint.paidAmount || 0)) > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                    ₹{Math.max(0, (Number(billToPrint.quantity || 1) * Number(billToPrint.rate || 0)) - Number(billToPrint.paidAmount || 0)).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-6 border-t border-slate-200 flex justify-end items-end text-center">
                <div className="min-w-[170px]">
                  {tenant?.signatureUrl ? (
                    <div className="flex flex-col items-center justify-center mb-1">
                      <img 
                        src={tenant.signatureUrl} 
                        alt="Digital Signature" 
                        className="h-12 max-w-[160px] object-contain mx-auto mb-1" 
                      />
                      <div className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center justify-center gap-1 mb-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 inline" />
                        <span>संगणकीकृत अधिकृत स्वाक्षरी</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-9 flex items-center justify-center text-slate-400 text-[10px] mb-1">
                      <div className="w-36 border-b border-slate-400 mt-6" />
                    </div>
                  )}
                  <div className="text-slate-900 font-black text-[11px]">
                    {tenant?.businessNameMr || tenant?.businessName || 'Agro Agency'}
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-900 block mt-0.5">अधिकृत स्वाक्षरी व शिक्का</span>
                  <span className="text-[8px] text-slate-400 block">(Authorized Signatory)</span>
                </div>
              </div>

              {/* Print Footer */}
              <div className="pt-3 text-[9px] text-slate-400 flex justify-between items-center border-t border-slate-100 font-medium">
                <span>संगणकीकृत पुरवठा पावती • Official Supply Receipt</span>
                <span className="font-bold text-slate-500">पृष्ठ क्र. (Page 1)</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end gap-2 no-print">
              <button
                onClick={() => {
                  setIsPrintBillModalOpen(false);
                  setBillToPrint(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
              >
                बंद करा / Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>प्रिंट पावती / Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
