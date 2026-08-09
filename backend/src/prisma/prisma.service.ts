import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    // Attempt DB connection gracefully
    try {
      await this.$connect();
    } catch (e) {
      console.warn('Prisma DB connection deferred:', e.message);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
