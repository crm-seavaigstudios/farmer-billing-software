"use client";

import React, { useState, useEffect } from 'react';
import * as OTPAuth from 'otpauth';
import { QRCodeSVG } from 'qrcode.react';
import {
  ShieldCheck,
  Building,
  UserCheck,
  Plus,
  Search,
  Key,
  Smartphone,
  QrCode,
  Lock,
  CheckCircle2,
  AlertCircle,
  Copy,
  Download,
  Inbox
} from 'lucide-react';

import { apiGetTenants, apiCreateTenant } from '@/lib/api';

export default function AgencyAdminPage() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    async function loadTenants() {
      const data = await apiGetTenants();
      setTenants(data);
    }
    loadTenants();
  }, []);
  const [isAddTenantModalOpen, setIsAddTenantModalOpen] = useState(false);

  // 2FA TOTP Authentication Guard State (Microsoft Authenticator / Google Authenticator)
  const [is2FaAuthenticated, setIs2FaAuthenticated] = useState(false);
  const [totpCodeInput, setTotpCodeInput] = useState('');
  const [isTotpError, setIsTotpError] = useState(false);
  const [isSetup2FaModalOpen, setIsSetup2FaModalOpen] = useState(false);
  const [totpSecret, setTotpSecret] = useState('');

  useEffect(() => {
    let secret = localStorage.getItem('agencyAdminTotpSecret');
    if (!secret) {
      secret = new OTPAuth.Secret({ size: 20 }).base32;
      localStorage.setItem('agencyAdminTotpSecret', secret);
    }
    setTotpSecret(secret);
  }, []);

  const [validationError, setValidationError] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [sentOtpCode, setSentOtpCode] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState(false);

  // New Client Form Data
  const [formData, setFormData] = useState({
    companyName: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    passportGovId: '',
    password: '',
    package: 'Enterprise Pro (₹24,999/yr)',
  });

  const handleVerifyTotp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpSecret) return;
    
    const totp = new OTPAuth.TOTP({
      issuer: "SeavaigAgency",
      label: "admin@seavaig.com",
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(totpSecret)
    });
    
    const delta = totp.validate({ token: totpCodeInput, window: 1 });
    
    if (totpCodeInput.length === 6 && delta !== null) {
      setIs2FaAuthenticated(true);
      setIsTotpError(false);
    } else {
      setIsTotpError(true);
    }
  };

  const handleOnboardTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    // Check duplicate email or phone in database/cache
    const duplicate = tenants.find(
      (t) => t.ownerEmail.toLowerCase() === formData.ownerEmail.toLowerCase() || t.ownerPhone === formData.ownerPhone
    );
    if (duplicate) {
      setValidationError('Error: Email or Mobile number is already registered in our database!');
      return;
    }

    // Generate random 4-digit OTP code
    const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
    setSentOtpCode(generatedOtp);
    setIsVerifyingOtp(true);
    setOtpInput('');
    setOtpError(false);

    // Prompt user with simulation
    alert(`🔐 [DEMO MODE OTP] Verification code sent to Email/SMS: ${generatedOtp}`);
  };

  const handleVerifyRegistrationOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput !== sentOtpCode) {
      setOtpError(true);
      return;
    }

    setOtpError(false);
    setIsVerifyingOtp(false);
    setIsAddTenantModalOpen(false);

    // Call DB persistence function
    const newTenant = await apiCreateTenant(formData);

    setTenants([newTenant, ...tenants]);
    setFormData({
      companyName: '',
      ownerName: '',
      ownerEmail: '',
      ownerPhone: '',
      passportGovId: '',
      password: '',
      package: 'Enterprise Pro (₹24,999/yr)',
    });
  };

  return (
    <div className="flex min-h-screen bg-slate-900 font-sans text-slate-100 antialiased">
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* 2FA AUTHENTICATION GUARD MODAL IF NOT AUTHENTICATED */}
        {!is2FaAuthenticated ? (
          <main className="flex-1 flex items-center justify-center p-6 bg-slate-950/80">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto shadow-inner">
                <ShieldCheck className="w-8 h-8 text-blue-500" />
              </div>

              <div>
                <h1 className="text-xl font-black text-white">Agency Super Admin Security Guard</h1>
                <p className="text-xs font-semibold text-slate-400 mt-1">
                  Enter 6-Digit Code from <b>Microsoft Authenticator</b> or <b>Google Authenticator</b>
                </p>
              </div>

              <form onSubmit={handleVerifyTotp} className="space-y-4">
                <div>
                  <input
                    type="text"
                    maxLength={6}
                    autoFocus
                    placeholder="Enter 6-Digit Code (e.g. 123456)"
                    value={totpCodeInput}
                    onChange={(e) => setTotpCodeInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center tracking-widest text-2xl font-black py-3 bg-slate-800 border border-slate-700 rounded-2xl text-blue-400 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                  {isTotpError && (
                    <p className="text-xs font-bold text-rose-400 mt-2 flex items-center justify-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Please enter a valid 6-digit TOTP code
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-blue-600/20"
                >
                  Verify Microsoft Authenticator & Login
                </button>
              </form>

              <div className="pt-2 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsSetup2FaModalOpen(true)}
                  className="text-xs font-bold text-blue-400 hover:underline flex items-center justify-center gap-1.5 mx-auto"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Setup Microsoft Authenticator QR Code</span>
                </button>
              </div>
            </div>
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                    SaaS Agency Console (SEAVAIG STUDIOS)
                  </h1>
                  <span className="flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    2FA Verified ($0 Cost)
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-400 mt-1">
                  Sell software to clients, issue unique Company Codes & assign authenticated owners
                </p>
              </div>

              <button
                onClick={() => setIsAddTenantModalOpen(true)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Onboard New Client Company</span>
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Active Client Companies</p>
                  <p className="text-lg font-black text-white mt-0.5">{tenants.length} Client Companies</p>
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Multi-Tenant Isolation</p>
                  <p className="text-lg font-black text-emerald-400 mt-0.5">100% Enforced</p>
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">MFA Security</p>
                  <p className="text-lg font-black text-purple-400 mt-0.5">MS Authenticator TOTP</p>
                </div>
              </div>
            </div>

            {/* Clients Table */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-700/60 flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">Client Subscription Directory</h3>
                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search company or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-900/60 border border-slate-700 rounded-xl text-xs font-semibold text-white"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-700/60">
                    <tr>
                      <th className="py-3.5 px-4">Company Code</th>
                      <th className="py-3.5 px-4">Company Legal Name</th>
                      <th className="py-3.5 px-4">Client Owner</th>
                      <th className="py-3.5 px-4">Gov / Passport ID</th>
                      <th className="py-3.5 px-4">SaaS Package</th>
                      <th className="py-3.5 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/40 font-medium text-slate-300">
                    {tenants.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center">
                          <Inbox className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                          <p className="text-sm font-bold text-slate-300">No Client Companies Onboarded Yet</p>
                          <p className="text-xs text-slate-500 mt-1">Click "Onboard New Client Company" above to register your first tenant.</p>
                        </td>
                      </tr>
                    ) : (
                      tenants.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-700/30 transition-colors">
                          <td className="py-3.5 px-4 font-black text-blue-400">{t.companyCode}</td>
                          <td className="py-3.5 px-4 font-bold text-white">{t.companyName}</td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-200">{t.ownerName}</div>
                            <div className="text-[10px] text-slate-400">{t.ownerEmail} • {t.ownerPhone}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-300">{t.passportOrGovId}</td>
                          <td className="py-3.5 px-4 font-bold text-emerald-400">{t.package}</td>
                          <td className="py-3.5 px-4">
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        )}
      </div>

      {/* SETUP MICROSOFT AUTHENTICATOR QR MODAL */}
      {isSetup2FaModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-extrabold text-white">Setup Microsoft Authenticator</span>
              </div>
              <button onClick={() => setIsSetup2FaModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="text-center space-y-3">
              <p className="text-xs font-semibold text-slate-300">
                1. Open <b>Microsoft Authenticator</b> on your phone.<br/>
                2. Tap <b>`+` (Add Account)</b> $\rightarrow$ <b>`Other Account`</b>.<br/>
                3. Scan this QR Code:
              </p>

              {/* QR Code */}
              <div className="w-48 h-48 bg-white rounded-2xl p-3 mx-auto flex items-center justify-center border-4 border-blue-500 shadow-xl">
                {totpSecret && (
                  <QRCodeSVG 
                    value={new OTPAuth.TOTP({
                      issuer: "SeavaigAgency",
                      label: "admin@seavaig.com",
                      algorithm: "SHA1",
                      digits: 6,
                      period: 30,
                      secret: OTPAuth.Secret.fromBase32(totpSecret)
                    }).toString()} 
                    size={160} 
                  />
                )}
              </div>

              <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Secret Key:</span>
                <span className="text-xs font-mono font-bold text-blue-400">{totpSecret}</span>
              </div>
            </div>

            <button
              onClick={() => setIsSetup2FaModalOpen(false)}
              className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold"
            >
              Done Scanning
            </button>
          </div>
        </div>
      )}

      {/* ONBOARD CLIENT MODAL */}
      {isAddTenantModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 font-sans text-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-extrabold text-white">Sell Software / Onboard Client Company</h2>
              <button onClick={() => { setIsAddTenantModalOpen(false); setIsVerifyingOtp(false); }} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            {validationError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {!isVerifyingOtp ? (
              <form onSubmit={handleOnboardTenant} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Company Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Mahabaleshwar Strawberry Agro"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Client Owner Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rameshwar Patil"
                      value={formData.ownerName}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Owner Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="admin@company.com"
                      value={formData.ownerEmail}
                      onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Owner Mobile *</label>
                    <input
                      type="tel"
                      required
                      placeholder="+91 9823456789"
                      value={formData.ownerPhone}
                      onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Passport / Gov Tax ID</label>
                    <input
                      type="text"
                      placeholder="GOV-MH-99812"
                      value={formData.passportGovId}
                      onChange={(e) => setFormData({ ...formData, passportGovId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 font-bold block mb-1">Subscription Package</label>
                    <select
                      value={formData.package}
                      onChange={(e) => setFormData({ ...formData, package: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-emerald-400 font-bold focus:outline-none"
                    >
                      <option value="Enterprise Pro (₹24,999/yr)">Enterprise Pro (₹24,999/yr)</option>
                      <option value="Growth Plan (₹14,999/yr)">Growth Plan (₹14,999/yr)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Set Password for Agency Login *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => { setIsAddTenantModalOpen(false); setIsVerifyingOtp(false); }}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 cursor-pointer"
                  >
                    Verify Email/SMS & Save
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyRegistrationOtp} className="space-y-4 text-center">
                <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center mx-auto">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white">Enter Email/SMS Verification OTP</h3>
                  <p className="text-slate-400 text-xs mt-1">We sent a 4-digit code to verify owner authenticity.</p>
                </div>
                
                <div>
                  <input
                    type="text"
                    maxLength={4}
                    required
                    placeholder="e.g. 1234"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    className="w-32 text-center text-xl font-bold py-2 bg-slate-800 border border-slate-700 rounded-xl text-blue-400 focus:outline-none"
                  />
                  {otpError && (
                    <p className="text-rose-400 font-semibold mt-2">Invalid verification OTP code. Try again!</p>
                  )}
                </div>

                <div className="pt-3 flex justify-center gap-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsVerifyingOtp(false)}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer"
                  >
                    Verify & Onboard
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
