"use client";

import React, { useState } from 'react';
import { X, Printer, ShieldCheck, FileText, Smartphone, Download, Share2, Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useTenant } from '@/context/TenantContext';

export interface SaleItemDetail {
  srNo?: number;
  cropName: string;
  grade?: string;
  category?: string;
  packaging?: string;
  weightKg: string | number;
  ratePerKg: string | number;
  totalAmount: string | number;
  unit?: string;
}

export interface ReceiptData {
  type: 'FARMER_PURCHASE' | 'FARMER_PAYMENT' | 'CUSTOMER_SALE' | 'LEDGER_STATEMENT' | 'SELLER_SALE';
  title: string;
  receiptNo: string;
  date: string;
  time?: string;
  partyName: string;
  partyPhone: string;
  partyVillageOrAddress: string;
  gradeOrItems: string;
  items?: SaleItemDetail[];
  weightOrQty?: string;
  ratePerKg?: string;
  totalAmount: string;
  paidAmount?: string;
  balanceAmount?: string;
  paymentMode?: string;
  unit?: string;
  category?: string;
  vehicleNo?: string;
  vehicleType?: string;
  driverName?: string;
  driverPhone?: string;
  buyerGstin?: string;
  freightAmount?: string | number;
  notes?: string;
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

  const isB2bSale = data.type === 'CUSTOMER_SALE' || data.type === 'SELLER_SALE' || (data.items && data.items.length > 0);

  // Helper for amount in words in Indian numbering system
  const numberToWordsINR = (numStr: string | number): string => {
    const num = Math.round(Number(String(numStr).replace(/[^0-9.-]+/g, '')) || 0);
    if (num <= 0) return 'Zero Rupees Only';
    
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n: number): string => {
      let str = '';
      if (n > 9999999) {
        str += inWords(Math.floor(n / 10000000)) + 'Crore ';
        n %= 10000000;
      }
      if (n > 99999) {
        str += inWords(Math.floor(n / 100000)) + 'Lakh ';
        n %= 100000;
      }
      if (n > 999) {
        str += inWords(Math.floor(n / 1000)) + 'Thousand ';
        n %= 1000;
      }
      if (n > 99) {
        str += inWords(Math.floor(n / 100)) + 'Hundred ';
        n %= 100;
      }
      if (n > 0) {
        if (str !== '') str += 'and ';
        if (n < 20) str += a[n];
        else str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
      }
      return str;
    };

