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
}

const defaultTenant: TenantBranding = {
  tenantId: 'tenant_mahabaleshwar_agro',
  businessName: 'Mahabaleshwar Strawberry Agro',
  businessNameMr: 'महाबळेश्वर स्ट्रॉबेरी अ‍ॅग्रो प्रोड्युसर कंपनी',
  subdomain: 'mahabaleshwar-agro',
  logoUrl: '',
  signatureUrl: '',
  phone: '+91 98234 56789',
  email: 'contact@mahabaleshwaragro.com',
  address: 'Nashik-Sinnar Highway, Maharashtra 422103',
  addressMr: 'नाशिक-सिन्नर हायवे, महाराष्ट्र ४२२१०३',
  gstin: '27AAAAA0000A1Z5',
  tagline: 'Strawberry Procurement & Farmer Billing System',
  primaryColor: '#2563EB',
  status: 'ACTIVE',
};

interface TenantContextType {
  tenant: TenantBranding;
  updateTenant: (branding: Partial<TenantBranding>) => void;
  toggleTenantStatus: () => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<TenantBranding>(defaultTenant);

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
