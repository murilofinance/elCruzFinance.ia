import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { App } from 'firebase-admin/app';
import type { Auth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';

@Injectable()
export class FirebaseService {
  private app: App | undefined;
  private started = false;
  private authClient: Auth | undefined;
  private firestore: Firestore | undefined;

  constructor(private readonly config: ConfigService) {}

  get isReady(): boolean {
    return Boolean(this.projectId && this.clientEmail && this.privateKey);
  }

  get auth(): Auth {
    this.start();
    if (!this.authClient) {
      throw new Error('Firebase Auth indisponível');
    }
    return this.authClient;
  }

  get db(): Firestore {
    this.start();
    if (!this.firestore) {
      throw new Error('Firestore indisponível');
    }
    return this.firestore;
  }

  private get projectId(): string | undefined {
    return this.config.get<string>('FIREBASE_PROJECT_ID');
  }

  private get clientEmail(): string | undefined {
    return this.config.get<string>('FIREBASE_CLIENT_EMAIL');
  }

  private get privateKey(): string | undefined {
    return this.config
      .get<string>('FIREBASE_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n')
      .replace(/^"/, '')
      .replace(/"$/, '');
  }

  private start(): void {
    if (this.started) {
      return;
    }
    this.started = true;
    const projectId = this.projectId;
    const clientEmail = this.clientEmail;
    const privateKey = this.privateKey;
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error(
        'API sem credenciais Firebase. Configure FIREBASE_* na Vercel.',
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { cert, getApps, initializeApp } = require('firebase-admin/app') as typeof import('firebase-admin/app');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getAuth } = require('firebase-admin/auth') as typeof import('firebase-admin/auth');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getFirestore } = require('firebase-admin/firestore') as typeof import('firebase-admin/firestore');

    this.app =
      getApps()[0] ??
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    this.authClient = getAuth(this.app);
    this.firestore = getFirestore(this.app);
  }
}
