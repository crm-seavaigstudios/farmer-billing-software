"use client";

import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  MapPin,
  Building2,
  FileText,
  CreditCard,
  Truck,
  Printer,
  Calendar,
  IndianRupee,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldCheck,
  Receipt
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PrintReceiptModal } from '@/components/common/PrintReceiptModal';

interface CustomerDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customer: any;
}

export function CustomerDetailDrawer({ isOpen, onClose, customer }: CustomerDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'INVOICES' | 'LEDGER' | 'PAYMENTS'>('INVOICES');
  const [sales, setSales] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedLedgerId, setExpandedLedgerId] = useState<string | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);

  useEffect(() => {
    if (!isOpen || !customer) return;

    async function loadCustomerData() {
      setLoading(true);
      try {
        const activeTenantRaw = localStorage.getItem('active_tenant');
        let tenantId = 'tenant_seavaig_default';
        if (activeTenantRaw) {
          try {
            const parsed = JSON.parse(activeTenantRaw);
            tenantId = parsed.tenantId || parsed.id || tenantId;
          } catch {}
        }

        // Fetch sales / dispatches for this customer
        let salesList: any[] = [];
        const cacheKey = `seavaig_sales_cache_${tenantId}`;
        const cachedSales = localStorage.getItem(cacheKey);
        if (cachedSales) {
          try {
            salesList = JSON.parse(cachedSales);
          } catch {}
        }

        const { data: dbSales } = await supabase
          .from('Sale')
          .select('*')
          .eq('tenantId', tenantId)
          .order('date', { ascending: true });

        if (dbSales && dbSales.length > 0) {
          salesList = dbSales;
        }

        // Filter for this customer
        const custNameLower = (customer.company || customer.name || '').toLowerCase().trim();
        const custPhone = (customer.phone || '').trim();
        const custId = customer.id;

        const custSales = salesList.filter((s: any) => {
          const matchName = s.customerName && s.customerName.toLowerCase().trim() === custNameLower;
          const matchPhone = s.customerPhone && s.customerPhone.trim() === custPhone;
          const matchId = s.customerId === custId || s.sellerId === custId;
          return matchName || matchPhone || matchId;
        });

        setSales(custSales);

        // Build Chronological Passbook Ledger
        const rawEvents: any[] = [];

        custSales.forEach((sale) => {
          const saleTotal = parseFloat(sale.netAmount || sale.totalAmount || sale.amount || 0);
          const saleDate = sale.date || sale.createdAt || new Date().toISOString();
          
          rawEvents.push({
            id: sale.id || `sale-${Math.random()}`,
            date: saleDate,
            type: 'SALE_INVOICE',
            refNo: sale.billNo || sale.id,
            description: `B2B Sales Invoice #${sale.billNo || sale.id} - ${sale.items || 'Produce'} (${sale.totalWeight || 0} KG)`,
            debit: saleTotal, // Debit: Customer owes us money
            credit: 0,
            meta: sale
          });

          // Check for payments attached inside sale record
          if (Array.isArray(sale.paymentHistory) && sale.paymentHistory.length > 0) {
            sale.paymentHistory.forEach((pmt: any, pIdx: number) => {
              const pmtAmt = parseFloat(pmt.amount || 0);
              if (pmtAmt > 0) {
                rawEvents.push({
                  id: `${sale.id}-pmt-${pIdx}`,
                  date: pmt.date || saleDate,
                  type: 'PAYMENT_RECEIVED',
                  refNo: `REC-${sale.billNo || sale.id}-${pIdx + 1}`,
                  description: `Payment Received via ${pmt.mode || 'BANK/CASH'} against Bill #${sale.billNo || sale.id}`,
                  debit: 0,
                  credit: pmtAmt, // Credit: Customer pays
                  meta: pmt
                });
              }
            });
          } else if (parseFloat(sale.paidAmount || 0) > 0) {
            const pmtAmt = parseFloat(sale.paidAmount || 0);
            rawEvents.push({
              id: `${sale.id}-paid-advance`,
              date: saleDate,
              type: 'PAYMENT_RECEIVED',
              refNo: `REC-${sale.billNo || sale.id}-ADV`,
              description: `Advance/Received against Bill #${sale.billNo || sale.id}`,
              debit: 0,
              credit: pmtAmt,
              meta: { amount: pmtAmt, date: saleDate }
            });
          }
        });

        // Sort chronologically ascending for mathematical forward balance calculation
        rawEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let runningBal = 0;
        const computed = rawEvents.map((evt, idx) => {
          runningBal = runningBal + evt.debit - evt.credit;
          return {
            ...evt,
            srNo: idx + 1,
            balance: runningBal
          };
        });

        // Reverse for display so LATEST transaction is on top (Row 1)
        const reversed = [...computed].reverse().map((item, idx) => ({
          ...item,
          displaySrNo: idx + 1
        }));

        setLedgerEntries(reversed);

        // Collect distinct payments
        const allPmts = reversed.filter(e => e.type === 'PAYMENT_RECEIVED');
        setPayments(allPmts);

      } catch (err) {
        console.error('Error loading customer drawer data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadCustomerData();
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  // Calculate totals
  const totalSalesAmt = sales.reduce((acc, s) => acc + parseFloat(s.netAmount || s.totalAmount || s.amount || 0), 0);
  const totalReceivedAmt = ledgerEntries.reduce((acc, e) => acc + (e.credit || 0), 0);
  const currentOutstanding = totalSalesAmt - totalReceivedAmt;

  const handleOpenPrintInvoice = (sale: any) => {
    setActiveReceipt({
      id: sale.id,
      billNo: sale.billNo || sale.id,
      date: sale.date || new Date().toISOString(),
      type: 'CUSTOMER_SALE',
      farmerName: customer.company || customer.name || 'B2B Trader',
      farmerPhone: customer.phone || 'N/A',
      address: customer.address || 'N/A',
      gstin: customer.gstin || customer.gstNumber || 'N/A',
      buyerGstin: customer.gstin || customer.gstNumber || 'N/A',
      vehicleNo: sale.vehicleNo || 'MH-15-EG-4521',
      driverName: sale.driverName || 'Santosh Gaikwad',
      driverPhone: sale.driverPhone || '9876543210',
      items: sale.itemsData || sale.itemsList || [
        {
          cropName: sale.items || 'Agricultural Produce',
          grade: 'A Grade (Export)',
          packaging: '10 KG Corrugated Box',
          weightKg: parseFloat(sale.totalWeight || 0),
          ratePerKg: parseFloat(sale.totalWeight || 0) > 0 ? parseFloat(sale.netAmount || sale.amount || 0) / parseFloat(sale.totalWeight || 1) : 0,
          totalAmount: parseFloat(sale.netAmount || sale.amount || 0)
        }
      ],
      totalWeight: sale.totalWeight || 0,
      totalAmount: parseFloat(sale.totalAmount || sale.netAmount || sale.amount || 0),
      netAmount: parseFloat(sale.netAmount || sale.amount || 0),
      paidAmount: parseFloat(sale.paidAmount || 0),
      dueAmount: parseFloat(sale.dueAmount || 0),
      paymentStatus: sale.paymentStatus || (parseFloat(sale.dueAmount || 0) <= 0 ? 'PAID' : 'PARTIAL')
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex justify-end animate-in fade-in">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-blue-400 font-black">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight">{customer.company || customer.name}</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {customer.id}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-emerald-400" /> {customer.phone}</span>
                {customer.gstin && customer.gstin !== 'N/A' && <span>GSTIN: {customer.gstin}</span>}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top KPI Summary Cards */}
        <div className="p-5 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">एकूण विक्री (Total Sales)</span>
              <span className="text-lg font-black text-slate-900 mt-0.5 block">
                ₹{totalSalesAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 font-medium">{sales.length} Dispatches</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">एकूण जमा (Total Paid)</span>
              <span className="text-lg font-black text-emerald-700 mt-0.5 block">
                ₹{totalReceivedAmt.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-emerald-600 font-medium">{payments.length} Payments</span>
            </div>

            <div className={`p-3.5 rounded-2xl border shadow-xs ${currentOutstanding > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider block ${currentOutstanding > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                बाकी येणे (Outstanding)
              </span>
              <span className={`text-lg font-black mt-0.5 block ${currentOutstanding > 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
                ₹{Math.max(0, currentOutstanding).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
              <span className={`text-[10px] font-bold ${currentOutstanding > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
                {currentOutstanding > 0 ? 'Payment Due' : 'All Settled ✓'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-5 pt-2">
          <button
            onClick={() => setActiveTab('INVOICES')}
            className={`pb-3 px-4 text-xs font-black border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'INVOICES'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>वाहतूक व बिले (Dispatches & Bills)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-bold">{sales.length}</span>
          </button>

          <button
            onClick={() => setActiveTab('LEDGER')}
            className={`pb-3 px-4 text-xs font-black border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'LEDGER'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>📊 पासबुक खाते (Passbook Ledger)</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-50 text-blue-700 font-bold">Latest First</span>
          </button>

          <button
            onClick={() => setActiveTab('PAYMENTS')}
            className={`pb-3 px-4 text-xs font-black border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'PAYMENTS'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>जमा रकमा (Payments)</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/50">
          
          {/* TAB 1: INVOICES & DISPATCHES */}
          {activeTab === 'INVOICES' && (
            <div className="space-y-3">
              {sales.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 border-dashed p-8 text-center">
                  <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">कोणतीही बिले आढळली नाहीत (No Dispatches Found)</p>
                  <p className="text-xs text-slate-400 mt-1">Create a new sale from the Sales page to generate an invoice.</p>
                </div>
              ) : (
                sales.map((sale) => {
                  const saleAmt = parseFloat(sale.netAmount || sale.totalAmount || sale.amount || 0);
                  const paid = parseFloat(sale.paidAmount || 0);
                  const due = parseFloat(sale.dueAmount || Math.max(0, saleAmt - paid));
                  const isPaid = due <= 0;

                  return (
                    <div key={sale.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-blue-300 transition-all">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 text-sm">{sale.billNo || sale.id}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              isPaid ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {isPaid ? 'PAID IN FULL' : 'PAYMENT DUE'}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" /> {new Date(sale.date || sale.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-black text-slate-900 block">₹{saleAmt.toLocaleString('en-IN')}</span>
                          <span className="text-[10px] font-bold text-slate-400">{sale.totalWeight || 0} KG</span>
                        </div>
                      </div>

                      {/* Items & Logistics Details */}
                      <div className="space-y-2 text-xs">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between">
                          <span className="font-bold text-slate-700 truncate max-w-[70%]">📦 {sale.items || 'Agricultural Produce'}</span>
                          <span className="font-extrabold text-blue-700">{sale.totalWeight || 0} KG</span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                          <span className="flex items-center gap-1 font-medium">
                            <Truck className="w-3.5 h-3.5 text-slate-400" />
                            {sale.vehicleNo || 'Vehicle'} • Driver: {sale.driverName || 'N/A'}
                          </span>
                          <span className={`font-bold ${due > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {due > 0 ? `Due: ₹${due.toLocaleString('en-IN')}` : 'Settled'}
                          </span>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                        <button
                          onClick={() => handleOpenPrintInvoice(sale)}
                          className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-black py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                        >
                          <Printer className="w-3.5 h-3.5 text-emerald-400" />
                          <span>🖨️ View Professional Tax Invoice</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: PASSBOOK LEDGER (LATEST ON TOP) */}
          {activeTab === 'LEDGER' && (
            <div className="space-y-3">
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex items-center justify-between text-xs text-blue-900 font-bold">
                <span>🔄 सर्वात नवीन व्यवहार सर्वात वर (Showing Latest Entries First)</span>
                <span className="text-[11px] font-extrabold bg-white px-2 py-0.5 rounded-md text-blue-800 border border-blue-200">
                  {ledgerEntries.length} नोंदी
                </span>
              </div>

              {ledgerEntries.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 border-dashed p-8 text-center">
                  <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">कोणतेही खाते व्यवहार आढळले नाहीत</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto pb-2">
                    <table className="w-full text-xs text-left min-w-[550px]">
                      <thead className="bg-slate-900 text-white text-[11px] uppercase font-black tracking-wider">
                        <tr>
                          <th className="p-3"># क्र.</th>
                          <th className="p-3">तारीख (Date)</th>
                          <th className="p-3">तपशील (Particulars)</th>
                          <th className="p-3 text-right text-rose-300">नावे / बिल (Debit ₹)</th>
                          <th className="p-3 text-right text-emerald-300">जमा (Credit ₹)</th>
                          <th className="p-3 text-right text-amber-300">शिल्लक (Balance ₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {ledgerEntries.map((row) => {
                          const isExpanded = expandedLedgerId === row.id;
                          return (
                            <React.Fragment key={row.id}>
                              <tr
                                onClick={() => setExpandedLedgerId(isExpanded ? null : row.id)}
                                className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                                  isExpanded ? 'bg-blue-50/40' : ''
                                }`}
                              >
                                <td className="p-3 font-bold text-slate-400">{row.displaySrNo}</td>
                                <td className="p-3 font-medium text-slate-600 whitespace-nowrap">
                                  {new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </td>
                                <td className="p-3">
                                  <div className="font-black text-slate-900 flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${row.type === 'SALE_INVOICE' ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                                    <span>{row.type === 'SALE_INVOICE' ? 'B2B Sales Bill' : 'Payment Received'}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{row.description}</div>
                                </td>
                                <td className="p-3 text-right font-black text-rose-600">
                                  {row.debit > 0 ? `₹${row.debit.toLocaleString('en-IN')}` : '-'}
                                </td>
                                <td className="p-3 text-right font-black text-emerald-600">
                                  {row.credit > 0 ? `₹${row.credit.toLocaleString('en-IN')}` : '-'}
                                </td>
                                <td className="p-3 text-right font-black text-slate-900 bg-slate-50/50">
                                  ₹{row.balance.toLocaleString('en-IN')}
                                </td>
                              </tr>

                              {/* Accordion Detail Row */}
                              {isExpanded && (
                                <tr className="bg-slate-50 border-b border-slate-200">
                                  <td colSpan={6} className="p-4">
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                        <span className="font-bold text-slate-700">Transaction ID / Reference:</span>
                                        <span className="font-black text-blue-600">{row.refNo}</span>
                                      </div>
                                      <div className="text-slate-600">
                                        <p><strong>Description:</strong> {row.description}</p>
                                        <p><strong>Timestamp:</strong> {new Date(row.date).toLocaleString('en-IN')}</p>
                                      </div>
                                      {row.meta && row.type === 'SALE_INVOICE' && (
                                        <div className="pt-2 flex justify-end">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenPrintInvoice(row.meta);
                                            }}
                                            className="px-3 py-1.5 bg-slate-900 text-white font-bold rounded-lg text-[11px] flex items-center gap-1"
                                          >
                                            <Printer className="w-3 h-3 text-emerald-400" />
                                            <span>View Full Tax Invoice</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PAYMENTS LIST */}
          {activeTab === 'PAYMENTS' && (
            <div className="space-y-3">
              {payments.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 border-dashed p-8 text-center">
                  <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">कोणतीही जमा रक्कम आढळली नाही</p>
                </div>
              ) : (
                payments.map((pmt, idx) => (
                  <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-sm">{pmt.refNo}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                          RECEIVED ✓
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-1">{pmt.description}</p>
                      <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">
                        {new Date(pmt.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-black text-emerald-600 block">+ ₹{pmt.credit.toLocaleString('en-IN')}</span>
                      <span className="text-[10px] font-bold text-slate-400">Balance: ₹{pmt.balance.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-xl cursor-pointer"
          >
            Close Drawer
          </button>
        </div>
      </div>

      {/* Professional Tax Invoice Modal */}
      {activeReceipt && (
        <PrintReceiptModal
          isOpen={!!activeReceipt}
          onClose={() => setActiveReceipt(null)}
          data={activeReceipt}
        />
      )}
    </div>
  );
}
