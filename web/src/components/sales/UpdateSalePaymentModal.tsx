"use client";

import React, { useState } from 'react';
import { X, IndianRupee, CreditCard, CheckCircle2, Receipt, Calendar, ArrowRight } from 'lucide-react';
import { apiUpdateSalePayment } from '@/lib/api';

interface UpdateSalePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sale: any;
}

export const UpdateSalePaymentModal: React.FC<UpdateSalePaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  sale,
}) => {
  const [amountPaidNow, setAmountPaidNow] = useState<number | ''>('');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || !sale) return null;

  const totalAmount = Number(sale.totalAmount || sale.amount || 0);
  const prevPaid = Number(sale.paidAmount || 0);
  const currentDue = Number(sale.dueAmount !== undefined ? sale.dueAmount : Math.max(0, totalAmount - prevPaid));
  
  const additionalPaid = Number(amountPaidNow || 0);
  const newPaidAmount = prevPaid + additionalPaid;
  const newDueAmount = Math.max(0, totalAmount - newPaidAmount);
  const newStatus = newDueAmount <= 0 ? 'PAID' : (newPaidAmount > 0 ? 'PARTIAL' : 'UNPAID');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (additionalPaid <= 0) {
      setErrorMsg('Please enter an amount greater than 0.');
      return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      await apiUpdateSalePayment(sale.id, {
        amountPaidNow: additionalPaid,
        paymentMode,
        referenceNo,
        notes,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to update sale payment:', err);
      setErrorMsg(err.message || 'Failed to update payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200/80 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col justify-between animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black shadow-sm">
              <IndianRupee className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Record Payment / Edit Bill
              </h3>
              <p className="text-[11px] font-medium text-slate-400">
                Invoice #{sale.billNo || sale.id} • {sale.customerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
              <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Total Amount</p>
              <p className="font-black text-slate-900 text-sm">₹{totalAmount.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100">
              <p className="text-[10px] text-emerald-600 font-bold uppercase mb-0.5">Already Paid</p>
              <p className="font-black text-emerald-700 text-sm">₹{prevPaid.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-rose-50/60 p-3 rounded-2xl border border-rose-100">
              <p className="text-[10px] text-rose-600 font-bold uppercase mb-0.5">Current Due</p>
              <p className="font-black text-rose-700 text-sm">₹{currentDue.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Amount Paid Now Input */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Amount Received Now (₹) *
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max={currentDue > 0 ? currentDue : undefined}
                required
                placeholder={`Max ₹${currentDue.toLocaleString('en-IN')}`}
                value={amountPaidNow}
                onChange={(e) => setAmountPaidNow(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full pl-9 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              {currentDue > 0 && (
                <button
                  type="button"
                  onClick={() => setAmountPaidNow(currentDue)}
                  className="absolute right-2 top-2 px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-black rounded-lg transition-colors cursor-pointer"
                >
                  PAY FULL DUE
                </button>
              )}
            </div>
          </div>

          {/* Payment Mode */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="CASH">Cash (रोख)</option>
                <option value="UPI">UPI / PhonePe / GPay</option>
                <option value="NEFT_RTGS">NEFT / RTGS / Bank Transfer</option>
                <option value="CHEQUE">Cheque / Demand Draft</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Reference / Txn ID</label>
              <input
                type="text"
                placeholder="e.g. UPI Ref / Cheque No"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Payment Notes (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Received partial advance via cashier"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Live Preview */}
          {additionalPaid > 0 && (
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl p-3 text-xs space-y-1.5 animate-in fade-in">
              <div className="flex justify-between items-center text-slate-700">
                <span>New Total Paid:</span>
                <span className="font-extrabold text-emerald-700">₹{newPaidAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>Remaining Due:</span>
                <span className="font-extrabold text-rose-700">₹{newDueAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-emerald-100">
                <span>Updated Status:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  newStatus === 'PAID'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {newStatus}
                </span>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold">
              {errorMsg}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || additionalPaid <= 0}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {loading ? (
                <span>Recording...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Update Payment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
