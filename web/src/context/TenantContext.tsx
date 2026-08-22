"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface TenantBranding {
  tenantId: string;
  businessName: string;
  businessNameMr: string;
  subdomain: string;
  logoUrl?: string;
  signatureUrl?: string;
  phone: string;
  email: string;
  address: string;
  addressMr: string;
  gstin: string;
  tagline: string;
  primaryColor: string;
  status: 'ACTIVE' | 'SUSPENDED';
  secretPin: string;
}

const defaultTenant: TenantBranding = {
  tenantId: 'tenant_default',
  businessName: 'Agri CRM',
  businessNameMr: 'कृषी सीआरएम',
  subdomain: 'agri-crm',
  logoUrl: '',
  signatureUrl: '',
  phone: '+91 99999 99999',
  email: 'admin@agricrm.com',
  address: 'Maharashtra, India',
  addressMr: 'महाराष्ट्र, भारत',
  gstin: '27AAAAA0000A1Z5',
  tagline: 'Agricultural Procurement System',
  primaryColor: '#2563EB',
  status: 'ACTIVE',
  secretPin: '1234',
};

interface TenantContextType {
  tenant: TenantBranding;
  updateTenant: (branding: Partial<TenantBranding>) => void;
  toggleTenantStatus: () => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<TenantBranding>(defaultTenant);

  // Hydrate from session storage on client mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('active_tenant');
        if (stored) {
          const parsed = JSON.parse(stored);
          
          if (parsed.id === 'superadmin') {
            setTenant({
              ...defaultTenant,
              tenantId: 'superadmin',
              businessName: 'Super Admin Global',
              businessNameMr: 'सुपर ॲडमिन ग्लोबल',
              subdomain: 'admin',
              email: parsed.ownerEmail,
              secretPin: parsed.secretPin || '1234',
            });
            return;
          }

          setTenant({
            ...defaultTenant,
            tenantId: parsed.id || defaultTenant.tenantId,
            businessName: parsed.companyName || parsed.businessName || defaultTenant.businessName,
            businessNameMr: parsed.businessNameMr || parsed.companyNameMr || parsed.companyName || parsed.businessName || defaultTenant.businessNameMr,
            subdomain: parsed.subdomain || (parsed.companyName || parsed.businessName || 'seavaig').replace(/\s+/g, '-').toLowerCase(),
            phone: parsed.ownerPhone || parsed.phone || defaultTenant.phone,
            email: parsed.ownerEmail || parsed.email || defaultTenant.email,
            secretPin: parsed.secretPin || defaultTenant.secretPin,
            tagline: parsed.tagline || defaultTenant.tagline,
            primaryColor: parsed.primaryColor || defaultTenant.primaryColor,
            logoUrl: parsed.logoUrl || defaultTenant.logoUrl,
            signatureUrl: parsed.signatureUrl || defaultTenant.signatureUrl,
            addressMr: parsed.addressMr || defaultTenant.addressMr,
            gstin: parsed.gstin || defaultTenant.gstin,
          });
        }
      } catch (e) {
        console.error("Error parsing tenant session:", e);
      }
    }
  }, []);

  const updateTenant = (branding: Partial<TenantBranding>) => {
    setTenant((prev) => ({ ...prev, ...branding }));
  };

  const toggleTenantStatus = () => {
    setTenant((prev) => ({
      ...prev,
      status: prev.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
    }));
  };

  return (
    <TenantContext.Provider value={{ tenant, updateTenant, toggleTenantStatus }}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
