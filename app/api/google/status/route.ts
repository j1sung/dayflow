import { cookies } from "next/headers";
import { configured, googleSession, sameOrigin } from "../../../../lib/server";
export async function GET() {
  return Response.json(
    { configured: configured(), connected: !!(await googleSession()) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  (await cookies()).delete("dayflow-google");
  return Response.json({ ok: true });
}
