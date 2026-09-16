import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
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
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  currentInvoice?: number;
}

export class CreateDebtDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  creditor!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  remainingBalance!: number;

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
  categoryId?: string;
}
