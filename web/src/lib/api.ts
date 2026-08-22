import { supabase } from './supabase';

export const getTenantId = () => {
  if (typeof window === 'undefined') return null;
  try {
    const t = JSON.parse(sessionStorage.getItem('active_tenant') || '{}');
    return t.id || null;
  } catch {
    return null;
  }
};

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
    const inventory = await apiGetInventory();

    const parseNum = (val: any): number => {
      if (typeof val === 'number') return val;
      if (!val) return 0;
      return Number(String(val).replace(/[^0-9.-]+/g, '')) || 0;
    };

    const todayStr = new Date().toISOString().split('T')[0];

    const totalFarmers = farmers.length;
    const activeFarmers = farmers.filter((f: any) => f.status !== 'INACTIVE').length || totalFarmers;
    
    // Filter for today
    const todaysPurchasesList = purchases.filter((p: any) => p.purchaseDate?.startsWith(todayStr));
    const todaysSalesList = sales.filter((s: any) => s.saleDate?.startsWith(todayStr));
    const todaysPaymentsList = payments.filter((p: any) => p.paymentDate?.startsWith(todayStr));

    const todaysPurchase = todaysPurchasesList.reduce((acc: number, p: any) => acc + parseNum(p.totalAmount || p.amount), 0);
    const todaysSales = todaysSalesList.reduce((acc: number, s: any) => acc + parseNum(s.totalAmount || s.amount), 0);
    const todaysPayment = todaysPaymentsList.reduce((acc: number, p: any) => acc + parseNum(p.amount), 0);
    
    const totalDue = purchases.reduce((acc: number, p: any) => acc + parseNum(p.dueAmount), 0);
    const inventoryValuation = inventory.reduce((acc: number, i: any) => acc + (i.value || 0), 0);

    return {
      totalFarmers,
      activeFarmers,
      todaysPurchase: `₹${todaysPurchase.toLocaleString('en-IN')}`,
      todaysSales: `₹${todaysSales.toLocaleString('en-IN')}`,
      todaysPayment: `₹${todaysPayment.toLocaleString('en-IN')}`,
      pendingAmount: `₹${totalDue.toLocaleString('en-IN')}`,
      inventoryValue: `₹${inventoryValuation.toLocaleString('en-IN')}`
    };
  } catch (err) {
    return null;
  }
};

// ----------------------------------------------------
// FARMERS API (SUPABASE + RESILIENT FALLBACK)
// ----------------------------------------------------
export const apiGetFarmers = async () => {
  const tenantId = getTenantId();
  if (!tenantId) return [];
  try {
    // In the new architecture, we query TenantFarmerLink joined with SeavaigFarmer
    // But since the actual DB is still just "Farmer" for now until migrations are fully run, 
    // we just use the 'tenantId' filter on the existing Farmer table as a bridge.
    const { data, error } = await supabase.from('Farmer').select('*').eq('tenantId', tenantId).order('createdAt', { ascending: false });
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
          bankName: f.bankName || 'State Bank of India',
          accountNumber: f.accountNumber || '30987654321',
          ifscCode: f.ifscCode || 'SBIN0001234',
        };
      });
      setLocalCache(`seavaig_farmers_cache_${tenantId}`, mapped);
      return mapped;
    }
  } catch {}
  return getLocalCache(`seavaig_farmers_cache_${tenantId}`, []);
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
  const tenantId = getTenantId();
  if (!tenantId) throw new Error('No tenant');
  
  const current = getLocalCache(`seavaig_farmers_cache_${tenantId}`, []);
  const nextNum = current.length + 1;
  const autoCode = `FAR-${String(nextNum).padStart(2, '0')}`;
  const newId = `far-${Date.now()}`;
  
  const farmerObj = {
    id: newId,
    tenantId: tenantId,
    farmerCode: farmerData.farmerIdCode || autoCode,
    name: farmerData.name,
    phone: farmerData.phone,
    password: farmerData.phone, // Default password for APK
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
    status: 'ACTIVE'
  };

  try {
    await supabase.from('Farmer').insert([farmerObj]);
  } catch (e) {
    console.error(e);
  }

  // Update isolated cache
  const mappedObj = {
    ...farmerObj,
    farmerIdCode: farmerObj.farmerCode
  };
  const updated = [mappedObj, ...current];
  setLocalCache(`seavaig_farmers_cache_${tenantId}`, updated);
  return mappedObj;
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
  return updated[0];
};

