import { randomBytes } from "crypto";

// Verification record for an artist MBID
interface VerificationRecord {
  code: string;
  expiresAt: number;
  attempts: number;
  verified: boolean;
  allowedUrls: string[]; // URLs from MusicBrainz that are valid for verification
}

// Rate limit record per IP
interface RateLimitRecord {
  count: number;
  windowStart: number;
}

const VERIFICATION_CODE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const MAX_ATTEMPTS_PER_CODE = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = 10;

// In-memory stores (production: use a database)
const verificationRecords = new Map<string, VerificationRecord>();
const rateLimitMap = new Map<string, RateLimitRecord>();

/**
 * Generate a cryptographically random verification code for an MBID.
 * The code is non-deterministic and tied to a server-side record.
 */
export function generateVerificationCode(
  mbid: string,
  allowedUrls: string[]
): { code: string; expiresAt: number } {
  const token = randomBytes(16).toString("hex");
  const code = `patron-verify-${token}`;
  const expiresAt = Date.now() + VERIFICATION_CODE_TTL_MS;

  verificationRecords.set(mbid, {
    code,
    expiresAt,
    attempts: 0,
    verified: false,
    allowedUrls,
  });

  return { code, expiresAt };
}

/**
 * Validate a verification attempt against the server-issued code.
 * Returns { valid, error } with a reason on failure.
 */
export function validateVerification(
  mbid: string,
  submittedCode: string,
  url: string
): { valid: boolean; error?: string } {
  const record = verificationRecords.get(mbid);

  if (!record) {
    return { valid: false, error: "No verification code issued for this artist. Request a code first." };
  }

  if (Date.now() > record.expiresAt) {
    verificationRecords.delete(mbid);
    return { valid: false, error: "Verification code has expired. Request a new code." };
  }

  if (record.attempts >= MAX_ATTEMPTS_PER_CODE) {
    verificationRecords.delete(mbid);
    return { valid: false, error: "Too many failed attempts. Request a new code." };
  }

  record.attempts++;

  if (record.code !== submittedCode) {
    return { valid: false, error: "Verification code does not match." };
  }

  // Validate URL is one of the artist's known URLs from MusicBrainz
  if (record.allowedUrls.length > 0) {
    const normalizedUrl = url.toLowerCase().replace(/\/+$/, "");
    const isAllowed = record.allowedUrls.some((allowed) => {
      const normalizedAllowed = allowed.toLowerCase().replace(/\/+$/, "");
      return normalizedUrl.startsWith(normalizedAllowed);
    });
    if (!isAllowed) {
      return {
        valid: false,
        error: "URL does not match any known URLs for this artist on MusicBrainz.",
      };
    }
  }

  return { valid: true };
}

/**
 * Mark an MBID as verified after successful code + URL check.
 */
export function markVerified(mbid: string): void {
  const record = verificationRecords.get(mbid);
  if (record) {
    record.verified = true;
  }
}

/**
 * Check if an MBID has been verified off-chain.
 */
export function isVerified(mbid: string): boolean {
  const record = verificationRecords.get(mbid);
  return record?.verified === true;
}

/**
 * Rate limit check. Returns true if the request should be allowed.
 */
export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

// Legacy export for backwards compatibility during migration
export const verifiedMbids = {
  add(mbid: string) {
    markVerified(mbid);
  },
  has(mbid: string) {
    return isVerified(mbid);
  },
};
