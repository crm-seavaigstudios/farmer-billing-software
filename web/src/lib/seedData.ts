import { supabase } from './supabase';

export const INITIAL_PRODUCTION_FARMERS = [
  { id: 'far-01', farmerIdCode: 'FAR-10001', name: 'Ramesh Patil', phone: '9823456789', village: 'Nandgaon', taluka: 'Nashik', grade: 'A Grade', totalPurchase: 124500, totalPaid: 95000, advanceBalance: 15000, outstandingAmount: 14500, bankName: 'State Bank of India', accountNumber: '30987654321', ifscCode: 'SBIN0001234' },
  { id: 'far-02', farmerIdCode: 'FAR-10002', name: 'Suresh Jadhav', phone: '9765432100', village: 'Yeola', taluka: 'Yeola', grade: 'A Grade', totalPurchase: 85000, totalPaid: 85000, advanceBalance: 0, outstandingAmount: 0, bankName: 'Bank of Baroda', accountNumber: '40123456789', ifscCode: 'BARB0YEOLAX' },
  { id: 'far-03', farmerIdCode: 'FAR-10003', name: 'Vijay Shinde', phone: '8856789123', village: 'Pimpalgaon', taluka: 'Niphad', grade: 'B Grade', totalPurchase: 42000, totalPaid: 32000, advanceBalance: 5000, outstandingAmount: 5000, bankName: 'HDFC Bank', accountNumber: '50198765432', ifscCode: 'HDFC0000987' },
  { id: 'far-04', farmerIdCode: 'FAR-10004', name: 'Ganesh More', phone: '9761112345', village: 'Chandwad', taluka: 'Chandwad', grade: 'A Grade', totalPurchase: 156000, totalPaid: 120000, advanceBalance: 20000, outstandingAmount: 16000, bankName: 'ICICI Bank', accountNumber: '60123456789', ifscCode: 'ICIC0000456' },
  { id: 'far-05', farmerIdCode: 'FAR-10005', name: 'Sunil Pawar', phone: '9098765432', village: 'Sinnar', taluka: 'Sinnar', grade: 'A Grade', totalPurchase: 98000, totalPaid: 75000, advanceBalance: 10000, outstandingAmount: 13000, bankName: 'Axis Bank', accountNumber: '70198765432', ifscCode: 'UTIB0000789' },
  { id: 'far-06', farmerIdCode: 'FAR-10006', name: 'Ajay Deshmukh', phone: '9823001122', village: 'Nandgaon', taluka: 'Nashik', grade: 'B Grade', totalPurchase: 34000, totalPaid: 34000, advanceBalance: 0, outstandingAmount: 0, bankName: 'Maharashtra Gramin Bank', accountNumber: '80123456789', ifscCode: 'MAHG0000321' },
];

export const INITIAL_PRODUCTION_CUSTOMERS = [
  { id: 'cust-01', customerCode: 'B2B-501', companyName: 'MahaFruits Wholesale Market', contactPerson: 'Rajesh Shah', phone: '9822012345', city: 'Mumbai APMC Market', totalSales: 285000, totalPaid: 250000, outstandingBalance: 35000, status: 'ACTIVE' },
  { id: 'cust-02', customerCode: 'B2B-502', companyName: 'Reliance Fresh Procurement', contactPerson: 'Vikram Mehta', phone: '9819098765', city: 'Navi Mumbai Hub', totalSales: 450000, totalPaid: 450000, outstandingBalance: 0, status: 'ACTIVE' },
  { id: 'cust-03', customerCode: 'B2B-503', companyName: 'Apex Agro Exporters Pvt Ltd', contactPerson: 'Anil Kulkarni', phone: '9769876543', city: 'JNPT Port Depot', totalSales: 620000, totalPaid: 500000, outstandingBalance: 120000, status: 'ACTIVE' },
];

export const INITIAL_PRODUCTION_WORKERS = [
  { id: 'wrk-01', workerCode: 'WRK-10001', name: 'Pandurang Shinde', phone: '9876012345', role: 'Crate Loader & Sorting', dailyWage: 500, hourlyRate: 60, totalEarned: 12500, totalPaid: 10000, outstandingBalance: 2500, status: 'ACTIVE' },
  { id: 'wrk-02', workerCode: 'WRK-10002', name: 'Eknath Bhosale', phone: '9876023456', role: 'Packaging Specialist', dailyWage: 550, hourlyRate: 70, totalEarned: 14300, totalPaid: 14300, outstandingBalance: 0, status: 'ACTIVE' },
  { id: 'wrk-03', workerCode: 'WRK-10003', name: 'Santosh Jadhav', phone: '9876034567', role: 'Cold Storage Supervisor', dailyWage: 650, hourlyRate: 80, totalEarned: 16900, totalPaid: 15000, outstandingBalance: 1900, status: 'ACTIVE' },
];

