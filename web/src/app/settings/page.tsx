"use client";

import React, { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { useLanguage } from '@/context/LanguageContext';
import { useTenant } from '@/context/TenantContext';
import {
  Building,
  FileText,
  Save,
  CheckCircle,
  ChevronRight,
  Upload,
  Image as ImageIcon
} from 'lucide-react';

export default function SettingsPage() {
  const { t, language } = useLanguage();
  const { tenant, updateTenant } = useTenant();
  const [saved, setSaved] = useState(false);

  const [formData, setFormData] = useState({
    businessName: tenant.businessName,
    businessNameMr: tenant.businessNameMr,
    subdomain: tenant.subdomain,
    logoUrl: tenant.logoUrl || '',
    signatureUrl: tenant.signatureUrl || '',
    phone: tenant.phone,
    email: tenant.email,
    address: tenant.address,
    addressMr: tenant.addressMr,
    gstin: tenant.gstin,
    tagline: tenant.tagline,
    secretPin: tenant.secretPin || '1234',
  });

  const [isAdmin, setIsAdmin] = useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('active_tenant');
        if (stored) {
          const parsed = JSON.parse(stored);
          setIsAdmin(parsed.role === 'SUPERADMIN' || parsed.userRole === 'OWNER' || parsed.id === 'superadmin');
        }
      } catch (e) {}
    }
  }, []);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateTenant(formData);
    
    // Update local storage
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('active_tenant');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.secretPin = formData.secretPin;
          sessionStorage.setItem('active_tenant', JSON.stringify(parsed));
        }
      } catch (e) {}
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, signatureUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex min-h-screen bg-slateCanvas font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header primaryButtonLabel="Save Settings" onPrimaryClick={() => handleSave()} />

        <main className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {language === 'mr' ? 'व्यवसाय प्रोफाइल आणि सेटिंग्ज' : 'Business Settings & Branding'}
              </h1>
              <p className="text-xs font-semibold text-slate-400 mt-1 flex items-center gap-1">
                <span>{t.dashboard}</span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="text-slate-600">{t.settings}</span>
              </p>
            </div>

            {saved && (
              <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                {language === 'mr' ? 'सेटिंग्ज यशस्वीरीत्या सेव्ह झाल्या!' : 'Settings Saved Successfully!'}
              </span>
            )}
          </div>

          <form onSubmit={handleSave} className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-subtle space-y-6 max-w-4xl">
            {/* Section 1: Business Branding & Uploads */}
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-600" />
                {language === 'mr' ? 'कंपनी / व्यवसायाचे नाव व अपलोड (Logo & Signature)' : 'Business Identity & Logo/Signature Upload'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Business Name (English) *</label>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">व्यवसायाचे नाव (मराठी) *</label>
                  <input
                    type="text"
                    required
                    value={formData.businessNameMr}
                    onChange={(e) => setFormData({ ...formData, businessNameMr: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Logo & Digital Signature Upload Dropzones */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Logo Upload Dropzone */}
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <span className="text-xs font-bold text-slate-800 block mb-2">Company Logo (कंपनीचा लोगो)</span>
                  <div className="flex items-center gap-4">
                    {formData.logoUrl ? (
                      <img src={formData.logoUrl} alt="Company Logo" className="w-16 h-16 rounded-xl object-cover border border-slate-200" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                    <label className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-blue-600" />
                      <span>{formData.logoUrl ? 'Change Logo' : 'Upload Logo'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                  </div>
                </div>

                {/* Digital Signature Upload Dropzone */}
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <span className="text-xs font-bold text-slate-800 block mb-2">Authorized Signature (अधिकृत सही / शिक्का)</span>
                  <div className="flex items-center gap-4">
                    {formData.signatureUrl ? (
                      <img src={formData.signatureUrl} alt="Signature" className="h-14 object-contain border border-slate-200 p-1 bg-white rounded-xl" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                    <label className="bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{formData.signatureUrl ? 'Change Signature' : 'Upload Signature'}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Subdomain Slug (Multi-Tenant Domain)</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={formData.subdomain}
                      onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                      className="w-full pl-3 pr-24 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <span className="absolute right-3 top-3 text-[10px] font-bold text-slate-400">.agri.app</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tagline / Subtitle</label>
                  <input
                    type="text"
                    value={formData.tagline}
                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>

            <div className="h-px bg-slate-100" />

            {/* Section 2: Contact & Tax Invoice Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                {language === 'mr' ? 'संपर्क व पावतीवरील पत्ता (Tax Invoice & Receipts)' : 'Tax Invoice & Receipt Details'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Phone Number (फोन नंबर)</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Official Business Email Address (ईमेल आयडी) *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    placeholder="contact@seavaig.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">GSTIN Number (जीएसटी आयडी)</label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Client Dashboard Secret PIN (Daily Rates Lock)</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={formData.secretPin}
                    onChange={(e) => setFormData({ ...formData, secretPin: e.target.value })}
                    disabled={!isAdmin}
                    className={`w-full px-3.5 py-2.5 border rounded-xl text-xs font-black tracking-widest text-slate-800 ${!isAdmin ? 'bg-slate-100 border-slate-200' : 'bg-slate-50 border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20'}`}
                  />
                  <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                    {isAdmin ? 'You can change this PIN.' : 'Only Owner/Admin can change this PIN.'} Default: 1234
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Office Address (English)</label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">कार्यालय पत्ता (मराठी)</label>
                  <textarea
                    rows={2}
                    value={formData.addressMr}
                    onChange={(e) => setFormData({ ...formData, addressMr: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-blue-500/20 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{language === 'mr' ? 'सेटिंग्ज सेव्ह करा' : 'Save Business Settings'}</span>
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
