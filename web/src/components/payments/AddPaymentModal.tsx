import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Receipt, Calculator, ArrowRight, Wallet, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import {
  apiCreatePayment,
  apiGetFarmers,
  apiUpdateFarmerBalance,
  apiUpdatePurchase,
  apiGetPurchases,
  apiGetPayments,
  apiGetFarmerMaterials,
  apiUpdateFarmerAdvance,
  apiDeductFarmerMaterials,
  apiGetPurchaseDetails,
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
  const [farmerMaterials, setFarmerMaterials] = useState<any[]>([]);
  const [liveAdvance, setLiveAdvance] = useState<number>(0);
  const [deductionMode, setDeductionMode] = useState<'KEEP_ADVANCE' | 'CUSTOM' | 'SETTLE_MAX'>('KEEP_ADVANCE');
  const [customAdvanceInput, setCustomAdvanceInput] = useState<string>('');
  const [customMaterialInput, setCustomMaterialInput] = useState<string>('');
  const [farmerFinancials, setFarmerFinancials] = useState({
    totalPurchases: 0,
    totalPaid: 0,
    totalMaterials: 0,
    netDue: 0,
  });

  useEffect(() => {
    if (!formData.farmerId) {
      setFarmerPurchases([]);
      setFarmerMaterials([]);
      setLiveAdvance(0);
      setFarmerFinancials({ totalPurchases: 0, totalPaid: 0, totalMaterials: 0, netDue: 0 });
      return;
    }

    async function loadFarmerHistory() {
      try {
        const foundFarmer = farmersList.find((f) => isFarmerMatch(f, { id: formData.farmerId })) || 
                            farmersList.find((f) => f.id === formData.farmerId) || 
                            { id: formData.farmerId };
        const [allPurchases, allPayments, allMaterials] = await Promise.all([
          apiGetPurchases(),
          apiGetPayments(),
          apiGetFarmerMaterials(formData.farmerId)
        ]);

        const fp = Array.isArray(allPurchases) ? allPurchases.filter((p: any) => isFarmerMatch(p, foundFarmer)) : [];
        const fpay = Array.isArray(allPayments) ? allPayments.filter((p: any) => isFarmerMatch(p, foundFarmer)) : [];
        const fmat = Array.isArray(allMaterials) ? allMaterials : [];

        // Unpaid or partial purchases with positive pending due
        const pendingPurchases = fp.filter((p: any) => {
          if (p.paymentStatus === 'PAID') return false;
          const billGross = Number(p.totalAmount ?? p.amount ?? p.netAmount ?? 0);
          const billPaid = Number(p.paidAmount || 0);
          const billDue = p.dueAmount !== undefined ? Number(p.dueAmount) : Math.max(0, billGross - billPaid);
          return billDue > 0;
        });
        setFarmerPurchases(pendingPurchases);
        setFarmerMaterials(fmat);

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

        // Compute live available advance after deducting past bill deductions
        let advanceVouchersTotal = 0;
        fpay.forEach((pay: any) => {
          const isAdv = pay.paymentType === 'ADVANCE_PAYOUT' || 
                        pay.paymentType === 'ADVANCE' || 
                        (typeof pay.notes === 'string' && pay.notes.toLowerCase().includes('advance')) ||
                        pay.isAdvance;
          if (isAdv) {
            const amt = typeof pay.amount === 'number' ? pay.amount : parseFloat(String(pay.amount || 0).replace(/[^0-9.-]+/g, '')) || 0;
            advanceVouchersTotal += amt;
          }
        });

        const totalAdvDeductedOnBills = fp.reduce((sum: number, p: any) => sum + (Number(p.advanceApplied || p.advanceDeducted || 0)), 0) +
          fpay.reduce((sum: number, pay: any) => sum + (Number(pay.advanceDeducted || 0)), 0);
        const remainingAdvanceVouchers = Math.max(0, advanceVouchersTotal - totalAdvDeductedOnBills);
        const dbFarmerAdvance = Math.max(0, Number(foundFarmer?.advanceBalance || 0));
        const overpaymentAdvance = Math.max(0, totPaid - totPurchases);
        const computedAdvance = advanceVouchersTotal > 0 ? remainingAdvanceVouchers : Math.max(dbFarmerAdvance, overpaymentAdvance);
        setLiveAdvance(computedAdvance);

        // Auto pre-fill amount if not explicitly provided
        if (initialAmount === undefined) {
          if (formData.purchaseId) {
            const currentBill = fp.find((p: any) => p.id === formData.purchaseId || p.purchaseNo === formData.purchaseId);
            const billGross = currentBill ? Number(currentBill.totalAmount ?? currentBill.amount ?? 0) : 0;
            const billPaid = currentBill ? Number(currentBill.paidAmount || 0) : 0;
            const billDue = currentBill ? (currentBill.dueAmount !== undefined ? Number(currentBill.dueAmount) : Math.max(0, billGross - billPaid)) : 0;
            const billNetPayable = Math.max(0, billDue - computedAdvance);
            setFormData(prev => ({ ...prev, amount: String(billNetPayable > 0 ? billNetPayable : '0') }));
          } else {
            const runningDueSum = pendingPurchases.reduce((sum: number, p: any) => {
              const bAmt = Number(p.totalAmount ?? p.amount ?? 0);
              const bPaid = Number(p.paidAmount || 0);
              const bDue = p.dueAmount !== undefined ? Number(p.dueAmount) : Math.max(0, bAmt - bPaid);
              return sum + bDue;
            }, 0);
            const runningNet = Math.max(0, runningDueSum - computedAdvance);
            setFormData(prev => ({ ...prev, amount: String(runningNet > 0 ? runningNet : '0') }));
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

  const selectedFarmer = farmersList.find((f) => isFarmerMatch(f, { id: formData.farmerId })) || farmersList.find((f) => f.id === formData.farmerId);
  const availableAdvance = Math.max(liveAdvance, Math.max(0, Number(selectedFarmer?.advanceBalance || 0)));
  const availableMaterials = farmerMaterials
    .filter((m) => !m.isDeductedFromBill)
    .reduce((acc, m) => acc + Number(m.totalAmount || m.totalPrice || 0), 0);

  const runningPurchasesDue = farmerPurchases.reduce((sum, p) => {
    const bAmt = Number(p.totalAmount ?? p.amount ?? 0);
    const bPaid = Number(p.paidAmount || 0);
    const bDue = p.dueAmount !== undefined ? Number(p.dueAmount) : Math.max(0, bAmt - bPaid);
    return sum + bDue;
  }, 0);
  const runningNetDue = Math.max(0, runningPurchasesDue - availableAdvance);

  const selectedBill = farmerPurchases.find((p: any) => p.id === formData.purchaseId || p.purchaseNo === formData.purchaseId);
  const billGross = selectedBill ? Number(selectedBill.totalAmount ?? selectedBill.amount ?? 0) : 0;
  const billPaid = selectedBill ? Number(selectedBill.paidAmount || 0) : 0;
  const billDue = selectedBill ? (selectedBill.dueAmount !== undefined ? Number(selectedBill.dueAmount) : Math.max(0, billGross - billPaid)) : 0;
  const grossAmountToSettle = selectedBill ? billDue : runningPurchasesDue;

  let actualAdvanceDeducted = 0;
  let actualMaterialDeducted = 0;

  if (formData.paymentType !== 'ADVANCE_PAYOUT') {
    if (deductionMode === 'SETTLE_MAX') {
      actualAdvanceDeducted = Math.min(availableAdvance, grossAmountToSettle);
      actualMaterialDeducted = Math.min(availableMaterials, Math.max(0, grossAmountToSettle - actualAdvanceDeducted));
    } else if (deductionMode === 'CUSTOM') {
      const rawAdv = customAdvanceInput !== '' ? (parseFloat(customAdvanceInput) || 0) : 0;
      actualAdvanceDeducted = Math.min(availableAdvance, Math.min(grossAmountToSettle, Math.max(0, rawAdv)));
      const remainingForMat = Math.max(0, grossAmountToSettle - actualAdvanceDeducted);
      const rawMat = customMaterialInput !== '' ? (parseFloat(customMaterialInput) || 0) : 0;
      actualMaterialDeducted = Math.min(availableMaterials, Math.min(remainingForMat, Math.max(0, rawMat)));
    }
  }

  const totalDeductionsApplied = actualAdvanceDeducted + actualMaterialDeducted;
  const suggestedNetPayout = Math.max(0, grossAmountToSettle - totalDeductionsApplied);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    const numericDisbursed = Number(formData.amount) || 0;
    const isAdvancePayout = formData.paymentType === 'ADVANCE_PAYOUT';

    const advDeducted = isAdvancePayout ? 0 : actualAdvanceDeducted;
    const matDeducted = isAdvancePayout ? 0 : actualMaterialDeducted;
    const totalSettled = numericDisbursed + advDeducted + matDeducted;

    const payload = {
      farmerId: formData.farmerId,
      purchaseId: formData.purchaseId || undefined,
      paymentType: formData.paymentType,
      amount: numericDisbursed,
      advanceDeducted: advDeducted,
      materialDeducted: matDeducted,
      totalSettled: totalSettled,
      paymentMode: formData.paymentMode,
      notes: formData.notes,
    };

    try {
      await apiCreatePayment(payload);

      if (formData.farmerId) {
        if (isAdvancePayout) {
          await apiUpdateFarmerBalance(formData.farmerId, numericDisbursed, -numericDisbursed, 'PAYMENT');
          await apiUpdateFarmerAdvance(formData.farmerId, numericDisbursed);
        } else {
          // Bill Settlement or General Payout
          await apiUpdateFarmerBalance(formData.farmerId, totalSettled, -totalSettled, 'PAYMENT');
          if (advDeducted > 0) {
            await apiUpdateFarmerAdvance(formData.farmerId, -advDeducted);
          }
          if (matDeducted > 0) {
            const unDeducted = farmerMaterials.filter(m => !m.isDeductedFromBill);
            let matAcc = 0;
            const matIds: string[] = [];
            for (const m of unDeducted) {
              if (matAcc < matDeducted) {
                matIds.push(m.id);
                matAcc += Number(m.totalAmount || m.totalPrice || 0);
              }
            }
            if (matIds.length > 0) {
              await apiDeductFarmerMaterials(matIds, formData.purchaseId || 'PAYMENT-SETTLEMENT');
            }
          }
        }
      }

      if (formData.purchaseId) {
        const purchase = await apiGetPurchaseDetails(formData.purchaseId);
        if (purchase) {
          const newPaid = (purchase.paidAmount || 0) + totalSettled;
          const newDue = Math.max(0, (purchase.dueAmount || 0) - totalSettled);
          await apiUpdatePurchase(formData.purchaseId, {
            paidAmount: newPaid,
            dueAmount: newDue,
            paymentStatus: newDue === 0 ? 'PAID' : 'PARTIAL'
          });
        }
      } else if (!isAdvancePayout && totalSettled > 0) {
        // Synchronous Multi-Bill Settlement: Clear all pending bills of the farmer sequentially
        let remainingPool = totalSettled;
        const sortedBills = [...farmerPurchases].sort((a: any, b: any) => {
          const tA = new Date(a.createdAt || a.date || 0).getTime();
          const tB = new Date(b.createdAt || b.date || 0).getTime();
          return tA - tB;
        });

        for (const bill of sortedBills) {
          if (remainingPool <= 0) break;
          const billGross = Number(bill.totalAmount ?? bill.amount ?? 0);
          const currentPaid = Number(bill.paidAmount || 0);
          const currentDue = bill.dueAmount !== undefined ? Number(bill.dueAmount) : Math.max(0, billGross - currentPaid);

          if (currentDue > 0) {
            const settleThisBill = Math.min(currentDue, remainingPool);
            const newPaid = currentPaid + settleThisBill;
            const newDue = Math.max(0, currentDue - settleThisBill);
            const newStatus = newDue <= 0 ? 'PAID' : 'PARTIAL';
            remainingPool -= settleThisBill;

            await apiUpdatePurchase(bill.id || bill.purchaseNo, {
              paidAmount: newPaid,
              dueAmount: newDue,
              paymentStatus: newStatus
            });
          }
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('purchases_changed'));
        window.dispatchEvent(new Event('payments_changed'));
        window.dispatchEvent(new Event('farmers_changed'));
      }

      const newPayment = {
        id: `PAY-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        farmerName: formData.farmerName,
        phone: formData.phone,
        village: formData.village,
        amount: `₹${numericDisbursed.toLocaleString('en-IN')}`,
        advanceDeducted: advDeducted,
        materialDeducted: matDeducted,
        totalSettled: totalSettled,
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
      <div className="bg-white border border-slate-200/80 rounded-3xl w-full max-w-lg max-h-[90vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
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

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
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
                  <span className="text-[10px] text-slate-400 block font-semibold">
                    {language === 'mr' ? 'चालू बिले बाकी' : 'Active Bills Due'}
                  </span>
                  <span className="font-black text-slate-900 text-xs">₹{runningPurchasesDue.toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-white border border-purple-100 rounded-xl p-2 shadow-2xs">
                  <span className="text-[10px] text-purple-600 block font-semibold">
                    {language === 'mr' ? 'शिल्लक साहित्य' : 'Material Balance'}
                  </span>
                  <span className="font-black text-purple-700 text-xs">₹{availableMaterials.toLocaleString('en-IN')}</span>
                </div>
                <div className="bg-white border border-emerald-100 rounded-xl p-2 shadow-2xs">
                  <span className="text-[10px] text-emerald-600 block font-semibold">
                    {language === 'mr' ? 'उपलब्ध अ‍ॅडव्हान्स' : 'Available Advance'}
                  </span>
                  <span className="font-black text-emerald-700 text-xs">₹{availableAdvance.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div 
                onClick={() => {
                  if (runningNetDue <= 0) {
                    setFormData(prev => ({ ...prev, amount: '0' }));
                  }
                }}
                className={`flex items-center justify-between pt-1 border-t border-slate-200/80 ${runningNetDue <= 0 ? 'cursor-pointer hover:bg-slate-100/70 p-1.5 rounded-xl transition-all' : ''}`}
                title={runningNetDue <= 0 ? (language === 'mr' ? 'क्लिक करून रक्कम ० (शून्य) करा' : 'Click to set payment amount to ₹0') : undefined}
              >
                <div className="text-xs">
                  <span className="font-bold text-slate-500">
                    {runningNetDue > 0 
                      ? (language === 'mr' ? 'एकूण बाकी देणे (Net Due):' : 'Net Due to Farmer:') 
                      : (language === 'mr' ? 'अ‍ॅडव्हान्स शिल्लक / चालू बाकी:' : 'Advance / Current Due:')}
                  </span>
                  {runningNetDue > 0 ? (
                    <span className="ml-1.5 font-black text-xs text-rose-600">
                      ₹{runningNetDue.toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span className="ml-1.5 font-black text-xs text-emerald-600">
                      ₹0 {availableAdvance > 0 && (
                        <span className="text-[10px] text-indigo-600 font-bold ml-1">
                          ({language === 'mr' ? 'शिल्लक अ‍ॅडव्हान्स:' : 'Advance Balance:'} ₹{availableAdvance.toLocaleString('en-IN')})
                        </span>
                      )}
                    </span>
                  )}
                </div>
                {runningNetDue > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedBill) {
                        const sBillGross = Number(selectedBill.totalAmount ?? selectedBill.amount ?? 0);
                        const sBillPaid = Number(selectedBill.paidAmount || 0);
                        const sBillDue = selectedBill.dueAmount !== undefined ? Number(selectedBill.dueAmount) : Math.max(0, sBillGross - sBillPaid);
                        const netPayable = Math.max(0, sBillDue - totalDeductionsApplied);
                        setFormData(prev => ({ ...prev, amount: String(netPayable) }));
                      } else {
                        const fillVal = Math.max(0, runningNetDue - totalDeductionsApplied);
                        setFormData(prev => ({ ...prev, amount: String(fillVal > 0 ? fillVal : '0') }));
                      }
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>बाकी भरा (Fill Due)</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFormData(prev => ({ ...prev, amount: '0' }));
                    }}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-black rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                    title={language === 'mr' ? 'रक्कम शून्य (०) करा' : 'Set amount to ₹0'}
                  >
                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                    <span>{language === 'mr' ? 'बाकी शून्य (₹0 करा)' : 'Zero Due (Set ₹0)'}</span>
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
                const billChoice = farmerPurchases.find((p: any) => p.id === pId || p.purchaseNo === pId);
                if (billChoice) {
                  const billGross = Number(billChoice.totalAmount ?? billChoice.amount ?? 0);
                  const billPaid = Number(billChoice.paidAmount || 0);
                  const billDue = billChoice.dueAmount !== undefined ? Number(billChoice.dueAmount) : Math.max(0, billGross - billPaid);
                  
                  // Calculate net payout taking into account current deduction mode
                  let activeAdvDeduction = 0;
                  let activeMatDeduction = 0;
                  if (deductionMode === 'SETTLE_MAX') {
                    activeAdvDeduction = Math.min(availableAdvance, billDue);
                    activeMatDeduction = Math.min(availableMaterials, Math.max(0, billDue - activeAdvDeduction));
                  } else if (deductionMode === 'CUSTOM') {
                    const rawAdv = customAdvanceInput !== '' ? (parseFloat(customAdvanceInput) || 0) : 0;
                    activeAdvDeduction = Math.min(availableAdvance, Math.min(billDue, Math.max(0, rawAdv)));
                    const rem = Math.max(0, billDue - activeAdvDeduction);
                    const rawMat = customMaterialInput !== '' ? (parseFloat(customMaterialInput) || 0) : 0;
                    activeMatDeduction = Math.min(availableMaterials, Math.min(rem, Math.max(0, rawMat)));
                  }
                  const netPayable = Math.max(0, billDue - activeAdvDeduction - activeMatDeduction);

                  setFormData(prev => ({ 
                    ...prev, 
                    purchaseId: pId,
                    amount: String(netPayable)
                  }));
                } else {
                  setFormData(prev => ({ 
                    ...prev, 
                    purchaseId: '',
                    amount: runningNetDue > 0 ? String(runningNetDue) : '0'
                  }));
                }
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-blue-200 rounded-xl text-xs font-semibold text-slate-800"
            >
              <option value="">
                {language === 'mr' 
                  ? `✨ सर्व शिल्लक बिले (एकत्रित सर्व बिले क्लिअर करा) - निव्वळ बाकी: ₹${runningNetDue.toLocaleString('en-IN')}` 
                  : `✨ All Pending Bills (Auto-Clear All Dues) - Net Due: ₹${runningNetDue.toLocaleString('en-IN')}`}
              </option>
              {farmerPurchases.map((p: any) => {
                const bGross = Number(p.totalAmount ?? p.amount ?? p.netAmount ?? 0);
                const bPaid = Number(p.paidAmount || 0);
                const bDue = p.dueAmount !== undefined ? Number(p.dueAmount) : Math.max(0, bGross - bPaid);
                const bAdvDeduct = Math.min(availableAdvance, bDue);
                const netWithAdv = Math.max(0, bDue - bAdvDeduct);
                const hasAdvanceDiscount = availableAdvance > 0 && bAdvDeduct > 0;
                return (
                  <option key={p.id} value={p.id}>
                    📄 {language === 'mr' ? 'फक्त बिल' : 'Specific Bill'} #{p.purchaseNo || p.id} ({p.crop || 'Crop'} - {language === 'mr' ? 'एकूण बाकी' : 'Gross Due'}: ₹{bDue.toLocaleString('en-IN')}{hasAdvanceDiscount ? ` | अ‍ॅडव्हान्स: -₹${bAdvDeduct.toLocaleString('en-IN')} | ${language === 'mr' ? 'निव्वळ देय' : 'Net Due'}: ₹${netWithAdv.toLocaleString('en-IN')}` : ''})
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

          {/* ADVANCE & MATERIAL DEDUCTION COMPONENT */}
          {formData.paymentType !== 'ADVANCE_PAYOUT' && (availableAdvance > 0 || availableMaterials > 0) && (
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-blue-600" />
                    {language === 'mr' ? 'अ‍ॅडव्हान्स / साहित्य कपात पर्याय' : 'Advance & Material Deduction Mode'}
                  </h4>
                  <p className="text-[10px] font-semibold text-slate-400">
                    {language === 'mr' ? 'या बिलामधून अ‍ॅडव्हान्स किंवा साहित्य कपात करायचे का?' : 'Choose whether to deduct previous advance or material from this payout'}
                  </p>
                </div>

                <div className="flex items-center bg-white border border-slate-200 p-0.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setDeductionMode('KEEP_ADVANCE');
                      setFormData(prev => ({ ...prev, amount: String(grossAmountToSettle) }));
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                      deductionMode === 'KEEP_ADVANCE' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {language === 'mr' ? 'शिल्लक ठेवा' : 'Keep Advance'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeductionMode('CUSTOM');
                      const defaultAdv = Math.min(availableAdvance, grossAmountToSettle);
                      setCustomAdvanceInput(String(defaultAdv));
                      const rem = Math.max(0, grossAmountToSettle - defaultAdv);
                      setFormData(prev => ({ ...prev, amount: String(rem) }));
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                      deductionMode === 'CUSTOM' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {language === 'mr' ? 'सानुकूल कपात' : 'Custom'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDeductionMode('SETTLE_MAX');
                      const adv = Math.min(availableAdvance, grossAmountToSettle);
                      const rem = Math.max(0, grossAmountToSettle - adv);
                      const mat = Math.min(availableMaterials, rem);
                      const net = Math.max(0, rem - mat);
                      setFormData(prev => ({ ...prev, amount: String(net) }));
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                      deductionMode === 'SETTLE_MAX' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {language === 'mr' ? 'कमाल कपात' : 'Max Deduct'}
                  </button>
                </div>
              </div>

              {/* Custom Deduction Inputs */}
              {deductionMode === 'CUSTOM' && (
                <div className="space-y-3 pt-2 border-t border-slate-200/80">
                  {/* Cash Advance */}
                  {availableAdvance > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-700">
                          {language === 'mr' ? 'रोख अ‍ॅडव्हान्स कपात:' : 'Deduct Cash Advance:'}
                        </span>
                        <span className="font-extrabold text-blue-700">
                          {language === 'mr' ? 'उपलब्ध अ‍ॅडव्हान्स:' : 'Available:'} ₹{availableAdvance.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                          <input
                            type="number"
                            min="0"
                            max={Math.min(availableAdvance, grossAmountToSettle)}
                            value={customAdvanceInput}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomAdvanceInput(val);
                              const numAdv = Math.min(availableAdvance, Math.min(grossAmountToSettle, parseFloat(val) || 0));
                              const numMat = actualMaterialDeducted;
                              setFormData(prev => ({ ...prev, amount: String(Math.max(0, grossAmountToSettle - numAdv - numMat)) }));
                            }}
                            className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setCustomAdvanceInput('0');
                              setFormData(prev => ({ ...prev, amount: String(Math.max(0, grossAmountToSettle - actualMaterialDeducted)) }));
                            }}
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            ₹0
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const half = Math.floor(Math.min(availableAdvance, grossAmountToSettle) / 2);
                              setCustomAdvanceInput(String(half));
                              setFormData(prev => ({ ...prev, amount: String(Math.max(0, grossAmountToSettle - half - actualMaterialDeducted)) }));
                            }}
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            50%
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const full = Math.min(availableAdvance, grossAmountToSettle);
                              setCustomAdvanceInput(String(full));
                              setFormData(prev => ({ ...prev, amount: String(Math.max(0, grossAmountToSettle - full - actualMaterialDeducted)) }));
                            }}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            Full
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Material Supplies */}
                  {availableMaterials > 0 && (
                    <div className="space-y-1 pt-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-700">
                          {language === 'mr' ? 'साहित्य बिले कपात:' : 'Deduct Material Issued:'}
                        </span>
                        <span className="font-extrabold text-purple-700">
                          {language === 'mr' ? 'उपलब्ध साहित्य:' : 'Available:'} ₹{availableMaterials.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                          <input
                            type="number"
                            min="0"
                            max={availableMaterials}
                            value={customMaterialInput}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomMaterialInput(val);
                              const numMat = Math.min(availableMaterials, parseFloat(val) || 0);
                              const numAdv = actualAdvanceDeducted;
                              setFormData(prev => ({ ...prev, amount: String(Math.max(0, grossAmountToSettle - numAdv - numMat)) }));
                            }}
                            className="w-full pl-7 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setCustomMaterialInput('0');
                              setFormData(prev => ({ ...prev, amount: String(Math.max(0, grossAmountToSettle - actualAdvanceDeducted)) }));
                            }}
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            ₹0
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const maxPossible = Math.max(0, grossAmountToSettle - actualAdvanceDeducted);
                              const half = Math.floor(Math.min(availableMaterials, maxPossible) / 2);
                              setCustomMaterialInput(String(half));
                              setFormData(prev => ({ ...prev, amount: String(Math.max(0, grossAmountToSettle - actualAdvanceDeducted - half)) }));
                            }}
                            className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            50%
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const maxPossible = Math.max(0, grossAmountToSettle - actualAdvanceDeducted);
                              const full = Math.min(availableMaterials, maxPossible);
                              setCustomMaterialInput(String(full));
                              setFormData(prev => ({ ...prev, amount: String(Math.max(0, grossAmountToSettle - actualAdvanceDeducted - full)) }));
                            }}
                            className="px-2 py-1 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 rounded-lg text-[10px] font-bold cursor-pointer"
                          >
                            Full
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Live Net Disbursed Breakdown Card */}
              {totalDeductionsApplied > 0 && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-extrabold text-emerald-800 block">
                      {language === 'mr' ? 'कपात नंतर प्रत्यक्ष देय (Net Disbursed):' : 'Net Disbursed Payout After Deductions:'}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-medium">
                      ₹{grossAmountToSettle.toLocaleString('en-IN')} (एकूण) - ₹{actualAdvanceDeducted.toLocaleString('en-IN')} (अ‍ॅडव्हान्स) - ₹{actualMaterialDeducted.toLocaleString('en-IN')} (साहित्य)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, amount: String(suggestedNetPayout) }))}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-lg shadow-xs cursor-pointer"
                  >
                    ₹{suggestedNetPayout.toLocaleString('en-IN')}
                  </button>
                </div>
              )}
            </div>
          )}

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

          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50/95 sticky bottom-0 z-20 shrink-0 flex justify-end gap-2 shadow-xs">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2 text-white rounded-xl text-xs font-bold shadow-md transition-all ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20 active:scale-95'}`}
            >
              {loading ? 'Processing...' : 'Save & Settle Bill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
