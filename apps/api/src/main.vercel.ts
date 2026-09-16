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

function withApiPrefix(req: Request): void {
  const current = req.url ?? '/';
  const path = current.split('?')[0] ?? '/';
  if (path === '/api' || path.startsWith('/api/')) {
    return;
  }
  const query = current.includes('?') ? current.slice(current.indexOf('?')) : '';
  const prefixed =
    path === '/' ? '/api' : `/api${path.startsWith('/') ? path : `/${path}`}`;
  req.url = `${prefixed}${query}`;
}

export default async function handler(req: Request, res: Response) {
  withApiPrefix(req);
  const instance = await ensureApp();
  instance(req, res);
}
