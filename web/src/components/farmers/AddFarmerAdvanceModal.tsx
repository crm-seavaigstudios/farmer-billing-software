"use client";

import React, { useState } from 'react';
import { X, DollarSign, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { apiCreatePayment, apiUpdateFarmerAdvance, getTenantId } from '@/lib/api';

interface AddFarmerAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmerId: string | null;
  farmerName?: string;
  onSuccess: () => void;
}

export function AddFarmerAdvanceModal({
  isOpen,
  onClose,
  farmerId,
  farmerName = 'Farmer',
  onSuccess,
}: AddFarmerAdvanceModalProps) {
  const [advanceAmount, setAdvanceAmount] = useState('5000');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [notes, setNotes] = useState('Pre-Harvest Crop Cash Advance');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !farmerId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const amountNum = Number(advanceAmount) || 0;

    await apiCreatePayment({
      farmerId,
      amount: amountNum,
      paymentMode,
      paymentType: 'PRE_HARVEST_ADVANCE',
      notes,
    });

    // Update database & tenant-specific local cache
    await apiUpdateFarmerAdvance(farmerId, amountNum);

    setLoading(false);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95">
        <div className="p-5 bg-emerald-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold">Pay Cash Advance (अ‍ॅडव्हान्स)</h2>
              <p className="text-[11px] text-emerald-300 font-semibold">{farmerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs font-sans">
          <div>
            <label className="font-extrabold text-slate-700 block mb-1">Advance Payout Amount (₹)</label>
            <input
              type="number"
              value={advanceAmount}
              onChange={(e) => setAdvanceAmount(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-black text-slate-900 text-lg focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="font-extrabold text-slate-700 block mb-1">Payment Mode</label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
            >
              <option value="CASH">CASH (रोकड)</option>
              <option value="UPI">UPI / Google Pay / PhonePe</option>
              <option value="BANK_TRANSFER">Bank NEFT / RTGS</option>
              <option value="CHEQUE">Cheque Payout</option>
            </select>
          </div>

          <div>
            <label className="font-extrabold text-slate-700 block mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>Notes / Reason for Advance</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Paid cash advance for strawberry harvest labor setup..."
              rows={2}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            />
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between font-extrabold text-emerald-900">
            <span>New Advance Balance Increase:</span>
            <span className="text-emerald-700 text-sm">+₹{Number(advanceAmount || 0).toLocaleString('en-IN')}</span>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 font-extrabold rounded-xl text-white shadow-lg shadow-emerald-600/20"
            >
              {loading ? 'Recording...' : 'Disburse Cash Advance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
