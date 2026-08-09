"use client";

import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Key, CheckCircle, TrendingUp, RefreshCw, X, Plus } from 'lucide-react';
import { apiGetDailyRates, apiVerifyPin, apiUpdateDailyRate } from '@/lib/api';

export function DailyRatePINWidget() {
  const [rates, setRates] = useState<any[]>([]);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Rate Form
  const [cropName, setCropName] = useState('Strawberry (A Grade)');
  const [grade, setGrade] = useState('A_GRADE');
  const [unit, setUnit] = useState('PER_KG');
  const [rate, setRate] = useState('280');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadRates() {
      const res = await apiGetDailyRates();
      if (res && Array.isArray(res)) {
        setRates(res);
      }
    }
    loadRates();
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await apiVerifyPin(pinInput);
    if (res && res.success) {
      setIsUnlocked(true);
      setPinError(false);
      setIsModalOpen(false);
    } else {
      setPinError(true);
    }
  };

  const handleAddRate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await apiUpdateDailyRate({
      pin: pinInput || '1234',
      cropName,
      grade,
      unit,
      rate: Number(rate) || 0,
    });
    setLoading(false);
    if (res) {
      const updated = await apiGetDailyRates();
      if (updated && Array.isArray(updated)) setRates(updated);
      setCropName('New Veg/Fruit Crop');
      setRate('150');
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
            <h3 className="font-extrabold text-slate-900 text-sm">Daily Crop Market Rate Sheet</h3>
            <p className="text-[11px] text-slate-400">Official Daily Vegetable & Fruit Prices (Per KG / Ton)</p>
          </div>
        </div>

        {isUnlocked ? (
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-extrabold flex items-center gap-1">
            <Unlock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Unlocked (Client Authorized)</span>
          </span>
        ) : (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Enter Secret PIN to Edit</span>
          </button>
        )}
      </div>

      {/* Rates Table / List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {rates.map((r, idx) => (
          <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-slate-900 block">{r.cropName}</span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">{r.unit?.replace('_', ' ') || 'PER KG'}</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-black text-blue-600">₹{r.rate}</span>
              <span className="text-[9px] text-emerald-600 font-bold block">Live Rate</span>
            </div>
          </div>
        ))}
      </div>

      {/* If Unlocked, show Add/Update Rate Form */}
      {isUnlocked && (
        <form onSubmit={handleAddRate} className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
          <input
            type="text"
            placeholder="Crop / Veg Name"
            value={cropName}
            onChange={(e) => setCropName(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
            required
          />
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
          >
            <option value="PER_KG">Per KG (दर किलो)</option>
            <option value="PER_TON">Per Ton (दर टन)</option>
            <option value="PER_CRATE">Per Crate (दर कॅरेट)</option>
            <option value="PER_QTY">Per Qty (दर नग)</option>
          </select>
          <input
            type="number"
            placeholder="Rate (₹)"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-blue-600"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="p-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl shadow-md shadow-blue-600/20 cursor-pointer flex items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4" />
            <span>{loading ? 'Saving...' : 'Update Rate'}</span>
          </button>
        </form>
      )}

      {/* Secret PIN Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden p-6 space-y-4 border border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-slate-900 text-sm">Client Secret Authorization</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-500 text-xs">
              Daily market rates and profit margins are protected. Enter your 4-digit Client Secret PIN (Default: <strong className="text-slate-800">1234</strong>) to unlock.
            </p>

            <form onSubmit={handleUnlock} className="space-y-3">
              <input
                type="password"
                maxLength={6}
                placeholder="Enter PIN (e.g. 1234)"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full p-3 text-center text-lg font-black tracking-widest bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                required
              />
              {pinError && <p className="text-[11px] font-bold text-rose-600 text-center">Invalid PIN Code! Try 1234.</p>}

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
