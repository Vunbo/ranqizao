import { randomBytes, randomInt } from 'crypto';
import type { AuthUser } from '../../shared/auth';
import type { UserRow } from './auth.types';

export function normalizeEmail(value: string) {
  return String(value || '').trim().toLowerCase();
}

export function normalizePhone(value: string) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/-/g, '');
}

export function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export function readCandidateString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string') {
      const normalized = value.trim();
      if (normalized) {
        return normalized;
      }
    }
  }

  return '';
}

export function createShortUid() {
  return randomBytes(4).toString('hex');
}

export function createPhoneCode() {
  return String(randomInt(100000, 1000000));
}

export function toAuthUser(user: UserRow): AuthUser {
  return {
    userId: user.id,
    uid: user.short_uid,
    email: user.primary_email || '',
    displayName: user.display_name,
    photoURL: user.photo_url,
  };
}
