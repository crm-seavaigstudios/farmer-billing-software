"use client";

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useLanguage } from '@/context/LanguageContext';
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
  CheckCircle2
} from 'lucide-react';
import {
  apiGetTraders,
  apiCreateTrader,
  apiGetTraderPurchases,
  apiCreateTraderPurchase
} from '@/lib/api';

export default function TradersPage() {
  const { t, language } = useLanguage();
  const [traders, setTraders] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalPurchased: '₹0',
    totalPaid: '₹0',
    dueAmount: '₹0',
  });
  const [activeTab, setActiveTab] = useState<'PURCHASES' | 'TRADERS'>('PURCHASES');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddTraderOpen, setIsAddTraderOpen] = useState(false);
  const [isAddPurchaseOpen, setIsAddPurchaseOpen] = useState(false);

  // Forms
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

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const cachedTraders = typeof window !== 'undefined' ? localStorage.getItem('seavaig_traders_cache') : null;
    const cachedPurchases = typeof window !== 'undefined' ? localStorage.getItem('seavaig_trader_purchases_cache') : null;

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

    const [tRes, pRes] = await Promise.all([apiGetTraders(), apiGetTraderPurchases()]);
    if (tRes && Array.isArray(tRes) && tRes.length > 0) {
      setTraders(tRes);
      if (tRes.length > 0) setSelectedTraderId(tRes[0].id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('seavaig_traders_cache', JSON.stringify(tRes));
      }
    }
    if (pRes) {
      const list = pRes.data && Array.isArray(pRes.data) ? pRes.data : (Array.isArray(pRes) ? pRes : null);
      if (list && list.length > 0) {
        setPurchases(list);
        if (pRes.summary) setSummary(pRes.summary);
        if (typeof window !== 'undefined') {
          localStorage.setItem('seavaig_trader_purchases_cache', JSON.stringify(list));
        }
      }
    }
  }

  const handleCreateTrader = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const newTrader = {
      id: `trd-${Date.now()}`,
      name,
      businessName: businessName || name,
      phone,
      gstNumber
    };
    await apiCreateTrader(newTrader);
    setLoading(false);
    const updated = [newTrader, ...traders];
    setTraders(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('seavaig_traders_cache', JSON.stringify(updated));
    }
    setIsAddTraderOpen(false);
    setName('');
    setBusinessName('');
    setPhone('');
    setGstNumber('');
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await apiCreateTraderPurchase({
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
    setLoading(false);
    if (res) {
      setIsAddPurchaseOpen(false);
      loadData();
    }
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
                  Supply Bills ({purchases.length})
                </button>
                <button
                  onClick={() => setActiveTab('TRADERS')}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    activeTab === 'TRADERS' ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Trader Directory ({traders.length})
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
                    {purchases.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                          No Supply Purchases Recorded Yet.
                        </td>
                      </tr>
                    ) : (
                      purchases.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-black text-blue-600">{p.id}</td>
                          <td className="py-3.5 px-4 font-extrabold text-slate-900">{p.traderName}</td>
                          <td className="py-3.5 px-4 font-semibold text-slate-700">
                            {p.itemName}
                            <span className="text-[10px] text-blue-600 font-bold block">{p.category}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">{p.quantity} @ {p.rate}</td>
                          <td className="py-3.5 px-4 font-black text-slate-900">{p.totalAmount}</td>
                          <td className="py-3.5 px-4 font-bold text-amber-600">{p.dueAmount}</td>
                          <td className="py-3.5 px-4">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                              p.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {p.paymentStatus}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-400 text-[11px]">{p.date}</td>
                        </tr>
                      ))
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
                      <th className="py-3.5 px-4 text-right">Total Purchased</th>
                      <th className="py-3.5 px-4 text-right">Outstanding Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {traders.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-black text-blue-600">{t.traderCode}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{t.name}</div>
                          <div className="text-[10px] text-slate-400">{t.businessName}</div>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800">{t.phone}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-500">{t.gstNumber || 'N/A'}</td>
                        <td className="py-3.5 px-4 text-right font-black text-slate-900">₹{(t.totalPurchased || 0).toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4 text-right font-black text-amber-600">₹{(t.dueAmount || 0).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
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
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  required
                />
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
    </div>
  );
}
