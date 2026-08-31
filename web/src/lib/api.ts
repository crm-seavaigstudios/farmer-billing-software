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
export const apiGetDashboardStats = async (filterStart?: number, filterEnd?: number) => {
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

    const totalFarmers = farmers.length;
    const activeFarmers = farmers.filter((f: any) => f.status !== 'INACTIVE').length || totalFarmers;
    
    // Default to today if no filter passed (for legacy callers)
    const rangeStart = filterStart ?? new Date(new Date().setHours(0,0,0,0)).getTime();
    const rangeEnd = filterEnd ?? new Date(new Date().setHours(23,59,59,999)).getTime();

    const inRange = (dStr: string) => {
      if (!dStr) return false;
      const t = new Date(dStr).getTime();
      return t >= rangeStart && t <= rangeEnd;
    };

    const todaysPurchasesList = purchases.filter((p: any) => inRange(p.createdAt || p.date));
    const todaysSalesList = sales.filter((s: any) => inRange(s.createdAt || s.date));
    const todaysPaymentsList = payments.filter((p: any) => inRange(p.createdAt || p.date));

    const todaysPurchase = todaysPurchasesList.reduce((acc: number, p: any) => acc + parseNum(p.totalAmount || p.amount || p.netAmount), 0);
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
          : totalPurchase - totalPaid;
        return {
          id: f.id,
          farmerIdCode: f.farmerIdCode || `FAR-${f.id.toString().slice(0, 5)}`,
          name: f.name,
          phone: f.phone,
          village: f.village || '',
          taluka: f.taluka || '',
          grade: f.grade || 'A_GRADE',
          totalPurchase,
          totalPaid,
          advanceBalance: f.advanceBalance || 0,
          outstandingAmount: due,
          bankName: f.bankName || '',
          accountNumber: f.accountNumber || '',
          ifscCode: f.ifscCode || '',
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
  const list = getLocalCache(`seavaig_farmers_cache_${getTenantId()}`, []);
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
    farmerIdCode: farmerData.farmerIdCode || autoCode,
    name: farmerData.name,
    phone: farmerData.phone,
    password: farmerData.phone, // Default password for APK
    village: farmerData.village || '',
    taluka: farmerData.taluka || '',
    grade: farmerData.grade || 'A_GRADE',
    totalPurchase: 0,
    totalPaid: 0,
    advanceBalance: Number(farmerData.advanceBalance || 0),
    outstandingAmount: 0,
    bankName: farmerData.bankName || '',
    accountNumber: farmerData.accountNumber || '',
    ifscCode: farmerData.ifscCode || '',
    status: 'ACTIVE'
  };

  try {
    await supabase.from('Farmer').insert([farmerObj]).throwOnError();
  } catch (e) { console.error(e); throw e; }

  // Update isolated cache
  const mappedObj = {
    ...farmerObj,
    farmerIdCode: farmerObj.farmerIdCode
  };
  const updated = [mappedObj, ...current];
  setLocalCache(`seavaig_farmers_cache_${tenantId}`, updated);
  return mappedObj;
};

export const apiGetFarmerMaterials = async (farmerId: string) => {
  const tenantId = getTenantId();
  const cacheKey = tenantId ? `seavaig_material_supplies_cache_${tenantId}` : 'seavaig_material_supplies_cache';
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
      setLocalCache(cacheKey, mapped);
      return mapped;
    }
  } catch {}
  return getLocalCache(cacheKey, []).filter((m: any) => m.farmerId === farmerId);
};

export const apiGetAllFarmerMaterials = async () => {
  const tenantId = getTenantId();
  const cacheKey = tenantId ? `seavaig_material_supplies_cache_${tenantId}` : 'seavaig_material_supplies_cache';
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
      setLocalCache(cacheKey, mapped);
      return mapped;
    }
  } catch {}
  return getLocalCache(cacheKey, []);
};

export const apiDeductFarmerMaterials = async (materialIds: string[], purchaseId: string) => {
  const tenantId = getTenantId();
  if (!tenantId) return;
  try {
    await supabase
      .from('FarmerMaterialPurchase')
      .update({ isDeductedFromBill: true, purchaseBillId: purchaseId })
      .in('id', materialIds);
      
    // Update local cache
    const cacheKey = `seavaig_material_supplies_cache_${tenantId}`;
    const cached = getLocalCache(cacheKey, []);
    const updated = cached.map((m: any) => {
      if (materialIds.includes(m.id)) {
        return { ...m, isDeductedFromBill: true };
      }
      return m;
    });
    setLocalCache(cacheKey, updated);
  } catch (e) {
    console.error('Error deducting materials:', e);
  }
};

