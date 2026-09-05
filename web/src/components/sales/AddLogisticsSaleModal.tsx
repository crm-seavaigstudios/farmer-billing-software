"use client";

import React, { useState, useEffect } from 'react';
import { X, Truck, Calendar, Clock, Download, Plus, Search, CheckCircle2, Factory, Trash2, ShieldCheck, Camera, PenTool } from 'lucide-react';
import { apiCreateSale, apiGetCustomers, apiGetPurchases, apiGetSales, apiUploadImage, getTenantId } from '@/lib/api';

interface AddLogisticsSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddLogisticsSaleModal({ isOpen, onClose, onSuccess }: AddLogisticsSaleModalProps) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [recentPurchases, setRecentPurchases] = useState<any[]>([]);
  const [selectedPurchaseIds, setSelectedPurchaseIds] = useState<string[]>([]);
  const [purchaseSearchQuery, setPurchaseSearchQuery] = useState('');

  const filteredPurchasesForTracking = recentPurchases.filter(
    (p) =>
      (p.farmerName || '').toLowerCase().includes(purchaseSearchQuery.toLowerCase()) ||
      (p.id || '').toLowerCase().includes(purchaseSearchQuery.toLowerCase()) ||
      (p.crop || '').toLowerCase().includes(purchaseSearchQuery.toLowerCase())
  );
  
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

  const [amountPaidNow, setAmountPaidNow] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
              (blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Canvas to Blob failed'));
              },
              'image/jpeg',
              0.6
            );
          } else {
            reject(new Error('Canvas context null'));
          }
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    async function loadCustomers() {
      const cachedPurchases = typeof window !== 'undefined' ? localStorage.getItem('seavaig_purchases_cache') : null;
      if (cachedPurchases) {
        try {
          const parsed = JSON.parse(cachedPurchases);
          if (Array.isArray(parsed)) setRecentPurchases(parsed);
        } catch {}
      }
      const dbSales = await apiGetSales();
      const sales = Array.isArray(dbSales) ? dbSales : [];
      const dbPurchases = await apiGetPurchases();
      
      if (dbPurchases && Array.isArray(dbPurchases)) {
        const purchasesWithRemaining = dbPurchases.map((p: any) => {
          let soldWeight = 0;
          sales.forEach((s: any) => {
            if (s.farmerBatches && Array.isArray(s.farmerBatches) && s.farmerBatches.includes(p.id)) {
              const numBatches = s.farmerBatches.length || 1;
              soldWeight += (Number(s.totalWeight) || 0) / numBatches;
            }
          });
          const origWeight = parseFloat(String(p.weight || '0').replace(/[^0-9.-]+/g, '')) || 0;
          const remainingWeight = Math.max(0, origWeight - soldWeight);
          return { ...p, remainingWeight: Math.round(remainingWeight), origWeight };
        });
        setRecentPurchases(purchasesWithRemaining.filter(p => p.remainingWeight > 0));
      }
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
        const fetched = Array.isArray(res) ? res : ((res as any)?.data || []);
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
    try {
      const targetCust = customers.find((c) => c.id === selectedCustomerId) || customers[0];
      
      const paidAmount = Number(amountPaidNow) || 0;
      const dueAmount = totalBillAmount - paidAmount;
      const paymentStatus = dueAmount <= 0 ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'UNPAID');
      const paymentHistory = paidAmount > 0 ? [{
        date: new Date().toISOString(),
        amount: paidAmount,
        mode: 'CASH'
      }] : [];

      const newSale = {
        id: (() => {
          const d = new Date();
          const prefix = `${String(d.getDate()).padStart(2,'0')}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getFullYear()).slice(-2)}`;
          const todayStr = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
          let count = 1;
          const cached = typeof window !== 'undefined' ? localStorage.getItem('seavaig_sales_cache') : null;
          if (cached) {
            try {
              const list = JSON.parse(cached);
              const todays = list.filter((p:any) => p.date === todayStr || p.saleDate === todayStr);
              count = todays.length + 1;
            } catch {}
          }
          return `${prefix}-${count}`;
        })(),
        customerId: targetCust?.id || selectedCustomerId,
        customerName: targetCust?.name || targetCust?.company || 'Reliance Fresh Ltd',
        phone: targetCust?.phone || '9876543210',
        address: targetCust?.address || 'Mumbai Central Hub',
        amount: totalBillAmount,
        totalWeight: totalBillWeight,
        paidAmount,
        dueAmount,
        paymentStatus,
        paymentHistory,
        items: items.map((i) => `${i.cropName} (${i.weightKg} KG)`).join(', '),
        status: 'DISPATCHED',
        vehicleNo,
        driverName,
        driverPhone,
        farmerBatches: selectedPurchaseIds,
        date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        photoUrl: vehiclePhotoUrl,
      };

      await apiCreateSale(newSale);

      const tenantId = getTenantId();

      // Automated Stock Deduction in Inventory Cache
      const cachedInventory = typeof window !== 'undefined' && tenantId ? localStorage.getItem(`seavaig_inventory_cache_${tenantId}`) : null;
      if (cachedInventory) {
        try {
          const list = JSON.parse(cachedInventory);
          const updated = list.map((item: any) => {
            if (item.item && item.item.toLowerCase().includes('strawberry')) {
              return {
                ...item,
                available: Math.max(0, (item.available || 0) - totalBillWeight)
              };
            }
            return item;
          });
          if (tenantId) {
            localStorage.setItem(`seavaig_inventory_cache_${tenantId}`, JSON.stringify(updated));
          }
        } catch {}
      }

      // Save B2B Sale
      const cachedSales = typeof window !== 'undefined' && tenantId ? localStorage.getItem(`seavaig_sales_cache_${tenantId}`) : null;
      if (cachedSales) {
        try {
          const parsed = JSON.parse(cachedSales);
          if (Array.isArray(parsed) && tenantId) {
            localStorage.setItem(`seavaig_sales_cache_${tenantId}`, JSON.stringify([newSale, ...parsed]));
          }
        } catch {}
      } else if (typeof window !== 'undefined' && tenantId) {
        localStorage.setItem(`seavaig_sales_cache_${tenantId}`, JSON.stringify([newSale]));
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error generating manifest bill:', err);
      alert('Failed to create sale bill: ' + (err?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-extrabold text-slate-700 block mb-1">Select B2B Client / Buyer Account</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.company} ({c.customerIdCode || c.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-extrabold text-slate-700 block mb-1">Farmer Batches Origin Tracking (शेतकरी पीक मागोवा)</label>
              <input
                type="text"
                placeholder="Search farmer name or bill ID..."
                value={purchaseSearchQuery}
                onChange={(e) => setPurchaseSearchQuery(e.target.value)}
                className="w-full px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 placeholder-slate-400 mb-1 focus:outline-none focus:ring-1 focus:ring-blue-500/30"
              />
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 max-h-24 overflow-y-auto font-medium">
                {filteredPurchasesForTracking.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic">No matching farmer harvest purchase bills found.</p>
                ) : (
                  filteredPurchasesForTracking.map((p: any) => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPurchaseIds.includes(p.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedPurchaseIds([...selectedPurchaseIds, p.id]);
                          } else {
                            setSelectedPurchaseIds(selectedPurchaseIds.filter((id) => id !== p.id));
                          }
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{p.farmerName} ({p.id}) - {p.crop} (Remaining: {p.remainingWeight} KG)</span>
                    </label>
                  ))
                )}
              </div>
            </div>
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
                <label className="font-extrabold text-slate-700 block mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-blue-600" />
                    <span>Loaded Vehicle Photo (Camera)</span>
                  </span>
                  {uploading && <span className="text-[10px] text-blue-600 font-bold animate-pulse">Uploading & Compressing...</span>}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    disabled={uploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          setUploading(true);
                          const compressedBlob = await compressImage(file);
                          const url = await apiUploadImage(compressedBlob, `vehicle_photos/${Date.now()}.jpg`, 'images');
                          setVehiclePhotoUrl(url);
                        } catch (error) {
                          console.error('Image upload failed', error);
                          alert('Image upload failed');
                        } finally {
                          setUploading(false);
                        }
                      }
                    }}
                    className="flex-1 p-1.5 bg-white border border-slate-200 rounded-xl font-medium text-[11px] file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                  />
                  {vehiclePhotoUrl && (
                    <img
                      src={vehiclePhotoUrl}
                      alt="Vehicle Preview"
                      className="w-9 h-9 rounded-lg object-cover border border-slate-200 shadow-xs"
                    />
                  )}
                </div>
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
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl">
              <span className="font-extrabold text-slate-700 text-xs">Amount Paid Now (₹)</span>
              <input
                type="number"
                placeholder="0"
                value={amountPaidNow}
                onChange={(e) => setAmountPaidNow(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-32 p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-right text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            
            <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between font-black text-sm">
              <div>
                <span className="text-xs text-slate-400 font-medium block">Total Weight: {totalBillWeight} KG</span>
                <span>Grand Total Amount</span>
              </div>
              <div className="text-right">
                <span className="text-xl text-emerald-400 block">₹{totalBillAmount.toLocaleString('en-IN')}</span>
                {Number(amountPaidNow) > 0 && (
                  <span className="text-[10px] text-slate-400 font-medium">
                    Due: ₹{(totalBillAmount - Number(amountPaidNow)).toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>
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
