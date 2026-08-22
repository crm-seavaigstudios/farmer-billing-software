"use client";

import React, { useState } from 'react';
import { X, Package, DollarSign, FileText } from 'lucide-react';
import { apiCreateFarmerMaterialPurchase, apiGetMaterialItems, apiAddMaterialItem } from '@/lib/api';
import { useEffect } from 'react';

interface AddFarmerMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  farmerId: string | null;
  onSuccess: () => void;
}

export function AddFarmerMaterialModal({ isOpen, onClose, farmerId, onSuccess }: AddFarmerMaterialModalProps) {
  const [itemName, setItemName] = useState('Empty Crates (कॅरेट)');
  const [quantity, setQuantity] = useState('10');
  const [unit, setUnit] = useState('QTY');
  const [unitPrice, setUnitPrice] = useState('500');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      apiGetMaterialItems().then(setMaterials);
    }
  }, [isOpen]);

  if (!isOpen || !farmerId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const materialTotal = total;

    await apiCreateFarmerMaterialPurchase({
      farmerId,
      itemName,
      quantity: Number(quantity) || 1,
      unit,
      unitPrice: Number(unitPrice) || 0,
      notes,
    });

    // Instantly update farmer advance balance in local cache
    const cached = typeof window !== 'undefined' ? localStorage.getItem('seavaig_farmers_cache') : null;
    if (cached) {
      try {
        const farmersList = JSON.parse(cached);
        if (Array.isArray(farmersList)) {
          const updated = farmersList.map((f: any) => {
            if (f.id === farmerId) {
              return {
                ...f,
                advanceBalance: (f.advanceBalance || 0) + materialTotal,
              };
            }
            return f;
          });
          localStorage.setItem('seavaig_farmers_cache', JSON.stringify(updated));
        }
      } catch {}
    }

    setLoading(false);
    onSuccess();
    onClose();
  };

  const total = (Number(quantity) || 0) * (Number(unitPrice) || 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 border border-slate-100">
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-extrabold">Issue Material / Supplies to Farmer</h2>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="font-extrabold text-slate-700 block mb-1">Item / Material Name</label>
            <div className="flex gap-2">
              <select
                value={itemName}
                onChange={(e) => {
                  if (e.target.value === 'ADD_CUSTOM') {
                    const custom = prompt("Enter new custom material name:");
                    if (custom && custom.trim()) {
                      apiAddMaterialItem(custom.trim()).then(newItem => {
                        setMaterials([...materials, newItem]);
                        setItemName(newItem.name);
                      });
                    }
                  } else {
                    setItemName(e.target.value);
                  }
                }}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800"
              >
                <option value="Empty Crates (कॅरेट)">Empty Crates (कॅरेट)</option>
                {materials.map(m => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
                <option value="ADD_CUSTOM" className="text-blue-600 font-extrabold">+ Add Custom Material...</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-extrabold text-slate-700 block mb-1">Quantity</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                required
              />
            </div>
            <div>
              <label className="font-extrabold text-slate-700 block mb-1">Unit Price (₹)</label>
              <input
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                required
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between font-black text-slate-900">
            <span>Total Material Charge:</span>
            <span className="text-blue-600 text-sm">₹{total.toLocaleString('en-IN')}</span>
          </div>

          <div>
            <label className="font-extrabold text-slate-700 block mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Reason / Description Notes</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Issued 10 crates for strawberry packing season..."
              rows={2}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 font-extrabold rounded-xl text-white shadow-lg shadow-blue-600/20"
            >
              {loading ? 'Issuing...' : 'Issue & Record Charge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
