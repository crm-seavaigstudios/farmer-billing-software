"use client";

import React from 'react';
import { UserPlus, ShoppingCart, IndianRupee, Tag, FileText, Plus } from 'lucide-react';

const actions = [
  { name: 'New Farmer', icon: UserPlus },
  { name: 'New Purchase', icon: ShoppingCart },
  { name: 'New Payment', icon: IndianRupee },
  { name: 'New Sale', icon: Tag },
  { name: 'New Expense', icon: FileText },
];

export const QuickActionsWidget: React.FC = () => {
  return (
    <div className="relative flex flex-col justify-between h-full">
      <div className="space-y-2.5">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.name}
              className="w-full bg-white border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/50 rounded-2xl p-3 shadow-subtle hover:shadow-card transition-all flex items-center justify-between group text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 group-hover:bg-blue-600 text-slate-600 group-hover:text-white flex items-center justify-center transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                  {act.name}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Floating Action Circle Button */}
      <div className="pt-3 flex justify-end">
        <button className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 transition-all cursor-pointer">
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
