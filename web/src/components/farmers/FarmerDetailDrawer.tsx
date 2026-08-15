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
import { apiGetPurchases, apiGetPayments } from '@/lib/api';
import { useEffect } from 'react';

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

  const [purchases, setPurchases] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [realTransactions, setRealTransactions] = useState<any[]>([]);
  const [totals, setTotals] = useState({ purchase: 0, paid: 0, outstanding: 0 });

  useEffect(() => {
    if (!farmer) return;
    const fetchLedger = async () => {
      const p = await apiGetPurchases();
      const pay = await apiGetPayments();
      
      const fp = Array.isArray(p) ? p.filter((x: any) => x.farmerName === farmer.name || x.farmerId === farmer.id) : [];
      const fpay = Array.isArray(pay) ? pay.filter((x: any) => x.farmerName === farmer.name || x.farmerId === farmer.id) : [];
      
      setPurchases(fp.reverse());
      setPayments(fpay.reverse());
      
      let allItems: any[] = [];
      let totalPurchase = 0;
      let totalPaid = 0;

      fp.forEach((x: any) => {
        const amt = typeof x.amount === 'number' ? x.amount : parseFloat(String(x.amount).replace(/[^0-9.-]+/g, '')) || 0;
        totalPurchase += amt;
        allItems.push({
           dateStr: x.date,
           timestamp: new Date(x.date).getTime() || 0,
           refNo: x.id,
           type: 'PURCHASE',
           description: x.crop || 'Crop Purchase',
           weightOrQty: `${x.weight} @ ${x.rate}`,
           debitVal: amt,
           creditVal: 0,
           notes: x.notes
        });
      });
      
      fpay.forEach((x: any) => {
        const amt = typeof x.amount === 'number' ? x.amount : parseFloat(String(x.amount).replace(/[^0-9.-]+/g, '')) || 0;
        totalPaid += amt;
        allItems.push({
           dateStr: x.date,
           timestamp: new Date(x.date).getTime() || 0,
           refNo: x.id,
           type: 'PAYMENT',
           description: `Payment (${x.method})`,
           weightOrQty: '-',
           debitVal: 0,
           creditVal: amt,
           notes: x.notes || x.method
        });
      });
      
      allItems.sort((a, b) => a.timestamp - b.timestamp);
      
      let bal = 0;
      const computed = allItems.map(item => {
         bal = bal + item.debitVal - item.creditVal;
         return {
            date: item.dateStr,
            refNo: item.refNo,
            type: item.type,
            description: item.description,
            weightOrQty: item.weightOrQty,
            debit: item.debitVal > 0 ? `₹${item.debitVal.toLocaleString('en-IN')}` : '—',
            credit: item.creditVal > 0 ? `₹${item.creditVal.toLocaleString('en-IN')}` : '—',
            balance: `₹${bal.toLocaleString('en-IN')}`
         };
      });
      
      setTotals({ purchase: totalPurchase, paid: totalPaid, outstanding: Math.max(0, totalPurchase - totalPaid) });
      setRealTransactions(computed.reverse()); // Newest first for view
    };
    fetchLedger();
  }, [farmer]);

  const statementData: StatementData = {
    farmerId: farmer.id || 'FAR-10001',
    farmerName: farmer.name || 'Ramesh Patil',
    phone: farmer.phone || '9823456789',
    village: farmer.village || 'Nandgaon',
    aadhaar: farmer.aadhaar || 'XXXX-XXXX-8910',
    bankAccount: farmer.bankAccount || '990011223344',
    ifsc: farmer.ifsc || 'MAHB0001234',
    totalPurchases: `₹${totals.purchase.toLocaleString('en-IN')}`,
    totalPaid: `₹${totals.paid.toLocaleString('en-IN')}`,
    advanceGiven: '₹0',
    netBalance: `₹${totals.outstanding.toLocaleString('en-IN')}`,
    transactions: realTransactions,
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
            <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">₹{totals.purchase.toLocaleString('en-IN')}</span>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs">
            <span className="text-[10px] font-semibold text-slate-400 uppercase block">Total Paid Out</span>
            <span className="text-sm font-extrabold text-emerald-600 mt-0.5 block">₹{totals.paid.toLocaleString('en-IN')}</span>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-2xs">
            <span className="text-[10px] font-semibold text-blue-600 uppercase block">Advance Given</span>
            <span className="text-sm font-extrabold text-blue-700 mt-0.5 block">₹0</span>
          </div>

          <div className="bg-white border border-rose-100 rounded-xl p-3 shadow-2xs">
            <span className="text-[10px] font-semibold text-rose-500 uppercase block">Net Outstanding</span>
            <span className="text-sm font-black text-rose-600 mt-0.5 block">₹{totals.outstanding.toLocaleString('en-IN')}</span>
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
                {purchases.length === 0 && <p className="text-slate-400">No purchases found.</p>}
                {purchases.map((p) => (
                  <div key={p.id} className="bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-blue-600">{p.id}</span>
                      <p className="font-extrabold text-slate-900">{p.crop}</p>
                      <p className="text-[10px] text-slate-400">{p.date} • {p.weight} @ {p.rate}</p>
                    </div>
                    <span className="text-sm font-black text-slate-900">
                      ₹{Number(String(p.amount || 0).replace(/[^0-9.-]+/g, '')).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'PAYMENTS' && (
            <div className="space-y-3 text-xs">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Payment Disbursals & Advance Given History</h3>
              <div className="space-y-2">
                {payments.length === 0 && <p className="text-slate-400">No payments found.</p>}
                {payments.map((pay) => (
                  <div key={pay.id} className="bg-white border border-slate-200 rounded-xl p-3 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-600">{pay.id}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                          pay.method && pay.method.toLowerCase().includes('advance') ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {pay.method && pay.method.toLowerCase().includes('advance') ? 'ADVANCE' : 'PAYMENT'}
                        </span>
                      </div>
                      <p className="font-bold text-slate-800">{pay.method}</p>
                      <p className="text-[10px] text-slate-400">{pay.date}</p>
                    </div>
                    <span className="text-sm font-black text-emerald-600">
                      ₹{Number(String(pay.amount || 0).replace(/[^0-9.-]+/g, '')).toLocaleString('en-IN')}
                    </span>
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
                    {realTransactions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">No transactions recorded yet.</td>
                      </tr>
                    )}
                    {realTransactions.map((tx, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 font-medium">
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">{tx.date}</td>
                        <td className="py-2.5 px-3 text-slate-800">
                          <span className="font-bold">{tx.description}</span>
                          <span className="text-[10px] text-slate-400 block">{tx.refNo}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-900">{tx.debit}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{tx.credit}</td>
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
