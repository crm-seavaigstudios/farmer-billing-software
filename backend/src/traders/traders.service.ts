import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TradersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    try {
      const traders = await this.prisma.trader.findMany({
        include: { purchases: true },
        orderBy: { name: 'asc' },
      });
      return traders;
    } catch (e) {
      console.error('Error fetching traders:', e);
      return [];
    }
  }

  async createTrader(dto: any) {
    const count = await this.prisma.trader.count();
    const traderCode = `TRD-${(101 + count).toString().padStart(3, '0')}`;
    return await this.prisma.trader.create({
      data: {
        traderCode,
        name: dto.name || 'Material Trader',
        businessName: dto.businessName || dto.name || 'Agency Supplies Co',
        phone: dto.phone || '0000000000',
        email: dto.email,
        gstNumber: dto.gstNumber,
        address: dto.address,
      },
    });
  }

  async findAllPurchases() {
    try {
      const purchases = await this.prisma.traderPurchase.findMany({
        include: { trader: true },
        orderBy: { date: 'desc' },
      });

      const totalPurchased = purchases.reduce((acc, p) => acc + p.totalAmount, 0);
      const totalPaid = purchases.reduce((acc, p) => acc + p.paidAmount, 0);
      const dueAmount = purchases.reduce((acc, p) => acc + p.dueAmount, 0);

      return {
        data: purchases.map((p) => ({
          id: p.billNo,
          traderName: p.trader?.name || 'Trader',
          businessName: p.trader?.businessName || '',
          itemName: p.itemName,
          category: p.category,
          quantity: `${p.quantity} ${p.unit}`,
          rate: `₹${p.rate}/${p.unit}`,
          totalAmount: `₹${p.totalAmount.toLocaleString('en-IN')}`,
          rawAmount: p.totalAmount,
          paidAmount: `₹${p.paidAmount.toLocaleString('en-IN')}`,
          dueAmount: `₹${p.dueAmount.toLocaleString('en-IN')}`,
          rawDue: p.dueAmount,
          paymentStatus: p.paymentStatus,
          vehicleNo: p.vehicleNo || 'N/A',
          date: new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        })),
        summary: {
          totalPurchased: `₹${totalPurchased.toLocaleString('en-IN')}`,
          totalPaid: `₹${totalPaid.toLocaleString('en-IN')}`,
          dueAmount: `₹${dueAmount.toLocaleString('en-IN')}`,
        },
      };
    } catch (e) {
      console.error('Error fetching trader purchases:', e);
      return { data: [], summary: { totalPurchased: '₹0', totalPaid: '₹0', dueAmount: '₹0' } };
    }
  }

  async createPurchase(dto: any) {
    const count = await this.prisma.traderPurchase.count();
    const billNo = `TBILL-2026-${(1001 + count).toString().padStart(4, '0')}`;
    const totalAmount = Number(dto.quantity || 1) * Number(dto.rate || 0);
    const paidAmount = Number(dto.paidAmount || 0);
    const dueAmount = totalAmount - paidAmount;
    const paymentStatus = dueAmount <= 0 ? 'PAID' : (paidAmount > 0 ? 'PARTIAL' : 'UNPAID');

    const purchase = await this.prisma.traderPurchase.create({
      data: {
        billNo,
        traderId: dto.traderId,
        itemName: dto.itemName || 'Crater / Supplies',
        category: dto.category || 'PACKAGING',
        quantity: Number(dto.quantity) || 1,
        unit: dto.unit || 'QTY',
        rate: Number(dto.rate) || 0,
        totalAmount,
        paidAmount,
        dueAmount,
        paymentStatus,
        vehicleNo: dto.vehicleNo,
        notes: dto.notes,
      },
    });

    // Update trader financials
    await this.prisma.trader.update({
      where: { id: dto.traderId },
      data: {
        totalPurchased: { increment: totalAmount },
        totalPaid: { increment: paidAmount },
        dueAmount: { increment: dueAmount },
      },
    });

    return purchase;
  }

  async updatePurchasePayment(id: string, dto: { amount: number; paymentMode?: string; notes?: string }) {
    const existing = await this.prisma.traderPurchase.findUnique({ where: { id } });
    if (!existing) return null;

    const newPaid = existing.paidAmount + Number(dto.amount);
    const newDue = Math.max(0, existing.totalAmount - newPaid);
    const newStatus = newDue <= 0 ? 'PAID' : 'PARTIAL';

    const updated = await this.prisma.traderPurchase.update({
      where: { id },
      data: {
        paidAmount: newPaid,
        dueAmount: newDue,
        paymentStatus: newStatus as any,
        notes: dto.notes ? `${existing.notes || ''} | Payout ₹${dto.amount} (${dto.paymentMode || 'CASH'})` : existing.notes,
      },
    });

    if (existing.traderId) {
      await this.prisma.trader.update({
        where: { id: existing.traderId },
        data: {
          totalPaid: { increment: Number(dto.amount) },
          dueAmount: { decrement: Number(dto.amount) },
        },
      });
    }

    return updated;
  }
}
