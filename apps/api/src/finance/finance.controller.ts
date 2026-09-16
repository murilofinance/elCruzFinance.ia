import { Body, Controller, Get, Post } from '@nestjs/common';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  CreateAccountDto,
  CreateCardDto,
  CreateDebtDto,
  CreateTransactionDto,
} from './finance.dto';
import { FinanceService } from './finance.service';

@Controller()
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('categories')
  categories(@CurrentUser() user: DecodedIdToken) {
    return this.finance.listCategories(user.uid);
  }

  @Get('accounts')
  accounts(@CurrentUser() user: DecodedIdToken) {
    return this.finance.listAccounts(user.uid);
  }

  @Post('accounts')
  createAccount(
    @CurrentUser() user: DecodedIdToken,
    @Body() body: CreateAccountDto,
  ) {
    return this.finance.createAccount(user.uid, body);
  }

  @Get('cards')
  cards(@CurrentUser() user: DecodedIdToken) {
    return this.finance.listCards(user.uid);
  }

  @Post('cards')
  createCard(@CurrentUser() user: DecodedIdToken, @Body() body: CreateCardDto) {
    return this.finance.createCard(user.uid, body);
  }

  @Get('debts')
  debts(@CurrentUser() user: DecodedIdToken) {
    return this.finance.listDebts(user.uid);
  }

  @Post('debts')
  createDebt(@CurrentUser() user: DecodedIdToken, @Body() body: CreateDebtDto) {
    return this.finance.createDebt(user.uid, body);
  }

  @Get('transactions')
  transactions(@CurrentUser() user: DecodedIdToken) {
    return this.finance.listTransactions(user.uid);
  }

  @Post('transactions')
  createTransaction(
    @CurrentUser() user: DecodedIdToken,
    @Body() body: CreateTransactionDto,
  ) {
    return this.finance.createTransaction(user.uid, body);
  }

  @Get('safe-to-spend')
  safeToSpend(@CurrentUser() user: DecodedIdToken) {
    return this.finance.safeToSpend(user.uid);
  }
}
