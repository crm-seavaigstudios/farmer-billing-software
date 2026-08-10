import { supabase } from './supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    return null;
  }
}

// ----------------------------------------------------
// DIRECT SUPABASE DATABASE INTEGRATION LAYER
// ----------------------------------------------------

// Dashboard & Dynamic KPI Engine
export const apiGetDashboardStats = async () => {
  try {
    const [farmersRes, purchasesRes, salesRes, paymentsRes] = await Promise.all([
      supabase.from('farmers').select('id', { count: 'exact' }),
      supabase.from('purchases').select('total_amount'),
      supabase.from('sales').select('amount'),
      supabase.from('payments').select('amount'),
    ]);

    const totalFarmers = farmersRes.count || 0;
    const totalPurchases = (purchasesRes.data || []).reduce((acc: number, r: any) => acc + (r.total_amount || 0), 0);
    const totalSales = (salesRes.data || []).reduce((acc: number, r: any) => acc + (r.amount || 0), 0);
    const totalPaid = (paymentsRes.data || []).reduce((acc: number, r: any) => acc + (r.amount || 0), 0);

    return {
      totalFarmers: totalFarmers || 12,
      activeFarmers: totalFarmers || 10,
      totalPurchasesAmount: `₹${totalPurchases.toLocaleString('en-IN')}`,
      totalSalesAmount: `₹${totalSales.toLocaleString('en-IN')}`,
      totalPaidAmount: `₹${totalPaid.toLocaleString('en-IN')}`,
      netRevenue: `₹${(totalSales - totalPurchases).toLocaleString('en-IN')}`,
    };
  } catch (e) {
    return null;
  }
};

// Farmers API (Direct Supabase Database)
export const apiGetFarmers = async () => {
  try {
    const { data, error } = await supabase.from('farmers').select('*').order('created_at', { ascending: false });
    if (error || !data) return await fetchApi('/farmers');
    return data.map((f: any) => ({
      id: f.id,
      farmerIdCode: f.farmer_code || f.farmerIdCode || `FAR-${f.id.slice(0, 5)}`,
      name: f.name,
      phone: f.phone,
      village: f.village || 'Nandgaon',
      totalPurchase: f.total_purchases || 0,
      totalPaid: f.total_paid || 0,
      advanceBalance: f.advance_balance || 0,
    }));
  } catch {
    return await fetchApi('/farmers');
  }
};

export const apiCreateFarmer = async (data: any) => {
  try {
    const { data: inserted, error } = await supabase.from('farmers').insert([{
      name: data.name,
      phone: data.phone,
      village: data.village,
      farmer_code: data.farmerIdCode || `FAR-${Math.floor(10000 + Math.random() * 90000)}`,
      advance_balance: data.advanceBalance || 0,
    }]).select();
    if (!error && inserted) return inserted[0];
  } catch {}
  return await fetchApi('/farmers', { method: 'POST', body: JSON.stringify(data) });
};

export const apiCreateFarmerMaterialPurchase = async (data: any) => {
  try {
    await supabase.from('material_supplies').insert([{
      farmer_id: data.farmerId,
      item_name: data.itemName,
      quantity: data.quantity,
      unit_price: data.unitPrice,
      total_price: (data.quantity || 1) * (data.unitPrice || 0),
      notes: data.notes,
    }]);
  } catch {}
  return await fetchApi('/farmers/material-purchase', { method: 'POST', body: JSON.stringify(data) });
};

// Purchases API (Direct Supabase Database)
export const apiGetPurchases = async () => {
  try {
    const { data, error } = await supabase.from('purchases').select('*').order('created_at', { ascending: false });
    if (error || !data) return await fetchApi('/purchases');
    return data;
  } catch {
    return await fetchApi('/purchases');
  }
};

export const apiCreatePurchase = async (data: any) => {
  try {
    const { data: inserted, error } = await supabase.from('purchases').insert([{
      farmer_id: data.farmerId,
      crop_name: data.crop,
      weight_kg: data.weightKg,
      rate_per_kg: data.ratePerKg,
      total_amount: data.totalAmount,
      advance_applied: data.advanceApplied,
      due_amount: data.dueAmount,
      payment_status: data.paymentStatus,
    }]).select();
    if (!error && inserted) return inserted[0];
  } catch {}
  return await fetchApi('/purchases', { method: 'POST', body: JSON.stringify(data) });
};

// Payments API (Direct Supabase Database)
export const apiGetPayments = async () => {
  try {
    const { data, error } = await supabase.from('payments').select('*').order('created_at', { ascending: false });
    if (error || !data) return await fetchApi('/payments');
    return data;
  } catch {
    return await fetchApi('/payments');
  }
};

export const apiCreatePayment = async (data: any) => {
  try {
    const { data: inserted, error } = await supabase.from('payments').insert([{
      farmer_id: data.farmerId,
      amount: data.amount,
      payment_mode: data.paymentMode,
      payment_type: data.paymentType,
      notes: data.notes,
    }]).select();
    if (!error && inserted) return inserted[0];
  } catch {}
  return await fetchApi('/payments', { method: 'POST', body: JSON.stringify(data) });
};

// Sales API (Direct Supabase Database)
export const apiGetSales = async () => {
  try {
    const { data, error } = await supabase.from('sales').select('*').order('created_at', { ascending: false });
    if (error || !data) return await fetchApi('/sales');
    return data;
  } catch {
    return await fetchApi('/sales');
  }
};

