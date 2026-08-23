import { supabase } from './supabase';

export const getTenantId = () => {
  if (typeof window === 'undefined') return null;
  try {
    const t = JSON.parse(localStorage.getItem('active_tenant') || '{}');
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

    const d = new Date();
    const todayStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')}/${d.getFullYear()}`;

    const totalFarmers = farmers.length;
    const activeFarmers = farmers.filter((f: any) => f.status !== 'INACTIVE').length || totalFarmers;
    
    // Filter for today
    const todaysPurchasesList = purchases.filter((p: any) => isToday(p.purchaseDate || p.date));
    const todaysSalesList = sales.filter((s: any) => isToday(s.saleDate || s.date));
    const todaysPaymentsList = payments.filter((p: any) => isToday(p.paymentDate || p.date));

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
  const today = new Date();
  const ddmmyy = String(today.getDate()).padStart(2, '0') + String(today.getMonth() + 1).padStart(2, '0') + String(today.getFullYear()).slice(2);
  
  const { data: latestData } = await supabase
    .from('Purchase')
    .select('purchaseNo')
    .eq('tenantId', tenantId)
    .like('purchaseNo', `${ddmmyy}-%`)
    .order('createdAt', { ascending: false })
    .limit(1);

  let serial = 1;
  if (latestData && latestData.length > 0) {
    const latestStr = latestData[0].purchaseNo || '';
    const parts = latestStr.split('-');
    if (parts.length > 1) {
      serial = parseInt(parts[parts.length - 1], 10) + 1;
    }
  }
  const newId = `${ddmmyy}-${serial}`;
  
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
    date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    storageLocation: purchaseData.storageLocation || 'Main Cold Room'
  };

  try {
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
      purchaseDate: purchaseObj.date,
      date: purchaseObj.date,
      storageLocation: purchaseObj.storageLocation
    }]);
    
    // Also save legacy object in localstate if we wanted to
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
  const tenantId = getTenantId();
  if (!tenantId) throw new Error('No tenant');

  const today = new Date();
  const ddmmyy = String(today.getDate()).padStart(2, '0') + String(today.getMonth() + 1).padStart(2, '0') + String(today.getFullYear()).slice(2);
  
  const { data: latestData } = await supabase
    .from('TraderPurchase')
    .select('billNo')
    .eq('tenantId', tenantId)
    .like('billNo', `TBILL${ddmmyy}-%`)
    .order('createdAt', { ascending: false })
    .limit(1);

  let serial = 1;
  if (latestData && latestData.length > 0) {
    const latestStr = latestData[0].billNo || '';
    const parts = latestStr.split('-');
    if (parts.length > 1) {
      serial = parseInt(parts[parts.length - 1], 10) + 1;
    }
  }
  const newId = `TBILL${ddmmyy}-${serial}`;
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
        password: t.password || 'password123',
        businessNameMr: t.businessNameMr || '',
        subdomain: t.subdomain || '',
        logoUrl: t.logoUrl || '',
        signatureUrl: t.signatureUrl || '',
        addressMr: t.addressMr || '',
        gstin: t.gstin || '',
        tagline: t.tagline || 'Agricultural Procurement System',
        primaryColor: t.primaryColor || '#2563EB',
        secretPin: t.secretPin || '1234'
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
    const stored = localStorage.getItem('active_tenant');
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

export const apiUpdateTenant = async (tenantId: string, data: any) => {
  try {
    const { error } = await supabase.from('Tenant').update({
      businessNameMr: data.businessNameMr,
      subdomain: data.subdomain,
      logoUrl: data.logoUrl,
      signatureUrl: data.signatureUrl,
      addressMr: data.addressMr,
      gstin: data.gstin,
      tagline: data.tagline,
      primaryColor: data.primaryColor,
      secretPin: data.secretPin
    }).eq('id', tenantId);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating tenant:', error);
    return false;
  }
};


export const apiGetSales = async () => {
  const tenantId = getTenantId();
  if (!tenantId) return getLocalCache('seavaig_sales_cache', []);
  const { data } = await supabase.from('Sale').select('*').eq('tenantId', tenantId).order('createdAt', { ascending: false });
  return data || [];
};

export const apiCreateSale = async (saleData: any) => {
  const tenantId = getTenantId();
  if (!tenantId) throw new Error('No tenant');
  
  const today = new Date();
  const ddmmyy = String(today.getDate()).padStart(2, '0') + String(today.getMonth() + 1).padStart(2, '0') + String(today.getFullYear()).slice(2);
  
  const { data: latestData } = await supabase
    .from('Sale')
    .select('billNo')
    .eq('tenantId', tenantId)
    .like('billNo', `${ddmmyy}-%`)
    .order('createdAt', { ascending: false })
    .limit(1);

  let serial = 1;
  if (latestData && latestData.length > 0) {
    const latestStr = latestData[0].billNo || '';
    const parts = latestStr.split('-');
    if (parts.length > 1) {
      serial = parseInt(parts[parts.length - 1], 10) + 1;
    }
  }
  const newId = `${ddmmyy}-${serial}`;
  
  try {
    await supabase.from('Sale').insert([{
      ...saleData,
      id: newId,
      billNo: newId,
      tenantId
    }]);
  } catch (e) {
    console.error(e);
  }
};
