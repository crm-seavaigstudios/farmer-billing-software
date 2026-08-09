"use client";

import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ShieldCheck, ChevronRight } from 'lucide-react';

const logs: any[] = [];

export default function AuditLogsPage() {
  return (
    <div className="flex min-h-screen bg-slateCanvas font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header primaryButtonLabel="Export Security Audit" />

        <main className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Audit Logs</h1>
              <p className="text-xs font-semibold text-slate-400 mt-1 flex items-center gap-1">
                <span>Dashboard</span>
                <ChevronRight className="w-3 h-3 text-slate-300" />
                <span className="text-slate-600">Audit Logs</span>
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-subtle">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] font-extrabold text-slate-400 uppercase border-b border-slate-100 pb-3">
                  <th className="py-3 px-3">LOG ID</th>
                  <th className="py-3 px-3">USER ACCOUNT</th>
                  <th className="py-3 px-3">ACTION EVENT</th>
                  <th className="py-3 px-3">TARGET ENTITY & DETAILS</th>
                  <th className="py-3 px-3 text-right">TIMESTAMP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-bold text-blue-600">{row.id}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{row.user}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-100">
                        {row.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 font-medium">{row.entity}</td>
                    <td className="py-3 px-3 text-right text-slate-400 text-[11px]">{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
}
