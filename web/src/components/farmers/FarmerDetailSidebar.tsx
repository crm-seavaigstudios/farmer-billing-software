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
import { apiGetFarmerDetails, apiGetFarmerMaterials, apiGetPurchases, apiGetPayments, getTenantId } from '@/lib/api';

const parseDateRobust = (dateStr: string): Date => {
  if (!dateStr) return new Date(0);
  let d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      if (!isNaN(d.getTime())) return d;
    }
  }
  
  const months: { [key: string]: number } = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };
  const cleaned = dateStr.replace(/\s+/g, ' ').trim();
  const parts = cleaned.split(' ');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const monthStr = parts[1].toLowerCase().substring(0, 3);
    const year = parseInt(parts[2], 10);
    if (months[monthStr] !== undefined && !isNaN(day) && !isNaN(year)) {
      d = new Date(year, months[monthStr], day);
      if (!isNaN(d.getTime())) return d;
    }
  }
  
  return new Date(dateStr);
};

interface FarmerDetailSidebarProps {
  farmerId: string | null;
  refreshKey?: number;
  onClose: () => void;
  onOpenMaterialModal: (farmerId: string) => void;
  onOpenAdvanceModal?: (farmerId: string) => void;
}

export function FarmerDetailSidebar({ farmerId, refreshKey, onClose, onOpenMaterialModal, onOpenAdvanceModal }: FarmerDetailSidebarProps) {
  const [farmer, setFarmer] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'BILLS' | 'MATERIALS' | 'LEDGER'>('SUMMARY');

  useEffect(() => {
    if (!farmerId) return;
    async function fetchDetails() {
      setLoading(true);
      let targetFarmer: any = null;

      const tenantId = getTenantId();
      const farmersCacheKey = tenantId ? `seavaig_farmers_cache_${tenantId}` : 'seavaig_farmers_cache';
      const purchasesCacheKey = tenantId ? `seavaig_purchases_cache_${tenantId}` : 'seavaig_purchases_cache';
      const paymentsCacheKey = tenantId ? `seavaig_payments_cache_${tenantId}` : 'seavaig_payments_cache';

      const cachedFarmers = typeof window !== 'undefined' ? localStorage.getItem(farmersCacheKey) : null;
      if (cachedFarmers) {
        try {
          const list = JSON.parse(cachedFarmers);
          if (Array.isArray(list)) {
            targetFarmer = list.find((f: any) => f.id === farmerId || f.farmerIdCode === farmerId);
          }
        } catch {}
      }

      const res = await apiGetFarmerDetails(farmerId!);
      if (res && res.name) {
        targetFarmer = { ...targetFarmer, ...res };
      }

      if (!targetFarmer) {
        targetFarmer = {
          id: farmerId,
          farmerIdCode: 'FAR-01',
          name: 'Farmer Profile',
          phone: '9823456789',
          village: 'Nandgaon',
          advanceBalance: 0,
          totalPurchase: 0,
          totalPaid: 0,
          outstandingAmount: 0,
        };
      }

      // Fetch Purchases (Supabase API + Cache fallback)
      const allPurchases = await apiGetPurchases();
      let farmerPurchases: any[] = [];
      if (allPurchases && Array.isArray(allPurchases)) {
        farmerPurchases = allPurchases.filter((p: any) => p.farmerId === farmerId || p.farmerName === targetFarmer.name);
      }
      if (farmerPurchases.length === 0) {
        const cachedPurchases = typeof window !== 'undefined' ? localStorage.getItem(purchasesCacheKey) : null;
        if (cachedPurchases) {
          try {
            const pList = JSON.parse(cachedPurchases);
            if (Array.isArray(pList)) {
              farmerPurchases = pList.filter((p: any) => p.farmerId === farmerId || p.farmerName === targetFarmer.name);
            }
          } catch {}
        }
      }

      // Fetch Payments (Supabase API + Cache fallback)
      const allPayments = await apiGetPayments();
      let farmerPayments: any[] = [];
      if (allPayments && Array.isArray(allPayments)) {
        farmerPayments = allPayments.filter((pay: any) => pay.farmerId === farmerId || pay.farmerName === targetFarmer.name);
      }
      if (farmerPayments.length === 0) {
        const cachedPayments = typeof window !== 'undefined' ? localStorage.getItem(paymentsCacheKey) : null;
        if (cachedPayments) {
          try {
            const payList = JSON.parse(cachedPayments);
            if (Array.isArray(payList)) {
              farmerPayments = payList.filter((pay: any) => pay.farmerId === farmerId || pay.farmerName === targetFarmer.name);
            }
          } catch {}
        }
      }

      // Fetch Issued Materials (Supabase API + Cache fallback)
      const dbMaterials = await apiGetFarmerMaterials(farmerId!);
      let farmerMaterials: any[] = dbMaterials || [];

      setFarmer({
        ...targetFarmer,
        purchases: farmerPurchases,
        payments: farmerPayments,
        materialPurchases: farmerMaterials,
      });
      setLoading(false);
    }
    fetchDetails();
  }, [farmerId, refreshKey]);

  if (!farmerId) return null;

  const purchases = farmer?.purchases || [];
  const materials = farmer?.materialPurchases || [];
  const payments = farmer?.payments || [];

  const combinedEvents: any[] = [];

  purchases.forEach((p: any) => {
    const amt = typeof p.amount === 'number' ? p.amount : (typeof p.rawAmount === 'number' ? p.rawAmount : Number(String(p.totalAmount || p.grossAmount || p.amount || 0).replace(/[^0-9.-]+/g, '')) || 0);
    const dateStr = p.purchaseDate || p.date || 'Today';
    combinedEvents.push({
      id: p.purchaseNo || p.purchaseBillNo || p.id,
      date: dateStr,
      rawDate: parseDateRobust(dateStr).getTime() || Date.now(),
      type: 'CREDIT',
      title: `Harvest Purchase: ${p.crop || p.cropName || 'Crop Harvest'}`,
      subtitle: `${p.weight || p.totalQuantityKg || ''} @ ${p.rate || p.ratePerKg || ''}`,
      credit: amt,
      debit: 0,
      badge: p.paymentStatus || 'BILL',
    });
  });

  payments.forEach((pay: any) => {
    const amt = typeof pay.amount === 'number' ? pay.amount : Number(String(pay.amount || 0).replace(/[^0-9.-]+/g, '')) || 0;
    const dateStr = pay.date || pay.createdAt || 'Today';
    combinedEvents.push({
      id: pay.id,
      date: dateStr,
      rawDate: parseDateRobust(dateStr).getTime() || Date.now(),
      type: 'DEBIT',
      title: `Farmer Payout: ${pay.notes || pay.method || 'Payout Settlement'}`,
      subtitle: `Payment via ${pay.method || pay.paymentMode || 'Cash/Bank'}`,
      credit: 0,
      debit: amt,
      badge: 'PAYOUT',
    });
  });

  materials.forEach((m: any) => {
    const amt = m.totalPrice || m.totalAmount || (Number(m.quantity || 1) * Number(m.unitPrice || 0));
    const dateStr = m.date || m.createdAt || 'Today';
    combinedEvents.push({
      id: m.id,
      date: dateStr,
      rawDate: parseDateRobust(dateStr).getTime() || Date.now(),
      type: 'DEBIT',
      title: `Material Supply: ${m.itemName}`,
      subtitle: `Qty: ${m.quantity} @ ₹${m.unitPrice || 0}/unit`,
      credit: 0,
      debit: amt,
      badge: 'INPUT COST',
    });
  });

  combinedEvents.sort((a, b) => a.rawDate - b.rawDate);

  let runningBal = 0;
  const ledgerRows = combinedEvents.map((ev) => {
    runningBal += (ev.credit - ev.debit);
    return {
      ...ev,
      runningBalance: runningBal,
    };
  });

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
                  {farmer?.farmerIdCode || farmer?.id || 'FAR-01'}
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {farmer?.village || 'Nandgaon'}
                </span>
              </div>
              <h2 className="text-lg font-black text-white mt-1">{farmer?.name || 'Loading Farmer Profile...'}</h2>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>{farmer?.village || 'Nandgaon'}</span> • <span>{farmer?.phone || '9823456789'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenMaterialModal(farmerId!)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-sm cursor-pointer"
            >
              <Package className="w-3.5 h-3.5" />
              <span>+ Material</span>
            </button>
            {onOpenAdvanceModal && (
              <button
                onClick={() => onOpenAdvanceModal(farmerId!)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>⚡ Advance</span>
              </button>
            )}
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
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
            Passbook Ledger ({ledgerRows.length})
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
                    {(() => {
                      const dueVal = farmer?.outstandingAmount || 0;
                      return dueVal < 0 
                        ? `-₹${Math.abs(dueVal).toLocaleString('en-IN')}` 
                        : `₹${dueVal.toLocaleString('en-IN')}`;
                    })()}
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
                        <span className="font-bold text-slate-800">{farmer?.bankName || 'State Bank of India'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block">Account Number</span>
                        <span className="font-bold text-slate-800">{farmer?.accountNumber || '30987654321'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 block">IFSC Code</span>
                        <span className="font-bold text-slate-800">{farmer?.ifscCode || 'SBIN0001234'}</span>
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
                    purchases.map((p: any, idx: number) => {
                      const pAmt = typeof p.amount === 'number' ? p.amount : (typeof p.rawAmount === 'number' ? p.rawAmount : Number(String(p.totalAmount || p.amount || 0).replace(/[^0-9.-]+/g, '')) || 0);
                      const dateText = p.purchaseDate || p.date || (p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-IN') : 'Today');
                      return (
                        <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 text-xs hover:border-blue-200 transition-colors">
                          <div className="flex items-center justify-between font-extrabold">
                            <span className="text-blue-600 flex items-center gap-1.5">
                              <ShoppingBag className="w-3.5 h-3.5" />
                              {p.purchaseNo || p.purchaseBillNo || p.id}
                            </span>
                            <span className="text-slate-900">₹{pAmt.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-500 text-[11px]">
                            <span>{p.crop || p.cropName || 'Harvest Crop'} ({p.weight || `${p.totalQuantityKg || 0} KG`})</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                            }`}>
                              {p.paymentStatus || 'UNPAID'}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-100 flex justify-between">
                            <span>Date: {dateText}</span>
                            <span>Rate: {p.rate || `₹${p.ratePerKg || 0}/KG`}</span>
                          </div>
                        </div>
                      );
                    })
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
                    materials.map((m: any, idx: number) => {
                      const mAmt = m.totalPrice || m.totalAmount || (Number(m.quantity || 1) * Number(m.unitPrice || 0));
                      const mDate = m.date || (m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-IN') : 'Today');
                      return (
                        <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-slate-900">{m.itemName} ({m.quantity} {m.unit || 'units'})</span>
                            <span className="text-rose-600 font-extrabold">₹{mAmt.toLocaleString('en-IN')}</span>
                          </div>
                          {m.notes && <p className="text-[11px] text-slate-500 italic">"{m.notes}"</p>}
                          <div className="text-[10px] text-slate-400 flex justify-between pt-1 border-t border-slate-100">
                            <span>Date: {mDate}</span>
                            <span className="text-blue-600 font-bold">₹{m.unitPrice || 0}/unit</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeTab === 'LEDGER' && (
                <div className="space-y-3">
                  <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Passbook Ledger Statement</h3>
                  <div className="space-y-2">
                    {ledgerRows.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-8">No transactions recorded yet in passbook.</p>
                    ) : (
                      ledgerRows.map((row: any, idx: number) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                row.type === 'CREDIT' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                              }`}>
                                {row.type}
                              </span>
                              <span className="font-bold text-slate-900">{row.title}</span>
                            </div>
                            <span className={`font-black ${row.type === 'CREDIT' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {row.type === 'CREDIT' ? `+₹${row.credit.toLocaleString('en-IN')}` : `-₹${row.debit.toLocaleString('en-IN')}`}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                            <span>{row.subtitle} • {row.date}</span>
                            <span className="font-bold text-slate-700">Bal: ₹{row.runningBalance.toLocaleString('en-IN')}</span>
                          </div>
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
