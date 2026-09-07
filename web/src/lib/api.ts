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
// UNIVERSAL FARMER MATCHER HELPER
// ----------------------------------------------------
export const isFarmerMatch = (transaction: any, farmer: any): boolean => {
  if (!transaction || !farmer) return false;
  const fId = String(farmer.id || '').trim().toLowerCase();
  const fPhone = String(farmer.phone || '').replace(/[^0-9]/g, '');
  const fCode = String(farmer.farmerIdCode || farmer.code || '').trim().toLowerCase();
  const fName = String(farmer.name || '').trim().toLowerCase();

  const pFarmerId = String(transaction.farmerId || transaction.id || '').trim().toLowerCase();
  const pPhone = String(transaction.phone || '').replace(/[^0-9]/g, '');
  const pCode = String(transaction.farmerIdCode || transaction.code || '').trim().toLowerCase();
  const pName = String(transaction.farmerName || transaction.name || '').trim().toLowerCase();

  // 1. Direct ID match
  if (fId && (pFarmerId === fId || String(transaction.id || '').toLowerCase() === fId || String(transaction.farmerId || '').toLowerCase() === fId)) return true;
  // 2. Phone match (exact or clean digits)
  if (fPhone && (pFarmerId === fPhone || (pPhone && pPhone === fPhone))) return true;
  // 3. Farmer ID code match (e.g. FAR-01)
  if (fCode && (pFarmerId === fCode || pCode === fCode)) return true;
  // 4. Name match (case-insensitive and trimmed)
  if (fName && (pName === fName || pFarmerId === fName)) return true;

  return false;
};

// ----------------------------------------------------
// FARMERS API (SUPABASE + RESILIENT FALLBACK)
// ----------------------------------------------------
export const apiGetFarmers = async () => {
  const tenantId = getTenantId();
  if (!tenantId) return [];
  try {
    const [farmersRes, allPurchases, allPayments, allMaterials] = await Promise.all([
      supabase.from('Farmer').select('*').eq('tenantId', tenantId).order('createdAt', { ascending: false }),
      apiGetPurchases(),
      apiGetPayments(),
      apiGetAllFarmerMaterials(),
    ]);

    const data = (farmersRes.data && farmersRes.data.length > 0)
      ? farmersRes.data
      : getLocalCache(`seavaig_farmers_cache_${tenantId}`, []);

    if (data.length > 0) {
      const mapped = data.map((f: any) => {
        const farmerPurchases = (allPurchases || []).filter((p: any) => isFarmerMatch(p, f));
        const farmerPayments = (allPayments || []).filter((pay: any) => isFarmerMatch(pay, f));
        const farmerMaterials = (allMaterials || []).filter((m: any) => isFarmerMatch(m, f));

        const computedPurchases = farmerPurchases.reduce((sum: number, p: any) => {
          const itemWeight = parseFloat(String(p.weight || p.totalWeight || '0').replace(/[^0-9.-]+/g, '')) || 0;
          const itemRate = parseFloat(String(p.rate || '0').replace(/[^0-9.-]+/g, '')) || 0;
          const calcVal = (itemWeight > 0 && itemRate > 0) ? (itemWeight * itemRate) : 0;
          const rawAmt = p.totalAmount ?? p.amount ?? p.netAmount ?? calcVal ?? 0;
          const parsed = typeof rawAmt === 'number' ? rawAmt : (parseFloat(String(rawAmt).replace(/[^0-9.-]+/g, '')) || 0);
          return sum + (parsed > 0 ? parsed : calcVal);
        }, 0);

        const computedPaid = farmerPayments.reduce((sum: number, pay: any) => {
          const amt = typeof pay.amount === 'number' ? pay.amount : parseFloat(String(pay.amount || 0).replace(/[^0-9.-]+/g, '')) || 0;
          return sum + amt;
        }, 0);

        const computedMaterials = farmerMaterials.reduce((sum: number, m: any) => {
          const amt = typeof m.totalPrice === 'number' ? m.totalPrice : (typeof m.totalAmount === 'number' ? m.totalAmount : parseFloat(String(m.totalAmount || 0).replace(/[^0-9.-]+/g, '')) || 0);
          return sum + amt;
        }, 0);

        const totalPurchase = computedPurchases;
        const totalPaid = computedPaid;
        const totalDebits = computedPaid + computedMaterials;
        const netBalance = computedPurchases - totalDebits;
        const advanceBal = Math.max(0, totalDebits - computedPurchases);
        const due = Math.max(0, netBalance);

        // Auto-heal Supabase record asynchronously if out of sync
        if (computedPurchases !== Number(f.totalPurchase || 0) || computedPaid !== Number(f.totalPaid || 0) || advanceBal !== Number(f.advanceBalance || 0)) {
          supabase.from('Farmer').update({
            totalPurchase,
            totalPaid,
            outstandingAmount: due,
            advanceBalance: advanceBal,
          }).eq('id', f.id).then(() => {}, () => {});
        }

        let cropVariety = '';
        let acreage = '';
        if (f.avatarUrl && typeof f.avatarUrl === 'string' && f.avatarUrl.startsWith('{')) {
          try {
            const meta = JSON.parse(f.avatarUrl);
            cropVariety = meta.cropVariety || '';
            acreage = meta.acreage || '';
          } catch {}
        }
        if (f.cropVariety) cropVariety = f.cropVariety;
        if (f.acreage) acreage = f.acreage;

        return {
          id: f.id,
          farmerIdCode: f.farmerIdCode || `FAR-${f.id.toString().slice(0, 5)}`,
          name: f.name,
          phone: f.phone,
          village: f.village || '',
          taluka: f.taluka || '',
          district: f.district || '',
          aadhaarNumber: f.aadhaarNumber || '',
          aadhaar: f.aadhaarNumber || '',
          cropVariety,
          acreage,
          grade: f.grade || 'A_GRADE',
          totalPurchase,
          totalPaid,
          advanceBalance: advanceBal,
          outstandingAmount: due,
          bankName: f.bankName || '',
          accountNumber: f.accountNumber || '',
          ifscCode: f.ifscCode || '',
        };
      });
      setLocalCache(`seavaig_farmers_cache_${tenantId}`, mapped);
      return mapped;
    }
  } catch (err) {
    console.error('Error in apiGetFarmers dynamic aggregation:', err);
  }
  return getLocalCache(`seavaig_farmers_cache_${tenantId}`, []);
};

export const apiGetFarmerDetails = async (id: string) => {
  try {
    const { data } = await supabase.from('Farmer').select('*').eq('id', id).single();
    if (data) {
      let cropVariety = '';
      let acreage = '';
      if (data.avatarUrl && typeof data.avatarUrl === 'string' && data.avatarUrl.startsWith('{')) {
        try {
          const meta = JSON.parse(data.avatarUrl);
          cropVariety = meta.cropVariety || '';
          acreage = meta.acreage || '';
        } catch {}
      }
      return {
        ...data,
        cropVariety: data.cropVariety || cropVariety,
        acreage: data.acreage || acreage,
      };
    }
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
  
  const cropMeta = JSON.stringify({
    cropVariety: farmerData.cropVariety || '',
    acreage: farmerData.acreage || '',
  });

  const farmerObj = {
    id: newId,
    tenantId: tenantId,
    farmerIdCode: farmerData.farmerIdCode || autoCode,
    name: farmerData.name,
    phone: farmerData.phone,
    password: farmerData.phone, // Default password for APK
    village: farmerData.village || '',
    taluka: farmerData.taluka || '',
    district: farmerData.district || '',
    aadhaarNumber: farmerData.aadhaarNumber || farmerData.aadhaar || null,
    avatarUrl: cropMeta,
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
    farmerIdCode: farmerObj.farmerIdCode,
    cropVariety: farmerData.cropVariety || '',
    acreage: farmerData.acreage || '',
    aadhaar: farmerObj.aadhaarNumber || '',
  };
  const updated = [mappedObj, ...current];
  setLocalCache(`seavaig_farmers_cache_${tenantId}`, updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('farmers_changed'));
  }
  return mappedObj;
};