export const apiCreateFarmerMaterialPurchase = async (matData: any) => {
  const tenantId = getTenantId();
  const cacheKey = tenantId ? `seavaig_material_supplies_cache_${tenantId}` : 'seavaig_material_supplies_cache';
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

    await apiUpdateFarmerBalance(matObj.farmerId, 0, matObj.totalPrice, 'MATERIAL');
  } catch {}

  const current = getLocalCache(cacheKey, []);
  const updated = [matObj, ...current];
  setLocalCache(cacheKey, updated);
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
    await supabase.from('MaterialItem').insert([newItem]).throwOnError();
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
    await supabase.from('Location').insert([newItem]).throwOnError();
  } catch {}
  
  const current = await apiGetLocations();
  const updated = [newItem, ...current];
  setLocalCache(`seavaig_locations_cache_${tenantId}`, updated);
  return newItem;
};

// ----------------------------------------------------
// PURCHASES API
// ----------------------------------------------------
export const apiGetPurchaseDetails = async (purchaseNo: string) => {
  const tenantId = getTenantId();
  if (!tenantId) return null;
  const { data } = await supabase.from('Purchase')
    .select('*')
    .or(`id.eq.${purchaseNo},purchaseNo.eq.${purchaseNo}`)
    .eq('tenantId', tenantId)
    .single();
  return data;
};

