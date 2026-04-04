import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const AUTH_COOKIE_NAME = "next-terminal-auth";
export const CWD_COOKIE_NAME = "next-terminal-cwd";
const AUTH_COOKIE_VALUE = "authorized-terminal-session";
const AUTH_PASSWORD = "passwordpasswordpassword1234password";

function safeEquals(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export async function isAuthenticated() {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value === AUTH_COOKIE_VALUE;
}

export function isPasswordValid(password: string) {
  return safeEquals(password, AUTH_PASSWORD);
}

export async function createAuthSession() {
  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE, {
    httpOnly: true,
    maxAge: 60 * 60 * 12,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearAuthSession() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  cookieStore.delete(CWD_COOKIE_NAME);
}

export async function getCurrentDirectory() {
  const cookieStore = await cookies();
  return cookieStore.get(CWD_COOKIE_NAME)?.value ?? process.cwd();
}

export async function setCurrentDirectory(directory: string) {
  const cookieStore = await cookies();

  cookieStore.set(CWD_COOKIE_NAME, directory, {
    httpOnly: true,
    maxAge: 60 * 60 * 12,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
