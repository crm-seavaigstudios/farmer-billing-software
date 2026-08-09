# Enterprise Agricultural Procurement & Billing SaaS Platform

An enterprise-grade, multi-tenant Strawberry Procurement & Billing Management System designed for agricultural software agencies selling to farm procurement client companies.

---

## Technical Stack Overview

- **Frontend**: Next.js 14+ (App Router), Tailwind CSS, Lucide Icons, Recharts, `LanguageContext` (Native Marathi `मराठी` & English), `TenantContext` (Custom Client Branding).
- **Backend API**: NestJS (TypeScript), Prisma ORM, Helmet security headers, ValidationPipe, JWT Auth.
- **Database & Security**: PostgreSQL / Supabase with **Pattern 1: Row Level Security (RLS)** policies for multi-tenant isolation.
- **Mobile Portal**: Flutter (Material 3) Farmer Mobile Application with **Multi-Procure Company Selector**.
- **DevOps**: Docker, Docker Compose, PostgreSQL 16, Redis 7.

---

## Quick Start (Local Development)

### 1. Backend API Setup
```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run start:dev
```
Backend API will run at: `http://localhost:4000/api`

### 2. Next.js Web Application Setup
```bash
cd web
npm install
npm run dev
```
Web Application will run at: `http://localhost:3000`

### 3. Flutter Farmer Mobile App Setup
```bash
cd farmer_mobile_app
flutter pub get
flutter run
```

---

## One-Command Docker Production Deployment

To start the complete production stack (PostgreSQL + Redis + NestJS API + Next.js Web):

```bash
docker-compose up --build -d
```

### Access Points:
- **Corporate Web Portal**: `http://localhost:3000`
- **Agency SaaS Super Admin Console**: `http://localhost:3000/agency-admin`
- **Backend API**: `http://localhost:4000/api`
- **PostgreSQL Database**: `localhost:5432`

---

## Key Features Built & Verified

1. **SEAVAIG Corporate UI Shell & Dashboard**: 6 KPI cards, sparklines, Recharts line & donut payment charts, recent transactions feed.
2. **Farmer Management & Details Drawer**: Data table with village filter, slide-over detail drawer (`A Grade Supplier` badge, `₹18,500` outstanding balance), and Add Farmer modal.
3. **Purchases & Payments Portal**: Daily strawberry rate calculations, payout recording, and farmer ledger statement updates.
4. **Sales & Cold Storage Inventory**: Grade A/B/C inventory tracking, temperature readout (`2.4°C`), B2B customer sales, financial reports, expenses, audit logs.
5. **Full Marathi Language Support (`मराठी भाषा`)**: Native translations across all business terms (`शेतकरी`, `खरेदी व्यवस्थापन`, `पेमेंट व्यवस्थापन`).
6. **Direct PDF Printing & WhatsApp Receipt Sharing**: Thermal/standard PDF receipt printing and 1-click WhatsApp PDF link sharing for farmers & B2B clients.
7. **Dynamic Multi-Tenant Client Branding**: Custom Business Name (English & Marathi), Logo, Address, Tax GSTIN, Phone, and Subdomain Slug (`mahabaleshwar-agro.agri.app`).
8. **Pattern 1 Supabase RLS Security**: Row Level Security policies enforcing data isolation at the PostgreSQL database engine level.
9. **Multi-Company Farmer Switcher (Flutter App)**: Dropdown header (`कंपनी निवडा`) for rural farmers supplying multiple buyer companies.
