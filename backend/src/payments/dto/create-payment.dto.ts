import { IsString, IsNotEmpty, IsNumber, IsEnum, Min, IsOptional } from 'class-validator';
import { PaymentMode, PaymentType } from '@prisma/client';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  farmerId: string;

  @IsOptional()
  @IsString()
  purchaseId?: string;

  @IsOptional()
  @IsEnum(PaymentType)
  paymentType?: PaymentType; // PURCHASE_SETTLEMENT | ADVANCE_PAYOUT | GENERAL_PAYOUT

  @IsNumber()
  @Min(1)
  amount: number;

  @IsEnum(PaymentMode)
  paymentMode: PaymentMode; // CASH | UPI | BANK_TRANSFER | CHEQUE

  @IsOptional()
  @IsString()
  notes?: string;
}
