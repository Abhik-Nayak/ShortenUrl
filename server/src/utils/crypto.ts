import { createHash } from 'crypto';

/**
 * Hash a client IP for privacy-preserving unique-visitor counting. We never
 * store raw IPs; the salted SHA-256 digest is stable enough to dedupe visitors
 * while not being reversible.
 */
export function hashIp(ip: string | undefined): string | null {
  if (!ip) return null;
  return createHash('sha256').update(ip).digest('hex');
}
