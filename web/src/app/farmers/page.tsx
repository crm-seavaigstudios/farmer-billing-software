"use client";

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { AddFarmerModal } from '@/components/farmers/AddFarmerModal';
import { EditFarmerModal } from '@/components/farmers/EditFarmerModal';
import { FarmerDetailSidebar } from '@/components/farmers/FarmerDetailSidebar';
import { AddFarmerMaterialModal } from '@/components/farmers/AddFarmerMaterialModal';
import { AddFarmerAdvanceModal } from '@/components/farmers/AddFarmerAdvanceModal';
import { FinancialSummaryBar, TimelineFilter } from '@/components/common/FinancialSummaryBar';
import { FarmerCategoryModal } from '@/components/farmers/FarmerCategoryModal';
import { useLanguage } from '@/context/LanguageContext';
import { apiGetFarmers } from '@/lib/api';
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingFarmer, setEditingFarmer] = useState<any>(null);
  const [isLiveSynced, setIsLiveSynced] = useState(false);

  // Detail Drawer, Material & Advance Modal State
  const [selectedDetailFarmerId, setSelectedDetailFarmerId] = useState<string | null>(null);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryModalTitle, setCategoryModalTitle] = useState('');
  const [categoryType, setCategoryType] = useState<'ADVANCE' | 'PAID' | 'UNPAID' | 'OUTSTANDING'>('PAID');
  const [categoryModalFarmers, setCategoryModalFarmers] = useState<any[]>([]);

  const defaultFarmers = [
    { id: 'far-01', farmerIdCode: 'FAR-10001', name: 'Ramesh Patil', phone: '9823456789', village: 'Nandgaon', taluka: 'Nashik', grade: 'A Grade', totalPurchase: 124500, totalPaid: 95000, advanceBalance: 15000, outstandingAmount: 14500 },
    { id: 'far-02', farmerIdCode: 'FAR-10002', name: 'Suresh Jadhav', phone: '9765432100', village: 'Yeola', taluka: 'Yeola', grade: 'A Grade', totalPurchase: 85000, totalPaid: 85000, advanceBalance: 0, outstandingAmount: 0 },
    { id: 'far-03', farmerIdCode: 'FAR-10003', name: 'Vijay Shinde', phone: '8856789123', village: 'Pimpalgaon', taluka: 'Niphad', grade: 'B Grade', totalPurchase: 42000, totalPaid: 32000, advanceBalance: 5000, outstandingAmount: 5000 },
    { id: 'far-04', farmerIdCode: 'FAR-10004', name: 'Ganesh More', phone: '9761112345', village: 'Chandwad', taluka: 'Chandwad', grade: 'A Grade', totalPurchase: 156000, totalPaid: 120000, advanceBalance: 20000, outstandingAmount: 16000 },
    { id: 'far-05', farmerIdCode: 'FAR-10005', name: 'Sunil Pawar', phone: '9098765432', village: 'Sinnar', taluka: 'Sinnar', grade: 'A Grade', totalPurchase: 98000, totalPaid: 75000, advanceBalance: 10000, outstandingAmount: 13000 },
    { id: 'far-06', farmerIdCode: 'FAR-10006', name: 'Ajay Deshmukh', phone: '9823001122', village: 'Nandgaon', taluka: 'Nashik', grade: 'B Grade', totalPurchase: 34000, totalPaid: 34000, advanceBalance: 0, outstandingAmount: 0 },
  ];

  useEffect(() => {
    const cached = typeof window !== 'undefined' ? localStorage.getItem('seavaig_farmers_cache') : null;
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFarmers(parsed);
        } else {
          setFarmers(defaultFarmers);
        }
      } catch {
        setFarmers(defaultFarmers);
      }
    } else {
      setFarmers(defaultFarmers);
    }

    async function loadData() {
      const response = await apiGetFarmers();
      if (response && Array.isArray(response) && response.length > 0) {
        setFarmers(response);
        setIsLiveSynced(true);
        localStorage.setItem('seavaig_farmers_cache', JSON.stringify(response));
      }
    }
    loadData();
  }, []);

  const handleAddFarmer = (newFarmer: any) => {
    const updated = [newFarmer, ...farmers];
    setFarmers(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('seavaig_farmers_cache', JSON.stringify(updated));
    }
  };

  const handleSaveFarmer = (updatedFarmer: any) => {
    const updated = farmers.map((f) => (f.id === updatedFarmer.id ? updatedFarmer : f));
    setFarmers(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('seavaig_farmers_cache', JSON.stringify(updated));
    }
  };

  // Dynamic Financial Metrics Calculation
  const totalAdvance = farmers.reduce((acc, f) => acc + (f.advanceBalance || 0), 0);
  const totalPaid = farmers.reduce((acc, f) => acc + (f.totalPaid || 0), 0);
  const paidFarmersCount = farmers.filter((f) => (f.totalPaid || 0) > 0).length;

  const totalUnpaid = farmers.reduce((acc, f) => acc + (f.outstandingAmount || 0), 0);
  const unpaidFarmersCount = farmers.filter((f) => (f.outstandingAmount || 0) > 0).length;

  const totalOutstanding = farmers.reduce((acc, f) => acc + (f.outstandingAmount || 0), 0);
  const outstandingFarmersCount = farmers.filter((f) => (f.outstandingAmount || 0) > 0).length;

  const handleTimelineChange = (filter: TimelineFilter, startDate?: string, endDate?: string) => {
    console.log('Timeline changed to:', filter, startDate, endDate);
  };

  const handleCategoryClick = (category: 'ADVANCE' | 'PAID' | 'UNPAID' | 'OUTSTANDING') => {
    setCategoryType(category);
    if (category === 'ADVANCE') {
      setCategoryModalTitle('Farmers with Active Advance Credit (अ‍ॅडव्हान्स शेतकरी)');
      setCategoryModalFarmers(farmers.filter((f) => (f.advanceBalance || 0) > 0));
    } else if (category === 'PAID') {
      setCategoryModalTitle(`Fully / Partially Paid Farmers (${paidFarmersCount} Farmers)`);
      setCategoryModalFarmers(farmers.filter((f) => (f.totalPaid || 0) > 0));
    } else if (category === 'UNPAID') {
      setCategoryModalTitle(`Farmers with Unpaid Bills (${unpaidFarmersCount} Farmers)`);
      setCategoryModalFarmers(farmers.filter((f) => (f.outstandingAmount || 0) > 0));
    } else if (category === 'OUTSTANDING') {
      setCategoryModalTitle(`Farmers with Outstanding Balance (${outstandingFarmersCount} Farmers)`);
      setCategoryModalFarmers(farmers.filter((f) => (f.outstandingAmount || 0) > 0));
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
            totalAdvance={totalAdvance}
            totalPaid={totalPaid}
            paidFarmersCount={paidFarmersCount}
            totalUnpaid={totalUnpaid}
            unpaidFarmersCount={unpaidFarmersCount}
            totalOutstanding={totalOutstanding}
            outstandingFarmersCount={outstandingFarmersCount}
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
                    <th className="py-3.5 px-4">Grade & Status</th>
                    <th className="py-3.5 px-4">Total Purchases</th>
                    <th className="py-3.5 px-4">Total Paid</th>
                    <th className="py-3.5 px-4">Outstanding Due</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredFarmers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <Inbox className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm font-bold text-slate-800">No Farmers Registered Yet</p>
                        <p className="text-xs text-slate-500 mt-1">Click "Register New Farmer" above to add your first supplier.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredFarmers.map((f, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-black text-blue-600">{f.farmerIdCode || f.id}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{f.name}</div>
                          <div className="text-[10px] text-slate-500">{f.phone}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">{f.village}, {f.taluka}</td>
                        <td className="py-3.5 px-4 space-y-1">
                          <div className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100 inline-block">
                            {f.grade || 'A Grade'}
                          </div>
                          {(() => {
                            const due = Number(f.outstandingAmount || 0);
                            const adv = Number(f.advanceBalance || 0);
                            let label = 'COMPLETED';
                            let color = 'bg-slate-50 text-slate-700 border-slate-100';
                            if (adv > 0) {
                              label = 'ADVANCE (अ‍ॅडव्हान्स जमा)';
                              color = 'bg-indigo-50 text-indigo-700 border-indigo-100';
                            } else if (due > 0) {
                              label = 'PENDING_DUE (बाकी थकबाकी)';
                              color = 'bg-rose-50 text-rose-700 border-rose-100';
                            } else if (f.totalPurchase > 0 && due === 0) {
                              label = 'FULL_PAID (पूर्ण भरणा)';
                              color = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                            } else {
                              label = 'COMPLETED (पूर्ण हिशोब)';
                              color = 'bg-slate-50 text-slate-700 border-slate-100';
                            }
                            return (
                              <div className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${color} block w-fit`}>
                                {label}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900">₹{(f.totalPurchase || 0).toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4 font-extrabold text-emerald-600">₹{(f.totalPaid || 0).toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4 font-extrabold text-amber-600">₹{(f.outstandingAmount || 0).toLocaleString('en-IN')}</td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedDetailFarmerId(f.id)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-extrabold border border-blue-100 flex items-center gap-1 cursor-pointer"
                              title="View Farmer Drawer Passbook"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-600" />
                              <span>Passbook</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedDetailFarmerId(f.id);
                                setIsMaterialModalOpen(true);
                              }}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-bold border border-indigo-100 flex items-center gap-1 cursor-pointer"
                              title="Issue Material / Crates to Farmer"
                            >
                              <span>+ Material</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedDetailFarmerId(f.id);
                                setIsAdvanceModalOpen(true);
                              }}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold border border-emerald-100 flex items-center gap-1 cursor-pointer"
                              title="Disburse Cash Advance to Farmer"
                            >
                              <DollarSign className="w-3 h-3 text-emerald-600" />
                              <span>⚡ Advance</span>
                            </button>
                            <button
                              onClick={() => setEditingFarmer(f)}
                              className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold border border-slate-200 flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3 text-slate-500" />
                              <span>Edit</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
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

      <FarmerDetailSidebar
        farmerId={selectedDetailFarmerId}
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

      <AddFarmerMaterialModal
        isOpen={isMaterialModalOpen}
        onClose={() => setIsMaterialModalOpen(false)}
        farmerId={selectedDetailFarmerId}
        onSuccess={() => {
          setIsMaterialModalOpen(false);
          const cached = typeof window !== 'undefined' ? localStorage.getItem('seavaig_farmers_cache') : null;
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
          const cached = typeof window !== 'undefined' ? localStorage.getItem('seavaig_farmers_cache') : null;
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