export const apiUpdateFarmer = async (farmerData: any) => {
  const tenantId = getTenantId();
  if (!tenantId) return farmerData;

  const cropMeta = JSON.stringify({
    cropVariety: farmerData.cropVariety || '',
    acreage: farmerData.acreage || '',
  });

  const updatePayload: any = {
    name: farmerData.name,
    phone: farmerData.phone,
    village: farmerData.village || '',
    taluka: farmerData.taluka || '',
    district: farmerData.district || '',
    grade: farmerData.grade || 'A_GRADE',
    status: farmerData.status || 'ACTIVE',
    bankName: farmerData.bankName || '',
    accountNumber: farmerData.accountNumber || '',
    ifscCode: farmerData.ifscCode || '',
    aadhaarNumber: farmerData.aadhaarNumber || farmerData.aadhaar || null,
    avatarUrl: cropMeta,
  };

  try {
    await supabase.from('Farmer').update(updatePayload).eq('id', farmerData.id).throwOnError();
  } catch (e) {
    console.error('Error in apiUpdateFarmer Supabase update:', e);
  }

  const current = getLocalCache(`seavaig_farmers_cache_${tenantId}`, []);
  const updated = current.map((f: any) => {
    if (f.id === farmerData.id) {
      return {
        ...f,
        ...farmerData,
        cropVariety: farmerData.cropVariety || '',
        acreage: farmerData.acreage || '',
      };
    }
    return f;
  });
  setLocalCache(`seavaig_farmers_cache_${tenantId}`, updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('farmers_changed'));
  }
  return farmerData;
};

