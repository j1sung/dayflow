import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { configured, cookieOptions, origin } from "../../../../lib/server";
export async function GET() {
  if (!configured())
    return Response.json(
      { error: "Google OAuth 환경 변수를 설정해 주세요." },
      { status: 503 },
    );
  const state = randomBytes(32).toString("hex");
  (await cookies()).set("dayflow-oauth-state", state, {
    ...cookieOptions,
    maxAge: 600,
  });
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${origin()}/api/google/callback`,
    response_type: "code",
    scope: "openid https://www.googleapis.com/auth/calendar.events.owned",
    access_type: "offline",
    prompt: "consent",
    state,
  }).toString();
  return NextResponse.redirect(url);
}
