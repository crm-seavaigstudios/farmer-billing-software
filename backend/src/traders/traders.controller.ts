import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { TradersService } from './traders.service';

@Controller('traders')
export class TradersController {
  constructor(private readonly tradersService: TradersService) {}

  @Get()
  findAll() {
    return this.tradersService.findAll();
  }

  @Post()
  createTrader(@Body() body: any) {
    return this.tradersService.createTrader(body);
  }

  @Get('purchases')
  findAllPurchases() {
    return this.tradersService.findAllPurchases();
  }

  @Post('purchases')
  createPurchase(@Body() body: any) {
    return this.tradersService.createPurchase(body);
  }

  @Patch('purchases/:id/pay')
  updatePurchasePayment(@Param('id') id: string, @Body() body: any) {
    return this.tradersService.updatePurchasePayment(id, body);
  }
}
