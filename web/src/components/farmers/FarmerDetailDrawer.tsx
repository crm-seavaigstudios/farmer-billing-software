"use client";

import React, { useState } from 'react';
import {
  X,
  User,
  Phone,
  MapPin,
  Building,
  CreditCard,
  Sprout,
  DollarSign,
  TrendingUp,
  Receipt,
  Printer,
  MessageCircle,
  FileText,
  Calendar,
  CheckCircle,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { PrintStatementModal, StatementData } from '@/components/common/PrintStatementModal';

interface FarmerDetailDrawerProps {
  farmer: any | null;
  onClose: () => void;
}

export const FarmerDetailDrawer: React.FC<FarmerDetailDrawerProps> = ({
  farmer,
  onClose,
}) => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'PURCHASES' | 'PAYMENTS' | 'LEDGER'>('PROFILE');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  if (!farmer) return null;

  // Derived mock data for farmer
  const samplePurchases = [
    { id: 'PUR-2026-1052', date: '05 Aug 2026', crop: 'Strawberry (A Grade Export)', weight: '120 KG', rate: '₹280/KG', total: '₹33,600' },
    { id: 'PUR-2026-1030', date: '02 Aug 2026', crop: 'Strawberry (B Grade Local)', weight: '150 KG', rate: '₹180/KG', total: '₹27,000' },
    { id: 'PUR-2026-0980', date: '28 Jul 2026', crop: 'Strawberry (A Grade Export)', weight: '200 KG', rate: '₹290/KG', total: '₹58,000' },
  ];

  const samplePayments = [
    { id: 'PAY-2026-0852', date: '05 Aug 2026', type: 'PARTIAL', method: 'UPI (GPay)', amount: '₹15,000', notes: 'Weekly harvest partial settlement' },
    { id: 'PAY-2026-0820', date: '01 Aug 2026', type: 'ADVANCE', method: 'Cash Advance', amount: '₹10,000', notes: 'Advance for labor & packing crates' },
    { id: 'PAY-2026-0790', date: '25 Jul 2026', type: 'FULL', method: 'Bank Transfer (IMPS)', amount: '₹58,000', notes: 'Full settlement of previous batch' },
  ];

  const sampleTransactions = [
    { date: '05 Aug 2026', refNo: 'PUR-2026-1052', type: 'PURCHASE' as const, description: 'Strawberry (A Grade Export)', weightOrQty: '120 KG @ ₹280/KG', debit: '₹33,600', credit: '₹0', balance: '₹43,500' },
    { date: '05 Aug 2026', refNo: 'PAY-2026-0852', type: 'PAYMENT' as const, description: 'UPI Payout Received (GPay)', debit: '₹0', credit: '₹15,000', balance: '₹28,500' },
    { date: '02 Aug 2026', refNo: 'PUR-2026-1030', type: 'PURCHASE' as const, description: 'Strawberry (B Grade Local)', weightOrQty: '150 KG @ ₹180/KG', debit: '₹27,000', credit: '₹0', balance: '₹43,500' },
    { date: '01 Aug 2026', refNo: 'PAY-2026-0820', type: 'ADVANCE' as const, description: 'Advance Payout Given (Cash)', debit: '₹0', credit: '₹10,000', balance: '₹16,500' },
  ];

  const statementData: StatementData = {
    farmerId: farmer.id || 'FAR-10001',
    farmerName: farmer.name || 'Ramesh Patil',
    phone: farmer.phone || '9823456789',
    village: farmer.village || 'Nandgaon',
    aadhaar: farmer.aadhaar || 'XXXX-XXXX-8910',
    bankAccount: farmer.bankAccount || '990011223344',
    ifsc: farmer.ifsc || 'MAHB0001234',
    totalPurchases: farmer.totalPurchase || '₹2,45,600',
    totalPaid: farmer.totalPaid || '₹2,27,100',
    advanceGiven: '₹10,000',
    netBalance: farmer.outstanding || '₹18,500',
    transactions: sampleTransactions,
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex justify-end animate-in fade-in">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200 font-sans">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-blue-500/20">
              {farmer.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">{farmer.name}</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-100">
                  {farmer.id}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-400 mt-0.5 flex items-center gap-2">
                <span>📍 {farmer.village}</span>
                <span>•</span>
                <span>📞 {farmer.phone}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Financial Summary Cards */}
        <div className="p-6 bg-slate-50 border-b border-slate-100 grid grid-cols-4 gap-3 text-xs">
          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs">
            <span className="text-[10px] font-semibold text-slate-400 uppercase block">Total Purchases</span>
            <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">{farmer.totalPurchase || '₹2,45,600'}</span>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs">
            <span className="text-[10px] font-semibold text-slate-400 uppercase block">Total Paid Out</span>
            <span className="text-sm font-extrabold text-emerald-600 mt-0.5 block">{farmer.totalPaid || '₹2,27,100'}</span>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs">
            <span className="text-[10px] font-semibold text-blue-600 uppercase block">Advance Given</span>
            <span className="text-sm font-extrabold text-blue-700 mt-0.5 block">₹10,000</span>
          </div>

          <div className="bg-white border border-rose-100 rounded-xl p-3 shadow-2xs">
            <span className="text-[10px] font-semibold text-rose-500 uppercase block">Net Outstanding</span>
            <span className="text-sm font-black text-rose-600 mt-0.5 block">{farmer.outstanding || '₹18,500'}</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 flex gap-6 bg-white">
          <button
            onClick={() => setActiveTab('PROFILE')}
            className={`py-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
              activeTab === 'PROFILE'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {language === 'mr' ? 'प्रोफाईल व पिके' : 'Profile & Crops'}
          </button>

          <button
            onClick={() => setActiveTab('PURCHASES')}
            className={`py-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
              activeTab === 'PURCHASES'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {language === 'mr' ? 'खरेदी आवक' : 'Purchases History'}
          </button>

          <button
            onClick={() => setActiveTab('PAYMENTS')}
            className={`py-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
              activeTab === 'PAYMENTS'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {language === 'mr' ? 'पेमेंट व अ‍ॅडव्हान्स' : 'Payments & Advances'}
          </button>

          <button
            onClick={() => setActiveTab('LEDGER')}
            className={`py-3 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
              activeTab === 'LEDGER'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {language === 'mr' ? 'खातेवही स्टेटमेंट' : 'Ledger Statement'}
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'PROFILE' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-600" /> Personal & Contact Information
                </h3>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 font-semibold block">Full Name:</span>
                    <span className="font-extrabold text-slate-900">{farmer.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Mobile Phone:</span>
                    <span className="font-bold text-slate-800">{farmer.phone}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Village & District:</span>
                    <span className="font-bold text-slate-800">{farmer.village}, Nashik</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Aadhaar Identification:</span>
                    <span className="font-bold text-slate-800">{farmer.aadhaar || 'XXXX-XXXX-8910'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" /> Bank Disbursal Account Details
                </h3>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 font-semibold block">Bank Account Number:</span>
                    <span className="font-extrabold text-slate-900">{farmer.bankAccount || '990011223344'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Bank IFSC Code:</span>
                    <span className="font-bold text-slate-800">{farmer.ifsc || 'MAHB0001234'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sprout className="w-4 h-4 text-purple-600" /> Cultivated Crops & Farm Acreage
                </h3>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 font-semibold block">Primary Crop Variety:</span>
                    <span className="font-bold text-slate-900">Sweet Charlie Strawberry (A Grade)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Farm Land Acreage:</span>
                    <span className="font-bold text-slate-800">4.5 Acres (Nandgaon Cluster)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'PURCHASES' && (
            <div className="space-y-3 text-xs">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Recent Strawberry Procurement Deliveries</h3>
              <div className="space-y-2">
                {samplePurchases.map((p) => (
                  <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-blue-600">{p.id}</span>
                      <p className="font-extrabold text-slate-900">{p.crop}</p>
                      <p className="text-[10px] text-slate-400">{p.date} • {p.weight} @ {p.rate}</p>
                    </div>
                    <span className="text-sm font-black text-slate-900">{p.total}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'PAYMENTS' && (
            <div className="space-y-3 text-xs">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Payment Disbursals & Advance Given History</h3>
              <div className="space-y-2">
                {samplePayments.map((pay) => (
                  <div key={pay.id} className="bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-600">{pay.id}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                          pay.type === 'ADVANCE' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {pay.type}
                        </span>
                      </div>
                      <p className="font-bold text-slate-800">{pay.method}</p>
                      <p className="text-[10px] text-slate-400">{pay.date} • {pay.notes}</p>
                    </div>
                    <span className="text-sm font-black text-emerald-600">{pay.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'LEDGER' && (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Running Account Debit/Credit Ledger</h3>
                <button
                  onClick={() => setIsPrintModalOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm shadow-blue-500/20 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Statement PDF</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] text-slate-400 font-extrabold uppercase border-b border-slate-100">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Debit</th>
                      <th className="py-2.5 px-3 text-right">Credit</th>
                      <th className="py-2.5 px-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sampleTransactions.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 font-medium">
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">{tx.date}</td>
                        <td className="py-2.5 px-3 text-slate-800">
                          <span className="font-bold">{tx.description}</span>
                          <span className="text-[10px] text-slate-400 block">{tx.refNo}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">{tx.debit !== '₹0' ? tx.debit : '—'}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{tx.credit !== '₹0' ? tx.credit : '—'}</td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">{tx.balance}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Ledger Statement PDF</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50"
          >
            Close Drawer
          </button>
        </div>
      </div>

      <PrintStatementModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        data={statementData}
      />
    </div>
  );
};
