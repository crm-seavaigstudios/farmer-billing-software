"use client";

import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Download, 
  Share2, 
  X, 
  FileText, 
  CheckCircle2, 
  Building2, 
  Truck, 
  Phone, 
  Calendar, 
  Smartphone,
  ShieldCheck
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export interface SaleItemDetail {
  srNo?: number;
  cropName: string;
  grade?: string;
  category?: string;
  packaging?: string;
  weightKg: number | string;
  ratePerKg: number | string;
  totalAmount: number | string;
  unit?: string;
}

export type ReceiptData = {
  type?: string;
  title?: string;
  receiptNo?: string;
  billNo?: string;
  date?: string;
  partyName?: string;
  farmerName?: string;
  partyPhone?: string;
  farmerPhone?: string;
  partyVillageOrAddress?: string;
  address?: string;
  gradeOrItems?: string;
  items?: SaleItemDetail[] | any[];
  weightOrQty?: string | number;
  totalWeight?: string | number;
  ratePerKg?: string | number;
  totalAmount?: string | number;
  amount?: string | number;
  netAmount?: string | number;
  paidAmount?: string | number;
  balanceAmount?: string | number;
  dueAmount?: string | number;
  paymentMode?: string;
  paymentStatus?: string;
  category?: string;
  cropVariety?: string;
  vehicleNo?: string;
  driverName?: string;
  driverPhone?: string;
  gstin?: string;
  buyerGstin?: string;
};

export function numberToWordsINR(amount: number | string): string {
  const num = typeof amount === 'number' ? Math.round(amount) : Math.round(parseFloat(String(amount).replace(/[^0-9.-]+/g, '')) || 0);
  if (num === 0) return 'Zero Rupees Only';
  if (isNaN(num)) return '';

  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertNum(n: number): string {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : ' ');
    if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? convertNum(n % 100) : '');
    if (n < 100000) return convertNum(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? convertNum(n % 1000) : '');
    if (n < 10000000) return convertNum(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? convertNum(n % 100000) : '');
    return convertNum(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 !== 0 ? convertNum(n % 10000000) : '');
  }

  return `${convertNum(num).trim()} Rupees Only`;
}

