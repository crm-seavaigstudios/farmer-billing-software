"use client";

import React, { useState } from 'react';
import {
  Wallet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Filter,
  Users,
  ChevronDown,
  ArrowUpRight
} from 'lucide-react';

export type TimelineFilter = 'TODAY' | 'WEEK' | 'MONTH' | 'SEASON' | 'CUSTOM';

interface FinancialSummaryBarProps {
  totalAdvance: number;
  totalPaid: number;
  paidFarmersCount: number;
  totalUnpaid: number;
  unpaidFarmersCount: number;
  totalOutstanding: number;
  outstandingFarmersCount: number;
  onTimelineChange: (filter: TimelineFilter, startDate?: string, endDate?: string) => void;
  onCategoryClick: (category: 'ADVANCE' | 'PAID' | 'UNPAID' | 'OUTSTANDING') => void;
}

export const FinancialSummaryBar: React.FC<FinancialSummaryBarProps> = ({
  totalAdvance,
  totalPaid,
  paidFarmersCount,
  totalUnpaid,
  unpaidFarmersCount,
  totalOutstanding,
  outstandingFarmersCount,
  onTimelineChange,
  onCategoryClick,
}) => {
  const [activeTimeline, setActiveTimeline] = useState<TimelineFilter>('MONTH');
  const [showCustomDates, setShowCustomDates] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSelectTimeline = (filter: TimelineFilter) => {
    setActiveTimeline(filter);
    if (filter === 'CUSTOM') {
      setShowCustomDates(true);
    } else {
      setShowCustomDates(false);
      onTimelineChange(filter);
    }
  };

  const handleApplyCustomDates = () => {
    if (startDate && endDate) {
      onTimelineChange('CUSTOM', startDate, endDate);
    }
  };

  return (
    <div className="space-y-4 font-sans">
      {/* TIMELINE FILTER CONTROL BAR */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-black text-white uppercase tracking-wider">Timeline Filter:</span>
        </div>

        {/* Timeline Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/80 p-1 rounded-xl border border-slate-700/60">
          <button
            type="button"
            onClick={() => handleSelectTimeline('TODAY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTimeline === 'TODAY' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Today (आज)
          </button>

          <button
            type="button"
            onClick={() => handleSelectTimeline('WEEK')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTimeline === 'WEEK' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            This Week (या आठवड्यात)
          </button>

          <button
            type="button"
            onClick={() => handleSelectTimeline('MONTH')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTimeline === 'MONTH' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            This Month (या महिन्यात)
          </button>

          <button
            type="button"
            onClick={() => handleSelectTimeline('SEASON')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTimeline === 'SEASON' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Season 2026 (हंगाम)
          </button>

          <button
            type="button"
            onClick={() => handleSelectTimeline('CUSTOM')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTimeline === 'CUSTOM' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Custom Range...
          </button>
        </div>

        {/* Custom Date Pickers */}
        {showCustomDates && (
          <div className="flex items-center gap-2 bg-slate-900/90 p-2 rounded-xl border border-blue-500/40">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-slate-800 text-white text-xs px-2 py-1 rounded border border-slate-700"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-slate-800 text-white text-xs px-2 py-1 rounded border border-slate-700"
            />
            <button
              onClick={handleApplyCustomDates}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* 4 INTERACTIVE FINANCIAL SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Advance */}
        <div
          onClick={() => onCategoryClick('ADVANCE')}
          className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-blue-500/50 rounded-2xl p-4 cursor-pointer transition-all hover:scale-102 shadow-lg group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition-colors" />
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Advance Issued (अ‍ॅडव्हान्स)</p>
            <p className="text-xl font-black text-white mt-0.5">₹{totalAdvance.toLocaleString('en-IN')}</p>
            <p className="text-[10px] font-semibold text-blue-400 mt-1 flex items-center gap-1">
              <Users className="w-3 h-3" />
              Click to view advance list
            </p>
          </div>
        </div>

        {/* Card 2: Total Paid */}
        <div
          onClick={() => onCategoryClick('PAID')}
          className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-emerald-500/50 rounded-2xl p-4 cursor-pointer transition-all hover:scale-102 shadow-lg group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Paid Amount (दिलेली रक्कम)</p>
            <p className="text-xl font-black text-emerald-400 mt-0.5">₹{totalPaid.toLocaleString('en-IN')}</p>
            <p className="text-[10px] font-bold text-slate-300 mt-1 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full w-fit">
              <Users className="w-3 h-3 text-emerald-400" />
              For {paidFarmersCount} Farmers (शेतकरी)
            </p>
          </div>
        </div>

        {/* Card 3: Total Unpaid */}
        <div
          onClick={() => onCategoryClick('UNPAID')}
          className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-rose-500/50 rounded-2xl p-4 cursor-pointer transition-all hover:scale-102 shadow-lg group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 transition-colors" />
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Unpaid Bills (प्रलंबित बिल)</p>
            <p className="text-xl font-black text-rose-400 mt-0.5">₹{totalUnpaid.toLocaleString('en-IN')}</p>
            <p className="text-[10px] font-bold text-slate-300 mt-1 flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full w-fit">
              <Users className="w-3 h-3 text-rose-400" />
              For {unpaidFarmersCount} Farmers (शेतकरी)
            </p>
          </div>
        </div>

        {/* Card 4: Net Outstanding */}
        <div
          onClick={() => onCategoryClick('OUTSTANDING')}
          className="bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 rounded-2xl p-4 cursor-pointer transition-all hover:scale-102 shadow-lg group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Net Outstanding (बाकी देय)</p>
            <p className="text-xl font-black text-amber-400 mt-0.5">₹{totalOutstanding.toLocaleString('en-IN')}</p>
            <p className="text-[10px] font-bold text-slate-300 mt-1 flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full w-fit">
              <Users className="w-3 h-3 text-amber-400" />
              For {outstandingFarmersCount} Farmers (शेतकरी)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
