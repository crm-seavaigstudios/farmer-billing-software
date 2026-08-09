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
import { apiGetDashboardStats } from '@/lib/api';

import {
  ShoppingBag,
  TrendingUp,
  CreditCard,
  Hourglass,
  Users,
  Package,
  Calendar
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>({
    todaysPurchase: '₹1,24,500',
    todaysSales: '₹1,85,000',
    todaysPayment: '₹95,000',
    pendingAmount: '₹4,32,000',
    totalFarmers: 148,
    activeFarmers: 132,
    inventoryValue: '₹3,45,000',
    totalPurchaseThisMonth: '₹14,50,000',
    totalOutstanding: '₹4,32,000',
  });

  useEffect(() => {
    async function loadStats() {
      const res = await apiGetDashboardStats();
      if (res) {
        setStats(res);
      }
    }
    loadStats();
  }, []);

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
                Welcome back, Ajay! Here&apos;s what&apos;s happening in your business today.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white border border-slate-200/80 rounded-xl px-3.5 py-2 shadow-2xs text-xs font-semibold text-slate-700 cursor-pointer hover:bg-slate-50">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} (Today)</span>
            </div>
          </div>

          {/* 6 Top KPI Ribbon Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <KPICard
              title="Today's Purchase"
              value={stats.todaysPurchase}
              change="+12%"
              changeType="up"
              comparison="vs yesterday"
              icon={ShoppingBag}
              iconBgColor="bg-blue-50"
              iconTextColor="text-blue-600"
              sparklineColor="#2563eb"
              sparklinePath="M0,15 L60,15"
            />
            <KPICard
              title="Today's Sales"
              value={stats.todaysSales}
              change="+8%"
              changeType="up"
              comparison="vs yesterday"
              icon={TrendingUp}
              iconBgColor="bg-emerald-50"
              iconTextColor="text-emerald-600"
              sparklineColor="#10b981"
              sparklinePath="M0,15 L60,15"
            />
            <KPICard
              title="Today's Payment"
              value={stats.todaysPayment}
              change="+15%"
              changeType="up"
              comparison="vs yesterday"
              icon={CreditCard}
              iconBgColor="bg-purple-50"
              iconTextColor="text-purple-600"
              sparklineColor="#a855f7"
              sparklinePath="M0,15 L60,15"
            />
            <KPICard
              title="Pending Amount"
              value={stats.pendingAmount}
              change="-4%"
              changeType="down"
              comparison="vs yesterday"
              icon={Hourglass}
              iconBgColor="bg-amber-50"
              iconTextColor="text-amber-600"
              sparklineColor="#f59e0b"
              sparklinePath="M0,15 L60,15"
            />
            <KPICard
              title="Total Farmers"
              value={String(stats.totalFarmers)}
              change="+3"
              changeType="up"
              comparison="vs last month"
              icon={Users}
              iconBgColor="bg-teal-50"
              iconTextColor="text-teal-600"
              sparklineColor="#0d9488"
              sparklinePath="M0,15 L60,15"
            />
            <KPICard
              title="Inventory Value"
              value={stats.inventoryValue}
              change="+5%"
              changeType="up"
              comparison="vs last month"
              icon={Package}
              iconBgColor="bg-rose-50"
              iconTextColor="text-rose-600"
              sparklineColor="#f43f5e"
              sparklinePath="M0,15 L60,15"
            />
          </div>

          {/* Daily Protected Crop Rate Sheet */}
          <DailyRatePINWidget />

          {/* Middle Charts & Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5">
              <PurchaseSalesChart />
            </div>
            <div className="lg:col-span-3">
              <PaymentStatusChart />
            </div>
            <div className="lg:col-span-4">
              <TopCropsWidget />
            </div>
          </div>

          {/* Bottom Data Tables & Activity Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-4">
              <RecentPurchasesTable />
            </div>
            <div className="lg:col-span-4">
              <RecentPaymentsTable />
            </div>
            <div className="lg:col-span-3">
              <RecentActivitiesFeed />
            </div>
            <div className="lg:col-span-1">
              <QuickActionsWidget />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
