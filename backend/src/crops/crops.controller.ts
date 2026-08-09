import { Controller, Get, Post, Body, Delete, Param, Query } from '@nestjs/common';
import { CropsService } from './crops.service';

export class CreateCropDto {
  name: string;
  nameMr?: string;
  category?: string;
  defaultRate?: number;
  unit?: string;
  tenantId?: string;
}

@Controller('crops')
export class CropsController {
  constructor(private readonly cropsService: CropsService) {}

  @Get()
  async findAll(@Query('tenantId') tenantId?: string) {
    return this.cropsService.findAll(tenantId || 'tenant_default');
  }

  @Post()
  async create(@Body() dto: CreateCropDto) {
    return this.cropsService.create(dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.cropsService.remove(id);
  }
}
