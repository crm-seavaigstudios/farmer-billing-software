"use client";

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useLanguage } from '@/context/LanguageContext';
import { useTenant } from '@/context/TenantContext';
import {
  BarChart3,
  PieChart,
  Download,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  Sprout,
  Users,
  ChevronRight,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  Table,
  Sliders,
  Check,
  Search,
  Building
} from 'lucide-react';
import {
  apiGetFarmers,
  apiGetSales,
  apiGetPurchases,
  apiGetTraderPurchases,
  apiGetWorkers,
  apiGetExpenses
} from '@/lib/api';

const sampleReportSeed = [
  { id: 'R-101', date: '2026-08-07', module: 'HARVEST_PURCHASE', partyName: 'Ramesh Patil', category: 'Strawberry (A Grade)', weight: '120 KG', totalAmount: 33600, paidAmount: 10000, dueAmount: 23600, paymentStatus: 'PARTIAL', refNo: 'PUR-2026-1052' },
  { id: 'R-102', date: '2026-08-07', module: 'FARMER_PAYMENT', partyName: 'Suresh Jadhav', category: 'Advance Settlement', weight: '-', totalAmount: 15000, paidAmount: 15000, dueAmount: 0, paymentStatus: 'PAID', refNo: 'PAY-2026-0852' },
  { id: 'R-103', date: '2026-08-06', module: 'TRADER_SUPPLY', partyName: 'Ambika Crates & Packaging', category: 'Plastic Crates 500 Qty', weight: '500 Qty', totalAmount: 45000, paidAmount: 20000, dueAmount: 25000, paymentStatus: 'PARTIAL', refNo: 'TBILL-2026-1001' },
  { id: 'R-104', date: '2026-08-06', module: 'WORKER_WAGES', partyName: 'Ganesh More (Daily Worker)', category: 'Harvest Labour (8 hrs)', weight: '8 Hrs', totalAmount: 700, paidAmount: 700, dueAmount: 0, paymentStatus: 'PAID', refNo: 'WAGE-2026-901' },
  { id: 'R-105', date: '2026-08-05', module: 'B2B_SALES', partyName: 'Reliance Fresh Ltd', category: 'Grapes Sonaka (1.2 Ton)', weight: '1200 KG', totalAmount: 132000, paidAmount: 132000, dueAmount: 0, paymentStatus: 'PAID', refNo: 'INV-2026-9042' },
  { id: 'R-106', date: '2026-08-05', module: 'EXPENSE', partyName: 'Cold Storage Fuel & Transport', category: 'Diesel Fuel Expense', weight: '-', totalAmount: 12500, paidAmount: 12500, dueAmount: 0, paymentStatus: 'PAID', refNo: 'EXP-2026-302' },
];

