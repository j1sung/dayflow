import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { cookies } from "next/headers";
export const cookieOptions = {
  httpOnly: true,
  secure: process.env.APP_URL?.startsWith("https://") ?? false,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
};
export function configured() {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.SESSION_SECRET &&
    process.env.SESSION_SECRET.length >= 32 &&
    process.env.APP_URL
  );
}
export function origin() {
  const url = new URL(process.env.APP_URL || "http://127.0.0.1:3000");
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:")
    throw Error("HTTPS APP_URL required");
  return url.origin;
}
export function sameOrigin(request: Request) {
  return request.headers.get("origin") === origin();
}
function key() {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)
    throw Error("SESSION_SECRET missing");
  return createHash("sha256").update(process.env.SESSION_SECRET).digest();
}
export function seal(value: unknown) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}
export function unseal<T>(value: string): T | null {
  try {
    const b = Buffer.from(value, "base64url");
    const decipher = createDecipheriv("aes-256-gcm", key(), b.subarray(0, 12));
    decipher.setAuthTag(b.subarray(12, 28));
    return JSON.parse(
      Buffer.concat([
        decipher.update(b.subarray(28)),
        decipher.final(),
      ]).toString(),
    );
  } catch {
    return null;
  }
}
export type GoogleSession = {
  access: string;
  refresh?: string;
  expires: number;
  owner: string;
};
export async function googleSession() {
  const jar = await cookies();
  const value = jar.get("dayflow-google")?.value;
  return value ? unseal<GoogleSession>(value) : null;
}
export async function googleAccess() {
  const session = await googleSession();
  if (!session) throw Error("Google 계정을 다시 연결해 주세요.");
  if (session.expires > Date.now() + 60000) return session;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: session.refresh ?? "",
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw Error("Google 연결이 만료되었습니다. 다시 연결해 주세요.");
  const data = await response.json();
  const updated = {
    ...session,
    access: data.access_token,
    expires: Date.now() + data.expires_in * 1000,
  };
  (await cookies()).set("dayflow-google", seal(updated), cookieOptions);
  return updated;
}
