import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  CreateAccountDto,
  CreateCardDto,
  CreateDebtDto,
  CreateInvestmentDto,
  AllocatePaymentDto,
  CreateTransactionDto,
  ConnectOpenFinanceDto,
  SyncOpenFinanceDto,
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

  @Get('investments')
  investments(@CurrentUser() user: DecodedIdToken) {
    return this.finance.listInvestments(user.uid);
  }

  @Post('investments')
  createInvestment(
    @CurrentUser() user: DecodedIdToken,
    @Body() body: CreateInvestmentDto,
  ) {
    return this.finance.createInvestment(user.uid, body);
  }

  @Post('connections')
  connectOpenFinance(
    @CurrentUser() user: DecodedIdToken,
    @Body() body: ConnectOpenFinanceDto,
  ) {
    return this.finance.connectOpenFinance(user.uid, body);
  }

  @Get('connections')
  connections(@CurrentUser() user: DecodedIdToken) {
    return this.finance.listConnections(user.uid);
  }

  @Post('connections/sync')
  syncOpenFinance(
    @CurrentUser() user: DecodedIdToken,
    @Body() body: SyncOpenFinanceDto = {},
  ) {
    return this.finance.syncOpenFinance(user.uid, body);
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

  @Post('transactions/:id/allocate')
  allocatePayment(
    @CurrentUser() user: DecodedIdToken,
    @Param('id') id: string,
    @Body() body: AllocatePaymentDto,
  ) {
    return this.finance.allocatePayment(user.uid, id, body);
  }

  @Get('safe-to-spend')
  safeToSpend(@CurrentUser() user: DecodedIdToken) {
    return this.finance.safeToSpend(user.uid);
  }
}
