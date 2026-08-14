import { supabase } from './supabase';

export const INITIAL_PRODUCTION_FARMERS = [];
export const INITIAL_PRODUCTION_CUSTOMERS = [];
export const INITIAL_PRODUCTION_WORKERS = [];
export const INITIAL_PRODUCTION_TRADERS = [];
export const INITIAL_PRODUCTION_PURCHASES = [];
export const INITIAL_PRODUCTION_SALES = [];
export const INITIAL_PRODUCTION_PAYMENTS = [];

export function initProductionData() {
  if (typeof window === 'undefined') return;

  const rawFarmers = localStorage.getItem('seavaig_farmers_cache');
  if (rawFarmers && rawFarmers.includes('Ramesh Patil')) {
    localStorage.removeItem('seavaig_farmers_cache');
    localStorage.removeItem('seavaig_customers_cache');
    localStorage.removeItem('seavaig_workers_cache');
    localStorage.removeItem('seavaig_traders_cache');
    localStorage.removeItem('seavaig_purchases_cache');
    localStorage.removeItem('seavaig_sales_cache');
    localStorage.removeItem('seavaig_payments_cache');
    localStorage.removeItem('seavaig_material_supplies_cache');
    localStorage.removeItem('seavaig_trader_purchases_cache');
    localStorage.removeItem('seavaig_inventory_cache');
    localStorage.removeItem('seavaig_expenses_cache');
  }

  const keys = [
    'seavaig_farmers_cache',
    'seavaig_customers_cache',
    'seavaig_workers_cache',
    'seavaig_traders_cache',
    'seavaig_purchases_cache',
    'seavaig_sales_cache',
    'seavaig_payments_cache',
    'seavaig_material_supplies_cache',
    'seavaig_trader_purchases_cache',
    'seavaig_inventory_cache',
    'seavaig_expenses_cache'
  ];

  keys.forEach(k => {
    if (!localStorage.getItem(k)) {
      localStorage.setItem(k, JSON.stringify([]));
    }
  });
}
