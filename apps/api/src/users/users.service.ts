import { Injectable } from '@nestjs/common';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { FinanceService } from '../finance/finance.service';
import { FirebaseService } from '../firebase/firebase.service';

export type UserProfile = {
  uid: string;
  email: string | null;
  displayName: string | null;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly finance: FinanceService,
  ) {}

  async upsertFromToken(user: DecodedIdToken): Promise<UserProfile> {
    const ref = this.firebase.db.doc(`users/${user.uid}`);
    const now = new Date().toISOString();
    const existing = await ref.get();

    const payload = {
      email: user.email ?? null,
      displayName: user.name ?? null,
      updatedAt: now,
      ...(existing.exists ? {} : { createdAt: now }),
    };

    await ref.set(payload, { merge: true });
    await this.finance.seedCategories(user.uid);
    const saved = (await ref.get()).data() as Omit<UserProfile, 'uid'>;

    return {
      uid: user.uid,
      email: saved.email ?? null,
      displayName: saved.displayName ?? null,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
  }
}
