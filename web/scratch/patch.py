import re

with open('src/app/seller-portal/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update state
content = content.replace(
    "const [activeTab, setActiveTab] = useState<'DISPATCHES' | 'RATES'>('DISPATCHES');",
    "const [activeTab, setActiveTab] = useState<'DISPATCHES' | 'RATES' | 'LEDGER'>('DISPATCHES');\n  const [ledger, setLedger] = useState<any[]>([]);"
)

# 2. Update loadTenantData
old_load_tenant_data = '''  const loadTenantData = async (tenantId: string) => {
    // 1. Get Dispatches (Sales) for this Seller under this Tenant
    // Need to find the specific Customer ID for this tenant first
    const { data: custData } = await supabase.from('Customer').select('id').eq('phone', seller.phone).eq('tenantId', tenantId);
    if (custData && custData.length > 0) {
      const custIds = custData.map((c: any) => c.id);
      const { data: sales } = await supabase.from('Sale').select('*').in('customerId', custIds).eq('tenantId', tenantId).order('createdAt', { ascending: false });
      setDispatches(sales || []);
    } else {
      setDispatches([]);
    }

    // 2. Get today's crop rates
    const { data: rates } = await supabase.from('SellerCropRates').select('*').eq('sellerId', seller.id).eq('tenantId', tenantId).order('createdAt', { ascending: false });
    setCropRates(rates || []);
  };'''

new_load_tenant_data = '''  const loadTenantData = async (tenantId: string) => {
    // 1. Get Dispatches (Sales) for this Seller under this Tenant
    const { data: custData } = await supabase.from('Customer').select('id').eq('phone', seller.phone).eq('tenantId', tenantId);
    if (custData && custData.length > 0) {
      const custIds = custData.map((c: any) => c.id);
      
      const [salesRes, paymentsRes] = await Promise.all([
        supabase.from('Sale').select('*').in('customerId', custIds).eq('tenantId', tenantId).order('createdAt', { ascending: false }),
        supabase.from('Payment').select('*').in('entityId', custIds).eq('tenantId', tenantId)
      ]);
      
      const sales = salesRes.data || [];
      setDispatches(sales);
      
      const payments = paymentsRes.data || [];
      const parseCustomDate = (dateStr: any) => {
        if (!dateStr) return new Date(0);
        try {
          if (dateStr.includes('/')) {
            const parts = dateStr.split('/');
            return new Date(parseInt(parts[2]), parseInt(parts[1])-1, parseInt(parts[0]));
          }
          return new Date(dateStr);
        } catch {
          return new Date(0);
        }
      };

      const combined = [
        ...sales.map(s => ({ ...s, _type: 'DISPATCH', _dateObj: parseCustomDate(s.date || s.createdAt) })),
        ...payments.map(p => ({ ...p, _type: 'PAYMENT', _dateObj: parseCustomDate(p.date || p.paymentDate || p.createdAt) }))
      ].sort((a, b) => a._dateObj.getTime() - b._dateObj.getTime());

      let currentBalance = 0;
      const finalLedger = combined.map(item => {
        if (item._type === 'DISPATCH') {
          currentBalance += parseFloat(item.netAmount || item.totalAmount || item.amount || 0);
        } else if (item._type === 'PAYMENT') {
          currentBalance -= parseFloat(item.amount || 0);
        }
        return { ...item, _runningBalance: currentBalance };
      });

      setLedger(finalLedger.reverse());
    } else {
      setDispatches([]);
      setLedger([]);
    }

    // 2. Get today's crop rates
    const { data: rates } = await supabase.from('SellerCropRates').select('*').eq('sellerId', seller.id).eq('tenantId', tenantId).order('createdAt', { ascending: false });
    setCropRates(rates || []);
  };'''

content = content.replace(old_load_tenant_data, new_load_tenant_data)

# 3. Add import if missing (I see CheckCircle used in other places, I'll just rely on what is there or add it)
# We need to add a "markAsReceived" function
mark_as_received_func = '''
  const markAsReceived = async (billId: string) => {
    await supabase.from('Sale').update({ deliveryStatus: 'RECEIVED' }).eq('id', billId);
    if (selectedTenant) {
      loadTenantData(selectedTenant.id);
    }
  };
'''
content = content.replace('  const handleLogout = () => {', mark_as_received_func + '\\n  const handleLogout = () => {')


# 4. Modify the tab buttons to include Ledger
tabs_old = '''      <div className="flex p-4 gap-2">
        <button 
          onClick={() => setActiveTab('DISPATCHES')}
          className={lex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all \}
        >
          <Truck className="w-4 h-4" /> Dispatches
        </button>
        <button 
          onClick={() => setActiveTab('RATES')}
          className={lex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all \}
        >
          <TrendingUp className="w-4 h-4" /> Market Rates
        </button>
      </div>'''

tabs_new = '''      <div className="flex p-4 gap-2">
        <button 
          onClick={() => setActiveTab('DISPATCHES')}
          className={lex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all }
        >
          <Truck className="w-4 h-4" /> Dispatches
        </button>
        <button 
          onClick={() => setActiveTab('LEDGER')}
          className={lex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all }
        >
          <TrendingUp className="w-4 h-4" /> Ledger & Payments
        </button>
        <button 
          onClick={() => setActiveTab('RATES')}
          className={lex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all }
        >
          <TrendingUp className="w-4 h-4" /> Market Rates
        </button>
      </div>'''
# Need to escape $ properly if using python strings, so replace dynamically:
content = content.replace("          className={lex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all }", "          className={lex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all }")
# Just use regex or slice:
content = content.replace(
'''        <button 
          onClick={() => setActiveTab('RATES')}''',
'''        <button 
          onClick={() => setActiveTab('LEDGER')}
          className={lex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all }
        >
          <TrendingUp className="w-4 h-4" /> Ledger
        </button>
        <button 
          onClick={() => setActiveTab('RATES')}'''
)

# 5. Add Ledger content and redesign Dispatch cards
dispatch_old = '''        {activeTab === 'DISPATCHES' && (
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
                      <p className="font-black text-blue-600 text-lg">?{bill.netAmount || 0}</p>
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
                          if (w) w.document.write(<img src="" style="max-width:100%;" />);
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
        )}'''

dispatch_new = '''        {activeTab === 'DISPATCHES' && (
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
                      <span className={px-2 py-1 rounded text-[10px] font-bold }>
                        {bill.deliveryStatus || 'IN TRANSIT'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm">
                    <div>
                      <p className="text-xs text-slate-500 font-bold">NET TOTAL</p>
                      <p className="font-black text-slate-900 text-lg">?{bill.netAmount || 0}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 font-bold">TOTAL WEIGHT</p>
                      <p className="font-black text-slate-900 text-lg">{bill.totalWeight || 0} KG</p>
                    </div>
                  </div>
                  
                  <div className="border border-slate-100 rounded-lg p-2 bg-slate-50 text-xs">
                    <p className="font-bold text-slate-700 mb-1">Owner Details</p>
                    <p className="text-slate-600">{bill.ownerName || selectedTenant?.companyName || 'N/A'}</p>
                    <p className="text-slate-600">{bill.ownerPhone || selectedTenant?.phone || 'N/A'}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-slate-600">
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase">Vehicle No</p>
                      <p className="text-slate-900">{bill.vehicleNumber || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase">Driver Info</p>
                      <p className="text-slate-900">{bill.driverName || 'N/A'}</p>
                      <p className="text-slate-500">{bill.driverPhone || ''}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-2">
                    {bill.photoUrl && (
                      <button 
                        onClick={() => {
                          const w = window.open();
                          if (w) w.document.write(<img src="" style="max-width:100%;" />);
                        }}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 py-2 rounded-lg text-xs font-bold text-slate-700 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ImageIcon className="w-4 h-4" /> Vehicle Photo
                      </button>
                    )}
                    {bill.signatureUrl && (
                      <button 
                        onClick={() => {
                          const w = window.open();
                          if (w) w.document.write(<img src="" style="max-width:100%;" />);
                        }}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 py-2 rounded-lg text-xs font-bold text-slate-700 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ImageIcon className="w-4 h-4" /> Driver Signature
                      </button>
                    )}
                  </div>
                  
                  {bill.deliveryStatus !== 'RECEIVED' && (
                    <button 
                      onClick={() => markAsReceived(bill.id)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl mt-3 text-sm shadow-md"
                    >
                      MARK AS RECEIVED
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'LEDGER' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
              <div>
                <p className="text-xs text-slate-500 font-bold">Current Balance</p>
                <h3 className="text-xl font-black text-slate-900">
                  ?{ledger.length > 0 ? ledger[0]._runningBalance : 0}
                </h3>
              </div>
            </div>
            {ledger.length === 0 ? (
              <p className="text-center text-slate-500 font-semibold py-8">No transactions found.</p>
            ) : (
              <div className="space-y-3">
                {ledger.map((item, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-900">{item._type === 'DISPATCH' ? Bill:  : 'Payment Paid'}</p>
                      <p className="text-[10px] text-slate-500 font-semibold">{new Date(item._dateObj).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className={ont-black }>
                        {item._type === 'DISPATCH' ? '+' : '-'} ?{item._type === 'DISPATCH' ? (item.netAmount || item.totalAmount || item.amount || 0) : (item.amount || 0)}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold">Bal: ?{item._runningBalance}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}'''

content = content.replace(dispatch_old, dispatch_new)

with open('src/app/seller-portal/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("PATCHED")
