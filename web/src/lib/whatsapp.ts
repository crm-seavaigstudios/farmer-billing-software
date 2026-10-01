/**
 * Utility functions for 1-Click WhatsApp & SMS Bill / Ledger Sharing
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
 * 1-Click WhatsApp Share for Farmer Purchase Bill (खरेदी पावती)
 */
export const sharePurchaseOnWhatsApp = (purchase: any, tenantName: string = 'कृषी एजन्सी') => {
  const farmerName = purchase.farmerName || 'शेतकरी मित्र';
  const billNo = purchase.purchaseNo || purchase.id || 'PUR-001';
  const date = purchase.date || new Date().toLocaleDateString('en-IN');
  const crop = purchase.crop || 'कृषी माल';
  const grade = purchase.grade || 'A_GRADE';
  const weight = purchase.weight || `${purchase.totalWeight || 0} KG`;
  const rate = purchase.rate || `₹${purchase.ratePerKg || 0}/KG`;
  const totalAmount = Number(purchase.totalAmount || purchase.amount || 0).toLocaleString('en-IN');
  const paidAmount = Number(purchase.paidAmount || 0).toLocaleString('en-IN');
  const dueAmount = Number(purchase.dueAmount || 0).toLocaleString('en-IN');

  const message = `
🌾 *${tenantName}* 🌾
📄 *खरेदी पावती (Purchase Slip)*
━━━━━━━━━━━━━━━━━━━━━━
👤 *शेतकरी:* ${farmerName}
📅 *दिनांक:* ${date} | *पावती क्र:* #${billNo}
📦 *माल / जात:* ${crop} (${grade})
⚖️ *एकूण वजन:* ${weight}
💵 *दर (Rate):* ${rate}
━━━━━━━━━━━━━━━━━━━━━━
💰 *एकूण रक्कम (Total):* ₹${totalAmount}
🟢 *दिलेली रक्कम (Paid):* ₹${paidAmount}
⏳ *शिल्लक बाकी (Balance):* ₹${dueAmount}
━━━━━━━━━━━━━━━━━━━━━━
आपल्या सहकार्याबद्दल मनापासून धन्यवाद! 🙏
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
━━━━━━━━━━━━━━━━━━━━━━
🏪 *ग्राहक / व्यापारी:* ${buyerName}
📅 *दिनांक:* ${date} | *बिल क्र:* #${invoiceNo}
🚛 *गाडी क्र:* ${vehicleNo}
📦 *माल:* ${crop}
⚖️ *वजन:* ${weight} | *दर:* ${rate}
━━━━━━━━━━━━━━━━━━━━━━
💰 *निव्वळ बिल रक्कम (Net Total):* ₹${netAmount}
🟢 *जमा रक्कम (Paid):* ₹${paidAmount}
⏳ *बाकी रक्कम (Due):* ₹${dueAmount}
━━━━━━━━━━━━━━━━━━━━━━
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
━━━━━━━━━━━━━━━━━━━━━━
👤 *नाव:* ${farmerName}
📅 *दिनांक:* ${date} | *पावती क्र:* #${voucherNo}
💵 *रक्कम जमा (Amount Paid):* ₹${amount}
💳 *पेमेंट प्रकार (Mode):* ${mode}${notes}
━━━━━━━━━━━━━━━━━━━━━━
आपल्या खात्यावर रक्कम जमा झाली आहे. धन्यवाद! 🙏
`.trim();

  openWhatsApp(payment.phone, message);
};

/**
 * 1-Click WhatsApp Share for Full Farmer Ledger Statement (खाते उतारा)
 */
export const shareFarmerLedgerOnWhatsApp = (farmer: any, tenantName: string = 'कृषी एजन्सी') => {
  const name = farmer.name || 'शेतकरी मित्र';
  const code = farmer.farmerUniqueCode || farmer.farmerCode || farmer.farmerIdCode || '';
  const totalPurchases = Number(farmer.totalPurchases || 0).toLocaleString('en-IN');
  const totalPaid = Number(farmer.totalPaid || 0).toLocaleString('en-IN');
  const advanceBalance = Number(farmer.advanceBalance || 0).toLocaleString('en-IN');
  const outstanding = Number(farmer.outstandingAmount || farmer.outstanding || 0).toLocaleString('en-IN');

  const message = `
📊 *${tenantName}* 📊
📋 *शेतकरी खाते उतारा (Farmer Ledger Summary)*
━━━━━━━━━━━━━━━━━━━━━━
👤 *शेतकरी:* ${name} ${code ? `(${code})` : ''}
📞 *फोन:* ${farmer.phone || '-'}
🏡 *गाव:* ${farmer.village || '-'}
📅 *तारीख:* ${new Date().toLocaleDateString('en-IN')}
━━━━━━━━━━━━━━━━━━━━━━
🌾 *एकूण माल विक्री जमा (Total Purchases):* ₹${totalPurchases}
💵 *एकूण मिळालेली उचल/पेमेंट (Total Paid):* ₹${totalPaid}
📦 *अ‍ॅडव्हान्स शिल्लक (Advance):* ₹${advanceBalance}
━━━━━━━━━━━━━━━━━━━━━━
⚖️ *चालू निव्वळ येणे/बाकी (Net Balance):* ₹${outstanding}
━━━━━━━━━━━━━━━━━━━━━━
तपशीलवार हिशोबासाठी आमच्याशी संपर्क साधा. धन्यवाद! 🙏
`.trim();

  openWhatsApp(farmer.phone, message);
};
