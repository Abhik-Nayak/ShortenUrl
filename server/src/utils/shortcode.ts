import { randomInt } from 'crypto';

const BASE62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** Default short-code length (base62, 8 chars ≈ 218 trillion codes). */
export const SHORT_CODE_LENGTH = 8;

/** Generate a random base62 short code of the given length. */
export function generateShortCode(length: number = SHORT_CODE_LENGTH): string {
  let code = '';
  for (let i = 0; i < length; i += 1) {
    code += BASE62[randomInt(BASE62.length)];
  }
  return code;
}