// ----------------------------------------------------
// GLOBAL MATERIALS REGISTRY
// ----------------------------------------------------
export const apiGetMaterialItems = async () => {
  const tenantId = getTenantId();
  if (!tenantId) return [];
  try {
    const { data, error } = await supabase.from('MaterialItem').select('*').eq('tenantId', tenantId).order('createdAt', { ascending: false });
    if (!error && data) {
      setLocalCache(`seavaig_global_materials_cache_${tenantId}`, data);
      return data;
    }
  } catch {}
  return getLocalCache(`seavaig_global_materials_cache_${tenantId}`, []);
};

export const apiAddMaterialItem = async (name: string) => {
  const tenantId = getTenantId();
  if (!tenantId) throw new Error('No tenant');
  
  const newItem = { id: `mat-${Date.now()}`, tenantId, name };
  try {
    await supabase.from('MaterialItem').insert([newItem]);
  } catch {}
  
  const current = await apiGetMaterialItems();
  const updated = [newItem, ...current];
  setLocalCache(`seavaig_global_materials_cache_${tenantId}`, updated);
  return newItem;
};

// ----------------------------------------------------
// GLOBAL LOCATIONS / STORAGE ROOMS REGISTRY
// ----------------------------------------------------
export const apiGetLocations = async () => {
  const tenantId = getTenantId();
  if (!tenantId) return [];
  try {
    const { data, error } = await supabase.from('Location').select('*').eq('tenantId', tenantId).order('createdAt', { ascending: false });
    if (!error && data) {
      setLocalCache(`seavaig_locations_cache_${tenantId}`, data);
      return data;
    }
  } catch {}
  return getLocalCache(`seavaig_locations_cache_${tenantId}`, []);
};

export const apiAddLocation = async (name: string) => {
  const tenantId = getTenantId();
  if (!tenantId) throw new Error('No tenant');
  
  const newItem = { id: `loc-${Date.now()}`, tenantId, name };
  try {
    await supabase.from('Location').insert([newItem]);
  } catch {}
  
  const current = await apiGetLocations();
  const updated = [newItem, ...current];
  setLocalCache(`seavaig_locations_cache_${tenantId}`, updated);
  return newItem;
};

// ----------------------------------------------------
// PURCHASES API
// ----------------------------------------------------
export const apiGetPurchases = async () => {
  const tenantId = getTenantId();
  if (!tenantId) return [];
  try {
    const { data, error } = await supabase
      .from('Purchase')
      .select('*, items:PurchaseItem(*)')
      .eq('tenantId', tenantId)
      .order('createdAt', { ascending: false });

    if (!error && data && data.length > 0) {
      const farmers = getLocalCache(`seavaig_farmers_cache_${tenantId}`, []);
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
      setLocalCache(`seavaig_purchases_cache_${tenantId}`, mapped);
      return mapped;
    }
  } catch {}
  return getLocalCache(`seavaig_purchases_cache_${tenantId}`, []);
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
  const tenantId = getTenantId();
  if (!tenantId) throw new Error('No tenant');

  const item = purchaseData.items?.[0];
  const purAmt = Number((item?.weightKg || 0) * (item?.ratePerKg || 0));
  const newId = `pur-${Date.now()}`;
  
  const purchaseObj = {
    id: newId,
    tenantId,
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
      tenantId,
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
      tenantId,
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

  const current = getLocalCache(`seavaig_purchases_cache_${tenantId}`, []);
  const updated = [purchaseObj, ...current];
  setLocalCache(`seavaig_purchases_cache_${tenantId}`, updated);

  return purchaseObj;
};

// ----------------------------------------------------
// B2B SALES API (SUPABASE + RESILIENT FALLBACK)
// ----------------------------------------------------
export const apiGetSales = async () => {
  const tenantId = getTenantId();
  if (!tenantId) return [];
  try {
    const { data, error } = await supabase
      .from('Sale')
      .select('*, customer:Customer(*), items:SaleItem(*)')
      .eq('tenantId', tenantId)
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
      setLocalCache(`seavaig_sales_cache_${tenantId}`, mapped);
      return mapped;
    }
  } catch {}
  return getLocalCache(`seavaig_sales_cache_${tenantId}`, []);
};

