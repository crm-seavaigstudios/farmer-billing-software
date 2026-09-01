"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LogOut, FileText, IndianRupee, ArrowDownCircle, ArrowUpCircle, ChevronDown, ChevronRight, Sprout, Filter, Calendar } from 'lucide-react';

export default function FarmerPortalPage() {
  const router = useRouter();
  const [farmer, setFarmer] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  
  const [rawPurchases, setRawPurchases] = useState<any[]>([]);
  const [rawPayments, setRawPayments] = useState<any[]>([]);
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);
  
  const [ledger, setLedger] = useState<any[]>([]);
  const [totals, setTotals] = useState({ purchase: 0, paid: 0, material: 0 });
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'PURCHASES' | 'PAYMENTS' | 'MATERIALS'>('LEDGER');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

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
      await fetchData(fData.id, fData.tenantId);
    } else {
      router.push('/login');
    }
  };

  const fetchData = async (farmerId: string, tenantId: string) => {
    const { data: pData } = await supabase.from('Purchase').select('*').eq('farmerId', farmerId).eq('tenantId', tenantId);
    const { data: payData } = await supabase.from('Payment').select('*').eq('entityId', farmerId).eq('entityType', 'FARMER').eq('tenantId', tenantId);
    const { data: mData } = await supabase.from('FarmerMaterialPurchase').select('*').eq('farmerId', farmerId).order('createdAt', { ascending: false });
    
    setRawPurchases(pData || []);
    setRawPayments(payData || []);
    setRawMaterials(mData || []);
    setLoading(false);
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
      const d = parseCustomDate(x.date || x.purchaseDate);
      if(!isDateInRange(d)) return;
      const amt = typeof x.amount === 'number' ? x.amount : parseFloat(String(x.netAmount || x.totalAmount || x.amount || '0').replace(/[^0-9.-]+/g, '')) || 0;
      totalPurchase += amt;
      allItems.push({
         dateStr: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
         timestamp: d.getTime(),
         refNo: x.billNo || x.id,
         type: 'PURCHASE',
         description: x.crop || 'Crop Purchase',
         weightOrQty: `${x.weight} @ ${x.rate}`,
         debitVal: 0,
         creditVal: amt,
         notes: x.notes,
         raw: x
      });
    });
    
    rawPayments.forEach((x: any) => {
      const d = parseCustomDate(x.date || x.paymentDate);
      if(!isDateInRange(d)) return;
      const amt = typeof x.amount === 'number' ? x.amount : parseFloat(String(x.amount || '0').replace(/[^0-9.-]+/g, '')) || 0;
      totalPaid += amt;
      allItems.push({
         dateStr: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
         timestamp: d.getTime(),
         refNo: x.paymentId || x.id,
         type: 'PAYMENT',
         description: \Payment (\)\,
         weightOrQty: '-',
         debitVal: amt,
         creditVal: 0,
         notes: x.notes || x.method,
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
         description: \Material Issue: \\,
         weightOrQty: \\ \\,
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
          debit: item.debitVal > 0 ? \-₹\\ : '—',
          credit: item.creditVal > 0 ? \₹\\ : '—',
          balance: \₹\\,
          raw: item.raw
       };
    });
    
    setTotals({ 
      purchase: totalPurchase, 
      paid: totalPaid, 
      material: totalMaterial
    });
    setLedger(computed.reverse());
  };

  const handleLogout = () => {
    localStorage.removeItem('active_tenant');
    router.push('/login');
  };

  if (loading || !farmer) return <div className="p-8 text-center animate-pulse">Loading Farmer Portal...</div>;

  const purchases = ledger.filter(item => item.type === 'PURCHASE');
  const advances = ledger.filter(item => item.type === 'PAYMENT');
  const materials = ledger.filter(item => item.type === 'MATERIAL');

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <div className="bg-emerald-600 px-4 pt-8 pb-12 rounded-b-[40px] shadow-lg relative">
        <div className="flex justify-between items-center text-white mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg">
              {farmer.name?.charAt(0) || 'F'}
            </div>
            <div>
              <h1 className="font-bold">{farmer.name}</h1>
              <p className="text-xs opacity-80">{farmer.phone}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center text-white">
          <p className="text-sm font-semibold opacity-90 mb-1">My Outstanding Balance</p>
          <h2 className="text-4xl font-black tracking-tight">₹{farmer.outstandingAmount || 0}</h2>
          <p className="text-xs opacity-80 mt-2">Agency: {tenant?.businessName || tenant?.companyName}</p>
        </div>
      </div>

      {/* Filter and KPI Cards */}
      <div className="px-4 -mt-6 relative z-10 mb-4 space-y-4">
        
        {/* Timeline Filter */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 flex flex-wrap gap-2 items-center justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            <select 
              value={dateFilter}
              onChange={(e: any) => setDateFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold px-2 py-1.5 text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="ALL_TIME">All Time</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_MONTH">Last Month</option>
              <option value="CUSTOM">Custom Range</option>
            </select>

            {dateFilter === 'CUSTOM' && (
              <div className="flex items-center gap-1">
                <input 
                  type="date" 
                  value={customRange.start}
                  onChange={(e) => setCustomRange(prev => ({...prev, start: e.target.value}))}
                  className="bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold px-2 py-1.5 text-slate-700 outline-none"
                />
                <span className="text-slate-400">-</span>
                <input 
                  type="date" 
                  value={customRange.end}
                  onChange={(e) => setCustomRange(prev => ({...prev, end: e.target.value}))}
                  className="bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold px-2 py-1.5 text-slate-700 outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Lifetime Overview (Filtered) */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-500 mb-1">Total Purchases</p>
            <p className="text-xl font-black text-emerald-600">₹{totals.purchase.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-500 mb-1">Total Disbursed</p>
            <p className="text-xl font-black text-rose-600">₹{(totals.paid + totals.material).toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 p-1 overflow-x-auto gap-1">
          <button 
            onClick={() => setActiveTab('LEDGER')} 
            className={\lex-1 min-w-[120px] py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap \\}
          >
            मुख्य सारांश (Ledger)
          </button>
          <button 
            onClick={() => setActiveTab('PURCHASES')} 
            className={\lex-1 min-w-[120px] py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap \\}
          >
            खरेदी (Purchases)
          </button>
          <button 
            onClick={() => setActiveTab('PAYMENTS')} 
            className={\lex-1 min-w-[120px] py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap \\}
          >
            जमा (Payments)
          </button>
          <button 
            onClick={() => setActiveTab('MATERIALS')} 
            className={\lex-1 min-w-[120px] py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap \\}
          >
            साहित्य (Materials)
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 pb-8">
        {activeTab === 'LEDGER' && (
          <div className="space-y-4">
            {/* Ledger Container */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 min-h-[400px]">
              <h3 className="font-black text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                Account Statement (Ledger)
              </h3>

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
                            className={\hover:bg-slate-50 font-medium cursor-pointer transition-colors \\}
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
                            <td className={\py-2.5 px-3 text-right font-bold \\}>{tx.debit}</td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{tx.credit}</td>
                            <td className="py-2.5 px-3 text-right font-black text-slate-900">{tx.balance}</td>
                          </tr>
                          {expandedRowId === tx.refNo && (
                            <tr className="bg-slate-50/50">
                              <td colSpan={5} className="py-3 px-4 border-b border-slate-100">
                                <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm text-xs cursor-default">
                                  {tx.type === 'PURCHASE' && (
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                      <div><span className="text-slate-400 block mb-1">Crop / Grade</span><span className="font-bold">{tx.raw.crop} {tx.raw.grade ? \(\)\ : ''}</span></div>
                                      <div><span className="text-slate-400 block mb-1">Weight</span><span className="font-bold">{tx.raw.weight || tx.raw.netWeight} kg</span></div>
                                      <div><span className="text-slate-400 block mb-1">Rate / kg</span><span className="font-bold">₹{tx.raw.rate}</span></div>
                                      <div><span className="text-slate-400 block mb-1">Deductions</span><span className="font-bold text-rose-500">{tx.raw.deductions || 'None'}</span></div>
                                    </div>
                                  )}
                                  {tx.type === 'PAYMENT' && (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                      <div><span className="text-slate-400 block mb-1">Payment Mode</span><span className="font-bold">{tx.raw.method || tx.raw.paymentMethod || 'Cash'}</span></div>
                                      <div><span className="text-slate-400 block mb-1">Reference</span><span className="font-bold">{tx.raw.reference || tx.raw.transactionId || 'N/A'}</span></div>
                                      <div><span className="text-slate-400 block mb-1">Notes</span><span className="font-bold">{tx.raw.notes || 'None'}</span></div>
                                    </div>
                                  )}
                                  {tx.type === 'MATERIAL' && (
                                    <div className="space-y-2">
                                      <div className="font-bold text-slate-800 border-b border-slate-100 pb-2 mb-2">Itemized Materials</div>
                                      {tx.raw.materials && tx.raw.materials.length > 0 ? (
                                        <ul className="space-y-1">
                                          {tx.raw.materials.map((m: any, mIdx: number) => (
                                            <li key={mIdx} className="flex justify-between">
                                              <span className="text-slate-600">{m.itemName}</span>
                                              <span className="font-bold">{m.quantity} {m.unit}</span>
                                            </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <div className="flex justify-between items-center">
                                           <span className="text-slate-600">{tx.raw.itemName || 'Material Item'}</span>
                                           <span className="font-bold">{tx.raw.quantity} {tx.raw.unit}</span>
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

        {activeTab === 'PURCHASES' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 min-h-[400px]">
            <h3 className="font-black text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <ArrowUpCircle className="w-5 h-5 text-emerald-600" />
              Harvest Purchases
            </h3>
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs min-w-[400px]">
                 <thead className="bg-slate-50 text-[10px] text-slate-400 font-extrabold uppercase border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Credit</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {purchases.length === 0 ? (
                      <tr><td colSpan={3} className="py-8 text-center text-slate-400 font-semibold">No purchases found.</td></tr>
                    ) : (
                      purchases.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 font-medium">
                          <td className="py-2.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                            {item.date}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800">
                            <span className="font-bold">{item.description}</span>
                            <span className="text-[10px] text-slate-400 block">{item.refNo}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600">{item.credit}</td>
                        </tr>
                      ))
                    )}
                 </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'PAYMENTS' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 min-h-[400px]">
            <h3 className="font-black text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <ArrowDownCircle className="w-5 h-5 text-rose-600" />
              Advances & Payments
            </h3>
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs min-w-[400px]">
                 <thead className="bg-slate-50 text-[10px] text-slate-400 font-extrabold uppercase border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Debit</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {advances.length === 0 ? (
                      <tr><td colSpan={3} className="py-8 text-center text-slate-400 font-semibold">No advances found.</td></tr>
                    ) : (
                      advances.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 font-medium">
                          <td className="py-2.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                            {item.date}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800">
                            <span className="font-bold">{item.description}</span>
                            <span className="text-[10px] text-slate-400 block">{item.refNo}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-600">{item.debit}</td>
                        </tr>
                      ))
                    )}
                 </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'MATERIALS' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 min-h-[400px]">
            <h3 className="font-black text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <Sprout className="w-5 h-5 text-purple-600" />
              Materials Provided
            </h3>
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-left text-xs min-w-[400px]">
                 <thead className="bg-slate-50 text-[10px] text-slate-400 font-extrabold uppercase border-b border-slate-100">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Debit</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {materials.length === 0 ? (
                      <tr><td colSpan={3} className="py-8 text-center text-slate-400 font-semibold">No materials found.</td></tr>
                    ) : (
                      materials.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 font-medium">
                          <td className="py-2.5 px-3 text-slate-500 text-[11px] whitespace-nowrap">
                            {item.date}
                          </td>
                          <td className="py-2.5 px-3 text-slate-800">
                             <span className="font-bold">{item.description}</span>
                             <span className="text-[10px] text-slate-400 block">{item.refNo}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-600">{item.debit}</td>
                        </tr>
                      ))
                    )}
                 </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
      
      {/* Help Footer */}
      <div className="text-center p-8">
        <p className="text-xs font-semibold text-slate-400">
          Powered by Seavaig Agro CRM
        </p>
      </div>
    </div>
  );
}
