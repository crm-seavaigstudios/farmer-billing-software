"use client";

import React, { useState } from 'react';
import { X, UserPlus, Shield, Mail, Phone, CreditCard, IdCard } from 'lucide-react';
import { apiRegisterStaff } from '@/lib/api';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddUser: (user: any) => void;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose,
  onAddUser,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    passportGovId: '',
    role: 'ACCOUNTANT',
    password: '',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const generatedStaffCode = `STAFF-2026-${Math.floor(10 + Math.random() * 90)}`;

    const payload = {
      staffIdCode: generatedStaffCode,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      passportOrGovId: formData.passportGovId,
      role: formData.role,
      password: formData.password || 'Staff@123',
    };

    await apiRegisterStaff(payload);

    const newUser = {
      id: `usr-${Date.now()}`,
      staffIdCode: generatedStaffCode,
      name: formData.name || 'New Staff Member',
      email: formData.email || 'staff@company.com',
      phone: formData.phone || '+91 98234 56789',
      passportGovId: formData.passportGovId || 'GOV-MH-99812',
      role: formData.role,
      status: 'ACTIVE',
      lastActive: 'Just now',
    };

    onAddUser(newUser);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200/80 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col justify-between animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Add Staff Member & Issue Identity Card</h2>
              <p className="text-xs font-semibold text-slate-400">Onboard company staff with authenticated login credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Staff Member Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Anil Shinde"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Company Role / Permission *</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="ACCOUNTANT">ACCOUNTANT (खजिनदार / पासबुक अधिकारी)</option>
                <option value="MANAGER">MANAGER (व्यवस्थापक)</option>
                <option value="GATEKEEPER">GATEKEEPER (आवक अधिकारी)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Mobile Phone Number *</label>
              <input
                type="tel"
                required
                placeholder="+91 9823456789"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Passport / Aadhaar Gov ID</label>
              <input
                type="text"
                placeholder="PAS-MH-7712 / Aadhaar"
                value={formData.passportGovId}
                onChange={(e) => setFormData({ ...formData, passportGovId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Staff Login Email *</label>
              <input
                type="email"
                required
                placeholder="anil@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Password *</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IdCard className="w-5 h-5 text-blue-600" />
              <div>
                <span className="text-[10px] font-bold text-blue-700 block uppercase">Auto Staff Identity Card Code</span>
                <span className="text-xs font-medium text-slate-500">Will be generated automatically upon save</span>
              </div>
            </div>
            <span className="text-xs font-black text-blue-700 bg-blue-100 px-2 py-1 rounded-lg">Auto Assign</span>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
            >
              Save Staff & Issue Digital ID
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
