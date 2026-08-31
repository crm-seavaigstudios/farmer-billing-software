"use client";

import React, { useState } from 'react';
import { X, UserCheck, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCustomer: (customer: any) => void;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
  onAddCustomer,
}) => {
  const { language } = useLanguage();
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    creditLimit: '₹5,000,000',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newCust = {
      id: `CUST-2026-${Math.floor(100 + Math.random() * 900)}`,
      name: formData.name || 'Green Mart Ltd',
      company: formData.company || 'Green Mart Supermarkets',
      phone: formData.phone || '9822110044',
      email: formData.email || 'orders@greenmart.com',
      address: formData.address || 'Mumbai Terminal 2',
      gstin: formData.gstin || '27BBBCA1111A1Z2',
      creditLimit: formData.creditLimit,
      outstanding: '₹0',
      status: 'ACTIVE',
      totalPurchases: '₹0',
    };
    const { apiCreateCustomer } = await import('@/lib/api');
    try {
      const savedCust = await apiCreateCustomer(newCust);
      onAddCustomer(savedCust);
    } catch (e) {
      console.error(e);
      onAddCustomer(newCust); // Fallback to state update even if DB fails
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200/80 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col justify-between animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black">
              +
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                {language === 'mr' ? 'नवीन बी२बी ग्राहक जोडा (Add Customer)' : 'Add New Corporate B2B Customer'}
              </h3>
              <p className="text-[11px] font-medium text-slate-400">Register supermarket, juice chain or wholesaler</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Company / Customer Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Green Mart Supermarkets Ltd"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. 9822110044"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">GSTIN Number</label>
              <input
                type="text"
                placeholder="27BBBCA1111A1Z2"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Contact Email</label>
              <input
                type="email"
                placeholder="orders@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Assigned Credit Limit</label>
              <input
                type="text"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Delivery Address & Region</label>
            <textarea
              rows={2}
              placeholder="e.g. Terminal 2, Vashi Food Market, Navi Mumbai"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
            />
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
              Register Customer Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