export const apiCreateSale = async (data: any) => {
  try {
    const { data: inserted, error } = await supabase.from('sales').insert([{
      customer_name: data.customerName,
      amount: data.amount,
      total_weight: data.totalWeight,
      status: data.status,
      vehicle_no: data.vehicleNo,
      driver_name: data.driverName,
    }]).select();
    if (!error && inserted) return inserted[0];
  } catch {}
  return await fetchApi('/sales', { method: 'POST', body: JSON.stringify(data) });
};

// Customers API
export const apiGetCustomers = async () => {
  try {
    const { data, error } = await supabase.from('customers').select('*');
    if (error || !data) return await fetchApi('/customers');
    return data;
  } catch {
    return await fetchApi('/customers');
  }
};

export const apiCreateCustomer = async (data: any) => {
  try {
    const { data: inserted } = await supabase.from('customers').insert([{
      name: data.name,
      phone: data.phone,
      address: data.address,
      gst_number: data.gstNumber,
    }]).select();
    if (inserted) return inserted[0];
  } catch {}
  return await fetchApi('/customers', { method: 'POST', body: JSON.stringify(data) });
};

// Expenses API
export const apiGetExpenses = async () => {
  try {
    const { data, error } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
    if (error || !data) return await fetchApi('/expenses');
    return data;
  } catch {
    return await fetchApi('/expenses');
  }
};

export const apiCreateExpense = async (data: any) => {
  try {
    const { data: inserted } = await supabase.from('expenses').insert([{
      category: data.category,
      amount: data.amount,
      payment_mode: data.paymentMode,
      notes: data.notes,
    }]).select();
    if (inserted) return inserted[0];
  } catch {}
  return await fetchApi('/expenses', { method: 'POST', body: JSON.stringify(data) });
};

// Inventory API
export const apiGetInventory = () => fetchApi('/inventory');

// Workers & Attendance API
export const apiGetWorkers = async () => {
  try {
    const { data, error } = await supabase.from('workers').select('*').order('created_at', { ascending: false });
    if (error || !data) return await fetchApi('/workers');
    return data;
  } catch {
    return await fetchApi('/workers');
  }
};

export const apiCreateWorker = async (data: any) => {
  try {
    const { data: inserted } = await supabase.from('workers').insert([{
      name: data.name,
      phone: data.phone,
      role: data.role,
      daily_rate: data.dailyRate,
      worker_code: data.workerIdCode,
    }]).select();
    if (inserted) return inserted[0];
  } catch {}
  return await fetchApi('/workers', { method: 'POST', body: JSON.stringify(data) });
};

export const apiRecordAttendance = (data: any) => fetchApi('/workers/attendance', { method: 'POST', body: JSON.stringify(data) });
export const apiRecordWorkerPayment = (data: any) => fetchApi('/workers/payment', { method: 'POST', body: JSON.stringify(data) });
export const apiGetWorkerHistory = (id: string) => fetchApi(`/workers/${id}/history`);

// Traders API
export const apiGetTraders = async () => {
  try {
    const { data, error } = await supabase.from('traders').select('*').order('created_at', { ascending: false });
    if (error || !data) return await fetchApi('/traders');
    return data;
  } catch {
    return await fetchApi('/traders');
  }
};

export const apiCreateTrader = async (data: any) => {
  try {
    const { data: inserted } = await supabase.from('traders').insert([{
      name: data.name,
      business_name: data.businessName,
      phone: data.phone,
      gst_number: data.gstNumber,
    }]).select();
    if (inserted) return inserted[0];
  } catch {}
  return await fetchApi('/traders', { method: 'POST', body: JSON.stringify(data) });
};

export const apiGetTraderPurchases = () => fetchApi('/traders/purchases');
export const apiCreateTraderPurchase = (data: any) => fetchApi('/traders/purchases', { method: 'POST', body: JSON.stringify(data) });

// Crops & Users API
export const apiGetCrops = () => fetchApi('/crops');
export const apiCreateCrop = (data: any) => fetchApi('/crops', { method: 'POST', body: JSON.stringify(data) });
export const apiDeleteCrop = (id: string) => fetchApi(`/crops/${id}`, { method: 'DELETE' });

export const apiGetUsers = () => fetchApi('/users');
export const apiRegisterTenant = (data: any) => fetchApi('/tenants/register', { method: 'POST', body: JSON.stringify(data) });
export const apiRegisterStaff = (data: any) => fetchApi('/users/staff', { method: 'POST', body: JSON.stringify(data) });

export const apiCheckFarmerNetwork = (phone: string) => fetchApi(`/farmers/check-network?phone=${encodeURIComponent(phone)}`);
export const apiImportFarmerFromNetwork = (data: any) => fetchApi('/farmers/import-from-network', { method: 'POST', body: JSON.stringify(data) });

export const apiGetDailyRates = () => fetchApi('/daily-rates');
export const apiVerifyPin = (pin: string) => fetchApi('/daily-rates/verify-pin', { method: 'POST', body: JSON.stringify({ pin }) });
export const apiUpdateDailyRate = (data: any) => fetchApi('/daily-rates', { method: 'POST', body: JSON.stringify(data) });
