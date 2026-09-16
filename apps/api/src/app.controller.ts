import { Controller, Get } from '@nestjs/common';
import { Public } from './auth/public.decorator';

@Controller()
export class AppController {
  @Public()
  @Get('health')
  health() {
    return {
      ok: true,
      service: 'elcruz-finance-api',
      firebase: Boolean(
        process.env.FIREBASE_PROJECT_ID &&
          process.env.FIREBASE_CLIENT_EMAIL &&
          process.env.FIREBASE_PRIVATE_KEY,
      ),
      pluggy: Boolean(
        process.env.PLUGGY_CLIENT_ID &&
          process.env.PLUGGY_CLIENT_SECRET &&
          process.env.PLUGGY_ITEM_ID,
      ),
      gemini: Boolean(process.env.GEMINI_API_KEY),
    };
  }
}
