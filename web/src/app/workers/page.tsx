"use client";

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useLanguage } from '@/context/LanguageContext';
import {
  Users,
  Clock,
  DollarSign,
  UserPlus,
  Calendar,
  CheckCircle,
  Plus,
  Search,
  Filter,
  Download,
  ChevronRight,
  X,
  FileText
} from 'lucide-react';
import {
  apiGetWorkers,
  apiCreateWorker,
  apiRecordAttendance,
  apiRecordWorkerPayment,
  apiGetWorkerHistory
} from '@/lib/api';

export default function WorkersPage() {
  const { t, language } = useLanguage();
  const [workers, setWorkers] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    totalActive: 0,
    totalEarned: '₹0',
    totalPaid: '₹0',
    outstandingBalance: '₹0',
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAddWorkerOpen, setIsAddWorkerOpen] = useState(false);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<any | null>(null);

  // Forms State
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerPhone, setNewWorkerPhone] = useState('');
  const [newWorkerRole, setNewWorkerRole] = useState('LABOUR');
  const [newWorkerRate, setNewWorkerRate] = useState('500');

  // Attendance Form
  const [checkInTime, setCheckInTime] = useState('08:00 AM');
  const [checkOutTime, setCheckOutTime] = useState('05:00 PM');
  const [hoursWorked, setHoursWorked] = useState('9');
  const [overtimeAmount, setOvertimeAmount] = useState('0');
  const [attendanceNotes, setAttendanceNotes] = useState('');

  // Payment Form
  const [paymentAmount, setPaymentAmount] = useState('500');
  const [paymentType, setPaymentType] = useState('GENERAL_PAYOUT');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const cached = typeof window !== 'undefined' ? localStorage.getItem('seavaig_workers_cache') : null;
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) setWorkers(parsed);
      } catch {}
    }

    const res = await apiGetWorkers();
    if (res) {
      const list = Array.isArray(res) ? res : ((res as any)?.data || []);
      if (list && list.length > 0) {
        setWorkers(list);
        if ((res as any)?.summary) setSummary((res as any).summary);
        if (typeof window !== 'undefined') {
          localStorage.setItem('seavaig_workers_cache', JSON.stringify(list));
        }
      }
    }
  }

  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const nextNum = 10001 + workers.length;
    const newWrk = {
      id: `wrk-${Date.now()}`,
      workerIdCode: `WRK-${nextNum}`,
      name: newWorkerName,
      phone: newWorkerPhone,
      role: newWorkerRole,
      dailyRate: Number(newWorkerRate) || 500,
      totalEarned: 0,
      totalPaid: 0,
      outstandingBalance: 0
    };
    await apiCreateWorker(newWrk);
    setLoading(false);
    const updated = [newWrk, ...workers];
    setWorkers(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('seavaig_workers_cache', JSON.stringify(updated));
    }
    setIsAddWorkerOpen(false);
    setNewWorkerName('');
    setNewWorkerPhone('');
  };

  const defaultWorkers: any[] = [];

  useEffect(() => {
    const cached = typeof window !== 'undefined' ? localStorage.getItem('seavaig_workers_cache') : null;
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setWorkers(parsed);
        } else {
          setWorkers(defaultWorkers);
        }
      } catch {
        setWorkers(defaultWorkers);
      }
    } else {
      setWorkers(defaultWorkers);
    }
  }, []);

  const handleRecordAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker) return;
    setLoading(true);
    const hrs = Number(hoursWorked) || 8;
    const rate = Number(newWorkerRate) || selectedWorker.dailyRate || 500;
    const earnedThisShift = (hrs / 8) * rate + (Number(overtimeAmount) || 0);

    await apiRecordAttendance({
      workerId: selectedWorker.id,
      checkInTime,
      checkOutTime,
      hoursWorked: hrs,
      overtimeAmount: Number(overtimeAmount) || 0,
      notes: attendanceNotes,
    });

    const updated = workers.map((w) => {
      if (w.id === selectedWorker.id) {
        const newEarned = (w.totalEarned || 0) + earnedThisShift;
        const newPaid = w.totalPaid || 0;
        return {
          ...w,
          totalEarned: newEarned,
          outstandingBalance: Math.max(0, newEarned - newPaid),
        };
      }
      return w;
    });

    setWorkers(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('seavaig_workers_cache', JSON.stringify(updated));
    }
    setLoading(false);
    setIsAttendanceModalOpen(false);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker) return;
    setLoading(true);
    const payAmt = Number(paymentAmount) || 0;

    await apiRecordWorkerPayment({
      workerId: selectedWorker.id,
      amount: payAmt,
      paymentType,
      paymentMode,
      notes: paymentNotes,
    });

    const updated = workers.map((w) => {
      if (w.id === selectedWorker.id) {
        const newPaid = (w.totalPaid || 0) + payAmt;
        const earned = w.totalEarned || 0;
        return {
          ...w,
          totalPaid: newPaid,
          outstandingBalance: Math.max(0, earned - newPaid),
        };
      }
      return w;
    });

    setWorkers(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('seavaig_workers_cache', JSON.stringify(updated));
    }
    setLoading(false);
    setIsPaymentModalOpen(false);
  };

  const filteredWorkers = workers.filter(
    (w) =>
      (w.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.workerCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.role || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 antialiased">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                {language === 'mr' ? 'रोजंदारी कामगार व हजेरी पुस्तक' : 'Daily Worker Attendance & Wage Billing'}
              </h1>
              <p className="text-xs font-semibold text-slate-500 mt-1 flex items-center gap-1">
                <span>{t.dashboard}</span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="text-slate-600">Daily Worker Attendance & Payouts</span>
              </p>
            </div>

            <button
              onClick={() => setIsAddWorkerOpen(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register Daily Worker</span>
            </button>
          </div>

          {/* Metric Summary Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Active Workers</span>
                <h3 className="text-xl font-extrabold text-slate-900">{summary.totalActive} Workers</h3>
                <span className="text-[10px] font-bold text-blue-600">Registered Staff</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Total Wages Earned</span>
                <h3 className="text-xl font-extrabold text-slate-900">{summary.totalEarned}</h3>
                <span className="text-[10px] font-bold text-emerald-600">Calculated Work Hours</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Total Wages Paid Out</span>
                <h3 className="text-xl font-extrabold text-slate-900">{summary.totalPaid}</h3>
                <span className="text-[10px] font-bold text-purple-600">Disbursed Payments</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Outstanding Balance</span>
                <h3 className="text-xl font-extrabold text-slate-900">{summary.outstandingBalance}</h3>
                <span className="text-[10px] font-bold text-amber-600">Pending Worker Dues</span>
              </div>
            </div>
          </div>

          {/* Workers Directory Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search worker name, code or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Worker Code</th>
                    <th className="py-3.5 px-4">Worker Name</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Daily Rate</th>
                    <th className="py-3.5 px-4">Total Earned</th>
                    <th className="py-3.5 px-4">Total Paid</th>
                    <th className="py-3.5 px-4">Outstanding Due</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredWorkers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                        No Daily Workers Registered Yet. Click "Register Daily Worker" above.
                      </td>
                    </tr>
                  ) : (
                    filteredWorkers.map((w) => (
                      <tr key={w.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-black text-blue-600">{w.workerCode}</td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-900">
                          {w.name}
                          <div className="text-[10px] text-slate-400 font-normal">{w.phone}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                            {w.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-slate-800">₹{w.dailyRate}/day</td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">₹{(w.totalEarned || 0).toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4 font-extrabold text-emerald-600">₹{(w.totalPaid || 0).toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4 font-black text-amber-600">₹{(w.outstandingBalance || 0).toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedWorker(w);
                                setIsAttendanceModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Clock className="w-3 h-3" />
                              <span>Log Attendance</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedWorker(w);
                                setIsPaymentModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <DollarSign className="w-3 h-3" />
                              <span>Pay Wages</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Register Worker Modal */}
      {isAddWorkerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-900">Register New Daily Worker</h2>
              <button onClick={() => setIsAddWorkerOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWorker} className="space-y-3">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Full Worker Name</label>
                <input
                  type="text"
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  required
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Mobile Phone</label>
                <input
                  type="text"
                  value={newWorkerPhone}
                  onChange={(e) => setNewWorkerPhone(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Role / Duty</label>
                  <select
                    value={newWorkerRole}
                    onChange={(e) => setNewWorkerRole(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="LABOUR">LABOUR (शेतमजूर)</option>
                    <option value="PACKER">PACKER (पॅकिंग)</option>
                    <option value="LOADER">LOADER (हमाल / लोडिंग)</option>
                    <option value="DRIVER">DRIVER (चालक)</option>
                    <option value="SUPERVISOR">SUPERVISOR (मुकादम)</option>
                  </select>
                </div>

                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Standard Daily Rate (₹)</label>
                  <input
                    type="number"
                    value={newWorkerRate}
                    onChange={(e) => setNewWorkerRate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-blue-600"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddWorkerOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 font-bold rounded-xl text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 font-extrabold rounded-xl text-white shadow-lg"
                >
                  Save Worker Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Attendance Modal */}
      {isAttendanceModalOpen && selectedWorker && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  {selectedWorker.workerCode}
                </span>
                <h2 className="text-sm font-black text-slate-900 mt-1">Log Daily Attendance & Hours ({selectedWorker.name})</h2>
              </div>
              <button onClick={() => setIsAttendanceModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordAttendance} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Check-In Time (X)</label>
                  <input
                    type="text"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-center"
                    placeholder="08:00 AM"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Check-Out Time (Y)</label>
                  <input
                    type="text"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-center"
                    placeholder="05:00 PM"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Hours Worked</label>
                  <input
                    type="number"
                    value={hoursWorked}
                    onChange={(e) => setHoursWorked(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-blue-600"
                    required
                  />
                </div>
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Overtime Bonus (₹)</label>
                  <input
                    type="number"
                    value={overtimeAmount}
                    onChange={(e) => setOvertimeAmount(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Attendance Notes / Remarks</label>
                <input
                  type="text"
                  value={attendanceNotes}
                  onChange={(e) => setAttendanceNotes(e.target.value)}
                  placeholder="e.g. Worked in Cold Room #1 loading..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl font-bold text-slate-800 flex justify-between">
                <span>Calculated Wage for Day:</span>
                <span className="text-blue-600 font-black">
                  ₹{((selectedWorker.dailyRate / 8) * Number(hoursWorked) + Number(overtimeAmount)).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAttendanceModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 font-bold rounded-xl text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 font-extrabold rounded-xl text-white shadow-lg"
                >
                  Record Attendance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Worker Wage Modal */}
      {isPaymentModalOpen && selectedWorker && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  {selectedWorker.workerCode}
                </span>
                <h2 className="text-sm font-black text-slate-900 mt-1">Disburse Wage Payment ({selectedWorker.name})</h2>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Payment Amount (₹)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-emerald-600 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Payment Type</label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="GENERAL_PAYOUT">Full Wage Payout</option>
                    <option value="ADVANCE_PAYOUT">Advance Payment (अ‍ॅडव्हान्स)</option>
                    <option value="PURCHASE_SETTLEMENT">Installment Settlement</option>
                  </select>
                </div>
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="CASH">CASH (नगद)</option>
                    <option value="UPI">UPI (GooglePay / PhonePe)</option>
                    <option value="BANK_TRANSFER">BANK TRANSFER</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Description / Reason Notes</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Weekly wage disbursement for harvest season..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 font-bold rounded-xl text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 font-extrabold rounded-xl text-white shadow-lg shadow-emerald-600/20"
                >
                  Disburse Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
