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
  X
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const { tenant } = useTenant();
  const { isMobileSidebarOpen, closeMobileSidebar } = useSidebar();

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
    { name: t.reportsAnalytics, href: '/reports', icon: BarChart3, hasSubmenu: true },
    { name: t.userManagement, href: '/users', icon: ShieldCheck, hasSubmenu: true },
    { name: t.auditLogs, href: '/audit-logs', icon: FileText, hasSubmenu: false },
    { name: t.settings, href: '/settings', icon: Settings, hasSubmenu: false },
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
        className={`w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between h-screen fixed top-0 left-0 z-50 select-none font-sans transition-transform duration-300 ease-in-out ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:sticky md:translate-x-0`}
      >
        {/* Brand Header */}
        <div>
          <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100">
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
          <button className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0">
            <ChevronsLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-250px)]">
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
      </div>

      {/* Bottom Promo Card & Copyright Footer */}
      <div className="p-3 border-t border-slate-100">
        {/* Farmer App Banner */}
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50/60 to-blue-100/40 border border-blue-100 rounded-2xl p-3.5 relative overflow-hidden group shadow-sm mb-3">
          <div className="pr-12">
            <h4 className="text-xs font-bold text-slate-900 mb-0.5">{t.farmerAppTitle}</h4>
            <p className="text-[11px] text-slate-500 leading-snug mb-3 font-normal">
              {t.farmerAppDesc}
            </p>
            <button className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-semibold py-1.5 px-3 rounded-lg flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all">
              <span>{t.viewFarmerApp}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="absolute -right-2 -bottom-2 opacity-90 group-hover:scale-105 transition-transform">
            <div className="w-14 h-24 bg-slate-900 rounded-[14px] p-1 shadow-lg border border-slate-700">
              <div className="w-full h-full bg-white rounded-[10px] p-1 flex flex-col justify-between">
                <div className="w-4 h-1 bg-slate-200 rounded-full mx-auto" />
                <div className="space-y-1">
                  <div className="w-full h-2 bg-blue-100 rounded" />
                  <div className="w-3/4 h-2 bg-slate-100 rounded" />
                </div>
                <div className="w-full h-3 bg-blue-600 rounded flex items-center justify-center">
                  <Smartphone className="w-2 h-2 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-medium">
          <span>© 2026 <strong className="text-slate-600 font-semibold">{displayName}</strong>. {t.rightsReserved}</span>
        </div>
      </div>
    </aside>
    </>
  );
};
