"use client";

import React, { useState, useEffect } from 'react';
import { X, Scale, CheckCircle2, IndianRupee, FileText, Lock, Calendar, Truck, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { apiUpdateSale, getTenantId } from '@/lib/api';

interface PattiSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sale: any;
}

export const PattiSettlementModal: React.FC<PattiSettlementModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  sale,
}) => {
  const [editableItems, setEditableItems] = useState<any[]>([]);
  const [bargainingNotes, setBargainingNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [pattiDeductions, setPattiDeductions] = useState({
    hamali: 150,
    tolai: 50,
    mandiTax: 0,
    commission: 0,
    freight: 0,
    other: 0,
    paymentMode: 'BANK_TRANSFER',
    paymentRef: '',
    clearedDate: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => {
    if (!isOpen || !sale) return;

    let itemsList = Array.isArray(sale.itemsData) ? [...sale.itemsData] : [];
    if (itemsList.length === 0 && sale.items) {
      itemsList = [{
        srNo: 1,
        cropName: sale.items,
        weightKg: Number(sale.totalWeight || 0),
        ratePerKg: parseFloat(sale.totalWeight || 0) > 0 ? Math.round(parseFloat(sale.amount || 0) / parseFloat(sale.totalWeight || 1)) : 0,
        unit: 'KG',
        totalAmount: parseFloat(sale.amount || 0)
      }];
    }
    setEditableItems(itemsList);
    setBargainingNotes(sale.pattiBargainingNotes || '');

    const grossAmt = itemsList.reduce((acc, i) => acc + (Number(i.weightKg || i.weight || 0) * Number(i.ratePerKg || i.rate || 0)), 0) || parseFloat(sale.netAmount || sale.totalAmount || sale.amount || 0);
    const estCommission = Math.round(grossAmt * 0.05); // standard 5% APMC commission
    const estCess = Math.round(grossAmt * 0.0105); // 1.05% APMC cess

    setPattiDeductions({
      hamali: sale.pattiDetails?.hamali ?? 150,
      tolai: sale.pattiDetails?.tolai ?? 50,
      mandiTax: sale.pattiDetails?.mandiTax ?? estCess,
      commission: sale.pattiDetails?.commission ?? estCommission,
      freight: sale.pattiDetails?.freight ?? 0,
      other: sale.pattiDetails?.other ?? 0,
      paymentMode: sale.pattiDetails?.paymentMode ?? 'BANK_TRANSFER',
      paymentRef: sale.pattiDetails?.paymentRef ?? '',
      clearedDate: sale.pattiDetails?.clearedDate ?? new Date().toISOString().slice(0, 10),
    });
  }, [isOpen, sale]);

  if (!isOpen || !sale) return null;

  const isLocked = sale.pattiRateLock === true;
  const grossVal = editableItems.reduce((acc, i) => acc + (Number(i.weightKg || i.weight || 0) * Number(i.ratePerKg || i.rate || 0)), 0) || parseFloat(sale.netAmount || sale.totalAmount || sale.amount || 0);
  const totalDeductionsVal = (Number(pattiDeductions.hamali) || 0) +
    (Number(pattiDeductions.tolai) || 0) +
    (Number(pattiDeductions.mandiTax) || 0) +
    (Number(pattiDeductions.commission) || 0) +
    (Number(pattiDeductions.freight) || 0) +
    (Number(pattiDeductions.other) || 0);

  const netPattiVal = Math.max(0, grossVal - totalDeductionsVal);
  const advancePaidEarlier = Number(sale.sellerPattiAdvance || 0);
  const netPayableVal = Math.max(0, netPattiVal - advancePaidEarlier);

  const handleSavePatti = async (isFinalLock: boolean) => {
    if (loading) return;
    setLoading(true);
    try {
      const pattiDetails = {
        hamali: Number(pattiDeductions.hamali) || 0,
        tolai: Number(pattiDeductions.tolai) || 0,
        mandiTax: Number(pattiDeductions.mandiTax) || 0,
        commission: Number(pattiDeductions.commission) || 0,
        freight: Number(pattiDeductions.freight) || 0,
        other: Number(pattiDeductions.other) || 0,
        totalDeductions: totalDeductionsVal,
        grossAmt: grossVal,
        advancePaidEarlier,
        netPayable: netPayableVal,
        isFinalLock,
        clearedDate: pattiDeductions.clearedDate,
        paymentMode: pattiDeductions.paymentMode,
        paymentRef: pattiDeductions.paymentRef,
        notes: bargainingNotes,
      };

      const existingHistory = Array.isArray(sale.paymentHistory) ? sale.paymentHistory : [];
      let updatedHistory = existingHistory;

      if (isFinalLock) {
        const newPaymentEntry = {
          date: pattiDeductions.clearedDate,
          amount: netPayableVal,
          mode: pattiDeductions.paymentMode,
          ref: pattiDeductions.paymentRef,
          type: 'PATTI_CLEAR',
          notes: `APMC Vikri Patti Cleared (Gross: ₹${grossVal}, Deductions: ₹${totalDeductionsVal}, Advance Deducted: ₹${advancePaidEarlier})`
        };
        updatedHistory = [...existingHistory, newPaymentEntry];
      }

      const totalPaidFinal = advancePaidEarlier + (isFinalLock ? netPayableVal : 0);
      const dueFinal = Math.max(0, netPattiVal - totalPaidFinal);

      const patchPayload = {
        amount: grossVal,
        itemsData: editableItems,
        pattiBargainingNotes: bargainingNotes,
        pattiDetails,
        pattiRateLock: isFinalLock,
        pattiStatus: isFinalLock ? 'CONFIRMED' : 'PATTI_DRAFT',
        isPattiReceived: true,
        isRateFixedNow: isFinalLock ? true : sale.isRateFixedNow,
        status: isFinalLock ? 'PATTI_CLEARED' : (sale.status || 'RECEIVED'),
        deliveryStatus: isFinalLock ? 'PATTI_CLEARED' : 'RECEIVED',
        paymentStatus: isFinalLock ? (dueFinal === 0 ? 'PAID' : 'PARTIAL') : sale.paymentStatus,
        paidAmount: isFinalLock ? totalPaidFinal : sale.paidAmount,
        dueAmount: isFinalLock ? dueFinal : sale.dueAmount,
        paymentHistory: updatedHistory,
      };

      await apiUpdateSale(sale.id, patchPayload);

      // Update LocalStorage cache
      const tenantId = getTenantId();
      const cacheKey = tenantId ? `seavaig_sales_cache_${tenantId}` : 'seavaig_sales_cache';
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        try {
          const list = JSON.parse(raw);
          const updatedList = list.map((b: any) => b.id === sale.id ? { ...b, ...patchPayload } : b);
          localStorage.setItem(cacheKey, JSON.stringify(updatedList));
        } catch {}
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving Patti settlement:', err);
      alert('Error updating Patti: ' + (err?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-sans animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200 my-auto">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-700 to-amber-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-600/50 rounded-xl">
              <Scale className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black">APMC Vikri Patti Settlement (पट्टी हिशोब)</h2>
                {isLocked ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-500 text-white flex items-center gap-1">
                    <Lock className="w-3 h-3" /> LOCKED
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-400 text-amber-950 flex items-center gap-1">
                    ✏️ DRAFT / EDITABLE
                  </span>
                )}
              </div>
              <p className="text-xs text-amber-200">
                Bill #{sale.billNo || sale.id} • {sale.customerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-amber-200 hover:text-white rounded-lg bg-amber-800/80 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
          {isLocked && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-800 font-bold text-xs">
              <Lock className="w-4 h-4 text-rose-600 shrink-0" />
              <span>ही पट्टी पक्की करून कायमस्वरूपी लॉक करण्यात आली आहे. दर व वजावटी आता बदलता येणार नाहीत.</span>
            </div>
          )}

          {/* EDITABLE CROP LINE ITEMS & RATES */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <span>माल व दर तपशील (Produce & Patti Rates)</span>
              </h4>
              {!isLocked && (
                <span className="text-[10px] text-amber-700 font-extrabold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  दर व वजन बदलता येईल (Editable)
                </span>
              )}
            </div>

            <div className="space-y-2">
              {editableItems.map((item, idx) => (
                <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <span className="text-[10px] text-slate-400 block font-bold">Crop / Grade</span>
                    <span className="font-black text-slate-900 block truncate">{item.cropName || item.name || 'Crop'}</span>
                  </div>
                  <div className="col-span-3">
                    <span className="text-[10px] text-slate-400 block font-bold">वजन ({item.unit || 'KG'})</span>
                    {isLocked ? (
                      <span className="font-black text-slate-900">{item.weightKg || item.weight}</span>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        value={item.weightKg ?? item.weight ?? ''}
                        onChange={(e) => {
                          const updated = [...editableItems];
                          updated[idx].weightKg = parseFloat(e.target.value) || 0;
                          setEditableItems(updated);
                        }}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 text-xs"
                      />
                    )}
                  </div>
                  <div className="col-span-4">
                    <span className="text-[10px] text-slate-400 block font-bold">दर / {item.unit || 'KG'} (₹)</span>
                    {isLocked ? (
                      <span className="font-black text-slate-900">₹{item.ratePerKg ?? item.rate}</span>
                    ) : (
                      <input
                        type="number"
                        min="0"
                        value={item.ratePerKg ?? item.rate ?? ''}
                        onChange={(e) => {
                          const updated = [...editableItems];
                          updated[idx].ratePerKg = parseFloat(e.target.value) || 0;
                          setEditableItems(updated);
                        }}
                        className="w-full px-2 py-1 bg-white border border-amber-300 rounded-lg font-black text-amber-900 text-xs focus:ring-1 focus:ring-amber-500"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gross Summary Ribbon */}
          <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 flex justify-between items-center">
            <div>
              <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider block">एकूण विक्री रक्कम (Gross Sale)</span>
              <span className="text-xs text-slate-600 font-bold">{sale.totalWeight || 0} KG • {sale.customerName}</span>
            </div>
            <div className="text-right">
              <span className="text-xl font-black text-amber-950">₹{grossVal.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Mandi Deductions Inputs */}
          <div>
            <h4 className="font-black text-slate-800 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
              <span>APMC Mandi Deductions (बाजार समिती वजावटी)</span>
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">हमाली (Hamali ₹)</label>
                <input 
                  type="number"
                  min="0"
                  disabled={isLocked}
                  value={pattiDeductions.hamali}
                  onChange={e => setPattiDeductions(prev => ({ ...prev, hamali: parseFloat(e.target.value) || 0 }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-amber-600 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">तोलाई (Tolai ₹)</label>
                <input 
                  type="number"
                  min="0"
                  disabled={isLocked}
                  value={pattiDeductions.tolai}
                  onChange={e => setPattiDeductions(prev => ({ ...prev, tolai: parseFloat(e.target.value) || 0 }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-amber-600 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">बाजार फी (Mandi Cess ₹)</label>
                <input 
                  type="number"
                  min="0"
                  disabled={isLocked}
                  value={pattiDeductions.mandiTax}
                  onChange={e => setPattiDeductions(prev => ({ ...prev, mandiTax: parseFloat(e.target.value) || 0 }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-amber-600 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">आडत/कमिशन (Adat ₹)</label>
                <input 
                  type="number"
                  min="0"
                  disabled={isLocked}
                  value={pattiDeductions.commission}
                  onChange={e => setPattiDeductions(prev => ({ ...prev, commission: parseFloat(e.target.value) || 0 }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-amber-600 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">वाहतूक भाडे (Freight ₹)</label>
                <input 
                  type="number"
                  min="0"
                  disabled={isLocked}
                  value={pattiDeductions.freight}
                  onChange={e => setPattiDeductions(prev => ({ ...prev, freight: parseFloat(e.target.value) || 0 }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-amber-600 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">इतर खर्च (Other ₹)</label>
                <input 
                  type="number"
                  min="0"
                  disabled={isLocked}
                  value={pattiDeductions.other}
                  onChange={e => setPattiDeductions(prev => ({ ...prev, other: parseFloat(e.target.value) || 0 }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-amber-600 disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          {/* Bargaining Discussion Notes */}
          <div>
            <label className="font-bold text-slate-700 block mb-1 text-[11px]">
              दर चर्चा / घासाघीस नोंद (Discussion / Bargaining Notes):
            </label>
            <textarea
              rows={2}
              disabled={isLocked}
              placeholder="उदा. फोनवर बोलून प्रति किलो ₹३४० दर फायनल झाला..."
              value={bargainingNotes}
              onChange={(e) => setBargainingNotes(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 text-xs outline-none focus:border-amber-600 disabled:opacity-60"
            />
          </div>

          {/* Live Settlement Card with Advance Deduction */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex justify-between text-slate-600 font-bold">
              <span>एकूण विक्री रक्कम (Gross Sale):</span>
              <span>₹{grossVal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-rose-600 font-bold">
              <span>एकूण APMC वजावट (Total Deductions):</span>
              <span>- ₹{totalDeductionsVal.toLocaleString('en-IN')}</span>
            </div>
            {advancePaidEarlier > 0 && (
              <div className="flex justify-between text-indigo-700 font-bold bg-indigo-50/60 p-2 rounded-xl border border-indigo-100">
                <span>या पट्टीसाठी मिळालेला अ‍ॅडव्हान्स (Advance Paid Earlier):</span>
                <span>- ₹{advancePaidEarlier.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-emerald-800 text-sm pt-2 border-t border-slate-200">
              <span>निव्वळ बाकी रक्कम (Net Due from Buyer):</span>
              <span className="text-base font-extrabold text-emerald-700">₹{netPayableVal.toLocaleString('en-IN')}</span>
            </div>
            {advancePaidEarlier > 0 && netPayableVal === 0 && (
              <div className="p-2 bg-emerald-100/70 border border-emerald-200 text-emerald-800 rounded-xl font-black text-[11px] text-center">
                ✓ अ‍ॅडव्हान्स मधून बिल पूर्ण सेटल झाले (Bill Fully Settle by Advance)
              </div>
            )}
          </div>

          {/* Payment Disbursement Details */}
          {!isLocked && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">पेमेंट प्रकार (Mode)</label>
                <select
                  value={pattiDeductions.paymentMode}
                  onChange={e => setPattiDeductions(prev => ({ ...prev, paymentMode: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-amber-600"
                >
                  <option value="BANK_TRANSFER">Bank / NEFT / RTGS</option>
                  <option value="UPI">UPI / GPay / PhonePe</option>
                  <option value="CASH">Cash (रोख)</option>
                  <option value="CHEQUE">Cheque (धनादेश)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">संदर्भ क्र (UTR / Ref / Cheque No)</label>
                <input 
                  type="text"
                  placeholder="e.g. UTR-982183"
                  value={pattiDeductions.paymentRef}
                  onChange={e => setPattiDeductions(prev => ({ ...prev, paymentRef: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">तारीख (Clear Date)</label>
                <input 
                  type="date"
                  value={pattiDeductions.clearedDate}
                  onChange={e => setPattiDeductions(prev => ({ ...prev, clearedDate: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 outline-none focus:border-amber-600"
                />
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            {!isLocked ? (
              <>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSavePatti(false)}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-800 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <span>💾 कच्ची पट्टी सेव्ह करा (Save Draft)</span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleSavePatti(true)}
                  className="flex-1 py-3 bg-amber-700 hover:bg-amber-800 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-700/20 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 text-amber-200" />
                  <span>🔒 पक्की पट्टी लॉक करा (Confirm & Lock)</span>
                </button>
              </>
            ) : null}

            <button
              type="button"
              onClick={onClose}
              className="py-3 px-5 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-slate-700 text-xs cursor-pointer"
            >
              {isLocked ? 'बंद करा (Close)' : 'रद्द करा (Cancel)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
