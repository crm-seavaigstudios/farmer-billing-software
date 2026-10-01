"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import {
  apiGetPurchases,
  apiGetSales,
  apiGetExpenses,
  apiGetWorkers,
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
  Receipt
} from 'lucide-react';

export const ProfitLossAnalyzer: React.FC = () => {
  const { language } = useLanguage();
  const [calculationMode, setCalculationMode] = useState<'COMMISSION' | 'TRADING'>('COMMISSION');
  const [commissionRate, setCommissionRate] = useState<number>(3.0); // 3% default
  const [timeline, setTimeline] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('TODAY');

  const [purchases, setPurchases] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      const [pData, sData, eData, wData] = await Promise.all([
        apiGetPurchases(),
        apiGetSales(),
        apiGetExpenses(),
        apiGetWorkers(),
      ]);
      setPurchases(Array.isArray(pData) ? pData : []);
      setSales(Array.isArray(sData) ? sData : []);
      setExpenses(Array.isArray(eData) ? eData : []);
      setWorkers(Array.isArray(wData) ? wData : []);
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
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('purchases_changed', handleSync);
        window.removeEventListener('sales_changed', handleSync);
        window.removeEventListener('expenses_changed', handleSync);
        window.removeEventListener('payments_changed', handleSync);
      }
    };
  }, []);

  // Universal Robust Date Matcher
  const isDateInTimeline = (rawDate: any, filter: 'TODAY' | 'WEEK' | 'MONTH' | 'ALL'): boolean => {
    if (filter === 'ALL') return true;
    if (!rawDate) return false;

    let d: Date | null = null;
    const str = String(rawDate).trim();

    if (str.includes('T')) {
      d = new Date(str);
    } else if (str.includes('/')) {
      const parts = str.split('/');
      if (parts.length === 3) {
        // DD/MM/YYYY
        d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
    } else if (str.includes('-')) {
      const parts = str.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        } else {
          // DD-MM-YYYY
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

    if (filter === 'TODAY') {
      return itemYear === nowYear && itemMonth === nowMonth && itemDay === nowDay;
    }

    if (filter === 'WEEK') {
      const dayOfWeek = now.getDay();
      const diff = nowDay - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const startOfWeek = new Date(nowYear, nowMonth, diff, 0, 0, 0, 0);
      return d.getTime() >= startOfWeek.getTime();
    }

    if (filter === 'MONTH') {
      return itemYear === nowYear && itemMonth === nowMonth;
    }

    return true;
  };

  const filteredData = useMemo(() => {
    const filterFn = (item: any) => {
      const rawDate = item.date || item.purchaseDate || item.saleDate || item.createdAt;
      return isDateInTimeline(rawDate, timeline);
    };

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

  const totalPurchaseTurnover = useMemo(() => {
    return filteredData.fPurchases.reduce((acc, p) => {
      const amt = p.totalAmount ?? p.amount ?? (parseNum(p.weight) * parseNum(p.rate));
      return acc + parseNum(amt);
    }, 0);
  }, [filteredData.fPurchases]);

  const totalSalesRevenue = useMemo(() => {
    return filteredData.fSales.reduce((acc, s) => {
      const amt = s.netAmount ?? s.totalAmount ?? s.amount ?? (parseNum(s.weight) * parseNum(s.rate));
      return acc + parseNum(amt);
    }, 0);
  }, [filteredData.fSales]);

  const totalExpensesCost = useMemo(() => {
    return filteredData.fExpenses.reduce((acc, e) => {
      return acc + parseNum(e.amount);
    }, 0);
  }, [filteredData.fExpenses]);

  // Daily Workers wage estimate for active timeline
  const totalLaborCost = useMemo(() => {
    return workers.reduce((acc, w) => {
      const daily = parseNum(w.dailyRate || 350);
      return acc + (w.status === 'ACTIVE' && timeline === 'TODAY' ? daily : 0);
    }, 0);
  }, [workers, timeline]);

  // Financial Calculations for Commission vs Trading Mode
  const commissionIncome = (totalPurchaseTurnover * commissionRate) / 100;
  const estimatedHamaliMargin = filteredData.fPurchases.length * 150; // Average ₹150 margin per lot
  const grossAgencyIncome = commissionIncome + estimatedHamaliMargin;

  const netCommissionProfit = grossAgencyIncome - (totalExpensesCost + totalLaborCost);
  const netTradingProfit = totalSalesRevenue - (totalPurchaseTurnover + totalExpensesCost + totalLaborCost);

  const displayProfit = calculationMode === 'COMMISSION' ? netCommissionProfit : netTradingProfit;
  const isProfitable = displayProfit >= 0;

  const displayMarginPercent = calculationMode === 'COMMISSION'
    ? (grossAgencyIncome > 0 ? ((netCommissionProfit / grossAgencyIncome) * 100) : 0)
    : (totalSalesRevenue > 0 ? ((netTradingProfit / totalSalesRevenue) * 100) : 0);

  // Crop-Wise Turnover & Performance Breakdown
  const cropPerformance = useMemo(() => {
    const cropsMap: Record<string, { crop: string; turnover: number; commission: number; count: number }> = {};

    filteredData.fPurchases.forEach((p) => {
      const cropName = p.crop || 'इतर माल';
      if (!cropsMap[cropName]) cropsMap[cropName] = { crop: cropName, turnover: 0, commission: 0, count: 0 };
      const amt = p.totalAmount ?? p.amount ?? (parseNum(p.weight) * parseNum(p.rate));
      cropsMap[cropName].turnover += parseNum(amt);
      cropsMap[cropName].commission += (parseNum(amt) * commissionRate) / 100;
      cropsMap[cropName].count += 1;
    });

    return Object.values(cropsMap).sort((a, b) => b.turnover - a.turnover);
  }, [filteredData.fPurchases, commissionRate]);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-5">
      {/* Top Header: Switchers & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shadow-xs ${isProfitable ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              {language === 'mr' ? 'दैनंदिन निव्वळ नफा-तोटा विश्लेषण (Real-Time P&L)' : 'Daily Real-Time Profit & Loss Analyzer'}
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${isProfitable ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                {isProfitable ? (language === 'mr' ? '🟢 नफ्यात' : '🟢 Profitable') : (language === 'mr' ? '🔴 तोटा' : '🔴 Deficit')}
              </span>
            </h2>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">
              {calculationMode === 'COMMISSION'
                ? (language === 'mr' ? 'आडतदार मॉडेल: कमिशन उत्पन्न वजा (खर्च + मजुरी) = निव्वळ नफा' : 'Commission Model: Turnover % Revenue minus Expenses = Real Profit')
                : (language === 'mr' ? 'व्यापारी मॉडेल: विक्री आवक वजा (शेतकरी खरेदी + खर्च) = निव्वळ नफा' : 'Trading Model: Dispatches minus Purchases & Costs = Real Profit')}
            </p>
          </div>
        </div>

        {/* Controls: Mode Selector & Timeline */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setCalculationMode('COMMISSION')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                calculationMode === 'COMMISSION'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{language === 'mr' ? 'आडत कमिशन' : 'Agency Commission'}</span>
            </button>
            <button
              onClick={() => setCalculationMode('TRADING')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                calculationMode === 'TRADING'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>{language === 'mr' ? 'व्यापार मार्जिन' : 'Trading Margin'}</span>
            </button>
          </div>

          {/* Timeline Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            {[
              { id: 'TODAY', labelEn: 'Today', labelMr: 'आज' },
              { id: 'WEEK', labelEn: 'This Week', labelMr: 'हा आठवडा' },
              { id: 'MONTH', labelEn: 'This Month', labelMr: 'हा महिना' },
              { id: 'ALL', labelEn: 'All Time', labelMr: 'संपूर्ण' },
            ].map((tTab) => (
              <button
                key={tTab.id}
                onClick={() => setTimeline(tTab.id as any)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
      </div>

      {/* Commission Rate Slider (for Agency Commission Mode) */}
      {calculationMode === 'COMMISSION' && (
        <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-black text-slate-800">
              {language === 'mr' ? 'आडत / कमिशन दर (Commission Rate):' : 'Agency Commission Rate:'}
            </span>
            <span className="px-2 py-0.5 bg-blue-600 text-white rounded-lg text-xs font-black">
              {commissionRate}%
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {[2.0, 3.0, 4.0, 5.0, 6.0].map((rate) => (
              <button
                key={rate}
                onClick={() => setCommissionRate(rate)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  commissionRate === rate
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-white text-slate-700 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                {rate}%
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main KPI Flow Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Card 1: Gross Inflow / Turnover */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-600 uppercase tracking-wider">
              {calculationMode === 'COMMISSION'
                ? (language === 'mr' ? '१. एकूण आवक उलाढाल (Turnover)' : '1. Total Turnover (Purchases)')
                : (language === 'mr' ? '१. एकूण विक्री आवक (Dispatches)' : '1. Total Sales (Dispatches)')}
            </span>
            <ShoppingBag className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            ₹{(calculationMode === 'COMMISSION' ? totalPurchaseTurnover : totalSalesRevenue).toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
            {calculationMode === 'COMMISSION'
              ? `${filteredData.fPurchases.length} ${language === 'mr' ? 'शेतकरी पावत्या' : 'Purchases Recorded'}`
              : `${filteredData.fSales.length} ${language === 'mr' ? 'मार्केट डिस्पॅच बिले' : 'Dispatches'}`}
          </span>
        </div>

        {/* Card 2: Revenue / Outflows */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-600 uppercase tracking-wider">
              {calculationMode === 'COMMISSION'
                ? (language === 'mr' ? '२. कमिशन उत्पन्न (Gross Income)' : '2. एकूण खरेदी व खर्च (Outflows)')
                : (language === 'mr' ? '२. एकूण खरेदी व खर्च (Outflows)' : '2. Purchases + Expenses')}
            </span>
            <Receipt className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            ₹{(calculationMode === 'COMMISSION' ? grossAgencyIncome : (totalPurchaseTurnover + totalExpensesCost)).toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-slate-500 font-semibold mt-1 block">
            {calculationMode === 'COMMISSION'
              ? `कमिशन: ₹${commissionIncome.toLocaleString('en-IN')} • खर्च: ₹${totalExpensesCost.toLocaleString('en-IN')}`
              : `खरेदी: ₹${totalPurchaseTurnover.toLocaleString('en-IN')} • खर्च: ₹${totalExpensesCost.toLocaleString('en-IN')}`}
          </span>
        </div>

        {/* Card 3: Real Net Profit */}
        <div className={`p-4 border rounded-2xl ${isProfitable ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-black uppercase tracking-wider ${isProfitable ? 'text-emerald-800' : 'text-rose-800'}`}>
              {language === 'mr' ? '३. खरा निव्वळ नफा (Net Profit)' : '3. Real Net Profit'}
            </span>
            {isProfitable ? <ArrowUpRight className="w-5 h-5 text-emerald-600" /> : <ArrowDownRight className="w-5 h-5 text-rose-600" />}
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <p className={`text-2xl font-black ${isProfitable ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isProfitable ? '+' : ''}₹{Math.round(displayProfit).toLocaleString('en-IN')}
            </p>
            <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${isProfitable ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-200 text-rose-900'}`}>
              {displayMarginPercent >= 0 ? '+' : ''}{displayMarginPercent.toFixed(1)}%
            </span>
          </div>
          <span className={`text-[11px] font-semibold mt-1 block ${isProfitable ? 'text-emerald-700' : 'text-rose-700'}`}>
            {isProfitable
              ? (language === 'mr' ? 'व्यवसाय फायद्यात चालू आहे ✅' : 'Healthy operating margin ✅')
              : (language === 'mr' ? 'खर्च उत्पन्नापेक्षा जास्त आहे ⚠️' : 'Expenses exceed income ⚠️')}
          </span>
        </div>
      </div>

      {/* Crop-Wise Turnover & Commission Breakdown */}
      {cropPerformance.length > 0 && (
        <div className="space-y-2.5 pt-3 border-t border-slate-100">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center justify-between">
            <span>{language === 'mr' ? 'पिकानिहाय उलाढाल व कमिशन (Crop-wise Breakdown)' : 'Crop-wise Turnover & Commission'}</span>
            <span className="text-[11px] text-slate-400 font-semibold">{cropPerformance.length} Crops Active</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cropPerformance.map((item) => (
              <div key={item.crop} className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    🌾 {item.crop}
                  </span>
                  <span className="text-xs font-black text-blue-700">
                    ₹{item.turnover.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold mt-2 pt-2 border-t border-slate-200/50">
                  <span>{item.count} {language === 'mr' ? 'पावत्या' : 'Lots'}</span>
                  <span className="text-emerald-700 font-bold">
                    कमिशन ({commissionRate}%): ₹{Math.round(item.commission).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
