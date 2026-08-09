import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { FarmersModule } from './farmers/farmers.module';
import { PurchasesModule } from './purchases/purchases.module';
import { PaymentsModule } from './payments/payments.module';
import { SalesModule } from './sales/sales.module';
import { InventoryModule } from './inventory/inventory.module';
import { TenantsModule } from './tenants/tenants.module';
import { CropsModule } from './crops/crops.module';
import { CustomersModule } from './customers/customers.module';
import { ExpensesModule } from './expenses/expenses.module';
import { WorkersModule } from './workers/workers.module';
import { TradersModule } from './traders/traders.module';
import { DailyRatesModule } from './daily-rates/daily-rates.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    FarmersModule,
    PurchasesModule,
    PaymentsModule,
    SalesModule,
    InventoryModule,
    TenantsModule,
    CropsModule,
    CustomersModule,
    ExpensesModule,
    WorkersModule,
    TradersModule,
    DailyRatesModule,
    DashboardModule,
  ],
})
export class AppModule {}
