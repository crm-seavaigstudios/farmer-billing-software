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
      const mapped = data.map((f: any) => ({
        id: f.id,
        farmerIdCode: f.farmer_code || f.farmerIdCode || `FAR-${f.id.toString().slice(0, 5)}`,
        name: f.name,
        phone: f.phone,
        village: f.village || 'Nandgaon',
        taluka: f.taluka || 'Nashik',
        grade: f.grade || 'A Grade',
        totalPurchase: f.total_purchases || f.totalPurchase || 0,
        totalPaid: f.total_paid || f.totalPaid || 0,
        advanceBalance: f.advance_balance || f.advanceBalance || 0,
        outstandingAmount: f.outstanding_amount || f.outstandingAmount || 0,
      }));
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
  const newId = `far-${Date.now()}`;
  const farmerObj = {
    id: newId,
    farmerIdCode: farmerData.farmerIdCode || `FAR-${Math.floor(10000 + Math.random() * 90000)}`,
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

  const current = getLocalCache('seavaig_farmers_cache', []);
  const updated = [farmerObj, ...current];
  setLocalCache('seavaig_farmers_cache', updated);
  return farmerObj;
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
      setLocalCache('seavaig_purchases_cache', data);
      return data;
    }
  } catch {}
  return getLocalCache('seavaig_purchases_cache', []);
};

export const apiCreatePurchase = async (purchaseData: any) => {
  const newId = `pur-${Date.now()}`;
  const purchaseObj = {
    id: newId,
    purchaseBillNo: `PUR-2026-${Math.floor(100 + Math.random() * 900)}`,
    farmerId: purchaseData.farmerId,
    farmerName: purchaseData.farmerName || 'Farmer',
    cropName: purchaseData.crop || 'Strawberry',
    totalQuantityKg: Number(purchaseData.weightKg || purchaseData.quantity || 0),
    ratePerKg: Number(purchaseData.ratePerKg || purchaseData.rate || 0),
    grossAmount: Number(purchaseData.totalAmount || 0),
    paidAmount: Number(purchaseData.paidAmount || 0),
    dueAmount: Number(purchaseData.dueAmount || 0),
    paymentStatus: purchaseData.paymentStatus || 'UNPAID',
    purchaseDate: new Date().toISOString().split('T')[0],
  };

  try {
    await supabase.from('purchases').insert([{
      farmer_id: purchaseObj.farmerId,
      crop_name: purchaseObj.cropName,
      weight_kg: purchaseObj.totalQuantityKg,
      rate_per_kg: purchaseObj.ratePerKg,
      total_amount: purchaseObj.grossAmount,
      due_amount: purchaseObj.dueAmount,
      payment_status: purchaseObj.paymentStatus,
    }]);
  } catch {}

  const current = getLocalCache('seavaig_purchases_cache', []);
  const updated = [purchaseObj, ...current];
  setLocalCache('seavaig_purchases_cache', updated);

  // Update farmer total purchases
  const farmers = getLocalCache('seavaig_farmers_cache', []);
  const updatedFarmers = farmers.map((f: any) => {
    if (f.id === purchaseData.farmerId || f.name === purchaseData.farmerName) {
      return {
        ...f,
        totalPurchase: (f.totalPurchase || 0) + purchaseObj.grossAmount,
        outstandingAmount: (f.outstandingAmount || 0) + purchaseObj.dueAmount,
      };
    }
    return f;
  });
  setLocalCache('seavaig_farmers_cache', updatedFarmers);

  return purchaseObj;
};

// ----------------------------------------------------
// B2B SALES API (SUPABASE + RESILIENT FALLBACK)
// ----------------------------------------------------
export const apiGetSales = async () => {
  try {
    const { data, error } = await supabase.from('sales').select('*').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) {
      setLocalCache('seavaig_sales_cache', data);
      return data;
    }
  } catch {}
  return getLocalCache('seavaig_sales_cache', []);
};

export const apiCreateSale = async (saleData: any) => {
  const newId = `sal-${Date.now()}`;
  const saleObj = {
    id: newId,
    invoiceNo: `INV-2026-${Math.floor(800 + Math.random() * 200)}`,
    customerName: saleData.customerName || 'Wholesale Customer',
    cropName: saleData.cropName || 'Strawberry A Grade',
    quantityKg: Number(saleData.totalWeight || saleData.quantityKg || 0),
    totalAmount: Number(saleData.amount || saleData.totalAmount || 0),
    vehicleNumber: saleData.vehicleNo || 'MH-15-EG-1234',
    cratesDispatched: Number(saleData.cratesDispatched || 20),
    paymentStatus: saleData.status || 'UNPAID',
    saleDate: new Date().toISOString().split('T')[0],
  };

  try {
    await supabase.from('sales').insert([{
      customer_name: saleObj.customerName,
      amount: saleObj.totalAmount,
      total_weight: saleObj.quantityKg,
      vehicle_no: saleObj.vehicleNumber,
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
      setLocalCache('seavaig_payments_cache', data);
      return data;
    }
  } catch {}
  return getLocalCache('seavaig_payments_cache', []);
};

export const apiCreatePayment = async (payData: any) => {
  const newId = `pay-${Date.now()}`;
  const payObj = {
    id: newId,
    voucherNo: `VCH-2026-${Math.floor(500 + Math.random() * 500)}`,
    partyType: payData.paymentType === 'FARMER_PAYOUT' ? 'FARMER' : 'CUSTOMER',
    farmerId: payData.farmerId,
    farmerName: payData.farmerName || 'Farmer',
    amount: Number(payData.amount || 0),
    paymentMethod: payData.paymentMode || 'CASH',
    referenceNo: payData.referenceNo || `REF-${Date.now().toString().slice(-6)}`,
    paymentDate: new Date().toISOString().split('T')[0],
    notes: payData.notes || 'Payment Disbursement',
  };

  try {
    await supabase.from('payments').insert([{
      farmer_id: payData.farmerId,
      amount: payObj.amount,
      payment_mode: payObj.paymentMethod,
      notes: payObj.notes,
    }]);
  } catch {}

  const current = getLocalCache('seavaig_payments_cache', []);
  const updated = [payObj, ...current];
  setLocalCache('seavaig_payments_cache', updated);

  // Deduct from farmer outstanding balance
  if (payData.farmerId) {
    const farmers = getLocalCache('seavaig_farmers_cache', []);
    const updatedFarmers = farmers.map((f: any) => {
      if (f.id === payData.farmerId) {
        return {
          ...f,
          totalPaid: (f.totalPaid || 0) + payObj.amount,
          outstandingAmount: Math.max(0, (f.outstandingAmount || 0) - payObj.amount),
        };
      }
      return f;
    });
    setLocalCache('seavaig_farmers_cache', updatedFarmers);
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

export const apiGetUsers = async () => [
  { id: 'usr-1', name: 'Admin Manager', role: 'ADMIN', email: 'admin@seavaig.com' }
];
export const apiRegisterTenant = async (data: any) => data;
export const apiRegisterStaff = async (data: any) => data;

export const apiCheckFarmerNetwork = async (phone: string) => ({ found: false });
export const apiImportFarmerFromNetwork = async (data: any) => data;

export const apiGetDailyRates = async () => [
  { crop: 'Strawberry A Grade', rate: 350, date: 'Today' },
  { crop: 'Pomegranate', rate: 180, date: 'Today' }
];
export const apiVerifyPin = async (pin: string) => ({ success: pin === '1234' });
export const apiUpdateDailyRate = async (data: any) => data;
