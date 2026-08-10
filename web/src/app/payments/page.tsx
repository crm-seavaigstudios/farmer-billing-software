"use client";

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { AddPaymentModal } from '@/components/payments/AddPaymentModal';
import { PrintReceiptModal, ReceiptData } from '@/components/common/PrintReceiptModal';
import { useLanguage } from '@/context/LanguageContext';
import {
  CreditCard,
  CheckCircle,
  Clock,
  Search,
  Download,
  Filter,
  Eye,
  Printer,
  ChevronRight,
  MessageCircle,
  X
} from 'lucide-react';

const initialPayments: any[] = [];

export default function PaymentsPage() {
  const { t, language } = useLanguage();
  const [payments, setPayments] = useState(initialPayments);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptData | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const cached = typeof window !== 'undefined' ? localStorage.getItem('seavaig_payments_cache') : null;
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) setPayments(parsed);
      } catch {}
    }
  }, []);

  const handleAddPayment = (newPay: any) => {
    const updated = [newPay, ...payments];
    setPayments(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('seavaig_payments_cache', JSON.stringify(updated));
    }
  };

  const openPrintModal = (row: any) => {
    setActiveReceipt({
      type: 'FARMER_PAYMENT',
      title: 'Farmer Payout Voucher Receipt',
      receiptNo: row.id,
      date: row.date,
      partyName: row.farmerName,
      partyPhone: row.phone || '9823456789',
      partyVillageOrAddress: row.village || 'Nandgaon',
      gradeOrItems: `Payout Disbursement (${row.method})`,
      totalAmount: row.amount,
      balanceAmount: '₹3,500',
      paymentMode: row.method,
    });
  };

  const filtered = payments.filter(
    (p) =>
      p.farmerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.method.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-slateCanvas font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header primaryButtonLabel="+ Record Payout" onPrimaryClick={() => setIsAddModalOpen(true)} />

        <main className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t.paymentManagement}</h1>
              <p className="text-xs font-semibold text-slate-400 mt-1 flex items-center gap-1">
                <span>{t.dashboard}</span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="text-slate-600">{t.paymentManagement}</span>
              </p>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm shadow-blue-500/20 cursor-pointer"
            >
              + Record Payout
            </button>
          </div>

          {/* Metric Ribbon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Paid Out This Month</span>
                <h3 className="text-xl font-extrabold text-slate-900">₹1,85,40,000</h3>
                <span className="text-[10px] font-bold text-emerald-600">↑ 14.2% vs last month</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">UPI & Bank Transfers</span>
                <h3 className="text-xl font-extrabold text-slate-900">92.4%</h3>
                <span className="text-[10px] font-bold text-blue-600">Digital Disbursal</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Pending Cheques</span>
                <h3 className="text-xl font-extrabold text-slate-900">₹50,000</h3>
                <span className="text-[10px] font-bold text-amber-600">1 Voucher Processing</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-subtle flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">Avg Settlement Speed</span>
                <h3 className="text-xl font-extrabold text-slate-900">24 Hours</h3>
                <span className="text-[10px] font-bold text-purple-600">Instant Farmer Payouts</span>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-3">
                    <th className="py-3 px-3">PAYMENT VOUCHER NO</th>
                    <th className="py-3 px-3">{t.farmerName}</th>
                    <th className="py-3 px-3">PAYMENT MODE</th>
                    <th className="py-3 px-3 text-right">DISBURSED AMOUNT</th>
                    <th className="py-3 px-3 text-center">STATUS</th>
                    <th className="py-3 px-3 text-right">DATE</th>
                    <th className="py-3 px-3 text-center">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-bold text-blue-600">{row.id}</td>
                      <td className="py-3 px-3 font-bold text-slate-900">{row.farmerName}</td>
                      <td className="py-3 px-3 text-slate-600 font-medium">{row.method}</td>
                      <td className="py-3 px-3 text-right font-black text-emerald-600">{row.amount}</td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          row.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-amber-50 text-amber-600'
                        }`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400 text-[11px]">{row.date}</td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSelectedPayment(row)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                            title="View Payment Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openPrintModal(row)}
                            className="p-1 text-emerald-600 hover:text-emerald-700 rounded-lg hover:bg-emerald-50 cursor-pointer"
                            title="Share Payout Voucher on WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openPrintModal(row)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                            title="Print Payout Voucher"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <AddPaymentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddPayment={handleAddPayment}
      />

      <PrintReceiptModal
        isOpen={!!activeReceipt}
        onClose={() => setActiveReceipt(null)}
        data={activeReceipt}
      />

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex justify-end animate-in fade-in">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-6 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                  {selectedPayment.id}
                </span>
                <h2 className="text-lg font-black text-slate-900 mt-1">{selectedPayment.farmerName}</h2>
              </div>
              <button onClick={() => setSelectedPayment(null)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Payment Date:</span>
                <span className="font-bold text-slate-900">{selectedPayment.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Payment Mode:</span>
                <span className="font-bold text-slate-900">{selectedPayment.method}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-3">
                <span className="text-slate-400 font-semibold">Transaction Ref No:</span>
                <span className="font-bold text-blue-600">{selectedPayment.refNo}</span>
              </div>
            </div>

            <div className="border border-emerald-100 bg-emerald-50/50 rounded-2xl p-4 text-center">
              <span className="text-xs font-semibold text-emerald-600 block uppercase tracking-wider">Disbursed Amount</span>
              <span className="text-2xl font-black text-emerald-700">{selectedPayment.amount}</span>
            </div>

            <button
              onClick={() => {
                const pay = selectedPayment;
                setSelectedPayment(null);
                openPrintModal(pay);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
            >
              <Printer className="w-4 h-4" />
              <span>Print Payment Voucher</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
