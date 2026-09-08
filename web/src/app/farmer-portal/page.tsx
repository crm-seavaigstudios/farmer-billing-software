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
  Eye,
  TrendingUp
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
  const [fifoMap, setFifoMap] = useState<Record<string, { allocatedPaid: number; allocatedDue: number; status: 'PAID' | 'PARTIAL' | 'UNPAID' }>>({});
  
  const [ledger, setLedger] = useState<any[]>([]);
  const [lifetimeTotals, setLifetimeTotals] = useState({ purchase: 0, paid: 0, material: 0, outstanding: 0 });
  const [activeTotals, setActiveTotals] = useState({ purchase: 0, paid: 0, material: 0, outstanding: 0 });
  const [kpiViewMode, setKpiViewMode] = useState<'ACTIVE' | 'LIFETIME'>('ACTIVE');
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'PURCHASES' | 'PAYMENTS' | 'MATERIALS' | 'PROFILE'>('LEDGER');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [selectedPurchaseForReceipt, setSelectedPurchaseForReceipt] = useState<any | null>(null);

  const [dateFilter, setDateFilter] = useState<'ALL_TIME' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'>('ALL_TIME');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  useEffect(() => {
    loadFarmerProfile();

    const handleUpdate = () => {
      loadFarmerProfile();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('purchases_changed', handleUpdate);
      window.addEventListener('payments_changed', handleUpdate);
      window.addEventListener('farmer_materials_changed', handleUpdate);
      window.addEventListener('farmers_changed', handleUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('purchases_changed', handleUpdate);
        window.removeEventListener('payments_changed', handleUpdate);
        window.removeEventListener('farmer_materials_changed', handleUpdate);
        window.removeEventListener('farmers_changed', handleUpdate);
      }
    };
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
    let orderIdx = 0;

    const getPreciseTimestamp = (x: any) => {
      // 1. Check createdAt (Full ISO timestamp)
      if (x.createdAt) {
        const t = new Date(x.createdAt).getTime();
        if (!isNaN(t) && t > 1000000000000) return t;
      }
      // 2. Extract numeric millisecond timestamp from ID (e.g. pur-1788795032219, pay-1788797876152)
      const idStr = String(x.rawId || x.dbId || x.id || x._id || '');
      const idMatch = idStr.match(/(1[6-9]\d{11})/);
      if (idMatch) {
        const t = parseInt(idMatch[1], 10);
        if (!isNaN(t) && t > 1000000000000) return t;
      }
      // 3. Check date / purchaseDate / paymentDate
      const rawDate = x.date || x.purchaseDate || x.paymentDate;
      if (rawDate) {
        if (typeof rawDate === 'string') {
          if (rawDate.includes('/') || (rawDate.includes('-') && rawDate.split('-')[0].length <= 2)) {
            const separator = rawDate.includes('/') ? '/' : '-';
            const parts = rawDate.split(separator);
            if (parts.length === 3) {
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1;
              const year = parseInt(parts[2].length === 2 ? `20${parts[2]}` : parts[2], 10);
              const d = new Date(year, month, day);
              if (!isNaN(d.getTime())) return d.getTime();
            }
          }
        }
        const t = new Date(rawDate).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      return 0;
    };

    rawPurchases.forEach((x: any) => {
      const d = parseCustomDate(x.date || x.purchaseDate || x.createdAt);
      if(!isDateInRange(d)) return;
      const amt = typeof x.amount === 'number' ? x.amount : parseFloat(String(x.netAmount || x.totalAmount || x.amount || '0').replace(/[^0-9.-]+/g, '')) || 0;
      totalPurchase += amt;
      allItems.push({
         dateStr: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
         timestamp: getPreciseTimestamp(x) || d.getTime(),
         orderIdx: ++orderIdx,
         refNo: x.billNo || x.purchaseNo || x.id,
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
         timestamp: getPreciseTimestamp(x) || d.getTime(),
         orderIdx: ++orderIdx,
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
      const d = parseCustomDate(x.date || x.createdAt);
      if(!isDateInRange(d)) return;
      const qty = Number(x.quantity || 1);
      const price = Number(x.unitPrice || 0);
      const calcVal = qty * price;
      const rawAmt = x.totalAmount ?? x.totalPrice ?? x.amount ?? calcVal ?? 0;
      const parsedAmt = typeof rawAmt === 'number' ? rawAmt : (parseFloat(String(rawAmt).replace(/[^0-9.-]+/g, '')) || 0);
      const amt = parsedAmt > 0 ? parsedAmt : calcVal;
      totalMaterial += amt;
      allItems.push({
         dateStr: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
         timestamp: getPreciseTimestamp(x) || d.getTime(),
         orderIdx: ++orderIdx,
         refNo: x.id,
         type: 'MATERIAL',
         description: `Material Issue: ${x.itemName || 'Agricultural Inputs'}`,
         weightOrQty: `${qty} ${x.unit || 'Qty'} @ ₹${price}`,
         debitVal: amt,
         creditVal: 0,
         notes: x.notes,
         raw: { ...x, quantity: qty, unitPrice: price, totalAmount: amt, totalPrice: amt }
      });
    });
    
    // Exact Time-Sequence Chronological Sorting
    allItems.sort((a, b) => {
      if (a.timestamp !== b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      return (a.orderIdx || 0) - (b.orderIdx || 0);
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
    
    const netOutstanding = totalPurchase - (totalPaid + totalMaterial);

    setLifetimeTotals({ 
      purchase: totalPurchase, 
      paid: totalPaid, 
      material: totalMaterial,
      outstanding: netOutstanding
    });

    // FIFO Bill Settlement: Allocate total debits (Cash + Materials) across bills from oldest to newest
    const sortedPurchasesOldest = [...rawPurchases].sort((a, b) => getPreciseTimestamp(a) - getPreciseTimestamp(b));
    let remainingSettlementPool = totalPaid + totalMaterial;
    const calculatedFifoMap: Record<string, { allocatedPaid: number; allocatedDue: number; status: 'PAID' | 'PARTIAL' | 'UNPAID' }> = {};
    let activePurchasesSum = 0;
    let activePaidSum = 0;
    let activeUnpaidCount = 0;

    sortedPurchasesOldest.forEach((p) => {
      const pId = p.billNo || p.purchaseNo || p.id;
      const amt = typeof p.amount === 'number' ? p.amount : parseFloat(String(p.netAmount || p.totalAmount || p.amount || '0').replace(/[^0-9.-]+/g, '')) || 0;
      const allocatedPaid = Math.min(amt, Math.max(0, remainingSettlementPool));
      remainingSettlementPool = Math.max(0, remainingSettlementPool - allocatedPaid);
      const allocatedDue = Math.max(0, amt - allocatedPaid);
      const status: 'PAID' | 'PARTIAL' | 'UNPAID' = allocatedDue <= 0 ? 'PAID' : (allocatedPaid > 0 ? 'PARTIAL' : 'UNPAID');

      calculatedFifoMap[pId] = { allocatedPaid, allocatedDue, status };
      if (p.id) calculatedFifoMap[p.id] = { allocatedPaid, allocatedDue, status };
      if (p.purchaseNo) calculatedFifoMap[p.purchaseNo] = { allocatedPaid, allocatedDue, status };
      if (p.billNo) calculatedFifoMap[p.billNo] = { allocatedPaid, allocatedDue, status };

      if (status !== 'PAID') {
        activePurchasesSum += amt;
        activePaidSum += allocatedPaid;
        activeUnpaidCount++;
      }
    });

    setFifoMap(calculatedFifoMap);

    if (netOutstanding <= 0) {
      setActiveTotals({
        purchase: 0,
        paid: 0,
        material: 0,
        outstanding: netOutstanding
      });
    } else {
      setActiveTotals({
        purchase: activePurchasesSum > 0 ? activePurchasesSum : totalPurchase,
        paid: activePaidSum,
        material: totalMaterial,
        outstanding: netOutstanding
      });
    }

    // Latest-First Passbook Ledger: Latest entries appear at top (Row 1) without scrolling
    const reversedLedger = [...computed].reverse().map((item, idx) => ({
      ...item,
      displaySrNo: idx + 1,
    }));
    setLedger(reversedLedger);
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

  const totals = kpiViewMode === 'ACTIVE' ? activeTotals : lifetimeTotals;

  const statementData: StatementData = {
    farmerId: farmer.id || 'FAR-10001',
    farmerName: farmer.name || 'Farmer',
    phone: farmer.phone || '',
    village: farmer.village || 'Nandgaon',
    aadhaar: farmer.aadhaar || 'XXXX-XXXX-8910',
    bankAccount: farmer.bankAccount || '990011223344',
    ifsc: farmer.ifsc || 'MAHB0001234',
    totalPurchases: `₹${lifetimeTotals.purchase.toLocaleString('en-IN')}`,
    totalPaid: `₹${lifetimeTotals.paid.toLocaleString('en-IN')}`,
    advanceGiven: `₹${lifetimeTotals.material.toLocaleString('en-IN')}`,
    netBalance: `₹${lifetimeTotals.outstanding.toLocaleString('en-IN')}`,
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

        {/* Modular Financial KPI Cards & Active/Lifetime Toggle */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3">
          {/* Mode Switcher Banner */}
          <div className="flex flex-wrap justify-between items-center gap-2 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${kpiViewMode === 'ACTIVE' ? 'bg-amber-500' : 'bg-emerald-600'}`}></span>
              <span className="text-xs font-extrabold text-slate-800">
                {kpiViewMode === 'ACTIVE' 
                  ? '📊 चालू बाकी हिशोब (Active Bills Summary)' 
                  : '📜 एकूण जीवनकाळ हिशोब (Lifetime Ledger History)'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setKpiViewMode(kpiViewMode === 'ACTIVE' ? 'LIFETIME' : 'ACTIVE')}
                className="px-3 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-extrabold text-xs rounded-lg border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                {kpiViewMode === 'ACTIVE' ? (
                  <>
                    <span>📜</span>
                    <span>एकूण जीवनकाळ हिशोब पहा (View Lifetime)</span>
                  </>
                ) : (
                  <>
                    <span>⏳</span>
                    <span>चालू बाकी हिशोब पहा (View Active Bills)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap justify-between items-center gap-2 pt-1">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-700">तारीख फिल्टर (Timeline Filter):</span>
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
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            {/* 1. Total Purchases */}
            <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-3 shadow-2xs">
              <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-wider block">
                {kpiViewMode === 'ACTIVE' ? 'चालू खरेदी (Active Bills)' : 'एकूण खरेदी (Lifetime Purchases)'}
              </span>
              <span className="text-base font-black text-slate-900 mt-1 block">
                ₹{totals.purchase.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
                {kpiViewMode === 'ACTIVE' && lifetimeTotals.outstanding <= 0 ? (
                  <span className="text-emerald-600 font-bold">0 Pending Bills</span>
                ) : (
                  `${rawPurchases.length} खरेदी आवक`
                )}
              </span>
            </div>

            {/* 2. Total Paid */}
            <div className="bg-emerald-50/80 border border-emerald-100 rounded-2xl p-3 shadow-2xs">
              <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider block">
                {kpiViewMode === 'ACTIVE' ? 'भरणा / जमा (Paid Amount)' : 'एकूण भरणा (Total Paid Out)'}
              </span>
              <span className="text-base font-black text-emerald-700 mt-1 block">
                ₹{totals.paid.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
                {kpiViewMode === 'ACTIVE' && lifetimeTotals.outstanding <= 0 ? (
                  <span className="text-emerald-600 font-bold">Settled</span>
                ) : (
                  `${rawPayments.length} पेमेंट्स`
                )}
              </span>
            </div>

            {/* 3. Material Supplies */}
            <div className="bg-purple-50/80 border border-purple-100 rounded-2xl p-3 shadow-2xs">
              <span className="text-[10px] font-extrabold text-purple-600 uppercase tracking-wider block">
                साहित्य पुरवठा (Materials Given)
              </span>
              <span className="text-base font-black text-purple-700 mt-1 block">
                ₹{totals.material.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
                {rawMaterials.length} साहित्य नोंदी
              </span>
            </div>

            {/* 4. Net Outstanding / Advance */}
            <div className={`rounded-2xl p-3 shadow-2xs border ${
              lifetimeTotals.outstanding > 0 
                ? 'bg-rose-50/80 border-rose-100' 
                : lifetimeTotals.outstanding < 0 
                  ? 'bg-indigo-50/80 border-indigo-100' 
                  : 'bg-slate-100 border-slate-200'
            }`}>
              <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${
                lifetimeTotals.outstanding > 0 ? 'text-rose-600' : lifetimeTotals.outstanding < 0 ? 'text-indigo-600' : 'text-slate-600'
              }`}>
                {lifetimeTotals.outstanding > 0 
                  ? 'बाकी देणे (Net Due)' 
                  : lifetimeTotals.outstanding < 0 
                    ? 'अ‍ॅडव्हान्स शिल्लक (Advance)' 
                    : 'हिशोब पूर्ण (Fully Settled)'}
              </span>
              <span className={`text-base font-black mt-1 block ${
                lifetimeTotals.outstanding > 0 ? 'text-rose-700' : lifetimeTotals.outstanding < 0 ? 'text-indigo-700' : 'text-slate-800'
              }`}>
                {lifetimeTotals.outstanding < 0 
                  ? `-₹${Math.abs(lifetimeTotals.outstanding).toLocaleString('en-IN')}`
                  : `₹${lifetimeTotals.outstanding.toLocaleString('en-IN')}`}
              </span>
              <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">
                {lifetimeTotals.outstanding > 0 ? 'Pending' : lifetimeTotals.outstanding < 0 ? 'Advance' : 'Nil (पूर्ण)'}
              </span>
            </div>
          </div>
        </div>

        {/* 5 Tabs Navigation - Exact Mirror of Drawer */}
        <div className="flex bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5 overflow-x-auto gap-1">
          <button
            onClick={() => setActiveTab('LEDGER')}
            className={`flex-1 min-w-[120px] py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'LEDGER' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>📊 खातेवही (Ledger)</span>
          </button>

          <button
            onClick={() => setActiveTab('PURCHASES')}
            className={`flex-1 min-w-[120px] py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'PURCHASES' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <ArrowUpCircle className="w-3.5 h-3.5" />
            <span>🛒 खरेदी ({rawPurchases.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('PAYMENTS')}
            className={`flex-1 min-w-[120px] py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'PAYMENTS' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
            <span>💵 भरणा ({rawPayments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('MATERIALS')}
            className={`flex-1 min-w-[120px] py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'MATERIALS' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Sprout className="w-3.5 h-3.5" />
            <span>📦 साहित्य ({rawMaterials.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('PROFILE')}
            className={`flex-1 min-w-[120px] py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'PROFILE' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>👤 प्रोफाईल (Profile)</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="space-y-4">
          
          {/* TAB 0: PASSBOOK LEDGER - EXACT MIRROR OF SIDE DRAWER */}
          {activeTab === 'LEDGER' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-5 space-y-4 text-xs">
              <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    खातेवही पासबुक (Running Debit/Credit Statement)
                  </h3>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                    सर्व खरेदी (जमा +) व भरणा/साहित्य (नावे -) नोंदींचे बँक पासबुक विवरण
                  </p>
                </div>

                <button
                  onClick={() => setIsPrintModalOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Statement PDF</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto pb-1">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] text-slate-400 font-extrabold uppercase border-b border-slate-200/80">
                        <th className="py-2.5 px-2.5 text-center w-10">#</th>
                        <th className="py-2.5 px-3">Date (दिनांक)</th>
                        <th className="py-2.5 px-3">Description (तपशील)</th>
                        <th className="py-2.5 px-3 text-right">Debit / नावे (-)</th>
                        <th className="py-2.5 px-3 text-right">Credit / जमा (+)</th>
                        <th className="py-2.5 px-3 text-right">Balance / शिल्लक</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledger.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                            कोणत्याही नोंदी आढळल्या नाहीत (No ledger entries recorded yet).
                          </td>
                        </tr>
                      ) : (
                        ledger.map((tx, idx) => (
                          <React.Fragment key={idx}>
                            <tr 
                              onClick={() => setExpandedRowId(expandedRowId === tx.refNo ? null : tx.refNo)}
                              className={`hover:bg-slate-50 font-medium cursor-pointer transition-colors ${expandedRowId === tx.refNo ? 'bg-slate-50' : ''}`}
                            >
                              <td className="py-2.5 px-2.5 text-center font-bold text-slate-400 text-[10px]">
                                {tx.displaySrNo || (idx + 1)}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                                <div className="flex items-center gap-1">
                                  {expandedRowId === tx.refNo ? <ChevronDown className="w-3 h-3 text-slate-400" /> : <ChevronRight className="w-3 h-3 text-slate-400" />}
                                  <span className="font-semibold">{tx.date}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-slate-800">
                                <span className="font-extrabold">{tx.description}</span>
                                <span className="text-[10px] text-slate-400 block">{tx.refNo}</span>
                              </td>
                              <td className={`py-2.5 px-3 text-right font-bold ${tx.debit !== '—' ? 'text-rose-600' : 'text-slate-900'}`}>{tx.debit}</td>
                              <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{tx.credit}</td>
                              <td className="py-2.5 px-3 text-right font-black text-slate-900">{tx.balance}</td>
                            </tr>
                            {expandedRowId === tx.refNo && (
                              <tr className="bg-slate-50/70">
                                <td colSpan={6} className="py-3 px-4 border-b border-slate-100">
                                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-xs cursor-default">
                                    {tx.type === 'PURCHASE' && (
                                      <div className="space-y-2">
                                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                          <span className="font-extrabold text-slate-800">खरेदी आवक पावती तपशील (Procurement Bill Breakdown)</span>
                                          <span className="font-black text-emerald-600 text-sm">₹{Number(tx.raw.totalAmount || tx.raw.netAmount || tx.raw.amount || 0).toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                                          <div><span className="text-slate-400 block mb-1">पिक / जात</span><span className="font-bold text-slate-800">{tx.raw.crop || 'Strawberry'}</span></div>
                                          <div><span className="text-slate-400 block mb-1">वजन / परिमाण</span><span className="font-bold text-slate-800">{tx.raw.weight || tx.raw.totalWeight || '-'}</span></div>
                                          <div><span className="text-slate-400 block mb-1">दर प्रति किलो</span><span className="font-bold text-slate-800">{tx.raw.rate || '-'}</span></div>
                                          <div><span className="text-slate-400 block mb-1">एकूण बिल</span><span className="font-black text-emerald-600">₹{Number(tx.raw.totalAmount || tx.raw.netAmount || tx.raw.amount || 0).toLocaleString('en-IN')}</span></div>
                                        </div>
                                      </div>
                                    )}
                                    {tx.type === 'PAYMENT' && (
                                      <div className="space-y-2">
                                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                          <span className="font-extrabold text-slate-800">भरणा तपशील (Payment Disbursal Breakdown)</span>
                                          <span className="font-black text-rose-600 text-sm">-₹{Number(tx.raw.amount || 0).toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1">
                                          <div><span className="text-slate-400 block mb-1">पेमेंट प्रकार (Mode)</span><span className="font-bold text-slate-800">{tx.raw.paymentMode || tx.raw.method || 'CASH'}</span></div>
                                          <div><span className="text-slate-400 block mb-1">संदर्भ क्र. (Ref)</span><span className="font-bold text-slate-800">{tx.raw.paymentNo || tx.raw.reference || tx.raw.id}</span></div>
                                          <div><span className="text-slate-400 block mb-1">टीप (Notes)</span><span className="font-bold text-slate-800">{tx.raw.notes || 'None'}</span></div>
                                        </div>
                                      </div>
                                    )}
                                    {tx.type === 'MATERIAL' && (
                                      <div className="space-y-2">
                                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                          <span className="font-extrabold text-slate-800">साहित्य पुरवठा तपशील (Material Issue Breakdown)</span>
                                          <span className="font-black text-rose-600 text-sm">-₹{Number(tx.raw.totalAmount || tx.raw.totalPrice || (tx.raw.quantity * tx.raw.unitPrice) || 0).toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
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
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

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
                    const isFullySettled = lifetimeTotals.outstanding <= 0;
                    const billAmt = Number(String(p.netAmount || p.totalAmount || p.amount || 0).replace(/[^0-9.-]+/g, '')) || 0;
                    const billKey = p.billNo || p.purchaseNo || p.id;
                    const billFifo = fifoMap[billKey] || {
                      allocatedPaid: isFullySettled ? billAmt : 0,
                      allocatedDue: isFullySettled ? 0 : billAmt,
                      status: isFullySettled ? 'PAID' : 'UNPAID'
                    };
                    const displayPaid = isFullySettled ? billAmt : billFifo.allocatedPaid;
                    const displayDue = isFullySettled ? 0 : billFifo.allocatedDue;
                    const isFullyPaid = isFullySettled || displayDue <= 0;
                    const isPartial = !isFullySettled && displayPaid > 0 && displayDue > 0;

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
                                {isFullyPaid ? 'PAID (पूर्ण भरणा)' : isPartial ? 'PARTIAL (अंशतः)' : 'UNPAID (बाकी)'}
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
                            <span className="text-emerald-700">जमा: ₹{displayPaid.toLocaleString('en-IN')}</span>
                            <span className={displayDue > 0 ? 'text-rose-600 font-black' : 'text-emerald-600 font-black'}>
                              बाकी: ₹{displayDue.toLocaleString('en-IN')}
                            </span>
                          </div>

                          <button
                            onClick={() => setSelectedPurchaseForReceipt({ ...p, paidAmount: displayPaid, dueAmount: displayDue })}
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

          {/* TAB: MATERIALS SUPPLIES */}
          {activeTab === 'MATERIALS' && (
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
                    <Sprout className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-sm">
                      साहित्य पुरवठा नोंदी (Material Supplies Issued)
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">बियाणे, खते, क्रेट्स व इतर पुरवठा</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">एकूण नावे (Total Debit)</span>
                  <span className="text-base font-black text-purple-700">₹{totals.material.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="space-y-2">
                {rawMaterials.length === 0 ? (
                  <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
                    <Sprout className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="font-extrabold text-slate-700">कोणत्याही साहित्याची नोंद आढळली नाही</p>
                    <p className="text-xs text-slate-400 mt-1">No material supplies issued to this farmer.</p>
                  </div>
                ) : (
                  rawMaterials.map((m: any, idx: number) => {
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
                        className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center justify-between shadow-2xs hover:border-purple-200 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-purple-700 text-sm">{m.itemName || 'Material Item'}</span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-black bg-purple-50 text-purple-700 border border-purple-100">
                              {qty} {m.unit || 'QTY'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600">
                            दर: ₹{price.toLocaleString('en-IN')} / {m.unit || 'QTY'}
                            {m.notes && <span className="text-slate-400 font-normal"> • {m.notes}</span>}
                          </p>
                          <p className="text-[10px] text-slate-400">📅 {dateFormatted}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black text-purple-700 block">
                            ₹{amt.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wide">नावे (Debit)</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB: LEDGER STATEMENT is defined above */}

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

      {/* TOTALS & ADVANCES TIMELINE BREAKDOWN MODAL */}
      {isBreakdownModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full max-h-[85vh] shadow-2xl overflow-hidden flex flex-col justify-between animate-in zoom-in-95">
            {/* Header */}
            <div className="bg-emerald-950 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>एकूण खरेदी व उचल सारांश (Totals & Advances Breakdown)</span>
                </h3>
                <p className="text-xs text-emerald-300 mt-0.5">
                  फिल्टर कालावधी: {dateFilter === 'ALL_TIME' ? 'सर्व नोंदी (All Time)' : dateFilter === 'THIS_MONTH' ? 'या महिन्यात (This Month)' : dateFilter === 'LAST_MONTH' ? 'मागील महिन्यात (Last Month)' : `${customRange.start || 'Start'} to ${customRange.end || 'End'}`}
                </p>
              </div>
              <button
                onClick={() => setIsBreakdownModalOpen(false)}
                className="p-1.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Financial KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">एकूण पीक खरेदी (Purchases)</span>
                  <span className="text-base font-black text-slate-900 mt-1 block">₹{totals.purchase.toLocaleString('en-IN')}</span>
                  <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">{purchasesList.length} पावत्या (Bills)</span>
                </div>

                <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-3">
                  <span className="text-[10px] font-bold text-indigo-500 uppercase block">एकूण उचल (Advances)</span>
                  <span className="text-base font-black text-indigo-700 mt-1 block">
                    ₹{paymentsList
                      .filter((p: any) => p.paymentType === 'ADVANCE' || p.paymentType === 'ADVANCE_PAYOUT' || String(p.notes || '').toLowerCase().includes('advance') || p.isAdvance)
                      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
                      .toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] text-indigo-500 font-semibold mt-0.5 block">अ‍ॅडव्हान्स जमा</span>
                </div>

                <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-3">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase block">एकूण भरणा (Direct Paid)</span>
                  <span className="text-base font-black text-emerald-700 mt-1 block">₹{totals.paid.toLocaleString('en-IN')}</span>
                  <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">{paymentsList.length} व्यवहार</span>
                </div>

                <div className="bg-rose-50/60 border border-rose-100 rounded-2xl p-3">
                  <span className="text-[10px] font-bold text-rose-500 uppercase block">शिल्लक येणे / बाकी (Net Due)</span>
                  <span className="text-base font-black text-rose-700 mt-1 block">₹{totals.outstanding.toLocaleString('en-IN')}</span>
                  <span className="text-[10px] text-rose-500 font-semibold mt-0.5 block">निव्वळ हिशोब</span>
                </div>
              </div>

              {/* Advance Vouchers in this timeline */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-900 text-xs flex items-center justify-between">
                  <span>कालावधीतील उचल नोंदी (Advance Payouts in Period)</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {paymentsList.filter((p: any) => p.paymentType === 'ADVANCE' || p.paymentType === 'ADVANCE_PAYOUT' || String(p.notes || '').toLowerCase().includes('advance') || p.isAdvance).length} Entries
                  </span>
                </h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
                  {paymentsList
                    .filter((p: any) => p.paymentType === 'ADVANCE' || p.paymentType === 'ADVANCE_PAYOUT' || String(p.notes || '').toLowerCase().includes('advance') || p.isAdvance)
                    .length === 0 ? (
                    <div className="p-4 text-center text-slate-400 font-semibold">या कालावधीत कोणतीही उचल / अ‍ॅडव्हान्स नोंद नाही.</div>
                  ) : (
                    paymentsList
                      .filter((p: any) => p.paymentType === 'ADVANCE' || p.paymentType === 'ADVANCE_PAYOUT' || String(p.notes || '').toLowerCase().includes('advance') || p.isAdvance)
                      .map((p: any, idx: number) => (
                        <div key={idx} className="p-3 bg-white flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black text-indigo-700">{p.paymentNo || p.id}</span>
                              <span className="text-[10px] text-slate-400">{p.date || p.paymentDate}</span>
                            </div>
                            <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                              {p.paymentMode || p.method || 'CASH'} {p.notes ? `• ${p.notes}` : ''}
                            </p>
                          </div>
                          <span className="font-black text-indigo-700 text-sm">
                            ₹{Number(p.amount || 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))
                  )}
                </div>
              </div>

              {/* Purchases in this timeline */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-900 text-xs flex items-center justify-between">
                  <span>कालावधीतील आवक खरेदी पावत्या (Harvest Purchases in Period)</span>
                  <span className="text-[10px] text-slate-400 font-normal">{purchasesList.length} Entries</span>
                </h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {purchasesList.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 font-semibold">या कालावधीत कोणतीही खरेदी नोंद नाही.</div>
                  ) : (
                    purchasesList.map((p: any, idx: number) => (
                      <div key={idx} className="p-3 bg-white flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-emerald-800">{p.purchaseNo || p.billNo || p.id}</span>
                            <span className="text-[10px] text-slate-400">{p.date || p.purchaseDate}</span>
                          </div>
                          <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                            {p.crop || 'Crop'} • {p.weight || `${p.totalWeight || 0} KG`} @ {p.rate || 'Rate'}
                          </p>
                        </div>
                        <span className="font-black text-slate-900 text-sm">
                          ₹{Number(p.totalAmount || p.amount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end gap-2">
              <button
                onClick={() => setIsBreakdownModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
              >
                बंद करा / Close
              </button>
              <button
                onClick={() => {
                  setIsBreakdownModalOpen(false);
                  setIsPrintModalOpen(true);
                }}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>स्टेटमेंट प्रिंट करा / Print</span>
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
