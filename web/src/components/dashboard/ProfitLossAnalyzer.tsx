"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import {
  apiGetPurchases,
  apiGetSales,
  apiGetExpenses,
  apiGetPayments,
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
  RefreshCw
} from 'lucide-react';

export const ProfitLossAnalyzer: React.FC = () => {
  const { language } = useLanguage();
  const [timeline, setTimeline] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('TODAY');
  const [purchases, setPurchases] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      const [pData, sData, eData] = await Promise.all([
        apiGetPurchases(),
        apiGetSales(),
        apiGetExpenses(),
      ]);
      setPurchases(Array.isArray(pData) ? pData : []);
      setSales(Array.isArray(sData) ? sData : []);
      setExpenses(Array.isArray(eData) ? eData : []);
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
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('purchases_changed', handleSync);
        window.removeEventListener('sales_changed', handleSync);
        window.removeEventListener('expenses_changed', handleSync);
      }
    };
  }, []);

  // Filter by timeline
  const parseTimestamp = (item: any): number => {
    const raw = item.createdAt || item.date || item.purchaseDate || item.saleDate;
    if (!raw) return Date.now();
    const t = new Date(raw).getTime();
    return isNaN(t) ? Date.now() : t;
  };

  const filteredData = useMemo(() => {
    const now = new Date();
    let startTimestamp = 0;

    if (timeline === 'TODAY') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      startTimestamp = start.getTime();
    } else if (timeline === 'WEEK') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
      startTimestamp = start.getTime();
    } else if (timeline === 'MONTH') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      startTimestamp = start.getTime();
    } else {
      startTimestamp = 0; // ALL
    }

    const filterFn = (item: any) => parseTimestamp(item) >= startTimestamp;

    return {
      fPurchases: purchases.filter(filterFn),
      fSales: sales.filter(filterFn),
      fExpenses: expenses.filter(filterFn),
    };
  }, [purchases, sales, expenses, timeline]);

  // Calculations
  const parseNum = (val: any): number => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    return parseFloat(String(val).replace(/[^0-9.-]+/g, '')) || 0;
  };

  const totalSalesRevenue = useMemo(() => {
    return filteredData.fSales.reduce((acc, s) => {
      const amt = s.netAmount ?? s.totalAmount ?? s.amount ?? (parseNum(s.weight) * parseNum(s.rate));
      return acc + parseNum(amt);
    }, 0);
  }, [filteredData.fSales]);

  const totalPurchaseCost = useMemo(() => {
    return filteredData.fPurchases.reduce((acc, p) => {
      const amt = p.totalAmount ?? p.amount ?? (parseNum(p.weight) * parseNum(p.rate));
      return acc + parseNum(amt);
    }, 0);
  }, [filteredData.fPurchases]);

  const totalExpensesCost = useMemo(() => {
    return filteredData.fExpenses.reduce((acc, e) => {
      return acc + parseNum(e.amount);
    }, 0);
  }, [filteredData.fExpenses]);

  const totalOutflows = totalPurchaseCost + totalExpensesCost;
  const netProfit = totalSalesRevenue - totalOutflows;
  const isProfitable = netProfit >= 0;
  const marginPercentage = totalSalesRevenue > 0 ? ((netProfit / totalSalesRevenue) * 100) : 0;

  // Crop-wise breakdown
  const cropPerformance = useMemo(() => {
    const cropsMap: Record<string, { crop: string; sales: number; purchases: number; weightKg: number }> = {};

    filteredData.fPurchases.forEach((p) => {
      const cropName = p.crop || 'इतर माल';
      if (!cropsMap[cropName]) cropsMap[cropName] = { crop: cropName, sales: 0, purchases: 0, weightKg: 0 };
      const amt = p.totalAmount ?? p.amount ?? (parseNum(p.weight) * parseNum(p.rate));
      cropsMap[cropName].purchases += parseNum(amt);
      cropsMap[cropName].weightKg += parseNum(p.weight || p.totalWeight);
    });

    filteredData.fSales.forEach((s) => {
      const cropName = s.crop || 'इतर माल';
      if (!cropsMap[cropName]) cropsMap[cropName] = { crop: cropName, sales: 0, purchases: 0, weightKg: 0 };
      const amt = s.netAmount ?? s.totalAmount ?? s.amount ?? (parseNum(s.weight) * parseNum(s.rate));
      cropsMap[cropName].sales += parseNum(amt);
      cropsMap[cropName].weightKg += parseNum(s.weight || s.totalWeight);
    });

    return Object.values(cropsMap).map((c) => {
      const profit = c.sales - c.purchases;
      const margin = c.sales > 0 ? (profit / c.sales) * 100 : 0;
      return { ...c, profit, margin };
    }).sort((a, b) => b.sales - a.sales);
  }, [filteredData.fPurchases, filteredData.fSales]);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-5">
      {/* Header & Timeline Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${isProfitable ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-2">
              {language === 'mr' ? 'दैनंदिन निव्वळ नफा-तोटा विश्लेषण (P&L Margin Analyzer)' : 'Real-time Profit & Loss Analyzer'}
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${isProfitable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                {isProfitable ? (language === 'mr' ? '🟢 नफ्यात' : '🟢 Profitable') : (language === 'mr' ? '🔴 तोटा' : '🔴 In Loss')}
              </span>
            </h2>
            <p className="text-[11px] font-semibold text-slate-400">
              {language === 'mr'
                ? 'विक्री आवक वजा (शेतकरी खरेदी + गाडी भाडे + खर्च) = खरा निव्वळ नफा'
                : 'Sales Revenue minus (Procurement Cost + Freight + Expenses) = Real Net Profit'}
            </p>
          </div>
        </div>

        {/* Timeline Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'TODAY', labelEn: 'Today', labelMr: 'आज' },
            { id: 'WEEK', labelEn: 'This Week', labelMr: 'हा आठवडा' },
            { id: 'MONTH', labelEn: 'This Month', labelMr: 'हा महिना' },
            { id: 'ALL', labelEn: 'All Time', labelMr: 'संपूर्ण' },
          ].map((tTab) => (
            <button
              key={tTab.id}
              onClick={() => setTimeline(tTab.id as any)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeline === tTab.id
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {language === 'mr' ? tTab.labelMr : tTab.labelEn}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards: Inflows vs Outflows vs Net Margin */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Total Dispatches Sales (Inflow) */}
        <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
              {language === 'mr' ? '१. एकूण विक्री आवक (Sales)' : '1. Total Sales (Inflow)'}
            </span>
            <Tag className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-2">
            ₹{totalSalesRevenue.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-blue-600 font-semibold mt-0.5 block">
            {filteredData.fSales.length} {language === 'mr' ? 'मार्केट डिस्पॅच बिले' : 'Dispatches'}
          </span>
        </div>

        {/* 2. Total Outflows (Purchases + Expenses) */}
        <div className="p-3.5 bg-rose-50/60 border border-rose-100 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
              {language === 'mr' ? '२. एकूण खरेदी व खर्च (Outflow)' : '2. Purchases & Costs'}
            </span>
            <ShoppingBag className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-xl font-black text-slate-900 mt-2">
            ₹{totalOutflows.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-rose-600 font-semibold mt-0.5 block">
            खरेदी: ₹{totalPurchaseCost.toLocaleString('en-IN')} • खर्च: ₹{totalExpensesCost.toLocaleString('en-IN')}
          </span>
        </div>

        {/* 3. Net Margin & Profit */}
        <div className={`p-3.5 border rounded-xl ${isProfitable ? 'bg-emerald-50/80 border-emerald-200' : 'bg-rose-50/80 border-rose-200'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${isProfitable ? 'text-emerald-800' : 'text-rose-800'}`}>
              {language === 'mr' ? '३. निव्वळ नफा / नफा %' : '3. Real Net Profit'}
            </span>
            {isProfitable ? <ArrowUpRight className="w-4 h-4 text-emerald-600" /> : <ArrowDownRight className="w-4 h-4 text-rose-600" />}
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className={`text-xl font-black ${isProfitable ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isProfitable ? '+' : ''}₹{netProfit.toLocaleString('en-IN')}
            </p>
            <span className={`text-xs font-extrabold px-1.5 py-0.5 rounded ${isProfitable ? 'bg-emerald-200/60 text-emerald-900' : 'bg-rose-200/60 text-rose-900'}`}>
              {marginPercentage >= 0 ? '+' : ''}{marginPercentage.toFixed(1)}%
            </span>
          </div>
          <span className={`text-[10px] font-semibold mt-0.5 block ${isProfitable ? 'text-emerald-700' : 'text-rose-700'}`}>
            {isProfitable ? (language === 'mr' ? 'व्यवसाय फायद्यात चालू आहे' : 'Healthy Profit Margin') : (language === 'mr' ? 'खर्च विक्रीपेक्षा जास्त आहे' : 'Costs Exceed Sales')}
          </span>
        </div>
      </div>

      {/* Crop-Wise Profit Contribution Breakdown */}
      {cropPerformance.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span>{language === 'mr' ? 'पिकानिहाय नफा-तोटा विश्लेषण (Crop-wise Margins)' : 'Crop-wise Profit Contribution'}</span>
            <span className="text-[10px] text-slate-400 font-semibold">{cropPerformance.length} Crops Active</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {cropPerformance.slice(0, 4).map((cropItem) => {
              const itemProfit = cropItem.profit;
              const isItemPositive = itemProfit >= 0;

              return (
                <div key={cropItem.crop} className="bg-slate-50 border border-slate-200/70 p-3 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      🌾 {cropItem.crop}
                    </span>
                    <span className={`text-xs font-black ${isItemPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isItemPositive ? '+' : ''}₹{itemProfit.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mt-1.5">
                    <span>विक्री: ₹{cropItem.sales.toLocaleString('en-IN')}</span>
                    <span>खरेदी: ₹{cropItem.purchases.toLocaleString('en-IN')}</span>
                    <span className={isItemPositive ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                      {cropItem.margin.toFixed(1)}% Margin
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