    return `${inWords(num).trim()} Rupees Only`;
  };

  const handlePrint = () => {
    window.print();
  };

  // CLIENT-SIDE PDF GENERATION & DOWNLOAD
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const element = document.getElementById('receipt-print-area');
      if (!element) return;

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

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `B2B Sales Invoice #${data.receiptNo}`,
            text: `🙏 *${tenant?.businessName || 'Agri CRM'}*\nबीजक क्र: ${data.receiptNo}\nखरेदीदार: ${data.partyName}\nरक्कम: ${data.totalAmount}`,
          });
          setIsGeneratingPdf(false);
          return;
        }
      }
    } catch (e) {
      console.log('Web share not supported, falling back to direct chat text & PDF download');
    }

    await handleDownloadPdf();
    const encodedText = encodeURIComponent(
      `🙏 *${tenant?.businessName || 'Agri CRM'}*\n` +
      `बीजक क्र (Invoice No): ${data.receiptNo}\n` +
      `दिनांक: ${data.date}\n` +
      `खरेदीदार नाव: ${data.partyName} (${data.partyVillageOrAddress})\n` +
      `गाडी क्र: ${data.vehicleNo || '-'}\n` +
      `एकूण बिल रक्कम: ${data.totalAmount}\n` +
      `शिल्लक बाकी: ${data.balanceAmount || '₹0'}\n\n` +
      `📌 *टीप:* डिजिटल PDF कर बीजक डाउनलोड झाले आहे.`
    );
    window.open(`https://wa.me/91${data.partyPhone}?text=${encodedText}`, '_blank');
    setIsGeneratingPdf(false);
  };

  const getFormatClassName = () => {
    switch (printFormat) {
      case 'POS_80MM':
        return 'w-[320px] max-w-[320px] text-xs p-3 print-format-pos';
      case 'A5_MANDI':
        return 'w-[540px] max-w-[540px] text-xs p-5 print-format-a5';
      case 'A4_FULL':
        return 'w-[750px] max-w-[750px] text-sm p-8 print-format-a4';
      default:
        return 'w-[540px] max-w-[540px] text-xs p-5';
    }
  };

  // Determine line items list
  const lineItems = data.items && data.items.length > 0 ? data.items : (
    // Fallback: parse from comma string if single composite
    data.gradeOrItems ? data.gradeOrItems.split(',').map((it, idx) => {
      const trimmed = it.trim();
      return {
        srNo: idx + 1,
        cropName: trimmed,
        grade: data.category || 'A_GRADE',
        packaging: data.category || 'Crates (कॅरेट)',
        weightKg: data.weightOrQty || '-',
        ratePerKg: data.ratePerKg || '-',
        totalAmount: idx === 0 ? data.totalAmount : '-'
      };
    }) : [{
      srNo: 1,
      cropName: data.gradeOrItems || 'Agricultural Produce',
      grade: 'STANDARD',
      packaging: data.category || 'Crates',
      weightKg: data.weightOrQty || '-',
      ratePerKg: data.ratePerKg || '-',
      totalAmount: data.totalAmount
    }]
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col justify-between max-h-[94vh]">
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
            <div className="flex items-center gap-3 pb-3 border-b-2 border-slate-900">
              <div className="w-14 h-14 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100 flex-shrink-0 overflow-hidden">
                {tenant?.logoUrl ? (
                  <img src={tenant.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                ) : (
                  <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v16h16V4zm0 8h16M8 12v8m8-8v8M4 8h16" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <h2 className="font-black text-slate-900 uppercase tracking-tight text-base sm:text-lg text-left">
                  {tenant?.businessNameMr || tenant?.businessName || 'दत्तकृपा फळे व भाजीपाला सप्लायर्स आणि ट्रान्सपोर्ट'}
                </h2>
                <p className="text-[11px] font-bold text-slate-600 mt-0.5 text-left">
                  {tenant?.address || 'महाराष्ट्र, भारत (Maharashtra, India)'}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 text-left font-semibold mt-0.5">
                  <span>📞 {tenant?.phone || '7588423116'}</span>
                  <span>•</span>
                  <span>GSTIN: {tenant?.gstin || '27AAAAA0000A1Z5'}</span>
                  {tenant?.email && (
                    <>
                      <span>•</span>
                      <span>✉️ {tenant.email}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Title & Receipt Meta */}
            <div className="py-2.5 px-3 my-2 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap justify-between items-center text-xs">
              <div>
                <span className="font-black text-blue-700 uppercase tracking-wider block text-[11px]">
                  {isB2bSale ? 'TAX INVOICE / B2B SALES BILL (कर बीजक)' : data.title}
                </span>
                <span className="font-extrabold text-slate-900 text-sm">
                  #{data.receiptNo}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-semibold block">दिनांक (Date)</span>
                <span className="font-black text-slate-800 text-xs">{data.date}</span>
              </div>
            </div>

            {/* Billed To (Buyer) & Logistics (Vehicle/Driver) Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2.5 border-b border-slate-200 text-xs">
              {/* Buyer Section */}
              <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  {isB2bSale ? 'खरेदीदार / व्यापारी तपशील (Billed To):' : 'शेतकरी / पक्ष तपशील (Party Details):'}
                </span>
                <p className="font-black text-slate-900 text-sm">{data.partyName}</p>
                <p className="font-semibold text-slate-600 text-[11px]">{data.partyVillageOrAddress}</p>
                <p className="text-[10px] text-slate-500 font-medium">मोबाईल: {data.partyPhone}</p>
                {data.buyerGstin && <p className="text-[10px] text-slate-500 font-medium">GSTIN: {data.buyerGstin}</p>}
              </div>

              {/* Logistics Section */}
              <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  वाहतूक व गाडी तपशील (Logistics Manifest):
                </span>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-[10px]">गाडी क्रमांक (Vehicle No):</span>
                  <span className="font-black text-blue-700">{data.vehicleNo || 'MH-15-EG-4521'}</span>
                </div>
                {data.driverName && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-[10px]">चालक / ड्रायव्हर नाव:</span>
                    <span className="font-bold text-slate-800">{data.driverName}</span>
                  </div>
                )}
                {data.driverPhone && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-[10px]">चालक संपर्क:</span>
                    <span className="font-semibold text-slate-700">{data.driverPhone}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-[10px]">पोहोच ठिकाण (Destination):</span>
                  <span className="font-bold text-slate-800">{data.partyVillageOrAddress || 'Market Hub'}</span>
                </div>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="py-3 border-b border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 uppercase text-[9px] font-black">
                    <th className="py-1.5 px-2 text-center w-8">#</th>
                    <th className="py-1.5 px-2">पिक / जात (Item Description)</th>
                    <th className="py-1.5 px-2 text-center">ग्रेड / पॅकिंग</th>
                    <th className="py-1.5 px-2 text-right">वजन (Weight)</th>
                    <th className="py-1.5 px-2 text-right">दर (Rate)</th>
                    <th className="py-1.5 px-2 text-right">एकूण (Amount)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lineItems.map((item: any, idx: number) => {
                    const weightVal = typeof item.weightKg === 'number' ? `${item.weightKg} ${item.unit || 'KG'}` : (item.weightKg || '-');
                    const rateVal = typeof item.ratePerKg === 'number' ? `₹${item.ratePerKg}` : (item.ratePerKg ? `₹${item.ratePerKg}` : '-');
                    const amtVal = typeof item.totalAmount === 'number' ? `₹${item.totalAmount.toLocaleString('en-IN')}` : (String(item.totalAmount).startsWith('₹') ? item.totalAmount : `₹${item.totalAmount}`);

                    return (
                      <tr key={idx} className="font-bold text-slate-800 text-[11px] hover:bg-slate-50/50">
                        <td className="py-2 px-2 text-center text-slate-400 font-bold">{item.srNo || (idx + 1)}</td>
                        <td className="py-2 px-2 font-extrabold text-slate-900">
                          {item.cropName}
                        </td>
                        <td className="py-2 px-2 text-center text-slate-600 font-semibold text-[10px]">
                          {item.grade || item.packaging || data.category || 'कॅरेट'}
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-slate-800">
                          {weightVal}
                        </td>
                        <td className="py-2 px-2 text-right text-slate-600">
                          {rateVal}
                        </td>
                        <td className="py-2 px-2 text-right font-black text-slate-900">
                          {amtVal}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Financial Totals & Summary */}
            <div className="py-3 space-y-2 text-xs border-b border-slate-200">
              <div className="flex justify-between font-black text-slate-900 text-sm">
                <span>एकूण बिल रक्कम (Total Bill Amount):</span>
                <span className="text-emerald-700">{data.totalAmount}</span>
              </div>

              {/* Amount in Words */}
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-[10px]">
                <span className="text-slate-400 font-bold uppercase tracking-wider block">अक्षरी रक्कम (Amount in Words):</span>
                <span className="font-extrabold text-slate-800">{numberToWordsINR(data.totalAmount)}</span>
              </div>

              {data.paidAmount && (
                <div className="flex justify-between text-emerald-700 font-bold text-xs pt-1">
                  <span>अ‍ॅडव्हान्स / दिलेला भरणा (Amount Paid):</span>
                  <span>- {data.paidAmount}</span>
                </div>
              )}

              {data.balanceAmount && (
                <div className="flex justify-between font-black text-rose-600 text-sm pt-1 border-t border-slate-200">
                  <span>शिल्लक बाकी देणे (Remaining Balance Due):</span>
                  <span>{data.balanceAmount}</span>
                </div>
              )}
            </div>

            {/* Bank Disbursal Account Details */}
            <div className="py-2.5 bg-slate-50/90 rounded-xl border border-slate-200/80 p-3 my-2 text-[10px] space-y-1">
              <span className="font-black text-slate-700 uppercase tracking-wider block">
                बँक भरणा तपशील (Bank Account Details for RTGS / NEFT / UPI):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600 font-semibold pt-0.5">
                <div><span>बँक:</span> <strong className="text-slate-900">State Bank of India</strong></div>
                <div><span>खाते क्र:</span> <strong className="text-slate-900">38472910482</strong></div>
                <div><span>IFSC:</span> <strong className="text-slate-900">SBIN0001234</strong></div>
                <div><span>UPI ID:</span> <strong className="text-slate-900">{tenant?.phone ? `${tenant.phone}@upi` : 'dattakrupa@sbi'}</strong></div>
              </div>
            </div>

            {/* Signatures & Stamps */}
            <div className="pt-5 mt-2 border-t border-dashed border-slate-300 flex justify-between items-end text-xs">
              <div className="text-center">
                <div className="h-10 flex items-center justify-center text-slate-400 text-[9px] mb-1">
                  [ स्वाक्षरी / शिक्का ]
                </div>
                <span className="text-[9px] font-extrabold text-slate-600 block">खरेदीदाराची सही / शिक्का</span>
                <span className="text-[8px] text-slate-400 block">(Receiver's Signature)</span>
              </div>

              <div className="text-center">
                <div className="h-10 flex items-center justify-center text-blue-700 font-black text-[10px] mb-1">
                  {tenant?.businessName || 'Dattakrupa Agro'}
                </div>
                <span className="text-[9px] font-extrabold text-slate-900 block">अधिकृत स्वाक्षरी व शिक्का</span>
                <span className="text-[8px] text-slate-400 block">(Authorized Signatory)</span>
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
