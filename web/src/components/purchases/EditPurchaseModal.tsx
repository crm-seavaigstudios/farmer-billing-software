"use client";

import React, { useState, useEffect } from 'react';
import { X, Edit3 } from 'lucide-react';

interface EditPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: any;
  onEditPurchase: (purchase: any) => void;
}

export const EditPurchaseModal: React.FC<EditPurchaseModalProps> = ({
  isOpen,
  onClose,
  purchase,
  onEditPurchase,
}) => {
  const [crop, setCrop] = useState('');
  const [weight, setWeight] = useState<number>(0);
  const [unit, setUnit] = useState('KG');
  const [rate, setRate] = useState<number>(0);
  const [category, setCategory] = useState('');

  useEffect(() => {
    if (purchase) {
      setCrop(purchase.crop || '');
      const parsedWeight = parseFloat(purchase.weight) || 0;
      setWeight(parsedWeight);
      setUnit(purchase.unit || 'KG');
      const parsedRate = parseFloat(String(purchase.rate).replace(/[^0-9.-]+/g, '')) || 0;
      setRate(parsedRate);
      setCategory(purchase.category || '');
    }
  }, [purchase, isOpen]);

  if (!isOpen || !purchase) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const previousPaidAmount = parseFloat(String(purchase.paidAmount).replace(/[^0-9.-]+/g, '')) || 0;
    const newTotal = weight * rate;
    const newDue = Math.max(0, newTotal - previousPaidAmount);

    const updatedPurchase = {
      ...purchase,
      crop,
      weight: `${weight} ${unit}`,
      unit,
      category,
      rate: `₹${rate}/${unit}`,
      amount: `₹${newTotal.toLocaleString('en-IN')}`,
      dueAmount: `₹${newDue.toLocaleString('en-IN')}`,
      paymentStatus: newDue === 0 ? 'PAID' : (previousPaidAmount > 0 ? 'PARTIAL' : 'UNPAID')
    };

    onEditPurchase(updatedPurchase);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-in fade-in duration-150 text-xs">
      <div className="bg-white border border-slate-200/80 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col justify-between animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Edit Purchase Bill</h2>
              <p className="text-xs font-semibold text-slate-400">Bill ID: {purchase.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-slate-800">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Crop Type *</label>
            <input
              type="text"
              required
              value={crop}
              onChange={(e) => setCrop(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Weight / Qty *</label>
              <input
                type="number"
                min="1"
                required
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Rate per Unit (₹) *</label>
              <input
                type="number"
                min="1"
                required
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Packaging Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold focus:outline-none"
            />
          </div>

          {/* Breakdown Preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between font-bold">
              <span>Recalculated Gross Amount:</span>
              <span className="text-slate-900">₹{(weight * rate).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>Paid Offset Amount:</span>
              <span>₹{(parseFloat(String(purchase.paidAmount).replace(/[^0-9.-]+/g, '')) || 0).toLocaleString('en-IN')}</span>
            </div>
            <div className="h-px bg-slate-200" />
            <div className="flex items-center justify-between text-blue-700 font-extrabold">
              <span>New Outstanding Due:</span>
              <span>₹{Math.max(0, (weight * rate) - (parseFloat(String(purchase.paidAmount).replace(/[^0-9.-]+/g, '')) || 0)).toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-sm cursor-pointer"
            >
              Apply Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
