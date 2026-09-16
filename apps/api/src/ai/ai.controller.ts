import { Body, Controller, Get, Post } from '@nestjs/common';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { CurrentUser } from '../auth/current-user.decorator';
import { AiChatDto } from './ai.dto';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Get('projections')
  projections(@CurrentUser() user: DecodedIdToken) {
    return this.ai.projections(user.uid);
  }

  @Post('chat')
  chat(@CurrentUser() user: DecodedIdToken, @Body() body: AiChatDto) {
    return this.ai.chat(user.uid, body);
  }
}
