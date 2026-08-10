"use client";

import React, { useState, useEffect } from 'react';
import { X, Truck, User, Phone, Camera, PenTool, Plus, Trash2, ShieldCheck } from 'lucide-react';
import { apiCreateSale, apiGetCustomers } from '@/lib/api';

interface AddLogisticsSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddLogisticsSaleModal({ isOpen, onClose, onSuccess }: AddLogisticsSaleModalProps) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  
  // Logistics Manifest Fields
  const [vehicleNo, setVehicleNo] = useState('MH-15-EG-4521');
  const [vehicleType, setVehicleType] = useState('14-FT Eicher Container');
  const [driverName, setDriverName] = useState('Santosh Gaikwad');
  const [driverPhone, setDriverPhone] = useState('9876543210');
  const [ownerName, setOwnerName] = useState('VRL Transport Logistics');
  const [ownerPhone, setOwnerPhone] = useState('9898989898');
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState('https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&q=80&w=400');
  const [driverSignature, setDriverSignature] = useState('SIGNED_DIGITALLY');
  const [ownerSignature, setOwnerSignature] = useState('APPROVED_VRL_STAMP');
  
  // Line items
  const [items, setItems] = useState([
    { cropName: 'Strawberry (A Grade)', grade: 'A_GRADE', weightKg: 450, ratePerKg: 350, unit: 'KG', totalAmount: 157500 }
  ]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    async function loadCustomers() {
      const cached = typeof window !== 'undefined' ? localStorage.getItem('seavaig_customers_cache') : null;
      let cachedList: any[] = [];
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) cachedList = parsed;
        } catch {}
      }

      const res = await apiGetCustomers();
      let list: any[] = cachedList;
      if (res) {
        const fetched = res.data && Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : null);
        if (fetched && fetched.length > 0) list = fetched;
      }

      if (list.length === 0) {
        list = [
          { id: 'cust-01', name: 'Reliance Fresh Ltd', phone: '9876543210', address: 'Mumbai Central Hub' },
          { id: 'cust-02', name: 'BigBasket Wholesale', phone: '9822001122', address: 'Pune Distribution Center' },
          { id: 'cust-03', name: 'Star Bazar APMC Trader', phone: '9765432100', address: 'Vashi APMC Market' },
        ];
      }

      setCustomers(list);
      setSelectedCustomerId(list[0].id);
    }
    loadCustomers();
  }, [isOpen]);

  if (!isOpen) return null;

  const addItem = () => {
    setItems([...items, { cropName: 'Strawberry (B Grade)', grade: 'B_GRADE', weightKg: 200, ratePerKg: 200, unit: 'KG', totalAmount: 40000 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const totalBillAmount = items.reduce((acc, item) => acc + (Number(item.weightKg) * Number(item.ratePerKg)), 0);
  const totalBillWeight = items.reduce((acc, item) => acc + Number(item.weightKg), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const targetCust = customers.find((c) => c.id === selectedCustomerId) || customers[0];

    const newSale = {
      id: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: targetCust?.name || targetCust?.company || 'Reliance Fresh Ltd',
      phone: targetCust?.phone || '9876543210',
      address: targetCust?.address || 'Mumbai Central Hub',
      amount: totalBillAmount,
      totalWeight: totalBillWeight,
      items: items.map((i) => `${i.cropName} (${i.weightKg} KG)`).join(', '),
      status: 'DISPATCHED',
      vehicleNo,
      driverName,
      driverPhone,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    };

    await apiCreateSale(newSale);

    // Save to local cache
    const cachedSales = typeof window !== 'undefined' ? localStorage.getItem('seavaig_sales_cache') : null;
    if (cachedSales) {
      try {
        const parsed = JSON.parse(cachedSales);
        if (Array.isArray(parsed)) {
          localStorage.setItem('seavaig_sales_cache', JSON.stringify([newSale, ...parsed]));
        }
      } catch {}
    } else if (typeof window !== 'undefined') {
      localStorage.setItem('seavaig_sales_cache', JSON.stringify([newSale]));
    }

    setLoading(false);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-100 my-8">
        
        {/* Modal Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-black">B2B Invoice & VRL/Delhivery Style Logistics Manifest</h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs max-h-[80vh] overflow-y-auto">
          
          {/* Customer Selection */}
          <div>
            <label className="font-extrabold text-slate-700 block mb-1">Select B2B Client / Buyer Account</label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.company} ({c.customerIdCode || c.id})
                </option>
              ))}
            </select>
          </div>

          {/* VRL / Delhivery Logistics Section */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 space-y-4">
            <h3 className="font-black text-blue-900 text-xs flex items-center gap-1.5 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Advanced Logistics & Transport Manifest Info</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Vehicle Reg Number</label>
                <input
                  type="text"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl font-bold uppercase"
                  required
                />
              </div>
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Vehicle Type / Model</label>
                <input
                  type="text"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl font-semibold"
                />
              </div>
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Driver Full Name</label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl font-semibold"
                />
              </div>
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Driver Mobile No</label>
                <input
                  type="text"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl font-semibold"
                />
              </div>
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Transport Owner Name</label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl font-semibold"
                />
              </div>
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Transport Owner Phone</label>
                <input
                  type="text"
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl font-semibold"
                />
              </div>
            </div>

            {/* Vehicle Loading Photo Preview & Signatures */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-blue-100">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1 flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-blue-600" />
                  <span>Loaded Vehicle Photo URL</span>
                </label>
                <input
                  type="text"
                  value={vehiclePhotoUrl}
                  onChange={(e) => setVehiclePhotoUrl(e.target.value)}
                  className="w-full p-2 bg-white border border-slate-200 rounded-xl font-medium text-[11px]"
                />
              </div>
              <div>
                <label className="font-extrabold text-slate-700 block mb-1 flex items-center gap-1">
                  <PenTool className="w-3.5 h-3.5 text-blue-600" />
                  <span>Driver & Owner Sign Verification</span>
                </label>
                <div className="flex gap-2">
                  <span className="px-2.5 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center gap-1">
                    ✓ Driver Signed
                  </span>
                  <span className="px-2.5 py-1.5 rounded-lg bg-blue-100 text-blue-800 text-[10px] font-extrabold flex items-center gap-1">
                    ✓ VRL Stamp
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Bill Book Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Crop Line Items Bill Book</h3>
              <button
                type="button"
                onClick={addItem}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Crop Item
              </button>
            </div>

            {items.map((item, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 grid grid-cols-12 gap-2 items-center text-xs">
                <div className="col-span-4">
                  <label className="text-[10px] font-semibold text-slate-400 block">Crop Name & Grade</label>
                  <input
                    type="text"
                    value={item.cropName}
                    onChange={(e) => {
                      const updated = [...items];
                      updated[idx].cropName = e.target.value;
                      setItems(updated);
                    }}
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-[10px] font-semibold text-slate-400 block">Weight (KG)</label>
                  <input
                    type="number"
                    value={item.weightKg}
                    onChange={(e) => {
                      const updated = [...items];
                      updated[idx].weightKg = Number(e.target.value);
                      setItems(updated);
                    }}
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                  />
                </div>
                <div className="col-span-3">
                  <label className="text-[10px] font-semibold text-slate-400 block">Rate / KG (₹)</label>
                  <input
                    type="number"
                    value={item.ratePerKg}
                    onChange={(e) => {
                      const updated = [...items];
                      updated[idx].ratePerKg = Number(e.target.value);
                      setItems(updated);
                    }}
                    className="w-full p-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                  />
                </div>
                <div className="col-span-2 text-right pt-4">
                  <button type="button" onClick={() => removeItem(idx)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Grand Totals */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between font-black text-sm">
            <div>
              <span className="text-xs text-slate-400 font-medium block">Total Weight: {totalBillWeight} KG</span>
              <span>Grand Total Amount</span>
            </div>
            <span className="text-xl text-emerald-400">₹{totalBillAmount.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 font-extrabold rounded-xl text-white shadow-lg shadow-blue-600/20"
            >
              {loading ? 'Creating Manifest Invoice...' : 'Generate Invoice & Print Waybill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
