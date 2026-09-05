"use client";

import React, { useState } from 'react';
import { X, UserCheck, CheckCircle, Sparkles, CheckCircle2, Building2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { apiCreateCustomer, apiCheckCustomerNetwork, apiImportCustomerFromNetwork } from '@/lib/api';

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

  const [networkMatch, setNetworkMatch] = useState<any>(null);
  const [showNetworkModal, setShowNetworkModal] = useState(false);

  if (!isOpen) return null;

  const handlePhoneChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData((prev) => ({ ...prev, phone: val }));

    const clean = val.replace(/\D/g, '');
    if (clean.length === 10) {
      const res = await apiCheckCustomerNetwork(clean);
      if (res && res.foundInNetwork && res.customer) {
        setNetworkMatch(res.customer);
        setShowNetworkModal(true);
      }
    }
  };

  const handleImportCustomer = async () => {
    if (!networkMatch) return;
    const importedData = {
      name: networkMatch.name,
      company: networkMatch.company || networkMatch.name,
      phone: networkMatch.phone,
      email: networkMatch.email || '',
      address: networkMatch.address || '',
      gstin: networkMatch.gstin || '',
      totalPurchases: 0,
      outstanding: 0,
      status: 'ACTIVE',
    };

    try {
      const saved = await apiImportCustomerFromNetwork(importedData);
      if (saved) {
        onAddCustomer(saved);
        setShowNetworkModal(false);
        onClose();
      }
    } catch (e) {
      console.error('Import error:', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newCust = {
      id: `CUST-${Date.now()}`,
      name: formData.name || formData.company,
      company: formData.company || formData.name,
      phone: formData.phone,
      email: formData.email || '',
      address: formData.address || '',
      gstin: formData.gstin || '',
      creditLimit: formData.creditLimit,
      outstanding: 0,
      status: 'ACTIVE',
      totalPurchases: 0,
    };
    try {
      const savedCust = await apiCreateCustomer(newCust);
      onAddCustomer(savedCust);
    } catch (e) {
      console.error(e);
      onAddCustomer(newCust);
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
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer">
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
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
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
                onChange={handlePhoneChange}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">GSTIN Number</label>
              <input
                type="text"
                placeholder="27BBBCA1111A1Z2"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Assigned Credit Limit</label>
              <input
                type="text"
                value={formData.creditLimit}
                onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 cursor-pointer"
            >
              Register Customer Account
            </button>
          </div>
        </form>
      </div>

      {/* SEAVAIG Global Customer Network Match Pop-up */}
      {showNetworkModal && networkMatch && (
        <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-in fade-in">
          <div className="bg-white border border-blue-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shadow-sm">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black rounded-full uppercase tracking-wider">
                  Global Network Match
                </span>
                <h3 className="text-sm font-black text-slate-900 mt-0.5">B2B Customer Found!</h3>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 text-xs font-semibold text-slate-700">
              <p className="text-slate-900 font-extrabold text-sm">{networkMatch.company || networkMatch.name}</p>
              <p className="text-slate-500">Mobile: <span className="font-bold text-slate-800">{networkMatch.phone}</span></p>
              {networkMatch.gstin && <p className="text-slate-500">GSTIN: <span className="font-bold text-slate-800">{networkMatch.gstin}</span></p>}
              {networkMatch.address && <p className="text-slate-500">Address: <span className="font-bold text-slate-800">{networkMatch.address}</span></p>}
            </div>

            <p className="text-xs font-bold text-slate-600 text-center">
              Would you like to import this B2B Buyer profile to your agency with a fresh 0-balance account?
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNetworkModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Enter Manually
              </button>
              <button
                type="button"
                onClick={handleImportCustomer}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" /> Import to Agency
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
