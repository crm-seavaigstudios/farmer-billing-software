import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { SupplierGrade, FarmerStatus } from '@prisma/client';

export class CreateFarmerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  village: string;

  @IsString()
  @IsNotEmpty()
  taluka: string;

  @IsString()
  @IsNotEmpty()
  district: string;

  @IsOptional()
  @IsString()
  aadhaarNumber?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  ifscCode?: string;

  @IsOptional()
  @IsEnum(SupplierGrade)
  grade?: SupplierGrade;

  @IsOptional()
  @IsEnum(FarmerStatus)
  status?: FarmerStatus;
}