export const apiGetPurchases = async () => {
  const tenantId = getTenantId();
  if (!tenantId) return [];
  try {
    const { data: purchaseData, error } = await supabase
      .from('Purchase')
      .select('*, items:PurchaseItem(*)')
      .eq('tenantId', tenantId)
      .order('createdAt', { ascending: false });

    const { data: farmerData } = await supabase
      .from('Farmer')
      .select('*')
      .eq('tenantId', tenantId);

    if (!error && purchaseData && purchaseData.length > 0) {
      const farmers = farmerData || [];
      const mapped = purchaseData.map((p: any) => {
        const farmer = farmers.find((f: any) => f.id === p.farmerId);
        return {
          id: p.purchaseNo || p.id,
          purchaseNo: p.purchaseNo || p.id,
          farmerId: p.farmerId || '',
          farmerName: p.farmerName || farmer?.name || 'Unknown Farmer',
          phone: farmer?.phone || '',
          village: farmer?.village || '',
          crop: p.items?.[0]?.cropName || p.crop || '',
          weight: p.totalWeight ? `${p.totalWeight} ${p.items?.[0]?.unit || 'KG'}` : (p.weight || '0 KG'),
          rate: p.items?.[0]?.ratePerKg ? `₹${p.items[0].ratePerKg}/${p.items[0].unit || 'KG'}` : (p.rate || '₹0/KG'),
          amount: parseFloat(p.totalAmount) || 0,
          paidAmount: parseFloat(p.paidAmount) || 0,
          dueAmount: parseFloat(p.dueAmount) || 0,
          paymentStatus: p.paymentStatus || 'UNPAID',
          date: p.date || (p.purchaseDate ? p.purchaseDate.split('T')[0] : new Date().toLocaleDateString('en-CA')),
          purchaseDate: p.purchaseDate || p.createdAt || p.date || null,
          storageLocation: p.storageLocation || '',
          items: p.items || [],
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
  if (updateData.storageLocation !== undefined) payload.storageLocation = updateData.storageLocation;
  if (updateData.weight !== undefined) {
    payload.totalWeight = parseFloat(String(updateData.weight).replace(/[^0-9.-]+/g, '')) || 0;
  }
  
  try {
    await supabase.from('Purchase').update(payload).or(`id.eq.${id},purchaseNo.eq.${id}`).throwOnError();
    
    // Update PurchaseItem crop details if modified
    if (updateData.crop !== undefined || updateData.rate !== undefined || updateData.weight !== undefined) {
      const { data: itemData } = await supabase.from('PurchaseItem').select('id').eq('purchaseId', id).limit(1);
      if (itemData && itemData.length > 0) {
        const itemId = itemData[0].id;
        const itemPayload: any = {};
        if (updateData.crop !== undefined) itemPayload.cropName = updateData.crop;
        if (updateData.rate !== undefined) {
          itemPayload.ratePerKg = parseFloat(String(updateData.rate).replace(/[^0-9.-]+/g, '')) || 0;
        }
        if (updateData.weight !== undefined) {
          itemPayload.weightKg = parseFloat(String(updateData.weight).replace(/[^0-9.-]+/g, '')) || 0;
        }
        await supabase.from('PurchaseItem').update(itemPayload).eq('id', itemId);
      }
    }
  } catch {}

  const current = getLocalCache(`seavaig_purchases_cache_${getTenantId()}`, []);
  const updated = current.map((p: any) => (p.id === id ? { ...p, ...updateData } : p));
  setLocalCache(`seavaig_purchases_cache_${getTenantId()}`, updated);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('purchases_changed'));
  return updated;
};

export const apiUpdateFarmerAdvance = async (farmerId: string, amount: number) => {
  try {
    const { data } = await supabase.from('Farmer').select('*').eq('id', farmerId).single();
    if (data) {
      const newAdvance = (data.advanceBalance || 0) + amount;
      const newTotalPaid = (data.totalPaid || 0) + amount;
      const newOutstanding = (data.outstandingAmount || 0) - amount;
      await supabase.from('Farmer').update({
        advanceBalance: newAdvance,
        totalPaid: newTotalPaid,
        outstandingAmount: newOutstanding
      }).eq('id', farmerId).throwOnError();
    }
  } catch {}
  
  const tenantId = getTenantId();
  if (!tenantId) return;
  const farmers = getLocalCache(`seavaig_farmers_cache_${tenantId}`, []);
  const updatedFarmers = farmers.map((f: any) => {
    if (f.id === farmerId) {
      return {
        ...f,
        advanceBalance: (f.advanceBalance || 0) + amount,
        totalPaid: (f.totalPaid || 0) + amount,
        outstandingAmount: (f.outstandingAmount || 0) - amount
      };
    }
    return f;
  });
  setLocalCache(`seavaig_farmers_cache_${tenantId}`, updatedFarmers);
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('farmers_changed'));
};

export const apiUpdateFarmerBalance = async (
  farmerId: string, 
  paidAmt: number, 
  dueAmt: number, 
  type: 'PURCHASE' | 'PAYMENT' | 'MATERIAL' = 'PURCHASE',
  advanceApplied: number = 0
) => {
  try {
    const { data } = await supabase.from('Farmer').select('*').eq('id', farmerId).single();
    if (data) {
      let newTotalPaid = data.totalPaid || 0;
      let newOutstanding = data.outstandingAmount || 0;
      let newAdvance = data.advanceBalance || 0;
      let newTotalPurchase = data.totalPurchase || 0;
      
      if (type === 'PURCHASE') {
        newTotalPaid += paidAmt; // any fresh cash paid on the spot (default 0)
        newOutstanding += dueAmt; // gross purchase amount
        newAdvance = Math.max(0, newAdvance - advanceApplied);
        newTotalPurchase += dueAmt;
      } else if (type === 'PAYMENT') {
        newTotalPaid += paidAmt;
        newOutstanding += dueAmt; // dueAmt is negative, e.g. -paidAmt
      } else if (type === 'MATERIAL') {
        newOutstanding -= dueAmt; // subtract from outstanding (debit/farmer owes us)
      }
      
      await supabase.from('Farmer').update({
        totalPaid: newTotalPaid,
        outstandingAmount: newOutstanding,
        advanceBalance: newAdvance,
        totalPurchase: newTotalPurchase,
      }).eq('id', farmerId).throwOnError();
    }
  } catch {}

  const tenantId = getTenantId();
  if (!tenantId) return;

  const farmers = getLocalCache(`seavaig_farmers_cache_${tenantId}`, []);
  const updatedFarmers = farmers.map((f: any) => {
    if (f.id === farmerId) {
      let newTotalPaid = f.totalPaid || 0;
      let newOutstanding = f.outstandingAmount || 0;
      let newAdvance = f.advanceBalance || 0;
      let newTotalPurchase = f.totalPurchase || 0;
      
      if (type === 'PURCHASE') {
        newTotalPaid += paidAmt;
        newOutstanding += dueAmt;
        newAdvance = Math.max(0, newAdvance - advanceApplied);
        newTotalPurchase += dueAmt;
      } else if (type === 'PAYMENT') {
        newTotalPaid += paidAmt;
        newOutstanding += dueAmt;
      } else if (type === 'MATERIAL') {
        newOutstanding -= dueAmt;
      }
      
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
  setLocalCache(`seavaig_farmers_cache_${tenantId}`, updatedFarmers);
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
    crop: item?.cropName || '',
    weight: `${item?.weightKg || 0} ${item?.unit || 'KG'}`,
    rate: `₹${item?.ratePerKg || 0}/${item?.unit || 'KG'}`,
    amount: purAmt,
    paidAmount: Number(purchaseData.paidAmount || 0),
    dueAmount: Number(purchaseData.dueAmount ?? purAmt),
    paymentStatus: purchaseData.paymentStatus || 'UNPAID',
    date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    storageLocation: purchaseData.storageLocation || ''
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
    }]).throwOnError();
    
    if (item) {
      await supabase.from('PurchaseItem').insert([{
        id: `pitem-${Date.now()}`,
        purchaseId: purchaseObj.id,
        cropName: item.cropName || '',
        weightKg: Number(item.weightKg || 0),
        ratePerKg: Number(item.ratePerKg || 0),
        totalAmount: Number(item.weightKg || 0) * Number(item.ratePerKg || 0),
        unit: item.unit || 'KG',
        grade: item.grade || 'A_GRADE'
      }]).throwOnError();
    }
  } catch (e) { console.error(e); throw e; }
  
  const current = getLocalCache(`seavaig_purchases_cache_${tenantId}`, []);
  const updated = [purchaseObj, ...current];
  setLocalCache(`seavaig_purchases_cache_${tenantId}`, updated);
  if (purchaseData.farmerId) {
    await apiUpdateFarmerBalance(purchaseData.farmerId, 0, purAmt, 'PURCHASE', purchaseData.advanceApplied || 0);
  }
  return purchaseObj;
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
    updatedAt: new Date().toISOString(),
  };

  try {
    await supabase.from('Trader').insert([traderObj]).throwOnError();
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
  const billNo = newId; // Make billNo visually consistent with ID
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
    await supabase.from('TraderPurchase').insert([tpObj]).throwOnError();
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
      
      await supabase.from('TraderPurchase').update(payload).eq('id', data.id).throwOnError();
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
      }).eq('id', traderId).throwOnError();
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
    if (typeof s.items === 'string') {
      const parts = s.items.split(',');
      parts.forEach((part: string) => {
        const match = part.match(/^\s*(.*?)\s*\(\s*(\d+)\s*KG\s*\)/i);
        if (match) {
          const cropName = match[1].trim();
          const weightKg = Number(match[2]) || 0;
          const key = `${cropName}_A_GRADE`;
          if (inventoryMap[key]) {
            inventoryMap[key].availableKg -= weightKg;
          } else {
            const matchedKey = Object.keys(inventoryMap).find(k => k.toLowerCase().startsWith(cropName.toLowerCase()));
            if (matchedKey) {
              inventoryMap[matchedKey].availableKg -= weightKg;
            }
          }
        }
      });
    } else if (Array.isArray(s.items)) {
      s.items.forEach((item: any) => {
        const key = `${item.cropName}_${item.grade || 'A_GRADE'}`;
        if (inventoryMap[key]) {
          inventoryMap[key].availableKg -= Number(item.weightKg) || 0;
        }
      });
    }
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
    await supabase.from('Crop').insert([newItem]).throwOnError();
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

export const apiRegisterStaff = async (data: any) => {
  const tenantId = getTenantId();
  if (!tenantId) return data;
  try {
    const userObj = {
      id: `usr-${Date.now()}`,
      tenantId,
      name: data.name,
      email: data.email || `staff${Date.now()}@seavaig.com`,
      password: data.password || '123456',
      phone: data.phone || '',
      role: data.role || 'MANAGER',
      updatedAt: new Date().toISOString(),
    };
    await supabase.from('User').insert([userObj]).throwOnError();
    return userObj;
  } catch (e) {
    console.error('Error registering staff:', e);
    throw e;
  }
};

export const apiGetUsers = async () => {
  const tenantId = getTenantId();
  if (!tenantId) return [];
  try {
    const { data, error } = await supabase.from('User').select('*').eq('tenantId', tenantId).order('createdAt', { ascending: false });
    if (!error && data) {
      return data;
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
    }]).throwOnError();
  } catch {}

  const existing = getLocalCache('seavaig_tenants_cache', []);
  const updated = [newTenant, ...existing];
  setLocalCache('seavaig_tenants_cache', updated);
  return newTenant;
};
export const apiToggleTenantStatus = async (id: string, newStatus: string) => {
  try {
    await supabase.from('Tenant').update({ status: newStatus }).eq('id', id).throwOnError();
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
    await supabase.from('DailyCropRate').insert([newItem]).throwOnError();
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
    }).eq('id', tenantId).throwOnError();
    
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
    }]).throwOnError();
  } catch (e) { console.error(e); throw e; }
};


