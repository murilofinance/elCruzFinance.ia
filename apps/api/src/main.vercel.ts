import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Request, Response } from 'express';
import { AppModule } from './app.module';
import { setupApp } from './setup';

const server = express();
let ready = false;

async function ensureApp() {
  if (ready) {
    return server;
  }
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
  );
  setupApp(app);
  await app.init();
  ready = true;
  return server;
}

export default async function handler(req: Request, res: Response) {
  const instance = await ensureApp();
  instance(req, res);
}
