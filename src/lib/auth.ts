import { timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  COOKIE_NAME,
  createSessionToken,
  verifySessionToken,
  sessionCookieOptions,
} from "./session";

export { COOKIE_NAME, createSessionToken, verifySessionToken };

function getPassword(): string {
  const p = process.env.HOUSEHOLD_PASSWORD;
  if (!p) throw new Error("HOUSEHOLD_PASSWORD is not set");
  return p;
}

/** Timing-safe password compare (Node crypto) */
export function verifyPassword(input: string): boolean {
  const expected = getPassword();
  const a = Buffer.from(input, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) {
    const fake = Buffer.alloc(a.length);
    try {
      timingSafeEqual(a, fake);
    } catch {
      /* ignore */
    }
    return false;
  }
  return timingSafeEqual(a, b);
}

export async function isAuthenticated(): Promise<boolean> {
  const jar = await cookies();
  return verifySessionToken(jar.get(COOKIE_NAME)?.value);
}

export async function setSessionCookie(res: NextResponse, token: string) {
  const secure = process.env.NODE_ENV === "production";
  res.cookies.set(COOKIE_NAME, token, sessionCookieOptions(secure));
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
