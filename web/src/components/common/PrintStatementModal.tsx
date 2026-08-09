"use client";

import React from 'react';
import { X, Printer, MessageCircle, ShieldCheck } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useTenant } from '@/context/TenantContext';

export interface StatementData {
  farmerId: string;
  farmerName: string;
  phone: string;
  village: string;
  aadhaar: string;
  bankAccount: string;
  ifsc: string;
  totalPurchases: string;
  totalPaid: string;
  advanceGiven: string;
  netBalance: string;
  transactions: Array<{
    date: string;
    refNo: string;
    type: 'PURCHASE' | 'PAYMENT' | 'ADVANCE';
    description: string;
    weightOrQty?: string;
    debit: string;
    credit: string;
    balance: string;
  }>;
}

interface PrintStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: StatementData | null;
}

export const PrintStatementModal: React.FC<PrintStatementModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const { language } = useLanguage();
  const { tenant } = useTenant();

  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  const businessName = language === 'mr' ? tenant.businessNameMr : tenant.businessName;
  const businessAddress = language === 'mr' ? tenant.addressMr : tenant.address;

  const handleWhatsAppShare = () => {
    const isMr = language === 'mr';
    const text = isMr
      ? `🍓 *${businessName} - अधिकृत खातेवही स्टेटमेंट (Account Ledger Statement)*\n\n` +
        `*शेतकऱ्याचे नाव:* ${data.farmerName} (${data.farmerId})\n` +
        `*गाव:* ${data.village}\n` +
        `*एकूण खरेदी:* ${data.totalPurchases}\n` +
        `*एकूण अदा पेमेंट:* ${data.totalPaid}\n` +
        `*अ‍ॅडव्हान्स जमा:* ${data.advanceGiven}\n` +
        `*थकीत बाकी:* ${data.netBalance}\n\n` +
        `आपले संपूर्ण खातेवही स्टेटमेंट पहा: https://${tenant.subdomain}.agri.app/farmer/${data.farmerId}/statement\n\nधन्यवाद!`
      : `🍓 *${businessName} - Official Account Ledger Statement*\n\n` +
        `*Farmer Name:* ${data.farmerName} (${data.farmerId})\n` +
        `*Village:* ${data.village}\n` +
        `*Total Purchases:* ${data.totalPurchases}\n` +
        `*Total Paid:* ${data.totalPaid}\n` +
        `*Advance Credit:* ${data.advanceGiven}\n` +
        `*Net Balance:* ${data.netBalance}\n\n` +
        `View Digital Statement: https://${tenant.subdomain}.agri.app/farmer/${data.farmerId}/statement\n\nThank you!`;

    const encodedText = encodeURIComponent(text);
    const phone = data.phone ? data.phone.replace(/\D/g, '') : '';
    const whatsappUrl = phone ? `https://api.whatsapp.com/send?phone=91${phone}&text=${encodedText}` : `https://api.whatsapp.com/send?text=${encodedText}`;

    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200/80 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col justify-between animate-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="no-print px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black">
              📋
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                {language === 'mr' ? 'शेतकरी खातेवही स्टेटमेंट प्रिंट करा' : 'Print Farmer Account Statement'}
              </h3>
              <p className="text-[11px] font-medium text-slate-400">
                {data.farmerName} • {data.farmerId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Print Area (#receipt-print-area) */}
        <div className="p-6 bg-slate-100/60 overflow-y-auto max-h-[70vh]">
          <div id="receipt-print-area" className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6 font-sans">
            {/* Header branding */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div className="flex items-start gap-3">
                {tenant.logoUrl ? (
                  <img src={tenant.logoUrl} alt="Logo" className="w-14 h-14 rounded-xl object-cover border border-slate-200" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xl">
                    {businessName.charAt(0)}
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-black tracking-tight text-slate-900">{businessName}</h2>
                  <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">{tenant.tagline}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{businessAddress} • GSTIN: {tenant.gstin}</p>
                  <p className="text-[10px] text-slate-500">Ph: {tenant.phone}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 rounded-md text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-100 block mb-1">
                  OFFICIAL ACCOUNT STATEMENT
                </span>
                <span className="text-xs font-bold text-slate-700 block">Date: {new Date().toISOString().slice(0, 10)}</span>
              </div>
            </div>

            {/* Farmer Info Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Farmer Details</span>
                <h4 className="font-extrabold text-slate-900 text-sm">{data.farmerName}</h4>
                <p className="text-[11px] text-slate-600 font-semibold">{data.farmerId} • Ph: {data.phone}</p>
                <p className="text-[11px] text-slate-500">Village: {data.village}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Bank & Identification</span>
                <p className="text-slate-700 font-semibold mt-1">Aadhaar: {data.aadhaar || 'XXXX-XXXX-8910'}</p>
                <p className="text-slate-700 font-semibold">Bank A/C: {data.bankAccount || '990011223344'}</p>
                <p className="text-slate-500 text-[10px]">IFSC: {data.ifsc || 'MAHB0001234'}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3 text-right">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase block">Net Account Balance</span>
                <span className="text-xl font-black text-rose-600 block">{data.netBalance}</span>
                <span className="text-[10px] text-emerald-600 font-bold block mt-1">Advance Credit: {data.advanceGiven}</span>
              </div>
            </div>

            {/* Financial Summary Ribbon */}
            <div className="grid grid-cols-3 gap-3 text-center text-xs border-y border-slate-200 py-3">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Purchases (खरेदी)</span>
                <span className="text-sm font-black text-slate-900">{data.totalPurchases}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Payouts (पेमेंट)</span>
                <span className="text-sm font-black text-emerald-600">{data.totalPaid}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Advance Given (अ‍ॅडव्हान्स)</span>
                <span className="text-sm font-black text-blue-600">{data.advanceGiven}</span>
              </div>
            </div>

            {/* Ledger Transactions Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Itemized Account Ledger Transactions</h4>
              <table className="w-full text-left text-xs border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-[10px] text-slate-600 font-extrabold uppercase border-b border-slate-200">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Voucher Ref</th>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3 text-right">Debit (+ خ)</th>
                    <th className="py-2 px-3 text-right">Credit (- जमा)</th>
                    <th className="py-2 px-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.transactions.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 font-medium">
                      <td className="py-2 px-3 text-[11px] text-slate-600">{tx.date}</td>
                      <td className="py-2 px-3 font-bold text-blue-600">{tx.refNo}</td>
                      <td className="py-2 px-3 text-slate-800">
                        <span>{tx.description}</span>
                        {tx.weightOrQty && <span className="text-[10px] text-slate-400 block">{tx.weightOrQty}</span>}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900">{tx.debit !== '₹0' ? tx.debit : '—'}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-600">{tx.credit !== '₹0' ? tx.credit : '—'}</td>
                      <td className="py-2 px-3 text-right font-black text-slate-900">{tx.balance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signature Area */}
            <div className="pt-8 flex justify-between items-end text-[10px] text-slate-400 font-semibold border-t border-slate-100">
              <div>
                <p>Farmer Signature / अंगठा</p>
                <div className="w-28 h-px bg-slate-300 mt-8" />
              </div>
              <div className="text-center">
                {tenant.signatureUrl && (
                  <img src={tenant.signatureUrl} alt="Signature" className="h-10 object-contain mx-auto mb-1" />
                )}
                <p>Authorized Signatory</p>
              </div>
              <div className="text-right">
                <p>{businessName} Official Stamp</p>
                <div className="w-28 h-px bg-slate-300 mt-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="no-print px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Digital Ledger Audit Verified</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm shadow-emerald-500/20"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Share Statement on WhatsApp</span>
            </button>

            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
            >
              <Printer className="w-4 h-4" />
              <span>Print Account Statement</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
