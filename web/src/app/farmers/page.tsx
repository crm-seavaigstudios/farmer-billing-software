"use client";

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { AddFarmerModal } from '@/components/farmers/AddFarmerModal';
import { EditFarmerModal } from '@/components/farmers/EditFarmerModal';
import { FarmerDetailDrawer } from '@/components/farmers/FarmerDetailDrawer';
import { AddFarmerMaterialModal } from '@/components/farmers/AddFarmerMaterialModal';
import { AddFarmerAdvanceModal } from '@/components/farmers/AddFarmerAdvanceModal';
import { FinancialSummaryBar, TimelineFilter } from '@/components/common/FinancialSummaryBar';
import { FarmerCategoryModal } from '@/components/farmers/FarmerCategoryModal';
import { useLanguage } from '@/context/LanguageContext';
import { apiGetFarmers, apiGetPurchases, apiGetPayments, apiGetAllFarmerMaterials, apiUpdateFarmer, isFarmerMatch, getTenantId } from '@/lib/api';
import {
  Users,
  Search,
  Filter,
  Download,
  Database,
  Edit3,
  UserPlus,
  Inbox,
  Eye,
  DollarSign
} from 'lucide-react';

export default function FarmersPage() {
  const { t } = useLanguage();
  const [farmers, setFarmers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLiveSynced, setIsLiveSynced] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingFarmer, setEditingFarmer] = useState<any | null>(null);
  const [selectedDetailFarmerId, setSelectedDetailFarmerId] = useState<string | null>(null);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);

  // Material & Advance modal states
  const [selectedFarmerForMaterial, setSelectedFarmerForMaterial] = useState<{ id: string; name: string } | null>(null);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [selectedFarmerForAdvance, setSelectedFarmerForAdvance] = useState<{ id: string; name: string } | null>(null);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryModalTitle, setCategoryModalTitle] = useState('');
  const [categoryType, setCategoryType] = useState<'ADVANCE' | 'PAID' | 'UNPAID' | 'OUTSTANDING'>('PAID');
  const [categoryModalFarmers, setCategoryModalFarmers] = useState<any[]>([]);

  const defaultFarmers: any[] = [];

  const [purchases, setPurchases] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [timelineFilter, setTimelineFilter] = useState<{ filter: TimelineFilter; start?: string; end?: string }>({ filter: 'ALL_TIME' });

  useEffect(() => {
    async function loadData() {
      const [fRes, purRes, payRes, matRes] = await Promise.all([
        apiGetFarmers(),
        apiGetPurchases(),
        apiGetPayments(),
        apiGetAllFarmerMaterials(),
      ]);
      if (fRes && Array.isArray(fRes)) setFarmers(fRes);
      if (purRes && Array.isArray(purRes)) setPurchases(purRes);
      if (payRes && Array.isArray(payRes)) setPayments(payRes);
      if (matRes && Array.isArray(matRes)) setMaterials(matRes);
      setIsLiveSynced(true);
    }
    loadData();

    const handleDataChanged = () => {
      loadData();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('farmers_changed', handleDataChanged);
      window.addEventListener('purchases_changed', handleDataChanged);
      window.addEventListener('payments_changed', handleDataChanged);
      window.addEventListener('materials_changed', handleDataChanged);
      window.addEventListener('material_issued', handleDataChanged);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('farmers_changed', handleDataChanged);
        window.removeEventListener('purchases_changed', handleDataChanged);
        window.removeEventListener('payments_changed', handleDataChanged);
        window.removeEventListener('materials_changed', handleDataChanged);
        window.removeEventListener('material_issued', handleDataChanged);
      }
    };
  }, []);

  const handleAddFarmer = (newFarmer: any) => {
    const updated = [newFarmer, ...farmers];
    setFarmers(updated);
    const tenantId = getTenantId();
    const cacheKey = tenantId ? `seavaig_farmers_cache_${tenantId}` : 'seavaig_farmers_cache';
    if (typeof window !== 'undefined') {
      localStorage.setItem(cacheKey, JSON.stringify(updated));
    }
  };

  const handleSaveFarmer = async (updatedFarmer: any) => {
    const updated = farmers.map((f) => (f.id === updatedFarmer.id ? updatedFarmer : f));
    setFarmers(updated);
    await apiUpdateFarmer(updatedFarmer);
  };

  // Dynamic Financial Metrics Calculation
  let displayPurchased = 0;
  let displayPaid = 0;
  let displayPaidCount = 0;
  let displayUnpaid = 0;
  let displayUnpaidCount = 0;

  if (timelineFilter.filter === 'ALL_TIME') {
    displayPurchased = farmers.reduce((acc, f) => acc + (f.totalPurchase || 0), 0);
    displayPaid = farmers.reduce((acc, f) => acc + (f.totalPaid || 0), 0);
    displayPaidCount = farmers.filter((f) => (f.totalPaid || 0) > 0).length;
    displayUnpaid = farmers.reduce((acc, f) => acc + (f.outstandingAmount || 0), 0);
    displayUnpaidCount = farmers.filter((f) => (f.outstandingAmount || 0) > 0).length;
  } else {
    // Filter purchases and payments by date range
    const startObj = timelineFilter.start ? new Date(timelineFilter.start) : new Date(0);
    startObj.setHours(0,0,0,0);
    const endObj = timelineFilter.end ? new Date(timelineFilter.end) : new Date();
    endObj.setHours(23,59,59,999);
    
    const start = startObj.getTime();
    const end = endObj.getTime();

    const filteredPurchases = purchases.filter(p => {
      const dateVal = p.date || p.purchaseDate || p.createdAt;
      const t = dateVal ? new Date(dateVal).getTime() : 0;
      return t >= start && t <= end;
    });

    const filteredPayments = payments.filter(p => {
      const dateVal = p.paymentDate || p.date || p.createdAt;
      const t = dateVal ? new Date(dateVal).getTime() : 0;
      return t >= start && t <= end && p.paymentType !== 'ADVANCE_PAYOUT';
    });

    displayPurchased = filteredPurchases.reduce((acc, p) => acc + Number(p.totalAmount ?? p.amount ?? p.netAmount ?? 0), 0);
    displayPaid = filteredPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
    
    const paidFarmerIds = new Set(filteredPayments.map(p => p.farmerId));
    displayPaidCount = paidFarmerIds.size;
    
    // For unpaid, we'd need a more complex calculation, but for now we just show overall unpaid
    displayUnpaid = farmers.reduce((acc, f) => acc + (f.outstandingAmount || 0), 0);
    displayUnpaidCount = farmers.filter((f) => (f.outstandingAmount || 0) > 0).length;
  }

  const totalFarmers = farmers.length;

  const handleTimelineChange = (filter: TimelineFilter, startDate?: string, endDate?: string) => {
    setTimelineFilter({ filter, start: startDate, end: endDate });
  };

  const handleCategoryClick = (category: 'PURCHASED' | 'PAID' | 'UNPAID' | 'FARMERS') => {
    setCategoryType(category as any);
    if (category === 'PURCHASED') {
      setCategoryModalTitle(`All Farmers Purchases (${totalFarmers} Farmers)`);
      setCategoryModalFarmers(farmers.filter((f) => (f.totalPurchase || 0) > 0));
    } else if (category === 'PAID') {
      setCategoryModalTitle(`Fully / Partially Paid Farmers (${displayPaidCount} Farmers)`);
      setCategoryModalFarmers(farmers.filter((f) => (f.totalPaid || 0) > 0));
    } else if (category === 'UNPAID') {
      setCategoryModalTitle(`Farmers with Unpaid Bills (${displayUnpaidCount} Farmers)`);
      setCategoryModalFarmers(farmers.filter((f) => (f.outstandingAmount || 0) > 0));
    } else if (category === 'FARMERS') {
      setCategoryModalTitle(`All Active Farmers (${totalFarmers} Farmers)`);
      setCategoryModalFarmers(farmers);
    }
    setIsCategoryModalOpen(true);
  };

  const filteredFarmers = farmers.filter(
    (f) =>
      (f.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.farmerIdCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.phone || '').includes(searchQuery) ||
      (f.village || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900 antialiased selection:bg-blue-500 selection:text-white">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {/* Top Banner Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                  {t.farmers || 'शेतकरी नोंदणी व खाते पुस्तक'}
                </h1>
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Database className="w-3 h-3" />
                  Live Database Connected
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 mt-1">
                Manage Farmer Profiles, Bank Accounts, Advance Credit & Financial Passbooks
              </p>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all hover:scale-102"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register New Farmer</span>
            </button>
          </div>

          {/* FINANCIAL SUMMARY BAR WITH TIMELINE FILTER & DRILL-DOWN */}
          <FinancialSummaryBar
            totalPurchased={displayPurchased}
            totalPaid={displayPaid}
            paidFarmersCount={displayPaidCount}
            totalUnpaid={displayUnpaid}
            unpaidFarmersCount={displayUnpaidCount}
            totalFarmers={totalFarmers}
            onTimelineChange={handleTimelineChange}
            onCategoryClick={handleCategoryClick}
          />

          {/* Farmers Directory Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search farmer name, phone, code or village..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-slate-200">
                  <Filter className="w-3.5 h-3.5" />
                  Filter
                </button>
                <button className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-slate-200">
                  <Download className="w-3.5 h-3.5" />
                  Export Roster
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3.5 px-4">Farmer Code</th>
                    <th className="py-3.5 px-4">Farmer Name</th>
                    <th className="py-3.5 px-4">Location</th>
                    <th className="py-3.5 px-4">Grade</th>
                    <th className="py-3.5 px-4">Payment Status</th>
                    <th className="py-3.5 px-4">Total Purchases</th>
                    <th className="py-3.5 px-4">Total Paid</th>
                    <th className="py-3.5 px-4">Outstanding Due</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredFarmers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center">
                        <Inbox className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm font-bold text-slate-800">No Farmers Registered Yet</p>
                        <p className="text-xs text-slate-500 mt-1">Click "Register New Farmer" above to add your first supplier.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredFarmers.map((f, idx) => {
                      const farmerPurchases = purchases.filter((p: any) => isFarmerMatch(p, f));
                      const farmerPayments = payments.filter((p: any) => isFarmerMatch(p, f));
                      const farmerMaterials = materials.filter((m: any) => isFarmerMatch(m, f));

                      const totalPurchases = farmerPurchases.reduce((sum: number, p: any) => {
                        const itemWeight = parseFloat(String(p.weight || p.totalWeight || '0').replace(/[^0-9.-]+/g, '')) || 0;
                        const itemRate = parseFloat(String(p.rate || '0').replace(/[^0-9.-]+/g, '')) || 0;
                        const calcVal = (itemWeight > 0 && itemRate > 0) ? (itemWeight * itemRate) : 0;
                        const rawAmt = p.totalAmount ?? p.amount ?? p.netAmount ?? calcVal ?? 0;
                        const amt = typeof rawAmt === 'number' ? rawAmt : (parseFloat(String(rawAmt).replace(/[^0-9.-]+/g, '')) || 0);
                        return sum + (amt > 0 ? amt : calcVal);
                      }, 0);

                      const totalPaid = farmerPayments.reduce((sum: number, pay: any) => {
                        return sum + (Number(pay.amount) || 0);
                      }, 0);

                      const totalMaterials = farmerMaterials.reduce((sum: number, m: any) => {
                        const qty = Number(m.quantity || 1);
                        const price = Number(m.unitPrice || 0);
                        const calcTotal = qty * price;
                        return sum + Number(m.totalAmount || m.totalPrice || m.amount || calcTotal || 0);
                      }, 0);

                      // Agricultural Net Balance = Total Purchases (Credits +) - [Total Paid/Advances (Debits -) + Total Materials (Debits -)]
                      const netBalance = totalPurchases - (totalPaid + totalMaterials);
                      const netRowDue = netBalance;

                      return (
                      <tr 
                        key={idx} 
                        onClick={() => setSelectedDetailFarmerId(f.id)} 
                        className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 px-4 font-black text-blue-600">{f.farmerIdCode || f.id}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{f.name}</div>
                          <div className="text-[10px] text-slate-500">{f.phone}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{f.village}, {f.taluka}</td>
                        <td className="py-3.5 px-4">
                          <div className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 inline-block">
                            {f.grade || 'A Grade'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {(() => {
                            let label = 'ALL_SETTLED (पूर्ण हिशोब)';
                            let color = 'bg-slate-50 text-slate-700 border-slate-100';
                            if (netRowDue > 0) {
                              label = 'PENDING_DUE (बाकी देणे)';
                              color = 'bg-rose-50 text-rose-700 border-rose-100';
                            } else if (netRowDue < 0) {
                              label = 'ADVANCE (अ‍ॅडव्हान्स जमा)';
                              color = 'bg-indigo-50 text-indigo-700 border-indigo-100';
                            } else if ((farmerPurchases.length > 0 || farmerPayments.length > 0 || farmerMaterials.length > 0) && netRowDue === 0) {
                              label = 'FULL_PAID (पूर्ण भरणा)';
                              color = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                            }
                            return (
                              <div className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${color} block w-fit`}>
                                {label}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          ₹{farmerPurchases.length > 0 ? totalPurchases.toLocaleString('en-IN') : 0}
                          {farmerPurchases.length > 0 && (
                            <span className="text-[10px] text-slate-400 block font-normal">
                              ({farmerPurchases.length} {farmerPurchases.length === 1 ? 'bill' : 'bills'})
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-emerald-600">
                          ₹{totalPaid.toLocaleString('en-IN')}
                          {farmerPayments.length > 0 && (
                            <span className="text-[10px] text-slate-400 block font-normal">
                              ({farmerPayments.length} {farmerPayments.length === 1 ? 'payout' : 'payouts'})
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-extrabold text-amber-600">
                          {netRowDue < 0 
                            ? `-₹${Math.abs(netRowDue).toLocaleString('en-IN')}` 
                            : `₹${netRowDue.toLocaleString('en-IN')}`}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedDetailFarmerId(f.id)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-extrabold border border-blue-100 flex items-center gap-1 cursor-pointer"
                              title="View Farmer Drawer Passbook"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-600" />
                              <span>Passbook</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingFarmer(f);
                              }}
                              className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold border border-slate-200 flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3 text-slate-500" />
                              <span>Edit</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <AddFarmerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddFarmer={handleAddFarmer}
      />

      <EditFarmerModal
        isOpen={!!editingFarmer}
        onClose={() => setEditingFarmer(null)}
        farmer={editingFarmer}
        onSaveFarmer={handleSaveFarmer}
      />

      <FarmerCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={categoryModalTitle}
        categoryType={categoryType}
        farmers={categoryModalFarmers}
      />

      {selectedDetailFarmerId && (
        <FarmerDetailDrawer
          farmerId={selectedDetailFarmerId}
          farmer={farmers.find(f => f.id === selectedDetailFarmerId || f.farmerIdCode === selectedDetailFarmerId) || null}
          refreshKey={sidebarRefreshKey}
          onClose={() => setSelectedDetailFarmerId(null)}
          onOpenMaterialModal={(fId) => {
            setSelectedDetailFarmerId(fId);
            setIsMaterialModalOpen(true);
          }}
          onOpenAdvanceModal={(fId) => {
            setSelectedDetailFarmerId(fId);
            setIsAdvanceModalOpen(true);
          }}
        />
      )}

      <AddFarmerMaterialModal
        isOpen={isMaterialModalOpen}
        onClose={() => setIsMaterialModalOpen(false)}
        farmerId={selectedDetailFarmerId}
        onSuccess={() => {
          setIsMaterialModalOpen(false);
          setSidebarRefreshKey((prev) => prev + 1);
          const tenantId = getTenantId();
          const cacheKey = tenantId ? `seavaig_farmers_cache_${tenantId}` : 'seavaig_farmers_cache';
          const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
          if (cached) {
            try {
              setFarmers(JSON.parse(cached));
            } catch {}
          }
        }}
      />

      <AddFarmerAdvanceModal
        isOpen={isAdvanceModalOpen}
        onClose={() => setIsAdvanceModalOpen(false)}
        farmerId={selectedDetailFarmerId}
        farmerName={farmers.find((f) => f.id === selectedDetailFarmerId)?.name}
        onSuccess={() => {
          setIsAdvanceModalOpen(false);
          setSidebarRefreshKey((prev) => prev + 1);
          const tenantId = getTenantId();
          const cacheKey = tenantId ? `seavaig_farmers_cache_${tenantId}` : 'seavaig_farmers_cache';
          const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
          if (cached) {
            try {
              setFarmers(JSON.parse(cached));
            } catch {}
          }
        }}
      />
    </div>
  );
}
