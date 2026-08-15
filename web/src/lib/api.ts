import { supabase } from './supabase';

// Helper for local browser persistent fallback when Supabase table isn't present
function getLocalCache(key: string, defaultVal: any[] = []): any[] {
  if (typeof window === 'undefined') return defaultVal;
  const raw = localStorage.getItem(key);
  if (!raw) return defaultVal;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setLocalCache(key: string, val: any[]) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(val));
  }
}

// ----------------------------------------------------
// EXECUTIVE DASHBOARD & STATS ENGINE
// ----------------------------------------------------
export const apiGetDashboardStats = async () => {
  try {
    const farmers = await apiGetFarmers();
    const purchases = await apiGetPurchases();
    const sales = await apiGetSales();
    const payments = await apiGetPayments();

    const totalFarmers = farmers.length;
    const activeFarmers = farmers.filter((f: any) => f.status !== 'INACTIVE').length || totalFarmers;
    const totalPurchases = purchases.reduce((acc: number, p: any) => acc + (Number(p.total_amount || p.netAmount || p.totalAmount || p.grossAmount || 0)), 0);
    const totalSales = sales.reduce((acc: number, s: any) => acc + (Number(s.amount || s.totalAmount || 0)), 0);
    const totalPaid = payments.reduce((acc: number, p: any) => acc + (Number(p.amount || 0)), 0);
    const totalDue = purchases.reduce((acc: number, p: any) => acc + (Number(p.due_amount || p.dueAmount || 0)), 0);

    return {
      totalFarmers,
      activeFarmers,
      todaysPurchase: `₹${totalPurchases.toLocaleString('en-IN')}`,
      todaysSales: `₹${totalSales.toLocaleString('en-IN')}`,
      todaysPayment: `₹${totalPaid.toLocaleString('en-IN')}`,
      pendingAmount: `₹${totalDue.toLocaleString('en-IN')}`,
      netRevenue: `₹${(totalSales - totalPurchases).toLocaleString('en-IN')}`,
      inventoryValue: `₹${Math.round(totalPurchases * 0.4).toLocaleString('en-IN')}`,
    };
  } catch (e) {
    return null;
  }
};

// ----------------------------------------------------
// FARMERS API (SUPABASE + RESILIENT FALLBACK)
// ----------------------------------------------------
export const apiGetFarmers = async () => {
  try {
    const { data, error } = await supabase.from('farmers').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      const mapped = data.map((f: any) => {
        const totalPurchase = f.total_purchases || f.totalPurchase || 0;
        const totalPaid = f.total_paid || f.totalPaid || 0;
        const due = f.outstanding_amount !== undefined && f.outstanding_amount !== null 
          ? f.outstanding_amount 
          : Math.max(0, totalPurchase - totalPaid);
        return {
          id: f.id,
          farmerIdCode: f.farmer_code || f.farmerIdCode || `FAR-${f.id.toString().slice(0, 5)}`,
          name: f.name,
          phone: f.phone,
          village: f.village || 'Nandgaon',
          taluka: f.taluka || 'Nashik',
          grade: f.grade || 'A Grade',
          totalPurchase,
          totalPaid,
          advanceBalance: f.advance_balance || f.advanceBalance || 0,
          outstandingAmount: due,
        };
      });
      setLocalCache('seavaig_farmers_cache', mapped);
      return mapped;
    }
  } catch {}
  return getLocalCache('seavaig_farmers_cache', []);
};

export const apiGetFarmerDetails = async (id: string) => {
  try {
    const { data } = await supabase.from('farmers').select('*').eq('id', id).single();
    if (data) return data;
  } catch {}
  const list = getLocalCache('seavaig_farmers_cache', []);
  return list.find((f: any) => f.id === id || f.farmerIdCode === id) || null;
};

