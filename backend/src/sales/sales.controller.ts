import { Controller, Get, Post, Body } from '@nestjs/common';
import { SalesService } from './sales.service';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get('stats')
  getStats() {
    return this.salesService.getStats();
  }

  @Get()
  findAll() {
    return this.salesService.findAll();
  }

  @Post()
  create(@Body() body: any) {
    return this.salesService.create(body);
  }
}
