-- ==============================================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES FOR MULTI-TENANT SAAS ISOLATION
-- Pattern 1: Shared DB + RLS (Salesforce / Supabase Standard Model)
-- ==============================================================================

-- 1. Enable RLS on all tenant-isolated tables
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FarmerTenantMapping" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Purchase" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FarmerLedger" ENABLE ROW LEVEL SECURITY;

-- 2. Tenant Isolation Policy for User Accounts
CREATE POLICY user_tenant_isolation_policy ON "User"
FOR ALL
USING (
  tenantId = (auth.jwt() ->> 'tenantId') OR (auth.jwt() ->> 'role') = 'SUPER_ADMIN'
);

-- 3. Tenant Isolation Policy for Farmer Accounts
CREATE POLICY farmer_tenant_isolation_policy ON "FarmerTenantMapping"
FOR ALL
USING (
  tenantId = (auth.jwt() ->> 'tenantId') OR (auth.jwt() ->> 'role') = 'SUPER_ADMIN'
);

-- 4. Tenant Isolation Policy for Purchases
CREATE POLICY purchase_tenant_isolation_policy ON "Purchase"
FOR ALL
USING (
  tenantId = (auth.jwt() ->> 'tenantId') OR (auth.jwt() ->> 'role') = 'SUPER_ADMIN'
);

-- 5. Tenant Isolation Policy for Payments
CREATE POLICY payment_tenant_isolation_policy ON "Payment"
FOR ALL
USING (
  tenantId = (auth.jwt() ->> 'tenantId') OR (auth.jwt() ->> 'role') = 'SUPER_ADMIN'
);

-- 6. Farmer Global Cross-Tenant Multi-Company Lookup Policy (For Farmer Mobile App)
-- Allows a farmer authenticated by phone number to query only their linked companies
CREATE POLICY farmer_global_lookup_policy ON "FarmerGlobal"
FOR SELECT
USING (
  phone = (auth.jwt() ->> 'phone') OR (auth.jwt() ->> 'role') = 'SUPER_ADMIN'
);
