import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  institution?: string;

  @IsIn(['checking', 'savings', 'wallet'])
  kind!: 'checking' | 'savings' | 'wallet';

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentBalance!: number;
}

export class CreateCardDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  institution?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  creditLimit!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(31)
  closingDay!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(31)
  dueDay!: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(24)
  @ValidateNested({ each: true })
  @Type(() => CardInvoiceMonthDto)
  invoices?: CardInvoiceMonthDto[];
}

export class CardInvoiceMonthDto {
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  month!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;
}

export class CreateDebtDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  creditor!: string;

  @IsOptional()
  @IsIn(['loan', 'bill'])
  kind?: 'loan' | 'bill';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  principalReceived?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalToPay!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(360)
  installmentCount!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  installmentAmount!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(31)
  dueDay!: number;
}

export class AllocatePaymentDto {
  @IsOptional()
  @IsString()
  cardId?: string;

  @IsOptional()
  @IsString()
  debtId?: string;
}

export class CreateTransactionDto {
  @IsIn(['income', 'expense', 'transfer', 'card_payment', 'debt_payment'])
  type!: 'income' | 'expense' | 'transfer' | 'card_payment' | 'debt_payment';

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  date!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  description!: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  cardId?: string;

  @IsOptional()
  @IsString()
  debtId?: string;

  @IsOptional()
  @IsString()
  toAccountId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;
}

export class CreateInvestmentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  institution?: string;

  @IsIn(['fixed', 'funds', 'stocks', 'crypto', 'other'])
  kind!: 'fixed' | 'funds' | 'stocks' | 'crypto' | 'other';

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentValue!: number;
}

export class ConnectOpenFinanceDto {
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(80)
  clientId?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  clientSecret?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(80)
  itemId!: string;
}

export class SyncOpenFinanceDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  itemId?: string;
}
