import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Request, Response } from 'express';
import { AppModule } from './app.module';
import { setupApp } from './setup';

const server = express();
let ready = false;
let bootError: string | null = null;

async function ensureApp() {
  if (bootError) {
    throw new Error(bootError);
  }
  if (ready) {
    return server;
  }
  try {
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(server),
    );
    setupApp(app);
    await app.init();
    ready = true;
    return server;
  } catch (error) {
    bootError = error instanceof Error ? error.stack ?? error.message : String(error);
    throw error;
  }
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

function sendError(res: Response, error: unknown): void {
  if (res.headersSent) {
    return;
  }
  res.statusCode = 500;
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    }),
  );
}

export default async function handler(req: Request, res: Response) {
  try {
    withApiPrefix(req);
    const instance = await ensureApp();
    instance(req, res);
  } catch (error) {
    sendError(res, error);
  }
}
