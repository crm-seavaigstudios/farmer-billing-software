import { Module } from '@nestjs/common';
import { DailyRatesService } from './daily-rates.service';
import { DailyRatesController } from './daily-rates.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DailyRatesController],
  providers: [DailyRatesService],
  exports: [DailyRatesService],
})
export class DailyRatesModule {}