export const apiCreateFarmer = async (farmerData: any) => {
  const current = getLocalCache('seavaig_farmers_cache', []);
  const nextNum = current.length + 1;
  const autoCode = `FAR-${String(nextNum).padStart(2, '0')}`;
  const newId = `far-${Date.now()}`;
  const farmerObj = {
    id: newId,
    farmerIdCode: farmerData.farmerIdCode || autoCode,
    name: farmerData.name,
    phone: farmerData.phone,
    village: farmerData.village || 'Nandgaon',
    taluka: farmerData.taluka || 'Nashik',
    grade: farmerData.grade || 'A Grade',
    totalPurchase: 0,
    totalPaid: 0,
    advanceBalance: Number(farmerData.advanceBalance || 0),
    outstandingAmount: 0,
    bankName: farmerData.bankName || 'State Bank of India',
    accountNumber: farmerData.accountNumber || '30987654321',
    ifscCode: farmerData.ifscCode || 'SBIN0001234',
  };

  try {
    await supabase.from('farmers').insert([{
      name: farmerObj.name,
      phone: farmerObj.phone,
      village: farmerObj.village,
      farmer_code: farmerObj.farmerIdCode,
      advance_balance: farmerObj.advanceBalance,
    }]);
  } catch {}

  const existing = getLocalCache('seavaig_farmers_cache', []);
  const updated = [farmerObj, ...existing];
  setLocalCache('seavaig_farmers_cache', updated);
  return farmerObj;
};

export const apiGetFarmerMaterials = async (farmerId: string) => {
  try {
    const { data, error } = await supabase
      .from('material_supplies')
      .select('*')
      .eq('farmer_id', farmerId)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      const mapped = data.map((m: any) => ({
        id: m.id,
        farmerId: m.farmer_id,
        itemName: m.item_name || m.itemName,
        quantity: m.quantity || 1,
        unitPrice: m.unit_price || m.unitPrice || 0,
        totalPrice: m.total_price || m.totalPrice || 0,
        date: m.created_at ? new Date(m.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today',
      }));
      return mapped;
    }
  } catch {}

  const cache = getLocalCache('seavaig_material_supplies_cache', []);
  return cache.filter((m: any) => m.farmerId === farmerId);
};

export const apiCreateFarmerMaterialPurchase = async (matData: any) => {
  const matObj = {
    id: `mat-${Date.now()}`,
    farmerId: matData.farmerId,
    itemName: matData.itemName,
    quantity: Number(matData.quantity || 1),
    unitPrice: Number(matData.unitPrice || 0),
    totalPrice: Number(matData.quantity || 1) * Number(matData.unitPrice || 0),
    date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
  };

  try {
    await supabase.from('material_supplies').insert([{
      farmer_id: matData.farmerId,
      item_name: matData.itemName,
      quantity: matData.quantity,
      unit_price: matData.unitPrice,
      total_price: matObj.totalPrice,
    }]);
  } catch {}

  const matCache = getLocalCache('seavaig_material_supplies_cache', []);
  setLocalCache('seavaig_material_supplies_cache', [matObj, ...matCache]);

  // Update farmer advance balance
  const farmers = getLocalCache('seavaig_farmers_cache', []);
  const updatedFarmers = farmers.map((f: any) => {
    if (f.id === matData.farmerId) {
      return { ...f, advanceBalance: (f.advanceBalance || 0) + matObj.totalPrice };
    }
    return f;
  });
  setLocalCache('seavaig_farmers_cache', updatedFarmers);
  return matObj;
};

// ----------------------------------------------------
// CROP PURCHASES API (SUPABASE + RESILIENT FALLBACK)
// ----------------------------------------------------
export const apiGetPurchases = async () => {
  try {
    const { data, error } = await supabase.from('purchases').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      const mapped = data.map((p: any) => ({
        id: p.id,
        purchaseNo: p.id,
        farmerId: p.farmer_id || '',
        farmerName: p.farmer_name || 'Farmer',
        crop: p.crop || 'Strawberry',
        weight: p.weight || '0 KG',
        rate: p.rate || '₹0/KG',
        amount: parseFloat(p.amount) || 0,
        paidAmount: parseFloat(p.paid_amount) || 0,
        dueAmount: parseFloat(p.due_amount) || 0,
        paymentStatus: p.payment_status || 'UNPAID',
        date: p.date || new Date().toISOString().split('T')[0],
      }));
      setLocalCache('seavaig_purchases_cache', mapped);
      return mapped;
    }
  } catch {}
  return getLocalCache('seavaig_purchases_cache', []);
};

