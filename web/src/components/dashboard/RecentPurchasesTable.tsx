"use client";

import React, { useState, useEffect } from 'react';
import { apiGetPurchases, apiGetSales, apiGetPayments, apiGetAllFarmerMaterials, TimelineFilter, getTimelineDateRange } from '@/lib/api';
import { ArrowDownLeft, ArrowUpRight, CreditCard, PackageCheck, Calendar } from 'lucide-react';

interface FullDayTransactionsTableProps {
  activeTimeline?: TimelineFilter;
}

export const RecentPurchasesTable: React.FC<FullDayTransactionsTableProps> = ({ activeTimeline = 'TODAY' }) => {
  const [filterType, setFilterType] = useState<'ALL' | 'PURCHASE' | 'SALE' | 'PAYMENT' | 'MATERIAL'>('ALL');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const { start, end } = getTimelineDateRange(activeTimeline);
      const [purchases, sales, payments, materials] = await Promise.all([
        apiGetPurchases(),
        apiGetSales(),
        apiGetPayments(),
        apiGetAllFarmerMaterials(),
      ]);

      const inRange = (dStr: any) => {
        if (!dStr) return true;
        const t = new Date(dStr).getTime();
        if (isNaN(t)) return true;
        if (activeTimeline === 'ALL_TIME') return true;
        return t >= start && t <= end;
      };

      const unified: any[] = [];

      // 1. Purchases (Credits)
      (purchases || []).filter((p: any) => inRange(p.date || p.purchaseDate || p.createdAt)).forEach((p: any) => {
        const weight = parseFloat(String(p.totalWeight || p.weight || 0).replace(/[^0-9.-]+/g, '')) || 0;
        const rawAmt = p.totalAmount ?? p.amount ?? p.netAmount ?? 0;
        const amt = typeof rawAmt === 'number' ? rawAmt : (parseFloat(String(rawAmt).replace(/[^0-9.-]+/g, '')) || 0);
        unified.push({
          id: p.id,
          billNo: p.billNo || p.purchaseNo || p.id,
          type: 'PURCHASE',
          partyName: p.farmerName || p.farmer?.name || 'Farmer',
          details: p.items?.[0]?.cropName || p.crop || 'Procurement',
          quantity: weight > 0 ? `${weight.toLocaleString('en-IN')} KG` : '—',
          rawWeight: weight,
          amount: amt,
          status: p.paymentStatus || 'ACTIVE',
          date: p.date || p.purchaseDate || p.createdAt || 'Today',
          timestamp: new Date(p.createdAt || p.date || Date.now()).getTime(),
        });
      });

      // 2. Sales / Dispatches
      (sales || []).filter((s: any) => inRange(s.date || s.saleDate || s.createdAt)).forEach((s: any) => {
        const weight = parseFloat(String(s.totalWeight || 0).replace(/[^0-9.-]+/g, '')) || 0;
        const rawAmt = s.totalAmount ?? s.amount ?? 0;
        const amt = typeof rawAmt === 'number' ? rawAmt : (parseFloat(String(rawAmt).replace(/[^0-9.-]+/g, '')) || 0);
        unified.push({
          id: s.id,
          billNo: s.billNo || s.invoiceNo || s.id,
          type: 'SALE',
          partyName: s.customerName || s.customer?.name || 'Trader / Customer',
          details: s.items?.[0]?.cropName || 'Dispatch Sale',
          quantity: weight > 0 ? `${weight.toLocaleString('en-IN')} KG` : '—',
          rawWeight: weight,
          amount: amt,
          status: s.deliveryStatus || s.paymentStatus || 'DELIVERED',
          date: s.date || s.saleDate || s.createdAt || 'Today',
          timestamp: new Date(s.createdAt || s.date || Date.now()).getTime(),
        });
      });

      // 3. Payments
      (payments || []).filter((pay: any) => inRange(pay.date || pay.paymentDate || pay.createdAt)).forEach((pay: any) => {
        const rawAmt = pay.amount ?? 0;
        const amt = typeof rawAmt === 'number' ? rawAmt : (parseFloat(String(rawAmt).replace(/[^0-9.-]+/g, '')) || 0);
        unified.push({
          id: pay.id,
          billNo: pay.receiptNo || pay.paymentNo || pay.id,
          type: 'PAYMENT',
          partyName: pay.partyName || pay.farmerName || 'Party Payment',
          details: `${pay.paymentMode || 'CASH'} ${pay.notes ? `• ${pay.notes}` : ''}`,
          quantity: '—',
          rawWeight: 0,
          amount: amt,
          status: 'SETTLED',
          date: pay.date || pay.paymentDate || pay.createdAt || 'Today',
          timestamp: new Date(pay.createdAt || pay.date || Date.now()).getTime(),
        });
      });

      // 4. Materials
      (materials || []).filter((m: any) => inRange(m.date || m.createdAt)).forEach((m: any) => {
        const qty = Number(m.quantity || 1);
        const rawAmt = m.totalAmount ?? m.amount ?? (qty * Number(m.unitPrice || 0));
        const amt = typeof rawAmt === 'number' ? rawAmt : (parseFloat(String(rawAmt).replace(/[^0-9.-]+/g, '')) || 0);
        unified.push({
          id: m.id,
          billNo: m.purchaseBillId || m.id,
          type: 'MATERIAL',
          partyName: m.farmerName || 'Farmer Material',
          details: `${m.itemName || 'Fertilizer/Seed'} (${qty} ${m.unit || 'BAG'})`,
          quantity: `${qty} ${m.unit || 'Item'}`,
          rawWeight: 0,
          amount: amt,
          status: m.status || 'ISSUED',
          date: m.date || m.createdAt || 'Today',
          timestamp: new Date(m.createdAt || m.date || Date.now()).getTime(),
        });
      });

      // Sort newest first
      unified.sort((a, b) => b.timestamp - a.timestamp);
      setTransactions(unified);
    } catch (err) {
      console.error('Error loading dashboard transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    if (typeof window !== 'undefined') {
      window.addEventListener('purchases_changed', handleUpdate);
      window.addEventListener('sales_changed', handleUpdate);
      window.addEventListener('payments_changed', handleUpdate);
      window.addEventListener('materials_changed', handleUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('purchases_changed', handleUpdate);
        window.removeEventListener('sales_changed', handleUpdate);
        window.removeEventListener('payments_changed', handleUpdate);
        window.removeEventListener('materials_changed', handleUpdate);
      }
    };
  }, [activeTimeline]);

  const filtered = filterType === 'ALL' 
    ? transactions 
    : transactions.filter(t => t.type === filterType);

  // Aggregates for bottom footer
  const totalAmountSum = filtered.reduce((acc, t) => acc + (t.amount || 0), 0);
  const totalWeightSum = filtered.reduce((acc, t) => acc + (t.rawWeight || 0), 0);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-subtle overflow-hidden flex flex-col font-sans">
      {/* Header & Filter Tabs */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-slate-900">
              {activeTimeline === 'ALL_TIME' ? 'All Full History Transactions' : `Realtime Daily Transactions (${activeTimeline})`}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-100">
              {filtered.length} व्यवहार
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            सर्व दिवसभरातील आवक, विक्री, पेमेंट व साहित्य नोंदी
          </p>
        </div>

        {/* Type Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
              filterType === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('PURCHASE')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
              filterType === 'PURCHASE' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            खरेदी
          </button>
          <button
            onClick={() => setFilterType('SALE')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
              filterType === 'SALE' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            विक्री
          </button>
          <button
            onClick={() => setFilterType('PAYMENT')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
              filterType === 'PAYMENT' ? 'bg-purple-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            पेमेंट
          </button>
          <button
            onClick={() => setFilterType('MATERIAL')}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
              filterType === 'MATERIAL' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            साहित्य
          </button>
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 sticky top-0 z-10 text-[10px] font-extrabold text-slate-500 uppercase border-b border-slate-100">
            <tr>
              <th className="py-2.5 px-4">प्रकार (Type)</th>
              <th className="py-2.5 px-4">पावती / बिल क्र.</th>
              <th className="py-2.5 px-4">शेतकरी / व्यापारी</th>
              <th className="py-2.5 px-4">तपशील (Item)</th>
              <th className="py-2.5 px-4 text-right">वजन / प्रमाण</th>
              <th className="py-2.5 px-4 text-right">रक्कम (₹)</th>
              <th className="py-2.5 px-4 text-center">स्थिती</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-400">
                  {loading ? 'व्यवहार लोड होत आहेत...' : 'या कालावधीत कोणतेही व्यवहार सापडले नाहीत.'}
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4">
                    {row.type === 'PURCHASE' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                        <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                        खरेदी
                      </span>
                    )}
                    {row.type === 'SALE' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3 text-blue-600" />
                        विक्री
                      </span>
                    )}
                    {row.type === 'PAYMENT' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200 inline-flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-purple-600" />
                        पेमेंट
                      </span>
                    )}
                    {row.type === 'MATERIAL' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
                        <PackageCheck className="w-3 h-3 text-amber-600" />
                        साहित्य
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 font-bold text-slate-900">{row.billNo}</td>
                  <td className="py-2.5 px-4 font-bold text-slate-800">{row.partyName}</td>
                  <td className="py-2.5 px-4 text-slate-500 font-normal">{row.details}</td>
                  <td className="py-2.5 px-4 text-right font-bold text-slate-800">{row.quantity}</td>
                  <td className="py-2.5 px-4 text-right font-black text-slate-900">
                    ₹{row.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Sticky Summary Footer Bar */}
      <div className="p-3.5 bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Calendar className="w-4 h-4 text-blue-400" />
          <span>दिवसभरातील एकूण व्यवहार सारांश: <strong className="text-white font-black">{filtered.length} व्यवहार</strong></span>
        </div>

        <div className="flex items-center gap-6">
          {totalWeightSum > 0 && (
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">एकूण वजन (Total Weight)</span>
              <span className="text-sm font-black text-emerald-400">
                {totalWeightSum.toLocaleString('en-IN')} KG
              </span>
            </div>
          )}

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">एकूण रक्कम (Total Amount)</span>
            <span className="text-base font-black text-blue-400">
              ₹{totalAmountSum.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

