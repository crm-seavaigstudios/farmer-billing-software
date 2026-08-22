"use client";

import React, { useState } from 'react';
import { X, Printer, ShieldCheck, FileText, Smartphone, Download, Share2, Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useTenant } from '@/context/TenantContext';

export interface ReceiptData {
  type: 'FARMER_PURCHASE' | 'FARMER_PAYMENT' | 'CUSTOMER_SALE' | 'LEDGER_STATEMENT';
  title: string;
  receiptNo: string;
  date: string;
  partyName: string;
  partyPhone: string;
  partyVillageOrAddress: string;
  gradeOrItems: string;
  weightOrQty?: string;
  ratePerKg?: string;
  totalAmount: string;
  paidAmount?: string;
  balanceAmount?: string;
  paymentMode?: string;
  unit?: string;
  category?: string;
}

interface PrintReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ReceiptData | null;
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  const { tenant } = useTenant();
  const [printFormat, setPrintFormat] = useState<'POS_80MM' | 'A5_MANDI' | 'A4_FULL'>('A5_MANDI');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  // CLIENT-SIDE PDF GENERATION & DOWNLOAD
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const element = document.getElementById('receipt-print-area');
      if (!element) return;

      // Dynamic import of html2pdf.js for client side
      const html2pdf = (await import('html2pdf.js')).default;
      const opt = {
        margin: 0.2,
        filename: `Invoice-${data.receiptNo}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: printFormat === 'POS_80MM' ? [3.15, 6] : (printFormat === 'A5_MANDI' ? 'a5' : 'a4'), orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.log('PDF generation fallback to window.print', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // DIRECT WHATSAPP PDF DOCUMENT SHARING
  const handleShareWhatsAppPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const element = document.getElementById('receipt-print-area');
      if (element) {
        const html2pdf = (await import('html2pdf.js')).default;
        const opt = {
          margin: 0.2,
          filename: `Invoice-${data.receiptNo}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'in', format: printFormat === 'A5_MANDI' ? 'a5' : 'a4', orientation: 'portrait' }
        };

        const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
        const file = new File([pdfBlob], `Invoice-${data.receiptNo}.pdf`, { type: 'application/pdf' });

        // Web Share API for native PDF document attachment in WhatsApp
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Harvest Purchase Invoice #${data.receiptNo}`,
            text: `🙏 *${tenant?.businessName || 'Agri CRM'}*\nपावती क्र: ${data.receiptNo}\nशेतकरी: ${data.partyName}\nरक्कम: ${data.totalAmount}`,
          });
          setIsGeneratingPdf(false);
          return;
        }
      }
    } catch (e) {
      console.log('Web share not supported, falling back to direct chat text & PDF download');
    }

    // Fallback: Download PDF & open WhatsApp Chat with summary
    await handleDownloadPdf();
    const encodedText = encodeURIComponent(
      `🙏 *${tenant?.businessName || 'Agri CRM'}*\n` +
      `पावती क्र: ${data.receiptNo}\n` +
      `दिनांक: ${data.date}\n` +
      `शेतकरी नाव: ${data.partyName} (${data.partyVillageOrAddress})\n` +
      `पिक व जात: ${data.gradeOrItems}\n` +
      `वजन/प्रमाण: ${data.weightOrQty || ''} (${data.ratePerKg || ''})\n` +
      `एकूण बिल रक्कम: ${data.totalAmount}\n` +
      `शिल्लक बाकी: ${data.balanceAmount || '₹0'}\n\n` +
      `📌 *टीप:* डिजिटल PDF बिल तुमच्या डिव्हाइसवर डाउनलोड झाले आहे. कृपया ते सोबत जोडा.`
    );
    window.open(`https://wa.me/91${data.partyPhone}?text=${encodedText}`, '_blank');
    setIsGeneratingPdf(false);
  };

  const getFormatClassName = () => {
    switch (printFormat) {
      case 'POS_80MM':
        return 'w-[320px] max-w-[320px] text-xs p-3 print-format-pos';
      case 'A5_MANDI':
        return 'w-[520px] max-w-[520px] text-sm p-6 print-format-a5';
      case 'A4_FULL':
        return 'w-[750px] max-w-[750px] text-sm p-8 print-format-a4';
      default:
        return 'w-[520px] max-w-[520px] text-sm p-6';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col justify-between max-h-[92vh]">
        {/* Header & Format Controls */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-extrabold text-slate-900">Select Print Size Format:</span>
          </div>

          {/* Format Switcher */}
          <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-2xl">
            <button
              onClick={() => setPrintFormat('POS_80MM')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all ${
                printFormat === 'POS_80MM' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              <span>80mm POS Roll</span>
            </button>

            <button
              onClick={() => setPrintFormat('A5_MANDI')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all ${
                printFormat === 'A5_MANDI' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>A5 Mandi Slip</span>
            </button>

            <button
              onClick={() => setPrintFormat('A4_FULL')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all ${
                printFormat === 'A4_FULL' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>Full A4 Bill</span>
            </button>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-xl">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Receipt Display Box */}
        <div className="p-6 overflow-y-auto flex justify-center bg-slate-100/50">
          <div
            id="receipt-print-area"
            className={`bg-white border border-slate-300 shadow-md rounded-2xl text-slate-900 mx-auto transition-all ${getFormatClassName()}`}
          >
            {/* Header / Brand */}
            <div className="text-center pb-4 border-b border-slate-200">
              <h2 className="font-black text-slate-900 uppercase tracking-tight text-base">
                {tenant?.businessName || 'Agri CRM'}
              </h2>
              <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                {tenant?.address || 'नांदगाव शाखा, जि. नाशिक (मंडी पावती / Billing Voucher)'}
              </p>
              <p className="text-[10px] text-slate-400">मोबाईल: {tenant?.phone || '+९१ ९८२३४ ५६७८९'} | GSTIN: {tenant?.gstin || '27AAAAA0000A1Z5'}</p>
            </div>

            {/* Title & Receipt Meta */}
            <div className="py-3 border-b border-slate-200 flex justify-between items-center text-xs">
              <div>
                <span className="font-extrabold text-blue-700 uppercase tracking-wider block text-[10px]">{data.title}</span>
                <span className="font-black text-slate-900">{data.receiptNo}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">दिनांक (Date)</span>
                <span className="font-bold text-slate-800">{data.date}</span>
              </div>
            </div>

            {/* Farmer / Customer Details */}
            <div className="py-3 border-b border-slate-200 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">शेतकरी / पक्ष नाव:</span>
                <span className="font-bold text-slate-900">{data.partyName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">गाव / पत्ता:</span>
                <span className="font-bold text-slate-800">{data.partyVillageOrAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">संपर्क क्रमांक:</span>
                <span className="font-bold text-slate-800">{data.partyPhone}</span>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="py-3 border-b border-slate-200">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase text-[9px] font-bold">
                    <th className="pb-1">पिक / जात</th>
                    <th className="pb-1 text-center">प्रकार/नग</th>
                    <th className="pb-1 text-center">वजन/नग</th>
                    <th className="pb-1 text-right">दर</th>
                    <th className="pb-1 text-right">एकूण</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="font-bold text-slate-800">
                    <td className="pt-2">{data.gradeOrItems}</td>
                    <td className="pt-2 text-center text-slate-600">{data.category || 'कॅरेट'}</td>
                    <td className="pt-2 text-center">{data.weightOrQty || '100 KG'}</td>
                    <td className="pt-2 text-right text-slate-600">{data.ratePerKg || '₹280'}</td>
                    <td className="pt-2 text-right font-black text-slate-900">{data.totalAmount}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Totals & Advance Breakdown */}
            <div className="py-3 space-y-1.5 text-xs">
              <div className="flex justify-between font-extrabold text-slate-900">
                <span>एकूण बिल रक्कम (Total Amount):</span>
                <span>{data.totalAmount}</span>
              </div>

              {data.paidAmount && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>अ‍ॅडव्हान्स / दिलेले पेमेंट:</span>
                  <span>- {data.paidAmount}</span>
                </div>
              )}

              {data.balanceAmount && (
                <div className="flex justify-between font-black text-blue-700 text-sm pt-1 border-t border-slate-200">
                  <span>शिल्लक बाकी (Remaining Balance):</span>
                  <span>{data.balanceAmount}</span>
                </div>
              )}
            </div>

            {/* Signatures & Stamps */}
            <div className="pt-6 mt-4 border-t border-dashed border-slate-300 flex justify-between items-end">
              <div className="text-center">
                <div className="h-8 border-b border-slate-400 w-24 mx-auto mb-1"></div>
                <span className="text-[9px] font-bold text-slate-500">शेतकऱ्याची सही</span>
              </div>
              <div className="text-center">
                <div className="h-8 flex items-center justify-center text-blue-600 font-black text-[10px] mb-1"></div>
                <span className="text-[9px] font-bold text-slate-500">अधिकृत सही व शिक्का</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-2 no-print">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Format: {printFormat}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Download PDF Button */}
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>

            {/* Direct WhatsApp PDF Document Share Button */}
            <button
              onClick={handleShareWhatsAppPdf}
              disabled={isGeneratingPdf}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share PDF Document</span>
            </button>

            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