export const apiUpdatePurchase = async (id: string, updateData: any) => {
  const payload: any = {};
  if (updateData.crop !== undefined) payload.crop = updateData.crop;
  if (updateData.weight !== undefined) payload.weight = updateData.weight;
  if (updateData.rate !== undefined) payload.rate = updateData.rate;
  if (updateData.amount !== undefined) payload.amount = String(updateData.amount);
  if (updateData.paidAmount !== undefined) payload.paid_amount = String(updateData.paidAmount);
  if (updateData.dueAmount !== undefined) payload.due_amount = String(updateData.dueAmount);
  if (updateData.paymentStatus !== undefined) payload.payment_status = updateData.paymentStatus;
  
  try {
    await supabase.from('purchases').update(payload).eq('id', id);
  } catch {}

  const current = getLocalCache('seavaig_purchases_cache', []);
  const updated = current.map((p: any) => (p.id === id ? { ...p, ...updateData } : p));
  setLocalCache('seavaig_purchases_cache', updated);
  return updated;
};

export const apiUpdateFarmerBalance = async (farmerId: string, paidAmt: number, dueAmt: number) => {
  try {
    const { data } = await supabase.from('farmers').select('*').eq('id', farmerId).single();
    if (data) {
      const newTotalPaid = (data.total_paid || 0) + paidAmt;
      const newOutstanding = Math.max(0, (data.outstanding_amount || 0) + dueAmt);
      const newAdvance = Math.max(0, (data.advance_balance || 0) - paidAmt);
      
      await supabase.from('farmers').update({
        total_paid: newTotalPaid,
        outstanding_amount: newOutstanding,
        advance_balance: newAdvance,
      }).eq('id', farmerId);
    }
  } catch {}

  const farmers = getLocalCache('seavaig_farmers_cache', []);
  const updatedFarmers = farmers.map((f: any) => {
    if (f.id === farmerId) {
      const newTotalPaid = (f.totalPaid || 0) + paidAmt;
      const newOutstanding = Math.max(0, (f.outstandingAmount || 0) + dueAmt);
      const newAdvance = Math.max(0, (f.advanceBalance || 0) - paidAmt);
      return {
        ...f,
        totalPaid: newTotalPaid,
        outstandingAmount: newOutstanding,
        advanceBalance: newAdvance,
      };
    }
    return f;
  });
  setLocalCache('seavaig_farmers_cache', updatedFarmers);
};

export const apiCreatePurchase = async (purchaseData: any) => {
  const item = purchaseData.items?.[0];
  const purAmt = Number((item?.weightKg || 0) * (item?.ratePerKg || 0));
  const newId = `pur-${Date.now()}`;
  
  const purchaseObj = {
    id: newId,
    purchaseNo: newId,
    farmerId: purchaseData.farmerId,
    farmerName: purchaseData.farmerName || 'Farmer',
    crop: item?.cropName || 'Strawberry',
    weight: `${item?.weightKg || 0} ${item?.unit || 'KG'}`,
    rate: `₹${item?.ratePerKg || 0}/${item?.unit || 'KG'}`,
    amount: purAmt,
    paidAmount: Number(purchaseData.paidAmount || 0),
    dueAmount: Number(purchaseData.dueAmount ?? purAmt),
    paymentStatus: purchaseData.paymentStatus || 'UNPAID',
    date: new Date().toISOString().split('T')[0],
  };

  try {
    await supabase.from('purchases').insert([{
      id: purchaseObj.id,
      farmer_id: purchaseObj.farmerId,
      farmer_name: purchaseObj.farmerName,
      crop: purchaseObj.crop,
      weight: purchaseObj.weight,
      rate: purchaseObj.rate,
      amount: String(purchaseObj.amount),
      paid_amount: String(purchaseObj.paidAmount),
      due_amount: String(purchaseObj.dueAmount),
      payment_status: purchaseObj.paymentStatus,
      date: purchaseObj.date,
    }]);
  } catch {}

  const current = getLocalCache('seavaig_purchases_cache', []);
  const updated = [purchaseObj, ...current];
  setLocalCache('seavaig_purchases_cache', updated);

  if (purchaseData.farmerId) {
    await apiUpdateFarmerBalance(purchaseData.farmerId, purchaseObj.paidAmount, purchaseObj.dueAmount);
  }

  return purchaseObj;
};

