"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LogOut, Truck, TrendingUp, Search, Image as ImageIcon } from 'lucide-react';

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

  useEffect(() => {
    loadSellerProfile();
  }, []);

  const loadSellerProfile = async () => {
    const raw = localStorage.getItem('active_tenant');
    if (!raw) return router.push('/login');
    const auth = JSON.parse(raw);
    if (auth.userRole !== 'SELLER') return router.push('/login');
    setSeller(auth);

    // Find all Tenants this seller's phone is registered under in the Customer table
    const { data: customerLinks } = await supabase
      .from('Customer')
      .select('tenantId, name')
      .eq('phone', auth.phone);
    
    if (customerLinks && customerLinks.length > 0) {
      // Get the Tenant details
      const tenantIds = customerLinks.map((c: any) => c.tenantId);
      const { data: tenants } = await supabase.from('Tenant').select('*').in('id', tenantIds);
      setLinkedTenants(tenants || []);
    }
  };

  const selectTenant = async (tenant: any) => {
    setSelectedTenant(tenant);
    loadTenantData(tenant.id);
  };

  const loadTenantData = async (tenantId: string) => {
    // 1. Get Dispatches (Sales) for this Seller under this Tenant
    // Need to find the specific Customer ID for this tenant first
    const { data: custData } = await supabase.from('Customer').select('id').eq('phone', seller.phone).eq('tenantId', tenantId).maybeSingle();
    if (custData) {
      const { data: sales } = await supabase.from('Sale').select('*').eq('customerId', custData.id).eq('tenantId', tenantId).order('date', { ascending: false });
      setDispatches(sales || []);
    }

    // 2. Get today's crop rates
    const { data: rates } = await supabase.from('SellerCropRates').select('*').eq('sellerId', seller.id).eq('tenantId', tenantId).order('createdAt', { ascending: false });
    setCropRates(rates || []);
  };

  const handleAddRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCropName || !newCropRate || !selectedTenant) return;
    
    const rateData = {
      id: \`rate-\${Date.now()}\`,
      sellerId: seller.id,
      tenantId: selectedTenant.id,
      cropName: newCropName,
      rate: parseFloat(newCropRate),
      date: new Date().toISOString()
    };
    
    await supabase.from('SellerCropRates').insert([rateData]);
    setNewCropName('');
    setNewCropRate('');
    loadTenantData(selectedTenant.id); // reload
  };

  const handleLogout = () => {
    localStorage.removeItem('active_tenant');
    router.push('/login');
  };

  if (!seller) return <div className="p-8 text-center animate-pulse">Loading Seller Profile...</div>;

  // VIEW 1: TENANT SELECTOR
  if (!selectedTenant) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 font-sans">
        <div className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm">
          <div>
            <h1 className="font-bold text-lg text-slate-800">Welcome,</h1>
            <p className="text-sm text-slate-500 font-semibold">{seller.phone}</p>
          </div>
          <button onClick={handleLogout} className="p-2 bg-rose-50 text-rose-600 rounded-lg">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        
        <h2 className="font-black text-xl text-slate-900 mb-4">Select Agency / Owner</h2>
        <div className="space-y-3">
          {linkedTenants.length === 0 ? (
            <div className="p-4 bg-amber-50 text-amber-700 rounded-xl text-sm font-semibold">
              You are not registered with any Agencies yet. Ask an Agency Owner to add you as a Customer using your Mobile Number.
            </div>
          ) : (
            linkedTenants.map(t => (
              <button 
                key={t.id} 
                onClick={() => selectTenant(t)}
                className="w-full bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between active:scale-95 transition-transform"
              >
                <div className="text-left">
                  <h3 className="font-bold text-lg text-slate-900">{t.companyName || t.businessName || 'Agency'}</h3>
                  <p className="text-xs text-slate-500 font-semibold">{t.tagline || 'View your bills and enter rates'}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <ArrowRight className="w-5 h-5 text-blue-600" />
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
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      {/* Header */}
      <div className="bg-white px-4 py-4 shadow-sm border-b border-slate-200 sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedTenant(null)} className="p-2 bg-slate-100 rounded-lg">
            <ArrowRight className="w-5 h-5 text-slate-600 rotate-180" />
          </button>
          <div>
            <h1 className="font-bold text-slate-900">{selectedTenant.companyName || selectedTenant.businessName}</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Seller Portal</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-4 gap-2">
        <button 
          onClick={() => setActiveTab('DISPATCHES')}
          className={\`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all \${activeTab === 'DISPATCHES' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}\`}
        >
          <Truck className="w-4 h-4" /> Dispatches
        </button>
        <button 
          onClick={() => setActiveTab('RATES')}
          className={\`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all \${activeTab === 'RATES' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200'}\`}
        >
          <TrendingUp className="w-4 h-4" /> Market Rates
        </button>
      </div>

      {/* Content */}
      <div className="px-4">
        {activeTab === 'DISPATCHES' && (
          <div className="space-y-4">
            {dispatches.length === 0 ? (
              <p className="text-center text-slate-500 font-semibold py-8">No dispatch bills found.</p>
            ) : (
              dispatches.map(bill => (
                <div key={bill.id} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
                  <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-black text-slate-900">{bill.billNo || 'BILL'}</h3>
                      <p className="text-xs text-slate-500 font-semibold">{new Date(bill.date).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 font-bold">NET TOTAL</p>
                      <p className="font-black text-blue-600 text-lg">₹{bill.netAmount || 0}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <p className="text-[10px] text-slate-400 uppercase">Vehicle</p>
                      <p className="text-slate-900">{bill.vehicleNumber || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg">
                      <p className="text-[10px] text-slate-400 uppercase">Driver</p>
                      <p className="text-slate-900">{bill.driverName || 'N/A'}</p>
                    </div>
                  </div>

                  {bill.photoUrl && (
                    <div className="mt-2">
                      <button 
                        onClick={() => {
                          const w = window.open();
                          if (w) w.document.write(`<img src="${bill.photoUrl}" style="max-width:100%;" />`);
                        }}
                        className="w-full bg-slate-100 hover:bg-slate-200 py-2 rounded-lg text-xs font-bold text-slate-700 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ImageIcon className="w-4 h-4" /> View Dispatch Photo / Receipt
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'RATES' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-2">Provide Live Market Rates</h3>
              <p className="text-xs text-slate-500 font-semibold mb-4">The agency owner will see these rates instantly on their dashboard.</p>
              
              <form onSubmit={handleAddRate} className="space-y-3">
                <input 
                  type="text" 
                  required
                  placeholder="Crop Name (e.g. Strawberry A)"
                  value={newCropName}
                  onChange={e => setNewCropName(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                />
                <input 
                  type="number" 
                  required
                  placeholder="Rate per KG (e.g. 250)"
                  value={newCropRate}
                  onChange={e => setNewCropRate(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold"
                />
                <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl text-sm">
                  UPDATE RATE
                </button>
              </form>
            </div>

            <h3 className="font-bold text-slate-700 text-sm pl-2 pt-4">Your Recent Rate Updates</h3>
            <div className="space-y-2">
              {cropRates.length === 0 ? (
                <p className="text-center text-slate-500 font-semibold text-xs py-4">No rates provided yet.</p>
              ) : (
                cropRates.map(rate => (
                  <div key={rate.id} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                    <div>
                      <p className="font-bold text-slate-900">{rate.cropName}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{new Date(rate.date).toLocaleString()}</p>
                    </div>
                    <div className="font-black text-emerald-600">
                      ₹{rate.rate}/KG
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