export const apiGetWorkers = async () => {
  const tenantId = getTenantId();
  if (!tenantId) return getLocalCache('seavaig_workers_cache', []);
  const { data } = await supabase.from('DailyWorker').select('*').eq('tenantId', tenantId).order('createdAt', { ascending: false });
  return data || [];
};

export const apiCreateWorker = async (workerData: any) => {
  const tenantId = getTenantId();
  if (!tenantId) throw new Error('No tenant');
  
  const today = new Date();
  const ddmmyy = String(today.getDate()).padStart(2, '0') + String(today.getMonth() + 1).padStart(2, '0') + String(today.getFullYear()).slice(2);
  
  const { data: latestData } = await supabase
    .from('DailyWorker')
    .select('workerCode')
    .eq('tenantId', tenantId)
    .like('workerCode', `W-${ddmmyy}-%`)
    .order('createdAt', { ascending: false })
    .limit(1);

  let serial = 1;
  if (latestData && latestData.length > 0) {
    const latestStr = latestData[0].workerCode || '';
    const parts = latestStr.split('-');
    if (parts.length > 2) {
      serial = parseInt(parts[2], 10) + 1;
    }
  }
  const workerCode = `W-${ddmmyy}-${String(serial).padStart(2, '0')}`;
  
  try {
    const workerObj = {
      id: `W${Date.now()}`,
      workerCode,
      name: workerData.name,
      phone: workerData.phone || '',
      role: workerData.role || 'LABOUR',
      dailyRate: Number(workerData.dailyRate || 0),
      status: workerData.status || 'ACTIVE',
      totalEarned: Number(workerData.totalEarned || 0),
      totalPaid: Number(workerData.totalPaid || 0),
      outstandingBalance: Number(workerData.outstandingBalance || 0),
      tenantId,
      updatedAt: new Date().toISOString(),
    };
    await supabase.from('DailyWorker').insert([workerObj]).throwOnError();
    return workerObj;
  } catch (e) { console.error(e); throw e; }
};

