import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { FarmersService } from './farmers.service';
import { CreateFarmerDto } from './dto/create-farmer.dto';
import { UpdateFarmerDto } from './dto/update-farmer.dto';
import { FarmerQueryDto } from './dto/farmer-query.dto';

@Controller('farmers')
export class FarmersController {
  constructor(private readonly farmersService: FarmersService) {}

  @Post()
  create(@Body() createFarmerDto: CreateFarmerDto) {
    return this.farmersService.create(createFarmerDto);
  }

  @Get('check-network')
  checkNetwork(@Query('phone') phone: string) {
    return this.farmersService.checkNetwork(phone);
  }

  @Post('import-from-network')
  importFromNetwork(@Body() body: any) {
    return this.farmersService.importFromNetwork(body);
  }

  @Post('material-purchase')
  createMaterialPurchase(@Body() body: any) {
    return this.farmersService.createMaterialPurchase(body);
  }

  @Get()
  findAll(@Query() query: FarmerQueryDto) {
    return this.farmersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.farmersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFarmerDto: UpdateFarmerDto) {
    return this.farmersService.update(id, updateFarmerDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.farmersService.remove(id);
  }
}
