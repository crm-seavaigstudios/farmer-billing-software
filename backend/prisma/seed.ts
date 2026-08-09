import { PrismaClient, Role, SupplierGrade, PaymentMode } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting SEAVAIG Enterprise Database Seeding...');

  // 1. Seed Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@mahabaleshwaragro.com' },
    update: {},
    create: {
      email: 'admin@mahabaleshwaragro.com',
      password: 'hashedPasswordAdmin123',
      name: 'Ajay Jadhav',
      role: Role.ADMIN,
      tenantId: 'tenant_mahabaleshwar_agro',
    },
  });

  // 2. Seed Sample Farmers
  const farmer1 = await prisma.farmer.upsert({
    where: { farmerIdCode: 'FAR-10001' },
    update: {},
    create: {
      farmerIdCode: 'FAR-10001',
      name: 'Ramesh Patil',
      phone: '9823456789',
      village: 'Nandgaon',
      taluka: 'Nashik',
      district: 'Nashik',
      grade: SupplierGrade.A_GRADE,
      totalPurchase: 245600,
      totalPaid: 227100,
      outstandingAmount: 18500,
      tenantId: 'tenant_mahabaleshwar_agro',
    },
  });

  // 3. Seed Sample Purchase
  const purchase1 = await prisma.purchase.upsert({
    where: { purchaseNo: 'PUR-2026-1052' },
    update: {},
    create: {
      purchaseNo: 'PUR-2026-1052',
      farmerId: farmer1.id,
      totalWeight: 120,
      totalAmount: 33600,
      tenantId: 'tenant_mahabaleshwar_agro',
      items: {
        create: [
          {
            cropName: 'Strawberry (A Grade Export)',
            grade: SupplierGrade.A_GRADE,
            weightKg: 120,
            ratePerKg: 280,
            totalAmount: 33600,
          },
        ],
      },
    },
  });

  // 4. Seed Sample Payment
  await prisma.payment.upsert({
    where: { paymentNo: 'PAY-2026-0852' },
    update: {},
    create: {
      paymentNo: 'PAY-2026-0852',
      farmerId: farmer1.id,
      amount: 15000,
      paymentMode: PaymentMode.UPI,
      notes: 'UPI Disbursement via GPay',
      tenantId: 'tenant_mahabaleshwar_agro',
    },
  });

  console.log('✅ Supabase Multi-Tenant Database Seeded Successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
