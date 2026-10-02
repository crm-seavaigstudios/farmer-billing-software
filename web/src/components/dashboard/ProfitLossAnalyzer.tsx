"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import {
  apiGetPurchases,
  apiGetSales,
  apiGetExpenses,
  apiGetWorkers,
  apiGetAllFarmerMaterials,
  apiGetTraders,
  getTenantId
} from '@/lib/api';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  ShoppingBag,
  Tag,
  Truck,
  Users,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  ShieldCheck,
  Percent,
  Sliders,
  Building2,
  Receipt,
  CheckSquare,
  Square,
  PlusCircle,
  MinusCircle,
  Clock,
  Printer,
  FileSpreadsheet,
  Check
} from 'lucide-react';

export const ProfitLossAnalyzer: React.FC = () => {
  const { language } = useLanguage();
  
  // Custom Timeline States
  const [timeline, setTimeline] = useState<'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_MONTH' | 'FY' | 'CUSTOM'>('THIS_MONTH');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  // Component Toggles (Checkboxes)
  const [includeSales, setIncludeSales] = useState<boolean>(true);
  const [includeMaterialsIssued, setIncludeMaterialsIssued] = useState<boolean>(true);
  const [includeFarmerPurchases, setIncludeFarmerPurchases] = useState<boolean>(true);
  const [includeWorkerWages, setIncludeWorkerWages] = useState<boolean>(true);
  const [includeExpenses, setIncludeExpenses] = useState<boolean>(true);
  const [includeTraderSupplies, setIncludeTraderSupplies] = useState<boolean>(true);

  // Custom Adjustments
  const [customIncome, setCustomIncome] = useState<number>(0);
  const [customIncomeNote, setCustomIncomeNote] = useState<string>('');
  const [customExpense, setCustomExpense] = useState<number>(0);
  const [customExpenseNote, setCustomExpenseNote] = useState<string>('');

  // Data States
  const [purchases, setPurchases] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [farmerMaterials, setFarmerMaterials] = useState<any[]>([]);
  const [traders, setTraders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      const [pData, sData, eData, wData, mData, tData] = await Promise.all([
        apiGetPurchases(),
        apiGetSales(),
        apiGetExpenses(),
        apiGetWorkers(),
        apiGetAllFarmerMaterials(),
        apiGetTraders(),
      ]);
      setPurchases(Array.isArray(pData) ? pData : []);
      setSales(Array.isArray(sData) ? sData : []);
      setExpenses(Array.isArray(eData) ? eData : []);
      setWorkers(Array.isArray(wData) ? wData : []);
      setFarmerMaterials(Array.isArray(mData) ? mData : []);
      setTraders(Array.isArray(tData) ? tData : []);
    } catch (err) {
      console.error('Error loading P&L data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinancialData();
    const handleSync = () => loadFinancialData();
    if (typeof window !== 'undefined') {
      window.addEventListener('purchases_changed', handleSync);
      window.addEventListener('sales_changed', handleSync);
      window.addEventListener('expenses_changed', handleSync);
      window.addEventListener('payments_changed', handleSync);
      window.addEventListener('farmer_materials_changed', handleSync);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('purchases_changed', handleSync);
        window.removeEventListener('sales_changed', handleSync);
        window.removeEventListener('expenses_changed', handleSync);
        window.removeEventListener('payments_changed', handleSync);
        window.removeEventListener('farmer_materials_changed', handleSync);
      }
    };
  }, []);

  // Universal Robust Date Filter Matcher
  const isDateInTimeline = (rawDate: any): boolean => {
    if (!rawDate) return false;
    let d: Date | null = null;
    const str = String(rawDate).trim();

    if (str.includes('T')) {
      d = new Date(str);
    } else if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
    } else if (str.includes('-')) {
      const parts = str.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        } else {
          d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        }
      }
    }

    if (!d || isNaN(d.getTime())) {
      d = new Date(str);
      if (isNaN(d.getTime())) return false;
    }

    const now = new Date();
    const itemYear = d.getFullYear();
    const itemMonth = d.getMonth();
    const itemDay = d.getDate();

    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth();
    const nowDay = now.getDate();

    if (timeline === 'TODAY') {
      return itemYear === nowYear && itemMonth === nowMonth && itemDay === nowDay;
    }

    if (timeline === 'YESTERDAY') {
      const yesterday = new Date(nowYear, nowMonth, nowDay - 1);
      return itemYear === yesterday.getFullYear() && itemMonth === yesterday.getMonth() && itemDay === yesterday.getDate();
    }

    if (timeline === 'THIS_WEEK') {
      const dayOfWeek = now.getDay();
      const diff = nowDay - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const startOfWeek = new Date(nowYear, nowMonth, diff, 0, 0, 0, 0);
      return d.getTime() >= startOfWeek.getTime();
    }

    if (timeline === 'THIS_MONTH') {
      return itemYear === nowYear && itemMonth === nowMonth;
    }

    if (timeline === 'LAST_MONTH') {
      const lastMonth = nowMonth === 0 ? 11 : nowMonth - 1;
      const lastMonthYear = nowMonth === 0 ? nowYear - 1 : nowYear;
      return itemYear === lastMonthYear && itemMonth === lastMonth;
    }

    if (timeline === 'FY') {
      // Indian Financial Year: April to March
      const fyStartYear = nowMonth >= 3 ? nowYear : nowYear - 1;
      const fyStart = new Date(fyStartYear, 3, 1, 0, 0, 0, 0);
      const fyEnd = new Date(fyStartYear + 1, 2, 31, 23, 59, 59, 999);
      return d.getTime() >= fyStart.getTime() && d.getTime() <= fyEnd.getTime();
    }

    if (timeline === 'CUSTOM') {
      if (!customStartDate && !customEndDate) return true;
      const tTime = d.getTime();
      const sTime = customStartDate ? new Date(customStartDate).getTime() : 0;
      const eTime = customEndDate ? new Date(`${customEndDate}T23:59:59`).getTime() : Infinity;
      return tTime >= sTime && tTime <= eTime;
    }

    return true;
  };

  const parseNum = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    return parseFloat(String(val).replace(/[^0-9.-]+/g, '')) || 0;
  };

  // Filtered lists
  const filteredPurchases = useMemo(() => purchases.filter((p) => isDateInTimeline(p.date || p.purchaseDate || p.createdAt)), [purchases, timeline, customStartDate, customEndDate]);
  const filteredSales = useMemo(() => sales.filter((s) => isDateInTimeline(s.date || s.saleDate || s.createdAt)), [sales, timeline, customStartDate, customEndDate]);
  const filteredExpenses = useMemo(() => expenses.filter((e) => isDateInTimeline(e.date || e.createdAt)), [expenses, timeline, customStartDate, customEndDate]);
  const filteredMaterials = useMemo(() => farmerMaterials.filter((m) => isDateInTimeline(m.date || m.createdAt)), [farmerMaterials, timeline, customStartDate, customEndDate]);

  // Calculations
  const salesRevenue = useMemo(() => {
    return filteredSales.reduce((acc, s) => {
      const amt = s.netAmount ?? s.totalAmount ?? s.amount ?? (parseNum(s.weight) * parseNum(s.rate));
      return acc + parseNum(amt);
    }, 0);
  }, [filteredSales]);

  const materialsIssuedRevenue = useMemo(() => {
    return filteredMaterials.reduce((acc, m) => {
      const amt = m.totalPrice ?? m.totalAmount ?? m.amount ?? (parseNum(m.quantity) * parseNum(m.unitPrice));
      return acc + parseNum(amt);
    }, 0);
  }, [filteredMaterials]);

  const farmerPurchasesCost = useMemo(() => {
    return filteredPurchases.reduce((acc, p) => {
      const amt = p.totalAmount ?? p.amount ?? (parseNum(p.weight) * parseNum(p.rate));
      return acc + parseNum(amt);
    }, 0);
  }, [filteredPurchases]);

  const workerWagesCost = useMemo(() => {
    return workers.reduce((acc, w) => {
      const amt = w.totalEarned ?? w.outstandingBalance ?? w.dailyWage ?? 0;
      return acc + parseNum(amt);
    }, 0);
  }, [workers]);

  const dailyExpensesCost = useMemo(() => {
    return filteredExpenses.reduce((acc, e) => {
      const amt = e.amount ?? 0;
      return acc + parseNum(amt);
    }, 0);
  }, [filteredExpenses]);

  const traderSuppliesCost = useMemo(() => {
    return traders.reduce((acc, t) => {
      const amt = t.totalSupplied ?? t.totalPurchased ?? t.totalAmount ?? 0;
      return acc + parseNum(amt);
    }, 0);
  }, [traders]);

  // Aggregate Totals based on Checkboxes & Custom Adjustments
  const totalInflows = useMemo(() => {
    let sum = 0;
    if (includeSales) sum += salesRevenue;
    if (includeMaterialsIssued) sum += materialsIssuedRevenue;
    sum += Number(customIncome || 0);
    return sum;
  }, [includeSales, salesRevenue, includeMaterialsIssued, materialsIssuedRevenue, customIncome]);

  const totalOutflows = useMemo(() => {
    let sum = 0;
    if (includeFarmerPurchases) sum += farmerPurchasesCost;
    if (includeWorkerWages) sum += workerWagesCost;
    if (includeExpenses) sum += dailyExpensesCost;
    if (includeTraderSupplies) sum += traderSuppliesCost;
    sum += Number(customExpense || 0);
    return sum;
  }, [
    includeFarmerPurchases,
    farmerPurchasesCost,
    includeWorkerWages,
    workerWagesCost,
    includeExpenses,
    dailyExpensesCost,
    includeTraderSupplies,
    traderSuppliesCost,
    customExpense
  ]);

  const netProfitOrLoss = totalInflows - totalOutflows;
  const profitMarginPercent = totalInflows > 0 ? (netProfitOrLoss / totalInflows) * 100 : 0;
  const isProfitable = netProfitOrLoss >= 0;

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-5 md:p-7 shadow-xs space-y-6 font-sans">
      
      {/* Top Header & Timeline Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                {language === 'mr' ? 'दैनिक नफा-तोटा व मार्जिन ॲनालायझर' : 'Tenant Real-time Profit & Loss Analyzer'}
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {language === 'mr' ? 'अचूक व्यवसाय सूत्र' : 'Live Business Engine'}
                </span>
              </h2>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                {language === 'mr'
                  ? 'नफा/तोटा = (विक्री + दिलेले साहित्य) - (खरेदी + मजुरी + खर्च + व्यापारी साहित्य) ± सानुकूल रक्कम.'
                  : 'Profit/Loss = (Sales + Materials Issued) - (Purchases + Wages + Expenses + Trader Cost) ± Custom.'}
              </p>
            </div>
          </div>
        </div>

        {/* Timeline Quick Selector */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          {[
            { id: 'TODAY', labelMr: 'आज', labelEn: 'Today' },
            { id: 'YESTERDAY', labelMr: 'काल', labelEn: 'Yesterday' },
            { id: 'THIS_WEEK', labelMr: 'हा आठवडा', labelEn: 'Week' },
            { id: 'THIS_MONTH', labelMr: 'चालू महिना', labelEn: 'This Month' },
            { id: 'LAST_MONTH', labelMr: 'मागील महिना', labelEn: 'Last Month' },
            { id: 'FY', labelMr: 'आर्थिक वर्ष', labelEn: 'FY' },
            { id: 'CUSTOM', labelMr: '📅 सानुकूल', labelEn: '📅 Custom' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTimeline(t.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                timeline === t.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
              }`}
            >
              {language === 'mr' ? t.labelMr : t.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Range Picker when CUSTOM is selected */}
      {timeline === 'CUSTOM' && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center gap-4 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-700">सुरुवातीची तारीख:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-700">शेवटची तारीख:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Top KPI Banner Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Inflows */}
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">
              🟢 {language === 'mr' ? 'एकूण आवक / महसूल (Revenue)' : 'Total Inflows'}
            </span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-950 mt-2">
            ₹{totalInflows.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1">
            {language === 'mr' ? 'विक्री + शेतकऱ्यांना दिलेले साहित्य' : 'Sales Dispatches + Farmer Materials'}
          </p>
        </div>

        {/* Total Outflows */}
        <div className="bg-rose-50/80 border border-rose-200 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-rose-800 uppercase tracking-wider">
              🔴 {language === 'mr' ? 'एकूण खर्च / जावक (Costs)' : 'Total Costs'}
            </span>
            <ArrowDownRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-950 mt-2">
            ₹{totalOutflows.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-rose-700 font-semibold mt-1">
            {language === 'mr' ? 'खरेदी + मजुरी + खर्च + सप्लाय माल' : 'Purchases + Wages + Expenses + Traders'}
          </p>
        </div>

        {/* Net Profit or Loss */}
        <div className={`border rounded-2xl p-4 sm:p-5 ${
          isProfitable ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-emerald-500 shadow-md shadow-emerald-500/10' : 'bg-gradient-to-br from-rose-600 to-red-700 text-white border-rose-500 shadow-md shadow-rose-500/10'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-white/90">
              🏆 {isProfitable ? (language === 'mr' ? 'निव्वळ नफा (Net Profit)' : 'Net Profit') : (language === 'mr' ? 'निव्वळ तोटा (Net Loss)' : 'Net Loss')}
            </span>
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-white/20">
              {profitMarginPercent.toFixed(1)}% {language === 'mr' ? 'मार्जिन' : 'Margin'}
            </span>
          </div>
          <div className="text-2xl font-black text-white mt-2">
            ₹{Math.abs(netProfitOrLoss).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-white/80 font-semibold mt-1">
            {isProfitable
              ? (language === 'mr' ? '✓ व्यवसाय उत्तम नफ्यात आहे.' : 'Profitable Operation')
              : (language === 'mr' ? '⚠ खर्च उत्पन्नापेक्षा जास्त आहे.' : 'Operating at a Loss')}
          </p>
        </div>
      </div>

      {/* Interactive Component Checkbox Selectors & Drill-downs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* REVENUE INFLOWS CHECKBOXES */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>१. आवक घटक (Revenue Inflows)</span>
            </h3>
            <span className="text-xs font-black text-emerald-700">
              ₹{totalInflows.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="space-y-3">
            {/* Sales Revenue */}
            <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={includeSales}
                  onChange={(e) => setIncludeSales(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    {language === 'mr' ? 'विक्री उत्पन्न (Sales Dispatches)' : 'Sales Revenue'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {filteredSales.length} {language === 'mr' ? 'गाड्या/पावत्या' : 'dispatches'}
                  </span>
                </div>
              </div>
              <span className={`text-xs font-black ${includeSales ? 'text-emerald-700' : 'text-slate-400 line-through'}`}>
                ₹{salesRevenue.toLocaleString('en-IN')}
              </span>
            </label>

            {/* Farmer Materials Issued */}
            <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={includeMaterialsIssued}
                  onChange={(e) => setIncludeMaterialsIssued(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    {language === 'mr' ? 'शेतकऱ्यांना दिलेले खते व साहित्य' : 'Material Supplies to Farmers'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {filteredMaterials.length} {language === 'mr' ? 'नोंदी' : 'items issued'}
                  </span>
                </div>
              </div>
              <span className={`text-xs font-black ${includeMaterialsIssued ? 'text-emerald-700' : 'text-slate-400 line-through'}`}>
                ₹{materialsIssuedRevenue.toLocaleString('en-IN')}
              </span>
            </label>

            {/* Custom Income Adjustment Input */}
            <div className="p-3 bg-white rounded-xl border border-dashed border-emerald-300 space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-emerald-800">
                <span className="flex items-center gap-1.5">
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{language === 'mr' ? '+ सानुकूल अतिरिक्त जमा (Custom Income):' : '+ Custom Extra Income:'}</span>
                </span>
                <input
                  type="number"
                  placeholder="₹ 0"
                  value={customIncome || ''}
                  onChange={(e) => setCustomIncome(parseFloat(e.target.value) || 0)}
                  className="w-28 text-right bg-emerald-50 border border-emerald-300 rounded-lg px-2 py-1 text-xs font-black text-emerald-900 focus:outline-none"
                />
              </div>
              <input
                type="text"
                placeholder={language === 'mr' ? 'उदा. गोदाम भाडे, इतर कमिशन तपशील...' : 'Note: e.g. Warehouse Rent, Commission...'}
                value={customIncomeNote}
                onChange={(e) => setCustomIncomeNote(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] font-medium text-slate-700 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* COST OUTFLOWS CHECKBOXES */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="text-xs font-black text-rose-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>२. जावक व खर्च घटक (Operating Costs)</span>
            </h3>
            <span className="text-xs font-black text-rose-700">
              ₹{totalOutflows.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="space-y-3">
            {/* Farmer Purchases Cost */}
            <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={includeFarmerPurchases}
                  onChange={(e) => setIncludeFarmerPurchases(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    {language === 'mr' ? 'शेतकरी खरेदी पावती खर्च' : 'Farmer Purchases Cost'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {filteredPurchases.length} {language === 'mr' ? 'पावत्या' : 'bills'}
                  </span>
                </div>
              </div>
              <span className={`text-xs font-black ${includeFarmerPurchases ? 'text-rose-700' : 'text-slate-400 line-through'}`}>
                ₹{farmerPurchasesCost.toLocaleString('en-IN')}
              </span>
            </label>

            {/* Worker Wages Paid */}
            <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={includeWorkerWages}
                  onChange={(e) => setIncludeWorkerWages(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    {language === 'mr' ? 'कामगार मजुरी हिशोब' : 'Daily Worker Wages'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {workers.length} {language === 'mr' ? 'कामगार' : 'workers'}
                  </span>
                </div>
              </div>
              <span className={`text-xs font-black ${includeWorkerWages ? 'text-rose-700' : 'text-slate-400 line-through'}`}>
                ₹{workerWagesCost.toLocaleString('en-IN')}
              </span>
            </label>

            {/* Daily Expenses */}
            <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={includeExpenses}
                  onChange={(e) => setIncludeExpenses(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    {language === 'mr' ? 'दुकान व कार्यालय खर्च (Expenses)' : 'General Operating Expenses'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {filteredExpenses.length} {language === 'mr' ? 'खर्च नोंदी' : 'vouchers'}
                  </span>
                </div>
              </div>
              <span className={`text-xs font-black ${includeExpenses ? 'text-rose-700' : 'text-slate-400 line-through'}`}>
                ₹{dailyExpensesCost.toLocaleString('en-IN')}
              </span>
            </label>

            {/* Trader Material Supplies Cost */}
            <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={includeTraderSupplies}
                  onChange={(e) => setIncludeTraderSupplies(e.target.checked)}
                  className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 block">
                    {language === 'mr' ? 'व्यापाऱ्यांकडून खरेदी माल (Supplies)' : 'Trader Material Purchases'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {traders.length} {language === 'mr' ? 'सप्लायर्स' : 'traders'}
                  </span>
                </div>
              </div>
              <span className={`text-xs font-black ${includeTraderSupplies ? 'text-rose-700' : 'text-slate-400 line-through'}`}>
                ₹{traderSuppliesCost.toLocaleString('en-IN')}
              </span>
            </label>

            {/* Custom Expense Adjustment Input */}
            <div className="p-3 bg-white rounded-xl border border-dashed border-rose-300 space-y-2">
              <div className="flex items-center justify-between text-xs font-black text-rose-800">
                <span className="flex items-center gap-1.5">
                  <MinusCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>{language === 'mr' ? '- सानुकूल अतिरिक्त खर्च (Custom Cost):' : '- Custom Extra Expense:'}</span>
                </span>
                <input
                  type="number"
                  placeholder="₹ 0"
                  value={customExpense || ''}
                  onChange={(e) => setCustomExpense(parseFloat(e.target.value) || 0)}
                  className="w-28 text-right bg-rose-50 border border-rose-300 rounded-lg px-2 py-1 text-xs font-black text-rose-900 focus:outline-none"
                />
              </div>
              <input
                type="text"
                placeholder={language === 'mr' ? 'उदा. डिझेल, दुरुस्ती, व्याज...' : 'Note: e.g. Diesel, Repair, Interest...'}
                value={customExpenseNote}
                onChange={(e) => setCustomExpenseNote(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] font-medium text-slate-700 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Formula & Print / Export Action */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            {language === 'mr' ? 'अंतिम नफा-तोटा हिशोब सारांश' : 'Final Calculation Summary'}
          </span>
          <div className="text-sm font-black text-emerald-400 flex flex-wrap items-center gap-1.5">
            <span>आवक ₹{totalInflows.toLocaleString('en-IN')}</span>
            <span className="text-slate-500">-</span>
            <span className="text-rose-400">जावक ₹{totalOutflows.toLocaleString('en-IN')}</span>
            <span className="text-slate-500">=</span>
            <span className={isProfitable ? 'text-emerald-300 font-extrabold text-base' : 'text-rose-300 font-extrabold text-base'}>
              {isProfitable ? 'नफा' : 'तोटा'} ₹{Math.abs(netProfitOrLoss).toLocaleString('en-IN')} ({profitMarginPercent.toFixed(1)}%)
            </span>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 rounded-xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-md"
        >
          <Printer className="w-4 h-4 text-slate-700" />
          <span>{language === 'mr' ? 'P&L हिशोब प्रिंट करा' : 'Print P&L Report'}</span>
        </button>
      </div>

    </div>
  );
};