export const apiGetPayments = async () => {
  const tenantId = getTenantId();
  if (!tenantId) return getLocalCache('seavaig_payments_cache', []);
  const { data } = await supabase.from('Payment').select('*, farmer:Farmer(name, phone, village)').eq('tenantId', tenantId).order('createdAt', { ascending: false });
  if (data && data.length > 0) {
    const mapped = data.map(p => ({
      ...p,
      farmerName: p.farmerName || p.farmer?.name || 'Unknown Farmer',
      phone: p.farmer?.phone || '',
      village: p.farmer?.village || '',
      method: p.paymentMode || 'CASH',
      status: p.status || 'COMPLETED',
      date: p.date || (p.paymentDate ? p.paymentDate.split('T')[0] : new Date(p.createdAt).toLocaleDateString('en-CA')),
    }));
    setLocalCache(`seavaig_payments_cache_${tenantId}`, mapped);
    return mapped;
  }
  return [];
};

export const apiCreatePayment = async (payData: any) => {
  const tenantId = getTenantId();
  if (!tenantId) throw new Error('No tenant');
  
  const today = new Date();
  const mmyy = String(today.getMonth() + 1).padStart(2, '0') + String(today.getFullYear()).slice(2);
  
  const { data: latestData } = await supabase
    .from('Payment')
    .select('paymentNo')
    .eq('tenantId', tenantId)
    .like('paymentNo', `PV-${mmyy}-%`)
    .order('createdAt', { ascending: false })
    .limit(1);

  let serial = 1;
  if (latestData && latestData.length > 0) {
    const latestStr = latestData[0].paymentNo || '';
    const parts = latestStr.split('-');
    if (parts.length > 2) {
      serial = parseInt(parts[2], 10) + 1;
    }
  }
  const paymentNo = `PV-${mmyy}-${String(serial).padStart(3, '0')}`;
  
  try {
    await supabase.from('Payment').insert([{ ...payData, id: `PAY${Date.now()}`, paymentNo, tenantId }]);
  } catch (e) { console.error(e); throw e; }
};