// ----------------------------------------------------
// B2B SALES API (SUPABASE + RESILIENT FALLBACK)
// ----------------------------------------------------
export const apiGetSales = async () => {
  try {
    const { data, error } = await supabase.from('sales').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      const mapped = data.map((s: any) => ({
        id: s.id,
        invoiceNo: s.id.startsWith('INV-') ? s.id : `INV-2026-${s.id.slice(-4)}`,
        customerName: s.customer_name || 'Wholesale Customer',
        amount: Number(s.amount || 0),
        totalWeight: Number(s.total_weight || 0),
        vehicleNo: s.vehicle_no || '',
        date: s.created_at ? new Date(s.created_at).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
        status: 'DISPATCHED',
        items: 'Strawberry Box Shipment',
        farmerBatches: [],
      }));
      setLocalCache('seavaig_sales_cache', mapped);
      return mapped;
    }
  } catch {}
  return getLocalCache('seavaig_sales_cache', []);
};

export const apiCreateSale = async (saleData: any) => {
  const newId = saleData.id || `sal-${Date.now()}`;
  const saleObj = {
    id: newId,
    invoiceNo: saleData.id || `INV-2026-${Math.floor(800 + Math.random() * 200)}`,
    customerName: saleData.customerName || 'Wholesale Customer',
    cropName: saleData.cropName || 'Strawberry A Grade',
    totalWeight: Number(saleData.totalWeight || 0),
    amount: Number(saleData.amount || 0),
    vehicleNo: saleData.vehicleNo || 'MH-15-EG-1234',
    status: saleData.status || 'DISPATCHED',
    date: saleData.date || new Date().toISOString().split('T')[0],
    items: saleData.items || '',
    farmerBatches: saleData.farmerBatches || [],
  };

  try {
    await supabase.from('sales').insert([{
      id: saleObj.id,
      customer_name: saleObj.customerName,
      amount: saleObj.amount,
      total_weight: saleObj.totalWeight,
      vehicle_no: saleObj.vehicleNo,
    }]);
  } catch {}

  const current = getLocalCache('seavaig_sales_cache', []);
  const updated = [saleObj, ...current];
  setLocalCache('seavaig_sales_cache', updated);
  return saleObj;
};

// ----------------------------------------------------
// PAYMENTS API (SUPABASE + RESILIENT FALLBACK)
// ----------------------------------------------------
export const apiGetPayments = async () => {
  try {
    const { data, error } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      const mapped = data.map((p: any) => ({
        id: p.id,
        paymentNo: p.payment_no || p.id,
        farmerId: p.farmer_id || '',
        farmerName: p.farmer_name || 'Farmer',
        amount: Number(p.amount || 0),
        method: p.method || 'CASH',
        notes: p.notes || '',
        date: p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      }));
      setLocalCache('seavaig_payments_cache', mapped);
      return mapped;
    }
  } catch {}
  return getLocalCache('seavaig_payments_cache', []);
};

