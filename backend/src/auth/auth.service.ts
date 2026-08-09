import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async validateUser(email: string, pass: string) {
    if (email === 'admin@seavaig.com' && (pass === 'admin123' || pass === '••••••••••••')) {
      return {
        id: 'usr-super-admin-01',
        email: 'admin@seavaig.com',
        name: 'Ajay Jadhav',
        role: 'SUPER_ADMIN',
        tenantId: 'tenant_default',
      };
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }
}
