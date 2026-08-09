import React, { useState } from 'react';
import { X, UserPlus, Phone, MapPin, Building, CreditCard, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';
import { apiCreateFarmer, apiCheckFarmerNetwork, apiImportFarmerFromNetwork } from '@/lib/api';

interface AddFarmerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFarmer: (farmer: any) => void;
}

export const AddFarmerModal: React.FC<AddFarmerModalProps> = ({
  isOpen,
  onClose,
  onAddFarmer,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    village: '',
    taluka: '',
    district: '',
    grade: 'A Grade Supplier',
    status: 'ACTIVE',
    aadhaar: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
  });

  const [networkMatch, setNetworkMatch] = useState<any>(null);
  const [showNetworkModal, setShowNetworkModal] = useState(false);

  if (!isOpen) return null;

  const handlePhoneChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormData((prev) => ({ ...prev, phone: val }));

    if (val.replace(/\D/g, '').length === 10) {
      const res = await apiCheckFarmerNetwork(val);
      if (res && res.exists && res.farmer) {
        setNetworkMatch(res.farmer);
        setShowNetworkModal(true);
      }
    }
  };

  const handleImportFarmer = async () => {
    if (!networkMatch) return;
    const importedData = {
      name: networkMatch.name,
      phone: networkMatch.phone,
      village: networkMatch.village || 'Nandgaon',
      taluka: networkMatch.taluka || 'Sinnar',
      district: networkMatch.district || 'Nashik',
      grade: networkMatch.grade || 'A_GRADE',
      status: 'ACTIVE',
      aadhaarNumber: networkMatch.aadhaarNumber || 'XXXX XXXX 5678',
      bankName: networkMatch.bankName || 'Bank of Maharashtra',
      accountNumber: networkMatch.accountNumber || '60294567890',
      ifscCode: networkMatch.ifscCode || 'MAHB0001234',
    };

    const saved = await apiImportFarmerFromNetwork(importedData);
    if (saved) {
      onAddFarmer(saved);
      setShowNetworkModal(false);
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const newFarmer = {
      name: formData.name,
      grade: formData.grade || 'A_GRADE',
      village: formData.village,
      taluka: formData.taluka,
      district: formData.district,
      phone: formData.phone,
      status: formData.status,
      aadhaarNumber: formData.aadhaar,
      bankName: formData.bankName,
      accountNumber: formData.accountNumber,
      ifscCode: formData.ifscCode,
    };

    const savedFarmer = await apiCreateFarmer(newFarmer);
    const resultFarmer = savedFarmer || {
      id: `far-${Date.now()}`,
      farmerIdCode: `FAR-${Math.floor(10000 + Math.random() * 90000)}`,
      ...newFarmer,
      totalPurchase: 0,
      totalPaid: 0,
      outstandingAmount: 0,
    };

    onAddFarmer(resultFarmer);
    setFormData({
      name: '', phone: '', village: '', taluka: '', district: '',
      grade: 'A Grade Supplier', status: 'ACTIVE', aadhaar: '', bankName: '', accountNumber: '', ifscCode: ''
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200/80 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col justify-between animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Add New Strawberry Farmer</h2>
              <p className="text-xs font-semibold text-slate-400">Register a new farmer supplier to the system</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Basic Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-blue-600" />
              Basic Information
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Farmer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patil"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9823456789"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Supplier Grade</label>
                <select
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="A_GRADE">A Grade Supplier</option>
                  <option value="B_GRADE">B Grade Supplier</option>
                  <option value="C_GRADE">C Grade Supplier</option>
                  <option value="PREMIUM">Premium Supplier</option>
                  <option value="CUSTOM">Custom Grade (Manual Input / मॅन्युअली टाईप करा)</option>
                </select>
                {formData.grade === 'CUSTOM' && (
                  <input
                    type="text"
                    placeholder="Type custom grade (e.g. A+ Organic Export)"
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value || 'A_GRADE' })}
                    className="w-full mt-2 px-3 py-1.5 bg-white border border-blue-200 rounded-xl text-xs font-bold text-blue-600 focus:outline-none"
                  />
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Account Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Section 2: Address Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              Location Details
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Village</label>
                <input
                  type="text"
                  placeholder="e.g. Nandgaon"
                  value={formData.village}
                  onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Taluka</label>
                <input
                  type="text"
                  placeholder="e.g. Sinnar"
                  value={formData.taluka}
                  onChange={(e) => setFormData({ ...formData, taluka: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">District</label>
                <input
                  type="text"
                  placeholder="e.g. Nashik"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Section 3: Bank & Identity */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-blue-600" />
              Bank Account & Identity
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Aadhaar Number</label>
                <input
                  type="text"
                  placeholder="XXXX XXXX 5678"
                  value={formData.aadhaar}
                  onChange={(e) => setFormData({ ...formData, aadhaar: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Bank Name</label>
                <input
                  type="text"
                  placeholder="e.g. Bank of Maharashtra"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Account Number</label>
                <input
                  type="text"
                  placeholder="60294567890"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">IFSC Code</label>
                <input
                  type="text"
                  placeholder="MAHB0001234"
                  value={formData.ifscCode}
                  onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
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
              Save Farmer Record
            </button>
          </div>
        </form>
      </div>

      {/* SEAVAIG Network Match Pop-up Modal */}
      {showNetworkModal && networkMatch && (
        <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-in fade-in">
          <div className="bg-white border border-blue-200 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-sm">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black rounded-full uppercase tracking-wider">
                  SEAVAIG Global Network Match
                </span>
                <h3 className="text-sm font-black text-slate-900 mt-0.5">Farmer Found on Network!</h3>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 text-xs font-semibold text-slate-700">
              <p className="text-slate-900 font-extrabold text-sm">{networkMatch.name}</p>
              <p className="text-slate-500">Mobile: <span className="font-bold text-slate-800">{networkMatch.phone}</span></p>
              <p className="text-slate-500">Village: <span className="font-bold text-slate-800">{networkMatch.village || 'Nandgaon'}, {networkMatch.district || 'Nashik'}</span></p>
              <p className="text-slate-500">Bank: <span className="font-bold text-slate-800">{networkMatch.bankName || 'Bank of Maharashtra'} (A/C: {networkMatch.accountNumber || '60294567890'})</span></p>
            </div>

            <p className="text-xs font-bold text-slate-600 text-center">
              Would you like to import and add this registered farmer to your agency with 1-click?
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
                onClick={handleImportFarmer}
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