interface PrintReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ReceiptData | null;
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({ isOpen, onClose, data }) => {
  const { t } = useLanguage();
  const [printFormat, setPrintFormat] = useState<'POS_80MM' | 'A5_MANDI' | 'A4_FULL'>('A5_MANDI');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [tenant, setTenant] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const activeTenant = localStorage.getItem('active_tenant');
      if (activeTenant) {
        try {
          setTenant(JSON.parse(activeTenant));
        } catch {}
      }
    }
  }, []);

  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      if (typeof window !== 'undefined') {
        const html2pdfModule = await import('html2pdf.js');
        const html2pdf = (html2pdfModule.default || html2pdfModule) as any;
        const element = document.getElementById('receipt-print-area');
        
        const invoiceNo = data.billNo || data.receiptNo || 'Bill';
        const opt = {
          margin: [0.2, 0.2, 0.2, 0.2],
          filename: `Invoice-${invoiceNo}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'in', format: printFormat === 'A5_MANDI' ? 'a5' : (printFormat === 'POS_80MM' ? [3.15, 8.5] : 'a4'), orientation: 'portrait' }
        };

        await html2pdf().set(opt).from(element).save();
      }
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleShareWhatsAppPdf = async () => {
    setIsGeneratingPdf(true);
    const invoiceNo = data.billNo || data.receiptNo || 'Bill';
    const partyPhone = data.farmerPhone || data.partyPhone || '';
    const partyName = data.farmerName || data.partyName || 'Trader';
    const totAmt = data.netAmount || data.totalAmount || data.amount || 0;
    const dueAmt = data.dueAmount || data.balanceAmount || 0;

    try {
      if (typeof window !== 'undefined' && navigator.share) {
        const html2pdfModule = await import('html2pdf.js');
        const html2pdf = (html2pdfModule.default || html2pdfModule) as any;
        const element = document.getElementById('receipt-print-area');
        
        const opt = {
          margin: 0.2,
          filename: `Invoice-${invoiceNo}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2 },
          jsPDF: { unit: 'in', format: printFormat === 'A5_MANDI' ? 'a5' : 'a4', orientation: 'portrait' }
        };

        const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
        const file = new File([pdfBlob], `Invoice-${invoiceNo}.pdf`, { type: 'application/pdf' });

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `B2B Sales Invoice #${invoiceNo}`,
            text: `🙏 *${tenant?.businessName || 'Agri CRM'}*\nबीजक क्र: ${invoiceNo}\nखरेदीदार: ${partyName}\nरक्कम: ₹${Number(totAmt).toLocaleString('en-IN')}`,
          });
          setIsGeneratingPdf(false);
          return;
        }
      }
    } catch (e) {
      console.log('Web share fallback to WhatsApp link');
    }

    await handleDownloadPdf();
    const encodedText = encodeURIComponent(
      `🙏 *${tenant?.businessName || 'Agri CRM'}*\n` +
      `बीजक क्र (Invoice No): ${invoiceNo}\n` +
      `दिनांक: ${data.date || new Date().toLocaleDateString('en-IN')}\n` +
      `खरेदीदार नाव: ${partyName} (${data.address || data.partyVillageOrAddress || ''})\n` +
      `गाडी क्र: ${data.vehicleNo || '-'}\n` +
      `एकूण बिल रक्कम: ₹${Number(totAmt).toLocaleString('en-IN')}\n` +
      `शिल्लक बाकी: ₹${Number(dueAmt).toLocaleString('en-IN')}\n\n` +
      `📌 *टीप:* अधिकृत B2B कर बीजक (Tax Invoice) तयार झाले आहे.`
    );
    window.open(`https://wa.me/91${partyPhone}?text=${encodedText}`, '_blank');
    setIsGeneratingPdf(false);
  };

  const getFormatClassName = () => {
    switch (printFormat) {
      case 'POS_80MM':
        return 'w-[320px] max-w-[320px] text-xs p-3 print-format-pos';
      case 'A5_MANDI':
        return 'w-full max-w-[580px] text-xs p-5 print-format-a5';
      case 'A4_FULL':
        return 'w-full max-w-[760px] text-sm p-8 print-format-a4';
      default:
        return 'w-full max-w-[580px] text-xs p-5';
    }
  };

  // Determine line items list with intelligent fallback parsing
  const getParsedLineItems = (): SaleItemDetail[] => {
    if (data.items && Array.isArray(data.items) && data.items.length > 0) {
      return data.items.map((it, idx) => ({
        srNo: it.srNo || idx + 1,
        cropName: it.cropName || it.name || 'Agricultural Produce',
        grade: it.grade || 'A_GRADE',
        packaging: it.packaging || it.category || 'कॅरेट (Crates)',
        weightKg: it.weightKg || it.weight || '-',
        ratePerKg: it.ratePerKg || it.rate || '-',
        totalAmount: it.totalAmount || (Number(it.weightKg || 0) * Number(it.ratePerKg || 0)) || '-'
      }));
    }

    // Fallback parsing from comma string: e.g. "Strawberry (A Grade) (450 KG), Strawberry (B Grade) (200 KG)"
    const rawString = data.gradeOrItems || '';
    if (rawString && rawString.includes(',')) {
      const parts = rawString.split(',').map(s => s.trim()).filter(Boolean);
      return parts.map((part, idx) => {
        // Extract weight like "(450 KG)"
        const matchWeight = part.match(/\((\d+(?:\.\d+)?)\s*KG\)/i);
        const weight = matchWeight ? matchWeight[1] : '-';
        // Clean crop name
        const cleanName = part.replace(/\(\d+(?:\.\d+)?\s*KG\)/gi, '').trim();

        return {
          srNo: idx + 1,
          cropName: cleanName || part,
          grade: cleanName.includes('B Grade') ? 'B_GRADE' : 'A_GRADE',
          packaging: 'कॅरेट (Crates)',
          weightKg: weight !== '-' ? `${weight} KG` : '-',
          ratePerKg: '-',
          totalAmount: '-'
        };
      });
    }

    return [{
      srNo: 1,
      cropName: data.gradeOrItems || 'कृषी उत्पन्न (Produce)',
      grade: data.category || 'A_GRADE',
      packaging: 'कॅरेट (Crates)',
      weightKg: data.totalWeight || data.weightOrQty || '-',
      ratePerKg: data.ratePerKg || '-',
      totalAmount: data.netAmount || data.totalAmount || data.amount || '-'
    }];
  };

  const lineItems = getParsedLineItems();
  const invoiceNo = data.billNo || data.receiptNo || 'SB-001';
  const buyerName = data.farmerName || data.partyName || 'B2B Trader / Buyer';
  const buyerPhone = data.farmerPhone || data.partyPhone || 'N/A';
  const buyerAddress = data.address || data.partyVillageOrAddress || 'Market Yard';
  const buyerGstin = data.buyerGstin || data.gstin || '';
  const dateStr = data.date || new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  
  const rawTotAmt = data.netAmount ?? data.totalAmount ?? data.amount ?? 0;
  const numTotAmt = typeof rawTotAmt === 'number' ? rawTotAmt : (parseFloat(String(rawTotAmt).replace(/[^0-9.-]+/g, '')) || 0);
  
  const rawPaidAmt = data.paidAmount ?? 0;
  const numPaidAmt = typeof rawPaidAmt === 'number' ? rawPaidAmt : (parseFloat(String(rawPaidAmt).replace(/[^0-9.-]+/g, '')) || 0);

  const rawDueAmt = data.dueAmount ?? data.balanceAmount ?? Math.max(0, numTotAmt - numPaidAmt);
  const numDueAmt = typeof rawDueAmt === 'number' ? rawDueAmt : (parseFloat(String(rawDueAmt).replace(/[^0-9.-]+/g, '')) || 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 font-sans animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[96vh]">
        
        {/* Top Format Selector Controls */}
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-black text-slate-800">Select Print Size Format:</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-xl">
            <button
              onClick={() => setPrintFormat('POS_80MM')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                printFormat === 'POS_80MM' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              <span>80mm POS Roll</span>
            </button>

            <button
              onClick={() => setPrintFormat('A5_MANDI')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                printFormat === 'A5_MANDI' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>A5 Mandi Slip</span>
            </button>

            <button
              onClick={() => setPrintFormat('A4_FULL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all ${
                printFormat === 'A4_FULL' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3 h-3" />
              <span>Full A4 Bill</span>
            </button>
          </div>

          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-xl cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Receipt Canvas Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex justify-center bg-slate-100/60 flex-1">
          <div
            id="receipt-print-area"
            className={`bg-white border border-slate-200 shadow-sm rounded-2xl text-slate-900 mx-auto transition-all ${getFormatClassName()}`}
          >
            {/* Header & Agency Brand */}
            <div className="flex items-center gap-3.5 pb-3.5 border-b-2 border-slate-900">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-200 flex-shrink-0 overflow-hidden">
                {tenant?.logoUrl ? (
                  <img src={tenant.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                ) : (
                  <Building2 className="w-6 h-6 text-emerald-700" />
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h2 className="font-black text-slate-900 uppercase tracking-tight text-base sm:text-lg leading-snug">
                  {tenant?.businessNameMr || tenant?.businessName || 'दत्तकृपा फळे व भाजीपाला सप्लायर्स आणि ट्रान्सपोर्ट'}
                </h2>
                <p className="text-[11px] font-bold text-slate-600 mt-0.5">
                  {tenant?.address || 'महाराष्ट्र, भारत (Maharashtra, India)'}
                </p>
                <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-slate-500 font-semibold mt-0.5">
                  <span>📞 {tenant?.phone || '7588423116'}</span>
                  <span>•</span>
                  <span>GSTIN: {tenant?.gstin || '27AAAAA0000A1Z5'}</span>
                </div>
              </div>
            </div>

            {/* Bill Title & Meta Ribbon */}
            <div className="py-2 px-3 my-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
              <div>
                <span className="font-black text-blue-700 uppercase tracking-wider block text-[11px]">
                  TAX INVOICE / B2B SALES BILL (कर बीजक)
                </span>
                <span className="font-extrabold text-slate-900 text-sm">
                  #{invoiceNo}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold block">दिनांक (Date)</span>
                <span className="font-black text-slate-900 text-xs">{dateStr}</span>
              </div>
            </div>

            {/* Buyer & Logistics Manifest Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 text-xs">
              {/* Buyer Box */}
              <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-200 space-y-1 text-left">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  खरेदीदार / व्यापारी तपशील (Billed To):
                </span>
                <p className="font-black text-slate-900 text-sm">{buyerName}</p>
                <p className="font-semibold text-slate-600 text-[11px]">{buyerAddress}</p>
                <p className="text-[10px] text-slate-500 font-medium">मोबाईल: {buyerPhone}</p>
                {buyerGstin && buyerGstin !== 'N/A' && (
                  <p className="text-[10px] text-slate-700 font-bold">GSTIN: {buyerGstin}</p>
                )}
              </div>

              {/* Logistics Manifest Box */}
              <div className="bg-slate-50/90 p-3 rounded-xl border border-slate-200 space-y-1 text-left">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  वाहतूक व गाडी तपशील (Logistics Manifest):
                </span>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-[10px]">गाडी क्रमांक (Vehicle No):</span>
                  <span className="font-black text-blue-700">{data.vehicleNo || 'MH-15-EG-4521'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-[10px]">चालक (Driver):</span>
                  <span className="font-bold text-slate-800">{data.driverName || 'Santosh Gaikwad'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-[10px]">चालक संपर्क:</span>
                  <span className="font-semibold text-slate-700">{data.driverPhone || '9876543210'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 text-[10px]">पोहोच ठिकाण (Dest):</span>
                  <span className="font-bold text-slate-800">{buyerAddress}</span>
                </div>
              </div>
            </div>

            {/* Produce Itemized Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden mb-3">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase text-[9px] font-black tracking-wider">
                    <th className="py-2 px-2.5 text-center w-8">#</th>
                    <th className="py-2 px-2.5">पिक / जात (Item Description)</th>
                    <th className="py-2 px-2.5 text-center">ग्रेड / पॅकिंग</th>
                    <th className="py-2 px-2.5 text-right">वजन (Weight)</th>
                    <th className="py-2 px-2.5 text-right">दर (Rate)</th>
                    <th className="py-2 px-2.5 text-right">एकूण (Amount)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lineItems.map((item, idx) => {
                    const weightVal = typeof item.weightKg === 'number' ? `${item.weightKg} ${item.unit || 'KG'}` : (item.weightKg || '-');
                    const rateVal = typeof item.ratePerKg === 'number' ? `₹${item.ratePerKg}` : (item.ratePerKg !== '-' && item.ratePerKg ? `₹${item.ratePerKg}` : '-');
                    const amtVal = typeof item.totalAmount === 'number' ? `₹${item.totalAmount.toLocaleString('en-IN')}` : (item.totalAmount !== '-' && item.totalAmount ? (String(item.totalAmount).startsWith('₹') ? item.totalAmount : `₹${item.totalAmount}`) : '-');

                    return (
                      <tr key={idx} className="font-bold text-slate-800 text-[11px] hover:bg-slate-50/50">
                        <td className="py-2 px-2.5 text-center text-slate-400 font-bold">{item.srNo || (idx + 1)}</td>
                        <td className="py-2 px-2.5 font-extrabold text-slate-900">
                          {item.cropName}
                        </td>
                        <td className="py-2 px-2.5 text-center text-slate-600 font-semibold text-[10px]">
                          {item.grade || item.packaging || 'A_GRADE'}
                        </td>
                        <td className="py-2 px-2.5 text-right font-bold text-slate-800">
                          {weightVal}
                        </td>
                        <td className="py-2 px-2.5 text-right text-slate-600">
                          {rateVal}
                        </td>
                        <td className="py-2 px-2.5 text-right font-black text-slate-900">
                          {amtVal}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Financial Summary & Amount in Words */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs mb-4">
              <div className="flex justify-between font-black text-slate-900 text-sm">
                <span>एकूण बिल रक्कम (Total Bill Amount):</span>
                <span className="text-emerald-700 text-base">₹{numTotAmt.toLocaleString('en-IN')}</span>
              </div>

              {/* Amount in Words */}
              <div className="bg-white p-2 rounded-lg border border-slate-200 text-[10px]">
                <span className="text-slate-400 font-bold uppercase tracking-wider block">अक्षरी रक्कम (Amount in Words):</span>
                <span className="font-extrabold text-slate-800">{numberToWordsINR(numTotAmt)}</span>
              </div>

              {numPaidAmt > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold text-xs pt-1">
                  <span>अ‍ॅडव्हान्स / दिलेला भरणा (Amount Paid):</span>
                  <span>- ₹{numPaidAmt.toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between font-black text-rose-600 text-sm pt-1.5 border-t border-slate-200">
                <span>शिल्लक बाकी येणे (Remaining Balance Due):</span>
                <span>₹{numDueAmt.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Authorized Signatures & Receiver Stamp */}
            <div className="pt-4 border-t border-dashed border-slate-300 flex justify-between items-end text-xs">
              <div className="text-center">
                <div className="h-9 flex items-center justify-center text-slate-400 text-[9px] mb-1">
                  [ स्वाक्षरी / शिक्का ]
                </div>
                <span className="text-[9px] font-extrabold text-slate-600 block">खरेदीदाराची सही / शिक्का</span>
                <span className="text-[8px] text-slate-400 block">(Receiver's Signature)</span>
              </div>

              <div className="text-center">
                <div className="h-9 flex items-center justify-center text-blue-700 font-black text-[10px] mb-1">
                  {tenant?.businessName || 'Dattakrupa Agro'}
                </div>
                <span className="text-[9px] font-extrabold text-slate-900 block">अधिकृत स्वाक्षरी व शिक्का</span>
                <span className="text-[8px] text-slate-400 block">(Authorized Signatory)</span>
              </div>
            </div>

          </div>
        </div>

        {/* Modal Action Controls */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2 no-print">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Format: {printFormat}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={handleShareWhatsAppPdf}
              disabled={isGeneratingPdf}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share PDF Document</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
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
