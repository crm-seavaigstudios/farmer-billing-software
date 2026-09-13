-- ====================================================================
-- MASTER SUPABASE DATABASE SCHEMA SETUP
-- Farmer Billing & Cold Storage Management System
-- Compatible with all multi-tenant features, owner settings, and portals
-- ====================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TENANT / AGENCY TABLE
CREATE TABLE IF NOT EXISTS "Tenant" (
    "id" text PRIMARY KEY,
    "companyName" text NOT NULL,
    "ownerName" text,
    "ownerEmail" text,
    "ownerPhone" text,
    "phone" text,
    "password" text,
    "passportOrGovId" text,
    "package" text DEFAULT 'Enterprise Pro (₹24,999/yr)',
    "status" text DEFAULT 'ACTIVE',
    "businessNameMr" text,
    "address" text,
    "addressMr" text,
    "gstin" text,
    "tagline" text,
    "primaryColor" text DEFAULT '#2563eb',
    "secretPin" text,
    "subdomain" text,
    "logoUrl" text,
    "signatureUrl" text,
    "createdAt" timestamp with time zone DEFAULT now()
);

-- 3. FARMERS TABLE
CREATE TABLE IF NOT EXISTS "Farmer" (
    "id" text PRIMARY KEY,
    "tenantId" text,
    "name" text NOT NULL,
    "phone" text NOT NULL,
    "farmerCode" text,
    "farmerIdCode" text,
    "village" text,
    "taluka" text,
    "district" text,
    "aadhaarNumber" text,
    "bankName" text,
    "accountNumber" text,
    "ifscCode" text,
    "grade" text,
    "password" text,
    "totalPurchase" numeric DEFAULT 0,
    "totalPaid" numeric DEFAULT 0,
    "outstandingAmount" numeric DEFAULT 0,
    "advanceBalance" numeric DEFAULT 0,
    "status" text DEFAULT 'ACTIVE',
    "createdAt" timestamp with time zone DEFAULT now()
);

-- 4. PURCHASES TABLE
CREATE TABLE IF NOT EXISTS "Purchase" (
    "id" text PRIMARY KEY,
    "tenantId" text NOT NULL,
    "purchaseNo" text,
    "farmerId" text,
    "farmerName" text,
    "crop" text,
    "weight" text,
    "rate" text,
    "amount" numeric DEFAULT 0,
    "totalWeight" numeric DEFAULT 0,
    "totalAmount" numeric DEFAULT 0,
    "paidAmount" numeric DEFAULT 0,
    "dueAmount" numeric DEFAULT 0,
    "paymentStatus" text DEFAULT 'UNPAID',
    "purchaseDate" timestamp with time zone,
    "date" text,
    "storageLocation" text,
    "packagingCategory" text,
    "category" text,
    "unit" text,
    "advanceApplied" numeric DEFAULT 0,
    "deductedMaterialIds" jsonb DEFAULT '[]'::jsonb,
    "items" jsonb DEFAULT '[]'::jsonb,
    "status" text DEFAULT 'ACTIVE',
    "createdAt" timestamp with time zone DEFAULT now()
);

-- 5. PURCHASE ITEMS TABLE
CREATE TABLE IF NOT EXISTS "PurchaseItem" (
    "id" text PRIMARY KEY,
    "tenantId" text NOT NULL,
    "purchaseId" text,
    "cropName" text,
    "grade" text,
    "weightKg" numeric,
    "ratePerKg" numeric,
    "unit" text,
    "packagingCategory" text,
    "totalAmount" numeric,
    "createdAt" timestamp with time zone DEFAULT now()
);

-- 6. SALES / DISPATCH BILLS TABLE
CREATE TABLE IF NOT EXISTS "Sale" (
    "id" text PRIMARY KEY,
    "tenantId" text NOT NULL,
    "billNo" text,
    "saleNo" text,
    "customerId" text,
    "customerName" text,
    "phone" text,
    "address" text,
    "amount" numeric DEFAULT 0,
    "totalAmount" numeric DEFAULT 0,
    "totalWeight" numeric DEFAULT 0,
    "paidAmount" numeric DEFAULT 0,
    "dueAmount" numeric DEFAULT 0,
    "paymentStatus" text DEFAULT 'UNPAID',
    "paymentHistory" jsonb DEFAULT '[]'::jsonb,
    "deliveryStatus" text DEFAULT 'IN_TRANSIT',
    "vehicleNo" text,
    "driverName" text,
    "driverPhone" text,
    "vehiclePhotoUrl" text,
    "driverSignatureUrl" text,
    "photoUrl" text,
    "farmerBatches" jsonb DEFAULT '[]'::jsonb,
    "items" text,
    "itemsData" jsonb DEFAULT '[]'::jsonb,
    "status" text DEFAULT 'ACTIVE',
    "date" text,
    "saleDate" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT now()
);

