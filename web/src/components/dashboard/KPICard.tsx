"use client";

import React from 'react';
import { TrendingUp, TrendingDown, LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'up' | 'down';
  comparison: string;
  icon: LucideIcon;
  iconBgColor: string;
  iconTextColor: string;
  sparklineColor: string;
  sparklinePath: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  changeType,
  comparison,
  icon: Icon,
  iconBgColor,
  iconTextColor,
  sparklineColor,
  sparklinePath,
}) => {
  const isUp = changeType === 'up';

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle hover:shadow-card transition-all duration-200 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${iconBgColor} ${iconTextColor} flex items-center justify-center shadow-2xs`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-[11px] font-semibold text-slate-500">{title}</span>
      </div>

      <div className="space-y-1">
        <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">{value}</h3>

        <div className="flex items-center justify-between pt-1">
          <div className={`flex items-center gap-1 text-[11px] font-bold ${isUp ? 'text-emerald-600' : 'text-amber-600'}`}>
            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            <span>{change}</span>
            <span className="text-slate-400 font-normal text-[10px] ml-0.5">{comparison}</span>
          </div>

          {/* Sparkline mini chart */}
          <div className="w-16 h-6">
            <svg className="w-full h-full" viewBox="0 0 60 20">
              <path
                d={sparklinePath}
                fill="none"
                stroke={sparklineColor}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