export const apiGetFarmerMaterials = async (farmerId: string) => {
  const tenantId = getTenantId();
  const cacheKey = tenantId ? `seavaig_material_supplies_cache_${tenantId}` : 'seavaig_material_supplies_cache';
  try {
    let query = supabase
      .from('FarmerMaterialPurchase')
      .select('*')
      .order('createdAt', { ascending: false });
    if (tenantId) {
      query = query.eq('tenantId', tenantId);
    }
    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      const mapped = data.map((m: any) => {
        const qty = Number(m.quantity || 1);
        const price = Number(m.unitPrice || 0);
        const calcTotal = qty * price;
        const finalAmt = Number(m.totalAmount || m.totalPrice || m.amount || calcTotal || 0);
        const dateStr = m.date ? (typeof m.date === 'string' ? m.date.split('T')[0] : new Date(m.date).toISOString().split('T')[0]) : (m.createdAt ? new Date(m.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

        return {
          id: m.id,
          farmerId: m.farmerId,
          itemName: m.itemName,
          quantity: qty,
          unit: m.unit || 'QTY',
          unitPrice: price,
          totalPrice: finalAmt,
          totalAmount: finalAmt,
          amount: finalAmt,
          date: dateStr,
          createdAt: m.createdAt || m.date || new Date().toISOString(),
          isDeductedFromBill: m.isDeductedFromBill,
          notes: m.notes || '',
        };
      });
      setLocalCache(cacheKey, mapped);
      return mapped.filter((m: any) => m.farmerId === farmerId);
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
      const mapped = data.map((m: any) => {
        const qty = Number(m.quantity || 1);
        const price = Number(m.unitPrice || 0);
        const calcTotal = qty * price;
        const finalAmt = Number(m.totalAmount || m.totalPrice || m.amount || calcTotal || 0);
        const dateStr = m.date ? (typeof m.date === 'string' ? m.date.split('T')[0] : new Date(m.date).toISOString().split('T')[0]) : (m.createdAt ? new Date(m.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);

        return {
          id: m.id,
          farmerId: m.farmerId,
          itemName: m.itemName,
          quantity: qty,
          unit: m.unit || 'QTY',
          unitPrice: price,
          totalPrice: finalAmt,
          totalAmount: finalAmt,
          amount: finalAmt,
          date: dateStr,
          createdAt: m.createdAt || m.date || new Date().toISOString(),
          isDeductedFromBill: m.isDeductedFromBill,
          notes: m.notes || '',
        };
      });
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
  
  let validFarmerId = matData.farmerId;
  if (matData.farmerId) {
    try {
      const { data: fRec } = await supabase
        .from('Farmer')
        .select('id')
        .or(`id.eq.${matData.farmerId},farmerIdCode.eq.${matData.farmerId},phone.eq.${matData.farmerId}`)
        .eq('tenantId', tenantId)
        .limit(1)
        .maybeSingle();
      if (fRec?.id) validFarmerId = fRec.id;
    } catch {}
  }

  const qty = Number(matData.quantity || 1);
  const price = Number(matData.unitPrice || 0);
  const finalPrice = Number(matData.totalPrice || matData.totalAmount || (qty * price));
  const todayStr = new Date().toISOString().split('T')[0];

  const matObj = {
    id: newId,
    farmerId: validFarmerId,
    itemName: matData.itemName,
    quantity: qty,
    unit: matData.unit || 'QTY',
    unitPrice: price,
    totalPrice: finalPrice,
    totalAmount: finalPrice,
    amount: finalPrice,
    date: todayStr,
    createdAt: new Date().toISOString(),
    isDeductedFromBill: false,
    notes: matData.notes || '',
  };

  try {
    await supabase.from('FarmerMaterialPurchase').insert([{
      id: matObj.id,
      farmerId: matObj.farmerId,
      itemName: matObj.itemName,
      quantity: matObj.quantity,
      unit: matObj.unit,
      unitPrice: matObj.unitPrice,
      totalAmount: matObj.totalAmount,
      date: new Date(),
      createdAt: new Date().toISOString(),
      isDeductedFromBill: false,
    }]);

    await apiUpdateFarmerBalance(matObj.farmerId, 0, matObj.totalAmount, 'MATERIAL');
  } catch (err) {
    console.error('Error inserting material purchase:', err);
  }

  const current = getLocalCache(cacheKey, []);
  const updated = [matObj, ...current];
  setLocalCache(cacheKey, updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('farmer_materials_changed'));
    window.dispatchEvent(new Event('farmers_changed'));
    window.dispatchEvent(new Event('purchases_changed'));
  }
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

export const apiAddMaterialItem = async (name: string, unit: string = 'QTY', price: number = 0) => {
  const tenantId = getTenantId();
  if (!tenantId) throw new Error('No tenant');
  
  const newItem = {
    id: `mat-${Date.now()}`,
    tenantId,
    name,
    unit: unit || 'QTY',
    price: Number(price || 0),
    createdAt: new Date().toISOString(),
  };

  try {
    await supabase.from('MaterialItem').insert([newItem]).throwOnError();
  } catch (e) {
    console.error('Error adding MaterialItem in Supabase:', e);
  }
  
  const current = await apiGetMaterialItems();
  const updated = [newItem, ...current.filter((m: any) => m.id !== newItem.id)];
  setLocalCache(`seavaig_global_materials_cache_${tenantId}`, updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('material_items_changed'));
  }
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
    const { data: purchaseData } = await supabase
      .from('Purchase')
      .select('*')
      .eq('tenantId', tenantId)
      .order('createdAt', { ascending: false });

    if (purchaseData && purchaseData.length > 0) {
      const purchaseIds = purchaseData.map((p: any) => p.id).filter(Boolean);
      const purchaseNos = purchaseData.map((p: any) => p.purchaseNo).filter(Boolean);
      const allIds = Array.from(new Set([...purchaseIds, ...purchaseNos]));

      let itemsMap: Record<string, any[]> = {};
      if (allIds.length > 0) {
        const { data: itemsData } = await supabase
          .from('PurchaseItem')
          .select('*')
          .in('purchaseId', allIds);
        if (itemsData) {
          itemsData.forEach((it: any) => {
            if (!itemsMap[it.purchaseId]) itemsMap[it.purchaseId] = [];
            itemsMap[it.purchaseId].push(it);
          });
        }
      }

      const { data: farmerData } = await supabase
        .from('Farmer')
        .select('*')
        .eq('tenantId', tenantId);

      const farmers = farmerData || [];
      const mapped = purchaseData.map((p: any) => {
        const pItems = itemsMap[p.id] || itemsMap[p.purchaseNo] || [];
        const firstItem = pItems[0];
        const farmer = farmers.find((f: any) => f.id === p.farmerId || f.phone === p.farmerId || f.farmerIdCode === p.farmerId);

        const parsedWeight = parseFloat(String(firstItem?.weightKg || p.totalWeight || p.weight || '0').replace(/[^0-9.-]+/g, '')) || 0;
        const parsedRate = parseFloat(String(firstItem?.ratePerKg || p.rate || '0').replace(/[^0-9.-]+/g, '')) || 0;
        const calculatedFromWeightRate = (parsedWeight > 0 && parsedRate > 0) ? (parsedWeight * parsedRate) : 0;
        const itemTotal = firstItem ? (Number(firstItem.totalAmount) || calculatedFromWeightRate) : 0;

        const rawAmt = p.totalAmount ?? p.amount ?? p.netAmount ?? itemTotal ?? calculatedFromWeightRate ?? 0;
        const numAmt = typeof rawAmt === 'number' ? rawAmt : (parseFloat(String(rawAmt).replace(/[^0-9.-]+/g, '')) || 0);
        const finalAmount = numAmt > 0 ? numAmt : (calculatedFromWeightRate > 0 ? calculatedFromWeightRate : itemTotal);

        const unitStr = firstItem?.unit || 'KG';
        const weightStr = `${parsedWeight} ${unitStr}`;
        const rateStr = `₹${parsedRate}/${unitStr}`;

        return {
          id: p.purchaseNo || p.id,
          dbId: p.id,
          purchaseNo: p.purchaseNo || p.id,
          farmerId: p.farmerId || '',
          farmerName: p.farmerName || farmer?.name || 'Farmer',
          phone: farmer?.phone || '',
          village: farmer?.village || '',
          crop: firstItem?.cropName || p.crop || 'Strawberry',
          grade: firstItem?.grade || p.grade || 'A_GRADE',
          weight: weightStr,
          rate: rateStr,
          amount: finalAmount,
          totalAmount: finalAmount,
          paidAmount: parseFloat(p.paidAmount || 0) || 0,
          dueAmount: parseFloat(p.dueAmount !== undefined ? p.dueAmount : finalAmount) || 0,
          paymentStatus: p.paymentStatus || (finalAmount > 0 && parseFloat(p.paidAmount || 0) >= finalAmount ? 'PAID' : 'UNPAID'),
          date: p.date || (p.purchaseDate ? p.purchaseDate.split('T')[0] : new Date(p.createdAt || Date.now()).toLocaleDateString('en-IN')),
          purchaseDate: p.purchaseDate || p.createdAt || p.date || null,
          storageLocation: p.storageLocation || '',
          items: pItems,
        };
      });
      setLocalCache(`seavaig_purchases_cache_${tenantId}`, mapped);
      return mapped;
    }
  } catch (err) {
    console.error('Error in apiGetPurchases:', err);
  }
  return getLocalCache(`seavaig_purchases_cache_${tenantId}`, []);
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

export const getTenantShort = (tenantId?: string | null): string => {
  if (!tenantId) return '0000';
  const clean = tenantId.replace(/[^0-9]/g, '');
  return clean.length >= 4 ? clean.slice(-4) : (tenantId.slice(-4) || '0000');
};

export const apiUpdateFarmerBalance = async (
  farmerId: string, 
  paidAmt?: number, 
  dueAmt?: number, 
  type?: 'PURCHASE' | 'PAYMENT' | 'MATERIAL',
  advanceApplied: number = 0
) => {
  const tenantId = getTenantId();
  if (!farmerId || !tenantId) return;

  try {
    const fId = String(farmerId || '').trim();
    
    // 1. Fetch Farmer record
    const { data: farmerRecords } = await supabase
      .from('Farmer')
      .select('*')
      .or(`id.eq.${fId},phone.eq.${fId},farmerIdCode.eq.${fId}`)
      .limit(1);

    let farmer = farmerRecords?.[0];
    if (!farmer) {
      const { data: byName } = await supabase
        .from('Farmer')
        .select('*')
        .ilike('name', fId)
        .limit(1);
      farmer = byName?.[0];
    }

    if (farmer) {
      const actualId = farmer.id;

      // 2. Query all purchases, payments, materials for this farmer
      const [allPurchases, allPayments, allMaterials] = await Promise.all([
        apiGetPurchases(),
        apiGetPayments(),
        apiGetAllFarmerMaterials(),
      ]);

      const farmerPurchases = (allPurchases || []).filter((p: any) => isFarmerMatch(p, farmer));
      const farmerPayments = (allPayments || []).filter((pay: any) => isFarmerMatch(pay, farmer));
      const farmerMaterials = (allMaterials || []).filter((m: any) => isFarmerMatch(m, farmer));

      const computedPurchases = farmerPurchases.reduce((sum: number, p: any) => {
        const amt = typeof p.totalAmount === 'number' ? p.totalAmount : (typeof p.amount === 'number' ? p.amount : parseFloat(String(p.totalAmount || p.amount || 0).replace(/[^0-9.-]+/g, '')) || 0);
        return sum + amt;
      }, 0);

      const computedPaid = farmerPayments.reduce((sum: number, pay: any) => {
        const amt = typeof pay.amount === 'number' ? pay.amount : parseFloat(String(pay.amount || 0).replace(/[^0-9.-]+/g, '')) || 0;
        return sum + amt;
      }, 0);

      const computedMaterials = farmerMaterials.reduce((sum: number, m: any) => {
        const amt = typeof m.totalPrice === 'number' ? m.totalPrice : (typeof m.totalAmount === 'number' ? m.totalAmount : parseFloat(String(m.totalAmount || 0).replace(/[^0-9.-]+/g, '')) || 0);
        return sum + amt;
      }, 0);

      const totalPurchase = computedPurchases;
      const totalPaid = computedPaid;
      const totalDebits = computedPaid + computedMaterials;
      const netBalance = computedPurchases - totalDebits;
      const advanceBal = Math.max(0, totalDebits - computedPurchases);
      const due = Math.max(0, netBalance);

      // Update Supabase
      await supabase.from('Farmer').update({
        totalPurchase,
        totalPaid,
        outstandingAmount: due,
        advanceBalance: advanceBal,
      }).eq('id', actualId).throwOnError();

      // Update Local Cache
      const cached = getLocalCache(`seavaig_farmers_cache_${tenantId}`, []);
      const updatedCache = cached.map((f: any) => {
        if (isFarmerMatch(farmer, f) || f.id === actualId) {
          return {
            ...f,
            totalPurchase,
            totalPaid,
            outstandingAmount: due,
            advanceBalance: advanceBal,
          };
        }
        return f;
      });
      setLocalCache(`seavaig_farmers_cache_${tenantId}`, updatedCache);
    }
  } catch (err) {
    console.error('Error in apiUpdateFarmerBalance:', err);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('farmers_changed'));
  }
};

export const apiCreatePurchase = async (purchaseData: any) => {
  const tenantId = getTenantId();
  if (!tenantId) throw new Error('No tenant');
  const tenantShort = getTenantShort(tenantId);

  const item = purchaseData.items?.[0];
  const itemWeight = parseFloat(String(item?.weightKg || purchaseData.totalWeight || purchaseData.weight || '0').replace(/[^0-9.-]+/g, '')) || 0;
  const itemRate = parseFloat(String(item?.ratePerKg || purchaseData.rate || '0').replace(/[^0-9.-]+/g, '')) || 0;
  const itemCalcTotal = (itemWeight > 0 && itemRate > 0) ? (itemWeight * itemRate) : 0;
  const rawPurAmt = purchaseData.totalAmount ?? purchaseData.amount ?? item?.totalAmount ?? itemCalcTotal ?? 0;
  const numPurAmt = typeof rawPurAmt === 'number' ? rawPurAmt : (parseFloat(String(rawPurAmt).replace(/[^0-9.-]+/g, '')) || 0);
  const purAmt = numPurAmt > 0 ? numPurAmt : (itemCalcTotal > 0 ? itemCalcTotal : 0);

  const today = new Date();
  const mmyy = String(today.getMonth() + 1).padStart(2, '0') + String(today.getFullYear()).slice(2);
  
  // 1. Query highest existing serial for this tenant & month pattern
  const { data: latestData } = await supabase
    .from('Purchase')
    .select('purchaseNo')
    .like('purchaseNo', `PB-${mmyy}-${tenantShort}-%`)
    .order('createdAt', { ascending: false })
    .limit(20);

  let serial = 1;
  if (latestData && latestData.length > 0) {
    const existingSerials = latestData.map((d: any) => {
      const parts = (d.purchaseNo || '').split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      return isNaN(num) ? 0 : num;
    });
    serial = Math.max(...existingSerials, 0) + 1;
  }

  let billNo = `PB-${mmyy}-${tenantShort}-${String(serial).padStart(3, '0')}`;
  let globalId = purchaseData.id || `pur-${tenantShort}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  
  let validFarmerId = purchaseData.farmerId;
  if (purchaseData.farmerId) {
    try {
      const { data: fRec } = await supabase
        .from('Farmer')
        .select('id')
        .or(`id.eq.${purchaseData.farmerId},farmerIdCode.eq.${purchaseData.farmerId},phone.eq.${purchaseData.farmerId}`)
        .eq('tenantId', tenantId)
        .limit(1)
        .maybeSingle();
      if (fRec?.id) validFarmerId = fRec.id;
    } catch {}
  }

  const unitStr = item?.unit || 'KG';
  const purchaseObj = {
    id: billNo,
    dbId: globalId,
    tenantId,
    purchaseNo: billNo,
    farmerId: validFarmerId,
    farmerName: purchaseData.farmerName || 'Farmer',
    crop: item?.cropName || 'Strawberry (A Grade)',
    grade: item?.grade || 'A_GRADE',
    weight: `${itemWeight} ${unitStr}`,
    rate: `₹${itemRate}/${unitStr}`,
    amount: purAmt,
    totalAmount: purAmt,
    paidAmount: Number(purchaseData.paidAmount || 0),
    dueAmount: Number(purchaseData.dueAmount !== undefined ? purchaseData.dueAmount : purAmt),
    paymentStatus: purchaseData.paymentStatus || (purAmt > 0 && Number(purchaseData.paidAmount || 0) >= purAmt ? 'PAID' : 'UNPAID'),
    date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    storageLocation: purchaseData.storageLocation || '',
    items: purchaseData.items || []
  };

  // 2. Safe Auto-Retry Loop on 409 Conflict
  let attempts = 0;
  let success = false;
  while (attempts < 5 && !success) {
    attempts++;
    try {
      await supabase.from('Purchase').insert([{
        id: globalId,
        tenantId,
        purchaseNo: billNo,
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
      success = true;
    } catch (e: any) {
      if (attempts >= 5) {
        console.error('Final attempt failed in apiCreatePurchase:', e);
        throw e;
      }
      serial++;
      billNo = `PB-${mmyy}-${tenantShort}-${String(serial).padStart(3, '0')}`;
      globalId = `pur-${tenantShort}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      purchaseObj.id = billNo;
      purchaseObj.dbId = globalId;
      purchaseObj.purchaseNo = billNo;
    }
  }
  
  if (item) {
    try {
      await supabase.from('PurchaseItem').insert([{
        id: `pitem-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
        purchaseId: globalId,
        cropName: item.cropName || '',
        weightKg: Number(item.weightKg || 0),
        ratePerKg: Number(item.ratePerKg || 0),
        totalAmount: Number(item.weightKg || 0) * Number(item.ratePerKg || 0),
        unit: item.unit || 'KG',
        grade: item.grade || 'A_GRADE'
      }]);
    } catch (e) {
      console.error('Error inserting PurchaseItem:', e);
    }
  }
  
  const current = getLocalCache(`seavaig_purchases_cache_${tenantId}`, []);
  const updated = [purchaseObj, ...current];
  setLocalCache(`seavaig_purchases_cache_${tenantId}`, updated);

  if (purchaseData.farmerId) {
    await apiUpdateFarmerBalance(purchaseData.farmerId, Number(purchaseData.paidAmount || 0), purAmt, 'PURCHASE', purchaseData.advanceApplied || 0);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('purchases_changed'));
    window.dispatchEvent(new Event('farmers_changed'));
  }
  return purchaseObj;
};

export const apiUpdatePurchase = async (purchaseId: string, updateData: any) => {
  const tenantId = getTenantId();
  if (!tenantId) throw new Error('No tenant');

  const currentList = getLocalCache(`seavaig_purchases_cache_${tenantId}`, []);
  const oldPurchase = currentList.find((p: any) => p.id === purchaseId || p.dbId === purchaseId);
  const targetId = oldPurchase?.dbId || purchaseId;

  const parsedWeight = parseFloat(String(updateData.weight || updateData.totalWeight || '0').replace(/[^0-9.-]+/g, '')) || 0;
  const parsedRate = parseFloat(String(updateData.rate || updateData.ratePerKg || '0').replace(/[^0-9.-]+/g, '')) || 0;
  const parsedAmount = updateData.amount !== undefined ? Number(updateData.amount) : (parsedWeight * parsedRate);
  const parsedDue = updateData.dueAmount !== undefined ? Number(updateData.dueAmount) : parsedAmount;
  const parsedPaid = updateData.paidAmount !== undefined ? Number(updateData.paidAmount) : (parsedAmount - parsedDue);

  try {
    // 1. Update Purchase in Supabase
    await supabase.from('Purchase').update({
      totalWeight: parsedWeight,
      totalAmount: parsedAmount,
      dueAmount: parsedDue,
      paidAmount: parsedPaid,
      paymentStatus: updateData.paymentStatus || (parsedDue <= 0 ? 'PAID' : parsedPaid > 0 ? 'PARTIAL' : 'UNPAID'),
      storageLocation: updateData.storageLocation || oldPurchase?.storageLocation || ''
    }).or(`id.eq.${targetId},purchaseNo.eq.${purchaseId}`).throwOnError();

    // 2. Update or Upsert PurchaseItem in Supabase
    if (updateData.crop || updateData.cropName || parsedWeight > 0) {
      const { data: existingItems } = await supabase
        .from('PurchaseItem')
        .select('*')
        .or(`purchaseId.eq.${targetId},purchaseId.eq.${purchaseId}`)
        .limit(1);

      if (existingItems && existingItems.length > 0) {
        await supabase.from('PurchaseItem').update({
          cropName: updateData.crop || updateData.cropName || existingItems[0].cropName,
          weightKg: parsedWeight || existingItems[0].weightKg,
          ratePerKg: parsedRate || existingItems[0].ratePerKg,
          totalAmount: parsedAmount,
          grade: updateData.grade || existingItems[0].grade || 'A_GRADE'
        }).eq('id', existingItems[0].id).throwOnError();
      }
    }

    // 3. Update Farmer balance in Supabase if amount changed
    const farmerId = updateData.farmerId || oldPurchase?.farmerId;
    if (farmerId && oldPurchase) {
      const oldAmount = Number(oldPurchase.amount || oldPurchase.totalAmount || 0);
      const diff = parsedAmount - oldAmount;
      if (diff !== 0) {
        await apiUpdateFarmerBalance(farmerId, 0, diff, 'PURCHASE', 0);
      }
    }
  } catch (e) {
    console.error('Error in apiUpdatePurchase:', e);
  }

  // 4. Update local cache
  const updatedList = currentList.map((p: any) => {
    if (p.id === purchaseId || p.dbId === purchaseId) {
      return {
        ...p,
        ...updateData,
        weight: `${parsedWeight} KG`,
        rate: `₹${parsedRate}/KG`,
        amount: parsedAmount,
        totalAmount: parsedAmount,
        dueAmount: parsedDue,
        paidAmount: parsedPaid,
        paymentStatus: updateData.paymentStatus || (parsedDue <= 0 ? 'PAID' : parsedPaid > 0 ? 'PARTIAL' : 'UNPAID')
      };
    }
    return p;
  });
  setLocalCache(`seavaig_purchases_cache_${tenantId}`, updatedList);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('purchases_changed'));
    window.dispatchEvent(new Event('farmers_changed'));
  }
  return updatedList;
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
  const newId = trData.id || `trd-${(tenantId || 'ten').slice(-4)}-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const traderCode = trData.traderCode || `TRD-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const name = trData.name || 'Trader';
  const businessName = trData.businessName || name;
  const nowIso = new Date().toISOString();

  const traderObj = {
    id: newId,
    tenantId,
    traderCode,
    name,
    businessName,
    phone: trData.phone || '',
    email: trData.email || null,
    gstNumber: trData.gstNumber || null,
    address: trData.address || null,
    totalPurchased: Number(trData.totalPurchased || 0),
    totalPaid: Number(trData.totalPaid || 0),
    dueAmount: Number(trData.dueAmount || 0),
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const dbTraderObj = {
    id: newId,
    tenantId,
    traderCode,
    name,
    businessName,
    phone: traderObj.phone,
    email: traderObj.email,
    gstNumber: traderObj.gstNumber,
    address: traderObj.address,
    totalPurchased: traderObj.totalPurchased,
    totalPaid: traderObj.totalPaid,
    dueAmount: traderObj.dueAmount,
    updatedAt: nowIso,
  };

  try {
    await supabase.from('Trader').upsert([dbTraderObj], { onConflict: 'id' }).throwOnError();
  } catch (e) {
    console.error('Error creating trader in Supabase:', e);
  }

  const updated = [traderObj, ...current.filter((t: any) => t.id !== newId)];
  setLocalCache(`seavaig_traders_cache_${tenantId}`, updated);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('traders_changed'));
  }
  return traderObj;
};

export const apiGetTraderPurchases = async () => {
  const tenantId = getTenantId();
  if (!tenantId) return [];
  try {
    const { data, error } = await supabase
      .from('TraderPurchase')
      .select('*, trader:Trader(*)')
      .eq('tenantId', tenantId)
      .order('createdAt', { ascending: false });
    if (!error && data && data.length > 0) {
      const mapped = data.map((tp: any) => ({
        id: tp.billNo || tp.id,
        dbId: tp.id,
        traderId: tp.traderId,
        traderName: tp.trader?.name || 'Trader',
        businessName: tp.trader?.businessName || 'Business',
        itemName: tp.itemName || 'Material Batch',
        category: tp.category || 'PACKAGING',
        quantity: tp.quantity || 1,
        unit: tp.unit || 'QTY',
        rate: tp.rate || 0,
        totalAmount: tp.totalAmount || (Number(tp.rate || 0) * Number(tp.quantity || 1)),
        paidAmount: tp.paidAmount || 0,
        dueAmount: tp.dueAmount || 0,
        paymentStatus: tp.paymentStatus || 'PAID',
        notes: tp.notes || '',
        vehicleNo: tp.vehicleNo || '',
        date: tp.date || (tp.createdAt ? new Date(tp.createdAt).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')),
      }));
      setLocalCache(`seavaig_trader_purchases_cache_${tenantId}`, mapped);
      return mapped;
    }
  } catch {}
  return getLocalCache(`seavaig_trader_purchases_cache_${tenantId}`, []);
};

export const apiCreateTraderPurchase = async (tpData: any) => {
  const tenantId = getTenantId();
  if (!tenantId) throw new Error('No tenant');

  const today = new Date();
  const ddmmyy = String(today.getDate()).padStart(2, '0') + String(today.getMonth() + 1).padStart(2, '0') + String(today.getFullYear()).slice(2);
  
  const tenantSuffix = (tenantId || '').slice(-4);
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const globalId = tpData.id || `tp-${tenantSuffix}-${Date.now()}-${randomSuffix}`;
  const totalAmt = Number(tpData.totalAmount || (Number(tpData.quantity || 1) * Number(tpData.rate || 0)));
  const paidAmt = Number(tpData.paidAmount || 0);
  const dueAmt = Math.max(0, totalAmt - paidAmt);
  const paymentStatus = dueAmt === 0 ? 'PAID' : (paidAmt > 0 ? 'PARTIAL' : 'UNPAID');
  const billNo = tpData.billNo || `TBILL${ddmmyy}-${randomSuffix}`;
  const nowIso = new Date().toISOString();

  const tpObj = {
    id: globalId,
    tenantId,
    billNo,
    traderId: tpData.traderId,
    itemName: tpData.itemName || 'Material Batch',
    category: tpData.category || 'PACKAGING',
    quantity: Number(tpData.quantity || 1),
    unit: tpData.unit || 'QTY',
    rate: Number(tpData.rate || 0),
    totalAmount: totalAmt,
    paidAmount: paidAmt,
    dueAmount: dueAmt,
    paymentStatus,
    vehicleNo: tpData.vehicleNo || null,
    notes: tpData.notes || null,
    date: tpData.date || nowIso.slice(0, 10),
    createdAt: nowIso,
  };

  const dbTpObj = {
    id: globalId,
    tenantId,
    billNo: tpObj.billNo,
    traderId: tpObj.traderId,
    itemName: tpObj.itemName,
    category: tpObj.category,
    quantity: tpObj.quantity,
    unit: tpObj.unit,
    rate: tpObj.rate,
    totalAmount: tpObj.totalAmount,
    paidAmount: tpObj.paidAmount,
    dueAmount: tpObj.dueAmount,
    paymentStatus: tpObj.paymentStatus,
    vehicleNo: tpObj.vehicleNo,
    notes: tpObj.notes,
    date: tpObj.date,
  };

  try {
    await supabase.from('TraderPurchase').insert([dbTpObj]).throwOnError();
    if (tpData.traderId) {
      await apiUpdateTraderBalance(tpData.traderId, paidAmt, dueAmt);
    }
  } catch (e) {
    console.error('Error creating trader purchase in Supabase:', e);
  }

  const current = getLocalCache(`seavaig_trader_purchases_cache_${tenantId}`, []);
  const traders = getLocalCache(`seavaig_traders_cache_${tenantId}`, []);
  const trader = traders.find((t: any) => t.id === tpData.traderId);
  const cacheObj = {
    ...tpObj,
    id: tpObj.billNo,
    dbId: globalId,
    traderName: trader?.name || 'Trader',
    businessName: trader?.businessName || 'Business',
  };
  setLocalCache(`seavaig_trader_purchases_cache_${tenantId}`, [cacheObj, ...current]);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('trader_purchases_changed'));
  }
  return cacheObj;
};

export const apiUpdateTraderPurchase = async (billNo: string, updateData: any) => {
  const tenantId = getTenantId();
  if (!tenantId) return [];
  try {
    const { data } = await supabase.from('TraderPurchase').select('*').eq('tenantId', tenantId).eq('billNo', billNo).single();
    if (data) {
      const payload: any = {};
      if (updateData.paidAmount !== undefined) payload.paidAmount = updateData.paidAmount;
      if (updateData.dueAmount !== undefined) payload.dueAmount = updateData.dueAmount;
      if (updateData.paymentStatus !== undefined) payload.paymentStatus = updateData.paymentStatus;
      
      await supabase.from('TraderPurchase').update(payload).eq('id', data.id).eq('tenantId', tenantId).throwOnError();
    }
  } catch {}

  const current = getLocalCache(`seavaig_trader_purchases_cache_${tenantId}`, []);
  const updated = current.map((p: any) => (p.id === billNo ? { ...p, ...updateData } : p));
  setLocalCache(`seavaig_trader_purchases_cache_${tenantId}`, updated);
  return updated;
};

export const apiUpdateTraderBalance = async (traderId: string, paidAmt: number, dueAmt: number) => {
  const tenantId = getTenantId();
  if (!tenantId) return;
  try {
    const { data } = await supabase.from('Trader').select('*').eq('id', traderId).eq('tenantId', tenantId).single();
    if (data) {
      const newTotalPurchased = (data.totalPurchased || 0) + (dueAmt + paidAmt);
      const newTotalPaid = (data.totalPaid || 0) + paidAmt;
      const newDue = Math.max(0, (data.dueAmount || 0) + dueAmt);
      
      await supabase.from('Trader').update({
        totalPurchased: newTotalPurchased,
        totalPaid: newTotalPaid,
        dueAmount: newDue,
      }).eq('id', traderId).eq('tenantId', tenantId).throwOnError();
    }
  } catch {}

  const traders = getLocalCache(`seavaig_traders_cache_${tenantId}`, []);
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
  setLocalCache(`seavaig_traders_cache_${tenantId}`, updated);
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
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const tenantSuffix = (tenantId || 'ten').slice(-4);
    const cleanPhone = (data.phone || '').replace(/[^0-9]/g, '');
    let emailVal = data.email && data.email.trim().length > 0
      ? data.email.trim()
      : `staff_${tenantSuffix}_${cleanPhone || Date.now()}_${randomSuffix}@seavaig.com`;

    // Check if email belongs to another tenant to prevent unique constraint crash
    const { data: existingUser } = await supabase.from('User').select('id, tenantId').eq('email', emailVal).limit(1);
    if (existingUser && existingUser.length > 0 && existingUser[0].tenantId !== tenantId) {
      emailVal = `${emailVal.split('@')[0]}_${tenantSuffix}@seavaig.com`;
    }

    const userObj = {
      id: data.id || `usr-${tenantSuffix}-${Date.now()}-${randomSuffix}`,
      tenantId,
      name: data.name,
      email: emailVal,
      password: data.password || '123456',
      phone: data.phone || '',
      role: data.role || 'MANAGER',
      updatedAt: new Date().toISOString(),
    };
    await supabase.from('User').upsert([userObj], { onConflict: 'id' }).throwOnError();
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
    if (!error && data) {
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
  } catch (e) {
    console.error('apiGetTenants error:', e);
  }
  return getLocalCache('seavaig_tenants_cache', []);
};

export const apiCreateTenant = async (tenantData: any) => {
  const cleanPhone = String(tenantData.ownerPhone || '').replace(/[^0-9]/g, '');
  const phoneSuffix = cleanPhone.length >= 4 ? cleanPhone.slice(-4) : Math.floor(1000 + Math.random() * 9000).toString();
  const tenantId = tenantData.id || `TEN-${phoneSuffix}`;

  const newTenant = {
    id: tenantId,
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
  } catch (e) {
    console.error('apiToggleTenantStatus error:', e);
  }

  const existing = getLocalCache('seavaig_tenants_cache', []);
  const updated = existing.map(t => t.id === id ? { ...t, status: newStatus } : t);
  setLocalCache('seavaig_tenants_cache', updated);
  return updated;
};

export const apiUpdateTenant = async (id: string, updateData: any) => {
  const allowed = ['companyName', 'ownerName', 'ownerEmail', 'ownerPhone', 'passportOrGovId', 'package', 'password', 'status', 'businessNameMr', 'addressMr', 'gstin', 'tagline', 'primaryColor', 'secretPin', 'subdomain', 'logoUrl', 'signatureUrl'];
  const sanitized: Record<string, any> = {};
  for (const key of Object.keys(updateData)) {
    if (allowed.includes(key)) {
      sanitized[key] = updateData[key];
    }
  }

  try {
    if (Object.keys(sanitized).length > 0) {
      await supabase.from('Tenant').update(sanitized).eq('id', id).throwOnError();
    }
  } catch (e) {
    console.error('apiUpdateTenant error:', e);
  }

  const existing = getLocalCache('seavaig_tenants_cache', []);
  const updated = existing.map(t => t.id === id ? { ...t, ...updateData } : t);
  setLocalCache('seavaig_tenants_cache', updated);
  return updated;
};

export const apiDeleteTenant = async (id: string) => {
  try {
    // Delete tenant from database
    await supabase.from('Tenant').delete().eq('id', id).throwOnError();
  } catch (e) {
    console.error('apiDeleteTenant error:', e);
  }

  const existing = getLocalCache('seavaig_tenants_cache', []);
  const updated = existing.filter(t => t.id !== id);
  setLocalCache('seavaig_tenants_cache', updated);
  return updated;
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




export const apiGetSales = async () => {
  const tenantId = getTenantId();
  if (!tenantId) return getLocalCache('seavaig_sales_cache', []);
  const { data } = await supabase.from('Sale').select('*').eq('tenantId', tenantId).order('createdAt', { ascending: false });
  return data || [];
};

export const apiCreateSale = async (saleData: any) => {
  const tenantId = getTenantId();
  if (!tenantId) throw new Error('No tenant');
  const tenantShort = getTenantShort(tenantId);
  
  const today = new Date();
  const ddmmyy = String(today.getDate()).padStart(2, '0') + String(today.getMonth() + 1).padStart(2, '0') + String(today.getFullYear()).slice(2);
  
  const { data: latestData } = await supabase
    .from('Sale')
    .select('billNo')
    .like('billNo', `SB-${ddmmyy}-${tenantShort}-%`)
    .order('createdAt', { ascending: false })
    .limit(20);

  let serial = 1;
  if (latestData && latestData.length > 0) {
    const existingSerials = latestData.map((d: any) => {
      const parts = (d.billNo || '').split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      return isNaN(num) ? 0 : num;
    });
    serial = Math.max(...existingSerials, 0) + 1;
  }
  const serialBillNo = saleData.billNo || `SB-${ddmmyy}-${tenantShort}-${String(serial).padStart(3, '0')}`;
  const newId = saleData.id || `sale-${tenantShort}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  
  // Non-schema columns to strip before sending to Supabase Sale table
  const invalidCols = ['driverSignatureUrl', 'deliveryStatus', 'paymentHistory', 'notes', 'rate', 'price', 'cropName', 'weight', 'itemsData', 'itemsList', 'customerGstin', 'buyerGstin', 'lineItems'];
  const dbSaleData: any = {};
  for (const [k, v] of Object.entries(saleData)) {
    if (!invalidCols.includes(k)) {
      dbSaleData[k] = v;
    }
  }

  try {
    await supabase.from('Sale').upsert([{
      ...dbSaleData,
      id: newId,
      billNo: serialBillNo,
      tenantId
    }], { onConflict: 'id' }).throwOnError();
  } catch (e) {
    console.error('apiCreateSale error:', e);
  }

  const current = getLocalCache(`seavaig_sales_cache_${tenantId}`, []);
  const updated = [{ ...saleData, id: newId, billNo: serialBillNo, tenantId }, ...current];
  setLocalCache(`seavaig_sales_cache_${tenantId}`, updated);
  return { ...saleData, id: newId, billNo: serialBillNo, tenantId };
};

export const apiUpdateSalePayment = async (
  saleId: string,
  paymentUpdate: {
    amountPaidNow: number;
    paymentMode: string;
    referenceNo?: string;
    notes?: string;
  }
) => {
  const tenantId = getTenantId();
  if (!tenantId) throw new Error('No tenant');

  // Fetch the sale from Supabase or cache
  let currentSale: any = null;
  const { data } = await supabase.from('Sale').select('*').eq('id', saleId).limit(1);
  if (data && data.length > 0) {
    currentSale = data[0];
  } else {
    const cached = getLocalCache(`seavaig_sales_cache_${tenantId}`, []);
    currentSale = cached.find((s: any) => s.id === saleId || s.billNo === saleId);
  }

  if (!currentSale) throw new Error('Sale invoice not found');

  const totalAmount = Number(currentSale.totalAmount || currentSale.amount || 0);
  const prevPaid = Number(currentSale.paidAmount || 0);
  const newPaidAmount = prevPaid + Number(paymentUpdate.amountPaidNow || 0);
  const newDueAmount = Math.max(0, totalAmount - newPaidAmount);
  const newStatus = newDueAmount <= 0 ? 'PAID' : (newPaidAmount > 0 ? 'PARTIAL' : 'UNPAID');

  const paymentRecord = {
    date: new Date().toISOString(),
    amount: Number(paymentUpdate.amountPaidNow || 0),
    mode: paymentUpdate.paymentMode || 'CASH',
    referenceNo: paymentUpdate.referenceNo || '',
    notes: paymentUpdate.notes || '',
  };

  const existingHistory = Array.isArray(currentSale.paymentHistory) ? currentSale.paymentHistory : [];
  const updatedHistory = [...existingHistory, paymentRecord];

  // Update Supabase
  const dbUpdate = {
    paidAmount: newPaidAmount,
    dueAmount: newDueAmount,
    paymentStatus: newStatus,
    status: newStatus,
    updatedAt: new Date().toISOString()
  };

  try {
    await supabase.from('Sale').update(dbUpdate).eq('id', saleId).eq('tenantId', tenantId);
  } catch (e) {
    console.error('Error updating Sale payment in Supabase:', e);
  }

  // Update local cache
  const cachedList = getLocalCache(`seavaig_sales_cache_${tenantId}`, []);
  const updatedList = cachedList.map((s: any) => {
    if (s.id === saleId || s.billNo === saleId) {
      return {
        ...s,
        ...dbUpdate,
        paymentHistory: updatedHistory,
      };
    }
    return s;
  });
  setLocalCache(`seavaig_sales_cache_${tenantId}`, updatedList);

  return {
    ...currentSale,
    ...dbUpdate,
    paymentHistory: updatedHistory,
  };
};

export const apiUpdateSale = async (id: string, updateData: any) => {
  const tenantId = getTenantId();
  try {
    const invalidCols = ['driverSignatureUrl', 'deliveryStatus', 'paymentHistory', 'notes', 'rate', 'price', 'cropName', 'weight'];
    const dbUpdateData: any = {};
    for (const [k, v] of Object.entries(updateData)) {
      if (!invalidCols.includes(k)) {
        dbUpdateData[k] = v;
      }
    }
    if (Object.keys(dbUpdateData).length > 0) {
      let query = supabase.from('Sale').update(dbUpdateData).eq('id', id);
      if (tenantId) {
        query = query.eq('tenantId', tenantId);
      }
      await query;
    }
  } catch (e) {
    console.error('apiUpdateSale error:', e);
  }
};

export const apiUploadImage = async (fileBlob: Blob, path: string, bucket: string = 'images'): Promise<string> => {
  try {
    const { data, error } = await supabase.storage.from(bucket).upload(path, fileBlob, {
      upsert: true
    });
    if (!error && data) {
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
      if (publicUrl) return publicUrl;
    }
  } catch (err) {
    console.warn('Supabase storage upload failed, using robust base64 fallback:', err);
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => {
      resolve('https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&q=80&w=400');
    };
    reader.readAsDataURL(fileBlob);
  });
};

export const apiGetWorkers = async () => {
  const tenantId = getTenantId();
  if (!tenantId) return getLocalCache('seavaig_workers_cache', []);
  const { data } = await supabase.from('DailyWorker').select('*').eq('tenantId', tenantId).order('createdAt', { ascending: false });
  const rawAttendance = getLocalCache(`seavaig_worker_attendance_${tenantId}`, []);
  const list = (data && data.length > 0) ? data : getLocalCache(`seavaig_workers_cache_${tenantId}`, []);
  
  const mapped = list.map((w: any) => {
    const workerAtt = rawAttendance.filter((a: any) => a.workerId === w.id || a.workerCode === w.workerCode);
    return {
      ...w,
      attendanceHistory: workerAtt.length > 0 ? workerAtt : (w.attendanceHistory || [])
    };
  });
  
  setLocalCache(`seavaig_workers_cache_${tenantId}`, mapped);
  return mapped;
};

export const apiCreateWorker = async (workerData: any) => {
  const tenantId = getTenantId();
  if (!tenantId) throw new Error('No tenant');
  
  const tenantShort = getTenantShort(tenantId);
  const today = new Date();
  const ddmmyy = String(today.getDate()).padStart(2, '0') + String(today.getMonth() + 1).padStart(2, '0') + String(today.getFullYear()).slice(2);
  
  const { data: latestData } = await supabase
    .from('DailyWorker')
    .select('workerCode')
    .like('workerCode', `W-${ddmmyy}-${tenantShort}-%`)
    .order('createdAt', { ascending: false })
    .limit(20);

  let serial = 1;
  if (latestData && latestData.length > 0) {
    const existingSerials = latestData.map((d: any) => {
      const parts = (d.workerCode || '').split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      return isNaN(num) ? 0 : num;
    });
    serial = Math.max(...existingSerials, 0) + 1;
  }
  const workerCode = `W-${ddmmyy}-${tenantShort}-${String(serial).padStart(2, '0')}`;
  
  try {
    const workerObj = {
      id: `W${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
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
    
    // Update local cache
    const current = getLocalCache(`seavaig_workers_cache_${tenantId}`, []);
    setLocalCache(`seavaig_workers_cache_${tenantId}`, [workerObj, ...current]);
    return workerObj;
  } catch (e) {
    console.error(e);
    throw e;
  }
};

export const apiUpdateWorker = async (id: string, updateData: any) => {
  const tenantId = getTenantId();
  try {
    // Only pass schema columns to DailyWorker
    const allowed = ['name', 'phone', 'role', 'dailyRate', 'status', 'totalEarned', 'totalPaid', 'outstandingBalance'];
    const sanitized: Record<string, any> = {};
    for (const key of Object.keys(updateData)) {
      if (allowed.includes(key)) {
        sanitized[key] = updateData[key];
      }
    }
    if (Object.keys(sanitized).length > 0) {
      await supabase.from('DailyWorker').update(sanitized).eq('id', id);
    }
  } catch (e) {
    console.error(e);
  }
  if (tenantId) {
    const cacheKey = `seavaig_workers_cache_${tenantId}`;
    const parsed = getLocalCache(cacheKey, []);
    const updated = parsed.map((w: any) => w.id === id ? { ...w, ...updateData } : w);
    setLocalCache(cacheKey, updated);
  }
};

export const apiRecordAttendance = async (attendanceRecord: any) => {
  const tenantId = getTenantId();
  if (tenantId) {
    const key = `seavaig_worker_attendance_${tenantId}`;
    const list = getLocalCache(key, []);
    setLocalCache(key, [attendanceRecord, ...list]);
  }
  return attendanceRecord;
};

export const apiRecordWorkerPayment = async (paymentRecord: any) => {
  const tenantId = getTenantId();
  if (tenantId) {
    const key = `seavaig_worker_payments_${tenantId}`;
    const list = getLocalCache(key, []);
    const record = {
      ...paymentRecord,
      id: `wpay-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toISOString(),
      tenantId
    };
    setLocalCache(key, [record, ...list]);
    return record;
  }
  return paymentRecord;
};

export const apiGetWorkerHistory = async (workerId: string) => {
  const tenantId = getTenantId();
  if (!tenantId) return [];
  const attKey = `seavaig_worker_attendance_${tenantId}`;
  const payKey = `seavaig_worker_payments_${tenantId}`;
  const attList = getLocalCache(attKey, []).filter((a: any) => a.workerId === workerId || a.id?.includes(workerId));
  const payList = getLocalCache(payKey, []).filter((p: any) => p.workerId === workerId);
  return [...attList, ...payList].sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
};

export const apiGetPayments = async () => {
  const tenantId = getTenantId();
  if (!tenantId) return getLocalCache('seavaig_payments_cache', []);
  try {
    const { data: payData } = await supabase
      .from('Payment')
      .select('*')
      .eq('tenantId', tenantId)
      .order('createdAt', { ascending: false });

    if (payData && payData.length > 0) {
      const { data: farmerData } = await supabase
        .from('Farmer')
        .select('*')
        .eq('tenantId', tenantId);
      const farmers = farmerData || [];

      const mapped = payData.map((p: any) => {
        const farmer = farmers.find((f: any) => f.id === p.farmerId || f.phone === p.farmerId || f.farmerIdCode === p.farmerId);
        return {
          ...p,
          id: p.paymentNo || p.id,
          dbId: p.id,
          paymentNo: p.paymentNo || p.id,
          farmerId: p.farmerId || '',
          farmerName: p.farmerName || farmer?.name || 'Farmer',
          phone: farmer?.phone || '',
          village: farmer?.village || '',
          amount: parseFloat(p.amount || 0) || 0,
          paymentMode: p.paymentMode || p.method || 'CASH',
          method: p.paymentMode || p.method || 'CASH',
          status: p.status || 'COMPLETED',
          date: p.date || (p.paymentDate ? p.paymentDate.split('T')[0] : new Date(p.createdAt || Date.now()).toLocaleDateString('en-IN')),
          paymentDate: p.paymentDate || p.createdAt || p.date || null,
          notes: p.notes || '',
          paymentType: p.paymentType || 'FARMER_PAYOUT',
        };
      });
      setLocalCache(`seavaig_payments_cache_${tenantId}`, mapped);
      return mapped;
    }
  } catch (err) {
    console.error('Error in apiGetPayments:', err);
  }
  return getLocalCache(`seavaig_payments_cache_${tenantId}`, []);
};

export const apiCreatePayment = async (payData: any) => {
  const tenantId = getTenantId();
  if (!tenantId) throw new Error('No tenant');
  const tenantShort = getTenantShort(tenantId);
  
  const today = new Date();
  const mmyy = String(today.getMonth() + 1).padStart(2, '0') + String(today.getFullYear()).slice(2);
  
  const { data: latestData } = await supabase
    .from('Payment')
    .select('paymentNo')
    .like('paymentNo', `PV-${mmyy}-${tenantShort}-%`)
    .order('createdAt', { ascending: false })
    .limit(20);

  let serial = 1;
  if (latestData && latestData.length > 0) {
    const existingSerials = latestData.map((d: any) => {
      const parts = (d.paymentNo || '').split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      return isNaN(num) ? 0 : num;
    });
    serial = Math.max(...existingSerials, 0) + 1;
  }

  let paymentNo = payData.paymentNo || `PV-${mmyy}-${tenantShort}-${String(serial).padStart(3, '0')}`;
  let globalId = payData.id || `pay-${tenantShort}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const cleanAmount = typeof payData.amount === 'number'
    ? payData.amount
    : Number(String(payData.amount || '0').replace(/[^0-9.-]+/g, '')) || 0;

  // 1. Resolve Farmer ID in Supabase
  let dbFarmerId = payData.farmerId;
  if (payData.farmerId) {
    try {
      const { data: fRec } = await supabase
        .from('Farmer')
        .select('id')
        .or(`id.eq.${payData.farmerId},farmerIdCode.eq.${payData.farmerId},phone.eq.${payData.farmerId}`)
        .eq('tenantId', tenantId)
        .limit(1)
        .maybeSingle();
      if (fRec?.id) {
        dbFarmerId = fRec.id;
      }
    } catch {}
  }

  // 2. Resolve Purchase ID in Supabase
  let dbPurchaseId: string | null = null;
  if (payData.purchaseId) {
    try {
      const { data: pRec } = await supabase
        .from('Purchase')
        .select('id')
        .or(`id.eq.${payData.purchaseId},purchaseNo.eq.${payData.purchaseId}`)
        .eq('tenantId', tenantId)
        .limit(1)
        .maybeSingle();
      if (pRec?.id) {
        dbPurchaseId = pRec.id;
      }
    } catch {}
  }

  let attempts = 0;
  let success = false;
  let currentPurchaseId: string | null = dbPurchaseId;

  while (attempts < 5 && !success) {
    attempts++;
    const validPaymentDb: any = {
      id: globalId,
      paymentNo,
      farmerId: dbFarmerId,
      amount: cleanAmount,
      paymentMode: payData.paymentMode || payData.method || 'CASH',
      paymentDate: payData.paymentDate || payData.date || new Date().toISOString().slice(0, 10),
      notes: payData.notes || '',
      tenantId,
      paymentType: payData.paymentType || 'FARMER_PAYOUT',
    };
    if (currentPurchaseId) {
      validPaymentDb.purchaseId = currentPurchaseId;
    }
    
    try {
      await supabase.from('Payment').insert([validPaymentDb]).throwOnError();
      success = true;
    } catch (e: any) {
      const errStr = String(e?.message || e?.details || e || '');
      // If purchaseId foreign key violates, strip it immediately and retry
      if (errStr.includes('purchaseId') || errStr.includes('Payment_purchaseId_fkey')) {
        currentPurchaseId = null;
        delete validPaymentDb.purchaseId;
      }

      if (attempts >= 5) {
        console.error('Final attempt failed in apiCreatePayment:', e);
        // fallback to upsert on id without failing foreign keys
        try {
          delete validPaymentDb.purchaseId;
          await supabase.from('Payment').upsert([validPaymentDb], { onConflict: 'id' });
          success = true;
        } catch (upsertErr) {
          console.error('Upsert fallback failed in apiCreatePayment:', upsertErr);
        }
        break;
      }
      serial++;
      paymentNo = `PV-${mmyy}-${tenantShort}-${String(serial).padStart(3, '0')}`;
      globalId = `pay-${tenantShort}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    }
  }

  // Real-time update farmer balance in DB and Cache
  if (payData.farmerId) {
    await apiUpdateFarmerBalance(payData.farmerId, cleanAmount, -cleanAmount, 'PAYMENT', 0);
  }

  const current = getLocalCache(`seavaig_payments_cache_${tenantId}`, []);
  const mappedObj = {
    id: paymentNo,
    dbId: globalId,
    paymentNo,
    farmerId: payData.farmerId,
    farmerName: payData.farmerName || 'Farmer',
    phone: payData.phone || '',
    village: payData.village || '',
    amount: cleanAmount,
    paymentMode: payData.paymentMode || payData.method || 'CASH',
    method: payData.paymentMode || payData.method || 'CASH',
    status: 'COMPLETED',
    date: payData.paymentDate || payData.date || new Date().toISOString().slice(0, 10),
    paymentDate: payData.paymentDate || payData.date || new Date().toISOString().slice(0, 10),
    notes: payData.notes || '',
    tenantId,
    paymentType: payData.paymentType || 'FARMER_PAYOUT',
  };
  setLocalCache(`seavaig_payments_cache_${tenantId}`, [mappedObj, ...current]);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('payments_changed'));
    window.dispatchEvent(new Event('farmers_changed'));
    window.dispatchEvent(new Event('purchases_changed'));
  }
  return mappedObj;
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

  const dbCustomerObj = {
    id: newId,
    customerIdCode: custData.customerIdCode || `C-${Math.floor(1000 + Math.random() * 9000)}`,
    tenantId,
    name: custData.name,
    phone: custData.phone,
    address: custData.address || '',
    totalSales: typeof custData.totalPurchases === 'number' ? custData.totalPurchases : Number(String(custData.totalPurchases || '0').replace(/[^0-9.-]+/g, '')),
    status: custData.status || 'ACTIVE'
  };

  try {
    await supabase.from('Customer').upsert([dbCustomerObj], { onConflict: 'id' }).throwOnError();
  } catch (e) {
    console.error('Error creating customer in Supabase:', e);
  }

  const updated = [customerObj, ...current];
  setLocalCache(`seavaig_customers_cache_${tenantId}`, updated);
  return customerObj;
};

