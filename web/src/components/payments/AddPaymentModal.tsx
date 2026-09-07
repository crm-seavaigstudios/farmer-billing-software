import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Receipt, Calculator, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import {
  apiCreatePayment,
  apiGetFarmers,
  apiUpdateFarmerBalance,
  apiUpdatePurchase,
  apiGetPurchases,
  apiGetPayments,
  apiGetFarmerMaterials,
  isFarmerMatch,
  getTenantId
} from '@/lib/api';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPayment: (payment: any) => void;
  initialFarmerId?: string;
  initialPurchaseId?: string;
  initialAmount?: number;
}

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
  isOpen,
  onClose,
  onAddPayment,
  initialFarmerId,
  initialPurchaseId,
  initialAmount,
}) => {
  const { language } = useLanguage();
  const [farmersList, setFarmersList] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    farmerId: '',
    farmerName: '',
    phone: '',
    village: '',
    purchaseId: '',
    amount: '',
    paymentType: 'PURCHASE_SETTLEMENT',
    paymentMode: 'UPI',
    notes: '',
  });
  const [farmerPurchases, setFarmerPurchases] = useState<any[]>([]);
  const [farmerFinancials, setFarmerFinancials] = useState({
    totalPurchases: 0,
    totalPaid: 0,
    totalMaterials: 0,
    netDue: 0,
  });

  useEffect(() => {
    if (!formData.farmerId) {
      setFarmerPurchases([]);
      setFarmerFinancials({ totalPurchases: 0, totalPaid: 0, totalMaterials: 0, netDue: 0 });
      return;
    }

    async function loadFarmerHistory() {
      try {
        const foundFarmer = farmersList.find((f) => f.id === formData.farmerId) || { id: formData.farmerId };
        const [allPurchases, allPayments, allMaterials] = await Promise.all([
          apiGetPurchases(),
          apiGetPayments(),
          apiGetFarmerMaterials(formData.farmerId)
        ]);

        const fp = Array.isArray(allPurchases) ? allPurchases.filter((p: any) => isFarmerMatch(p, foundFarmer)) : [];
        const fpay = Array.isArray(allPayments) ? allPayments.filter((p: any) => isFarmerMatch(p, foundFarmer)) : [];
        const fmat = Array.isArray(allMaterials) ? allMaterials : [];

        // Unpaid or partial purchases
        const pendingPurchases = fp.filter((p: any) => p.paymentStatus !== 'PAID');
        setFarmerPurchases(pendingPurchases);

        let totPurchases = 0;
        let totPaid = 0;
        let totMaterials = 0;

        fp.forEach((p: any) => {
          const itemWeight = parseFloat(String(p.weight || p.totalWeight || '0').replace(/[^0-9.-]+/g, '')) || 0;
          const itemRate = parseFloat(String(p.rate || '0').replace(/[^0-9.-]+/g, '')) || 0;
          const calcVal = (itemWeight > 0 && itemRate > 0) ? (itemWeight * itemRate) : 0;
          const rawAmt = p.amount ?? p.totalAmount ?? p.netAmount ?? calcVal ?? 0;
          const parsed = typeof rawAmt === 'number' ? rawAmt : (parseFloat(String(rawAmt).replace(/[^0-9.-]+/g, '')) || 0);
          totPurchases += (parsed > 0 ? parsed : calcVal);
        });

        fpay.forEach((pay: any) => {
          const amt = typeof pay.amount === 'number' ? pay.amount : parseFloat(String(pay.amount || 0).replace(/[^0-9.-]+/g, '')) || 0;
          totPaid += amt;
        });

        fmat.forEach((m: any) => {
          const qty = Number(m.quantity || 1);
          const price = Number(m.unitPrice || 0);
          const calcVal = qty * price;
          const rawAmt = m.totalAmount ?? m.totalPrice ?? m.amount ?? calcVal ?? 0;
          const parsedAmt = typeof rawAmt === 'number' ? rawAmt : (parseFloat(String(rawAmt).replace(/[^0-9.-]+/g, '')) || 0);
          totMaterials += (parsedAmt > 0 ? parsedAmt : calcVal);
        });

        const netDue = totPurchases - totPaid - totMaterials;
        setFarmerFinancials({
          totalPurchases: totPurchases,
          totalPaid: totPaid,
          totalMaterials: totMaterials,
          netDue: netDue,
        });

        // Auto pre-fill amount if not explicitly provided
        if (initialAmount === undefined) {
          if (formData.purchaseId) {
            const currentBill = fp.find((p: any) => p.id === formData.purchaseId || p.purchaseNo === formData.purchaseId);
            const billDue = currentBill ? (Number(currentBill.dueAmount ?? currentBill.amount) || 0) : 0;
            const suggested = netDue > 0 ? Math.min(netDue, billDue || netDue) : billDue;
            if (suggested > 0) {
              setFormData(prev => ({ ...prev, amount: String(suggested) }));
            }
          } else if (netDue > 0) {
            setFormData(prev => ({ ...prev, amount: String(netDue) }));
          }
        }
      } catch (err) {
        console.error('Error loading farmer financials in AddPaymentModal:', err);
      }
    }

    loadFarmerHistory();
  }, [formData.farmerId, formData.purchaseId, farmersList, initialAmount]);

  useEffect(() => {
    if (!isOpen) return;
    async function loadFarmers() {
      const tenantId = getTenantId();
      const cacheKey = tenantId ? `seavaig_farmers_cache_${tenantId}` : 'seavaig_farmers_cache';
      const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
      let cachedList: any[] = [];
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) cachedList = parsed;
        } catch {}
      }

      const res = await apiGetFarmers();
      let list: any[] = cachedList;
      if (res) {
        const fetched = Array.isArray(res) ? res : ((res as any)?.data || []);
        if (fetched && fetched.length > 0) list = fetched;
      }

      setFarmersList(list);

      const activeFarmerId = initialFarmerId || (list.length > 0 ? list[0].id : '');
      const found = list.find((f) => f.id === activeFarmerId);

      setFormData({
        farmerId: activeFarmerId,
        farmerName: found ? found.name : '',
        phone: found ? (found.phone || '') : '',
        village: found ? (found.village || '') : '',
        purchaseId: initialPurchaseId || '',
        amount: initialAmount !== undefined ? String(initialAmount) : '',
        paymentType: initialPurchaseId ? 'PURCHASE_SETTLEMENT' : 'GENERAL_PAYOUT',
        paymentMode: 'UPI',
        notes: initialPurchaseId ? `Bill settlement for #${initialPurchaseId}` : '',
      });
    }
    loadFarmers();
  }, [isOpen, initialFarmerId, initialPurchaseId, initialAmount]);

  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const numericAmount = Number(formData.amount) || 0;

    const payload = {
      farmerId: formData.farmerId,
      purchaseId: formData.purchaseId || undefined,
      paymentType: formData.paymentType,
      amount: numericAmount,
      paymentMode: formData.paymentMode,
      notes: formData.notes,
    };

    try {
      await apiCreatePayment(payload);

      if (formData.farmerId) {
        await apiUpdateFarmerBalance(formData.farmerId, numericAmount, -numericAmount, 'PAYMENT');
        if (formData.paymentType === 'ADVANCE_PAYOUT') {
          const { apiUpdateFarmerAdvance } = await import('@/lib/api');
          await apiUpdateFarmerAdvance(formData.farmerId, numericAmount);
        }
      }
      if (formData.purchaseId) {
        const { apiGetPurchaseDetails } = await import('@/lib/api');
        const purchase = await apiGetPurchaseDetails(formData.purchaseId);
        if (purchase) {
          const newPaid = (purchase.paidAmount || 0) + numericAmount;
          const newDue = Math.max(0, (purchase.dueAmount || 0) - numericAmount);
          await apiUpdatePurchase(formData.purchaseId, {
            paidAmount: newPaid,
            dueAmount: newDue,
            paymentStatus: newDue === 0 ? 'PAID' : 'PARTIAL'
          });
        }
      }

      const newPayment = {
        id: `PAY-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        farmerName: formData.farmerName,
        phone: formData.phone,
        village: formData.village,
        amount: `₹${numericAmount.toLocaleString('en-IN')}`,
        method: `${formData.paymentMode} (${formData.paymentType})`,
        status: 'COMPLETED',
        date: new Date().toISOString().slice(0, 10),
        refNo: `TXN/${Math.floor(10000000 + Math.random() * 90000000)}`,
        paymentType: formData.paymentType,
        purchaseId: formData.purchaseId || 'General Account',
      };

      onAddPayment(newPayment);
      onClose();
    } catch (err) {
      console.error('Error creating payment:', err);
    } finally {
      setLoading(false);
    }
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
                {language === 'mr' ? 'बिलनुसार पेमेंट / अ‍ॅडव्हान्स नोंदवा (Bill Settlement)' : 'Record Bill-by-Bill Payment or Advance'}
              </h3>
              <p className="text-[11px] font-medium text-slate-400">Bill-by-Bill Settlement & Advance Payouts</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Select Farmer *</label>
              <select
                value={formData.farmerId}
                onChange={(e) => {
                  const found = farmersList.find((f) => f.id === e.target.value);
                  if (found) {
                    setFormData({
                      ...formData,
                      farmerId: found.id,
                      farmerName: found.name,
                      phone: found.phone,
                      village: found.village,
                    });
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                {farmersList.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.farmerIdCode || f.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Payout Category *</label>
              <select
                value={formData.paymentType}
                onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-blue-700"
              >
                <option value="PURCHASE_SETTLEMENT">BILL SETTLEMENT (बिल पेमेंट)</option>
                <option value="ADVANCE_PAYOUT">ADVANCE PAYOUT (अ‍ॅडव्हान्स जमा)</option>
                <option value="GENERAL_PAYOUT">GENERAL ACCOUNT PAYOUT (खाते जमा)</option>
              </select>
            </div>
          </div>

          {/* Live Farmer Financial Status Card */}
          {formData.farmerId && (
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-blue-600" />
                  {language === 'mr' ? 'शेतकरी चालू हिशोब स्थिती' : 'Farmer Financial Balance'}
                </span>
                <span className="font-black text-slate-800">{formData.farmerName}</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white border border-slate-200/60 rounded-xl p-2 shadow-2xs">
                  <span className="text-[10px] text-slate-400 block font-semibold">खरेदी (Purchases)</span>
                  <span className="font-black text-slate-900 text-xs">₹{farmerFinancials.totalPurchases.toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-white border border-purple-100 rounded-xl p-2 shadow-2xs">
                  <span className="text-[10px] text-purple-600 block font-semibold">साहित्य नावे (Materials)</span>
                  <span className="font-black text-purple-700 text-xs">-₹{farmerFinancials.totalMaterials.toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-white border border-emerald-100 rounded-xl p-2 shadow-2xs">
                  <span className="text-[10px] text-emerald-600 block font-semibold">भरणा/उचल (Paid)</span>
                  <span className="font-black text-emerald-700 text-xs">-₹{farmerFinancials.totalPaid.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200/80">
                <div className="text-xs">
                  <span className="font-bold text-slate-500">
                    {farmerFinancials.netDue > 0 ? (language === 'mr' ? 'एकूण बाकी देणे (Net Due):' : 'Net Due to Farmer:') : (language === 'mr' ? 'अ‍ॅडव्हान्स शिल्लक:' : 'Advance Balance:')}
                  </span>
                  <span className={`ml-1.5 font-black text-xs ${farmerFinancials.netDue > 0 ? 'text-rose-600' : 'text-indigo-600'}`}>
                    ₹{Math.abs(farmerFinancials.netDue).toLocaleString('en-IN')}
                  </span>
                </div>
                {farmerFinancials.netDue > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const selectedBill = farmerPurchases.find((p: any) => p.id === formData.purchaseId || p.purchaseNo === formData.purchaseId);
                      const billAmt = selectedBill ? Number(selectedBill.totalAmount ?? selectedBill.amount ?? selectedBill.netAmount ?? 0) : 0;
                      const liveDue = farmerFinancials.netDue > 0 ? Math.min(billAmt > 0 ? billAmt : farmerFinancials.netDue, farmerFinancials.netDue) : 0;
                      const fillVal = formData.purchaseId && liveDue > 0 ? liveDue : farmerFinancials.netDue;
                      setFormData(prev => ({ ...prev, amount: String(fillVal > 0 ? fillVal : '') }));
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>बाकी भरा (Fill Due)</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Optional Bill-by-Bill Purchase Selector */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1">
              <Receipt className="w-3.5 h-3.5 text-blue-600" />
              Link to Purchase Invoice (Optional Bill-by-Bill Settlement)
            </label>
            <select
              value={formData.purchaseId}
              onChange={(e) => {
                const pId = e.target.value;
                const selectedBill = farmerPurchases.find((p: any) => p.id === pId || p.purchaseNo === pId);
                const billAmt = selectedBill ? Number(selectedBill.totalAmount ?? selectedBill.amount ?? selectedBill.netAmount ?? 0) : 0;
                const liveDue = farmerFinancials.netDue > 0 ? Math.min(billAmt > 0 ? billAmt : farmerFinancials.netDue, farmerFinancials.netDue) : 0;
                setFormData(prev => ({ 
                  ...prev, 
                  purchaseId: pId,
                  amount: pId && liveDue > 0 ? String(liveDue) : prev.amount
                }));
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-blue-200 rounded-xl text-xs font-semibold text-slate-800"
            >
              <option value="">-- Pay against General Account Balance --</option>
              {farmerPurchases.map((p: any) => {
                const billAmt = Number(p.totalAmount ?? p.amount ?? p.netAmount ?? 0);
                const liveBillDue = farmerFinancials.netDue > 0 ? Math.min(billAmt > 0 ? billAmt : farmerFinancials.netDue, farmerFinancials.netDue) : 0;
                return (
                  <option key={p.id} value={p.id}>
                    Bill #{p.purchaseNo || p.id} ({p.crop || 'Crop'} - ₹{liveBillDue.toLocaleString('en-IN')} Due)
                  </option>
                );
              })}
              {initialPurchaseId && !farmerPurchases.some((p: any) => p.id === initialPurchaseId) && (
                <option value={initialPurchaseId}>
                  Bill #{initialPurchaseId} (Initial Selected)
                </option>
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Disbursed Amount (₹) *</label>
              <input
                type="number"
                required
                placeholder="15000"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Payment Mode *</label>
              <select
                value={formData.paymentMode}
                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
              >
                <option value="UPI">UPI (GPay / PhonePe / Paytm)</option>
                <option value="BANK_TRANSFER">Bank Transfer (IMPS/NEFT)</option>
                <option value="CASH">Cash Payout</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Notes / Reason (नोंद/कारण)</label>
            <input
              type="text"
              placeholder="e.g. Payment for Bill PUR-2026-1052"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
              disabled={loading}
              className={`px-5 py-2 text-white rounded-xl text-xs font-bold shadow-md ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'}`}
            >
              {loading ? 'Processing...' : 'Save & Settle Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
