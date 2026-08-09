"use client";

import React from 'react';
import { ShoppingCart, CreditCard, UserPlus, FileText } from 'lucide-react';

const activities: any[] = [];

export const RecentActivitiesFeed: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-extrabold text-slate-800">Recent Activities</h3>
        <button className="text-blue-600 hover:text-blue-700 text-xs font-semibold hover:underline">
          View All
        </button>
      </div>

      <div className="space-y-3.5">
        {activities.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-full border ${item.bgColor} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 leading-snug">{item.title}</h4>
                  <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">{item.code}</span>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap">{item.time}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
