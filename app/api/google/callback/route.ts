import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  configured,
  cookieOptions,
  origin,
  seal,
} from "../../../../lib/server";
export async function GET(request: Request) {
  const jar = await cookies();
  const url = new URL(request.url);
  const state = url.searchParams.get("state") ?? "";
  const expected = jar.get("dayflow-oauth-state")?.value ?? "";
  jar.delete("dayflow-oauth-state");
  const fail = () => NextResponse.redirect(`${origin()}/?google=error`);
  if (
    !configured() ||
    !expected ||
    !/^[a-f0-9]{64}$/.test(state) ||
    state.length !== expected.length ||
    !timingSafeEqual(Buffer.from(state), Buffer.from(expected)) ||
    !url.searchParams.get("code")
  )
    return fail();
  try {
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: url.searchParams.get("code")!,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${origin()}/api/google/callback`,
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return fail();
    const data = await r.json();
    if (typeof data.access_token !== "string") return fail();
    const profileResponse = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: { Authorization: `Bearer ${data.access_token}` },
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!profileResponse.ok) return fail();
    const profile = await profileResponse.json();
    if (typeof profile.sub !== "string") return fail();
    const owner = createHash("sha256")
      .update(`dayflow:${process.env.GOOGLE_CLIENT_ID}:${profile.sub}`)
      .digest("hex");
    jar.set(
      "dayflow-google",
      seal({
        access: data.access_token,
        refresh: data.refresh_token,
        expires: Date.now() + data.expires_in * 1000,
        owner,
      }),
      cookieOptions,
    );
    return NextResponse.redirect(`${origin()}/?google=connected`);
  } catch {
    return fail();
  }
}
