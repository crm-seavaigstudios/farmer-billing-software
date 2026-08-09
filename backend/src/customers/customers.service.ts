import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    try {
      const customers = await this.prisma.customer.findMany({
        orderBy: { name: 'asc' },
      });
      return customers;
    } catch (e) {
      console.error('Error fetching customers:', e);
      return [];
    }
  }

  async create(dto: any) {
    const count = await this.prisma.customer.count();
    const customerIdCode = `CUST-${(1001 + count).toString()}`;
    return await this.prisma.customer.create({
      data: {
        customerIdCode,
        name: dto.name || 'New Customer',
        phone: dto.phone || '0000000000',
        email: dto.email,
        gstNumber: dto.gstNumber,
        address: dto.address,
        contactPerson: dto.contactPerson,
      },
    });
  }
}
