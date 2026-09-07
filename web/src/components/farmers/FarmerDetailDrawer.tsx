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
  ArrowUpRight,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { PrintStatementModal, StatementData } from '@/components/common/PrintStatementModal';
import { apiGetPurchases, apiGetPayments, apiGetFarmerMaterials, isFarmerMatch, apiGetFarmers, apiGetFarmerDetails } from '@/lib/api';
import { useEffect } from 'react';

export interface FarmerDetailDrawerProps {
  farmer?: any | null;
  farmerId?: string | null;
  refreshKey?: number;
  onClose: () => void;
  onOpenMaterialModal?: (farmerId: string) => void;
  onOpenAdvanceModal?: (farmerId: string) => void;
}

export const FarmerDetailDrawer: React.FC<FarmerDetailDrawerProps> = ({
  farmer: initialFarmer,
  farmerId,
  refreshKey,
  onClose,
  onOpenMaterialModal,
  onOpenAdvanceModal,
}) => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'PURCHASES' | 'PAYMENTS' | 'ADVANCES' | 'MATERIALS' | 'LEDGER'>('LEDGER');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  const [currentFarmer, setCurrentFarmer] = useState<any>(initialFarmer || null);

  useEffect(() => {
    if (initialFarmer) {
      setCurrentFarmer(initialFarmer);
      return;
    }
    if (farmerId) {
      (async () => {
        try {
          const farmers = await apiGetFarmers();
          const found = Array.isArray(farmers) ? farmers.find((f: any) => f.id === farmerId || f.farmerIdCode === farmerId) : null;
          if (found) {
            setCurrentFarmer(found);
          } else {
            const detail = await apiGetFarmerDetails(farmerId);
            if (detail) setCurrentFarmer(detail);
          }
        } catch (e) {
          console.error('Error fetching farmer:', e);
        }
      })();
    }
  }, [farmerId, initialFarmer, refreshKey]);

  const farmer = currentFarmer;

  const [purchases, setPurchases] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [totals, setTotals] = useState({ purchase: 0, paid: 0, material: 0, outstanding: 0 });
  const [realTransactions, setRealTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (!farmer) return;
    const fetchLedger = async () => {
      try {
        const p = await apiGetPurchases();
        const pay = await apiGetPayments();
        const mat = await apiGetFarmerMaterials(farmer.id);

        const fp = Array.isArray(p) ? p.filter((x: any) => isFarmerMatch(x, farmer)) : [];
        const fpay = Array.isArray(pay) ? pay.filter((x: any) => isFarmerMatch(x, farmer)) : [];
        const fmat = Array.isArray(mat) ? mat : [];

        setPurchases(fp);
        setPayments(fpay);
        setMaterials(fmat);

        const allItems: any[] = [];
        let totalPurchase = 0;
        let totalPaid = 0;
        let totalMaterial = 0;

        const formatDate = (rawDate: any) => {
          if (!rawDate) return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          try {
            const d = new Date(rawDate);
            if (isNaN(d.getTime())) return String(rawDate);
            return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
          } catch {
            return String(rawDate);
          }
        };

        const getTimestamp = (x: any) => {
          const raw = x.createdAt || x.date || x.purchaseDate || x.paymentDate;
          if (!raw) return 0;
          const t = new Date(raw).getTime();
          return isNaN(t) ? 0 : t;
        };

        fp.forEach((x: any) => {
          const itemWeight = parseFloat(String(x.weight || x.totalWeight || '0').replace(/[^0-9.-]+/g, '')) || 0;
          const itemRate = parseFloat(String(x.rate || '0').replace(/[^0-9.-]+/g, '')) || 0;
          const calcVal = (itemWeight > 0 && itemRate > 0) ? (itemWeight * itemRate) : 0;
          const rawAmt = x.amount ?? x.totalAmount ?? x.netAmount ?? calcVal ?? 0;
          const parsed = typeof rawAmt === 'number' ? rawAmt : (parseFloat(String(rawAmt).replace(/[^0-9.-]+/g, '')) || 0);
          const amt = parsed > 0 ? parsed : calcVal;

          totalPurchase += amt;
          allItems.push({
             dateStr: formatDate(x.date || x.purchaseDate || x.createdAt),
             timestamp: getTimestamp(x),
             refNo: x.purchaseNo || x.id,
             type: 'PURCHASE',
             description: x.crop || 'Strawberry (A Grade)',
             weightOrQty: `${x.weight || itemWeight} @ ${x.rate || itemRate}`,
             debitVal: 0,
             creditVal: amt,
             notes: x.notes,
             raw: { ...x, amount: amt, totalAmount: amt }
          });
        });
        
        fpay.forEach((x: any) => {
          const amt = typeof x.amount === 'number' ? x.amount : parseFloat(String(x.amount || 0).replace(/[^0-9.-]+/g, '')) || 0;
          totalPaid += amt;
          allItems.push({
             dateStr: formatDate(x.date || x.paymentDate || x.createdAt),
             timestamp: getTimestamp(x),
             refNo: x.paymentNo || x.id,
             type: 'PAYMENT',
             description: `Payment (${x.method || x.paymentMode || 'Cash'})`,
             weightOrQty: '-',
             debitVal: amt,
             creditVal: 0,
             notes: x.notes || x.method,
             raw: x
          });
        });

        fmat.forEach((x: any) => {
          const qty = Number(x.quantity || 1);
          const price = Number(x.unitPrice || 0);
          const calcVal = qty * price;
          const rawAmt = x.totalAmount ?? x.totalPrice ?? x.amount ?? calcVal ?? 0;
          const parsedAmt = typeof rawAmt === 'number' ? rawAmt : (parseFloat(String(rawAmt).replace(/[^0-9.-]+/g, '')) || 0);
          const amt = parsedAmt > 0 ? parsedAmt : calcVal;
          totalMaterial += amt;

          allItems.push({
             dateStr: formatDate(x.date || x.createdAt),
             timestamp: getTimestamp(x),
             refNo: x.id,
             type: 'MATERIAL',
             description: `Material Issue: ${x.itemName}`,
             weightOrQty: `${qty} ${x.unit || 'QTY'} @ ₹${price}`,
             debitVal: amt,
             creditVal: 0,
             notes: x.notes,
             raw: { ...x, quantity: qty, unitPrice: price, totalAmount: amt, totalPrice: amt }
          });
        });
        
        // Chronological order from oldest to newest: Purchases (Credit) first on same date, then debits
        const naturalOrder: any = { 'PURCHASE': 1, 'MATERIAL': 2, 'PAYMENT': 3 };
        allItems.sort((a, b) => {
          if (a.timestamp !== b.timestamp) {
            return a.timestamp - b.timestamp;
          }
          return (naturalOrder[a.type] || 0) - (naturalOrder[b.type] || 0);
        });
        
        let bal = 0;
        const computed = allItems.map((item, idx) => {
           bal = bal + item.creditVal - item.debitVal;
           return {
              srNo: idx + 1,
              date: item.dateStr,
              refNo: item.refNo,
              type: item.type,
              description: item.description,
              weightOrQty: item.weightOrQty,
              debit: item.debitVal > 0 ? `-₹${item.debitVal.toLocaleString('en-IN')}` : '—',
              credit: item.creditVal > 0 ? `₹${item.creditVal.toLocaleString('en-IN')}` : '—',
              balance: `₹${bal.toLocaleString('en-IN')}`,
              raw: item.raw
           };
        });
        
        setTotals({ 
          purchase: totalPurchase, 
          paid: totalPaid, 
          material: totalMaterial,
          outstanding: bal 
        });
        // Reverse so the latest transaction is on top for instant visibility without scrolling
        setRealTransactions(computed.reverse());
      } catch (err) {
        console.error('Error in fetchLedger:', err);
      }
    };

    fetchLedger();
    const handleUpdate = () => fetchLedger();
    if (typeof window !== 'undefined') {
      window.addEventListener('purchases_changed', handleUpdate);
      window.addEventListener('payments_changed', handleUpdate);
      window.addEventListener('farmer_materials_changed', handleUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('purchases_changed', handleUpdate);
        window.removeEventListener('payments_changed', handleUpdate);
        window.removeEventListener('farmer_materials_changed', handleUpdate);
      }
    };
  }, [farmer]);

  if (!farmer) return null;

  const statementData: StatementData = {
    farmerId: farmer?.id || farmer?.farmerIdCode || 'FAR-10001',
    farmerName: farmer?.name || 'Farmer',
    phone: farmer?.phone || '',
    village: farmer?.village || '',
    aadhaar: farmer?.aadhaar || 'XXXX-XXXX-8910',
    bankAccount: farmer?.bankAccount || '',
    ifsc: farmer?.ifsc || '',
    totalPurchases: `₹${totals.purchase.toLocaleString('en-IN')}`,
    totalPaid: `₹${totals.paid.toLocaleString('en-IN')}`,
    advanceGiven: `₹${totals.material.toLocaleString('en-IN')}`, // mapping material to advance in print for now
    netBalance: `₹${totals.outstanding.toLocaleString('en-IN')}`,
    transactions: realTransactions,
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-2xs flex justify-end animate-in fade-in">
      <div className="bg-white w-full sm:w-[600px] h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200 font-sans">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-black text-lg flex items-center justify-center shadow-md shadow-blue-500/20">
              {farmer?.name ? farmer.name.charAt(0) : 'F'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">{farmer?.name || 'Farmer Profile'}</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-100">
                  {farmer?.farmerIdCode || farmer?.id || ''}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-400 mt-0.5 flex items-center gap-2">
                <span>📍 {farmer?.village || 'Village'}</span>
                <span>•</span>
                <span>📞 {farmer?.phone || 'No phone'}</span>
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

        {/* Financial Summary KPI Cards */}
        <div className="p-4 bg-slate-50/90 border-b border-slate-200/80">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            {/* 1. Total Purchases */}
            <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-3 shadow-2xs">
              <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider block">
                {language === 'mr' ? 'एकूण खरेदी' : 'Total Purchases'}
              </span>
              <span className="text-base font-black text-slate-900 mt-1 block">
                ₹{totals.purchase.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
                {purchases.length} {language === 'mr' ? 'खरेदी आवक' : 'bills'}
              </span>
            </div>

            {/* 2. Total Paid */}
            <div className="bg-emerald-50/80 border border-emerald-100 rounded-2xl p-3 shadow-2xs">
              <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider block">
                {language === 'mr' ? 'एकूण भरणा / जमा' : 'Total Paid Out'}
              </span>
              <span className="text-base font-black text-emerald-700 mt-1 block">
                ₹{totals.paid.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
                {payments.length} {language === 'mr' ? 'पेमेंट्स' : 'payments'}
              </span>
            </div>

            {/* 3. Material Supplies */}
            <div className="bg-purple-50/80 border border-purple-100 rounded-2xl p-3 shadow-2xs">
              <span className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider block">
                {language === 'mr' ? 'साहित्य पुरवठा' : 'Materials Given'}
              </span>
              <span className="text-base font-black text-purple-700 mt-1 block">
                ₹{totals.material.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
                {materials.length} {language === 'mr' ? 'साहित्य नोंदी' : 'items'}
              </span>
            </div>

            {/* 4. Net Outstanding / Advance */}
            <div className={`rounded-2xl p-3 shadow-2xs border ${
              totals.outstanding > 0 
                ? 'bg-rose-50/80 border-rose-100' 
                : totals.outstanding < 0 
                  ? 'bg-indigo-50/80 border-indigo-100' 
                  : 'bg-slate-100 border-slate-200'
            }`}>
              <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${
                totals.outstanding > 0 ? 'text-rose-600' : totals.outstanding < 0 ? 'text-indigo-600' : 'text-slate-600'
              }`}>
                {totals.outstanding > 0 
                  ? (language === 'mr' ? 'बाकी देणे (Due)' : 'Net Due to Pay') 
                  : totals.outstanding < 0 
                    ? (language === 'mr' ? 'अ‍ॅडव्हान्स शिल्लक' : 'Advance Balance') 
                    : (language === 'mr' ? 'हिशोब पूर्ण' : 'Fully Settled')}
              </span>
              <span className={`text-base font-black mt-1 block ${
                totals.outstanding > 0 ? 'text-rose-700' : totals.outstanding < 0 ? 'text-indigo-700' : 'text-slate-800'
              }`}>
                {totals.outstanding < 0 
                  ? `-₹${Math.abs(totals.outstanding).toLocaleString('en-IN')}`
                  : `₹${totals.outstanding.toLocaleString('en-IN')}`}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
                {totals.outstanding > 0 ? 'Pending' : totals.outstanding < 0 ? 'Advance' : 'Nil'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 border-b border-slate-200 flex gap-2 bg-white overflow-x-auto">
          <button
            onClick={() => setActiveTab('LEDGER')}
            className={`py-3 px-3 text-xs font-extrabold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'LEDGER'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            📊 {language === 'mr' ? 'खातेवही पासबुक' : 'Passbook Ledger'}
          </button>

          <button
            onClick={() => setActiveTab('PURCHASES')}
            className={`py-3 px-3 text-xs font-extrabold border-b-2 whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'PURCHASES'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <span>🛒 {language === 'mr' ? 'खरेदी आवक' : 'Purchases'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-50 text-blue-700 font-bold border border-blue-100">
              {purchases.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('PAYMENTS')}
            className={`py-3 px-3 text-xs font-extrabold border-b-2 whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'PAYMENTS'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <span>💵 {language === 'mr' ? 'भरणा नोंदी' : 'Payments'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-50 text-emerald-700 font-bold border border-emerald-100">
              {payments.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('ADVANCES')}
            className={`py-3 px-3 text-xs font-extrabold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'ADVANCES'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            ⚡ {language === 'mr' ? 'अ‍ॅडव्हान्स जमा' : 'Advances'}
          </button>

          <button
            onClick={() => setActiveTab('MATERIALS')}
            className={`py-3 px-3 text-xs font-extrabold border-b-2 whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'MATERIALS'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <span>📦 {language === 'mr' ? 'साहित्य पुरवठा' : 'Materials'}</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-50 text-purple-700 font-bold border border-purple-100">
              {materials.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('PROFILE')}
            className={`py-3 px-3 text-xs font-extrabold border-b-2 whitespace-nowrap transition-all cursor-pointer ${
              activeTab === 'PROFILE'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            👤 {language === 'mr' ? 'प्रोफाईल व पिके' : 'Profile'}
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'PROFILE' && (
            <div className="space-y-4 text-xs">
              {/* 1. Personal & Contact Details */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-600" /> {language === 'mr' ? 'वैयक्तिक व संपर्क माहिती' : 'Personal & Contact Details'}
                </h3>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 font-semibold block">{language === 'mr' ? 'पूर्ण नाव:' : 'Full Name:'}</span>
                    <span className="font-extrabold text-slate-900">{farmer.name || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">{language === 'mr' ? 'मोबाईल नंबर:' : 'Mobile Phone:'}</span>
                    <span className="font-bold text-slate-800">{farmer.phone || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">{language === 'mr' ? 'गाव:' : 'Village:'}</span>
                    <span className="font-bold text-slate-800">{farmer.village || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">{language === 'mr' ? 'तालुका:' : 'Subdistrict / Taluka:'}</span>
                    <span className="font-bold text-slate-800">{farmer.taluka || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">{language === 'mr' ? 'जिल्हा:' : 'District:'}</span>
                    <span className="font-bold text-slate-800">{farmer.district || '—'}</span>
                  </div>
                </div>
              </div>

              {/* 2. Bank Disbursal Account Details */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" /> {language === 'mr' ? 'बँक खाते तपशील' : 'Bank Account Details'}
                </h3>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-slate-400 font-semibold block">{language === 'mr' ? 'बँकेचे नाव:' : 'Bank Name:'}</span>
                    <span className="font-extrabold text-slate-900">{farmer.bankName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">{language === 'mr' ? 'खाते क्रमांक:' : 'Bank Account Number:'}</span>
                    <span className="font-bold text-slate-800">{farmer.accountNumber || farmer.bankAccount || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">{language === 'mr' ? 'IFSC कोड:' : 'Bank IFSC Code:'}</span>
                    <span className="font-bold text-slate-800">{farmer.ifscCode || farmer.ifsc || '—'}</span>
                  </div>
                </div>
              </div>

              {/* 3. Cultivated Crops & Farm Acreage */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sprout className="w-4 h-4 text-purple-600" /> {language === 'mr' ? 'पिके व शेती क्षेत्र' : 'Cultivated Crops & Farm Acreage'}
                </h3>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 font-semibold block">{language === 'mr' ? 'पिकाची जात / व्हरायटी:' : 'Primary Crop Variety:'}</span>
                    <span className="font-extrabold text-slate-900">{farmer.cropVariety || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">{language === 'mr' ? 'शेतीचे क्षेत्रफळ (Acreage):' : 'Farm Land Acreage:'}</span>
                    <span className="font-bold text-slate-800">{farmer.acreage || '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'PURCHASES' && (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  {language === 'mr' ? 'खरेदी आवक नोंदी' : 'Procurement Purchases'} ({purchases.length})
                </h3>
                <span className="font-bold text-slate-500">
                  {language === 'mr' ? 'एकूण खरेदी' : 'Total'}: <span className="font-black text-slate-900">₹{totals.purchase.toLocaleString('en-IN')}</span>
                </span>
              </div>
              <div className="space-y-2.5">
                {purchases.length === 0 ? (
                  <div className="py-10 text-center text-slate-400 font-bold bg-slate-50 rounded-2xl border border-slate-100">
                    No crop purchases recorded for this farmer.
                  </div>
                ) : (
                  purchases.map((p, idx) => (
                    <div key={idx} className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs hover:border-blue-200 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-blue-600 text-xs">{p.purchaseNo || p.id}</span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-black bg-blue-50 text-blue-700 border border-blue-100">
                              {p.grade || 'A_GRADE'}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                              p.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              p.paymentStatus === 'PARTIAL' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                              'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              {p.paymentStatus || 'UNPAID'}
                            </span>
                          </div>
                          <h4 className="font-black text-slate-900 text-sm mt-1">{p.crop || 'Crop Harvest'}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            <span>⚖️ {p.weight}</span> • <span>₹ {p.rate}</span>
                            {p.storageLocation && <span> • 📍 {p.storageLocation}</span>}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">📅 {p.date || p.purchaseDate}</p>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase">Bill Amount</span>
                          <span className="text-base font-black text-slate-900 block">
                            ₹{Number(String(p.totalAmount || p.amount || 0).replace(/[^0-9.-]+/g, '')).toLocaleString('en-IN')}
                          </span>
                          {p.paidAmount > 0 && (
                            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">
                              Paid: ₹{Number(p.paidAmount).toLocaleString('en-IN')}
                            </span>
                          )}
                          {p.dueAmount > 0 && (
                            <span className="text-[10px] text-rose-600 font-bold block">
                              Due: ₹{Number(p.dueAmount).toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
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

          {activeTab === 'ADVANCES' && (
            <div className="space-y-4 text-xs">
              {(() => {
                const advancePayments = payments.filter((p: any) => 
                  p.paymentType === 'ADVANCE' || 
                  p.paymentType === 'ADVANCE_PAYOUT' || 
                  String(p.notes || '').toLowerCase().includes('advance') || 
                  String(p.method || '').toLowerCase().includes('advance') ||
                  p.isAdvance
                );
                const totalAdvanceGiven = advancePayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                const currentAdvanceBal = farmer.advanceBalance || Math.max(0, totals.paid - totals.purchase);

                return (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3">
                        <span className="text-[10px] font-semibold text-indigo-500 uppercase block">Total Advance Issued (एकूण उचल)</span>
                        <span className="text-base font-black text-indigo-700 mt-0.5 block">₹{totalAdvanceGiven.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3">
                        <span className="text-[10px] font-semibold text-blue-500 uppercase block">Remaining Advance (शिल्लक अ‍ॅडव्हान्स)</span>
                        <span className="text-base font-black text-blue-700 mt-0.5 block">₹{currentAdvanceBal.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                        {language === 'mr' ? 'अ‍ॅडव्हान्स पेमेंट नोंदी' : 'Advance Payment History'} ({advancePayments.length})
                      </h3>
                      {onOpenAdvanceModal && (
                        <button
                          onClick={() => onOpenAdvanceModal(farmer.id)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-extrabold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                        >
                          + {language === 'mr' ? 'नवीन अ‍ॅडव्हान्स' : 'New Advance'}
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {advancePayments.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 font-bold bg-slate-50 rounded-2xl border border-slate-100">
                          No advance payouts recorded for this farmer.
                        </div>
                      ) : (
                        advancePayments.map((pay: any, idx: number) => (
                          <div
                            key={idx}
                            className="bg-white border border-slate-200/80 rounded-xl p-3 flex items-center justify-between shadow-2xs hover:border-indigo-200 transition-colors"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-indigo-600">{pay.paymentNo || pay.id}</span>
                                <span className="px-2 py-0.5 rounded text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  ADVANCE (उचल)
                                </span>
                              </div>
                              <p className="font-bold text-slate-800 flex items-center gap-2">
                                <span>{pay.paymentMode || pay.method || 'CASH'}</span>
                                {pay.notes && <span className="text-slate-400 font-normal">• {pay.notes}</span>}
                              </p>
                              <p className="text-[10px] text-slate-400">{pay.date || pay.paymentDate}</p>
                            </div>
                            <span className="text-sm font-black text-indigo-600">
                              ₹{Number(String(pay.amount || 0).replace(/[^0-9.-]+/g, '')).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}

          {activeTab === 'MATERIALS' && (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                  {language === 'mr' ? 'साहित्य पुरवठा नोंदी' : 'Material Supplies Issued'} ({materials.length})
                </h3>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-500">
                    {language === 'mr' ? 'एकूण नावे' : 'Total'}: <span className="font-black text-purple-700">₹{totals.material.toLocaleString('en-IN')}</span>
                  </span>
                  {onOpenMaterialModal && (
                    <button
                      onClick={() => onOpenMaterialModal(farmer.id)}
                      className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-extrabold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                    >
                      + {language === 'mr' ? 'नवीन साहित्य' : 'Issue Material'}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {materials.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 font-bold bg-slate-50 rounded-2xl border border-slate-100">
                    No material issues recorded for this farmer.
                  </div>
                ) : (
                  materials.map((m: any, idx: number) => {
                    const qty = Number(m.quantity || 1);
                    const price = Number(m.unitPrice || 0);
                    const calcVal = qty * price;
                    const rawAmt = m.totalAmount ?? m.totalPrice ?? m.amount ?? calcVal ?? 0;
                    const parsedAmt = typeof rawAmt === 'number' ? rawAmt : (parseFloat(String(rawAmt).replace(/[^0-9.-]+/g, '')) || 0);
                    const amt = parsedAmt > 0 ? parsedAmt : calcVal;
                    const dateVal = m.date || m.createdAt;
                    const dateFormatted = dateVal 
                      ? new Date(dateVal).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'Unknown';

                    return (
                      <div
                        key={idx}
                        className="bg-white border border-slate-200/80 rounded-xl p-3 flex items-center justify-between shadow-2xs hover:border-purple-200 transition-colors"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-purple-700">{m.itemName || 'Material Item'}</span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-black bg-purple-50 text-purple-700 border border-purple-100">
                              {qty} {m.unit || 'QTY'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600">
                            दर: ₹{price.toLocaleString('en-IN')} / {m.unit || 'QTY'}
                            {m.notes && <span className="text-slate-400 font-normal"> • {m.notes}</span>}
                          </p>
                          <p className="text-[10px] text-slate-400">{dateFormatted}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-purple-700 block">
                            ₹{amt.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[9px] font-bold text-rose-500 uppercase tracking-wide">नावे (Debit)</span>
                        </div>
                      </div>
                    );
                  })
                )}
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
                <div className="overflow-x-auto pb-2">
                  <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] text-slate-400 font-extrabold uppercase border-b border-slate-100">
                      <th className="py-2.5 px-2.5 text-center w-10">#</th>
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
                        <td colSpan={6} className="py-8 text-center text-slate-400 font-bold">No transactions recorded yet.</td>
                      </tr>
                    )}
                    {realTransactions.map((tx, idx) => (
                      <React.Fragment key={idx}>
                        <tr 
                          onClick={() => setExpandedRowId(expandedRowId === tx.refNo ? null : tx.refNo)}
                          className={`hover:bg-slate-50 font-medium cursor-pointer transition-colors ${expandedRowId === tx.refNo ? 'bg-slate-50' : ''}`}
                        >
                          <td className="py-2.5 px-2.5 text-center font-bold text-slate-400 text-[10px]">
                            {tx.srNo || (realTransactions.length - idx)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                             <div className="flex items-center gap-1">
                               {expandedRowId === tx.refNo ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                               {tx.date}
                             </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-800">
                            <span className="font-bold">{tx.description}</span>
                            <span className="text-[10px] text-slate-400 block">{tx.refNo}</span>
                          </td>
                          <td className={`py-2.5 px-3 text-right font-bold ${tx.debit !== '—' ? 'text-rose-600' : 'text-slate-900'}`}>{tx.debit}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{tx.credit}</td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-900">{tx.balance}</td>
                        </tr>
                        {expandedRowId === tx.refNo && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={6} className="py-3 px-4 border-b border-slate-100">
                              <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm text-xs cursor-default">
                                {tx.type === 'PURCHASE' && (
                                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div><span className="text-slate-400 block mb-1">Crop / Grade</span><span className="font-bold">{tx.raw.crop} {tx.raw.grade ? `(${tx.raw.grade})` : ''}</span></div>
                                    <div><span className="text-slate-400 block mb-1">Weight</span><span className="font-bold">{tx.raw.weight}</span></div>
                                    <div><span className="text-slate-400 block mb-1">Rate / kg</span><span className="font-bold">{tx.raw.rate}</span></div>
                                    <div><span className="text-slate-400 block mb-1">Bill Amount</span><span className="font-bold text-emerald-600">₹{Number(tx.raw.totalAmount || tx.raw.amount || 0).toLocaleString('en-IN')}</span></div>
                                  </div>
                                )}
                                {tx.type === 'PAYMENT' && (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    <div><span className="text-slate-400 block mb-1">Payment Mode</span><span className="font-bold">{tx.raw.method}</span></div>
                                    <div><span className="text-slate-400 block mb-1">Reference</span><span className="font-bold">{tx.raw.reference || tx.raw.transactionId || 'N/A'}</span></div>
                                    <div><span className="text-slate-400 block mb-1">Notes</span><span className="font-bold">{tx.raw.notes || 'None'}</span></div>
                                  </div>
                                )}
                                {tx.type === 'MATERIAL' && (
                                  <div className="space-y-2">
                                    <div className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-2 flex items-center justify-between">
                                      <span>साहित्य पुरवठा तपशील (Material Issue Details)</span>
                                      <span className="text-xs font-black text-rose-600">-₹{Number(tx.raw.totalAmount || tx.raw.totalPrice || (tx.raw.quantity * tx.raw.unitPrice) || 0).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                      <div><span className="text-slate-400 block mb-1">साहित्य / Item</span><span className="font-bold text-slate-800">{tx.raw.itemName || 'Material Item'}</span></div>
                                      <div><span className="text-slate-400 block mb-1">प्रमाण / Quantity</span><span className="font-bold text-slate-800">{tx.raw.quantity} {tx.raw.unit || 'QTY'}</span></div>
                                      <div><span className="text-slate-400 block mb-1">दर / Unit Price</span><span className="font-bold text-slate-800">₹{Number(tx.raw.unitPrice || 0).toLocaleString('en-IN')}</span></div>
                                      <div><span className="text-slate-400 block mb-1">एकूण नावे / Total Debit</span><span className="font-black text-rose-600">₹{Number(tx.raw.totalAmount || tx.raw.totalPrice || (tx.raw.quantity * tx.raw.unitPrice) || 0).toLocaleString('en-IN')}</span></div>
                                    </div>
                                    {tx.raw.notes && (
                                      <div className="mt-2 text-slate-500 pt-1 border-t border-slate-50">
                                        <span className="font-semibold text-slate-400">टीप (Notes):</span> {tx.raw.notes}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Ledger</span>
            </button>
            {onOpenMaterialModal && (
              <button
                onClick={() => onOpenMaterialModal(farmer.id)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
              >
                + Material
              </button>
            )}
            {onOpenAdvanceModal && (
              <button
                onClick={() => onOpenAdvanceModal(farmer.id)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 cursor-pointer"
              >
                + Advance
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 cursor-pointer"
          >
            Close
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
