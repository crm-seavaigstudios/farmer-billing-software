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

    if (!response.ok) {
      const errDetail = await response.text();
      console.error(`[API Error ${response.status}] ${endpoint}:`, errDetail);
      throw new Error(`API Error ${response.status}: ${errDetail}`);
    }

    return await response.json();
  } catch (error) {
    console.warn(`[API Connection Warning] Request to ${endpoint} failed:`, error);
    return null;
  }
}

// Dashboard & Stats API
export const apiGetDashboardStats = () => fetchApi('/dashboard/stats');
export const apiGetSalesStats = () => fetchApi('/sales/stats');
export const apiGetPaymentsStats = () => fetchApi('/payments/stats');

// Farmers API
export const apiGetFarmers = () => fetchApi('/farmers');
export const apiGetFarmerDetails = (id: string) => fetchApi(`/farmers/${id}`);
export const apiCreateFarmer = (data: any) => fetchApi('/farmers', { method: 'POST', body: JSON.stringify(data) });
export const apiCheckFarmerNetwork = (phone: string) => fetchApi(`/farmers/check-network?phone=${encodeURIComponent(phone)}`);
export const apiImportFarmerFromNetwork = (data: any) => fetchApi('/farmers/import-from-network', { method: 'POST', body: JSON.stringify(data) });
export const apiCreateFarmerMaterialPurchase = (data: any) => fetchApi('/farmers/material-purchase', { method: 'POST', body: JSON.stringify(data) });

// Purchases API
export const apiGetPurchases = () => fetchApi('/purchases');
export const apiCreatePurchase = (data: any) => fetchApi('/purchases', { method: 'POST', body: JSON.stringify(data) });

// Payments API
export const apiGetPayments = () => fetchApi('/payments');
export const apiCreatePayment = (data: any) => fetchApi('/payments', { method: 'POST', body: JSON.stringify(data) });

// Crops API
export const apiGetCrops = () => fetchApi('/crops');
export const apiCreateCrop = (data: any) => fetchApi('/crops', { method: 'POST', body: JSON.stringify(data) });
export const apiDeleteCrop = (id: string) => fetchApi(`/crops/${id}`, { method: 'DELETE' });

// Tenant & Staff Registration API
export const apiGetUsers = () => fetchApi('/users');
export const apiRegisterTenant = (data: any) => fetchApi('/tenants/register', { method: 'POST', body: JSON.stringify(data) });
export const apiRegisterStaff = (data: any) => fetchApi('/users/staff', { method: 'POST', body: JSON.stringify(data) });

// Sales API
export const apiGetSales = () => fetchApi('/sales');
export const apiCreateSale = (data: any) => fetchApi('/sales', { method: 'POST', body: JSON.stringify(data) });

// Customers API
export const apiGetCustomers = () => fetchApi('/customers');
export const apiCreateCustomer = (data: any) => fetchApi('/customers', { method: 'POST', body: JSON.stringify(data) });

// Expenses API
export const apiGetExpenses = () => fetchApi('/expenses');
export const apiCreateExpense = (data: any) => fetchApi('/expenses', { method: 'POST', body: JSON.stringify(data) });

// Inventory API
export const apiGetInventory = () => fetchApi('/inventory');

// Workers & Daily Attendance API
export const apiGetWorkers = () => fetchApi('/workers');
export const apiCreateWorker = (data: any) => fetchApi('/workers', { method: 'POST', body: JSON.stringify(data) });
export const apiRecordAttendance = (data: any) => fetchApi('/workers/attendance', { method: 'POST', body: JSON.stringify(data) });
export const apiRecordWorkerPayment = (data: any) => fetchApi('/workers/payment', { method: 'POST', body: JSON.stringify(data) });
export const apiGetWorkerHistory = (id: string) => fetchApi(`/workers/${id}/history`);

// Traders & Supplies API
export const apiGetTraders = () => fetchApi('/traders');
export const apiCreateTrader = (data: any) => fetchApi('/traders', { method: 'POST', body: JSON.stringify(data) });
export const apiGetTraderPurchases = () => fetchApi('/traders/purchases');
export const apiCreateTraderPurchase = (data: any) => fetchApi('/traders/purchases', { method: 'POST', body: JSON.stringify(data) });

// Daily Crop Rates & Secret PIN API
export const apiGetDailyRates = () => fetchApi('/daily-rates');
export const apiVerifyPin = (pin: string) => fetchApi('/daily-rates/verify-pin', { method: 'POST', body: JSON.stringify({ pin }) });
export const apiUpdateDailyRate = (data: any) => fetchApi('/daily-rates', { method: 'POST', body: JSON.stringify(data) });