-- 7. PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" text PRIMARY KEY,
    "tenantId" text NOT NULL,
    "farmerId" text,
    "entityId" text,
    "entityType" text DEFAULT 'FARMER',
    "amount" numeric DEFAULT 0,
    "type" text DEFAULT 'PAYMENT',
    "paymentType" text,
    "paymentMode" text DEFAULT 'CASH',
    "mode" text DEFAULT 'CASH',
    "referenceNo" text,
    "notes" text,
    "remarks" text,
    "paymentDate" timestamp with time zone,
    "date" text,
    "status" text DEFAULT 'PAID',
    "createdAt" timestamp with time zone DEFAULT now()
);

-- 8. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS "Expense" (
    "id" text PRIMARY KEY,
    "tenantId" text NOT NULL,
    "title" text,
    "description" text,
    "amount" numeric DEFAULT 0,
    "date" text,
    "category" text,
    "paymentMode" text DEFAULT 'CASH',
    "status" text DEFAULT 'ACTIVE',
    "createdAt" timestamp with time zone DEFAULT now()
);

-- 9. FARMER MATERIAL ISSUES / ADVANCES TABLE
CREATE TABLE IF NOT EXISTS "FarmerMaterialPurchase" (
    "id" text PRIMARY KEY,
    "tenantId" text NOT NULL,
    "farmerId" text,
    "materialName" text,
    "itemName" text,
    "quantity" numeric DEFAULT 0,
    "rate" numeric DEFAULT 0,
    "totalAmount" numeric DEFAULT 0,
    "amount" numeric DEFAULT 0,
    "category" text DEFAULT 'PACKAGING',
    "status" text DEFAULT 'ISSUED',
    "deducted" boolean DEFAULT false,
    "date" text,
    "createdAt" timestamp with time zone DEFAULT now()
);

-- 10. CUSTOMERS / BUYERS TABLE
CREATE TABLE IF NOT EXISTS "Customer" (
    "id" text PRIMARY KEY,
    "tenantId" text NOT NULL,
    "name" text NOT NULL,
    "phone" text,
    "village" text,
    "address" text,
    "outstandingAmount" numeric DEFAULT 0,
    "totalPurchase" numeric DEFAULT 0,
    "totalPaid" numeric DEFAULT 0,
    "status" text DEFAULT 'ACTIVE',
    "createdAt" timestamp with time zone DEFAULT now()
);

-- 11. TRADERS / SELLERS TABLE
CREATE TABLE IF NOT EXISTS "Trader" (
    "id" text PRIMARY KEY,
    "tenantId" text,
    "traderCode" text,
    "name" text NOT NULL,
    "phone" text NOT NULL,
    "password" text,
    "companyName" text,
    "gstNumber" text,
    "address" text,
    "totalPurchase" numeric DEFAULT 0,
    "totalPaid" numeric DEFAULT 0,
    "outstandingAmount" numeric DEFAULT 0,
    "status" text DEFAULT 'ACTIVE',
    "createdAt" timestamp with time zone DEFAULT now()
);

-- 12. TRADER PURCHASES TABLE
CREATE TABLE IF NOT EXISTS "TraderPurchase" (
    "id" text PRIMARY KEY,
    "tenantId" text NOT NULL,
    "traderId" text,
    "billNo" text,
    "itemName" text,
    "category" text DEFAULT 'PACKAGING',
    "totalWeight" numeric DEFAULT 0,
    "quantity" numeric DEFAULT 0,
    "rate" numeric DEFAULT 0,
    "amount" numeric DEFAULT 0,
    "totalAmount" numeric DEFAULT 0,
    "paidAmount" numeric DEFAULT 0,
    "dueAmount" numeric DEFAULT 0,
    "paymentStatus" text DEFAULT 'UNPAID',
    "date" text,
    "createdAt" timestamp with time zone DEFAULT now()
);

-- 13. WORKERS & STAFF TABLE
CREATE TABLE IF NOT EXISTS "DailyWorker" (
    "id" text PRIMARY KEY,
    "tenantId" text NOT NULL,
    "name" text NOT NULL,
    "phone" text NOT NULL,
    "role" text DEFAULT 'STAFF',
    "workerCode" text,
    "staffIdCode" text,
    "dailyWage" numeric DEFAULT 0,
    "outstandingBalance" numeric DEFAULT 0,
    "password" text,
    "status" text DEFAULT 'ACTIVE',
    "attendanceHistory" jsonb DEFAULT '[]'::jsonb,
    "createdAt" timestamp with time zone DEFAULT now()
);

