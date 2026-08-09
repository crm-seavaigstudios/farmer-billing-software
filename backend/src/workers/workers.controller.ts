import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { WorkersService } from './workers.service';

@Controller('workers')
export class WorkersController {
  constructor(private readonly workersService: WorkersService) {}

  @Get()
  findAll() {
    return this.workersService.findAll();
  }

  @Post()
  create(@Body() body: any) {
    return this.workersService.create(body);
  }

  @Post('attendance')
  recordAttendance(@Body() body: any) {
    return this.workersService.recordAttendance(body);
  }

  @Post('payment')
  recordPayment(@Body() body: any) {
    return this.workersService.recordPayment(body);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.workersService.getHistory(id);
  }
}
