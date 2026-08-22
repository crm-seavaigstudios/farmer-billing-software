"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useTenant } from '@/context/TenantContext';
import { initProductionData } from '@/lib/seedData';
import {
  Search,
  Plus,
  Bell,
  SlidersHorizontal,
  ChevronDown,
  Globe,
  LogOut,
  User,
  ShieldCheck,
  Building
} from 'lucide-react';

interface HeaderProps {
  onPrimaryClick?: () => void;
  primaryButtonLabel?: string;
}

export const Header: React.FC<HeaderProps> = ({
  onPrimaryClick,
  primaryButtonLabel = '+ New Purchase',
}) => {
  const { language, setLanguage } = useLanguage();
  const { tenant } = useTenant();
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const cycleLanguage = () => {
    if (language === 'mr') setLanguage('hi');
    else if (language === 'hi') setLanguage('en');
    else setLanguage('mr');
  };

  const handleLogout = () => {
    // Clear tenant session and all isolated caches
    sessionStorage.removeItem('active_tenant');
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('seavaig_')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    
    // Redirect to login
    router.push('/login');
  };

  const displayName = language === 'mr' ? tenant.businessNameMr : tenant.businessName;

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-20 font-sans select-none">
      {/* Global Search Bar */}
      <div className="flex items-center gap-2.5 w-96">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder={
              language === 'mr'
                ? 'शोधा (शेतकरी, पावती, बी२बी ग्राहक)...'
                : language === 'hi'
                ? 'खोजें (किसान, बिल, ग्राहक)...'
                : 'Search anything (Farmers, Purchases, Invoices)...'
            }
            className="w-full pl-10 pr-12 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
          />
          <kbd className="absolute right-3 top-2 px-1.5 py-0.5 text-[9px] font-bold text-slate-400 bg-white border border-slate-200 rounded-md">
            Ctrl K
          </kbd>
        </div>
        <button className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Live Supabase Sync & Cache Clear Button */}
        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('seavaig_farmers_cache');
              localStorage.removeItem('seavaig_purchases_cache');
              localStorage.removeItem('seavaig_sales_cache');
              localStorage.removeItem('seavaig_payments_cache');
              localStorage.removeItem('seavaig_workers_cache');
              localStorage.removeItem('seavaig_traders_cache');
              localStorage.removeItem('seavaig_trader_purchases_cache');
              localStorage.removeItem('seavaig_inventory_cache');
              localStorage.removeItem('seavaig_customers_cache');
              localStorage.removeItem('seavaig_expenses_cache');
              initProductionData();
              window.location.reload();
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-xs font-black text-emerald-700 transition-all cursor-pointer shadow-2xs"
          title="Clear local browser cache, re-seed production master data, and sync Supabase"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          <span>⚡ Sync & Seed Data</span>
        </button>

        {/* Language Toggle Switcher */}
        <button
          onClick={cycleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all cursor-pointer"
          title="Switch Language / भाषा बदलें"
        >
          <Globe className="w-3.5 h-3.5 text-blue-600" />
          <span>{language === 'mr' ? 'मराठी' : language === 'hi' ? 'हिंदी' : 'English'}</span>
          <span className="text-[10px] text-slate-400 font-normal">({language.toUpperCase()})</span>
        </button>

        {/* Primary CTA Button */}
        {onPrimaryClick && (
          <button
            onClick={onPrimaryClick}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
          >
            <span>{primaryButtonLabel}</span>
          </button>
        )}

        {/* Notifications */}
        <button className="relative p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-colors">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />
        </button>

        <div className="h-6 w-px bg-slate-200" />

        {/* User Profile Pill & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
              {tenant.businessName.charAt(0)}
            </div>
            <div className="text-left hidden md:block">
              <span className="text-xs font-extrabold text-slate-900 block leading-none truncate max-w-[120px]">{tenant.businessName}</span>
              <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">Owner</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Profile Dropdown Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 space-y-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="p-2 border-b border-slate-100">
                <span className="text-xs font-black text-slate-900 block truncate">{tenant.businessName}</span>
                <span className="text-[10px] text-slate-400 font-semibold block truncate">{tenant.email}</span>
                <div className="mt-2 px-2 py-1 rounded bg-blue-50 text-blue-700 text-[10px] font-bold flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  <span className="truncate">{displayName}</span>
                </div>
              </div>

              <div className="space-y-0.5">
                <a
                  href="/settings"
                  className="flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>Business Settings</span>
                </a>
              </div>

              <div className="pt-1 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{language === 'mr' ? 'लॉग आउट करा (Log Out)' : 'Log Out Account'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
