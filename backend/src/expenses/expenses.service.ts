import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    try {
      const expenses = await this.prisma.expense.findMany({
        orderBy: { date: 'desc' },
      });
      return expenses;
    } catch (e) {
      console.error('Error fetching expenses:', e);
      return [];
    }
  }

  async create(dto: any) {
    const count = await this.prisma.expense.count();
    const expenseNo = `EXP-${new Date().getFullYear()}-${(1001 + count).toString()}`;
    return await this.prisma.expense.create({
      data: {
        expenseNo,
        category: dto.category || 'OTHER',
        amount: dto.amount || 0,
        notes: dto.notes,
        paymentMode: dto.paymentMode || 'CASH',
      },
    });
  }
}
