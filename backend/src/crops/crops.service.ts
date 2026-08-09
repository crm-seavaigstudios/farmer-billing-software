import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCropDto } from './crops.controller';

@Injectable()
export class CropsService {
  constructor(private readonly prisma: PrismaService) {}

  private defaultCrops = [
    { id: 'crop-1', name: 'Strawberry (A Grade)', nameMr: 'स्ट्रॉबेरी (अ वर्ग)', category: 'BERRY', defaultRate: 280, unit: 'KG' },
    { id: 'crop-2', name: 'Strawberry (B Grade)', nameMr: 'स्ट्रॉबेरी (ब वर्ग)', category: 'BERRY', defaultRate: 180, unit: 'KG' },
    { id: 'crop-3', name: 'Strawberry (C Grade)', nameMr: 'स्ट्रॉबेरी (क वर्ग)', category: 'BERRY', defaultRate: 130, unit: 'KG' },
    { id: 'crop-4', name: 'Grapes (Sonaka)', nameMr: 'द्राक्षे (सोनाका)', category: 'FRUIT', defaultRate: 110, unit: 'KG' },
    { id: 'crop-5', name: 'Tomato (Hybrid)', nameMr: 'टोमॅटो (हायब्रिड)', category: 'VEGETABLE', defaultRate: 40, unit: 'KG' },
    { id: 'crop-6', name: 'Pomegranate (Bhagwa)', nameMr: 'डाळिंब (भगवा)', category: 'FRUIT', defaultRate: 140, unit: 'KG' },
  ];

  async findAll(tenantId: string) {
    try {
      const dbCrops = await this.prisma.crop.findMany({
        where: { OR: [{ tenantId }, { tenantId: 'tenant_default' }] },
        orderBy: { createdAt: 'desc' },
      });
      if (dbCrops.length === 0) {
        return this.defaultCrops;
      }
      return dbCrops;
    } catch {
      return this.defaultCrops;
    }
  }

  async create(dto: CreateCropDto) {
    const tenantId = dto.tenantId || 'tenant_default';
    try {
      return await this.prisma.crop.create({
        data: {
          name: dto.name,
          nameMr: dto.nameMr || dto.name,
          category: dto.category || 'CUSTOM',
          defaultRate: dto.defaultRate || 0,
          unit: dto.unit || 'KG',
          tenantId,
        },
      });
    } catch {
      const newCrop = {
        id: `crop-${Date.now()}`,
        name: dto.name,
        nameMr: dto.nameMr || dto.name,
        category: dto.category || 'CUSTOM',
        defaultRate: dto.defaultRate || 0,
        unit: dto.unit || 'KG',
      };
      this.defaultCrops.unshift(newCrop);
      return newCrop;
    }
  }

  async remove(id: string) {
    try {
      return await this.prisma.crop.delete({ where: { id } });
    } catch {
      this.defaultCrops = this.defaultCrops.filter((c) => c.id !== id);
      return { success: true };
    }
  }
}
