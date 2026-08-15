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
    const totalPurchases = purchases.reduce((acc: number, p: any) => acc + (Number(p.amount || 0)), 0);
    const totalSales = sales.reduce((acc: number, s: any) => acc + (Number(s.amount || s.totalAmount || 0)), 0);
    const totalPaid = payments.reduce((acc: number, p: any) => acc + (Number(p.amount || 0)), 0);
    const totalDue = purchases.reduce((acc: number, p: any) => acc + (Number(p.dueAmount || 0)), 0);

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
    const { data, error } = await supabase.from('Farmer').select('*').order('createdAt', { ascending: false });
    if (!error && data && data.length > 0) {
      const mapped = data.map((f: any) => {
        const totalPurchase = f.totalPurchase || 0;
        const totalPaid = f.totalPaid || 0;
        const due = f.outstandingAmount !== undefined && f.outstandingAmount !== null 
          ? f.outstandingAmount 
          : Math.max(0, totalPurchase - totalPaid);
        return {
          id: f.id,
          farmerIdCode: f.farmerCode || `FAR-${f.id.toString().slice(0, 5)}`,
          name: f.name,
          phone: f.phone,
          village: f.village || 'Nandgaon',
          taluka: f.taluka || 'Nashik',
          grade: f.grade || 'A_GRADE',
          totalPurchase,
          totalPaid,
          advanceBalance: f.advanceBalance || 0,
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
    const { data } = await supabase.from('Farmer').select('*').eq('id', id).single();
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
    grade: farmerData.grade || 'A_GRADE',
    totalPurchase: 0,
    totalPaid: 0,
    advanceBalance: Number(farmerData.advanceBalance || 0),
    outstandingAmount: 0,
    bankName: farmerData.bankName || 'State Bank of India',
    accountNumber: farmerData.accountNumber || '30987654321',
    ifscCode: farmerData.ifscCode || 'SBIN0001234',
  };

  try {
    await supabase.from('Farmer').insert([{
      id: farmerObj.id,
      farmerCode: farmerObj.farmerIdCode,
      name: farmerObj.name,
      phone: farmerObj.phone,
      village: farmerObj.village,
      taluka: farmerObj.taluka,
      district: farmerData.district || 'Nashik',
      aadhaarNumber: farmerData.aadhaarNumber || '',
      bankName: farmerObj.bankName,
      accountNumber: farmerObj.accountNumber,
      ifscCode: farmerObj.ifscCode,
      grade: farmerObj.grade,
      status: 'ACTIVE',
      totalPurchase: 0,
      totalPaid: 0,
      outstandingAmount: 0,
      advanceBalance: farmerObj.advanceBalance,
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
      .from('FarmerMaterialPurchase')
      .select('*')
      .eq('farmerId', farmerId)
      .order('createdAt', { ascending: false });

    if (!error && data && data.length > 0) {
      const mapped = data.map((m: any) => ({
        id: m.id,
        farmerId: m.farmerId,
        itemName: m.itemName,
        quantity: m.quantity || 1,
        unit: m.unit || 'QTY',
        unitPrice: m.unitPrice || 0,
        totalPrice: m.totalAmount || 0,
        date: m.date ? new Date(m.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        isDeductedFromBill: m.isDeductedFromBill,
      }));
      setLocalCache('seavaig_material_supplies_cache', mapped);
      return mapped;
    }
  } catch {}
  return getLocalCache('seavaig_material_supplies_cache', []).filter((m: any) => m.farmerId === farmerId);
};

export const apiGetAllFarmerMaterials = async () => {
  try {
    const { data, error } = await supabase
      .from('FarmerMaterialPurchase')
      .select('*')
      .order('createdAt', { ascending: false });

    if (!error && data && data.length > 0) {
      const mapped = data.map((m: any) => ({
        id: m.id,
        farmerId: m.farmerId,
        itemName: m.itemName,
        quantity: m.quantity || 1,
        unit: m.unit || 'QTY',
        unitPrice: m.unitPrice || 0,
        totalPrice: m.totalAmount || 0,
        date: m.date ? new Date(m.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        isDeductedFromBill: m.isDeductedFromBill,
      }));
      setLocalCache('seavaig_material_supplies_cache', mapped);
      return mapped;
    }
  } catch {}
  return getLocalCache('seavaig_material_supplies_cache', []);
};

export const apiCreateFarmerMaterialPurchase = async (matData: any) => {
  const newId = `mat-${Date.now()}`;
  const matObj = {
    id: newId,
    farmerId: matData.farmerId,
    itemName: matData.itemName,
    quantity: Number(matData.quantity || 1),
    unit: matData.unit || 'QTY',
    unitPrice: Number(matData.unitPrice || 0),
    totalPrice: Number(matData.quantity || 1) * Number(matData.unitPrice || 0),
    date: new Date().toISOString().split('T')[0],
    isDeductedFromBill: false,
  };

  try {
    await supabase.from('FarmerMaterialPurchase').insert([{
      id: matObj.id,
      farmerId: matObj.farmerId,
      itemName: matObj.itemName,
      quantity: matObj.quantity,
      unit: matObj.unit,
      unitPrice: matObj.unitPrice,
      totalAmount: matObj.totalPrice,
      date: new Date(),
      isDeductedFromBill: false,
    }]);

    await apiUpdateFarmerBalance(matObj.farmerId, 0, matObj.totalPrice);
  } catch {}

  const current = getLocalCache('seavaig_material_supplies_cache', []);
  const updated = [matObj, ...current];
  setLocalCache('seavaig_material_supplies_cache', updated);
  return matObj;
};

// ----------------------------------------------------
// PURCHASES API (SUPABASE + RESILIENT FALLBACK)
// ----------------------------------------------------
export const apiGetPurchases = async () => {
  try {
    const { data, error } = await supabase
      .from('Purchase')
      .select('*, items:PurchaseItem(*)')
      .order('createdAt', { ascending: false });

    if (!error && data && data.length > 0) {
      const farmers = getLocalCache('seavaig_farmers_cache', []);
      const mapped = data.map((p: any) => {
        const farmer = farmers.find((f: any) => f.id === p.farmerId);
        return {
          id: p.purchaseNo || p.id,
          purchaseNo: p.purchaseNo || p.id,
          farmerId: p.farmerId || '',
          farmerName: p.farmerName || farmer?.name || 'Farmer',
          phone: farmer?.phone || '',
          village: farmer?.village || 'Nandgaon',
          crop: p.items?.[0]?.cropName || p.crop || 'Strawberry',
          weight: p.totalWeight ? `${p.totalWeight} ${p.items?.[0]?.unit || 'KG'}` : (p.weight || '0 KG'),
          rate: p.items?.[0]?.ratePerKg ? `₹${p.items[0].ratePerKg}/${p.items[0].unit || 'KG'}` : (p.rate || '₹0/KG'),
          amount: parseFloat(p.totalAmount) || 0,
          paidAmount: parseFloat(p.paidAmount) || 0,
          dueAmount: parseFloat(p.dueAmount) || 0,
          paymentStatus: p.paymentStatus || 'UNPAID',
          date: p.purchaseDate ? new Date(p.purchaseDate).toISOString().split('T')[0] : (p.date || new Date().toISOString().split('T')[0]),
        };
      });
      setLocalCache('seavaig_purchases_cache', mapped);
      return mapped;
    }
  } catch {}
  return getLocalCache('seavaig_purchases_cache', []);
};

export const apiUpdatePurchase = async (id: string, updateData: any) => {
  const payload: any = {};
  if (updateData.totalAmount !== undefined) payload.totalAmount = updateData.totalAmount;
  if (updateData.amount !== undefined) payload.totalAmount = updateData.amount; // fallback
  if (updateData.paidAmount !== undefined) payload.paidAmount = updateData.paidAmount;
  if (updateData.dueAmount !== undefined) payload.dueAmount = updateData.dueAmount;
  if (updateData.paymentStatus !== undefined) payload.paymentStatus = updateData.paymentStatus;
  
  try {
    await supabase.from('Purchase').update(payload).eq('purchaseNo', id);
  } catch {}

  const current = getLocalCache('seavaig_purchases_cache', []);
  const updated = current.map((p: any) => (p.id === id ? { ...p, ...updateData } : p));
  setLocalCache('seavaig_purchases_cache', updated);
  return updated;
};

export const apiUpdateFarmerBalance = async (farmerId: string, paidAmt: number, dueAmt: number) => {
  try {
    const { data } = await supabase.from('Farmer').select('*').eq('id', farmerId).single();
    if (data) {
      const newTotalPaid = (data.totalPaid || 0) + paidAmt;
      const newOutstanding = Math.max(0, (data.outstandingAmount || 0) + dueAmt);
      const newAdvance = Math.max(0, (data.advanceBalance || 0) - paidAmt);
      const newTotalPurchase = (data.totalPurchase || 0) + (dueAmt + paidAmt);
      
      await supabase.from('Farmer').update({
        totalPaid: newTotalPaid,
        outstandingAmount: newOutstanding,
        advanceBalance: newAdvance,
        totalPurchase: newTotalPurchase,
      }).eq('id', farmerId);
    }
  } catch {}

  const farmers = getLocalCache('seavaig_farmers_cache', []);
  const updatedFarmers = farmers.map((f: any) => {
    if (f.id === farmerId) {
      const newTotalPaid = (f.totalPaid || 0) + paidAmt;
      const newOutstanding = Math.max(0, (f.outstandingAmount || 0) + dueAmt);
      const newAdvance = Math.max(0, (f.advanceBalance || 0) - paidAmt);
      const newTotalPurchase = (f.totalPurchase || 0) + (dueAmt + paidAmt);
      return {
        ...f,
        totalPaid: newTotalPaid,
        outstandingAmount: newOutstanding,
        advanceBalance: newAdvance,
        totalPurchase: newTotalPurchase,
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
    // 1. Insert Purchase
    await supabase.from('Purchase').insert([{
      id: purchaseObj.id,
      purchaseNo: purchaseObj.purchaseNo,
      farmerId: purchaseObj.farmerId,
      totalWeight: Number(item?.weightKg || 0),
      totalAmount: Number(purchaseObj.amount),
      paidAmount: Number(purchaseObj.paidAmount),
      dueAmount: Number(purchaseObj.dueAmount),
      paymentStatus: purchaseObj.paymentStatus,
      purchaseDate: new Date(),
    }]);

    // 2. Insert Purchase Item
    await supabase.from('PurchaseItem').insert([{
      id: `item-${Date.now()}`,
      purchaseId: purchaseObj.id,
      cropName: purchaseObj.crop,
      grade: 'A_GRADE',
      weightKg: Number(item?.weightKg || 0),
      ratePerKg: Number(item?.ratePerKg || 0),
      unit: item?.unit || 'KG',
      packagingCategory: item?.packagingCategory || 'कॅरेट',
      totalAmount: Number(purchaseObj.amount),
    }]);

    if (purchaseData.farmerId) {
      await apiUpdateFarmerBalance(purchaseData.farmerId, purchaseObj.paidAmount, purchaseObj.dueAmount);
    }
  } catch {}

  const current = getLocalCache('seavaig_purchases_cache', []);
  const updated = [purchaseObj, ...current];
  setLocalCache('seavaig_purchases_cache', updated);

  return purchaseObj;
};

// ----------------------------------------------------
// B2B SALES API (SUPABASE + RESILIENT FALLBACK)
// ----------------------------------------------------
export const apiGetSales = async () => {
  try {
    const { data, error } = await supabase
      .from('Sale')
      .select('*, customer:Customer(*), items:SaleItem(*)')
      .order('createdAt', { ascending: false });
    if (!error && data && data.length > 0) {
      const mapped = data.map((s: any) => ({
        id: s.id,
        invoiceNo: s.invoiceNo || s.id,
        customerName: s.customer?.name || 'Wholesale Customer',
        amount: Number(s.totalAmount || 0),
        totalWeight: Number(s.totalWeight || 0),
        vehicleNo: s.vehicleNo || '',
        date: s.saleDate ? new Date(s.saleDate).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
        status: s.paymentStatus || 'PAID',
        items: s.items?.[0]?.cropName || 'Strawberry Box Shipment',
        farmerBatches: s.traceabilityLotId ? s.traceabilityLotId.split(',') : [],
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
    items: saleData.items || 'Strawberry Box Shipment',
    farmerBatches: saleData.farmerBatches || [],
  };

  try {
    // 1. Insert B2B Sale
    await supabase.from('Sale').insert([{
      id: saleObj.id,
      invoiceNo: saleObj.invoiceNo,
      customerId: saleData.customerId || 'cust-01',
      totalWeight: Number(saleObj.totalWeight),
      totalAmount: Number(saleObj.amount),
      paidAmount: Number(saleObj.amount),
      dueAmount: 0,
      paymentStatus: 'PAID',
      saleDate: new Date(saleObj.date),
      vehicleNo: saleObj.vehicleNo,
      vehicleType: saleData.vehicleType || '14-FT Eicher Container',
      driverName: saleData.driverName || 'Santosh Gaikwad',
      driverPhone: saleData.driverPhone || '9876543210',
      ownerName: saleData.ownerName || 'VRL Transport Logistics',
      ownerPhone: saleData.ownerPhone || '9898989898',
      vehiclePhotoUrl: saleData.vehiclePhotoUrl || '',
      driverSignature: 'SIGNED_DIGITALLY',
      ownerSignature: 'APPROVED_VRL_STAMP',
      traceabilityLotId: saleObj.farmerBatches.join(','),
    }]);

    // 2. Insert Sale Item
    await supabase.from('SaleItem').insert([{
      id: `sale-item-${Date.now()}`,
      saleId: saleObj.id,
      cropName: saleObj.cropName,
      grade: 'A_GRADE',
      weightKg: Number(saleObj.totalWeight),
      ratePerKg: Number(saleObj.amount / (saleObj.totalWeight || 1)),
      totalAmount: Number(saleObj.amount),
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
    const { data, error } = await supabase
      .from('Payment')
      .select('*, farmer:Farmer(*)')
      .order('createdAt', { ascending: false });
    if (!error && data && data.length > 0) {
      const mapped = data.map((p: any) => ({
        id: p.id,
        paymentNo: p.paymentNo || p.id,
        farmerId: p.farmerId || '',
        farmerName: p.farmer?.name || p.farmerName || 'Farmer',
        amount: Number(p.amount || 0),
        method: p.paymentMode || 'CASH',
        notes: p.notes || '',
        date: p.paymentDate ? new Date(p.paymentDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
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
    amount: Number(payData.amount || 0),
    method: payData.paymentMode || 'CASH',
    notes: payData.notes || 'Payment Settlement',
    date: new Date().toISOString().split('T')[0],
  };

  try {
    await supabase.from('Payment').insert([{
      id: payObj.id,
      paymentNo: payObj.paymentNo,
      farmerId: payObj.farmerId,
      purchaseId: payData.purchaseId || null,
      paymentType: payData.paymentType || 'GENERAL_PAYOUT',
      amount: payObj.amount,
      paymentMode: payObj.method,
      paymentDate: new Date(),
      notes: payObj.notes,
    }]);

    if (payData.farmerId) {
      await apiUpdateFarmerBalance(payData.farmerId, payObj.amount, -payObj.amount);

      // FIFO Allocation to Purchases in Supabase
      let remainingPayment = payObj.amount;
      const { data: pendingPurchases } = await supabase
        .from('Purchase')
        .select('*')
        .eq('farmerId', payData.farmerId)
        .gt('dueAmount', 0)
        .order('purchaseDate', { ascending: true });

      if (pendingPurchases && pendingPurchases.length > 0) {
        for (const p of pendingPurchases) {
          if (remainingPayment <= 0) break;
          
          const currentDue = Number(p.dueAmount || 0);
          const currentPaid = Number(p.paidAmount || 0);
          const allocation = Math.min(currentDue, remainingPayment);
          
          const newDue = currentDue - allocation;
          const newPaid = currentPaid + allocation;
          const newStatus = newDue <= 0 ? 'PAID' : 'PARTIAL';
          
          await supabase.from('Purchase').update({
            dueAmount: newDue,
            paidAmount: newPaid,
            paymentStatus: newStatus
          }).eq('id', p.id);
          
          remainingPayment -= allocation;
        }
      }
    }
  } catch {}

  // Update Purchases Cache for FIFO
  const purchasesCache = getLocalCache('seavaig_purchases_cache', []);
  let remainingPaymentCache = payObj.amount;
  // Purchases cache is newest first, so we iterate backwards (oldest first)
  for (let i = purchasesCache.length - 1; i >= 0; i--) {
    const p = purchasesCache[i];
    if (p.farmerId === payData.farmerId && remainingPaymentCache > 0 && p.dueAmount > 0) {
      const allocation = Math.min(p.dueAmount, remainingPaymentCache);
      remainingPaymentCache -= allocation;
      const newDue = p.dueAmount - allocation;
      const newPaid = (p.paidAmount || 0) + allocation;
      const newStatus = newDue <= 0 ? 'PAID' : 'PARTIAL';
      purchasesCache[i] = { ...p, dueAmount: newDue, paidAmount: newPaid, paymentStatus: newStatus };
    }
  }
  setLocalCache('seavaig_purchases_cache', purchasesCache);

  const current = getLocalCache('seavaig_payments_cache', []);
  const farmers = getLocalCache('seavaig_farmers_cache', []);
  const f = farmers.find(f => f.id === payObj.farmerId);
  const cacheObj = {
    ...payObj,
    farmerName: f ? f.name : (payData.farmerName || 'Farmer'),
  };
  const updated = [cacheObj, ...current];
  setLocalCache('seavaig_payments_cache', updated);

  return cacheObj;
};

// ----------------------------------------------------
// OTHER MODULE APIS (CUSTOMERS, WORKERS, TRADERS, EXPENSES)
// ----------------------------------------------------
export const apiGetCustomers = async () => {
  try {
    const { data, error } = await supabase.from('Customer').select('*').order('createdAt', { ascending: false });
    if (!error && data && data.length > 0) {
      setLocalCache('seavaig_customers_cache', data);
      return data;
    }
  } catch {}
  return getLocalCache('seavaig_customers_cache', []);
};

export const apiCreateCustomer = async (custData: any) => {
  const current = getLocalCache('seavaig_customers_cache', []);
  const newId = `cust-${Date.now()}`;
  const customerObj = {
    id: newId,
    customerIdCode: custData.customerIdCode || `CUST-2026-${Math.floor(100 + Math.random() * 900)}`,
    name: custData.name,
    contactPerson: custData.contactPerson || '',
    phone: custData.phone,
    email: custData.email || '',
    gstNumber: custData.gstNumber || '',
    address: custData.address || '',
    totalSales: 0,
    totalReceived: 0,
    outstandingAmount: 0,
    status: 'ACTIVE',
  };

  try {
    await supabase.from('Customer').insert([customerObj]);
  } catch {}

  const updated = [customerObj, ...current];
  setLocalCache('seavaig_customers_cache', updated);
  return customerObj;
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

// ----------------------------------------------------
// TRADERS API (SUPABASE INTEGRATED)
// ----------------------------------------------------
export const apiGetTraders = async () => {
  try {
    const { data, error } = await supabase.from('Trader').select('*').order('createdAt', { ascending: false });
    if (!error && data && data.length > 0) {
      setLocalCache('seavaig_traders_cache', data);
      return data;
    }
  } catch {}
  return getLocalCache('seavaig_traders_cache', []);
};

export const apiCreateTrader = async (trData: any) => {
  const current = getLocalCache('seavaig_traders_cache', []);
  const newId = trData.id || `trd-${Date.now()}`;
  const traderObj = {
    id: newId,
    traderCode: trData.traderCode || `TRD-2026-${Math.floor(100 + Math.random() * 900)}`,
    name: trData.name,
    businessName: trData.businessName || trData.name,
    phone: trData.phone,
    gstNumber: trData.gstNumber || '',
    address: trData.address || '',
    totalPurchased: 0,
    totalPaid: 0,
    dueAmount: 0,
  };

  try {
    await supabase.from('Trader').insert([traderObj]);
  } catch {}

  const updated = [traderObj, ...current];
  setLocalCache('seavaig_traders_cache', updated);
  return traderObj;
};

export const apiGetTraderPurchases = async () => {
  try {
    const { data, error } = await supabase.from('TraderPurchase').select('*, trader:Trader(*)').order('createdAt', { ascending: false });
    if (!error && data && data.length > 0) {
      const mapped = data.map((tp: any) => ({
        id: tp.billNo,
        dbId: tp.id,
        traderId: tp.traderId,
        traderName: tp.trader?.name || 'Trader',
        businessName: tp.trader?.businessName || 'Business',
        itemName: tp.itemName,
        category: tp.category,
        quantity: tp.quantity,
        unit: tp.unit,
        rate: tp.rate,
        totalAmount: tp.totalAmount,
        paidAmount: tp.paidAmount,
        dueAmount: tp.dueAmount,
        paymentStatus: tp.paymentStatus,
        notes: tp.notes,
        vehicleNo: tp.vehicleNo,
        date: tp.createdAt ? new Date(tp.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
      }));
      setLocalCache('seavaig_trader_purchases_cache', mapped);
      return mapped;
    }
  } catch {}
  return getLocalCache('seavaig_trader_purchases_cache', []);
};

export const apiCreateTraderPurchase = async (tpData: any) => {
  const newId = `trd-pur-${Date.now()}`;
  const billNo = tpData.id || `TRD-PUR-${Math.floor(1000 + Math.random() * 9000)}`;
  const totalAmt = Number(tpData.quantity || 1) * Number(tpData.rate || 0);
  const paidAmt = Number(tpData.paidAmount || 0);
  const dueAmt = Math.max(0, totalAmt - paidAmt);

  const tpObj = {
    id: newId,
    billNo: billNo,
    traderId: tpData.traderId,
    itemName: tpData.itemName,
    category: tpData.category || 'PACKAGING',
    quantity: Number(tpData.quantity || 1),
    unit: tpData.unit || 'QTY',
    rate: Number(tpData.rate || 0),
    totalAmount: totalAmt,
    paidAmount: paidAmt,
    dueAmount: dueAmt,
    paymentStatus: dueAmt === 0 ? 'PAID' : (paidAmt > 0 ? 'PARTIAL' : 'UNPAID'),
    vehicleNo: tpData.vehicleNo || '',
    notes: tpData.notes || '',
  };

  try {
    await supabase.from('TraderPurchase').insert([tpObj]);
    await apiUpdateTraderBalance(tpData.traderId, paidAmt, dueAmt);
  } catch {}

  const current = getLocalCache('seavaig_trader_purchases_cache', []);
  const traders = getLocalCache('seavaig_traders_cache', []);
  const trader = traders.find(t => t.id === tpData.traderId);
  const cacheObj = {
    ...tpObj,
    id: billNo,
    dbId: newId,
    traderName: trader ? trader.name : 'Trader',
    businessName: trader ? trader.businessName : 'Business',
    date: new Date().toLocaleDateString('en-IN'),
  };
  const updated = [cacheObj, ...current];
  setLocalCache('seavaig_trader_purchases_cache', updated);
  return cacheObj;
};

export const apiUpdateTraderPurchase = async (billNo: string, updateData: any) => {
  try {
    const { data } = await supabase.from('TraderPurchase').select('*').eq('billNo', billNo).single();
    if (data) {
      const payload: any = {};
      if (updateData.paidAmount !== undefined) payload.paidAmount = updateData.paidAmount;
      if (updateData.dueAmount !== undefined) payload.dueAmount = updateData.dueAmount;
      if (updateData.paymentStatus !== undefined) payload.paymentStatus = updateData.paymentStatus;
      
      await supabase.from('TraderPurchase').update(payload).eq('id', data.id);
    }
  } catch {}

  const current = getLocalCache('seavaig_trader_purchases_cache', []);
  const updated = current.map((p: any) => (p.id === billNo ? { ...p, ...updateData } : p));
  setLocalCache('seavaig_trader_purchases_cache', updated);
  return updated;
};

export const apiUpdateTraderBalance = async (traderId: string, paidAmt: number, dueAmt: number) => {
  try {
    const { data } = await supabase.from('Trader').select('*').eq('id', traderId).single();
    if (data) {
      const newTotalPurchased = (data.totalPurchased || 0) + (dueAmt + paidAmt);
      const newTotalPaid = (data.totalPaid || 0) + paidAmt;
      const newDue = Math.max(0, (data.dueAmount || 0) + dueAmt);
      
      await supabase.from('Trader').update({
        totalPurchased: newTotalPurchased,
        totalPaid: newTotalPaid,
        dueAmount: newDue,
      }).eq('id', traderId);
    }
  } catch {}

  const traders = getLocalCache('seavaig_traders_cache', []);
  const updated = traders.map((t: any) => {
    if (t.id === traderId) {
      const newTotalPurchased = (t.totalPurchased || 0) + (dueAmt + paidAmt);
      const newTotalPaid = (t.totalPaid || 0) + paidAmt;
      const newDue = Math.max(0, (t.dueAmount || 0) + dueAmt);
      return {
        ...t,
        totalPurchased: newTotalPurchased,
        totalPaid: newTotalPaid,
        dueAmount: newDue,
      };
    }
    return t;
  });
  setLocalCache('seavaig_traders_cache', updated);
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

export const apiGetInventory = async () => getLocalCache('seavaig_inventory_cache', []);

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
    const { data, error } = await supabase.from('Tenant').select('*').order('createdAt', { ascending: false });
    if (!error && data && data.length > 0) {
      const mapped = data.map((t: any) => ({
        id: t.id,
        companyCode: t.companyCode,
        companyName: t.companyName,
        ownerName: t.ownerName,
        ownerEmail: t.ownerEmail,
        ownerPhone: t.ownerPhone,
        passportOrGovId: t.passportOrGovId || '',
        status: t.status || 'ACTIVE',
        package: t.package || 'Enterprise Pro (₹24,999/yr)',
        createdAt: t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN') : 'Just now',
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
    password: tenantData.password || 'password123',
  };

  try {
    await supabase.from('Tenant').insert([{
      id: newTenant.id,
      companyCode: newTenant.companyCode,
      companyName: newTenant.companyName,
      ownerName: newTenant.ownerName,
      ownerEmail: newTenant.ownerEmail,
      ownerPhone: newTenant.ownerPhone,
      passportOrGovId: newTenant.passportOrGovId,
      status: newTenant.status,
      package: newTenant.package,
      password: newTenant.password,
    }]);
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
