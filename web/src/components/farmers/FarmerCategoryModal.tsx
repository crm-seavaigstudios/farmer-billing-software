"use client";

import React from 'react';
import { X, Users, Phone, MapPin, DollarSign, ChevronRight, Download } from 'lucide-react';

interface FarmerCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  categoryType: 'ADVANCE' | 'PAID' | 'UNPAID' | 'OUTSTANDING';
  farmers: any[];
}

export const FarmerCategoryModal: React.FC<FarmerCategoryModalProps> = ({
  isOpen,
  onClose,
  title,
  categoryType,
  farmers,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col justify-between max-h-[85vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">{title}</h2>
              <p className="text-xs font-semibold text-slate-400">Total {farmers.length} Farmers in this category</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-xl">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Table Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/70 text-slate-500 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Farmer Code</th>
                <th className="py-3 px-4">Farmer Name</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Village</th>
                <th className="py-3 px-4">Category Balance</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {farmers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                    No farmers found in this timeline category.
                  </td>
                </tr>
              ) : (
                farmers.map((f, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-black text-blue-600">{f.farmerIdCode || f.id}</td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{f.name}</td>
                    <td className="py-3.5 px-4 text-slate-600">{f.phone}</td>
                    <td className="py-3.5 px-4 text-slate-600">{f.village}</td>
                    <td className="py-3.5 px-4 font-extrabold text-slate-900">
                      {categoryType === 'PAID' && <span className="text-emerald-600">₹{(f.totalPaid || 10000).toLocaleString('en-IN')} Paid</span>}
                      {categoryType === 'UNPAID' && <span className="text-rose-600">₹{(f.dueAmount || 5000).toLocaleString('en-IN')} Unpaid</span>}
                      {categoryType === 'OUTSTANDING' && <span className="text-amber-600">₹{(f.outstandingAmount || 8000).toLocaleString('en-IN')} Outstanding</span>}
                      {categoryType === 'ADVANCE' && <span className="text-blue-600">₹{(f.advanceBalance || 10000).toLocaleString('en-IN')} Advance</span>}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={onClose}
                        className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        <span>View Passbook</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <button className="px-3 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-slate-50">
            <Download className="w-3.5 h-3.5" />
            Export Category Roster (CSV)
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
