/**
 * Utility functions for 1-Click WhatsApp & SMS Bill / Ledger Sharing
 * with 360° Comprehensive Account Status Breakdown and Bill-Wise Pending Details
 */

export const sanitizePhoneForWhatsApp = (phone?: string): string => {
  if (!phone) return '';
  const digits = String(phone).replace(/[^0-9]/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith('91') && digits.length === 12) return digits;
  return digits;
};

export const openWhatsApp = (phone: string, message: string) => {
  const cleanPhone = sanitizePhoneForWhatsApp(phone);
  const encoded = encodeURIComponent(message.trim());
  const url = cleanPhone
    ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`
    : `https://api.whatsapp.com/send?text=${encoded}`;

  if (typeof window !== 'undefined') {
    window.open(url, '_blank');
  }
};

const getActiveTenantId = (explicitTenantId?: string): string => {
  if (explicitTenantId) return explicitTenantId;
  if (typeof window !== 'undefined') {
    try {
      const activeTenant = localStorage.getItem('active_tenant');
      if (activeTenant) {
        const parsed = JSON.parse(activeTenant);
        return parsed.tenantId || parsed.id || '';
      }
    } catch {}
  }
  return '';
};

const getCachedFarmersList = (tenantId?: string): any[] => {
  if (typeof window === 'undefined') return [];
  try {
    const tid = getActiveTenantId(tenantId);
    if (tid) {
      const cached = localStorage.getItem(`seavaig_farmers_cache_${tid}`);
      if (cached) return JSON.parse(cached);
    }
    const fallback = localStorage.getItem('seavaig_farmers_cache');
    if (fallback) return JSON.parse(fallback);
    
    // Scan all keys if needed
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('seavaig_farmers_cache_')) {
        const val = localStorage.getItem(k);
        if (val) return JSON.parse(val);
      }
    }
  } catch {}
  return [];
};

const getCachedPurchasesList = (tenantId?: string): any[] => {
  if (typeof window === 'undefined') return [];
  try {
    const tid = getActiveTenantId(tenantId);
    if (tid) {
      const cached = localStorage.getItem(`seavaig_purchases_cache_${tid}`);
      if (cached) return JSON.parse(cached);
    }
    const fallback = localStorage.getItem('seavaig_purchases_cache');
    if (fallback) return JSON.parse(fallback);

    // Scan all keys if needed
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('seavaig_purchases_cache_')) {
        const val = localStorage.getItem(k);
        if (val) return JSON.parse(val);
      }
    }
  } catch {}
  return [];
};

const isFarmerMatchHelper = (purchaseOrRecord: any, farmer: any): boolean => {
  if (!purchaseOrRecord || !farmer) return false;
  if (farmer.id && (purchaseOrRecord.farmerId === farmer.id || purchaseOrRecord.id === farmer.id)) return true;
  if (farmer.phone && purchaseOrRecord.phone && String(purchaseOrRecord.phone).replace(/[^0-9]/g, '') === String(farmer.phone).replace(/[^0-9]/g, '')) return true;
  if (farmer.name && (purchaseOrRecord.farmerName === farmer.name || purchaseOrRecord.name === farmer.name)) return true;
  if (farmer.farmerUniqueCode && purchaseOrRecord.farmerCode === farmer.farmerUniqueCode) return true;
  if (farmer.farmerIdCode && purchaseOrRecord.farmerId === farmer.farmerIdCode) return true;
  return false;
};

/**
 * 1-Click WhatsApp Share for Farmer Purchase Bill with 360° Lifetime & Bill-Wise Pending Summary
 */
