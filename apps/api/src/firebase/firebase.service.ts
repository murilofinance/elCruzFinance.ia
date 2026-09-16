import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import { Firestore, getFirestore } from 'firebase-admin/firestore';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private app: App | undefined;
  private ready = false;
  auth!: Auth;
  db!: Firestore;

  constructor(private readonly config: ConfigService) {}

  get isReady(): boolean {
    return this.ready;
  }

  onModuleInit(): void {
    const projectId = this.config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.config
      .get<string>('FIREBASE_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n');

    if (!projectId || !clientEmail || !privateKey) {
      if (process.env.NODE_ENV !== 'test') {
        console.warn(
          'Firebase Admin sem credenciais. /api/me fica indisponível até definir FIREBASE_* na Vercel.',
        );
      }
      return;
    }

    this.app =
      getApps()[0] ??
      initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
      });
    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app);
    this.ready = true;
  }
}
