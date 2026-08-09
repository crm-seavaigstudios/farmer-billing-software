import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DailyRatesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    try {
      const rates = await this.prisma.dailyCropRate.findMany({
        orderBy: { date: 'desc' },
      });
      if (rates.length === 0) {
        // Return default starting rate sheet
        return [
          { id: '1', cropName: 'Strawberry (A Grade)', grade: 'A_GRADE', unit: 'PER_KG', rate: 280, date: new Date().toISOString() },
          { id: '2', cropName: 'Strawberry (B Grade)', grade: 'B_GRADE', unit: 'PER_KG', rate: 180, date: new Date().toISOString() },
          { id: '3', cropName: 'Strawberry (C Grade)', grade: 'C_GRADE', unit: 'PER_KG', rate: 120, date: new Date().toISOString() },
          { id: '4', cropName: 'Grapes (Export)', grade: 'A_GRADE', unit: 'PER_TON', rate: 85000, date: new Date().toISOString() },
          { id: '5', cropName: 'Tomato (Local Crate)', grade: 'A_GRADE', unit: 'PER_CRATE', rate: 650, date: new Date().toISOString() },
        ];
      }
      return rates;
    } catch (e) {
      console.error('Error fetching daily rates:', e);
      return [];
    }
  }

  async createOrUpdate(dto: any) {
    return await this.prisma.dailyCropRate.create({
      data: {
        cropName: dto.cropName || 'Crop',
        grade: dto.grade || 'A_GRADE',
        unit: dto.unit || 'PER_KG',
        rate: Number(dto.rate) || 0,
        updatedBy: 'CLIENT_SECRET_PIN',
      },
    });
  }
}