export const apiCreateSale = async (saleData: any) => {
  const tenantId = getTenantId();
  if (!tenantId) throw new Error('No tenant');

  const newId = saleData.id || `sal-${Date.now()}`;
  const saleObj = {
    id: newId,
    tenantId,
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
      tenantId,
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
      tenantId,
      saleId: saleObj.id,
      cropName: saleObj.cropName,
      grade: 'A_GRADE',
      weightKg: Number(saleObj.totalWeight),
      ratePerKg: Number(saleObj.amount / (saleObj.totalWeight || 1)),
      totalAmount: Number(saleObj.amount),
    }]);
  } catch {}

  const current = getLocalCache(`seavaig_sales_cache_${tenantId}`, []);
  const updated = [saleObj, ...current];
  setLocalCache(`seavaig_sales_cache_${tenantId}`, updated);
  return saleObj;
};

// ----------------------------------------------------
// PAYMENTS API (SUPABASE + RESILIENT FALLBACK)
// ----------------------------------------------------
export const apiGetPayments = async () => {
  const tenantId = getTenantId();
  if (!tenantId) return [];
  try {
    const { data, error } = await supabase
      .from('Payment')
      .select('*, farmer:Farmer(*)')
      .eq('tenantId', tenantId)
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
      setLocalCache(`seavaig_payments_cache_${tenantId}`, mapped);
      return mapped;
    }
  } catch {}
  return getLocalCache(`seavaig_payments_cache_${tenantId}`, []);
};

