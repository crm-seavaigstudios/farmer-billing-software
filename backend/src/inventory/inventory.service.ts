import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getInventoryStatus() {
    try {
      const logs = await this.prisma.inventoryLog.findMany();
      
      let totalStockKg = 0;
      const gradesMap = new Map<string, { stockKg: number, grade: string }>();

      for (const log of logs) {
        const key = `${log.cropName} (${log.grade})`;
        if (!gradesMap.has(key)) {
          gradesMap.set(key, { stockKg: 0, grade: key });
        }
        const current = gradesMap.get(key)!;
        
        if (log.type === 'IN') {
          current.stockKg += log.quantityKg;
          totalStockKg += log.quantityKg;
        } else if (log.type === 'OUT') {
          current.stockKg -= log.quantityKg;
          totalStockKg -= log.quantityKg;
        }
      }

      const grades = Array.from(gradesMap.values()).map(g => ({
        grade: g.grade,
        stockKg: g.stockKg,
        rate: 0, // Placeholder
        val: '₹0', // Placeholder
        status: g.stockKg > 5000 ? 'Optimal' : (g.stockKg > 0 ? 'Low Stock Alert' : 'Out of Stock')
      }));

      const coldStorageCapacityKg = 50000;
      const utilization = ((totalStockKg / coldStorageCapacityKg) * 100).toFixed(1);

      return {
        totalStockKg,
        totalStockValue: '₹0', // Requires a pricing model
        coldStorageCapacityKg,
        capacityUtilization: `${utilization}%`,
        grades,
        spoilageRate: '0.0%',
        temperature: '2.4°C (Cold Room 1)',
      };
    } catch (e) {
      console.error('Error fetching inventory:', e);
      return {
        totalStockKg: 0,
        totalStockValue: '₹0',
        coldStorageCapacityKg: 50000,
        capacityUtilization: '0%',
        grades: [],
        spoilageRate: '0%',
        temperature: '2.4°C (Cold Room 1)',
      };
    }
  }
}
