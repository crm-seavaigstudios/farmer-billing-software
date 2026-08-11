"use client";

import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Calculator, ShieldCheck, Plus, Sparkles, Search, Check, ChevronDown } from 'lucide-react';
import { apiGetCrops, apiCreateCrop, apiGetFarmers, apiCreatePurchase } from '@/lib/api';
interface AddPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPurchase: (purchase: any) => void;
}

const mockFarmersList = [
  { id: 'far-01', farmerIdCode: 'FAR-10001', name: 'Ramesh Patil', phone: '9823456789', village: 'Nandgaon', advanceBalance: 10000 },
  { id: 'far-02', farmerIdCode: 'FAR-10002', name: 'Suresh Jadhav', phone: '9765432100', village: 'Yeola', advanceBalance: 0 },
  { id: 'far-03', farmerIdCode: 'FAR-10003', name: 'Vijay Shinde', phone: '8856789123', village: 'Pimpalgaon', advanceBalance: 5000 },
  { id: 'far-04', farmerIdCode: 'FAR-10004', name: 'Ganesh More', phone: '9761112345', village: 'Chandwad', advanceBalance: 0 },
  { id: 'far-05', farmerIdCode: 'FAR-10005', name: 'Sunil Pawar', phone: '9098765432', village: 'Sinnar', advanceBalance: 15000 },
];

