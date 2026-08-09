"use client";

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { AddExpenseModal } from '@/components/expenses/AddExpenseModal';
import { apiGetExpenses } from '@/lib/api';
import { useLanguage } from '@/context/LanguageContext';
import {
  DollarSign,
  TrendingUp,
  Truck,
  Zap,
  Package,
  Search,
  Download,
  Plus,
  ChevronRight
} from 'lucide-react';

export default function ExpensesPage() {
  const { t, language } = useLanguage();
  const [expenses, setExpenses] = useState<any[]>([]);
  
  useEffect(() => {
    async function loadData() {
      const res = await apiGetExpenses();
      if (res && Array.isArray(res)) {
        setExpenses(res.map((e: any) => ({
          id: e.expenseNo,
          title: e.notes || 'Expense',
          category: e.category,
          paymentMode: e.paymentMode,
          amount: `₹${e.amount.toLocaleString('en-IN')}`,
          date: new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          loggedBy: 'Admin'
        })));
      }
    }
    loadData();
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleAddExpense = (newExp: any) => {
    setExpenses([newExp, ...expenses]);
  };

  const handleExportCSV = () => {
    const headers = 'ID,Title,Category,Amount,Date,Payment Mode,Logged By\n';
    const rows = expenses
      .map((e) => `"${e.id}","${e.title}","${e.category}","${e.amount}","${e.date}","${e.paymentMode}","${e.loggedBy}"`)
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SEAVAIG_Expenses_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const filtered = expenses.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || e.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex min-h-screen bg-slateCanvas font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header primaryButtonLabel="+ Log Expense" onPrimaryClick={() => setIsAddModalOpen(true)} />

        <main className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {language === 'mr' ? 'खर्च व्यवस्थापन (Expense Tracking)' : 'Operational Expense Tracking'}
              </h1>
              <p className="text-xs font-semibold text-slate-400 mt-1 flex items-center gap-1">
                <span>{t.dashboard}</span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="text-slate-600">{t.expenseManagement}</span>
              </p>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Record Expense</span>
            </button>
          </div>

          {/* Metric Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Monthly Expenses</span>
                <h3 className="text-xl font-extrabold text-slate-900">₹1,03,800</h3>
                <span className="text-[10px] font-bold text-rose-600">August 2026 Operational</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Freight & Fuel</span>
                <h3 className="text-xl font-extrabold text-slate-900">₹14,500</h3>
                <span className="text-[10px] font-bold text-blue-600">Transport Costs</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Cold Storage Utility</span>
                <h3 className="text-xl font-extrabold text-slate-900">₹42,800</h3>
                <span className="text-[10px] font-bold text-amber-600">Electricity Power</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Packaging Crates</span>
                <h3 className="text-xl font-extrabold text-slate-900">₹28,000</h3>
                <span className="text-[10px] font-bold text-purple-600">5,000 Punnets</span>
              </div>
            </div>
          </div>

          {/* Expenses Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search expense title..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl focus:outline-none"
                >
                  <option value="ALL">All Categories</option>
                  <option value="Transport & Freight">Transport & Freight</option>
                  <option value="Cold Storage Electricity">Cold Storage Electricity</option>
                  <option value="Packaging & Crates">Packaging & Crates</option>
                  <option value="Labor & Wages">Labor & Wages</option>
                </select>

                <button
                  onClick={handleExportCSV}
                  className="bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-3">
                    <th className="py-3 px-3">EXPENSE ID</th>
                    <th className="py-3 px-3">TITLE / DESCRIPTION</th>
                    <th className="py-3 px-3">CATEGORY</th>
                    <th className="py-3 px-3">PAYMENT MODE</th>
                    <th className="py-3 px-3 text-right">AMOUNT</th>
                    <th className="py-3 px-3 text-right">DATE</th>
                    <th className="py-3 px-3 text-right">LOGGED BY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-bold text-blue-600">{e.id}</td>
                      <td className="py-3 px-3 font-extrabold text-slate-900">{e.title}</td>
                      <td className="py-3 px-3 font-semibold text-slate-600">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                          {e.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-700">{e.paymentMode}</td>
                      <td className="py-3 px-3 text-right font-black text-rose-600">{e.amount}</td>
                      <td className="py-3 px-3 text-right text-slate-400 text-[11px]">{e.date}</td>
                      <td className="py-3 px-3 text-right text-slate-500 font-semibold">{e.loggedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <AddExpenseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddExpense={handleAddExpense}
      />
    </div>
  );
}