export const sharePurchaseOnWhatsApp = (
  purchase: any,
  tenantName: string = 'कृषी एजन्सी',
  farmerSummary?: any,
  allFarmerPurchases?: any[]
) => {
  const farmerName = purchase.farmerName || 'शेतकरी मित्र';
  const farmerCode = purchase.farmerCode || purchase.farmerUniqueCode || '';
  const billNo = purchase.purchaseNo || purchase.id || 'PUR-001';
  const date = purchase.date || new Date().toLocaleDateString('en-IN');
  const crop = purchase.crop || 'कृषी माल';
  const grade = purchase.grade || 'A_GRADE';
  const weight = purchase.weight || `${purchase.totalWeight || 0} KG`;
  const rate = purchase.rate || `₹${purchase.ratePerKg || 0}/KG`;
  const totalAmountNum = Number(purchase.totalAmount ?? purchase.amount ?? 0);
  const paidAmountNum = Number(purchase.paidAmount ?? 0);
  const dueAmountNum = Number(purchase.dueAmount ?? (totalAmountNum - paidAmountNum));

  const totalAmount = totalAmountNum.toLocaleString('en-IN');
  const paidAmount = paidAmountNum.toLocaleString('en-IN');
  const dueAmount = dueAmountNum.toLocaleString('en-IN');

  const allFarmers = getCachedFarmersList(purchase.tenantId);
  const matchedFarmer = allFarmers.find((f: any) => isFarmerMatchHelper(purchase, f)) || null;

  // Resolve 360° Lifetime Stats
  let totalPurchasesVal = totalAmountNum;
  let totalPaidVal = paidAmountNum;
  let totalAdvancesVal = 0;
  let totalMaterialVal = 0;
  let totalOutstandingVal = dueAmountNum;

  if (farmerSummary) {
    totalPurchasesVal = Number(farmerSummary.totalPurchases ?? farmerSummary.totalPurchase ?? totalPurchasesVal);
    totalPaidVal = Number(farmerSummary.totalPaid ?? totalPaidVal);
    totalAdvancesVal = Number(farmerSummary.advanceBalance ?? farmerSummary.totalAdvances ?? 0);
    totalMaterialVal = Number(farmerSummary.totalMaterial ?? 0);
    totalOutstandingVal = Number(farmerSummary.outstandingAmount ?? farmerSummary.outstanding ?? totalOutstandingVal);
  } else if (matchedFarmer) {
    totalPurchasesVal = Number(matchedFarmer.totalPurchases ?? matchedFarmer.totalPurchase ?? totalPurchasesVal);
    totalPaidVal = Number(matchedFarmer.totalPaid ?? totalPaidVal);
    totalAdvancesVal = Number(matchedFarmer.advanceBalance ?? 0);
    totalMaterialVal = Number(matchedFarmer.totalMaterial ?? 0);
    totalOutstandingVal = Number(matchedFarmer.outstandingAmount ?? matchedFarmer.outstanding ?? totalOutstandingVal);
  }

  // Calculate Bill-wise Pending Breakdown
  let pendingBillsText = '';
  try {
    let listToCheck = allFarmerPurchases;
    if (!listToCheck || listToCheck.length === 0) {
      const allPurchases = getCachedPurchasesList(purchase.tenantId);
      listToCheck = allPurchases.filter((p: any) => {
        if (matchedFarmer) return isFarmerMatchHelper(p, matchedFarmer);
        return p.farmerId === purchase.farmerId || p.farmerName === purchase.farmerName || (p.phone && p.phone === purchase.phone);
      });
    }

    if (Array.isArray(listToCheck) && listToCheck.length > 0) {
      const pendingBills = listToCheck.filter((p) => {
        const pTot = Number(p.totalAmount ?? p.amount ?? 0);
        const pPaid = Number(p.paidAmount ?? 0);
        const pDue = Number(p.dueAmount !== undefined ? p.dueAmount : (pTot - pPaid));
        return pDue > 0 || (p.paymentStatus && p.paymentStatus !== 'PAID');
      });

      if (pendingBills.length > 0) {
        pendingBillsText = `\n🧾 *बिलनिहाय प्रलंबित बाकी (Pending Bills Breakdown):*\n` +
          pendingBills.slice(0, 5).map((p) => {
            const pNo = p.purchaseNo || p.id || 'PB';
            const pTot = Number(p.totalAmount ?? p.amount ?? 0).toLocaleString('en-IN');
            const pPaid = Number(p.paidAmount ?? 0);
            const pDue = Number(p.dueAmount !== undefined ? p.dueAmount : (Number(p.totalAmount ?? p.amount ?? 0) - pPaid)).toLocaleString('en-IN');
            const pDate = p.date ? new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : (p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '');
            return `• #${pNo} ${pDate ? `(${pDate})` : ''}: एकूण ₹${pTot} | बाकी: *₹${pDue}*`;
          }).join('\n') +
          (pendingBills.length > 5 ? `\n...आणि इतर ${pendingBills.length - 5} बिले` : '');
      }
    }
  } catch {}

  const farmerCodeDisplay = farmerCode || (matchedFarmer ? matchedFarmer.farmerUniqueCode || matchedFarmer.farmerCode || matchedFarmer.farmerIdCode : '');

  const message = `
🌾 *${tenantName}* 🌾
📄 *खरेदी पावती व ३६०° खाते हिशोब (Purchase Bill & Ledger)*
━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *शेतकरी:* ${farmerName} ${farmerCodeDisplay ? `(कोड: ${farmerCodeDisplay})` : ''}
📅 *दिनांक:* ${date} | 🧾 *पावती क्र:* #${billNo}

📦 *चालू आवक पावती तपशील (Current Bill):*
• शेतमाल / जात: *${crop}* (${grade})
• एकूण आवक / वजन: *${weight}*
• खरेदी दर: *${rate}*
• चालू बिल रक्कम: *₹${totalAmount}*
• आज जमा केलेले पेमेंट: *₹${paidAmount}*
• चालू बिल प्रलंबित बाकी: *₹${dueAmount}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *३६०° चालू खाते सारांश (Account Summary):*
🌾 १. एकूण माल खरेदी (Total Purchases): *₹${totalPurchasesVal.toLocaleString('en-IN')}*
💵 २. एकूण मिळालेले पेमेंट (Total Paid): *₹${totalPaidVal.toLocaleString('en-IN')}*
💰 ३. रोख आगाऊ उचल (Advance Balance): *₹${totalAdvancesVal.toLocaleString('en-IN')}*
${totalMaterialVal > 0 ? `🌱 ४. एकूण खते / साहित्य नावे (Materials): *₹${totalMaterialVal.toLocaleString('en-IN')}*\n` : ''}━━━━━━━━━━━━━━━━━━━━━━━━━━${pendingBillsText ? `${pendingBillsText}\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n` : ''}
⚖️ *अंतिम चालू निव्वळ बाकी (Net Balance Due):* *₹${totalOutstandingVal.toLocaleString('en-IN')}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
आमच्यासोबत सहकार्य केल्याबद्दल धन्यवाद! 🙏
हिशोबाच्या अधिक माहितीसाठी संपर्क साधा.
`.trim();

  openWhatsApp(purchase.phone || matchedFarmer?.phone || '', message);
};