export const apiGetExpenses = async () => {
  const tenantId = getTenantId();
  if (!tenantId) return getLocalCache('seavaig_expenses_cache', []);
  const { data } = await supabase.from('Expense').select('*').eq('tenantId', tenantId).order('createdAt', { ascending: false });
  if (data && data.length > 0) {
    const mapped = data.map((e: any) => ({
      id: e.id,
      title: e.notes || e.category || 'Expense',
      category: e.category,
      amount: `₹${Number(e.amount || 0).toLocaleString('en-IN')}`,
      date: e.date,
      paymentMode: e.paymentMode || 'CASH',
      loggedBy: 'Agency Admin',
    }));
    setLocalCache(`seavaig_expenses_cache_${tenantId}`, mapped);
    return mapped;
  }
  return getLocalCache(`seavaig_expenses_cache_${tenantId}`, []);
};

export const apiCreateExpense = async (expData: any) => {
  const tenantId = getTenantId();
  if (!tenantId) throw new Error('No tenant');

  const cleanAmount = typeof expData.amount === 'number'
    ? expData.amount
    : Number(String(expData.amount || '0').replace(/[^0-9.-]+/g, '')) || 0;

  const newId = expData.id || `exp-${(tenantId || 'ten').slice(-4)}-${Date.now()}`;
  const expenseDbObj = {
    id: newId,
    tenantId,
    category: expData.category || 'Operations',
    amount: cleanAmount,
    date: expData.date || new Date().toISOString().slice(0, 10),
    notes: expData.title || expData.notes || '',
    paymentMode: expData.paymentMode || 'CASH',
  };

  try {
    await supabase.from('Expense').insert([expenseDbObj]).throwOnError();
  } catch (e) {
    console.error('Error inserting expense into Supabase:', e);
  }

  const current = getLocalCache(`seavaig_expenses_cache_${tenantId}`, []);
  const formattedExp = {
    id: newId,
    title: expData.title || expData.notes || 'Expense',
    category: expData.category || 'Operations',
    amount: `₹${cleanAmount.toLocaleString('en-IN')}`,
    date: expData.date || new Date().toISOString().slice(0, 10),
    paymentMode: expData.paymentMode || 'CASH',
    loggedBy: expData.loggedBy || 'Agency Admin',
  };
  const updated = [formattedExp, ...current];
  setLocalCache(`seavaig_expenses_cache_${tenantId}`, updated);
  return formattedExp;
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

// ----------------------------------------------------
// GLOBAL NETWORK DISCOVERY & IMPORT
// ----------------------------------------------------

export const apiCheckFarmerNetwork = async (phone: string) => {
  const currentTenantId = getTenantId();
  const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
  if (cleanPhone.length < 10) return null;

  try {
    // 1. Check if already registered in current tenant
    if (currentTenantId) {
      const { data: localData } = await supabase
        .from('Farmer')
        .select('*')
        .eq('tenantId', currentTenantId)
        .eq('phone', cleanPhone)
        .limit(1);
      if (localData && localData.length > 0) {
        return { isExistingInCurrentTenant: true, exists: true, farmer: localData[0] };
      }
    }

    // 2. Check across other tenants in the global database
    const { data: globalData } = await supabase
      .from('Farmer')
      .select('*')
      .eq('phone', cleanPhone)
      .limit(1);

    if (globalData && globalData.length > 0) {
      const f = globalData[0];
      return {
        isExistingInCurrentTenant: false,
        foundInNetwork: true,
        exists: true,
        farmer: {
          name: f.name,
          phone: f.phone,
          village: f.village || '',
          taluka: f.taluka || '',
          district: f.district || '',
          bankName: f.bankName || '',
          accountNumber: f.accountNumber || '',
          ifscCode: f.ifscCode || '',
          aadhaarNumber: f.aadhaarNumber || f.aadhaar || '',
          grade: f.grade || 'A_GRADE',
        }
      };
    }
  } catch (err) {
    console.error('Error checking farmer network:', err);
  }
  return null;
};

export const apiImportFarmerFromNetwork = async (farmerData: any) => {
  return await apiCreateFarmer({
    name: farmerData.name,
    phone: farmerData.phone,
    village: farmerData.village || '',
    taluka: farmerData.taluka || '',
    district: farmerData.district || '',
    grade: farmerData.grade || 'A_GRADE',
    status: 'ACTIVE',
    aadhaarNumber: farmerData.aadhaarNumber || farmerData.aadhaar || '',
    bankName: farmerData.bankName || '',
    accountNumber: farmerData.accountNumber || '',
    ifscCode: farmerData.ifscCode || '',
  });
};

export const apiCheckCustomerNetwork = async (phone: string) => {
  const currentTenantId = getTenantId();
  const cleanPhone = phone.trim().replace(/[^0-9]/g, '');
  if (cleanPhone.length < 10) return null;

  try {
    // 1. Check if already registered in current tenant
    if (currentTenantId) {
      const { data: localData } = await supabase
        .from('Customer')
        .select('*')
        .eq('tenantId', currentTenantId)
        .eq('phone', cleanPhone)
        .limit(1);
      if (localData && localData.length > 0) {
        return { isExistingInCurrentTenant: true, exists: true, customer: localData[0] };
      }
    }

    // 2. Check across other tenants or global customer pool
    const { data: globalData } = await supabase
      .from('Customer')
      .select('*')
      .eq('phone', cleanPhone)
      .limit(1);

    if (globalData && globalData.length > 0) {
      const c = globalData[0];
      return {
        isExistingInCurrentTenant: false,
        foundInNetwork: true,
        exists: true,
        customer: {
          name: c.name,
          phone: c.phone,
          company: c.contactPerson || c.name || '',
          address: c.address || '',
          gstin: c.gstNumber || c.gstin || '',
          email: c.email || '',
        }
      };
    }
  } catch (err) {
    console.error('Error checking customer network:', err);
  }
  return null;
};

export const apiImportCustomerFromNetwork = async (custData: any) => {
  return await apiCreateCustomer({
    name: custData.name,
    company: custData.company || custData.name,
    phone: custData.phone,
    email: custData.email || '',
    address: custData.address || '',
    gstin: custData.gstin || custData.gstNumber || '',
    totalPurchases: 0,
    outstanding: 0,
    status: 'ACTIVE',
  });
};
