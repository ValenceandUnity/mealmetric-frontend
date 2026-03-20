import "server-only";

import crypto from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import type { SessionPayload, SessionUser, UserRole } from "@/lib/types/api";

const SESSION_COOKIE_NAME = "mealmetric_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;
const ENCRYPTION_VERSION = "v1";
const ALLOWED_ROLES: ReadonlySet<UserRole> = new Set(["client", "pt", "admin", "vendor"]);

type EncryptedSessionEnvelope = {
  v: 1;
  iat: number;
  exp: number;
  data: SessionPayload;
};

export class SessionError extends Error {
  readonly code: "unauthenticated" | "forbidden";

  constructor(code: "unauthenticated" | "forbidden") {
    super(code);
    this.code = code;
  }
}

function getSessionSecret(): string {
  const explicitSecret = process.env.SESSION_SECRET;
  if (explicitSecret) {
    return explicitSecret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production.");
  }

  const fallbackSecret = process.env.BFF_KEY;
  if (fallbackSecret) {
    return fallbackSecret;
  }

  return "dev-session-secret";
}

function getEncryptionKey(): Buffer {
  return crypto.createHash("sha256").update(getSessionSecret(), "utf8").digest();
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && ALLOWED_ROLES.has(value as UserRole);
}

function isSessionUser(value: unknown): value is SessionUser {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    isNonEmptyString(candidate.id) &&
    isNonEmptyString(candidate.email) &&
    isUserRole(candidate.role)
  );
}

function isSessionPayload(value: unknown): value is SessionPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return isNonEmptyString(candidate.accessToken) && isSessionUser(candidate.user);
}

function isEncryptedEnvelope(value: unknown): value is EncryptedSessionEnvelope {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    candidate.v === 1 &&
    typeof candidate.iat === "number" &&
    typeof candidate.exp === "number" &&
    isSessionPayload(candidate.data)
  );
}

function encryptSessionEnvelope(envelope: EncryptedSessionEnvelope): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const plaintext = JSON.stringify(envelope);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTION_VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

function decryptSessionEnvelope(value: string): EncryptedSessionEnvelope | null {
  const [version, ivPart, authTagPart, ciphertextPart] = value.split(".");

  if (
    version !== ENCRYPTION_VERSION ||
    !isNonEmptyString(ivPart) ||
    !isNonEmptyString(authTagPart) ||
    !isNonEmptyString(ciphertextPart)
  ) {
    return null;
  }

  try {
    const iv = Buffer.from(ivPart, "base64url");
    const authTag = Buffer.from(authTagPart, "base64url");
    const ciphertext = Buffer.from(ciphertextPart, "base64url");
    const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), iv);
    decipher.setAuthTag(authTag);

    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
      "utf8",
    );
    const parsed = JSON.parse(plaintext) as unknown;

    if (!isEncryptedEnvelope(parsed)) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    if (parsed.exp <= now) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function buildSessionEnvelope(session: SessionPayload): EncryptedSessionEnvelope {
  const now = Math.floor(Date.now() / 1000);

  return {
    v: 1,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
    data: session,
  };
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!raw) {
    return null;
  }

  const envelope = decryptSessionEnvelope(raw);
  return envelope?.data ?? null;
}

export async function requireSession(expectedRole?: UserRole): Promise<SessionPayload> {
  const session = await getSession();

  if (!session) {
    throw new SessionError("unauthenticated");
  }

  if (expectedRole && session.user.role !== expectedRole) {
    throw new SessionError("forbidden");
  }

  return session;
}

export function writeSessionCookie(response: NextResponse, session: SessionPayload): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: encryptSessionEnvelope(buildSessionEnvelope(session)),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