/**
 * 1-Click WhatsApp Share for Sale / Dispatch Bill (मार्केट विक्री बिल)
 */
export const shareSaleOnWhatsApp = (sale: any, tenantName: string = 'कृषी एजन्सी') => {
  const buyerName = sale.customerName || sale.buyerName || 'व्यापारी मित्र';
  const invoiceNo = sale.invoiceNo || sale.id || 'INV-001';
  const date = sale.date || new Date().toLocaleDateString('en-IN');
  const crop = sale.crop || 'कृषी माल';
  const weight = sale.weight || `${sale.totalWeight || 0} KG`;
  const rate = sale.rate || `₹${sale.ratePerKg || 0}/KG`;
  const vehicleNo = sale.vehicleNumber || sale.vehicleNo || 'वाहतूक गाडी';
  const netAmount = Number(sale.netAmount || sale.totalAmount || sale.amount || 0).toLocaleString('en-IN');
  const paidAmount = Number(sale.paidAmount || 0).toLocaleString('en-IN');
  const dueAmount = Number(sale.dueAmount || 0).toLocaleString('en-IN');

  const message = `
🚚 *${tenantName}* 🚚
📑 *मार्केट विक्री / डिस्पॅच पावती (Dispatch Invoice)*
━━━━━━━━━━━━━━━━━━━━━━━━━━
🏪 *ग्राहक / व्यापारी:* ${buyerName}
📅 *दिनांक:* ${date} | *बिल क्र:* #${invoiceNo}
🚛 *गाडी क्र:* ${vehicleNo}
📦 *माल:* ${crop}
⚖️ *वजन:* ${weight} | *दर:* ${rate}
━━━━━━━━━━━━━━━━━━━━━━━━━━
💰 *निव्वळ बिल रक्कम (Net Total):* *₹${netAmount}*
🟢 *जमा रक्कम (Paid):* *₹${paidAmount}*
⏳ *बाकी रक्कम (Due):* *₹${dueAmount}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
व्यवसायाबद्दल धन्यवाद! 🤝
`.trim();

  openWhatsApp(sale.customerPhone || sale.phone, message);
};

/**
 * 1-Click WhatsApp Share for Payment / Cash Advance Voucher (जमा / उचल पावती)
 */
export const sharePaymentOnWhatsApp = (payment: any, tenantName: string = 'कृषी एजन्सी') => {
  const farmerName = payment.farmerName || 'शेतकरी मित्र';
  const voucherNo = payment.paymentNo || payment.id || 'PAY-001';
  const date = payment.date || payment.paymentDate || new Date().toLocaleDateString('en-IN');
  const amount = Number(payment.amount || 0).toLocaleString('en-IN');
  const mode = payment.paymentMode || payment.method || 'CASH';
  const notes = payment.notes ? `\n📝 *तपशील:* ${payment.notes}` : '';

  const message = `
💳 *${tenantName}* 💳
🧾 *पेमेंट पावती (Payment Voucher)*
━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *नाव:* ${farmerName}
📅 *दिनांक:* ${date} | *पावती क्र:* #${voucherNo}
💵 *रक्कम जमा (Amount Paid):* *₹${amount}*
💳 *पेमेंट प्रकार (Mode):* ${mode}${notes}
━━━━━━━━━━━━━━━━━━━━━━━━━━
आपल्या खात्यावर रक्कम जमा झाली आहे. धन्यवाद! 🙏
`.trim();

  openWhatsApp(payment.phone, message);
};

