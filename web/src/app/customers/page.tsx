"use client";

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { AddCustomerModal } from '@/components/customers/AddCustomerModal';
import { useLanguage } from '@/context/LanguageContext';
import { apiGetCustomers } from '@/lib/api';
import {
  UserCheck,
  Building2,
  DollarSign,
  TrendingUp,
  Search,
  Filter,
  Download,
  Plus,
  ChevronRight,
  Eye,
  Phone,
  MapPin,
  X
} from 'lucide-react';

export default function CustomersPage() {
  const { t, language } = useLanguage();
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    const cached = typeof window !== 'undefined' ? localStorage.getItem('seavaig_customers_cache') : null;
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) setCustomers(parsed);
      } catch {}
    }

    async function loadData() {
      const res = await apiGetCustomers();
      if (res && Array.isArray(res) && res.length > 0) {
        const formatted = res.map((c: any) => ({
          id: c.customerIdCode || c.id,
          company: c.name,
          phone: c.phone,
          email: c.email || 'N/A',
          gstin: c.gstNumber || 'N/A',
          address: c.address || 'N/A',
          outstanding: `₹${(c.outstandingAmount || 0).toLocaleString('en-IN')}`,
          totalPurchases: `₹${(c.totalSales || 0).toLocaleString('en-IN')}`,
          creditLimit: '₹0',
        }));
        setCustomers(formatted);
        if (typeof window !== 'undefined') {
          localStorage.setItem('seavaig_customers_cache', JSON.stringify(formatted));
        }
      }
    }
    loadData();
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  const handleAddCustomer = (newCust: any) => {
    const updated = [newCust, ...customers];
    setCustomers(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('seavaig_customers_cache', JSON.stringify(updated));
    }
  };

  const handleExportCSV = () => {
    const headers = 'ID,Company Name,Phone,Email,GSTIN,Outstanding,Total Revenue\n';
    const rows = customers
      .map((c) => `"${c.id}","${c.company}","${c.phone}","${c.email}","${c.gstin}","${c.outstanding}","${c.totalPurchases}"`)
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SEAVAIG_B2B_Customers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const filtered = customers.filter(
    (c) =>
      (c.company || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone || '').includes(searchQuery)
  );

  return (
    <div className="flex min-h-screen bg-slateCanvas font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header primaryButtonLabel="+ Add Customer" onPrimaryClick={() => setIsAddModalOpen(true)} />

        <main className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {language === 'mr' ? 'बी२बी ग्राहक व्यवस्थापन (B2B Customers)' : 'B2B Customer Management'}
              </h1>
              <p className="text-xs font-semibold text-slate-400 mt-1 flex items-center gap-1">
                <span>{t.dashboard}</span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="text-slate-600">{t.customerManagement}</span>
              </p>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register Corporate Client</span>
            </button>
          </div>

          {/* Metric Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Corporate Clients</span>
                <h3 className="text-xl font-extrabold text-slate-900">{customers.length} Accounts</h3>
                <span className="text-[10px] font-bold text-emerald-600">Active B2B Buyers</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Total Sales Volume</span>
                <h3 className="text-xl font-extrabold text-slate-900">₹5,05,90,000</h3>
                <span className="text-[10px] font-bold text-emerald-600">Lifetime B2B Revenue</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Receivables Due</span>
                <h3 className="text-xl font-extrabold text-slate-900">₹23,92,500</h3>
                <span className="text-[10px] font-bold text-amber-600">Outstanding Invoices</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Avg Credit Limit</span>
                <h3 className="text-xl font-extrabold text-slate-900">₹50,00,000</h3>
                <span className="text-[10px] font-bold text-purple-600">Approved Terms</span>
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
                  placeholder="Search customer name, GSTIN..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Export Excel / CSV</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-3">
                    <th className="py-3 px-3">CUSTOMER ID</th>
                    <th className="py-3 px-3">COMPANY NAME</th>
                    <th className="py-3 px-3">CONTACT PHONE</th>
                    <th className="py-3 px-3">GSTIN ID</th>
                    <th className="py-3 px-3 text-right">OUTSTANDING DUE</th>
                    <th className="py-3 px-3 text-right">LIFETIME SALES</th>
                    <th className="py-3 px-3 text-center">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-bold text-blue-600">{c.id}</td>
                      <td className="py-3 px-3">
                        <div className="font-extrabold text-slate-900">{c.company}</div>
                        <div className="text-[10px] text-slate-400">{c.address}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-700 font-semibold">{c.phone}</td>
                      <td className="py-3 px-3 font-medium text-slate-500">{c.gstin}</td>
                      <td className="py-3 px-3 text-right font-black text-rose-600">{c.outstanding}</td>
                      <td className="py-3 px-3 text-right font-black text-slate-900">{c.totalPurchases}</td>
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => setSelectedCustomer(c)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <AddCustomerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddCustomer={handleAddCustomer}
      />

      {/* Customer Detail Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex justify-end animate-in fade-in">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-6 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                  {selectedCustomer.id}
                </span>
                <h2 className="text-lg font-black text-slate-900 mt-1">{selectedCustomer.company}</h2>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3 text-xs">
              <div className="flex items-center gap-2 text-slate-700">
                <Phone className="w-4 h-4 text-blue-600" />
                <span className="font-bold">{selectedCustomer.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700">
                <MapPin className="w-4 h-4 text-emerald-600" />
                <span>{selectedCustomer.address}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-3">
                <span className="text-slate-400 font-semibold">GSTIN ID:</span>
                <span className="font-bold text-slate-800">{selectedCustomer.gstin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Approved Credit Limit:</span>
                <span className="font-bold text-slate-900">{selectedCustomer.creditLimit}</span>
              </div>
            </div>

            <div className="border border-rose-100 bg-rose-50/50 rounded-2xl p-4 text-center">
              <span className="text-xs font-semibold text-rose-500 block uppercase tracking-wider">Current Outstanding Balance</span>
              <span className="text-2xl font-black text-rose-700">{selectedCustomer.outstanding}</span>
            </div>

            <button
              onClick={() => setSelectedCustomer(null)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs"
            >
              Close Drawer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
