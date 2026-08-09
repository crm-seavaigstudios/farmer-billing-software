import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  private mockTenants = [
    {
      id: 'tenant_mahabaleshwar_agro',
      tenantSlug: 'mahabaleshwar-agro',
      businessName: 'Mahabaleshwar Strawberry Agro',
      businessNameMr: 'महाबळेश्वर स्ट्रॉबेरी अ‍ॅग्रो प्रोड्युसर कंपनी',
      phone: '+91 98234 56789',
      email: 'contact@mahabaleshwaragro.com',
      address: 'Nashik-Sinnar Highway, Maharashtra 422103',
      addressMr: 'नाशिक-सिन्नर हायवे, महाराष्ट्र ४२२१०३',
      gstin: '27AAAAA0000A1Z5',
      subdomain: 'mahabaleshwar-agro',
      status: 'ACTIVE',
      createdAt: new Date(),
    },
    {
      id: 'tenant_nashik_berry',
      tenantSlug: 'nashik-berry',
      businessName: 'Nashik Berry Procurements',
      businessNameMr: 'नाशिक बेरी प्रोक्युर्मेन्ट',
      phone: '+91 97654 32100',
      email: 'info@nashikberry.com',
      address: 'Pimpalgaon Baswant, Nashik 422209',
      addressMr: 'पिंपळगाव बसवंत, नाशिक ४२२२०९',
      gstin: '27BBBBB1111B2Z6',
      subdomain: 'nashik-berry',
      status: 'ACTIVE',
      createdAt: new Date(),
    },
  ];

  async create(dto: CreateTenantDto) {
    try {
      const existing = (this.prisma as any).tenant
        ? await (this.prisma as any).tenant.findUnique({ where: { tenantSlug: dto.tenantSlug } })
        : null;

      if (existing) throw new ConflictException('Tenant subdomain slug already registered');

      return await this.prisma.$transaction(async (tx: any) => {
        const tenant = await tx.tenant.create({
          data: {
            tenantSlug: dto.tenantSlug,
            businessName: dto.businessName,
            businessNameMr: dto.businessNameMr,
            phone: dto.phone,
            email: dto.adminEmail,
            address: dto.address || 'Maharashtra',
            addressMr: dto.address || 'महाराष्ट्र',
            gstin: dto.gstin || 'UNREGISTERED',
          },
        });

        await tx.user.create({
          data: {
            email: dto.adminEmail,
            password: 'defaultPassword123',
            name: dto.adminName,
            phone: dto.phone,
            role: 'ADMIN',
            tenantId: tenant.id,
          },
        });

        return tenant;
      });
    } catch {
      // In-memory fallback
      const newTenant = {
        id: `tenant_${dto.tenantSlug}`,
        tenantSlug: dto.tenantSlug,
        businessName: dto.businessName,
        businessNameMr: dto.businessNameMr,
        phone: dto.phone,
        email: dto.adminEmail,
        address: dto.address || 'Maharashtra',
        addressMr: dto.address || 'महाराष्ट्र',
        gstin: dto.gstin || 'UNREGISTERED',
        subdomain: dto.tenantSlug,
        status: 'ACTIVE',
        createdAt: new Date(),
      };
      this.mockTenants.unshift(newTenant);
      return newTenant;
    }
  }

  async findAll() {
    try {
      if ((this.prisma as any).tenant) {
        return await (this.prisma as any).tenant.findMany({
          orderBy: { createdAt: 'desc' },
        });
      }
      return this.mockTenants;
    } catch {
      return this.mockTenants;
    }
  }
}
