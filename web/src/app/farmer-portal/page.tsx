"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LogOut, FileText, IndianRupee, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

export default function FarmerPortalPage() {
  const router = useRouter();
  const [farmer, setFarmer] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFarmerProfile();
  }, []);

  const loadFarmerProfile = async () => {
    const raw = localStorage.getItem('active_tenant');
    if (!raw) return router.push('/login');
    const auth = JSON.parse(raw);
    if (auth.userRole !== 'FARMER') return router.push('/login');
    
    // Get full farmer details live
    const { data: fData } = await supabase.from('Farmer').select('*').eq('id', auth.id).single();
    if (fData) {
      setFarmer(fData);
      // Get Agency/Tenant info
      const { data: tData } = await supabase.from('Tenant').select('*').eq('id', fData.tenantId).single();
      setTenant(tData);
      loadLedger(fData.id, fData.tenantId);
    } else {
      router.push('/login');
    }
  };

  const loadLedger = async (farmerId: string, tenantId: string) => {
    // 1. Harvest Purchases (Credits)
    const { data: pData } = await supabase.from('Purchase').select('*').eq('farmerId', farmerId).eq('tenantId', tenantId);
    
    // 2. Payments / Advances (Debits)
    const { data: payData } = await supabase.from('Payment').select('*').eq('entityId', farmerId).eq('entityType', 'FARMER').eq('tenantId', tenantId);
    
    const parseCustomDate = (dateStr: any) => {
      if (!dateStr) return new Date(0);
      try {
        if (dateStr.includes('/')) {
          const parts = dateStr.split('/');
          return new Date(parts[2], parts[1]-1, parts[0]);
        }
        return new Date(dateStr);
      } catch {
        return new Date(0);
      }
    };

    const combined = [
      ...(pData || []).map(p => ({ ...p, _type: 'HARVEST', _dateObj: parseCustomDate(p.date || p.purchaseDate) })),
      ...(payData || []).map(p => ({ ...p, _type: 'PAYMENT', _dateObj: parseCustomDate(p.date || p.paymentDate) }))
    ].sort((a, b) => a._dateObj.getTime() - b._dateObj.getTime());

    let currentBalance = 0;
    const finalLedger = combined.map(item => {
      if (item._type === 'HARVEST') {
        // Advanced is deducted from purchase internally, but visually for ledger we ADD purchase.
        // Wait, if "he will deduct the this amount from purchase bill", 
        // the purchase bill might have `dueAmount` which is after deductions.
        // Usually, Harvest adds to balance.
        currentBalance += parseFloat(item.netAmount || item.totalAmount || 0);
      } else if (item._type === 'PAYMENT') {
        currentBalance -= parseFloat(item.amount || 0);
      }
      return { ...item, _runningBalance: currentBalance };
    });

    setLedger(finalLedger.reverse());
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('active_tenant');
    router.push('/login');
  };

  if (loading || !farmer) return <div className="p-8 text-center animate-pulse">Loading Farmer Portal...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <div className="bg-emerald-600 px-4 pt-8 pb-12 rounded-b-[40px] shadow-lg relative">
        <div className="flex justify-between items-center text-white mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg">
              {farmer.name?.charAt(0) || 'F'}
            </div>
            <div>
              <h1 className="font-bold">{farmer.name}</h1>
              <p className="text-xs opacity-80">{farmer.phone}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center text-white">
          <p className="text-sm font-semibold opacity-90 mb-1">My Outstanding Balance</p>
          <h2 className="text-4xl font-black tracking-tight">₹{farmer.outstandingAmount || 0}</h2>
          <p className="text-xs opacity-80 mt-2">Agency: {tenant?.businessName || tenant?.companyName}</p>
        </div>
      </div>

      {/* Ledger Container */}
      <div className="px-4 -mt-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 min-h-[400px]">
          <h3 className="font-black text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            Account Statement (Ledger)
          </h3>

          <div className="overflow-hidden border border-slate-100 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase border-b border-slate-100">
                <tr>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-3 text-right">Debit</th>
                  <th className="py-3 px-3 text-right">Credit</th>
                  <th className="py-3 px-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledger.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 font-semibold">No transactions found.</td>
                  </tr>
                ) : (
                  ledger.map((item, idx) => {
                    const isHarvest = item._type === 'HARVEST';
                    const amt = parseFloat(item.netAmount || item.totalAmount || item.amount || '0');
                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-3 px-3 text-slate-500 font-medium whitespace-nowrap">
                          {item._dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-3 text-slate-800">
                          <span className="font-bold block">{isHarvest ? 'Crop Harvest Sold' : 'Advance / Payment'}</span>
                          <span className="text-[10px] text-slate-400">{isHarvest ? item.billNo || item.id : item.paymentId || item.id}</span>
                        </td>
                        <td className={`py-3 px-3 text-right font-bold ${!isHarvest ? 'text-rose-600' : 'text-slate-400'}`}>
                          {!isHarvest ? `-₹${amt.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className={`py-3 px-3 text-right font-bold ${isHarvest ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {isHarvest ? `+₹${amt.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-black text-slate-900">
                          ₹{item._runningBalance.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Help Footer */}
      <div className="text-center p-8">
        <p className="text-xs font-semibold text-slate-400">
          Powered by Seavaig Agro CRM
        </p>
      </div>
    </div>
  );
}
