"use client";

import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Calculator, ShieldCheck, Plus, Sparkles, Search, Check, ChevronDown } from 'lucide-react';
import { apiGetCrops, apiCreateCrop, apiGetFarmers, apiCreatePurchase, apiGetFarmerMaterials, apiGetPayments, apiGetLocations, getTenantId } from '@/lib/api';
interface AddPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPurchase: (purchase: any) => void;
}

const mockFarmersList: any[] = [];

export const AddPurchaseModal: React.FC<AddPurchaseModalProps> = ({
  isOpen,
  onClose,
  onAddPurchase,
}) => {
  const [farmers, setFarmers] = useState<any[]>([]);
  const [farmerSearch, setFarmerSearch] = useState('');
  const [selectedFarmer, setSelectedFarmer] = useState<any>(null);
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

  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('Cold Room #1 (Satpur)');

  useEffect(() => {
    async function loadData() {
      const dbCrops = await apiGetCrops();
      if (dbCrops && Array.isArray(dbCrops) && dbCrops.length > 0) {
        setCrops(dbCrops);
      }

      // Check local cache first for instant zero-data-loss farmer list
      const tenantId = getTenantId();
      const cacheKey = tenantId ? `seavaig_farmers_cache_${tenantId}` : 'seavaig_farmers_cache';
      const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
      let cachedFarmers: any[] = [];
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) cachedFarmers = parsed;
        } catch {}
      }

      const locs = await apiGetLocations();
      if (locs && locs.length > 0) {
        setLocations(locs);
        setSelectedLocation(locs[0].name);
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

  const [deductionMode, setDeductionMode] = useState<'AUTO_FIFO' | 'CUSTOM'>('AUTO_FIFO');
  const [farmerMaterials, setFarmerMaterials] = useState<any[]>([]);
  const [farmerAdvances, setFarmerAdvances] = useState<any[]>([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [selectedAdvanceIds, setSelectedAdvanceIds] = useState<string[]>([]);

  useEffect(() => {
    if (!selectedFarmer || !isOpen) return;
    async function loadFarmerFinancials() {
      const mats = await apiGetFarmerMaterials(selectedFarmer.id);
      setFarmerMaterials(mats || []);
      
      const allPays = await apiGetPayments();
      const advs = (allPays || []).filter(
        (p: any) =>
          (p.farmerId === selectedFarmer.id || p.farmerName === selectedFarmer.name) &&
          (String(p.notes || '').toLowerCase().includes('advance') || p.paymentType === 'ADVANCE' || Number(p.amount) > 0)
      );
      setFarmerAdvances(advs);
    }
    loadFarmerFinancials();
  }, [selectedFarmer, isOpen]);

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

  // Auto vs Custom Deduction calculation
  const customMaterialsTotal = farmerMaterials
    .filter((m) => selectedMaterialIds.includes(m.id))
    .reduce((acc, m) => acc + Number(m.totalPrice || 0), 0);

  const customAdvancesTotal = farmerAdvances
    .filter((adv) => selectedAdvanceIds.includes(adv.id))
    .reduce((acc, adv) => acc + Number(adv.amount || 0), 0);

  const totalDeductionsApplied = deductionMode === 'AUTO_FIFO'
    ? Math.min(selectedFarmer?.advanceBalance || 0, calculatedTotal)
    : Math.min(customMaterialsTotal + customAdvancesTotal, calculatedTotal);

  const dueAmount = Math.max(0, calculatedTotal - totalDeductionsApplied);
  const advanceApplied = totalDeductionsApplied;

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

    const activeAdvanceApplied = deductionMode === 'AUTO_FIFO'
      ? Math.min(selectedFarmer?.advanceBalance || 0, calculatedTotal)
      : customAdvancesTotal;

    const payload = {
      farmerId: selectedFarmer?.id || 'far-01',
      farmerName: selectedFarmer?.name || 'Farmer',
      paidAmount: totalDeductionsApplied,
      dueAmount: dueAmount,
      paymentStatus: dueAmount === 0 ? 'PAID' : (totalDeductionsApplied > 0 ? 'PARTIAL' : 'UNPAID'),
      items: [{
        cropName: activeCropName,
        grade: 'A_GRADE',
        weightKg: quantityOrWeight,
        ratePerKg: ratePerUnit,
        unit: unit,
        packagingCategory: activeCategory
      }],
      storageLocation: selectedLocation,
      advanceApplied: activeAdvanceApplied,
      deductedMaterialIds: deductionMode === 'CUSTOM' ? selectedMaterialIds : []
    };

    const savedPurchase = await apiCreatePurchase(payload);

    const newPurchase = {
      ...savedPurchase,
      phone: selectedFarmer?.phone || '',
      village: selectedFarmer?.village || '',
      category: activeCategory,
    };

    // Mark checked materials as deducted in DB and local cache
    if (deductionMode === 'CUSTOM' && selectedMaterialIds.length > 0) {
      const { apiDeductFarmerMaterials, getTenantId } = await import('@/lib/api');
      await apiDeductFarmerMaterials(selectedMaterialIds, savedPurchase.id);
      
      const tenantId = getTenantId();
      const cacheKey = tenantId ? `seavaig_material_supplies_cache_${tenantId}` : 'seavaig_material_supplies_cache';
      const cachedMats = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
      if (cachedMats) {
        try {
          const list = JSON.parse(cachedMats);
          const updated = list.map((m: any) => {
            if (selectedMaterialIds.includes(m.id)) {
              return { ...m, isDeductedFromBill: true, purchaseBillId: savedPurchase.id };
            }
            return m;
          });
          localStorage.setItem(cacheKey, JSON.stringify(updated));
        } catch {}
      }
    }

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
          
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Storage Room / Location *</label>
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
            >
              {locations.map((loc, i) => (
                <option key={i} value={loc.name}>
                  {loc.name}
                </option>
              ))}
            </select>
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

          {/* DEDUCTION ENGINE SELECTOR */}
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">Deduction Method (कपात पद्धत) *</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeductionMode('AUTO_FIFO')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                    deductionMode === 'AUTO_FIFO' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  Auto Chronological FIFO
                </button>
                <button
                  type="button"
                  onClick={() => setDeductionMode('CUSTOM')}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                    deductionMode === 'CUSTOM' ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}
                >
                  Custom Manual Selection
                </button>
              </div>
            </div>

            {deductionMode === 'CUSTOM' && (
              <div className="space-y-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                {/* Cash Advances Checklist */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Unsettled Cash Advances</h4>
                  {farmerAdvances.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">No cash advances found for this farmer.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-24 overflow-y-auto">
                      {farmerAdvances.map((adv) => (
                        <label key={adv.id} className="flex items-center gap-2 text-[10px] font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedAdvanceIds.includes(adv.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAdvanceIds([...selectedAdvanceIds, adv.id]);
                              } else {
                                setSelectedAdvanceIds(selectedAdvanceIds.filter((id) => id !== adv.id));
                              }
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>{adv.notes || 'Disbursed Cash Advance'} - <b>₹{Number(adv.amount || 0).toLocaleString('en-IN')}</b> ({adv.date || 'No Date'})</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Material Supplies Checklist */}
                <div className="border-t border-slate-200 pt-2">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Unsettled Material Input Supplies</h4>
                  {farmerMaterials.length === 0 ? (
                    <p className="text-[10px] text-slate-400 italic">No material supplies issued to this farmer.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-24 overflow-y-auto">
                      {farmerMaterials.map((m) => (
                        <label key={m.id} className="flex items-center gap-2 text-[10px] font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedMaterialIds.includes(m.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedMaterialIds([...selectedMaterialIds, m.id]);
                              } else {
                                setSelectedMaterialIds(selectedMaterialIds.filter((id) => id !== m.id));
                              }
                            }}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>{m.itemName} ({m.quantity} Qty) - <b>₹{Number(m.totalPrice || 0).toLocaleString('en-IN')}</b> ({m.date || 'No Date'})</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* DYNAMIC CALCULATION & AUTO ADVANCE OFFSET PREVIEW */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 border border-blue-100 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Gross Harvest Amount:</span>
              <span className="font-extrabold text-slate-900">₹{calculatedTotal.toLocaleString('en-IN')}</span>
            </div>

            {deductionMode === 'AUTO_FIFO' && selectedFarmer?.advanceBalance > 0 && (
              <div className="flex items-center justify-between text-xs text-emerald-700 font-bold">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Auto FIFO Advance Offset:
                </span>
                <span>- ₹{totalDeductionsApplied.toLocaleString('en-IN')}</span>
              </div>
            )}

            {deductionMode === 'CUSTOM' && (customAdvancesTotal + customMaterialsTotal) > 0 && (
              <div className="space-y-1 text-xs font-bold">
                {customAdvancesTotal > 0 && (
                  <div className="flex items-center justify-between text-emerald-700">
                    <span>Applied Cash Advances:</span>
                    <span>- ₹{customAdvancesTotal.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {customMaterialsTotal > 0 && (
                  <div className="flex items-center justify-between text-rose-700">
                    <span>Applied Material Supplies:</span>
                    <span>- ₹{customMaterialsTotal.toLocaleString('en-IN')}</span>
                  </div>
                )}
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
