"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/context/LanguageContext';
import { useTenant } from '@/context/TenantContext';
import { useSidebar } from '@/context/SidebarContext';
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  CreditCard,
  Tag,
  Package,
  UserCheck,
  DollarSign,
  BarChart3,
  ShieldCheck,
  FileText,
  Settings,
  ChevronRight,
  ChevronsLeft,
  Smartphone,
  ArrowRight,
  Clock,
  Truck,
  StickyNote,
  Video,
  X
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const { tenant } = useTenant();
  const { isMobileSidebarOpen, closeMobileSidebar } = useSidebar();

  const rawAuth = typeof window !== 'undefined' ? localStorage.getItem('active_tenant') : null;
  let userRole = 'OWNER';
  if (rawAuth) {
    try {
      userRole = JSON.parse(rawAuth).userRole || 'OWNER';
    } catch {}
  }

  const isStaff = userRole === 'STAFF';

  const navItems = [
    { name: t.dashboard, href: '/dashboard', icon: LayoutDashboard, hasSubmenu: false },
    { name: t.farmers, href: '/farmers', icon: Users, hasSubmenu: true },
    { name: t.purchaseManagement, href: '/purchases', icon: ShoppingBag, hasSubmenu: true },
    { name: 'Daily Workers & Wages', href: '/workers', icon: Clock, hasSubmenu: false },
    { name: 'Traders & Supplies', href: '/traders', icon: Truck, hasSubmenu: false },
    { name: t.paymentManagement, href: '/payments', icon: CreditCard, hasSubmenu: true },
    { name: t.salesManagement, href: '/sales', icon: Tag, hasSubmenu: true },
    { name: t.inventoryManagement, href: '/inventory', icon: Package, hasSubmenu: true },
    { name: t.customerManagement, href: '/customers', icon: UserCheck, hasSubmenu: true },
    { name: t.expenseManagement, href: '/expenses', icon: DollarSign, hasSubmenu: true },
    { name: language === 'mr' ? 'नोंदी व डायरी' : 'Agency Notes', href: '/notes', icon: StickyNote, hasSubmenu: false },
    { name: t.reportsAnalytics, href: '/reports', icon: BarChart3, hasSubmenu: true },
    ...(!isStaff ? [
      { name: t.userManagement, href: '/users', icon: ShieldCheck, hasSubmenu: true },
      { name: t.auditLogs, href: '/audit-logs', icon: FileText, hasSubmenu: false },
      { name: t.settings, href: '/settings', icon: Settings, hasSubmenu: false },
    ] : [])
  ];

  const displayName = language === 'mr' ? tenant.businessNameMr : tenant.businessName;

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden"
          onClick={closeMobileSidebar}
        />
      )}
      <aside
        className={`w-64 bg-white border-r border-slate-200/80 flex flex-col h-screen fixed top-0 left-0 z-50 select-none font-sans transition-transform duration-300 ease-in-out overflow-hidden ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:sticky md:translate-x-0`}
      >
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100 flex-shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3 min-w-0" onClick={() => closeMobileSidebar()}>
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt={displayName} className="w-9 h-9 rounded-xl object-cover shadow-2xs" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20 flex-shrink-0">
                <span className="text-xl font-extrabold">{displayName.charAt(0)}</span>
              </div>
            )}
            <div className="truncate">
              <span className="font-extrabold text-xs tracking-tight text-slate-900 block leading-tight truncate">
                {displayName}
              </span>
              <span className="text-[9px] font-semibold text-slate-400 block -mt-0.5 tracking-wider uppercase truncate">
                {tenant.subdomain}.agri.app
              </span>
            </div>
          </Link>
          <button 
            onClick={closeMobileSidebar}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0 md:hidden"
            title="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1 overscroll-contain">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileSidebar}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.hasSubmenu && (
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform ${
                      isActive ? 'text-blue-600 rotate-90' : 'text-slate-300 group-hover:text-slate-400'
                    }`}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Promo Card & Copyright Footer */}
        <div className="p-3 border-t border-slate-100 flex-shrink-0 bg-white">
          {/* Farmer App Banner */}
          <Link
            href="/farmer-portal"
            className="block bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-100 rounded-xl p-2.5 transition-all group mb-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
                  <Smartphone className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-[11px] font-bold text-slate-900 leading-tight truncate">{t.farmerAppTitle}</h4>
                  <p className="text-[9px] text-slate-500 font-medium truncate">{t.viewFarmerApp}</p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-blue-600 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
            </div>
          </Link>

          {/* Footer info */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-medium">
            <span className="truncate">© 2026 <strong className="text-slate-600 font-semibold">{displayName}</strong>. {t.rightsReserved}</span>
          </div>
        </div>
      </aside>
    </>
  );
};
