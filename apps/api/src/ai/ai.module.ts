import { Module } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [FinanceModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
