"use client";

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { PrintReceiptModal, ReceiptData } from '@/components/common/PrintReceiptModal';
import { AddLogisticsSaleModal } from '@/components/sales/AddLogisticsSaleModal';
import { useLanguage } from '@/context/LanguageContext';
import { apiGetSales } from '@/lib/api';
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
  Truck
} from 'lucide-react';

export default function SalesPage() {
  const { t } = useLanguage();
  const [sales, setSales] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const loadData = async () => {
    const cached = typeof window !== 'undefined' ? localStorage.getItem('seavaig_sales_cache') : null;
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) setSales(parsed);
      } catch {}
    }

    const res = await apiGetSales();
    if (res && Array.isArray(res) && res.length > 0) {
      setSales(res);
      if (typeof window !== 'undefined') {
        localStorage.setItem('seavaig_sales_cache', JSON.stringify(res));
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddSale = (newSale: any) => {
    const updated = [newSale, ...sales];
    setSales(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('seavaig_sales_cache', JSON.stringify(updated));
    }
  };

  const openPrintModal = (row: any) => {
    setActiveReceipt({
      type: 'CUSTOMER_SALE',
      title: 'B2B Sales Invoice & Tax Receipt',
      receiptNo: row.id,
      date: row.date,
      partyName: row.customerName,
      partyPhone: row.phone,
      partyVillageOrAddress: row.address,
      gradeOrItems: row.items,
      totalAmount: row.amount,
      paymentMode: row.status,
    });
  };

  const filtered = sales.filter(
    (s) =>
      (s.customerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSalesVal = sales.reduce((acc: number, s: any) => acc + (Number(s.amount) || 0), 0);
  const totalVolumeVal = sales.reduce((acc: number, s: any) => acc + (Number(s.totalWeight) || 0), 0);
  const pendingVal = sales.filter((s: any) => s.status !== 'PAID').length;

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
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center gap-2">
                <button className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <span>Filter Status</span>
                </button>
                <button className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
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
                    <th className="py-3 px-3">CUSTOMER NAME</th>
                    <th className="py-3 px-3">ORDER DETAILS</th>
                    <th className="py-3 px-3 text-right">TOTAL AMOUNT</th>
                    <th className="py-3 px-3 text-center">STATUS</th>
                    <th className="py-3 px-3 text-right">DATE</th>
                    <th className="py-3 px-3 text-center">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-bold text-blue-600">{row.id}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{row.customerName}</td>
                      <td className="py-3 px-3">
                        <div className="text-slate-600 font-medium">{row.items}</div>
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
                      <td className="py-3 px-3 text-right font-black text-slate-900">₹{Number(row.amount || 0).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          row.status === 'PAID'
                            ? 'bg-emerald-50 text-emerald-600'
                            : row.status === 'PARTIAL'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-rose-50 text-rose-600'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400 text-[11px]">{row.date}</td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openPrintModal(row)}
                            className="p-1 text-emerald-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-50"
                            title="Share Invoice on WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openPrintModal(row)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100"
                            title="Print Invoice"
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
    </div>
  );
}
