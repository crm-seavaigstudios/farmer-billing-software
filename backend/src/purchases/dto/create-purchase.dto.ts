import { IsString, IsNotEmpty, IsNumber, IsEnum, Min, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { SupplierGrade } from '@prisma/client';

export class PurchaseItemDto {
  @IsString()
  @IsNotEmpty()
  cropName: string; // e.g. Strawberry (A Grade)

  @IsEnum(SupplierGrade)
  grade: SupplierGrade;

  @IsNumber()
  @Min(0.1)
  weightKg: number;

  @IsNumber()
  @Min(1)
  ratePerKg: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsString()
  @IsOptional()
  packagingCategory?: string;
}

export class CreatePurchaseDto {
  @IsString()
  @IsNotEmpty()
  farmerId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];
}