export const apiGetCustomers = async () => {
  const tenantId = getTenantId();
  if (!tenantId) return getLocalCache('seavaig_customers_cache', []);
  const { data } = await supabase.from('Customer').select('*').eq('tenantId', tenantId).order('createdAt', { ascending: false });
  return data || [];
};

export const apiCreateCustomer = async (custData: any) => {
  const tenantId = getTenantId();
  if (!tenantId) throw new Error('No tenant');
  
  const current = getLocalCache(`seavaig_customers_cache_${tenantId}`, []);
  const newId = custData.id || `CUST-${Date.now()}`;
  
  const customerObj = {
    id: newId,
    customerIdCode: custData.customerIdCode || `C-${Math.floor(1000 + Math.random() * 9000)}`,
    tenantId,
    name: custData.name,
    contactPerson: custData.company || custData.name,
    phone: custData.phone,
    email: custData.email || '',
    gstNumber: custData.gstin || custData.gstNumber || '',
    address: custData.address || '',
    totalSales: typeof custData.totalPurchases === 'number' ? custData.totalPurchases : Number(String(custData.totalPurchases || '0').replace(/[^0-9.-]+/g, '')),
    totalReceived: 0,
    outstandingAmount: typeof custData.outstanding === 'number' ? custData.outstanding : Number(String(custData.outstanding || '0').replace(/[^0-9.-]+/g, '')),
    status: custData.status || 'ACTIVE',
    updatedAt: new Date().toISOString(),
  };

  try {
    await supabase.from('Customer').insert([customerObj]).throwOnError();
  } catch (e) {
    console.error('Error creating customer:', e);
    throw e;
  }

  const updated = [customerObj, ...current];
  setLocalCache(`seavaig_customers_cache_${tenantId}`, updated);
  return customerObj;
};

export const apiGetExpenses = async () => {
  const tenantId = getTenantId();
  if (!tenantId) return getLocalCache('seavaig_expenses_cache', []);
  const { data } = await supabase.from('Expense').select('*').eq('tenantId', tenantId).order('createdAt', { ascending: false });
  return data || [];
};

export type TimelineFilter = 'ALL_TIME' | 'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'WEEK' | 'MONTH' | 'SEASON' | 'CUSTOM';

export function getTimelineDateRange(filter: TimelineFilter, customStart?: string, customEnd?: string): { start: number; end: number } {
  const now = new Date();
  
  const endObj = new Date(now);
  endObj.setHours(23, 59, 59, 999);
  
  let startObj = new Date(now);
  startObj.setHours(0, 0, 0, 0);

  if (filter === 'TODAY') {
    // Start is already 00:00:00 today
  } else if (filter === 'YESTERDAY') {
    startObj.setDate(startObj.getDate() - 1);
    endObj.setDate(endObj.getDate() - 1);
    endObj.setHours(23, 59, 59, 999);
  } else if (filter === 'WEEK' || filter === 'THIS_WEEK') {
    const day = startObj.getDay();
    const diff = startObj.getDate() - day + (day === 0 ? -6 : 1);
    startObj.setDate(diff);
  } else if (filter === 'MONTH' || filter === 'THIS_MONTH') {
    startObj.setDate(1);
  } else if (filter === 'SEASON') {
    startObj.setMonth(0, 1);
  } else if (filter === 'CUSTOM' && customStart && customEnd) {
    startObj = new Date(customStart);
    startObj.setHours(0, 0, 0, 0);
    const customEndObj = new Date(customEnd);
    customEndObj.setHours(23, 59, 59, 999);
    return { start: startObj.getTime(), end: customEndObj.getTime() };
  } else if (filter === 'ALL_TIME') {
    return { start: 0, end: endObj.getTime() };
  }
  
  return { start: startObj.getTime(), end: endObj.getTime() };
}