-- 14. MATERIAL ITEM CATALOG TABLE
CREATE TABLE IF NOT EXISTS "MaterialItem" (
    "id" text PRIMARY KEY,
    "tenantId" text NOT NULL,
    "name" text NOT NULL,
    "category" text DEFAULT 'PACKAGING',
    "unit" text DEFAULT 'QTY',
    "defaultRate" numeric DEFAULT 0,
    "createdAt" timestamp with time zone DEFAULT now()
);

-- 15. STORAGE LOCATIONS TABLE
CREATE TABLE IF NOT EXISTS "Location" (
    "id" text PRIMARY KEY,
    "tenantId" text NOT NULL,
    "name" text NOT NULL,
    "type" text DEFAULT 'COLD_STORAGE',
    "capacity" text,
    "temp" text DEFAULT '2.4°C',
    "humidity" text DEFAULT '85%',
    "createdAt" timestamp with time zone DEFAULT now()
);

-- 16. DAILY CROP MARKET RATES TABLE
CREATE TABLE IF NOT EXISTS "DailyCropRate" (
    "id" text PRIMARY KEY,
    "tenantId" text NOT NULL,
    "sellerId" text,
    "cropName" text NOT NULL,
    "grade" text DEFAULT 'A_GRADE',
    "ratePerKg" numeric DEFAULT 0,
    "rate" numeric DEFAULT 0,
    "unit" text DEFAULT 'KG',
    "date" text,
    "createdAt" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "SellerCropRates" (
    "id" text PRIMARY KEY,
    "tenantId" text NOT NULL,
    "sellerId" text NOT NULL,
    "cropName" text NOT NULL,
    "grade" text DEFAULT 'A_GRADE',
    "ratePerKg" numeric DEFAULT 0,
    "rate" numeric DEFAULT 0,
    "unit" text DEFAULT 'KG',
    "date" text,
    "createdAt" timestamp with time zone DEFAULT now()
);

-- 17. CROPS TABLE
CREATE TABLE IF NOT EXISTS "Crop" (
    "id" text PRIMARY KEY,
    "tenantId" text NOT NULL,
    "name" text NOT NULL,
    "grade" text DEFAULT 'A_GRADE',
    "defaultRate" numeric DEFAULT 0,
    "createdAt" timestamp with time zone DEFAULT now()
);

-- 18. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" text PRIMARY KEY,
    "tenantId" text,
    "userId" text,
    "action" text,
    "details" text,
    "createdAt" timestamp with time zone DEFAULT now()
);

-- 19. USERS TABLE
CREATE TABLE IF NOT EXISTS "User" (
    "id" text PRIMARY KEY,
    "tenantId" text,
    "name" text,
    "email" text,
    "phone" text,
    "password" text,
    "role" text DEFAULT 'OWNER',
    "status" text DEFAULT 'ACTIVE',
    "createdAt" timestamp with time zone DEFAULT now()
);

-- ====================================================================
-- PERFORMANCE INDEXES
-- ====================================================================
CREATE INDEX IF NOT EXISTS "idx_farmer_tenant" ON "Farmer" ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_purchase_tenant" ON "Purchase" ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_sale_tenant" ON "Sale" ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_payment_tenant" ON "Payment" ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_expense_tenant" ON "Expense" ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_customer_tenant" ON "Customer" ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_trader_tenant" ON "Trader" ("tenantId");
CREATE INDEX IF NOT EXISTS "idx_worker_tenant" ON "DailyWorker" ("tenantId");

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) & OPEN ANON ACCESS POLICIES
-- Allows seamless API access with standard anon public key
-- ====================================================================
DO $$ 
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'Tenant', 'Farmer', 'Purchase', 'PurchaseItem', 'Sale', 
        'Payment', 'Expense', 'FarmerMaterialPurchase', 'Customer', 
        'Trader', 'TraderPurchase', 'DailyWorker', 'MaterialItem', 
        'Location', 'DailyCropRate', 'SellerCropRates', 'Crop', 
        'AuditLog', 'User'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Allow full access to anon" ON %I;', tbl);
        EXECUTE format('CREATE POLICY "Allow full access to anon" ON %I FOR ALL TO anon USING (true) WITH CHECK (true);', tbl);
        EXECUTE format('CREATE POLICY "Allow full access to authenticated" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true);', tbl);
    END LOOP;
END $$;
