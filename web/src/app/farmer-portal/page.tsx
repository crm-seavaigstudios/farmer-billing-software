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
  X,
  Building2,
  Receipt,
  CheckCircle,
  Clock,
  Eye
} from 'lucide-react';
import { PrintStatementModal, StatementData } from '@/components/common/PrintStatementModal';

export default function FarmerPortalPage() {
  const router = useRouter();
  const [farmer, setFarmer] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [linkedTenants, setLinkedTenants] = useState<any[]>([]);
  
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
  const [selectedPurchaseForReceipt, setSelectedPurchaseForReceipt] = useState<any | null>(null);

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
    
    const userPhone = auth.phone || '';

    // 1. Fetch all Farmer records matching this phone number across all agencies
    const { data: allFarmerRecords } = await supabase.from('Farmer').select('*').eq('phone', userPhone);
    
    if (!allFarmerRecords || allFarmerRecords.length === 0) {
      // Fallback to auth.id if phone is empty
      const { data: fById } = await supabase.from('Farmer').select('*').eq('id', auth.id).single();
      if (fById) {
        setFarmer(fById);
        const { data: tData } = await supabase.from('Tenant').select('*').eq('id', fById.tenantId).single();
        setTenant(tData);
        setLinkedTenants(tData ? [tData] : []);
        await fetchData(fById.id, fById.tenantId, fById.name, userPhone);
        return;
      }
      return router.push('/login');
    }

    // 2. Collect unique tenant IDs
    const tenantIds = Array.from(new Set(allFarmerRecords.map((f: any) => f.tenantId).filter(Boolean)));
    let tenantsList: any[] = [];
    if (tenantIds.length > 0) {
      const { data: tData } = await supabase.from('Tenant').select('*').in('id', tenantIds);
      tenantsList = tData || [];
    }

    setLinkedTenants(tenantsList);

    // 3. Determine active tenant: stored in auth.tenantId, or matching current farmer
    let activeTenant = tenantsList.find((t: any) => t.id === auth.tenantId) || tenantsList[0] || { id: allFarmerRecords[0].tenantId };
    setTenant(activeTenant);

    // 4. Find matching farmer record under active tenant
    let currentFarmer = allFarmerRecords.find((f: any) => f.tenantId === activeTenant.id) || allFarmerRecords[0];
    setFarmer(currentFarmer);

    await fetchData(currentFarmer.id, activeTenant.id, currentFarmer.name, userPhone);
  };

  const handleSwitchTenant = async (newTenant: any) => {
    if (!newTenant) return;
    setTenant(newTenant);
    
    const raw = localStorage.getItem('active_tenant');
    if (raw) {
      const auth = JSON.parse(raw);
      auth.tenantId = newTenant.id;
      auth.tenantName = newTenant.companyName || newTenant.name;
      localStorage.setItem('active_tenant', JSON.stringify(auth));
    }

    // Find farmer under new tenant
    const { data: allFarmerRecords } = await supabase.from('Farmer').select('*').eq('phone', farmer?.phone);
    const matched = allFarmerRecords?.find((f: any) => f.tenantId === newTenant.id) || allFarmerRecords?.[0] || farmer;
    setFarmer(matched);

    await fetchData(matched.id, newTenant.id, matched.name, farmer?.phone);
  };

  const fetchData = async (farmerId: string, tenantId: string, farmerName: string, phone?: string) => {
    setLoading(true);
    try {
      // 1. Fetch Purchases strictly for this farmer under this tenant
      let pQuery = supabase.from('Purchase').select('*').eq('tenantId', tenantId);
      if (farmerId && phone) {
        pQuery = pQuery.or(`farmerId.eq.${farmerId},farmerId.eq.${phone}`);
      } else if (farmerId) {
        pQuery = pQuery.eq('farmerId', farmerId);
      }
      const { data: pData } = await pQuery.order('createdAt', { ascending: false });

      // 2. Fetch associated PurchaseItems for detailed crop/grade breakdowns
      const purchaseIds = (pData || []).map((p: any) => p.id).filter(Boolean);
      const purchaseNos = (pData || []).map((p: any) => p.purchaseNo).filter(Boolean);
      const allSearchIds = Array.from(new Set([...purchaseIds, ...purchaseNos]));

      let itemsMap: Record<string, any[]> = {};
      if (allSearchIds.length > 0) {
        const { data: itemsData } = await supabase
          .from('PurchaseItem')
          .select('*')
          .in('purchaseId', allSearchIds);
        if (itemsData) {
          itemsData.forEach((it: any) => {
            if (!itemsMap[it.purchaseId]) itemsMap[it.purchaseId] = [];
            itemsMap[it.purchaseId].push(it);
          });
        }
      }

      const enhancedPurchases = (pData || []).map((p: any) => {
        const pItems = itemsMap[p.id] || itemsMap[p.purchaseNo] || [];
        const firstItem = pItems[0];
        const crop = firstItem?.cropName || p.crop || 'Strawberry (A Grade)';
        const weight = firstItem ? `${firstItem.weightKg} ${firstItem.unit || 'KG'}` : (p.totalWeight ? `${p.totalWeight} KG` : (p.weight || '-'));
        const rate = firstItem ? `₹${firstItem.ratePerKg}/${firstItem.unit || 'KG'}` : (p.rate || '-');
        const amount = Number(p.totalAmount ?? p.amount ?? 0);
        const paid = Number(p.paidAmount ?? 0);
        const due = Number(p.dueAmount ?? (amount - paid));
        return {
          ...p,
          crop,
          weight,
          rate,
          amount,
          netAmount: amount,
          paidAmount: paid,
          dueAmount: due,
          paymentStatus: p.paymentStatus || (due <= 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID'),
          grade: firstItem?.grade || p.grade,
          items: pItems
        };
      });

      // 3. Fetch Payments strictly for this farmer under this tenant
      let payQuery = supabase.from('Payment').select('*').eq('tenantId', tenantId);
      if (farmerId && phone) {
        payQuery = payQuery.or(`farmerId.eq.${farmerId},farmerId.eq.${phone}`);
      } else if (farmerId) {
        payQuery = payQuery.eq('farmerId', farmerId);
      }
      const { data: payData } = await payQuery.order('createdAt', { ascending: false });

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

  const purchasesList = rawPurchases.filter((p: any) => isDateInRange(parseCustomDate(p.date || p.purchaseDate || p.createdAt)));
  const paymentsList = rawPayments.filter((pay: any) => isDateInRange(parseCustomDate(pay.date || pay.paymentDate || pay.createdAt)));

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
                    {farmer.farmerIdCode || farmer.id}
                  </span>
                </div>
                <div className="text-xs text-emerald-300 font-semibold mt-1 flex flex-wrap items-center gap-2">
                  <span>📍 {farmer.village || 'Nandgaon'}</span>
                  <span>•</span>
                  <span>📞 {farmer.phone}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1.5 bg-emerald-900/90 px-2 py-0.5 rounded-lg border border-emerald-700">
                    <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-200 font-bold">
                      {tenant?.companyName || tenant?.businessNameMr || 'Agro Agency'}
                    </span>
                    {linkedTenants.length > 1 && (
                      <select
                        value={tenant?.id}
                        onChange={(e) => {
                          const t = linkedTenants.find(x => x.id === e.target.value);
                          if (t) handleSwitchTenant(t);
                        }}
                        className="bg-emerald-800 text-emerald-100 text-[10px] font-bold rounded px-1.5 py-0.5 border border-emerald-600 outline-none cursor-pointer hover:bg-emerald-700"
                        title="Switch between registered agencies"
                      >
                        {linkedTenants.map(t => (
                          <option key={t.id} value={t.id}>
                            🔄 Switch: {t.companyName || t.name} ({t.companyCode || 'AGRO'})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
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
                    <span className="font-extrabold text-slate-900">{farmer.name || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Mobile Phone:</span>
                    <span className="font-bold text-slate-800">{farmer.phone || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Village & District:</span>
                    <span className="font-bold text-slate-800">
                      {[farmer.village, farmer.taluka, farmer.district].filter(Boolean).join(', ') || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Aadhaar Identification:</span>
                    <span className="font-bold text-slate-800">{farmer.aadhaarNumber || farmer.aadhaar || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-blue-600" /> Bank Disbursal Account Details
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 font-semibold block">Bank Name:</span>
                    <span className="font-bold text-slate-800">{farmer.bankName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Account Number:</span>
                    <span className="font-extrabold text-slate-900">{farmer.accountNumber || farmer.bankAccount || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">IFSC Code:</span>
                    <span className="font-bold text-slate-800">{farmer.ifscCode || farmer.ifsc || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sprout className="w-4 h-4 text-purple-600" /> Crop Category & Quality Grade
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-400 font-semibold block">Assigned Quality Grade:</span>
                    <span className="font-bold text-slate-900">{farmer.grade || 'A_GRADE'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-semibold block">Primary Crops / Land Area:</span>
                    <span className="font-bold text-slate-800">{farmer.cropVariety || farmer.crop || farmer.acreage || '—'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PURCHASES HISTORY */}
          {activeTab === 'PURCHASES' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                    <ArrowUpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-sm">
                      खरेदी आवक इतिहास (Crop Procurement Bills)
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">सर्व मालाची खरेदी व पावत्यांची यादी</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">एकूण खरेदी</span>
                  <span className="text-base font-black text-emerald-700">₹{totals.purchase.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {purchasesList.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
                  <Sprout className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-extrabold text-slate-700">कोणत्याही खरेदीची नोंद आढळली नाही</p>
                  <p className="text-xs text-slate-400 mt-1">No procurement bills found for this account.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {purchasesList.map((p: any) => {
                    const billAmt = Number(String(p.netAmount || p.totalAmount || p.amount || 0).replace(/[^0-9.-]+/g, '')) || 0;
                    const paidAmt = Number(String(p.paidAmount || 0).replace(/[^0-9.-]+/g, '')) || 0;
                    const dueAmt = Number(String(p.dueAmount || (billAmt - paidAmt)).replace(/[^0-9.-]+/g, '')) || 0;
                    const isFullyPaid = dueAmt <= 0;
                    const isPartial = paidAmt > 0 && dueAmt > 0;

                    return (
                      <div key={p.id || p.billNo} className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm hover:border-emerald-300 transition-all space-y-3">
                        {/* Header of Bill Card */}
                        <div className="flex flex-wrap justify-between items-start gap-2 border-b border-slate-100 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-black text-xs border border-emerald-200/60">
                                {p.billNo || p.purchaseNo || p.id}
                              </span>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                isFullyPaid ? 'bg-emerald-100 text-emerald-800' : isPartial ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {isFullyPaid ? 'Paid' : isPartial ? 'Partial' : 'Pending'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-semibold mt-1 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {p.date || p.purchaseDate || new Date(p.createdAt || Date.now()).toLocaleDateString('en-IN')}
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">बिल रक्कम</span>
                            <span className="text-lg font-black text-slate-900">₹{billAmt.toLocaleString('en-IN')}</span>
                          </div>
                        </div>

                        {/* Itemized Crops Breakdown */}
                        {p.items && p.items.length > 0 ? (
                          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 divide-y divide-slate-200/60">
                            {p.items.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center py-1.5 first:pt-0 last:pb-0 text-xs">
                                <div>
                                  <span className="font-extrabold text-slate-800">{item.cropName || item.crop || p.crop || 'Strawberry'}</span>
                                  {item.grade && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-white text-[10px] font-bold text-slate-600 border border-slate-200">{item.grade}</span>}
                                  <p className="text-[11px] text-slate-500 font-semibold">{item.weightKg || item.weight} {item.unit || 'KG'} × ₹{item.ratePerKg || item.rate}</p>
                                </div>
                                <span className="font-black text-slate-900">₹{Number(item.totalAmount || item.amount || ((item.weightKg || 0) * (item.ratePerKg || 0))).toLocaleString('en-IN')}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 flex justify-between items-center text-xs">
                            <div>
                              <span className="font-extrabold text-slate-800">{p.crop || 'Strawberry'}</span>
                              {p.grade && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-white text-[10px] font-bold text-slate-600 border border-slate-200">{p.grade}</span>}
                              <p className="text-[11px] text-slate-500 font-semibold">{p.weight || p.netWeight || '-'} • दर: {p.rate || '-'}</p>
                            </div>
                            <span className="font-black text-slate-900">₹{billAmt.toLocaleString('en-IN')}</span>
                          </div>
                        )}

                        {/* Financial Sub-Details & Action Button */}
                        <div className="flex flex-wrap justify-between items-center gap-2 pt-1">
                          <div className="flex items-center gap-4 text-xs font-bold">
                            <span className="text-emerald-700">जमा: ₹{paidAmt.toLocaleString('en-IN')}</span>
                            <span className={dueAmt > 0 ? 'text-rose-600 font-black' : 'text-slate-400'}>
                              बाकी: ₹{dueAmt.toLocaleString('en-IN')}
                            </span>
                          </div>

                          <button
                            onClick={() => setSelectedPurchaseForReceipt(p)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>पावती पहा / View Bill</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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

      {/* Itemized Purchase Bill Receipt Modal */}
      {selectedPurchaseForReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-emerald-900 text-white p-5 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-700/80 flex items-center justify-center text-emerald-100">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">खरेदी पावती (Purchase Bill)</h3>
                  <p className="text-xs text-emerald-200">{tenant?.companyName || tenant?.name || 'Agro Agency'} • {tenant?.phone || ''}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPurchaseForReceipt(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content / Printable Area */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs font-sans">
              {/* Meta info box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">पावती क्र. / Bill No</span>
                  <span className="font-black text-slate-800 text-sm">{selectedPurchaseForReceipt.billNo || selectedPurchaseForReceipt.purchaseNo || selectedPurchaseForReceipt.id}</span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">तारीख / Date</span>
                  <span className="font-bold text-slate-800">
                    {selectedPurchaseForReceipt.date || selectedPurchaseForReceipt.purchaseDate || new Date(selectedPurchaseForReceipt.createdAt || Date.now()).toLocaleDateString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">शेतकरी / Farmer</span>
                  <span className="font-black text-slate-900">{farmer.name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">मोबाईल / Phone</span>
                  <span className="font-bold text-slate-800">{farmer.phone || '—'}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">पिक / Crop & Grade</th>
                      <th className="py-2.5 px-3 text-right">वजन / Weight</th>
                      <th className="py-2.5 px-3 text-right">दर / Rate</th>
                      <th className="py-2.5 px-3 text-right">रक्कम / Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedPurchaseForReceipt.items && selectedPurchaseForReceipt.items.length > 0 ? (
                      selectedPurchaseForReceipt.items.map((it: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-extrabold text-slate-800">
                            {it.cropName || it.crop || selectedPurchaseForReceipt.crop || 'Strawberry'}
                            {it.grade && <span className="ml-1 text-[10px] text-slate-400 font-bold">({it.grade})</span>}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-700">{it.weightKg || it.weight} {it.unit || 'KG'}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-700">₹{it.ratePerKg || it.rate}</td>
                          <td className="py-2.5 px-3 text-right font-black text-slate-900">
                            ₹{Number(it.totalAmount || it.amount || ((it.weightKg || 0) * (it.ratePerKg || 0))).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="py-2.5 px-3 font-extrabold text-slate-800">
                          {selectedPurchaseForReceipt.crop || 'Strawberry'}
                          {selectedPurchaseForReceipt.grade && <span className="ml-1 text-[10px] text-slate-400 font-bold">({selectedPurchaseForReceipt.grade})</span>}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-700">{selectedPurchaseForReceipt.weight || selectedPurchaseForReceipt.netWeight || '-'}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-700">₹{selectedPurchaseForReceipt.rate || '-'}</td>
                        <td className="py-2.5 px-3 text-right font-black text-slate-900">
                          ₹{Number(String(selectedPurchaseForReceipt.netAmount || selectedPurchaseForReceipt.totalAmount || selectedPurchaseForReceipt.amount || 0).replace(/[^0-9.-]+/g, '')).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals Breakdown */}
              <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                  <span>एकूण रक्कम (Gross Total):</span>
                  <span>₹{Number(String(selectedPurchaseForReceipt.netAmount || selectedPurchaseForReceipt.totalAmount || selectedPurchaseForReceipt.amount || 0).replace(/[^0-9.-]+/g, '')).toLocaleString('en-IN')}</span>
                </div>
                {selectedPurchaseForReceipt.deductions && (
                  <div className="flex justify-between items-center text-xs font-bold text-rose-600">
                    <span>कपात (Deductions):</span>
                    <span>-₹{Number(String(selectedPurchaseForReceipt.deductions).replace(/[^0-9.-]+/g, '')).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs font-bold text-emerald-700">
                  <span>जमा रक्कम (Paid Amount):</span>
                  <span>₹{Number(String(selectedPurchaseForReceipt.paidAmount || 0).replace(/[^0-9.-]+/g, '')).toLocaleString('en-IN')}</span>
                </div>
                <div className="border-t border-emerald-200 pt-2 flex justify-between items-center text-sm font-black text-emerald-950">
                  <span>शिल्लक बाकी (Balance Due):</span>
                  <span>₹{Number(String(selectedPurchaseForReceipt.dueAmount || 0).replace(/[^0-9.-]+/g, '')).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end gap-2">
              <button
                onClick={() => setSelectedPurchaseForReceipt(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
              >
                बंद करा / Close
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>प्रिंट पावती / Print Receipt</span>
              </button>
            </div>
          </div>
        </div>
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
