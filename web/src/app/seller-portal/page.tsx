"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LogOut, Truck, TrendingUp, Search, Image as ImageIcon, ArrowRight, Calendar, ChevronDown, CheckCircle, Clock, Receipt, IndianRupee } from "lucide-react";

export default function SellerPortalPage() {
  const router = useRouter();
  const [seller, setSeller] = useState<any>(null);
  const [linkedTenants, setLinkedTenants] = useState<any[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  
  const [activeTab, setActiveTab] = useState<'DISPATCHES' | 'RATES'>('DISPATCHES');
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [cropRates, setCropRates] = useState<any[]>([]);
  const [newCropName, setNewCropName] = useState('');
  const [newCropRate, setNewCropRate] = useState('');

  // Timeline Filter State
  const [timelineFilter, setTimelineFilter] = useState<'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'>('THIS_MONTH');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  useEffect(() => {
    loadSellerProfile();
  }, []);

  const loadSellerProfile = async () => {
    const raw = localStorage.getItem('active_tenant');
    if (!raw) return router.push('/login');
    const auth = JSON.parse(raw);
    if (auth.userRole !== 'SELLER') return router.push('/login');
    setSeller(auth);

    const userPhone = auth.phone || '';

    // Find all Tenants this seller's phone is registered under in Customer table or Sale table
    const { data: customerLinks } = await supabase
      .from('Customer')
      .select('tenantId, name')
      .eq('phone', userPhone);
    
    let tenantIds = (customerLinks || []).map((c: any) => c.tenantId).filter(Boolean);

    const { data: saleLinks } = await supabase
      .from('Sale')
      .select('tenantId')
      .eq('phone', userPhone);
    
    if (saleLinks) {
      saleLinks.forEach((s: any) => {
        if (s.tenantId && !tenantIds.includes(s.tenantId)) {
          tenantIds.push(s.tenantId);
        }
      });
    }
    
    if (tenantIds.length > 0) {
      const { data: tenants } = await supabase.from('Tenant').select('*').in('id', tenantIds);
      const list = tenants || [];
      setLinkedTenants(list);
      if (list.length > 0) {
        setSelectedTenant(list[0]);
        await loadTenantData(list[0].id, userPhone);
      }
    }
  };

  const selectTenant = async (tenant: any) => {
    setSelectedTenant(tenant);
    await loadTenantData(tenant.id, seller?.phone);
  };

  const loadTenantData = async (tenantId: string, phoneOverride?: string) => {
    const userPhone = phoneOverride || seller?.phone || '';
    
    // 1. Get Dispatches (Sales) for this Seller strictly under this Tenant
    const { data: custData } = await supabase
      .from('Customer')
      .select('id')
      .eq('phone', userPhone)
      .eq('tenantId', tenantId);
    
    const custIds = (custData || []).map((c: any) => c.id).filter(Boolean);
    
    let query = supabase.from('Sale').select('*').eq('tenantId', tenantId);
    if (custIds.length > 0 && userPhone) {
      query = query.or(`customerId.in.(${custIds.join(',')}),phone.eq.${userPhone}`);
    } else if (userPhone) {
      query = query.eq('phone', userPhone);
    }
    
    const { data: salesRes } = await query.order('createdAt', { ascending: false });
    setDispatches(salesRes || []);

    // 2. Get today's crop rates for this tenant
    const { data: rates } = await supabase
      .from('SellerCropRates')
      .select('*')
      .eq('tenantId', tenantId)
      .order('createdAt', { ascending: false });
    setCropRates(rates || []);
  };

  const handleAddRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCropName || !newCropRate || !selectedTenant) return;
    
    // Check if rate for this crop already exists
    const { data: existing } = await supabase
      .from('SellerCropRates')
      .select('id')
      .eq('sellerId', seller.id)
      .eq('tenantId', selectedTenant.id)
      .eq('cropName', newCropName)
      .limit(1);

    if (existing && existing.length > 0) {
      await supabase.from('SellerCropRates').update({
        rate: parseFloat(newCropRate),
        date: new Date().toISOString()
      }).eq('id', existing[0].id);
    } else {
      const rateData = {
        id: `rate-${Date.now()}`,
        sellerId: seller.id,
        tenantId: selectedTenant.id,
        cropName: newCropName,
        rate: parseFloat(newCropRate),
        date: new Date().toISOString()
      };
      await supabase.from('SellerCropRates').insert([rateData]);
    }
    
    setNewCropName('');
    setNewCropRate('');
    loadTenantData(selectedTenant.id); // reload
  };

  const markAsReceived = async (billId: string) => {
    await supabase.from('Sale').update({ deliveryStatus: 'RECEIVED' }).eq('id', billId);
    if (selectedTenant) {
      loadTenantData(selectedTenant.id); // reload
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('active_tenant');
    router.push('/login');
  };

  // Filter Dispatches
  const filteredDispatches = useMemo(() => {
    let result = [...dispatches];
    const now = new Date();
    
    result = result.filter(bill => {
      if (!bill.date && !bill.createdAt) return true;
      let billDate: Date;
      const dateStr = bill.date || bill.createdAt;
      
      try {
        if (dateStr.includes('/')) {
          const parts = dateStr.split('/');
          billDate = new Date(parseInt(parts[2]), parseInt(parts[1])-1, parseInt(parts[0]));
        } else {
          billDate = new Date(dateStr);
        }
      } catch {
        billDate = new Date(0);
      }
      
      if (timelineFilter === 'THIS_MONTH') {
        return billDate.getMonth() === now.getMonth() && billDate.getFullYear() === now.getFullYear();
      }
      if (timelineFilter === 'LAST_MONTH') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return billDate.getMonth() === lastMonth.getMonth() && billDate.getFullYear() === lastMonth.getFullYear();
      }
      if (timelineFilter === 'CUSTOM' && customStartDate && customEndDate) {
        const start = new Date(customStartDate);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return billDate >= start && billDate <= end;
      }
      return true; // ALL or invalid custom
    });
    
    return result;
  }, [dispatches, timelineFilter, customStartDate, customEndDate]);

  // KPI Calculations
  const { totalPurchases, totalPaid, totalOutstanding } = useMemo(() => {
    let purchases = 0;
    let paid = 0;

    filteredDispatches.forEach(bill => {
      const netAmount = parseFloat(bill.netAmount || bill.totalAmount || bill.amount || 0);
      purchases += netAmount;

      let billPaid = 0;
      if (bill.paymentHistory && Array.isArray(bill.paymentHistory)) {
        billPaid = bill.paymentHistory.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0);
      }
      paid += billPaid;
    });

    return {
      totalPurchases: purchases,
      totalPaid: paid,
      totalOutstanding: purchases - paid
    };
  }, [filteredDispatches]);

  // Helper function to calculate paid amount for a single bill
  const getBillPaidAmount = (bill: any) => {
    if (!bill.paymentHistory || !Array.isArray(bill.paymentHistory)) return 0;
    return bill.paymentHistory.reduce((sum: number, p: any) => sum + parseFloat(p.amount || 0), 0);
  };

  const getFilterLabel = () => {
    switch (timelineFilter) {
      case 'ALL': return 'All Time';
      case 'THIS_MONTH': return 'This Month';
      case 'LAST_MONTH': return 'Last Month';
      case 'CUSTOM': return 'Custom Range';
    }
  };

  if (!seller) return <div className="min-h-screen flex items-center justify-center bg-green-50 text-green-700 font-bold animate-pulse">Loading Agricultural Portal...</div>;

  // VIEW 1: TENANT SELECTOR
  if (!selectedTenant) {
    return (
      <div className="min-h-screen bg-green-50 p-4 font-sans selection:bg-green-200">
        <div className="flex justify-between items-center mb-8 bg-white p-5 rounded-2xl shadow-sm border border-green-100">
          <div>
            <h1 className="font-extrabold text-xl text-green-900">Welcome,</h1>
            <p className="text-sm text-green-600 font-semibold">{seller.phone}</p>
          </div>
          <button onClick={handleLogout} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        
        <div className="mb-6">
          <h2 className="font-black text-2xl text-green-900 mb-2">Select Market / Agency</h2>
          <p className="text-green-700 font-medium text-sm">Choose the agency you want to view dispatches for</p>
        </div>
        
        <div className="space-y-4">
          {linkedTenants.length === 0 ? (
            <div className="p-6 bg-white border border-yellow-200 text-yellow-800 rounded-2xl text-sm font-semibold shadow-sm flex items-start gap-3">
              <div className="bg-yellow-100 p-2 rounded-full mt-0.5">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="leading-relaxed">You are not registered with any Agencies yet. Ask an Agency Owner to add you as a Customer using your Mobile Number.</p>
            </div>
          ) : (
            linkedTenants.map(t => (
              <button 
                key={t.id} 
                onClick={() => selectTenant(t)}
                className="w-full bg-white p-6 rounded-2xl shadow-sm border border-green-100 flex items-center justify-between hover:border-green-300 hover:shadow-md active:scale-[0.98] transition-all group"
              >
                <div className="text-left">
                  <h3 className="font-black text-xl text-green-900 group-hover:text-green-700 transition-colors">{t.companyName || t.businessName || 'Agency'}</h3>
                  <p className="text-sm text-green-600 font-medium mt-1">{t.tagline || 'View your bills and enter rates'}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                  <ArrowRight className="w-6 h-6 text-green-600" />
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  // VIEW 2: SELLER DASHBOARD
  return (
    <div className="min-h-screen bg-stone-50 pb-20 font-sans selection:bg-green-200">
      {/* Header */}
      <div className="bg-white px-4 py-5 shadow-sm border-b border-green-100 sticky top-0 z-20 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedTenant(null)} className="p-2 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors">
            <ArrowRight className="w-5 h-5 text-stone-700 rotate-180" />
          </button>
          <div>
            <h1 className="font-black text-lg text-green-950 leading-tight">{selectedTenant.companyName || selectedTenant.businessName}</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <p className="text-[11px] text-green-700 font-bold uppercase tracking-wider">Farmer / Seller Portal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-4 gap-3 bg-white border-b border-stone-100">
        <button 
          onClick={() => setActiveTab('DISPATCHES')}
          className={`flex-1 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all cursor-pointer ${activeTab === 'DISPATCHES' ? 'bg-green-700 text-white shadow-md shadow-green-200' : 'bg-stone-50 text-stone-600 border border-stone-200 hover:bg-stone-100'}`}
        >
          <Truck className="w-4 h-4" /> 
          <span>वाहतूक व बिले (Logistics & Bills)</span>
        </button>
        <button 
          onClick={() => setActiveTab('RATES')}
          className={`flex-1 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all cursor-pointer ${activeTab === 'RATES' ? 'bg-green-700 text-white shadow-md shadow-green-200' : 'bg-stone-50 text-stone-600 border border-stone-200 hover:bg-stone-100'}`}
        >
          <TrendingUp className="w-4 h-4" /> 
          <span>बाजार भाव (Market Rates)</span>
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-6">
        {activeTab === 'DISPATCHES' && (
          <>
            {/* Timeline Filter */}
            <div className="relative z-10">
              <button 
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                className="w-full bg-white border border-stone-200 p-3.5 rounded-xl flex items-center justify-between shadow-sm hover:border-green-300 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <span className="font-bold text-stone-800">Date Range: <span className="text-green-700">{getFilterLabel()}</span></span>
                </div>
                <ChevronDown className={`w-5 h-5 text-stone-500 transition-transform ${showFilterDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showFilterDropdown && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-stone-200 rounded-xl shadow-xl overflow-hidden p-2 space-y-1">
                  {['THIS_MONTH', 'LAST_MONTH', 'ALL'].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setTimelineFilter(opt as any);
                        setShowFilterDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-lg font-semibold text-sm transition-colors ${timelineFilter === opt ? 'bg-green-50 text-green-700' : 'text-stone-700 hover:bg-stone-50'}`}
                    >
                      {opt.replace('_', ' ')}
                    </button>
                  ))}
                  
                  <div className="px-4 py-3 border-t border-stone-100 mt-2">
                    <p className="text-xs font-bold text-stone-400 uppercase mb-2">Custom Range</p>
                    <div className="flex gap-2">
                      <input 
                        type="date" 
                        value={customStartDate}
                        onChange={(e) => {
                          setCustomStartDate(e.target.value);
                          if (e.target.value && customEndDate) setTimelineFilter('CUSTOM');
                        }}
                        className="flex-1 bg-stone-50 border border-stone-200 rounded-lg p-2 text-sm font-medium text-stone-700 outline-none focus:border-green-500"
                      />
                      <input 
                        type="date" 
                        value={customEndDate}
                        onChange={(e) => {
                          setCustomEndDate(e.target.value);
                          if (customStartDate && e.target.value) setTimelineFilter('CUSTOM');
                        }}
                        className="flex-1 bg-stone-50 border border-stone-200 rounded-lg p-2 text-sm font-medium text-stone-700 outline-none focus:border-green-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 bg-gradient-to-br from-green-800 to-green-950 p-5 rounded-2xl shadow-lg text-white">
                <p className="text-green-200/80 font-bold text-xs uppercase tracking-wider mb-1">Total Dispatch Value</p>
                <div className="flex items-center gap-1">
                  <span className="text-xl">₹</span>
                  <h3 className="text-3xl font-black">{totalPurchases.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h3>
                </div>
              </div>
              <div className="bg-white border border-stone-200 p-4 rounded-2xl shadow-sm">
                <p className="text-stone-500 font-bold text-[10px] uppercase tracking-wider mb-1">Total Paid</p>
                <p className="text-emerald-600 font-black text-lg">₹ {totalPaid.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-white border border-stone-200 p-4 rounded-2xl shadow-sm">
                <p className="text-stone-500 font-bold text-[10px] uppercase tracking-wider mb-1">Outstanding</p>
                <p className="text-rose-600 font-black text-lg">₹ {totalOutstanding.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</p>
              </div>
            </div>

            {/* Bills List */}
            <div className="space-y-4">
              <h3 className="font-black text-lg text-stone-800 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-green-600" /> Dispatch History
              </h3>
              
              {filteredDispatches.length === 0 ? (
                <div className="bg-white rounded-2xl border border-stone-200 border-dashed p-8 text-center">
                  <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Truck className="w-8 h-8 text-stone-400" />
                  </div>
                  <p className="text-stone-500 font-semibold">No dispatch bills found for this period.</p>
                </div>
              ) : (
                filteredDispatches.map(bill => {
                  const netAmt = parseFloat(bill.netAmount || bill.totalAmount || bill.amount || 0);
                  const paidAmt = getBillPaidAmount(bill);
                  const dueAmt = netAmt - paidAmt;
                  const isFullyPaid = dueAmt <= 0;
                  const paymentHistory = Array.isArray(bill.paymentHistory) ? bill.paymentHistory : [];

                  return (
                    <div key={bill.id} className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                      {/* Bill Header */}
                      <div className="bg-stone-50 p-4 border-b border-stone-100 flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-black text-stone-900 text-lg">{bill.billNo || 'BILL'}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${bill.deliveryStatus === 'RECEIVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                              {bill.deliveryStatus || 'IN TRANSIT'}
                            </span>
                          </div>
                          <p className="text-xs text-stone-500 font-bold flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {new Date(bill.date || bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-black inline-block border ${isFullyPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            {isFullyPaid ? 'PAID IN FULL' : 'PAYMENT PENDING'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="p-4 space-y-4">
                        {/* Financial Breakdown */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 text-center">
                            <p className="text-[10px] text-stone-500 font-bold uppercase mb-1">Bill Total</p>
                            <p className="font-black text-stone-800">₹{netAmt.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 text-center">
                            <p className="text-[10px] text-emerald-600 font-bold uppercase mb-1">Amount Paid</p>
                            <p className="font-black text-emerald-700">₹{paidAmt.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100 text-center">
                            <p className="text-[10px] text-rose-600 font-bold uppercase mb-1">Amount Due</p>
                            <p className="font-black text-rose-700">₹{dueAmt.toLocaleString('en-IN')}</p>
                          </div>
                        </div>

                        {/* Payment History Log */}
                        {paymentHistory.length > 0 && (
                          <div className="bg-stone-50 rounded-xl p-3 border border-stone-200">
                            <p className="text-xs font-bold text-stone-600 mb-2 flex items-center gap-1.5">
                              <IndianRupee className="w-3.5 h-3.5" /> Payment Log
                            </p>
                            <div className="space-y-2">
                              {paymentHistory.map((pmt: any, idx: number) => (
                                <div key={idx} className="flex justify-between items-center text-sm py-1.5 border-b border-stone-200/50 last:border-0 last:pb-0">
                                  <div>
                                    <p className="font-bold text-stone-800 text-xs">{pmt.type || 'Payment'}</p>
                                    <p className="text-[10px] text-stone-500">{new Date(pmt.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-black text-emerald-600 text-xs">+ ₹{parseFloat(pmt.amount || 0).toLocaleString('en-IN')}</p>
                                    {pmt.notes && <p className="text-[10px] text-stone-500 max-w-[100px] truncate">{pmt.notes}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Logistics Info */}
                        <div className="bg-stone-50 rounded-xl p-3 border border-stone-200">
                          <p className="text-xs font-bold text-stone-600 mb-2 flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5" /> Logistics & Transport
                          </p>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-[10px] text-stone-400 font-bold uppercase">Total Weight</p>
                              <p className="font-black text-stone-800">{bill.totalWeight || 0} KG</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-stone-400 font-bold uppercase">Vehicle No</p>
                              <p className="font-bold text-stone-800">{bill.vehicleNumber || 'N/A'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-stone-400 font-bold uppercase">Driver</p>
                              <p className="font-bold text-stone-800">{bill.driverName || 'N/A'}</p>
                              <p className="text-xs text-stone-500 font-medium">{bill.driverPhone || ''}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-stone-400 font-bold uppercase">Owner</p>
                              <p className="font-bold text-stone-800 truncate">{bill.ownerName || selectedTenant?.companyName || 'N/A'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {bill.photoUrl && (
                            <button 
                              onClick={() => {
                                const w = window.open();
                                if (w) w.document.write(`<img src="${bill.photoUrl}" style="max-width:100%;" />`);
                              }}
                              className="flex-1 bg-stone-100 hover:bg-stone-200 py-2.5 rounded-lg text-xs font-bold text-stone-700 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                            >
                              <ImageIcon className="w-4 h-4 text-stone-500" /> Vehicle
                            </button>
                          )}
                          {bill.signatureUrl && (
                            <button 
                              onClick={() => {
                                const w = window.open();
                                if (w) w.document.write(`<img src="${bill.signatureUrl}" style="max-width:100%;" />`);
                              }}
                              className="flex-1 bg-stone-100 hover:bg-stone-200 py-2.5 rounded-lg text-xs font-bold text-stone-700 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                            >
                              <ImageIcon className="w-4 h-4 text-stone-500" /> Signature
                            </button>
                          )}
                        </div>
                        
                        {bill.deliveryStatus !== 'RECEIVED' && (
                          <button 
                            onClick={() => markAsReceived(bill.id)}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 rounded-xl text-sm shadow-md transition-colors flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="w-5 h-5" /> MARK AS RECEIVED
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

        {activeTab === 'RATES' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-green-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              
              <div className="relative z-10">
                <h3 className="font-black text-xl text-green-900 mb-1">Live Market Rates</h3>
                <p className="text-sm text-green-600 font-medium mb-5">Update rates to inform agencies instantly.</p>
                
                <form onSubmit={handleAddRate} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-stone-600 uppercase mb-1.5 block">Crop Name</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Strawberry A Grade"
                      value={newCropName}
                      onChange={e => setNewCropName(e.target.value)}
                      className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-800 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-stone-600 uppercase mb-1.5 block">Rate per KG (₹)</label>
                    <input 
                      type="number" 
                      required
                      placeholder="e.g. 250"
                      value={newCropRate}
                      onChange={e => setNewCropRate(e.target.value)}
                      className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold text-stone-800 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all"
                    />
                  </div>
                  <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 rounded-xl text-sm shadow-md shadow-green-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-2">
                    <TrendingUp className="w-5 h-5" /> UPDATE RATE
                  </button>
                </form>
              </div>
            </div>

            <div>
              <h3 className="font-black text-stone-800 text-lg mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-stone-400" /> Recent Updates
              </h3>
              <div className="space-y-3">
                {cropRates.length === 0 ? (
                  <div className="bg-white rounded-xl border border-stone-200 border-dashed p-6 text-center">
                    <p className="text-stone-500 font-semibold text-sm">No rates provided yet.</p>
                  </div>
                ) : (
                  cropRates.map(rate => (
                    <div key={rate.id} className="bg-white p-4 rounded-xl border border-stone-200 flex justify-between items-center shadow-sm group hover:border-green-300 transition-colors">
                      <div>
                        <p className="font-black text-stone-900 group-hover:text-green-800 transition-colors">{rate.cropName}</p>
                        <p className="text-xs text-stone-500 font-semibold mt-0.5">{new Date(rate.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="font-black text-green-700 text-lg bg-green-50 px-3 py-1 rounded-lg">
                          ₹{rate.rate}/KG
                        </div>
                        <button 
                          onClick={() => {
                            setNewCropName(rate.cropName);
                            setNewCropRate(rate.rate.toString());
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="text-[10px] text-blue-600 font-bold bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-md active:scale-95 transition-all"
                        >
                          EDIT
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
