"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  LogOut, 
  FileText, 
  IndianRupee, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  ChevronDown, 
  ChevronRight, 
  Sprout, 
  Filter, 
  Calendar,
  User,
  Phone,
  CreditCard,
  Printer,
  X
} from 'lucide-react';
import { PrintStatementModal, StatementData } from '@/components/common/PrintStatementModal';

export default function FarmerPortalPage() {
  const router = useRouter();
  const [farmer, setFarmer] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  
  const [rawPurchases, setRawPurchases] = useState<any[]>([]);
  const [rawPayments, setRawPayments] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  
  const [ledger, setLedger] = useState<any[]>([]);
  const [totals, setTotals] = useState({ purchase: 0, paid: 0, material: 0, outstanding: 0 });
  const [splitKPI, setSplitKPI] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'PURCHASES' | 'PAYMENTS' | 'LEDGER'>('LEDGER');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const [dateFilter, setDateFilter] = useState<'ALL_TIME' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'>('ALL_TIME');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  useEffect(() => {
    loadFarmerProfile();
  }, []);

  useEffect(() => {
    buildLedger();
  }, [rawPurchases, rawPayments, rawMaterials, dateFilter, customRange]);

  const loadFarmerProfile = async () => {
    const raw = localStorage.getItem('active_tenant');
    if (!raw) return router.push('/login');
    const auth = JSON.parse(raw);
    if (auth.userRole !== 'FARMER') return router.push('/login');
    
    // Get full farmer details live
    const { data: fData } = await supabase.from('Farmer').select('*').eq('id', auth.id).single();
    if (fData) {
      setFarmer(fData);
      // Get Agency/Tenant info
      const { data: tData } = await supabase.from('Tenant').select('*').eq('id', fData.tenantId).single();
      setTenant(tData);
      await fetchData(fData.id, fData.tenantId, fData.name);
    } else {
      router.push('/login');
    }
  };

  const fetchData = async (farmerId: string, tenantId: string, farmerName: string) => {
    try {
      // 1. Fetch Purchases strictly for this farmer under this tenant
      const { data: pData } = await supabase
        .from('Purchase')
        .select('*')
        .eq('farmerId', farmerId)
        .eq('tenantId', tenantId)
        .order('createdAt', { ascending: false });

      // 2. Fetch associated PurchaseItems for detailed crop/grade breakdowns
      const purchaseIds = (pData || []).map((p: any) => p.id).filter(Boolean);
      let itemsMap: Record<string, any[]> = {};
      if (purchaseIds.length > 0) {
        const { data: itemsData } = await supabase
          .from('PurchaseItem')
          .select('*')
          .in('purchaseId', purchaseIds);
        if (itemsData) {
          itemsData.forEach((it: any) => {
            if (!itemsMap[it.purchaseId]) itemsMap[it.purchaseId] = [];
            itemsMap[it.purchaseId].push(it);
          });
        }
      }

      const enhancedPurchases = (pData || []).map((p: any) => {
        const pItems = itemsMap[p.id] || [];
        const firstItem = pItems[0];
        const crop = firstItem?.cropName || p.crop || 'Crop Purchase';
        const weight = firstItem ? `${firstItem.weightKg} ${firstItem.unit || 'KG'}` : (p.totalWeight ? `${p.totalWeight} KG` : (p.weight || '-'));
        const rate = firstItem ? `${firstItem.ratePerKg}/${firstItem.unit || 'KG'}` : (p.rate || '-');
        const amount = Number(p.totalAmount ?? p.amount ?? 0);
        return {
          ...p,
          crop,
          weight,
          rate,
          amount,
          netAmount: amount,
          grade: firstItem?.grade || p.grade,
          items: pItems
        };
      });

      // 3. Fetch Payments strictly for this farmer under this tenant
      const { data: payData } = await supabase
        .from('Payment')
        .select('*')
        .eq('farmerId', farmerId)
        .eq('tenantId', tenantId)
        .order('createdAt', { ascending: false });

      // 4. Fetch Material purchases
      const { data: mData } = await supabase
        .from('FarmerMaterialPurchase')
        .select('*')
        .eq('farmerId', farmerId)
        .order('createdAt', { ascending: false });

      setRawPurchases(enhancedPurchases);
      setRawPayments(payData || []);
      setRawMaterials(mData || []);
    } catch (err) {
      console.error('Error fetching farmer data:', err);
    } finally {
      setLoading(false);
    }
  };

  const parseCustomDate = (dateStr: any) => {
    if (!dateStr) return new Date(0);
    try {
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        return new Date(parts[2], parts[1]-1, parts[0]);
      }
      return new Date(dateStr);
    } catch {
      return new Date(0);
    }
  };

  const isDateInRange = (date: Date) => {
    const now = new Date();
    if (dateFilter === 'ALL_TIME') return true;
    if (dateFilter === 'THIS_MONTH') {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }
    if (dateFilter === 'LAST_MONTH') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return date.getMonth() === lastMonth.getMonth() && date.getFullYear() === lastMonth.getFullYear();
    }
    if (dateFilter === 'CUSTOM') {
      if (!customRange.start || !customRange.end) return true;
      const start = new Date(customRange.start);
      const end = new Date(customRange.end);
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    }
    return true;
  };

  const buildLedger = () => {
    let allItems: any[] = [];
    let totalPurchase = 0;
    let totalPaid = 0;
    let totalMaterial = 0;

    rawPurchases.forEach((x: any) => {
      const d = parseCustomDate(x.date || x.purchaseDate || x.createdAt);
      if(!isDateInRange(d)) return;
      const amt = typeof x.amount === 'number' ? x.amount : parseFloat(String(x.netAmount || x.totalAmount || x.amount || '0').replace(/[^0-9.-]+/g, '')) || 0;
      totalPurchase += amt;
      allItems.push({
         dateStr: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
         timestamp: d.getTime(),
         refNo: x.billNo || x.id,
         type: 'PURCHASE',
         description: x.crop || 'Crop Purchase',
         weightOrQty: `${x.weight || x.netWeight || '-'} @ ${x.rate || '-'}`,
         debitVal: 0,
         creditVal: amt,
         notes: x.notes,
         raw: x
      });
    });
    
    rawPayments.forEach((x: any) => {
      const d = parseCustomDate(x.date || x.paymentDate || x.createdAt);
      if(!isDateInRange(d)) return;
      const amt = typeof x.amount === 'number' ? x.amount : parseFloat(String(x.amount || '0').replace(/[^0-9.-]+/g, '')) || 0;
      totalPaid += amt;
      allItems.push({
         dateStr: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
         timestamp: d.getTime(),
         refNo: x.paymentNo || x.paymentId || x.id,
         type: 'PAYMENT',
         description: `Payment (${x.paymentMode || x.method || x.paymentMethod || "Cash"})`,
         weightOrQty: '-',
         debitVal: amt,
         creditVal: 0,
         notes: x.notes || x.paymentMode || x.method,
         raw: x
      });
    });

    rawMaterials.forEach((x: any) => {
      const d = new Date(x.createdAt || 0);
      if(!isDateInRange(d)) return;
      const amt = typeof x.totalAmount === 'number' ? x.totalAmount : parseFloat(String(x.totalAmount || '0').replace(/[^0-9.-]+/g, '')) || 0;
      totalMaterial += amt;
      allItems.push({
         dateStr: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
         timestamp: d.getTime(),
         refNo: x.id,
         type: 'MATERIAL',
         description: `Material Issue: ${x.itemName || 'Agricultural Inputs'}`,
         weightOrQty: `${x.quantity || 1} ${x.unit || 'Qty'}`,
         debitVal: amt,
         creditVal: 0,
         notes: x.notes,
         raw: x
      });
    });
    
    const typeOrder: any = { 'MATERIAL': 1, 'PURCHASE': 2, 'PAYMENT': 3 };
    allItems.sort((a, b) => {
      if (a.timestamp !== b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      return typeOrder[a.type] - typeOrder[b.type];
    });
    
    let bal = 0;
    const computed = allItems.map(item => {
       bal = bal + item.creditVal - item.debitVal;
       return {
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
    setLedger(computed.reverse());
  };

  const handleLogout = () => {
    localStorage.removeItem('active_tenant');
    router.push('/login');
  };

  if (loading || !farmer) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center animate-pulse">
          <Sprout className="w-10 h-10 text-emerald-600 mx-auto mb-2 animate-bounce" />
          <p className="font-bold text-slate-700">Loading Farmer Portal...</p>
        </div>
      </div>
    );
  }

  const statementData: StatementData = {
    farmerId: farmer.id || 'FAR-10001',
    farmerName: farmer.name || 'Farmer',
    phone: farmer.phone || '',
    village: farmer.village || 'Nandgaon',
    aadhaar: farmer.aadhaar || 'XXXX-XXXX-8910',
    bankAccount: farmer.bankAccount || '990011223344',
    ifsc: farmer.ifsc || 'MAHB0001234',
    totalPurchases: `₹${totals.purchase.toLocaleString('en-IN')}`,
    totalPaid: `₹${totals.paid.toLocaleString('en-IN')}`,
    advanceGiven: `₹${totals.material.toLocaleString('en-IN')}`,
    netBalance: `₹${totals.outstanding.toLocaleString('en-IN')}`,
    transactions: ledger,
  };

  const purchasesList = rawPurchases;
  const paymentsList = rawPayments;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-16">
      
      {/* Top Header Card */}
      <div className="bg-emerald-950 text-white border-b border-emerald-900 shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                {farmer.name?.charAt(0) || 'F'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-black">{farmer.name}</h1>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-800 text-emerald-200 border border-emerald-700">
                    {farmer.id}
                  </span>
                </div>
                <p className="text-xs text-emerald-300 font-semibold mt-0.5 flex flex-wrap items-center gap-2">
                  <span>📍 {farmer.village || 'Nandgaon'}</span>
                  <span>•</span>
                  <span>📞 {farmer.phone}</span>
                  <span>•</span>
                  <span className="text-emerald-400">Agency: {tenant?.businessName || tenant?.companyName || 'Agro Agency'}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Statement PDF</span>
              </button>
              <button 
                onClick={handleLogout} 
                className="p-2.5 bg-emerald-900/80 hover:bg-rose-900/80 text-emerald-200 hover:text-white rounded-xl transition-colors cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 -mt-2 space-y-4">

        {/* Modular Financial KPI Cards */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-700">Timeline Filter:</span>
              <select 
                value={dateFilter}
                onChange={(e: any) => setDateFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold px-2 py-1 text-slate-700 outline-none focus:border-emerald-500"
              >
                <option value="ALL_TIME">All Time (सर्व नोंदी)</option>
                <option value="THIS_MONTH">This Month (या महिन्यात)</option>
                <option value="LAST_MONTH">Last Month (मागील महिन्यात)</option>
                <option value="CUSTOM">Custom Range (तारीख निवडा)</option>
              </select>

              {dateFilter === 'CUSTOM' && (
                <div className="flex items-center gap-1">
                  <input 
                    type="date" 
                    value={customRange.start}
                    onChange={(e) => setCustomRange(prev => ({...prev, start: e.target.value}))}
                    className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold px-2 py-1 text-slate-700 outline-none"
                  />
                  <span className="text-slate-400">-</span>
                  <input 
                    type="date" 
                    value={customRange.end}
                    onChange={(e) => setCustomRange(prev => ({...prev, end: e.target.value}))}
                    className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold px-2 py-1 text-slate-700 outline-none"
                  />
                </div>
              )}
            </div>

            <button
              onClick={() => setSplitKPI(!splitKPI)}
              className="text-[11px] px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-100 font-bold transition-colors cursor-pointer"
            >
              {splitKPI ? 'Combine Deductions' : 'Split Deductions'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3">
              <span className="text-[10px] font-semibold text-slate-400 uppercase block">Total Purchases</span>
              <span className="text-sm font-black text-slate-900 mt-0.5 block">₹{totals.purchase.toLocaleString('en-IN')}</span>
            </div>

            {!splitKPI ? (
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 col-span-1 sm:col-span-2">
                <span className="text-[10px] font-semibold text-slate-400 uppercase block">Total Deductions (Paid + Material)</span>
                <span className="text-sm font-black text-emerald-600 mt-0.5 block">₹{(totals.paid + totals.material).toLocaleString('en-IN')}</span>
              </div>
            ) : (
              <>
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase block">Total Paid Out</span>
                  <span className="text-sm font-black text-emerald-600 mt-0.5 block">₹{totals.paid.toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3">
                  <span className="text-[10px] font-semibold text-blue-600 uppercase block">Materials Given</span>
                  <span className="text-sm font-black text-blue-700 mt-0.5 block">₹{totals.material.toLocaleString('en-IN')}</span>
                </div>
              </>
            )}

            <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3">
              <span className="text-[10px] font-semibold text-rose-500 uppercase block">Net Outstanding</span>
              <span className="text-sm font-black text-rose-600 mt-0.5 block">₹{totals.outstanding.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* 4 Tabs Navigation */}
        <div className="flex bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('PROFILE')}
            className={`flex-1 min-w-[130px] py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'PROFILE' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>प्रोफाईल (Profile)</span>
          </button>

          <button
            onClick={() => setActiveTab('PURCHASES')}
            className={`flex-1 min-w-[130px] py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'PURCHASES' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <ArrowUpCircle className="w-3.5 h-3.5" />
            <span>खरेदी आवक (Purchases)</span>
          </button>

          <button
            onClick={() => setActiveTab('PAYMENTS')}
            className={`flex-1 min-w-[130px] py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'PAYMENTS' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
            <span>पेमेंट व उचल (Payments)</span>
          </button>

          <button
            onClick={() => setActiveTab('LEDGER')}
            className={`flex-1 min-w-[130px] py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'LEDGER' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>खातेवही (Ledger)</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="space-y-4">
          
          {/* TAB 1: PROFILE & CROPS */}
          {activeTab === 'PROFILE' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-emerald-600" /> Personal & Contact Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
                    <span className="font-bold text-slate-800">{farmer.village || 'Nandgaon'}, Nashik</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Aadhaar Identification:</span>
                    <span className="font-bold text-slate-800">{farmer.aadhaar || 'XXXX-XXXX-8910'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-blue-600" /> Bank Disbursal Account Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 font-semibold block">Primary Crop Variety:</span>
                    <span className="font-bold text-slate-900">{farmer.cropVariety || 'Sweet Charlie Strawberry (A Grade)'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Farm Land Acreage:</span>
                    <span className="font-bold text-slate-800">{farmer.acreage || '4.5 Acres (Nandgaon Cluster)'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PURCHASES HISTORY */}
          {activeTab === 'PURCHASES' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3 text-xs">
              <h3 className="font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5 text-emerald-600" />
                खरेदी आवक इतिहास (Recent Procurement Deliveries)
              </h3>
              <div className="space-y-2">
                {purchasesList.length === 0 && <p className="text-slate-400 py-6 text-center">No purchases recorded.</p>}
                {purchasesList.map((p: any) => (
                  <div key={p.id} className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-emerald-700">{p.billNo || p.id}</span>
                      <p className="font-extrabold text-slate-900">{p.crop || 'Strawberry'}</p>
                      <p className="text-[10px] text-slate-400">{p.date || p.purchaseDate} • {p.weight || p.netWeight} kg @ ₹{p.rate}</p>
                    </div>
                    <span className="text-sm font-black text-slate-900">
                      ₹{Number(String(p.netAmount || p.totalAmount || p.amount || 0).replace(/[^0-9.-]+/g, '')).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PAYMENTS & ADVANCES */}
          {activeTab === 'PAYMENTS' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3 text-xs">
              <h3 className="font-black text-slate-800 border-b border-slate-100 pb-3 flex items-center gap-2">
                <ArrowDownCircle className="w-5 h-5 text-rose-600" />
                पेमेंट व उचल इतिहास (Payment Disbursals & Advance Given)
              </h3>
              <div className="space-y-2">
                {paymentsList.length === 0 && <p className="text-slate-400 py-6 text-center">No payment records found.</p>}
                {paymentsList.map((pay: any) => (
                  <div key={pay.id} className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-600">{pay.paymentNo || pay.id}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black ${
                          (pay.paymentType || pay.method || '').toLowerCase().includes('advance') ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {pay.paymentType || pay.paymentMode || 'PAYMENT'}
                        </span>
                      </div>
                      <p className="font-bold text-slate-800">{pay.notes || pay.paymentMode || 'Cash Payout'}</p>
                      <p className="text-[10px] text-slate-400">{pay.date || pay.paymentDate || new Date(pay.createdAt || Date.now()).toLocaleDateString('en-IN')}</p>
                    </div>
                    <span className="text-sm font-black text-emerald-600">
                      ₹{Number(String(pay.amount || 0).replace(/[^0-9.-]+/g, '')).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: INTERACTIVE LEDGER STATEMENT */}
          {activeTab === 'LEDGER' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 min-h-[400px]">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                <h3 className="font-black text-slate-800 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-600" />
                  खातेवही स्टेटमेंट (Running Account Ledger)
                </h3>
                <button
                  onClick={() => setIsPrintModalOpen(true)}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print PDF</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs min-w-[600px]">
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
                    {ledger.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">No transactions recorded yet.</td>
                      </tr>
                    ) : (
                      ledger.map((tx, idx) => (
                        <React.Fragment key={idx}>
                          <tr 
                            onClick={() => setExpandedRowId(expandedRowId === tx.refNo ? null : tx.refNo)}
                            className={`hover:bg-slate-50 font-medium cursor-pointer transition-colors ${expandedRowId === tx.refNo ? 'bg-slate-50' : ''}`}
                          >
                            <td className="py-2.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                               <div className="flex items-center gap-1">
                                 {expandedRowId === tx.refNo ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                                 {tx.date}
                               </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-800">
                              <span className="font-bold">{tx.description}</span>
                              <span className="text-[10px] text-slate-400 block">{tx.refNo}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-700">{tx.debit}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{tx.credit}</td>
                            <td className="py-2.5 px-3 text-right font-black text-slate-900">{tx.balance}</td>
                          </tr>
                          {expandedRowId === tx.refNo && (
                            <tr className="bg-slate-50/50">
                              <td colSpan={5} className="py-3 px-4 border-b border-slate-100">
                                <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm text-xs cursor-default">
                                  {tx.type === 'PURCHASE' && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                      <div><span className="text-slate-400 block mb-1">Crop / Grade</span><span className="font-bold">{tx.raw.crop} {tx.raw.grade ? `(${tx.raw.grade})` : ''}</span></div>
                                      <div><span className="text-slate-400 block mb-1">Weight</span><span className="font-bold">{tx.raw.weight || tx.raw.netWeight} kg</span></div>
                                      <div><span className="text-slate-400 block mb-1">Rate / kg</span><span className="font-bold">₹{tx.raw.rate}</span></div>
                                      <div><span className="text-slate-400 block mb-1">Deductions</span><span className="font-bold text-rose-500">{tx.raw.deductions || 'None'}</span></div>
                                    </div>
                                  )}
                                  {tx.type === 'PAYMENT' && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                      <div><span className="text-slate-400 block mb-1">Payment Mode</span><span className="font-bold">{tx.raw.paymentMode || tx.raw.method || tx.raw.paymentMethod || 'Cash'}</span></div>
                                      <div><span className="text-slate-400 block mb-1">Reference</span><span className="font-bold">{tx.raw.paymentNo || tx.raw.reference || tx.raw.transactionId || 'N/A'}</span></div>
                                      <div><span className="text-slate-400 block mb-1">Notes</span><span className="font-bold">{tx.raw.notes || 'None'}</span></div>
                                    </div>
                                  )}
                                  {tx.type === 'MATERIAL' && (
                                    <div className="space-y-2">
                                      <div className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-2">Itemized Materials</div>
                                      <div className="flex justify-between items-center">
                                         <span className="text-slate-600">{tx.raw.itemName || 'Material Item'}</span>
                                         <span className="font-bold">{tx.raw.quantity} {tx.raw.unit || 'Qty'}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Print Statement Modal */}
      {isPrintModalOpen && (
        <PrintStatementModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          data={statementData}
        />
      )}

      {/* Footer */}
      <div className="text-center p-8">
        <p className="text-xs font-semibold text-slate-400">
          Powered by Seavaig Agro Billing Software
        </p>
      </div>

    </div>
  );
}