export default function ReportsPage() {
  const { t, language } = useLanguage();
  const { tenant } = useTenant();
  
  const [activeModule, setActiveModule] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [reportData, setReportData] = useState<any[]>(sampleReportSeed);

  // Multi-Agency Checkbox Selector State
  const [selectedAgencies, setSelectedAgencies] = useState<string[]>([
    'agency_nashik',
    'agency_sinnar'
  ]);

  const availableAgencies = [
    { id: 'agency_nashik', name: 'Seavaig Agro Agency (Nashik)', location: 'Nashik' },
    { id: 'agency_sinnar', name: 'Godavari Traders (Sinnar)', location: 'Sinnar' },
    { id: 'agency_yeola', name: 'Ambika Agro Supplies (Yeola)', location: 'Yeola' },
    { id: 'agency_pimpalgaon', name: 'Sahyadri Mandi Enterprise (Pimpalgaon)', location: 'Pimpalgaon' },
  ];

  const toggleAgency = (id: string) => {
    setSelectedAgencies((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  // Column Selector State
  const [columns, setColumns] = useState({
    date: true,
    refNo: true,
    partyName: true,
    category: true,
    weight: true,
    totalAmount: true,
    paidAmount: true,
    dueAmount: true,
    status: true,
  });

  const [isColumnPickerOpen, setIsColumnPickerOpen] = useState(false);

  useEffect(() => {
    async function loadLiveReports() {
      try {
        const [farmersRes, salesRes, purchasesRes, tradersRes, workersRes, expensesRes] = await Promise.all([
          apiGetFarmers(),
          apiGetSales(),
          apiGetPurchases(),
          apiGetTraderPurchases(),
          apiGetWorkers(),
          apiGetExpenses(),
        ]);

        const combined: any[] = [];

        if (purchasesRes && Array.isArray(purchasesRes)) {
          purchasesRes.forEach((p: any) => {
            combined.push({
              id: p.id || p.purchaseNo,
              date: p.purchaseDate ? new Date(p.purchaseDate).toISOString().slice(0, 10) : '2026-08-07',
              module: 'HARVEST_PURCHASE',
              partyName: p.farmerName || p.farmer?.name || 'Farmer',
              category: p.crop || 'Harvest Crop',
              weight: `${p.totalWeight || 0} KG`,
              totalAmount: p.totalAmount || 0,
              paidAmount: (p.paidAmount || 0) + (p.advanceApplied || 0),
              dueAmount: p.dueAmount || 0,
              paymentStatus: p.paymentStatus || 'UNPAID',
              refNo: p.purchaseNo || 'PUR-100',
            });
          });
        }

        if (salesRes) {
          const sList = Array.isArray(salesRes) ? salesRes : ((salesRes as any)?.data || []);
          sList.forEach((s: any) => {
            combined.push({
              id: s.id || s.invoiceNo,
              date: s.date || '2026-08-07',
              module: 'B2B_SALES',
              partyName: s.customerName || 'B2B Client',
              category: s.crop || 'Crop Sale',
              weight: `${s.weightKg || 0} KG`,
              totalAmount: s.totalAmount || 0,
              paidAmount: s.paidAmount || 0,
              dueAmount: s.dueAmount || 0,
              paymentStatus: s.paymentStatus || 'PAID',
              refNo: s.invoiceNo || 'INV-100',
            });
          });
        }

        if (combined.length > 0) {
          setReportData(combined);
        }
      } catch (err) {
        console.warn('Using report seed data:', err);
      }
    }
    loadLiveReports();
  }, []);

  const filteredData = reportData.filter((item) => {
    if (activeModule !== 'ALL' && item.module !== activeModule) return false;
    if (statusFilter !== 'ALL' && item.paymentStatus !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (item.partyName || '').toLowerCase().includes(q) ||
        (item.refNo || '').toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleExportCSV = () => {
    const selectedCols: string[] = [];
    if (columns.date) selectedCols.push('Date');
    if (columns.refNo) selectedCols.push('Reference No');
    if (columns.partyName) selectedCols.push('Party Name');
    if (columns.category) selectedCols.push('Category/Item');
    if (columns.weight) selectedCols.push('Quantity/Weight');
    if (columns.totalAmount) selectedCols.push('Total Amount (INR)');
    if (columns.paidAmount) selectedCols.push('Paid Amount (INR)');
    if (columns.dueAmount) selectedCols.push('Due Amount (INR)');
    if (columns.status) selectedCols.push('Payment Status');

    let csvContent = selectedCols.join(',') + '\n';

    filteredData.forEach((row) => {
      const line: string[] = [];
      if (columns.date) line.push(`"${row.date}"`);
      if (columns.refNo) line.push(`"${row.refNo}"`);
      if (columns.partyName) line.push(`"${row.partyName}"`);
      if (columns.category) line.push(`"${row.category}"`);
      if (columns.weight) line.push(`"${row.weight}"`);
      if (columns.totalAmount) line.push(`"${row.totalAmount}"`);
      if (columns.paidAmount) line.push(`"${row.paidAmount}"`);
      if (columns.dueAmount) line.push(`"${row.dueAmount}"`);
      if (columns.status) line.push(`"${row.paymentStatus}"`);
      csvContent += line.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SEAVAIG_Custom_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex min-h-screen bg-slateCanvas font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header primaryButtonLabel="+ Export CSV" onPrimaryClick={handleExportCSV} />

        <main className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Header Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {language === 'mr'
                  ? 'एक्सेल-स्टाईल कस्टम रिपोर्ट जनरेटर'
                  : language === 'hi'
                  ? 'एक्सेल-स्टाइल कस्टम रिपोर्ट जनरेटर'
                  : 'Excel-Style Custom Report Builder'}
              </h1>
              <p className="text-xs font-semibold text-slate-400 mt-1 flex items-center gap-1">
                <span>{t.dashboard}</span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="text-slate-600">{t.reportsAnalytics}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm shadow-emerald-500/20 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export Excel (.CSV)</span>
              </button>

              <button
                onClick={handlePrint}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print PDF Report</span>
              </button>
            </div>
          </div>

          {/* Multi-Agency Custom Checkbox Selector Widget */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Select Agencies for Multi-Agency Consolidated Report Matrix
                </h3>
              </div>
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">
                {selectedAgencies.length} Agencies Selected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {availableAgencies.map((agency) => {
                const isSelected = selectedAgencies.includes(agency.id);
                return (
                  <div
                    key={agency.id}
                    onClick={() => toggleAgency(agency.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-500 shadow-2xs'
                        : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 leading-tight">{agency.name}</p>
                      <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{agency.location}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle space-y-4">
            {/* Module Category Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold text-slate-600 border-b border-slate-100">
              {[
                { id: 'ALL', label: 'All Transactions' },
                { id: 'HARVEST_PURCHASE', label: '🌾 Harvest Purchases' },
                { id: 'FARMER_PAYMENT', label: '💳 Farmer Payments' },
                { id: 'TRADER_SUPPLY', label: '📦 Trader Supplies' },
                { id: 'WORKER_WAGES', label: '👷 Worker Wages' },
                { id: 'B2B_SALES', label: '🏬 Corporate Sales' },
                { id: 'EXPENSE', label: '💸 Business Expenses' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveModule(tab.id)}
                  className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                    activeModule === tab.id
                      ? 'bg-blue-600 text-white font-black shadow-xs'
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Sub-Filters: Search, Status & Column Picker */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative w-full md:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search party, bill no, item..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  <option value="ALL">All Payment Statuses</option>
                  <option value="PAID">PAID (पूर्ण)</option>
                  <option value="PARTIAL">PARTIAL (अंशतः)</option>
                  <option value="UNPAID">UNPAID (प्रलंबित)</option>
                </select>
              </div>

              {/* Column Selector Button & Dropdown */}
              <div className="relative w-full md:w-auto flex justify-end">
                <button
                  onClick={() => setIsColumnPickerOpen(!isColumnPickerOpen)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-blue-600" />
                  <span>Custom Columns ({Object.values(columns).filter(Boolean).length}/9)</span>
                </button>

                {isColumnPickerOpen && (
                  <div className="absolute right-0 top-10 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 space-y-2 z-30 animate-in fade-in zoom-in-95">
                    <h4 className="text-xs font-extrabold text-slate-900 border-b border-slate-100 pb-2">
                      Toggle Report Columns
                    </h4>
                    {Object.keys(columns).map((key) => (
                      <label key={key} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 p-1 rounded-lg">
                        <input
                          type="checkbox"
                          checked={(columns as any)[key]}
                          onChange={(e) => setColumns({ ...columns, [key]: e.target.checked })}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Matrix Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-subtle overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs font-extrabold text-slate-700 flex items-center gap-2">
                <Table className="w-4 h-4 text-blue-600" />
                <span>Custom Query Matrix ({filteredData.length} Records Found)</span>
              </span>
              <span className="text-[11px] font-bold text-slate-400">Click any row to open record summary</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    {columns.date && <th className="p-3">Date</th>}
                    {columns.refNo && <th className="p-3">Ref Bill No</th>}
                    {columns.partyName && <th className="p-3">Party Name</th>}
                    {columns.category && <th className="p-3">Item / Category</th>}
                    {columns.weight && <th className="p-3">Qty / Weight</th>}
                    {columns.totalAmount && <th className="p-3 text-right">Total Amount</th>}
                    {columns.paidAmount && <th className="p-3 text-right">Paid Amount</th>}
                    {columns.dueAmount && <th className="p-3 text-right">Due Balance</th>}
                    {columns.status && <th className="p-3 text-center">Status</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {filteredData.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400 font-semibold">
                        No transactions match your custom query filter.
                      </td>
                    </tr>
                  ) : (
                    filteredData.map((r, idx) => (
                      <tr key={r.id || idx} className="hover:bg-blue-50/40 transition-colors cursor-pointer">
                        {columns.date && <td className="p-3 font-semibold text-slate-600">{r.date}</td>}
                        {columns.refNo && (
                          <td className="p-3 font-mono font-bold text-blue-700">{r.refNo}</td>
                        )}
                        {columns.partyName && <td className="p-3 font-extrabold text-slate-900">{r.partyName}</td>}
                        {columns.category && <td className="p-3 text-slate-600">{r.category}</td>}
                        {columns.weight && <td className="p-3 font-semibold text-slate-600">{r.weight}</td>}
                        {columns.totalAmount && (
                          <td className="p-3 text-right font-black text-slate-900">
                            ₹{r.totalAmount.toLocaleString('en-IN')}
                          </td>
                        )}
                        {columns.paidAmount && (
                          <td className="p-3 text-right font-bold text-emerald-600">
                            ₹{r.paidAmount.toLocaleString('en-IN')}
                          </td>
                        )}
                        {columns.dueAmount && (
                          <td className="p-3 text-right font-bold text-amber-600">
                            ₹{r.dueAmount.toLocaleString('en-IN')}
                          </td>
                        )}
                        {columns.status && (
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                r.paymentStatus === 'PAID'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : r.paymentStatus === 'PARTIAL'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                            >
                              {r.paymentStatus}
                            </span>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
