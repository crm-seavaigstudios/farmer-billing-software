-- Run this in your Supabase SQL Editor to add true multi-tenancy and global APK support

-- 0. Ensure base tables exist
CREATE TABLE IF NOT EXISTS "Tenant" (
    "id" text PRIMARY KEY,
    "ownerEmail" text NOT NULL,
    "password" text NOT NULL,
    "companyName" text NOT NULL,
    "contactPerson" text,
    "phone" text,
    "address" text,
    "status" text DEFAULT 'ACTIVE',
    "createdAt" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Farmer" (
    "id" text PRIMARY KEY,
    "farmerCode" text,
    "name" text NOT NULL,
    "phone" text NOT NULL,
    "password" text,
    "village" text,
    "taluka" text,
    "district" text,
    "aadhaarNumber" text,
    "bankName" text,
    "accountNumber" text,
    "ifscCode" text,
    "grade" text,
    "totalPurchase" numeric DEFAULT 0,
    "totalPaid" numeric DEFAULT 0,
    "outstandingAmount" numeric DEFAULT 0,
    "advanceBalance" numeric DEFAULT 0,
    "status" text DEFAULT 'ACTIVE',
    "tenantId" text,
    "createdAt" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Trader" (
    "id" text PRIMARY KEY,
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
    "tenantId" text,
    "createdAt" timestamp with time zone DEFAULT now()
);

-- 1. Create Core Transactional Tables
CREATE TABLE IF NOT EXISTS "Purchase" (
    "id" text PRIMARY KEY,
    "tenantId" text NOT NULL,
    "purchaseNo" text,
    "farmerId" text,
    "totalWeight" numeric,
    "totalAmount" numeric,
    "paidAmount" numeric,
    "dueAmount" numeric,
    "paymentStatus" text,
    "purchaseDate" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS "Sale" (
    "id" text PRIMARY KEY,
    "tenantId" text NOT NULL,
    "saleNo" text,
    "customerId" text,
    "totalWeight" numeric,
    "totalAmount" numeric,
    "paidAmount" numeric,
    "dueAmount" numeric,
    "paymentStatus" text,
    "saleDate" timestamp with time zone,
    "logisticsPhotoUrl" text,
    "createdAt" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "SaleItem" (
    "id" text PRIMARY KEY,
    "tenantId" text NOT NULL,
    "saleId" text,
    "cropName" text,
    "grade" text,
    "weightKg" numeric,
    "ratePerKg" numeric,
    "unit" text,
    "packagingCategory" text,
    "totalAmount" numeric,
    "createdAt" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Payment" (
    "id" text PRIMARY KEY,
    "tenantId" text NOT NULL,
    "farmerId" text,
    "amount" numeric,
    "paymentType" text,
    "referenceNo" text,
    "paymentDate" timestamp with time zone,
    "remarks" text,
    "createdAt" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Expense" (
    "id" text PRIMARY KEY,
    "tenantId" text NOT NULL,
    "description" text,
    "amount" numeric,
    "date" timestamp with time zone,
    "category" text,
    "createdAt" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "FarmerMaterialPurchase" (
    "id" text PRIMARY KEY,
    "tenantId" text NOT NULL,
    "farmerId" text,
    "materialName" text,
    "quantity" numeric,
    "rate" numeric,
    "totalAmount" numeric,
    "date" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Customer" (
    "id" text PRIMARY KEY,
    "tenantId" text NOT NULL,
    "name" text,
    "phone" text,
    "village" text,
    "outstandingAmount" numeric,
    "totalPurchase" numeric,
    "totalPaid" numeric,
    "createdAt" timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "TraderPurchase" (
    "id" text PRIMARY KEY,
    "tenantId" text NOT NULL,
    "traderId" text,
    "billNo" text,
    "totalWeight" numeric,
    "totalAmount" numeric,
    "paidAmount" numeric,
    "dueAmount" numeric,
    "paymentStatus" text,
    "date" timestamp with time zone,
    "createdAt" timestamp with time zone DEFAULT now()
);

-- 2. Worker / Staff Logic
CREATE TABLE IF NOT EXISTS "Worker" (
    "id" text PRIMARY KEY,
    "tenantId" text NOT NULL,
    "workerCode" text,
    "staffIdCode" text,
    "name" text NOT NULL,
    "phone" text NOT NULL,
    "role" text DEFAULT 'STAFF',
    "status" text DEFAULT 'ACTIVE',
    "createdAt" timestamp with time zone DEFAULT now()
);

-- 3. Global Farmer Architecture
-- We will use the existing "Farmer" table as the global table
ALTER TABLE "Farmer" ADD COLUMN IF NOT EXISTS "password" text;

-- Remove duplicates by keeping the most recently created one
DELETE FROM "Farmer" a
USING "Farmer" b
WHERE a.id < b.id AND a.phone = b.phone;

ALTER TABLE "Farmer" DROP CONSTRAINT IF EXISTS unique_farmer_phone;
ALTER TABLE "Farmer" ADD CONSTRAINT unique_farmer_phone UNIQUE ("phone");

-- Create Junction Table for Tenant-Farmer Link
CREATE TABLE IF NOT EXISTS "TenantFarmerLink" (
    "id" text PRIMARY KEY,
    "tenantId" text NOT NULL,
    "farmerId" text NOT NULL,
    "farmerCode" text,
    "advanceBalance" numeric DEFAULT 0,
    "outstandingAmount" numeric DEFAULT 0,
    "totalPurchase" numeric DEFAULT 0,
    "totalPaid" numeric DEFAULT 0,
    "status" text DEFAULT 'ACTIVE',
    "createdAt" timestamp with time zone DEFAULT now(),
    FOREIGN KEY ("farmerId") REFERENCES "Farmer"("id")
);

-- 4. Global Seller Architecture
-- We will use the existing "Trader" table as the global table
ALTER TABLE "Trader" ADD COLUMN IF NOT EXISTS "password" text;

-- Remove duplicates by keeping the most recently created one
DELETE FROM "Trader" a
USING "Trader" b
WHERE a.id < b.id AND a.phone = b.phone;

ALTER TABLE "Trader" DROP CONSTRAINT IF EXISTS unique_seller_phone;
ALTER TABLE "Trader" ADD CONSTRAINT unique_seller_phone UNIQUE ("phone");

-- Create Junction Table for Tenant-Seller Link
CREATE TABLE IF NOT EXISTS "TenantSellerLink" (
    "id" text PRIMARY KEY,
    "tenantId" text NOT NULL,
    "sellerId" text NOT NULL,
    "sellerCode" text,
    "outstandingAmount" numeric DEFAULT 0,
    "status" text DEFAULT 'ACTIVE',
    "createdAt" timestamp with time zone DEFAULT now(),
    FOREIGN KEY ("sellerId") REFERENCES "Trader"("id")
);

-- Note: TraderPurchase stays as is, just rename references in code or add tenantId
ALTER TABLE "TraderPurchase" ADD COLUMN IF NOT EXISTS "tenantId" text;

-- 5. Daily Crop Market Rate Sheet Table
CREATE TABLE IF NOT EXISTS "DailyCropRate" (
    "id" text PRIMARY KEY,
    "tenantId" text NOT NULL,
    "sellerId" text NOT NULL,
    "cropName" text NOT NULL,
    "grade" text NOT NULL,
    "ratePerKg" numeric NOT NULL,
    "date" date NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now()
);

-- 6. Logistics Photos
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "logisticsPhotoUrl" text;