/**
 * 1-Click WhatsApp Share for Full Farmer Ledger Statement (खाते उतारा)
 */
export const shareFarmerLedgerOnWhatsApp = (farmer: any, tenantName: string = 'कृषी एजन्सी', purchases?: any[]) => {
  const name = farmer.name || 'शेतकरी मित्र';
  const code = farmer.farmerUniqueCode || farmer.farmerCode || farmer.farmerIdCode || '';
  const totalPurchases = Number(farmer.totalPurchases ?? farmer.totalPurchase ?? 0).toLocaleString('en-IN');
  const totalPaid = Number(farmer.totalPaid ?? 0).toLocaleString('en-IN');
  const advanceBalance = Number(farmer.advanceBalance ?? 0).toLocaleString('en-IN');
  const totalMaterial = Number(farmer.totalMaterial ?? 0).toLocaleString('en-IN');
  const outstanding = Number(farmer.outstandingAmount ?? farmer.outstanding ?? 0).toLocaleString('en-IN');

  // Calculate Bill-wise pending
  let pendingBillsText = '';
  let listToCheck = purchases;
  if (!listToCheck || listToCheck.length === 0) {
    const allPurchases = getCachedPurchasesList(farmer.tenantId);
    listToCheck = allPurchases.filter((p: any) => isFarmerMatchHelper(p, farmer));
  }

  if (Array.isArray(listToCheck) && listToCheck.length > 0) {
    const pendingBills = listToCheck.filter((p) => {
      const pTot = Number(p.totalAmount ?? p.amount ?? 0);
      const pPaid = Number(p.paidAmount ?? 0);
      const pDue = Number(p.dueAmount !== undefined ? p.dueAmount : (pTot - pPaid));
      return pDue > 0 || (p.paymentStatus && p.paymentStatus !== 'PAID');
    });

    if (pendingBills.length > 0) {
      pendingBillsText = `\n🧾 *बिलनिहाय प्रलंबित रक्कम (Bill-wise Pending Breakdown):*\n` +
        pendingBills.slice(0, 5).map((p) => {
          const pNo = p.purchaseNo || p.id || 'PB';
          const pTot = Number(p.totalAmount ?? p.amount ?? 0).toLocaleString('en-IN');
          const pPaid = Number(p.paidAmount ?? 0);
          const pDue = Number(p.dueAmount !== undefined ? p.dueAmount : (Number(p.totalAmount ?? p.amount ?? 0) - pPaid)).toLocaleString('en-IN');
          const pDate = p.date ? new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : (p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '');
          return `• #${pNo} ${pDate ? `(${pDate})` : ''}: एकूण ₹${pTot} | बाकी: *₹${pDue}*`;
        }).join('\n') +
        (pendingBills.length > 5 ? `\n...आणि इतर ${pendingBills.length - 5} बिले` : '');
    }
  }

  const message = `
📊 *${tenantName}* 📊
📋 *शेतकरी खाते उतारा (360° Farmer Ledger Statement)*
━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *शेतकरी:* ${name} ${code ? `(कोड: ${code})` : ''}
📞 *फोन:* ${farmer.phone || '-'}
🏡 *गाव:* ${farmer.village || '-'}
📅 *तारीख:* ${new Date().toLocaleDateString('en-IN')}
━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *चालू खाते आर्थिक सारांश:*
🌾 १. एकूण माल खरेदी (Total Purchases): *₹${totalPurchases}*
💵 २. एकूण मिळालेले पेमेंट (Total Paid): *₹${totalPaid}*
💰 ३. रोख आगाऊ उचल (Advance Balance): *₹${advanceBalance}*
${Number(farmer.totalMaterial || 0) > 0 ? `🌱 ४. एकूण खते / साहित्य नावे (Materials): *₹${totalMaterial}*\n` : ''}━━━━━━━━━━━━━━━━━━━━━━━━━━${pendingBillsText ? `${pendingBillsText}\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n` : ''}
⚖️ *अंतिम चालू निव्वळ बाकी (Net Outstanding Due):* *₹${outstanding}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
तपशीलवार हिशोबासाठी आमच्याशी संपर्क साधा. धन्यवाद! 🙏
`.trim();

  openWhatsApp(farmer.phone, message);
};
