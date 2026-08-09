import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WorkersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    try {
      const workers = await this.prisma.dailyWorker.findMany({
        include: {
          attendances: { orderBy: { date: 'desc' }, take: 5 },
          payments: { orderBy: { date: 'desc' }, take: 5 },
        },
        orderBy: { name: 'asc' },
      });

      const totalActive = workers.length;
      const totalEarned = workers.reduce((acc, w) => acc + (w.totalEarned || 0), 0);
      const totalPaid = workers.reduce((acc, w) => acc + (w.totalPaid || 0), 0);
      const outstandingBalance = workers.reduce((acc, w) => acc + (w.outstandingBalance || 0), 0);

      return {
        data: workers.map((w) => ({
          id: w.id,
          workerCode: w.workerCode,
          name: w.name,
          phone: w.phone,
          role: w.role,
          dailyRate: w.dailyRate,
          totalEarned: w.totalEarned,
          totalPaid: w.totalPaid,
          outstandingBalance: w.outstandingBalance,
          status: w.status,
          lastAttendance: w.attendances[0] || null,
        })),
        summary: {
          totalActive,
          totalEarned: `₹${totalEarned.toLocaleString('en-IN')}`,
          totalPaid: `₹${totalPaid.toLocaleString('en-IN')}`,
          outstandingBalance: `₹${outstandingBalance.toLocaleString('en-IN')}`,
        },
      };
    } catch (e) {
      console.error('Error fetching workers:', e);
      return { data: [], summary: { totalActive: 0, totalEarned: '₹0', totalPaid: '₹0', outstandingBalance: '₹0' } };
    }
  }

  async create(dto: any) {
    const count = await this.prisma.dailyWorker.count();
    const workerCode = `WRK-${(101 + count).toString().padStart(3, '0')}`;
    return await this.prisma.dailyWorker.create({
      data: {
        workerCode,
        name: dto.name || 'Daily Worker',
        phone: dto.phone || '0000000000',
        role: dto.role || 'LABOUR',
        dailyRate: Number(dto.dailyRate) || 500,
      },
    });
  }

  async recordAttendance(dto: any) {
    const worker = await this.prisma.dailyWorker.findUnique({ where: { id: dto.workerId } });
    if (!worker) throw new Error('Worker not found');

    const hours = Number(dto.hoursWorked) || 8;
    const rate = worker.dailyRate || 500;
    // Calculate base wage based on 8 hours standard
    const dailyWageAmount = (rate / 8) * hours;
    const overtimeAmount = Number(dto.overtimeAmount) || 0;
    const totalWageForDay = dailyWageAmount + overtimeAmount;

    const attendance = await this.prisma.workerAttendance.create({
      data: {
        workerId: dto.workerId,
        checkInTime: dto.checkInTime || '08:00 AM',
        checkOutTime: dto.checkOutTime || '05:00 PM',
        hoursWorked: hours,
        dailyWageAmount,
        overtimeAmount,
        totalWageForDay,
        status: dto.status || 'PRESENT',
        notes: dto.notes || '',
      },
    });

    // Update Worker balance
    await this.prisma.dailyWorker.update({
      where: { id: dto.workerId },
      data: {
        totalEarned: { increment: totalWageForDay },
        outstandingBalance: { increment: totalWageForDay },
      },
    });

    return attendance;
  }

  async recordPayment(dto: any) {
    const count = await this.prisma.workerPayment.count();
    const receiptNo = `WPAY-2026-${(1001 + count).toString().padStart(4, '0')}`;
    const amount = Number(dto.amount) || 0;

    const payment = await this.prisma.workerPayment.create({
      data: {
        receiptNo,
        workerId: dto.workerId,
        amount,
        paymentType: dto.paymentType || 'GENERAL_PAYOUT',
        paymentMode: dto.paymentMode || 'CASH',
        notes: dto.notes || 'Worker Wage Payout',
      },
    });

    // Update Worker balance
    await this.prisma.dailyWorker.update({
      where: { id: dto.workerId },
      data: {
        totalPaid: { increment: amount },
        outstandingBalance: { decrement: amount },
      },
    });

    return payment;
  }

  async getHistory(workerId: string) {
    const attendances = await this.prisma.workerAttendance.findMany({
      where: { workerId },
      orderBy: { date: 'desc' },
    });
    const payments = await this.prisma.workerPayment.findMany({
      where: { workerId },
      orderBy: { date: 'desc' },
    });
    return { attendances, payments };
  }
}
