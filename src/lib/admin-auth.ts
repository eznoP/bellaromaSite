import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export const ADMIN_COOKIE_NAME = "bellaroma_admin_session";
export const ADMIN_SESSION_SECONDS = 60 * 60 * 8;

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD?.trim() || "";
}

function getSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET?.trim() || "";
}

function hash(value: string) {
  return createHash("sha256").update(value).digest();
}

function signaturesMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function sign(expiresAt: string) {
  return createHmac("sha256", getSessionSecret()).update(expiresAt).digest("base64url");
}

export function isAdminConfigured() {
  return Boolean(getAdminPassword() && getSessionSecret().length >= 32);
}

export function verifyAdminPassword(password: string) {
  const configuredPassword = getAdminPassword();
  if (!configuredPassword) return false;
  return timingSafeEqual(hash(password), hash(configuredPassword));
}

export function createAdminSessionToken() {
  const expiresAt = String(Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS);
  return `${expiresAt}.${sign(expiresAt)}`;
}

export function verifyAdminSessionToken(token?: string) {
  if (!token || !isAdminConfigured()) return false;
  const [expiresAt, signature, ...remainder] = token.split(".");
  if (!expiresAt || !signature || remainder.length > 0) return false;
  if (!/^\d+$/.test(expiresAt) || Number(expiresAt) <= Math.floor(Date.now() / 1000)) {
    return false;
  }
  return signaturesMatch(signature, sign(expiresAt));
}

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return verifyAdminSessionToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value);
}

export function isAdminRequestAuthenticated(request: NextRequest) {
  return verifyAdminSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
}

export function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const originUrl = new URL(origin);
      const requestHost = request.headers.get("x-forwarded-host") || request.headers.get("host");
      const requestProtocol = request.headers.get("x-forwarded-proto") || request.nextUrl.protocol.replace(":", "");
      return originUrl.host === requestHost && originUrl.protocol === `${requestProtocol}:`;
    } catch {
      return false;
    }
  }
  return request.headers.get("sec-fetch-site") !== "cross-site";
}
