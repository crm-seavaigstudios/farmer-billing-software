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
  const totalAmount = Number(purchase.totalAmount || purchase.amount || 0).toLocaleString('en-IN');
  const paidAmount = Number(purchase.paidAmount || 0).toLocaleString('en-IN');
  const dueAmount = Number(purchase.dueAmount || 0).toLocaleString('en-IN');

  // Lifetime Stats
  let totalPurchasesTillDate = totalAmount;
  let totalAdvancesTillDate = '०';
  let totalMaterialGiven = '०';
  let totalPaidTillDate = paidAmount;
  let totalOutstandingDue = dueAmount;

  if (farmerSummary) {
    totalPurchasesTillDate = Number(farmerSummary.totalPurchases || farmerSummary.totalPurchase || 0).toLocaleString('en-IN');
    totalAdvancesTillDate = Number(farmerSummary.advanceBalance || farmerSummary.totalAdvances || 0).toLocaleString('en-IN');
    totalMaterialGiven = Number(farmerSummary.totalMaterial || 0).toLocaleString('en-IN');
    totalPaidTillDate = Number(farmerSummary.totalPaid || 0).toLocaleString('en-IN');
    totalOutstandingDue = Number(farmerSummary.outstandingAmount || farmerSummary.outstanding || purchase.dueAmount || 0).toLocaleString('en-IN');
  } else if (typeof window !== 'undefined') {
    try {
      const tenantId = purchase.tenantId || '';
      const cached = localStorage.getItem(`seavaig_farmers_cache_${tenantId}`) || localStorage.getItem('seavaig_farmers_cache');
      if (cached) {
        const list = JSON.parse(cached);
        const f = list.find((x: any) => x.id === purchase.farmerId || x.phone === purchase.phone || x.name === purchase.farmerName);
        if (f) {
          totalPurchasesTillDate = Number(f.totalPurchases || f.totalPurchase || 0).toLocaleString('en-IN');
          totalAdvancesTillDate = Number(f.advanceBalance || 0).toLocaleString('en-IN');
          totalMaterialGiven = Number(f.totalMaterial || 0).toLocaleString('en-IN');
          totalPaidTillDate = Number(f.totalPaid || 0).toLocaleString('en-IN');
          totalOutstandingDue = Number(f.outstandingAmount || f.outstanding || purchase.dueAmount || 0).toLocaleString('en-IN');
        }
      }
    } catch {}
  }

  // Calculate Bill-wise Pending Breakdown
  let pendingBillsText = '';
  try {
    let listToCheck = allFarmerPurchases;
    if (!listToCheck && typeof window !== 'undefined') {
      const tenantId = purchase.tenantId || '';
      const pCached = localStorage.getItem(`seavaig_purchases_cache_${tenantId}`) || localStorage.getItem('seavaig_purchases_cache');
      if (pCached) {
        const allP = JSON.parse(pCached);
        listToCheck = allP.filter((p: any) => p.farmerId === purchase.farmerId || p.farmerName === purchase.farmerName || p.phone === purchase.phone);
      }
    }

    if (Array.isArray(listToCheck) && listToCheck.length > 0) {
      const pendingBills = listToCheck.filter((p) => {
        const due = Number(p.dueAmount || 0);
        return due > 0 || (p.paymentStatus && p.paymentStatus !== 'PAID');
      });

      if (pendingBills.length > 0) {
        pendingBillsText = `\n🧾 *बिलनिहाय प्रलंबित रक्कम (Pending Bills):*\n` +
          pendingBills.slice(0, 5).map((p) => {
            const pNo = p.purchaseNo || p.id || 'PB';
            const pTot = Number(p.totalAmount || p.amount || 0).toLocaleString('en-IN');
            const pDue = Number(p.dueAmount || pTot).toLocaleString('en-IN');
            const pDate = p.date ? new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
            return `• #${pNo} ${pDate ? `(${pDate})` : ''}: एकूण ₹${pTot} | बाकी: *₹${pDue}*`;
          }).join('\n') +
          (pendingBills.length > 5 ? `\n...आणि इतर ${pendingBills.length - 5} बिले` : '');
      }
    }
  } catch {}

  const message = `
🌾 *${tenantName}* 🌾
📄 *खरेदी पावती व चालू खाते हिशोब (Purchase Slip & Ledger)*
━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 *शेतकरी:* ${farmerName} ${farmerCode ? `(कोड: ${farmerCode})` : ''}
📅 *दिनांक:* ${date} | *पावती क्र:* #${billNo}

📦 *चालू आवक पावती (Current Bill):*
• जात / माल: *${crop}* (${grade})
• एकूण वजन: *${weight}*
• दर (Rate): *${rate}*
• चालू बिल रक्कम: *₹${totalAmount}*
• आज दिलेले पेमेंट: *₹${paidAmount}*
• चालू बिल बाकी: *₹${dueAmount}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *ऐतिहासिक खाते सारांश (360° Account Status):*
🌾 १. एकूण माल खरेदी (Total Purchases): *₹${totalPurchasesTillDate}*
💵 २. एकूण मिळालेले पेमेंट (Total Paid): *₹${totalPaidTillDate}*
💰 ३. रोख आगाऊ उचल (Cash Advances): *₹${totalAdvancesTillDate}*
${totalMaterialGiven !== '—' && totalMaterialGiven !== '0' && totalMaterialGiven !== '०' ? `🌱 ४. दिलेले खते व साहित्य (Materials): *₹${totalMaterialGiven}*\n` : ''}━━━━━━━━━━━━━━━━━━━━━━━━━━${pendingBillsText ? `${pendingBillsText}\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n` : ''}
⚖️ *आजची अंतिम निव्वळ बाकी (Net Balance Due):* *₹${totalOutstandingDue}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
आपल्या सहकार्याबद्दल मनापासून धन्यवाद! 🙏
हिशोबाच्या अधिक माहितीसाठी संपर्क साधा.
`.trim();

  openWhatsApp(purchase.phone, message);
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
  const totalPurchases = Number(farmer.totalPurchases || farmer.totalPurchase || 0).toLocaleString('en-IN');
  const totalPaid = Number(farmer.totalPaid || 0).toLocaleString('en-IN');
  const advanceBalance = Number(farmer.advanceBalance || 0).toLocaleString('en-IN');
  const totalMaterial = Number(farmer.totalMaterial || 0).toLocaleString('en-IN');
  const outstanding = Number(farmer.outstandingAmount || farmer.outstanding || 0).toLocaleString('en-IN');

  // Calculate Bill-wise pending
  let pendingBillsText = '';
  if (Array.isArray(purchases) && purchases.length > 0) {
    const pendingBills = purchases.filter((p) => Number(p.dueAmount || 0) > 0 || (p.paymentStatus && p.paymentStatus !== 'PAID'));
    if (pendingBills.length > 0) {
      pendingBillsText = `\n🧾 *बिलनिहाय प्रलंबित रक्कम:*\n` +
        pendingBills.slice(0, 5).map((p) => {
          const pNo = p.purchaseNo || p.id || 'PB';
          const pTot = Number(p.totalAmount || p.amount || 0).toLocaleString('en-IN');
          const pDue = Number(p.dueAmount || pTot).toLocaleString('en-IN');
          const pDate = p.date ? new Date(p.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
          return `• #${pNo} ${pDate ? `(${pDate})` : ''}: एकूण ₹${pTot} | बाकी: *₹${pDue}*`;
        }).join('\n');
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
🌾 *१. एकूण माल खरेदी (Total Purchases):* *₹${totalPurchases}*
💵 *२. एकूण मिळालेले पेमेंट (Total Paid):* *₹${totalPaid}*
💰 *३. रोख आगाऊ उचल (Advance Balance):* *₹${advanceBalance}*
${totalMaterial !== '0' && totalMaterial !== '०' ? `🌱 *४. एकूण खते/साहित्य नावे (Materials):* *₹${totalMaterial}*\n` : ''}━━━━━━━━━━━━━━━━━━━━━━━━━━${pendingBillsText ? `${pendingBillsText}\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n` : ''}
⚖️ *अंतिम चालू निव्वळ बाकी (Net Outstanding Due):* *₹${outstanding}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
तपशीलवार हिशोबासाठी आमच्याशी संपर्क साधा. धन्यवाद! 🙏
`.trim();

  openWhatsApp(farmer.phone, message);
};