export const apiCreatePayment = async (payData: any) => {
  const tenantId = getTenantId();
  if (!tenantId) throw new Error('No tenant');

  const newId = `pay-${Date.now()}`;
  const payObj = {
    id: newId,
    tenantId,
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
      tenantId,
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
  const purchasesCache = getLocalCache(`seavaig_purchases_cache_${tenantId}`, []);
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
  setLocalCache(`seavaig_purchases_cache_${tenantId}`, purchasesCache);

  const current = getLocalCache(`seavaig_payments_cache_${tenantId}`, []);
  const farmers = getLocalCache(`seavaig_farmers_cache_${tenantId}`, []);
  const f = farmers.find(f => f.id === payObj.farmerId);
  const cacheObj = {
    ...payObj,
    farmerName: f ? f.name : (payData.farmerName || 'Farmer'),
  };
  const updated = [cacheObj, ...current];
  setLocalCache(`seavaig_payments_cache_${tenantId}`, updated);

  return cacheObj;
};

// ----------------------------------------------------
// OTHER MODULE APIS (CUSTOMERS, WORKERS, TRADERS, EXPENSES)
// ----------------------------------------------------
export const apiGetCustomers = async () => {
  const tenantId = getTenantId();
  if (!tenantId) return [];
  try {
    const { data, error } = await supabase.from('Customer').select('*').eq('tenantId', tenantId).order('createdAt', { ascending: false });
    if (!error && data && data.length > 0) {
      setLocalCache(`seavaig_customers_cache_${tenantId}`, data);
      return data;
    }
  } catch {}
  return getLocalCache(`seavaig_customers_cache_${tenantId}`, []);
};

export const apiCreateCustomer = async (custData: any) => {
  const tenantId = getTenantId();
  if (!tenantId) throw new Error('No tenant');
  
  const current = getLocalCache(`seavaig_customers_cache_${tenantId}`, []);
  const newId = `cust-${Date.now()}`;
  const customerObj = {
    id: newId,
    tenantId,
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
  setLocalCache(`seavaig_customers_cache_${tenantId}`, updated);
  return customerObj;
};

export const apiGetExpenses = async () => {
  const tenantId = getTenantId();
  if (!tenantId) return [];
  try {
    const { data, error } = await supabase.from('Expense').select('*').eq('tenantId', tenantId).order('createdAt', { ascending: false });
    if (!error && data && data.length > 0) {
      setLocalCache(`seavaig_expenses_cache_${tenantId}`, data);
      return data;
    }
  } catch {}
  return getLocalCache(`seavaig_expenses_cache_${tenantId}`, []);
};

export const apiCreateExpense = async (data: any) => {
  const tenantId = getTenantId();
  if (!tenantId) throw new Error('No tenant');
  
  const newId = `exp-${Date.now()}`;
  const expenseObj = { ...data, id: newId, tenantId, expenseNo: newId, date: data.date || new Date().toISOString() };
  try {
    await supabase.from('Expense').insert([expenseObj]);
  } catch {}
  
  const current = getLocalCache(`seavaig_expenses_cache_${tenantId}`, []);
  const updated = [expenseObj, ...current];
  setLocalCache(`seavaig_expenses_cache_${tenantId}`, updated);
  return expenseObj;
};

export const apiGetWorkers = async () => {
  const tenantId = getTenantId();
  if (!tenantId) return [];
  try {
    const { data, error } = await supabase.from('Worker').select('*').eq('tenantId', tenantId).order('createdAt', { ascending: false });
    if (!error && data) {
      setLocalCache(`seavaig_workers_cache_${tenantId}`, data);
      return data;
    }
  } catch {}
  return getLocalCache(`seavaig_workers_cache_${tenantId}`, []);
};

export const apiCreateWorker = async (data: any) => {
  const tenantId = getTenantId();
  if (!tenantId) throw new Error('No tenant');
  
  const current = getLocalCache(`seavaig_workers_cache_${tenantId}`, []);
  const nextNum = current.length + 1;
  const autoCode = `WRK-${String(nextNum).padStart(2, '0')}`;
  
  const workerObj = {
    ...data,
    id: `wrk-${Date.now()}`,
    workerCode: autoCode,
    tenantId
  };
  
  try {
    await supabase.from('Worker').insert([workerObj]);
  } catch (e) {
    console.error(e);
  }
  
  const updated = [workerObj, ...current];
  setLocalCache(`seavaig_workers_cache_${tenantId}`, updated);
  return workerObj;
};
// ----------------------------------------------------
// TRADERS API (SUPABASE INTEGRATED)
// ----------------------------------------------------
export const apiGetTraders = async () => {
  const tenantId = getTenantId();
  if (!tenantId) return [];
  try {
    const { data, error } = await supabase.from('Trader').select('*').eq('tenantId', tenantId).order('createdAt', { ascending: false });
    if (!error && data && data.length > 0) {
      setLocalCache(`seavaig_traders_cache_${tenantId}`, data);
      return data;
    }
  } catch {}
  return getLocalCache(`seavaig_traders_cache_${tenantId}`, []);
};

export const apiCreateTrader = async (trData: any) => {
  const tenantId = getTenantId();
  if (!tenantId) throw new Error('No tenant');
  
  const current = getLocalCache(`seavaig_traders_cache_${tenantId}`, []);
  const newId = trData.id || `trd-${Date.now()}`;
  const traderObj = {
    id: newId,
    tenantId,
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
  setLocalCache(`seavaig_traders_cache_${tenantId}`, updated);
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

export const apiGetInventory = async () => {
  // Aggregate real inventory from Purchases & Sales
  const tenantId = getTenantId();
  if (!tenantId) return [];
  const purchases = await apiGetPurchases();
  const sales = await apiGetSales();
  
  const inventoryMap: any = {};
  
  // Add purchases (Stock IN)
  purchases.forEach((p: any) => {
    (p.items || []).forEach((item: any) => {
      const key = `${item.cropName}_${item.grade}`;
      if (!inventoryMap[key]) {
        inventoryMap[key] = { id: key, cropName: item.cropName, grade: item.grade, availableKg: 0, averageRate: 0, value: 0 };
      }
      inventoryMap[key].availableKg += Number(item.weightKg) || 0;
      inventoryMap[key].averageRate = Number(item.ratePerKg) || 0;
    });
  });

  // Subtract sales (Stock OUT)
  sales.forEach((s: any) => {
    (s.items || []).forEach((item: any) => {
      const key = `${item.cropName}_${item.grade}`;
      if (inventoryMap[key]) {
        inventoryMap[key].availableKg -= Number(item.weightKg) || 0;
      }
    });
  });

  // Filter out empty stock
  const inventory = Object.values(inventoryMap).filter((i: any) => i.availableKg > 0).map((i: any) => ({
    ...i,
    value: i.availableKg * i.averageRate,
    lastUpdated: new Date().toLocaleDateString('en-IN')
  }));

  setLocalCache(`seavaig_inventory_cache_${tenantId}`, inventory);
  return inventory;
};

export const apiGetCrops = async () => {
  const tenantId = getTenantId();
  if (!tenantId) return [];
  try {
    const { data, error } = await supabase.from('Crop').select('*').eq('tenantId', tenantId).order('createdAt', { ascending: false });
    if (!error && data) {
      setLocalCache(`seavaig_crops_cache_${tenantId}`, data);
      return data;
    }
  } catch {}
  return getLocalCache(`seavaig_crops_cache_${tenantId}`, []);
};

export const apiCreateCrop = async (data: any) => {
  const tenantId = getTenantId();
  if (!tenantId) throw new Error('No tenant');
  
  const newItem = { id: `crop-${Date.now()}`, tenantId, ...data };
  try {
    await supabase.from('Crop').insert([newItem]);
  } catch {}
  
  const current = await apiGetCrops();
  const updated = [newItem, ...current];
  setLocalCache(`seavaig_crops_cache_${tenantId}`, updated);
  return newItem;
};

export const apiDeleteCrop = async (id: string) => {
  const tenantId = getTenantId();
  try {
    await supabase.from('Crop').delete().eq('id', id).eq('tenantId', tenantId);
  } catch {}
  return true;
};

export const apiRegisterStaff = async (data: any) => data; // Handled mostly via Worker table API

export const apiGetUsers = async () => {
  // Use the Worker table for users/staff
  const tenantId = getTenantId();
  if (!tenantId) return [];
  try {
    const { data, error } = await supabase.from('Worker').select('*').eq('tenantId', tenantId).order('createdAt', { ascending: false });
    if (!error && data) {
      return data.map((u: any) => ({
        id: u.id,
        name: u.name,
        role: u.role || 'STAFF',
        email: u.phone, // using phone as email display
      }));
    }
  } catch {}
  return getLocalCache(`seavaig_users_cache_${tenantId}`, []);
};

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
export const apiToggleTenantStatus = async (id: string, newStatus: string) => {
  try {
    await supabase.from('Tenant').update({ status: newStatus }).eq('id', id);
  } catch {}

  const existing = getLocalCache('seavaig_tenants_cache', []);
  const updated = existing.map(t => t.id === id ? { ...t, status: newStatus } : t);
  setLocalCache('seavaig_tenants_cache', updated);
  return updated;
};

export const apiCheckFarmerNetwork = async (phone: string) => {
  try {
    const { data, error } = await supabase.from('Farmer').select('*').eq('phone', phone).single();
    if (!error && data) {
      return { found: true, farmer: data };
    }
  } catch {}
  return { found: false };
};

export const apiImportFarmerFromNetwork = async (data: any) => {
  const tenantId = getTenantId();
  if (!tenantId) throw new Error('No tenant');
  
  const linkId = `tfl-${Date.now()}`;
  try {
    await supabase.from('TenantFarmerLink').insert([{
      id: linkId,
      tenantId,
      farmerId: data.id,
      farmerCode: data.farmerCode || `FC-${Math.floor(1000 + Math.random() * 9000)}`,
      advanceBalance: data.advanceBalance || 0,
      outstandingAmount: data.outstandingAmount || 0,
      status: 'ACTIVE'
    }]);
  } catch {}
  
  // Also push to local cache so UI updates
  const existing = await apiGetFarmers();
  const updated = [{ ...data, tenantId, status: 'ACTIVE' }, ...existing];
  setLocalCache(`seavaig_farmers_cache_${tenantId}`, updated);
  
  return data;
};
export const apiGetDailyRates = async () => {
  const tenantId = getTenantId();
  if (!tenantId) return [];
  try {
    const { data, error } = await supabase.from('DailyCropRate').select('*').eq('tenantId', tenantId).order('date', { ascending: false });
    if (!error && data) {
      const mapped = data.map((d: any) => ({
        id: d.id,
        crop: `${d.cropName} ${d.grade || ''}`.trim(),
        rate: d.ratePerKg,
        date: new Date(d.date).toLocaleDateString('en-IN')
      }));
      setLocalCache(`seavaig_dailyrates_cache_${tenantId}`, mapped);
      return mapped;
    }
  } catch {}
  return getLocalCache(`seavaig_dailyrates_cache_${tenantId}`, []);
};

export const apiVerifyPin = async (pin: string) => {
  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem('active_tenant');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.secretPin) {
          return { success: pin === parsed.secretPin };
        }
      } catch {}
    }
  }
  return { success: pin === '1234' };
};

export const apiUpdateDailyRate = async (data: any) => {
  const tenantId = getTenantId();
  if (!tenantId) throw new Error('No tenant');
  
  // Extract crop and grade if possible, or just save as cropName
  const newItem = {
    id: `rate-${Date.now()}`,
    tenantId,
    cropName: data.crop,
    ratePerKg: data.rate,
    date: new Date().toISOString().split('T')[0],
  };

  try {
    await supabase.from('DailyCropRate').insert([newItem]);
  } catch {}
  
  const current = await apiGetDailyRates();
  const updated = [
    { id: newItem.id, crop: newItem.cropName, rate: newItem.ratePerKg, date: 'Today' },
    ...current
  ];
  setLocalCache(`seavaig_dailyrates_cache_${tenantId}`, updated);
  return newItem;
};