export const apiCreatePayment = async (payData: any) => {
  const newId = `pay-${Date.now()}`;
  const payObj = {
    id: newId,
    paymentNo: `PAY-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    farmerId: payData.farmerId,
    farmerName: payData.farmerName || 'Farmer',
    amount: Number(payData.amount || 0),
    method: payData.paymentMode || 'CASH',
    notes: payData.notes || 'Payment Settlement',
    date: new Date().toISOString().split('T')[0],
  };

  try {
    await supabase.from('payments').insert([{
      id: payObj.id,
      payment_no: payObj.paymentNo,
      farmer_id: payObj.farmerId,
      farmer_name: payObj.farmerName,
      amount: payObj.amount,
      method: payObj.method,
      notes: payObj.notes,
    }]);
  } catch {}

  const current = getLocalCache('seavaig_payments_cache', []);
  const updated = [payObj, ...current];
  setLocalCache('seavaig_payments_cache', updated);

  if (payData.farmerId) {
    await apiUpdateFarmerBalance(payData.farmerId, payObj.amount, -payObj.amount);
  }

  return payObj;
};


// ----------------------------------------------------
// OTHER MODULE APIS (CUSTOMERS, WORKERS, TRADERS, EXPENSES)
// ----------------------------------------------------
export const apiGetCustomers = async () => getLocalCache('seavaig_customers_cache', []);
export const apiCreateCustomer = async (data: any) => {
  const current = getLocalCache('seavaig_customers_cache', []);
  const updated = [data, ...current];
  setLocalCache('seavaig_customers_cache', updated);
  return data;
};

export const apiGetExpenses = async () => getLocalCache('seavaig_expenses_cache', []);
export const apiCreateExpense = async (data: any) => {
  const current = getLocalCache('seavaig_expenses_cache', []);
  const updated = [data, ...current];
  setLocalCache('seavaig_expenses_cache', updated);
  return data;
};

export const apiGetWorkers = async () => getLocalCache('seavaig_workers_cache', []);
export const apiCreateWorker = async (data: any) => {
  const current = getLocalCache('seavaig_workers_cache', []);
  const updated = [data, ...current];
  setLocalCache('seavaig_workers_cache', updated);
  return data;
};

export const apiGetTraders = async () => getLocalCache('seavaig_traders_cache', []);
export const apiCreateTrader = async (data: any) => {
  const current = getLocalCache('seavaig_traders_cache', []);
  const updated = [data, ...current];
  setLocalCache('seavaig_traders_cache', updated);
  return data;
};

export const apiGetTraderPurchases = async () => getLocalCache('seavaig_trader_purchases_cache', []);
export const apiCreateTraderPurchase = async (data: any) => {
  const current = getLocalCache('seavaig_trader_purchases_cache', []);
  const updated = [data, ...current];
  setLocalCache('seavaig_trader_purchases_cache', updated);
  return data;
};

export const apiRecordAttendance = async (data: any) => {
  const current = getLocalCache('seavaig_attendance_cache', []);
  const updated = [data, ...current];
  setLocalCache('seavaig_attendance_cache', updated);
  return data;
};

export const apiRecordWorkerPayment = async (data: any) => {
  const current = getLocalCache('seavaig_worker_payments_cache', []);
  const updated = [data, ...current];
  setLocalCache('seavaig_worker_payments_cache', updated);
  return data;
};

export const apiGetWorkerHistory = async (id: string) => {
  const current = getLocalCache('seavaig_worker_payments_cache', []);
  return current.filter((item: any) => item.workerId === id);
};

export const apiGetInventory = async () => getLocalCache('seavaig_inventory_cache', [
  { item: 'Plastic Crates (Empty)', total: 500, inUse: 320, available: 180 },
  { item: 'Organic Fertilizer (Bags)', total: 100, inUse: 40, available: 60 },
  { item: 'Strawberry A Grade (Chamber 1)', total: 1200, inUse: 0, available: 1200 },
]);

export const apiGetCrops = async () => [
  { id: 'crop-1', name: 'Strawberry (A Grade)', pricePerKg: 350 },
  { id: 'crop-2', name: 'Strawberry (B Grade)', pricePerKg: 200 },
  { id: 'crop-3', name: 'Pomegranate (Anar)', pricePerKg: 180 },
];
export const apiCreateCrop = async (data: any) => data;
export const apiDeleteCrop = async (id: string) => true;

export const apiRegisterStaff = async (data: any) => data;

export const apiGetUsers = async () => [
  { id: 'usr-1', name: 'Admin Manager', role: 'ADMIN', email: 'admin@seavaig.com' }
];

export const apiGetTenants = async () => {
  try {
    const { data, error } = await supabase.from('tenants').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      const mapped = data.map((t: any) => ({
        id: t.id,
        companyCode: t.company_code || t.companyCode,
        companyName: t.company_name || t.companyName,
        ownerName: t.owner_name || t.ownerName,
        ownerEmail: t.owner_email || t.ownerEmail,
        ownerPhone: t.owner_phone || t.ownerPhone,
        passportOrGovId: t.passport_gov_id || t.passportOrGovId || '',
        status: t.status || 'ACTIVE',
        package: t.package || 'Enterprise Pro (₹24,999/yr)',
        createdAt: t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN') : 'Just now',
        password: t.password || 'password123'
      }));
      setLocalCache('seavaig_tenants_cache', mapped);
      return mapped;
    }
  } catch {}

  try {
    const { data, error } = await supabase.from('agencies').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      const mapped = data.map((t: any) => ({
        id: t.id,
        companyCode: t.company_code || t.companyCode,
        companyName: t.company_name || t.companyName,
        ownerName: t.owner_name || t.ownerName,
        ownerEmail: t.owner_email || t.ownerEmail,
        ownerPhone: t.owner_phone || t.ownerPhone,
        passportOrGovId: t.passport_gov_id || t.passportOrGovId || '',
        status: t.status || 'ACTIVE',
        package: t.package || 'Enterprise Pro (₹24,999/yr)',
        createdAt: t.created_at ? new Date(t.created_at).toLocaleDateString('en-IN') : 'Just now',
        password: t.password || 'password123'
      }));
      setLocalCache('seavaig_tenants_cache', mapped);
      return mapped;
    }
  } catch {}

  return getLocalCache('seavaig_tenants_cache', []);
};

export const apiCreateTenant = async (tenantData: any) => {
  const newTenant = {
    id: tenantData.id || `TEN-${Date.now()}`,
    companyCode: tenantData.companyCode || `COMP-${Math.floor(300 + Math.random() * 600)}`,
    companyName: tenantData.companyName,
    ownerName: tenantData.ownerName,
    ownerEmail: tenantData.ownerEmail,
    ownerPhone: tenantData.ownerPhone,
    passportOrGovId: tenantData.passportOrGovId || tenantData.passportGovId || '',
    status: tenantData.status || 'ACTIVE',
    package: tenantData.package || 'Enterprise Pro (₹24,999/yr)',
    createdAt: new Date().toLocaleDateString('en-IN'),
    password: tenantData.password || 'password123'
  };

  try {
    const { error } = await supabase.from('tenants').insert([{
      company_code: newTenant.companyCode,
      company_name: newTenant.companyName,
      owner_name: newTenant.ownerName,
      owner_email: newTenant.ownerEmail,
      owner_phone: newTenant.ownerPhone,
      passport_gov_id: newTenant.passportOrGovId,
      status: newTenant.status,
      package: newTenant.package,
      password: newTenant.password
    }]);

    if (error) {
      await supabase.from('agencies').insert([{
        company_code: newTenant.companyCode,
        company_name: newTenant.companyName,
        owner_name: newTenant.ownerName,
        owner_email: newTenant.ownerEmail,
        owner_phone: newTenant.ownerPhone,
        passport_gov_id: newTenant.passportOrGovId,
        status: newTenant.status,
        package: newTenant.package,
        password: newTenant.password
      }]);
    }
  } catch {}

  const existing = getLocalCache('seavaig_tenants_cache', []);
  const updated = [newTenant, ...existing];
  setLocalCache('seavaig_tenants_cache', updated);
  return newTenant;
};

export const apiCheckFarmerNetwork = async (phone: string) => ({ found: false });
export const apiImportFarmerFromNetwork = async (data: any) => data;

export const apiGetDailyRates = async () => [
  { crop: 'Strawberry A Grade', rate: 350, date: 'Today' },
  { crop: 'Pomegranate', rate: 180, date: 'Today' }
];
export const apiVerifyPin = async (pin: string) => ({ success: pin === '1234' });
export const apiUpdateDailyRate = async (data: any) => data;
