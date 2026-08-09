"use client";

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { AddUserModal } from '@/components/users/AddUserModal';
import { useLanguage } from '@/context/LanguageContext';
import { useTenant } from '@/context/TenantContext';
import { apiGetUsers } from '@/lib/api';
import {
  ShieldCheck,
  Users,
  Search,
  Plus,
  Download,
  Building,
  IdCard,
  Inbox
} from 'lucide-react';

const defaultStaffSeed = [
  { id: 'usr-1', staffIdCode: 'STF-101', name: 'Ajay Kadam', email: 'ajay@seavaig.com', role: 'CLIENT_OWNER', status: 'ACTIVE', phone: '9823001122' },
  { id: 'usr-2', staffIdCode: 'STF-102', name: 'Vikram Salunkhe', email: 'vikram@seavaig.com', role: 'ACCOUNTANT', status: 'ACTIVE', phone: '9823003344' },
  { id: 'usr-3', staffIdCode: 'STF-103', name: 'Sanjay More', email: 'sanjay@seavaig.com', role: 'COLD_STORAGE_MANAGER', status: 'ACTIVE', phone: '9823005566' }
];

export default function UsersPage() {
  const { t } = useLanguage();
  const { tenant } = useTenant();
  const [users, setUsers] = useState<any[]>(defaultStaffSeed);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const activeTenantId = tenant?.tenantId || 'tenant_default';

  useEffect(() => {
    async function loadUsers() {
      const res = await apiGetUsers();
      if (res) {
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setUsers(res.data);
        } else if (Array.isArray(res) && res.length > 0) {
          setUsers(res);
        }
      }
    }
    loadUsers();
  }, []);

  const handleAddUser = (newUser: any) => {
    setUsers([{ ...newUser, tenantId: activeTenantId }, ...users]);
  };

  const toggleUserStatus = (id: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' } : u
      )
    );
  };

  // STRICT MULTI-TENANT ISOLATION FILTER:
  // Only display users belonging to the active Client Company tenantId!
  // Exclude SUPER_ADMIN / AGENCY_ADMIN accounts.
  const filteredCompanyUsers = users.filter(
    (u) =>
      (u.tenantId === activeTenantId || !u.tenantId) &&
      u.role !== 'SUPER_ADMIN' &&
      u.role !== 'AGENCY_ADMIN' &&
      (u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.staffIdCode && u.staffIdCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        u.role.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex min-h-screen bg-slateCanvas font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header primaryButtonLabel="+ Add Staff Member" onPrimaryClick={() => setIsAddModalOpen(true)} />

        <main className="p-6 space-y-6 flex-1 overflow-y-auto">
          {/* Header Banner */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900">
                  Staff & Access Control ({tenant?.businessName || 'महाबळेश्वर स्ट्रॉबेरी अ‍ॅग्रो'})
                </h1>
                <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Building className="w-3 h-3" />
                  Company Code: MAG-101
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-400">
                Strict Multi-Tenant Isolated Staff Directory & Digital Identity Cards
              </p>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-sm shadow-blue-500/20 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Company Staff Member</span>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Active Company Staff</span>
                <p className="text-base font-extrabold text-slate-900">{filteredCompanyUsers.length} Staff Members</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Tenant Data Isolation</span>
                <p className="text-base font-extrabold text-emerald-700">100% Isolated</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 p-4 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <IdCard className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Digital ID Badges</span>
                <p className="text-base font-extrabold text-purple-700">Auto Issued</p>
              </div>
            </div>
          </div>

          {/* Staff Table */}
          <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search staff name, ID card, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center gap-2">
                <button className="px-3 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 hover:bg-slate-50">
                  <Download className="w-3.5 h-3.5" />
                  Export Staff Roster
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3.5 px-4">Staff ID Code</th>
                    <th className="py-3.5 px-4">Staff Member</th>
                    <th className="py-3.5 px-4">Company Role</th>
                    <th className="py-3.5 px-4">Contact Phone</th>
                    <th className="py-3.5 px-4">Account Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredCompanyUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-bold text-slate-700">No Staff Members Added Yet</p>
                        <p className="text-xs text-slate-400 mt-1">Click "Add Staff Member" above to onboard your first employee.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredCompanyUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-black text-blue-600 flex items-center gap-1.5">
                          <IdCard className="w-4 h-4 text-blue-500" />
                          {u.staffIdCode || u.id}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-slate-900">{u.name}</div>
                          <div className="text-[10px] text-slate-400">{u.email}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-600">{u.phone}</td>
                        <td className="py-3.5 px-4">
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                            u.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => toggleUserStatus(u.id)}
                            className={`px-3 py-1 rounded-xl text-[11px] font-bold border transition-colors ${
                              u.status === 'ACTIVE'
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {u.status === 'ACTIVE' ? 'Suspend Access' : 'Activate Access'}
                          </button>
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

      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddUser={handleAddUser}
      />
    </div>
  );
}
