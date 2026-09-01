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
