"use client";

import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Key, TrendingUp, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/context/TenantContext';

export function DailyRatePINWidget() {
  const { tenant } = useTenant();
  const [rates, setRates] = useState<any[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (isUnlocked && tenant?.tenantId) {
      loadSellerRates();
    }
  }, [isUnlocked, tenant]);

  const loadSellerRates = async () => {
    // Join SellerCropRates with GlobalSeller to get Seller name
    // Since Supabase RPC or join might be tricky, let's just fetch rates and then fetch sellers
    const { data: ratesData } = await supabase
      .from('SellerCropRates')
      .select('*')
      .eq('tenantId', tenant.tenantId)
      .order('date', { ascending: false });

    if (ratesData) {
      const sellerIds = [...new Set(ratesData.map(r => r.sellerId))];
      const { data: sellers } = await supabase.from('GlobalSeller').select('id, name, phone').in('id', sellerIds);
      
      const enriched = ratesData.map(r => {
        const s = sellers?.find(s => s.id === r.sellerId);
        return { ...r, sellerName: s?.name || s?.phone || 'Unknown Seller' };
      });
      setRates(enriched);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    // Use the actual tenant PIN or fallback to 1234
    const validPin = tenant?.secretPin || '1234';
    if (pinInput === validPin) {
      setIsUnlocked(true);
      setPinError(false);
      setIsModalOpen(false);
    } else {
      setPinError(true);
    }
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm">Seller Market Rates Comparison</h3>
            <p className="text-[11px] text-slate-400">Live rates provided by your registered market sellers</p>
          </div>
        </div>

        {isUnlocked ? (
          <button
            onClick={() => setIsUnlocked(false)}
            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
          >
            <Unlock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Lock Rates</span>
          </button>
        ) : (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Enter Secret PIN to View</span>
          </button>
        )}
      </div>

      {/* Rates Table / List */}
      {isUnlocked ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rates.length === 0 ? (
            <p className="text-xs text-slate-500 font-semibold col-span-full">No sellers have entered rates yet.</p>
          ) : (
            rates.map((r, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between text-xs">
                <div className="flex justify-between items-start mb-2 border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-900">{r.sellerName}</span>
                  <span className="text-[9px] text-slate-400 font-bold">{new Date(r.date).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-slate-700">{r.cropName}</span>
                  <span className="text-sm font-black text-emerald-600">₹{r.rate}/KG</span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-400 flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
            <Lock className="w-6 h-6 text-slate-400" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-1">CLASSIFIED INFORMATION</h4>
            <p>Market rates are locked to protect business intelligence. Please enter your PIN to compare.</p>
          </div>
        </div>
      )}

      {/* Secret PIN Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden p-6 space-y-4 border border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-slate-900 text-sm">Unlock Market Rates</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-500 text-xs">
              Enter your 4-digit Secret PIN (set in Settings) to compare live seller rates.
            </p>

            <form onSubmit={handleUnlock} className="space-y-3">
              <input
                type="password"
                maxLength={6}
                placeholder="Enter PIN..."
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full p-3 text-center text-lg font-black tracking-widest bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                required
              />
              {pinError && <p className="text-[11px] font-bold text-rose-600 text-center">Invalid PIN Code!</p>}

              <button
                type="submit"
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl shadow-lg cursor-pointer"
              >
                Authorize & Unlock Rate Sheet
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
