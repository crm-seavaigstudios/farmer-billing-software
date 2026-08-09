import { Controller, Get, Post, Body, UnauthorizedException } from '@nestjs/common';
import { DailyRatesService } from './daily-rates.service';

@Controller('daily-rates')
export class DailyRatesController {
  constructor(private readonly dailyRatesService: DailyRatesService) {}

  @Get()
  findAll() {
    return this.dailyRatesService.findAll();
  }

  @Post('verify-pin')
  verifyPin(@Body() body: { pin: string }) {
    if (body.pin === '1234') {
      return { success: true, token: 'secret-pin-granted' };
    }
    throw new UnauthorizedException('Invalid Secret Client PIN');
  }

  @Post()
  updateRate(@Body() body: any) {
    if (body.pin !== '1234') {
      throw new UnauthorizedException('Invalid Secret Client PIN');
    }
    return this.dailyRatesService.createOrUpdate(body);
  }
}
