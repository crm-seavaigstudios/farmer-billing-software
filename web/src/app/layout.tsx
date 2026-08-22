import React from 'react';
import './globals.css';
import { LanguageProvider } from '@/context/LanguageContext';
import { TenantProvider } from '@/context/TenantContext';
import AuthGuard from '@/components/common/AuthGuard';

export const metadata = {
  title: 'Agricultural Procurement & Billing Management System',
  description: 'Enterprise Multi-Tenant Strawberry Procurement Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mr">
      <body className="bg-slateCanvas text-slate-900 font-sans antialiased min-h-screen">
        <TenantProvider>
          <LanguageProvider>
            <AuthGuard>
              {children}
            </AuthGuard>
          </LanguageProvider>
        </TenantProvider>
      </body>
    </html>
  );
}