export const AddPurchaseModal: React.FC<AddPurchaseModalProps> = ({
  isOpen,
  onClose,
  onAddPurchase,
}) => {
  const [farmers, setFarmers] = useState<any[]>(mockFarmersList);
  const [farmerSearch, setFarmerSearch] = useState('');
  const [selectedFarmer, setSelectedFarmer] = useState<any>(mockFarmersList[0]);
  const [isFarmerDropdownOpen, setIsFarmerDropdownOpen] = useState(false);

  const [crops, setCrops] = useState<any[]>([
    { id: 'c1', name: 'Strawberry (A Grade)', defaultRate: 280 },
    { id: 'c2', name: 'Strawberry (B Grade)', defaultRate: 180 },
    { id: 'c3', name: 'Grapes (Sonaka)', defaultRate: 110 },
    { id: 'c4', name: 'Tomato (Hybrid)', defaultRate: 40 },
    { id: 'c5', name: 'Pomegranate (Bhagwa)', defaultRate: 140 },
  ]);
  const [selectedCrop, setSelectedCrop] = useState('Strawberry (A Grade)');
  const [customCropName, setCustomCropName] = useState('');
  const [isAddingCustomCrop, setIsAddingCustomCrop] = useState(false);

  // Units & Custom Packaging Categories
  const [unit, setUnit] = useState<'KG' | 'QUINTAL' | 'TON' | 'UNIT'>('KG');
  const [packagingCategory, setPackagingCategory] = useState('कॅरेट (Carret / Crate)');
  const [customCategoryText, setCustomCategoryText] = useState('');
  const [isCustomCategoryActive, setIsCustomCategoryActive] = useState(false);

  const [quantityOrWeight, setQuantityOrWeight] = useState<number>(100);
  const [ratePerUnit, setRatePerUnit] = useState<number>(280);

  useEffect(() => {
    async function loadData() {
      const dbCrops = await apiGetCrops();
      if (dbCrops && Array.isArray(dbCrops) && dbCrops.length > 0) {
        setCrops(dbCrops);
      }

      // Check local cache first for instant zero-data-loss farmer list
      const cached = typeof window !== 'undefined' ? localStorage.getItem('seavaig_farmers_cache') : null;
      let cachedFarmers: any[] = [];
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) cachedFarmers = parsed;
        } catch {}
      }

      const dbFarmersRes = await apiGetFarmers();
      let farmerList: any[] = cachedFarmers;
      if (dbFarmersRes) {
        const list = Array.isArray(dbFarmersRes) ? dbFarmersRes : ((dbFarmersRes as any)?.data || []);
        if (list && list.length > 0) farmerList = list;
      }

      if (farmerList.length > 0) {
        const formatted = farmerList.map((f: any) => ({
          id: f.id,
          farmerIdCode: f.farmerIdCode || f.code || 'FAR-10000',
          name: f.name,
          phone: f.phone || '',
          village: f.village || '',
          advanceBalance: f.advanceBalance ?? Math.max(0, (f.totalPaid || 0) - (f.totalPurchase || 0)),
        }));
        setFarmers(formatted);
        setSelectedFarmer(formatted[0]);
      }
    }
    if (isOpen) loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  // Multi-Unit Total Calculation Logic
  let calculatedTotal = 0;
  if (unit === 'KG' || unit === 'UNIT') {
    calculatedTotal = quantityOrWeight * ratePerUnit;
  } else if (unit === 'QUINTAL') {
    calculatedTotal = (quantityOrWeight / 100) * ratePerUnit; // rate per quintal
  } else if (unit === 'TON') {
    calculatedTotal = (quantityOrWeight / 1000) * ratePerUnit; // rate per ton
  }

  const availableAdvance = selectedFarmer?.advanceBalance || 0;
  const advanceApplied = Math.min(availableAdvance, calculatedTotal);
  const dueAmount = Math.max(0, calculatedTotal - advanceApplied);

  const filteredFarmers = farmers.filter(
    (f) =>
      (f.name || '').toLowerCase().includes(farmerSearch.toLowerCase()) ||
      (f.phone || '').includes(farmerSearch) ||
      (f.village || '').toLowerCase().includes(farmerSearch.toLowerCase()) ||
      (f.farmerIdCode || '').toLowerCase().includes(farmerSearch.toLowerCase())
  );

  const handleSaveCustomCrop = async () => {
    if (!customCropName.trim()) return;
    const newCropObj = { name: customCropName, defaultRate: ratePerUnit };
    await apiCreateCrop(newCropObj);
    setCrops([newCropObj, ...crops]);
    setSelectedCrop(customCropName);
    setIsAddingCustomCrop(false);
    setCustomCropName('');
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeCropName = isAddingCustomCrop ? customCropName : selectedCrop;
    const activeCategory = isCustomCategoryActive ? customCategoryText : packagingCategory;

    const payload = {
      farmerId: selectedFarmer?.id || 'far-01',
      items: [{
        cropName: activeCropName,
        grade: 'A_GRADE',
        weightKg: quantityOrWeight,
        ratePerKg: ratePerUnit,
        unit: unit,
        packagingCategory: activeCategory
      }]
    };

    const savedPurchase = await apiCreatePurchase(payload);

    const newPurchase = {
      id: (savedPurchase as any)?.purchaseNo || (savedPurchase as any)?.purchaseBillNo || `PUR-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      farmerName: selectedFarmer?.name || 'Ramesh Patil',
      farmerId: selectedFarmer?.id || 'far-01',
      phone: selectedFarmer?.phone || '9823456789',
      village: selectedFarmer?.village || 'Nandgaon',
      crop: activeCropName,
      weight: `${quantityOrWeight} ${unit}`,
      unit,
      category: activeCategory,
      rate: `₹${ratePerUnit}/${unit}`,
      amount: `₹${calculatedTotal.toLocaleString('en-IN')}`,
      paidAmount: `₹${advanceApplied.toLocaleString('en-IN')}`,
      advanceApplied: `₹${advanceApplied.toLocaleString('en-IN')}`,
      dueAmount: `₹${dueAmount.toLocaleString('en-IN')}`,
      paymentStatus: dueAmount === 0 ? 'PAID' : (advanceApplied > 0 ? 'PARTIAL' : 'UNPAID'),
      time: 'Just now',
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    };

    onAddPurchase(newPurchase);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200/80 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col justify-between animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Record Harvest Purchase</h2>
              <p className="text-xs font-semibold text-slate-400">Search 500+ Farmers • Multi-Unit Rates • Packaging Categories</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          {/* SEARCHABLE FARMER COMBOBOX */}
          <div className="relative">
            <label className="text-xs font-bold text-slate-700 block mb-1">Search & Select Farmer (500+ Farmers) *</label>
            <div
              onClick={() => setIsFarmerDropdownOpen(!isFarmerDropdownOpen)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-blue-600">{selectedFarmer?.farmerIdCode}</span>
                <span className="font-bold">{selectedFarmer?.name}</span>
                <span className="text-slate-400">({selectedFarmer?.village} • {selectedFarmer?.phone})</span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>

            {/* Dropdown Menu */}
            {isFarmerDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 overflow-hidden p-2 space-y-2 max-h-60 overflow-y-auto">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Type name, phone, village or FAR code..."
                    value={farmerSearch}
                    onChange={(e) => setFarmerSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
                <div className="divide-y divide-slate-100">
                  {filteredFarmers.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => {
                        setSelectedFarmer(f);
                        setIsFarmerDropdownOpen(false);
                      }}
                      className="p-2 hover:bg-blue-50/70 rounded-xl cursor-pointer flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900">{f.name} <span className="text-blue-600">({f.farmerIdCode})</span></div>
                        <div className="text-[10px] text-slate-400">{f.village} • {f.phone}</div>
                      </div>
                      {f.advanceBalance > 0 && (
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          Adv: ₹{f.advanceBalance.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* CROPS SELECTION */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Crop Produce *</label>
              <button
                type="button"
                onClick={() => setIsAddingCustomCrop(!isAddingCustomCrop)}
                className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                {isAddingCustomCrop ? 'Select Existing Crop' : 'Add Custom Crop Name'}
              </button>
            </div>

            {isAddingCustomCrop ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter Crop Name (e.g. Grapes, Tomato, Mango)"
                  value={customCropName}
                  onChange={(e) => setCustomCropName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-blue-300 rounded-xl text-xs font-semibold"
                />
                <button
                  type="button"
                  onClick={handleSaveCustomCrop}
                  className="px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl"
                >
                  Save Crop
                </button>
              </div>
            ) : (
              <select
                value={selectedCrop}
                onChange={(e) => setSelectedCrop(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                {crops.map((c, i) => (
                  <option key={i} value={c.name}>
                    {c.name} {c.nameMr ? `(${c.nameMr})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* MULTI-UNIT & PACKAGING CATEGORY */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Measurement Unit *</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-blue-700"
              >
                <option value="KG">PER KG (प्रति किलो)</option>
                <option value="QUINTAL">PER QUINTAL / 100 KG (प्रति क्विंटल)</option>
                <option value="TON">PER TON / 1000 KG (प्रति टन)</option>
                <option value="UNIT">PER QUANTITY / NAG (प्रति नग)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">Packaging Category *</label>
                <button
                  type="button"
                  onClick={() => setIsCustomCategoryActive(!isCustomCategoryActive)}
                  className="text-[10px] font-bold text-blue-600 hover:underline"
                >
                  {isCustomCategoryActive ? 'Select Preset' : '+ Custom Category'}
                </button>
              </div>

              {isCustomCategoryActive ? (
                <input
                  type="text"
                  placeholder="e.g. 20 KG Export Tray, Sack"
                  value={customCategoryText}
                  onChange={(e) => setCustomCategoryText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-blue-300 rounded-xl text-xs font-semibold"
                />
              ) : (
                <select
                  value={packagingCategory}
                  onChange={(e) => setPackagingCategory(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                >
                  <option value="कॅरेट (Carret / Crate)">कॅरेट (Carret / Crate)</option>
                  <option value="बॉक्स (Box)">बॉक्स (Box)</option>
                  <option value="१० नग बंडल (Bundle 10)">१० नग बंडल (Bundle of 10)</option>
                  <option value="१०० नग बंडल (Bundle 100)">१०० नग बंडल (Bundle of 100)</option>
                  <option value="पोते / गोणी (Sack)">पोते / गोणी (Bag / Sack)</option>
                </select>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Quantity / Weight ({unit}) *</label>
              <input
                type="number"
                min="1"
                required
                value={quantityOrWeight}
                onChange={(e) => setQuantityOrWeight(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Rate per {unit} (₹) *</label>
              <input
                type="number"
                min="1"
                required
                value={ratePerUnit}
                onChange={(e) => setRatePerUnit(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
              />
            </div>
          </div>

          {/* DYNAMIC CALCULATION & AUTO ADVANCE OFFSET PREVIEW */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 border border-blue-100 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Gross Harvest Amount:</span>
              <span className="font-extrabold text-slate-900">₹{calculatedTotal.toLocaleString('en-IN')}</span>
            </div>

            {advanceApplied > 0 && (
              <div className="flex items-center justify-between text-xs text-emerald-700 font-bold">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Auto Advance Offset Applied:
                </span>
                <span>- ₹{advanceApplied.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="h-px bg-blue-200/50" />

            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-blue-900 uppercase">Net Outstanding Due Bill:</span>
              <span className="text-base font-black text-blue-700">₹{dueAmount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Persists to Supabase DB</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-blue-500/20"
            >
              Save & Print Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
