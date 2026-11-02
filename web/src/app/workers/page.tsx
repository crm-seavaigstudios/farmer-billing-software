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
  CheckCircle2,
  Plus,
  Search,
  Filter,
  Download,
  ChevronRight,
  X,
  FileText,
  Wallet,
  ArrowRight,
  IndianRupee,
  Receipt,
  Scale,
  History,
  AlertCircle
} from 'lucide-react';
import {
  apiGetWorkers,
  apiCreateWorker,
  apiRecordAttendance,
  apiRecordWorkerPayment,
  apiGetWorkerHistory,
  apiUpdateWorker,
  getTenantId
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
  const [isWorkerDetailOpen, setIsWorkerDetailOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<any | null>(null);

  // Forms State
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerPhone, setNewWorkerPhone] = useState('');
  const [newWorkerRole, setNewWorkerRole] = useState('LABOUR');
  const [newWorkerRate, setNewWorkerRate] = useState('500');

  // Attendance Form
  const [shiftType, setShiftType] = useState('FULL_DAY');
  const [adjustedWage, setAdjustedWage] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [hoursWorked, setHoursWorked] = useState('8');
  const [overtimeAmount, setOvertimeAmount] = useState('0');
  const [workDescription, setWorkDescription] = useState('तोडणी व प्रतवारी (Harvesting & Sorting)');
  const [attendanceNotes, setAttendanceNotes] = useState('');

  // Payment Form & Custom Advance Deduction
  const [paymentAmount, setPaymentAmount] = useState('500');
  const [paymentType, setPaymentType] = useState('GENERAL_PAYOUT');
  const [paymentMode, setPaymentMode] = useState('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [deductionMode, setDeductionMode] = useState<'KEEP_ADVANCE' | 'SETTLE_MAX' | 'CUSTOM'>('KEEP_ADVANCE');
  const [customAdvanceInput, setCustomAdvanceInput] = useState('');

  // Drawer Tabs
  const [drawerTab, setDrawerTab] = useState<'ATTENDANCE' | 'PAYMENTS' | 'LEDGER'>('ATTENDANCE');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const tenantId = getTenantId();
    const cached = typeof window !== 'undefined' && tenantId ? localStorage.getItem(`seavaig_workers_cache_${tenantId}`) : null;
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
        if (typeof window !== 'undefined' && tenantId) {
          localStorage.setItem(`seavaig_workers_cache_${tenantId}`, JSON.stringify(list));
        }
      }
    }
  }

  const handleCreateWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const tenantId = getTenantId();
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
    if (typeof window !== 'undefined' && tenantId) {
      localStorage.setItem(`seavaig_workers_cache_${tenantId}`, JSON.stringify(updated));
    }
    setIsAddWorkerOpen(false);
    setNewWorkerName('');
    setNewWorkerPhone('');
  };

  const defaultWorkers: any[] = [];

  const handleRecordAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker) return;
    setLoading(true);
    const tenantId = getTenantId();

    const baseRate = adjustedWage ? Number(adjustedWage) : (selectedWorker.dailyRate || 500);
    let earnedThisShift = 0;
    let hoursToSave = '8';
    
    if (shiftType === 'FULL_DAY') {
      earnedThisShift = baseRate;
      hoursToSave = '8';
    } else if (shiftType === 'HALF_DAY') {
      earnedThisShift = baseRate / 2;
      hoursToSave = '4';
    } else if (shiftType === 'OVERTIME') {
      earnedThisShift = Number(overtimeAmount) || 0;
      hoursToSave = hoursWorked;
    } else if (shiftType === 'HOURS') {
      earnedThisShift = (Number(hoursWorked) / 8) * baseRate;
      hoursToSave = hoursWorked;
    }

    const historyItem = {
      id: `att-${Date.now()}`,
      workerId: selectedWorker.id,
      workerCode: selectedWorker.workerCode,
      date: attendanceDate,
      shift: shiftType,
      hours: hoursToSave,
      wage: earnedThisShift,
      workDescription: workDescription || 'General Farm Work',
      type: 'ATTENDANCE',
      notes: attendanceNotes
    };

    const currentHistory = Array.isArray(selectedWorker.attendanceHistory) ? selectedWorker.attendanceHistory : [];
    const newHistory = [historyItem, ...currentHistory];

    const newEarned = (selectedWorker.totalEarned || 0) + earnedThisShift;
    const newPaid = selectedWorker.totalPaid || 0;
    const newOutstanding = Math.max(0, newEarned - newPaid);

    const workerUpdates = {
      totalEarned: newEarned,
      outstandingBalance: newOutstanding,
      attendanceHistory: newHistory
    };

    await apiRecordAttendance(historyItem);
    await apiUpdateWorker(selectedWorker.id, workerUpdates);

    const updated = workers.map((w) => {
      if (w.id === selectedWorker.id) {
        return { ...w, ...workerUpdates };
      }
      return w;
    });

    setWorkers(updated);
    setSelectedWorker({ ...selectedWorker, ...workerUpdates });
    if (typeof window !== 'undefined' && tenantId) {
      localStorage.setItem(`seavaig_workers_cache_${tenantId}`, JSON.stringify(updated));
    }
    setLoading(false);
    setIsAttendanceModalOpen(false);
    setAdjustedWage('');
    setShiftType('FULL_DAY');
    setHoursWorked('8');
    setOvertimeAmount('0');
    setAttendanceNotes('');
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorker) return;
    setLoading(true);
    const tenantId = getTenantId();
    const payAmt = Number(paymentAmount) || 0;

    const currentAdvBalance = Number(selectedWorker.advanceBalance) || 0;
    let advanceDeducted = 0;

    if (paymentType === 'ADVANCE_PAYOUT') {
      // Disbursing advance to worker
      const newAdvanceBalance = currentAdvBalance + payAmt;
      const paymentRecord = {
        workerId: selectedWorker.id,
        workerName: selectedWorker.name,
        workerCode: selectedWorker.workerCode,
        amount: payAmt,
        netDisbursed: payAmt,
        advanceDeducted: 0,
        paymentType: 'ADVANCE_PAYOUT',
        paymentMode,
        notes: paymentNotes || 'कामगारास उचल / ॲडव्हान्स वाटप',
        date: new Date().toISOString()
      };

      await apiRecordWorkerPayment(paymentRecord);
      await apiUpdateWorker(selectedWorker.id, { advanceBalance: newAdvanceBalance });

      const updated = workers.map((w) => {
        if (w.id === selectedWorker.id) {
          const existingPayments = Array.isArray(w.paymentHistory) ? w.paymentHistory : [];
          return {
            ...w,
            advanceBalance: newAdvanceBalance,
            paymentHistory: [paymentRecord, ...existingPayments]
          };
        }
        return w;
      });

      setWorkers(updated);
      setSelectedWorker((prev: any) => ({
        ...prev,
        advanceBalance: newAdvanceBalance,
        paymentHistory: [paymentRecord, ...(prev.paymentHistory || [])]
      }));

      if (typeof window !== 'undefined' && tenantId) {
        localStorage.setItem(`seavaig_workers_cache_${tenantId}`, JSON.stringify(updated));
      }
    } else {
      // Disbursing regular wage payout with optional advance deduction
      if (currentAdvBalance > 0) {
        if (deductionMode === 'SETTLE_MAX') {
          advanceDeducted = Math.min(currentAdvBalance, payAmt);
        } else if (deductionMode === 'CUSTOM') {
          advanceDeducted = Math.min(currentAdvBalance, Math.min(payAmt, Number(customAdvanceInput) || 0));
        }
      }

      const netCashPayout = Math.max(0, payAmt - advanceDeducted);
      const newAdvanceBalance = Math.max(0, currentAdvBalance - advanceDeducted);
      const newTotalPaid = (Number(selectedWorker.totalPaid) || 0) + payAmt;
      const totalEarned = Number(selectedWorker.totalEarned) || 0;
      const newOutstanding = Math.max(0, totalEarned - newTotalPaid);

      const paymentRecord = {
        workerId: selectedWorker.id,
        workerName: selectedWorker.name,
        workerCode: selectedWorker.workerCode,
        amount: payAmt,
        netDisbursed: netCashPayout,
        advanceDeducted,
        paymentType: 'GENERAL_PAYOUT',
        paymentMode,
        notes: paymentNotes || (advanceDeducted > 0 ? `मजुरी अदा (उचल कपात: ₹${advanceDeducted})` : 'मजुरी अदा'),
        date: new Date().toISOString()
      };

      await apiRecordWorkerPayment(paymentRecord);
      await apiUpdateWorker(selectedWorker.id, {
        totalPaid: newTotalPaid,
        outstandingBalance: newOutstanding,
        advanceBalance: newAdvanceBalance
      });

      const updated = workers.map((w) => {
        if (w.id === selectedWorker.id) {
          const existingPayments = Array.isArray(w.paymentHistory) ? w.paymentHistory : [];
          return {
            ...w,
            totalPaid: newTotalPaid,
            outstandingBalance: newOutstanding,
            advanceBalance: newAdvanceBalance,
            paymentHistory: [paymentRecord, ...existingPayments]
          };
        }
        return w;
      });

      setWorkers(updated);
      setSelectedWorker((prev: any) => ({
        ...prev,
        totalPaid: newTotalPaid,
        outstandingBalance: newOutstanding,
        advanceBalance: newAdvanceBalance,
        paymentHistory: [paymentRecord, ...(prev.paymentHistory || [])]
      }));

      if (typeof window !== 'undefined' && tenantId) {
        localStorage.setItem(`seavaig_workers_cache_${tenantId}`, JSON.stringify(updated));
      }
    }

    setLoading(false);
    setIsPaymentModalOpen(false);
    setCustomAdvanceInput('');
    setDeductionMode('KEEP_ADVANCE');
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
                            <button
                              onClick={() => {
                                setSelectedWorker(w);
                                setIsWorkerDetailOpen(true);
                              }}
                              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Details</span>
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
                  <label className="font-extrabold text-slate-700 block mb-1">Attendance Date</label>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">Shift Type</label>
                  <select
                    value={shiftType}
                    onChange={(e) => setShiftType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="FULL_DAY">Full Day (8 hrs)</option>
                    <option value="HALF_DAY">Half Day (4 hrs)</option>
                    <option value="HOURS">Custom Hours</option>
                    <option value="OVERTIME">Overtime Only</option>
                  </select>
                </div>
              </div>

              {(shiftType === 'HOURS' || shiftType === 'OVERTIME') && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-extrabold text-slate-700 block mb-1">Hours Worked</label>
                    <input
                      type="number"
                      value={hoursWorked}
                      onChange={(e) => setHoursWorked(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-blue-600"
                    />
                  </div>
                  {shiftType === 'OVERTIME' && (
                    <div>
                      <label className="font-extrabold text-slate-700 block mb-1">Overtime Bonus (₹)</label>
                      <input
                        type="number"
                        value={overtimeAmount}
                        onChange={(e) => setOvertimeAmount(e.target.value)}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-emerald-600"
                      />
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Daily Wage / Adjust Base Rate (₹)</label>
                <input
                  type="number"
                  value={adjustedWage}
                  onChange={(e) => setAdjustedWage(e.target.value)}
                  placeholder={`Default: ₹${selectedWorker.dailyRate}`}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">कामाचे स्वरूप / Description of Work *</label>
                <input
                  type="text"
                  required
                  value={workDescription}
                  onChange={(e) => setWorkDescription(e.target.value)}
                  placeholder="उदा. तोडणी, खुरपणी, पॅकिंग, गाडी भरणे (Harvesting, Sorting, Packing)"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['तोडणी (Harvesting)', 'खुरपणी (Weeding)', 'पॅकिंग व प्रतवारी (Sorting & Packing)', 'गाडी लोडिंग (Loading)', 'फवारणी (Spraying)'].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setWorkDescription(chip)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 transition-colors cursor-pointer"
                    >
                      {chip}
                    </button>
                  ))}
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
                  ₹{(() => {
                    const baseRate = adjustedWage ? Number(adjustedWage) : (selectedWorker.dailyRate || 500);
                    if (shiftType === 'FULL_DAY') return baseRate;
                    if (shiftType === 'HALF_DAY') return baseRate / 2;
                    if (shiftType === 'HOURS') return (Number(hoursWorked) / 8) * baseRate;
                    if (shiftType === 'OVERTIME') return Number(overtimeAmount) || 0;
                    return 0;
                  })().toLocaleString('en-IN')}
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">पेमेंट प्रकार (Payment Type)</label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="GENERAL_PAYOUT">मजुरी वाटप (Wage Payout)</option>
                    <option value="ADVANCE_PAYOUT">उचल / ॲडव्हान्स (Advance Payout)</option>
                  </select>
                </div>
                <div>
                  <label className="font-extrabold text-slate-700 block mb-1">पेमेंट मोड (Payment Mode)</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="CASH">CASH (नगद)</option>
                    <option value="UPI">UPI (GooglePay / PhonePe)</option>
                    <option value="BANK_TRANSFER">BANK TRANSFER (बँक जमा)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">
                  {paymentType === 'ADVANCE_PAYOUT' ? 'दिलेली उचल रक्कम (Advance Amount ₹) *' : 'देय मजुरी रक्कम (Wage Amount ₹) *'}
                </label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-emerald-600 text-sm"
                  required
                />
              </div>

              {/* ADVANCE DEDUCTION COMPONENT */}
              {paymentType === 'GENERAL_PAYOUT' && (Number(selectedWorker.advanceBalance) || 0) > 0 && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-amber-900 text-xs flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-amber-700" />
                      मजुराकडे उचल शिल्लक: ₹{Number(selectedWorker.advanceBalance || 0).toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 uppercase bg-amber-100 px-2 py-0.5 rounded-full">
                      Advance Active
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDeductionMode('KEEP_ADVANCE')}
                      className={`p-2 rounded-xl text-center border font-bold text-[10px] transition-all cursor-pointer ${
                        deductionMode === 'KEEP_ADVANCE'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      उचल तशीच ठेवा
                      <span className="block text-[8px] font-normal opacity-90">(Keep Advance)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeductionMode('SETTLE_MAX')}
                      className={`p-2 rounded-xl text-center border font-bold text-[10px] transition-all cursor-pointer ${
                        deductionMode === 'SETTLE_MAX'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      पूर्ण उचल कपात
                      <span className="block text-[8px] font-normal opacity-90">(Max Settle)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeductionMode('CUSTOM')}
                      className={`p-2 rounded-xl text-center border font-bold text-[10px] transition-all cursor-pointer ${
                        deductionMode === 'CUSTOM'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      कस्टम कपात
                      <span className="block text-[8px] font-normal opacity-90">(Custom Amount)</span>
                    </button>
                  </div>

                  {deductionMode === 'CUSTOM' && (
                    <div className="pt-1">
                      <label className="text-[10px] font-bold text-amber-900 block mb-1">कपात करावयाची उचल रक्कम (₹):</label>
                      <input
                        type="number"
                        placeholder="उदा. 200"
                        value={customAdvanceInput}
                        onChange={(e) => setCustomAdvanceInput(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs font-bold text-amber-900"
                      />
                    </div>
                  )}

                  {(() => {
                    const gross = Number(paymentAmount) || 0;
                    const advBal = Number(selectedWorker.advanceBalance) || 0;
                    let toDeduct = 0;
                    if (deductionMode === 'SETTLE_MAX') toDeduct = Math.min(advBal, gross);
                    else if (deductionMode === 'CUSTOM') toDeduct = Math.min(advBal, Math.min(gross, Number(customAdvanceInput) || 0));

                    const netPayout = Math.max(0, gross - toDeduct);
                    const remainingAdv = Math.max(0, advBal - toDeduct);

                    return (
                      <div className="bg-white/90 rounded-xl p-2.5 border border-amber-200 text-xs space-y-1">
                        <div className="flex justify-between text-slate-600">
                          <span>देय मजुरी (Gross Wage):</span>
                          <span className="font-bold">₹{gross.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between text-amber-700 font-bold">
                          <span>उचल कपात (Advance Deducted):</span>
                          <span>-₹{toDeduct.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="border-t border-amber-200 pt-1 flex justify-between font-black text-emerald-700 text-sm">
                          <span>हातात द्यायची रक्कम (Net Cash Payout):</span>
                          <span>₹{netPayout.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 pt-0.5">
                          उर्वरित उचल शिल्लक राहील: ₹{remainingAdv.toLocaleString('en-IN')}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">तपशील व नोंद (Notes / Remarks)</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="उदा. आठवडा मजुरी किंवा घरगुती कामासाठी उचल..."
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

      {/* Worker Detail / Complete History & Passbook Drawer */}
      {isWorkerDetailOpen && selectedWorker && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-2xs transition-opacity"
            onClick={() => setIsWorkerDetailOpen(false)}
          ></div>
          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right">
            
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-purple-300 bg-purple-900/60 border border-purple-700/50 px-2 py-0.5 rounded">
                    {selectedWorker.workerCode}
                  </span>
                  <span className="text-xs font-bold text-slate-400">📞 {selectedWorker.phone || 'No phone'}</span>
                </div>
                <h2 className="text-lg font-black text-white mt-1">{selectedWorker.name}</h2>
                <div className="text-xs text-slate-300 font-semibold mt-0.5">
                  {selectedWorker.role} • दैनंदिन दर: ₹{selectedWorker.dailyRate}/दिवस (₹{selectedWorker.dailyRate}/day)
                </div>
              </div>
              <button 
                onClick={() => setIsWorkerDetailOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 4 Financial KPI Summary Cards */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">एकूण कमाई</span>
                  <span className="text-base font-black text-slate-900 mt-0.5 block">
                    ₹{(Number(selectedWorker.totalEarned) || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[9px] text-blue-600 font-bold">हजेरी हिशोब</span>
                </div>

                <div className="bg-white p-2.5 rounded-2xl border border-emerald-200/80 bg-emerald-50/20 shadow-2xs">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">अदा मजुरी</span>
                  <span className="text-base font-black text-emerald-700 mt-0.5 block">
                    ₹{(Number(selectedWorker.totalPaid) || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[9px] text-emerald-600 font-bold">एकूण दिलेली</span>
                </div>

                <div className={`p-2.5 rounded-2xl border shadow-2xs ${(Number(selectedWorker.advanceBalance) || 0) > 0 ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-slate-200'}`}>
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">उचल शिल्लक</span>
                  <span className="text-base font-black mt-0.5 block text-amber-800">
                    ₹{(Number(selectedWorker.advanceBalance) || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[9px] text-amber-600 font-bold">कपातीस पात्र</span>
                </div>

                <div className={`p-2.5 rounded-2xl border shadow-2xs ${(Number(selectedWorker.outstandingBalance) || 0) > 0 ? 'bg-rose-50/60 border-rose-200' : 'bg-emerald-50/40 border-emerald-200'}`}>
                  <span className="text-[10px] font-bold uppercase tracking-wider block text-rose-700">शिल्लक देय</span>
                  <span className="text-base font-black mt-0.5 block text-rose-800">
                    ₹{(Number(selectedWorker.outstandingBalance) || 0).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[9px] font-bold text-rose-600">उर्वरित देय</span>
                </div>
              </div>

              {/* Quick Action Buttons in Drawer */}
              <div className="flex gap-2 mt-3 pt-2 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setIsAttendanceModalOpen(true)}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>+ हजेरी व काम</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('ADVANCE_PAYOUT');
                    setPaymentAmount('500');
                    setIsPaymentModalOpen(true);
                  }}
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>+ उचल द्या (Advance)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('GENERAL_PAYOUT');
                    setPaymentAmount(String(selectedWorker.outstandingBalance || selectedWorker.dailyRate || 500));
                    setIsPaymentModalOpen(true);
                  }}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>+ मजुरी अदा (Pay)</span>
                </button>
              </div>
            </div>

            {/* Tab Navigation with horizontal scrolling */}
            <div className="flex border-b border-slate-200 bg-white px-4 pt-2 overflow-x-auto whitespace-nowrap scrollbar-none shrink-0 gap-2">
              <button
                onClick={() => setDrawerTab('ATTENDANCE')}
                className={`pb-3 px-3 text-xs font-black border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 whitespace-nowrap ${
                  drawerTab === 'ATTENDANCE'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>दिनवार हजेरी व काम</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-50 text-blue-700 font-bold">
                  {(selectedWorker.attendanceHistory || []).length}
                </span>
              </button>

              <button
                onClick={() => setDrawerTab('PAYMENTS')}
                className={`pb-3 px-3 text-xs font-black border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 whitespace-nowrap ${
                  drawerTab === 'PAYMENTS'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Wallet className="w-3.5 h-3.5 shrink-0" />
                <span>पेमेंट व उचल इतिहास</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-50 text-emerald-700 font-bold">
                  {(selectedWorker.paymentHistory || []).length}
                </span>
              </button>

              <button
                onClick={() => setDrawerTab('LEDGER')}
                className={`pb-3 px-3 text-xs font-black border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors shrink-0 whitespace-nowrap ${
                  drawerTab === 'LEDGER'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Receipt className="w-3.5 h-3.5 shrink-0" />
                <span>पासबुक लेजर (Ledger)</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 space-y-3">
              {/* TAB 1: ATTENDANCE & WORK */}
              {drawerTab === 'ATTENDANCE' && (
                <div>
                  {(!selectedWorker.attendanceHistory || selectedWorker.attendanceHistory.length === 0) ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
                      <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-500">कोणतीही हजेरी नोंद आढळली नाही</p>
                      <p className="text-xs text-slate-400 mt-0.5">Click "+ हजेरी व काम" above to record daily work.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedWorker.attendanceHistory.map((record: any, idx: number) => (
                        <div key={idx} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg">
                                {record.date}
                              </span>
                              <span className="text-xs font-extrabold text-slate-800">
                                {record.shift === 'FULL_DAY' && 'Full Day (8 तास)'}
                                {record.shift === 'HALF_DAY' && 'Half Day (4 तास)'}
                                {record.shift === 'HOURS' && `${record.hours} तास`}
                                {record.shift === 'OVERTIME' && `ओव्हरटाईम (${record.hours} तास)`}
                              </span>
                            </div>

                            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <span className="text-purple-600">🔨</span>
                              <span>{record.workDescription || record.notes || 'शेतातील सर्वसाधारण काम (Farm Labor)'}</span>
                            </div>

                            {record.notes && record.workDescription && record.notes !== record.workDescription && (
                              <div className="text-[10px] text-slate-400 font-medium italic">
                                टीप: {record.notes}
                              </div>
                            )}
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] font-extrabold text-emerald-600 uppercase block">कमाई (Earned)</span>
                            <span className="text-base font-black text-slate-900 block mt-0.5">
                              +₹{(Number(record.wage) || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: PAYMENTS & ADVANCES */}
              {drawerTab === 'PAYMENTS' && (
                <div>
                  {(!selectedWorker.paymentHistory || selectedWorker.paymentHistory.length === 0) ? (
                    <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
                      <Wallet className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-bold text-slate-500">कोणताही पेमेंट किंवा उचल इतिहास आढळला नाही</p>
                      <p className="text-xs text-slate-400 mt-0.5">Click "+ मजुरी अदा" or "+ उचल द्या" above.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedWorker.paymentHistory.map((p: any, idx: number) => {
                        const isAdvance = p.paymentType === 'ADVANCE_PAYOUT';
                        return (
                          <div key={idx} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${
                                  isAdvance 
                                    ? 'bg-amber-50 text-amber-800 border-amber-200' 
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}>
                                  {isAdvance ? 'उचल (Advance Given)' : 'मजुरी वाटप (Wage Payout)'}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">
                                  {p.date ? new Date(p.date).toLocaleDateString('en-IN') : 'N/A'}
                                </span>
                              </div>
                              <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {p.paymentMode || 'CASH'}
                              </span>
                            </div>

                            <div className="flex justify-between items-baseline pt-1">
                              <div>
                                <div className="text-xs font-extrabold text-slate-800">{p.notes || (isAdvance ? 'Advance Taken' : 'Wage Disbursed')}</div>
                                {p.advanceDeducted > 0 && (
                                  <div className="text-[10px] font-bold text-amber-700 mt-0.5">
                                    कपात केलेली उचल: -₹{Number(p.advanceDeducted).toLocaleString('en-IN')}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="text-base font-black text-emerald-700">
                                  ₹{(Number(p.netDisbursed || p.amount) || 0).toLocaleString('en-IN')}
                                </span>
                                {p.netDisbursed !== undefined && p.netDisbursed !== p.amount && (
                                  <span className="text-[9px] text-slate-400 block font-bold">
                                    (Gross: ₹{Number(p.amount).toLocaleString('en-IN')})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: COMBINED CHRONOLOGICAL LEDGER */}
              {drawerTab === 'LEDGER' && (
                <div>
                  {(() => {
                    const attRecords = (selectedWorker.attendanceHistory || []).map((a: any) => ({
                      id: a.id || `att-${a.date}`,
                      date: a.date,
                      timestamp: new Date(a.date).getTime() || 0,
                      type: 'ATTENDANCE',
                      title: `हजेरी: ${a.workDescription || a.notes || 'काम'}`,
                      sub: `${a.shift === 'FULL_DAY' ? 'Full Day' : a.shift} (${a.hours || 8} hrs)`,
                      credit: Number(a.wage) || 0,
                      debit: 0
                    }));

                    const payRecords = (selectedWorker.paymentHistory || []).map((p: any) => ({
                      id: p.id || `pay-${p.date}`,
                      date: p.date ? new Date(p.date).toISOString().slice(0, 10) : 'N/A',
                      timestamp: p.date ? new Date(p.date).getTime() : 0,
                      type: p.paymentType === 'ADVANCE_PAYOUT' ? 'ADVANCE' : 'PAYOUT',
                      title: p.paymentType === 'ADVANCE_PAYOUT' ? 'उचल दिली (Advance Given)' : 'मजुरी दिली (Wage Paid)',
                      sub: p.notes || p.paymentMode || '',
                      credit: 0,
                      debit: Number(p.amount) || 0
                    }));

                    const combined = [...attRecords, ...payRecords].sort((a, b) => b.timestamp - a.timestamp);

                    if (combined.length === 0) {
                      return (
                        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
                          <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                          <p className="text-sm font-bold text-slate-500">कोणतीही लेजर नोंद नाही (No Ledger Records)</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        {combined.map((item, idx) => (
                          <div key={idx} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400">{item.date}</span>
                                <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                                  item.type === 'ATTENDANCE'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : item.type === 'ADVANCE'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}>
                                  {item.type === 'ATTENDANCE' ? 'काम/हजेरी' : item.type === 'ADVANCE' ? 'उचल' : 'मजुरी पेमेंट'}
                                </span>
                              </div>
                              <div className="text-xs font-black text-slate-800">{item.title}</div>
                              {item.sub && <div className="text-[10px] text-slate-400 font-medium">{item.sub}</div>}
                            </div>

                            <div className="text-right">
                              {item.credit > 0 ? (
                                <div>
                                  <span className="text-[9px] font-bold text-blue-600 block">कमाई (+Credit)</span>
                                  <span className="text-sm font-black text-blue-700">+₹{item.credit.toLocaleString('en-IN')}</span>
                                </div>
                              ) : (
                                <div>
                                  <span className="text-[9px] font-bold text-emerald-600 block">वाटप (-Debit)</span>
                                  <span className="text-sm font-black text-emerald-700">-₹{item.debit.toLocaleString('en-IN')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
