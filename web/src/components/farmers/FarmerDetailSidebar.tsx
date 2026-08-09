"use client";

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  MapPin,
  CreditCard,
  Building2,
  Calendar,
  ShoppingBag,
  Package,
  DollarSign,
  Share2,
  Plus,
  FileText,
  CheckCircle2,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';
import { apiGetFarmerDetails } from '@/lib/api';

interface FarmerDetailSidebarProps {
  farmerId: string | null;
  onClose: () => void;
  onOpenMaterialModal: (farmerId: string) => void;
}

export function FarmerDetailSidebar({ farmerId, onClose, onOpenMaterialModal }: FarmerDetailSidebarProps) {
  const [farmer, setFarmer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'BILLS' | 'MATERIALS' | 'LEDGER'>('SUMMARY');

  useEffect(() => {
    if (!farmerId) return;
    async function fetchDetails() {
      setLoading(true);
      const res = await apiGetFarmerDetails(farmerId!);
      if (res) {
        setFarmer(res);
      }
      setLoading(false);
    }
    fetchDetails();
  }, [farmerId]);

  if (!farmerId) return null;

  const handleShareWhatsApp = () => {
    if (!farmer) return;
    const text = `🌾 *SEAVAIG FARMER PASSBOOK STATEMENT* 🌾\n` +
      `Farmer Name: ${farmer.name}\n` +
      `Farmer ID: ${farmer.farmerIdCode || farmer.id}\n` +
      `Phone: ${farmer.phone}\n` +
      `--------------------------------\n` +
      `📦 Total Harvest Purchases: ₹${(farmer.totalPurchase || 0).toLocaleString('en-IN')}\n` +
      `💳 Total Paid Out: ₹${(farmer.totalPaid || 0).toLocaleString('en-IN')}\n` +
      `⚠️ Net Balance Outstanding: ₹${(farmer.outstandingAmount || 0).toLocaleString('en-IN')}\n` +
      `--------------------------------\n` +
      `Thank you for doing business with SEAVAIG Enterprises!`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/91${farmer.phone.replace(/\D/g, '')}?text=${encoded}`, '_blank');
  };

  const purchases = farmer?.purchases || [];
  const materials = farmer?.materialPurchases || [];
  const ledgers = farmer?.ledgers || [];
  const payments = farmer?.payments || [];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex justify-end animate-in fade-in">
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col min-h-0 animate-in slide-in-from-right duration-200">
        
        {/* Top Navigation Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/30 text-blue-400 border border-blue-500/30 flex items-center justify-center font-black text-lg">
              {farmer?.name ? farmer.name.charAt(0) : 'F'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {farmer?.farmerIdCode || farmer?.id || 'FAR-001'}
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {farmer?.grade || 'A_GRADE'}
                </span>
              </div>
              <h2 className="text-lg font-black text-white mt-1">{farmer?.name || 'Loading Farmer Profile...'}</h2>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>{farmer?.village}, {farmer?.taluka}</span> • <span>{farmer?.phone}</span>
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('SUMMARY')}
            className={`pb-3 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'SUMMARY' ? 'border-blue-600 text-blue-600 font-extrabold' : 'border-transparent hover:text-slate-900'
            }`}
          >
            Overview & Bank
          </button>
          <button
            onClick={() => setActiveTab('BILLS')}
            className={`pb-3 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'BILLS' ? 'border-blue-600 text-blue-600 font-extrabold' : 'border-transparent hover:text-slate-900'
            }`}
          >
            Harvest Bills ({purchases.length})
          </button>
          <button
            onClick={() => setActiveTab('MATERIALS')}
            className={`pb-3 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'MATERIALS' ? 'border-blue-600 text-blue-600 font-extrabold' : 'border-transparent hover:text-slate-900'
            }`}
          >
            Material Supplies ({materials.length})
          </button>
          <button
            onClick={() => setActiveTab('LEDGER')}
            className={`pb-3 px-3 border-b-2 transition-all cursor-pointer ${
              activeTab === 'LEDGER' ? 'border-blue-600 text-blue-600 font-extrabold' : 'border-transparent hover:text-slate-900'
            }`}
          >
            Passbook Ledger
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs font-semibold">Loading detailed passbook...</div>
          ) : (
            <>
              {/* Financial Quick Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3.5 text-center">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">Total Purchases</span>
                  <span className="text-base font-black text-slate-900 mt-1 block">
                    ₹{(farmer?.totalPurchase || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-3.5 text-center">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Total Paid Out</span>
                  <span className="text-base font-black text-slate-900 mt-1 block">
                    ₹{(farmer?.totalPaid || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="bg-amber-50/70 border border-amber-100 rounded-2xl p-3.5 text-center">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Outstanding Due</span>
                  <span className="text-base font-black text-amber-700 mt-1 block">
                    ₹{(farmer?.outstandingAmount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {activeTab === 'SUMMARY' && (
                <div className="space-y-6">
                  {/* Bank & Identification Card */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3 text-xs">
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span>Bank Account & Official Identification</span>
                    </h3>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block">Bank Name</span>
                        <span className="font-bold text-slate-800">{farmer?.bankName || 'Not Provided'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block">Account Number</span>
                        <span className="font-bold text-slate-800">{farmer?.accountNumber || 'Not Provided'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block">IFSC Code</span>
                        <span className="font-bold text-slate-800">{farmer?.ifscCode || 'Not Provided'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block">Aadhaar Card No</span>
                        <span className="font-bold text-slate-800">{farmer?.aadhaarNumber || 'Not Provided'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Ribbon */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => onOpenMaterialModal(farmer.id)}
                      className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Issue Crates / Material</span>
                    </button>
                    <button
                      onClick={handleShareWhatsApp}
                      className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share on WhatsApp</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'BILLS' && (
                <div className="space-y-3">
                  <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Harvest Purchase Bills</h3>
                  {purchases.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-8">No harvest purchases recorded yet.</p>
                  ) : (
                    purchases.map((p: any, idx: number) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 text-xs hover:border-blue-200 transition-colors">
                        <div className="flex items-center justify-between font-extrabold">
                          <span className="text-blue-600 flex items-center gap-1.5">
                            <ShoppingBag className="w-3.5 h-3.5" />
                            {p.purchaseNo || p.id}
                          </span>
                          <span className="text-slate-900">₹{(p.totalAmount || 0).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-500 text-[11px]">
                          <span>{new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                          }`}>
                            {p.paymentStatus}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'MATERIALS' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Material & Supplies Issued</h3>
                    <button
                      onClick={() => onOpenMaterialModal(farmer.id)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Material
                    </button>
                  </div>
                  {materials.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-8">No material purchases issued yet.</p>
                  ) : (
                    materials.map((m: any, idx: number) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-slate-900">{m.itemName} ({m.quantity} {m.unit})</span>
                          <span className="text-rose-600 font-extrabold">₹{(m.totalAmount || 0).toLocaleString('en-IN')}</span>
                        </div>
                        {m.notes && <p className="text-[11px] text-slate-500 italic">"{m.notes}"</p>}
                        <div className="text-[10px] text-slate-400 flex justify-between pt-1 border-t border-slate-100">
                          <span>{new Date(m.createdAt).toLocaleDateString('en-IN')}</span>
                          <span className="text-blue-600 font-bold">{m.isDeductedFromBill ? 'Deducted from Bill' : 'Pending Deduction'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'LEDGER' && (
                <div className="space-y-3">
                  <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Passbook Ledger History</h3>
                  <div className="space-y-2">
                    {ledgers.length === 0 ? (
                      payments.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-8">No ledger entries recorded yet.</p>
                      ) : (
                        payments.map((pay: any, idx: number) => (
                          <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-slate-900">{pay.notes || 'Payout Settlement'}</span>
                              <span className="text-[10px] text-slate-400 block">{new Date(pay.createdAt).toLocaleDateString('en-IN')} • {pay.paymentMode}</span>
                            </div>
                            <span className="font-black text-emerald-600">₹{(pay.amount || 0).toLocaleString('en-IN')}</span>
                          </div>
                        ))
                      )
                    ) : (
                      ledgers.map((l: any, idx: number) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-slate-900">{l.description}</span>
                            <span className="text-[10px] text-slate-400 block">{new Date(l.date).toLocaleDateString('en-IN')}</span>
                          </div>
                          <span className={`font-black ${l.credit > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {l.credit > 0 ? `+₹${l.credit}` : `-₹${l.debit}`}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