export const INITIAL_PRODUCTION_TRADERS = [
  { id: 'trd-01', traderCode: 'TRD-301', name: 'Nashik Packaging Supplies', contactPerson: 'Dinesh Agarwal', phone: '9823098765', category: 'Crate Supplier', totalBills: 85000, totalPaid: 75000, outstandingBalance: 10000, status: 'PARTIAL' },
  { id: 'trd-02', traderCode: 'TRD-302', name: 'Kisan Bio Fertilizers Ltd', contactPerson: 'Mahesh Joshi', phone: '9765012345', category: 'Fertilizer & Seeds', totalBills: 120000, totalPaid: 120000, outstandingBalance: 0, status: 'PAID' },
];

export const INITIAL_PRODUCTION_PURCHASES = [
  { id: 'pur-101', purchaseBillNo: 'PUR-2026-101', farmerId: 'far-01', farmerName: 'Ramesh Patil', cropName: 'Strawberry (A Grade)', totalQuantityKg: 150, ratePerKg: 350, grossAmount: 52500, crateDeduction: 500, netAmount: 52000, paidAmount: 45000, dueAmount: 7000, paymentStatus: 'PARTIAL', purchaseDate: '2026-08-08' },
  { id: 'pur-102', purchaseBillNo: 'PUR-2026-102', farmerId: 'far-02', farmerName: 'Suresh Jadhav', cropName: 'Strawberry (B Grade)', totalQuantityKg: 200, ratePerKg: 220, grossAmount: 44000, crateDeduction: 0, netAmount: 44000, paidAmount: 44000, dueAmount: 0, paymentStatus: 'PAID', purchaseDate: '2026-08-05' },
  { id: 'pur-103', purchaseBillNo: 'PUR-2026-103', farmerId: 'far-04', farmerName: 'Ganesh More', cropName: 'Pomegranate (Anar)', totalQuantityKg: 350, ratePerKg: 180, grossAmount: 63000, crateDeduction: 1000, netAmount: 62000, paidAmount: 50000, dueAmount: 12000, paymentStatus: 'PARTIAL', purchaseDate: '2026-08-02' },
];

export const INITIAL_PRODUCTION_SALES = [
  { id: 'sal-201', invoiceNo: 'INV-2026-801', customerId: 'cust-01', customerName: 'MahaFruits Wholesale Market', cropName: 'Strawberry (A Grade)', quantityKg: 150, sellingPricePerKg: 420, totalAmount: 63000, vehicleNumber: 'MH-15-EG-4521', cratesDispatched: 30, paymentStatus: 'PARTIAL', saleDate: '2026-08-09' },
  { id: 'sal-202', invoiceNo: 'INV-2026-802', customerId: 'cust-02', customerName: 'Reliance Fresh Procurement', cropName: 'Pomegranate (Anar)', quantityKg: 350, sellingPricePerKg: 230, totalAmount: 80500, vehicleNumber: 'MH-15-AK-9988', cratesDispatched: 70, paymentStatus: 'PAID', saleDate: '2026-08-06' },
];

export const INITIAL_PRODUCTION_PAYMENTS = [
  { id: 'pay-301', voucherNo: 'VCH-2026-501', partyType: 'FARMER', partyId: 'far-01', partyName: 'Ramesh Patil', paymentType: 'CROP_PAYOUT', amount: 45000, paymentMethod: 'BANK_TRANSFER', referenceNo: 'UTR90871234', paymentDate: '2026-08-08', notes: 'Harvest Payout Settlement' },
  { id: 'pay-302', voucherNo: 'VCH-2026-502', partyType: 'CUSTOMER', partyId: 'cust-01', partyName: 'MahaFruits Wholesale Market', paymentType: 'B2B_RECEIPT', amount: 50000, paymentMethod: 'UPI', referenceNo: 'UPI99882211', paymentDate: '2026-08-09', notes: 'Invoice INV-2026-801 Partial Payment' },
];

export function initProductionData() {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem('seavaig_farmers_cache')) {
    localStorage.setItem('seavaig_farmers_cache', JSON.stringify(INITIAL_PRODUCTION_FARMERS));
  }
  if (!localStorage.getItem('seavaig_customers_cache')) {
    localStorage.setItem('seavaig_customers_cache', JSON.stringify(INITIAL_PRODUCTION_CUSTOMERS));
  }
  if (!localStorage.getItem('seavaig_workers_cache')) {
    localStorage.setItem('seavaig_workers_cache', JSON.stringify(INITIAL_PRODUCTION_WORKERS));
  }
  if (!localStorage.getItem('seavaig_traders_cache')) {
    localStorage.setItem('seavaig_traders_cache', JSON.stringify(INITIAL_PRODUCTION_TRADERS));
  }
  if (!localStorage.getItem('seavaig_purchases_cache')) {
    localStorage.setItem('seavaig_purchases_cache', JSON.stringify(INITIAL_PRODUCTION_PURCHASES));
  }
  if (!localStorage.getItem('seavaig_sales_cache')) {
    localStorage.setItem('seavaig_sales_cache', JSON.stringify(INITIAL_PRODUCTION_SALES));
  }
  if (!localStorage.getItem('seavaig_payments_cache')) {
    localStorage.setItem('seavaig_payments_cache', JSON.stringify(INITIAL_PRODUCTION_PAYMENTS));
  }
}
