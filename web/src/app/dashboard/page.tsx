"use client";

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { KPICard } from '@/components/dashboard/KPICard';
import { PurchaseSalesChart } from '@/components/dashboard/PurchaseSalesChart';
import { PaymentStatusChart } from '@/components/dashboard/PaymentStatusChart';
import { TopCropsWidget } from '@/components/dashboard/TopCropsWidget';
import { RecentPurchasesTable } from '@/components/dashboard/RecentPurchasesTable';
import { RecentPaymentsTable } from '@/components/dashboard/RecentPaymentsTable';
import { RecentActivitiesFeed } from '@/components/dashboard/RecentActivitiesFeed';
import { QuickActionsWidget } from '@/components/dashboard/QuickActionsWidget';
import { DailyRatePINWidget } from '@/components/common/DailyRatePINModal';
import { apiGetDashboardStats, apiGetFarmers, apiGetPurchases, getTenantId, TimelineFilter, getTimelineDateRange } from '@/lib/api';

import {
  ShoppingBag,
  TrendingUp,
  CreditCard,
  Hourglass,
  Users,
  Package,
  Calendar,
  ChevronDown
} from 'lucide-react';

export default function DashboardPage() {
  const [activeTimeline, setActiveTimeline] = useState<TimelineFilter>('TODAY');
  const [stats, setStats] = useState<any>({
    todaysPurchase: '₹0',
    todaysSales: '₹0',
    todaysPayment: '₹0',
    pendingAmount: '₹0',
    totalFarmers: 0,
    activeFarmers: 0,
    inventoryValue: '₹3,45,000',
  });

  const loadAllData = async (filter: TimelineFilter) => {
    const { start, end } = getTimelineDateRange(filter);
    const apiRes = await apiGetDashboardStats(start, end);
    if (apiRes && apiRes.totalFarmers !== undefined) {
      setStats((prev: any) => ({ ...prev, ...apiRes }));
    } else {

        // Fallback to reading local caches if API fails or offline
        const tenantId = getTenantId() || '';
        const farmersCache = typeof window !== 'undefined' ? localStorage.getItem(`seavaig_farmers_cache_${tenantId}`) : null;
        const purchasesCache = typeof window !== 'undefined' ? localStorage.getItem(`seavaig_purchases_cache_${tenantId}`) : null;
        const salesCache = typeof window !== 'undefined' ? localStorage.getItem(`seavaig_sales_cache_${tenantId}`) : null;
        const paymentsCache = typeof window !== 'undefined' ? localStorage.getItem(`seavaig_payments_cache_${tenantId}`) : null;

        const farmers = farmersCache ? JSON.parse(farmersCache) : [];
        const purchases = purchasesCache ? JSON.parse(purchasesCache) : [];
        const sales = salesCache ? JSON.parse(salesCache) : [];
        const payments = paymentsCache ? JSON.parse(paymentsCache) : [];

        const parseNum = (val: any): number => {
          if (typeof val === 'number') return val;
          if (!val) return 0;
          return Number(String(val).replace(/[^0-9.-]+/g, '')) || 0;
        };

        const inRange = (dStr: string) => {
          if (!dStr) return false;
          const t = new Date(dStr).getTime();
          return t >= start && t <= end;
        };

        const todaysPurchasesList = purchases.filter((p: any) => inRange(p.createdAt || p.date));
        const todaysSalesList = sales.filter((s: any) => inRange(s.createdAt || s.date));
        const todaysPaymentsList = payments.filter((p: any) => inRange(p.createdAt || p.date));

        const calcPurchase = todaysPurchasesList.reduce((acc: number, p: any) => acc + parseNum(p.amount || p.totalAmount || p.netAmount), 0);
        const calcDue = purchases.reduce((acc: number, p: any) => acc + parseNum(p.dueAmount || p.rawDue), 0);
        const calcSales = todaysSalesList.reduce((acc: number, s: any) => acc + parseNum(s.amount || s.totalAmount), 0);
        const calcPayments = todaysPaymentsList.reduce((acc: number, p: any) => acc + parseNum(p.amount), 0);

        const initialStats = {
          todaysPurchase: `₹${calcPurchase.toLocaleString('en-IN')}`,
          todaysSales: `₹${calcSales.toLocaleString('en-IN')}`,
          todaysPayment: `₹${calcPayments.toLocaleString('en-IN')}`,
          pendingAmount: `₹${calcDue.toLocaleString('en-IN')}`,
          totalFarmers: farmers.length,
          activeFarmers: farmers.filter((f: any) => f.status !== 'INACTIVE').length || farmers.length,
          inventoryValue: `₹0`, // Requires real API for inventory aggregate
        };
        setStats(initialStats);
      }
  };

  useEffect(() => {
    loadAllData(activeTimeline);
  }, [activeTimeline]);

  return (
    <div className="flex min-h-screen bg-slateCanvas font-sans">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header primaryButtonLabel="+ Quick Add" />

        <main className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Page Banner & Date Picker Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Dashboard</h1>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Welcome back! Realtime dynamic metrics across your procurement network.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select 
                value={activeTimeline} 
                onChange={(e) => setActiveTimeline(e.target.value as TimelineFilter)}
                className="bg-white border border-slate-200/80 rounded-xl px-3.5 py-2 shadow-2xs text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="TODAY">Today</option>
                <option value="YESTERDAY">Yesterday</option>
                <option value="THIS_WEEK">This Week</option>
                <option value="THIS_MONTH">This Month</option>
                <option value="ALL_TIME">All Time</option>
              </select>
            </div>
          </div>

          {/* 6 Top KPI Ribbon Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <KPICard
              title={activeTimeline === 'ALL_TIME' ? "Total Purchase" : activeTimeline === 'TODAY' ? "Today's Purchase" : "Purchased"}
              value={stats.todaysPurchase}
              change="+12%"
              changeType="up"
              comparison="vs previous"
              icon={ShoppingBag}
              iconBgColor="bg-blue-50"
              iconTextColor="text-blue-600"
              sparklineColor="#2563eb"
              sparklinePath="M0,15 L60,15"
            />
            <KPICard
              title={activeTimeline === 'ALL_TIME' ? "Total Sales" : activeTimeline === 'TODAY' ? "Today's Sales" : "Sales"}
              value={stats.todaysSales}
              change="+8%"
              changeType="up"
              comparison="vs previous"
              icon={TrendingUp}
              iconBgColor="bg-emerald-50"
              iconTextColor="text-emerald-600"
              sparklineColor="#10b981"
              sparklinePath="M0,15 L60,15"
            />
            <KPICard
              title={activeTimeline === 'ALL_TIME' ? "Total Payments" : activeTimeline === 'TODAY' ? "Today's Payment" : "Payments"}
              value={stats.todaysPayment}
              change="+5%"
              changeType="up"
              comparison="vs yesterday"
              icon={CreditCard}
              iconBgColor="bg-purple-50"
              iconTextColor="text-purple-600"
              sparklineColor="#9333ea"
              sparklinePath="M0,15 L60,15"
            />
            <KPICard
              title="Pending Dues"
              value={stats.pendingAmount}
              change="-3%"
              changeType="down"
              comparison="vs yesterday"
              icon={Hourglass}
              iconBgColor="bg-amber-50"
              iconTextColor="text-amber-600"
              sparklineColor="#d97706"
              sparklinePath="M0,15 L60,15"
            />
            <KPICard
              title="Total Farmers"
              value={String(stats.totalFarmers)}
              change={`${stats.activeFarmers} Active`}
              changeType="neutral"
              comparison="Registered"
              icon={Users}
              iconBgColor="bg-teal-50"
              iconTextColor="text-teal-600"
              sparklineColor="#0d9488"
              sparklinePath="M0,15 L60,15"
            />
            <KPICard
              title="Inventory Valuation"
              value={stats.inventoryValue}
              change="Optimal"
              changeType="neutral"
              comparison="Smart Factory"
              icon={Package}
              iconBgColor="bg-indigo-50"
              iconTextColor="text-indigo-600"
              sparklineColor="#4f46e5"
              sparklinePath="M0,15 L60,15"
            />
          </div>

          {/* PIN Lock Quick Rate Widget & Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <DailyRatePINWidget />
            </div>
            <div>
              <QuickActionsWidget />
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <PurchaseSalesChart />
            </div>
            <div>
              <PaymentStatusChart />
            </div>
          </div>

          {/* Top Crops & Tables */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <TopCropsWidget />
            <div className="xl:col-span-2 space-y-6">
              <RecentPurchasesTable />
              <RecentPaymentsTable />
            </div>
          </div>

          {/* Activity Feed */}
          <RecentActivitiesFeed />
        </main>
      </div>
    </div>
  );
}
