import { Controller, Post, Body, UnauthorizedException, Get, Request } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: any) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Get('profile')
  getProfile(@Request() req: any) {
    return {
      id: 'usr-super-admin-01',
      email: 'admin@seavaig.com',
      name: 'Ajay Jadhav',
      role: 'SUPER_ADMIN',
      tenantId: 'tenant_default',
    };
  }
}
