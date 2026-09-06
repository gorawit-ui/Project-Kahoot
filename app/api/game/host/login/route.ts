import { NextResponse } from "next/server";
import { z } from "zod";
import { createHostSession, HOST_SESSION_COOKIE, isValidHostKey } from "@/lib/host-auth";

const loginSchema = z.object({ hostKey: z.string().min(1) });

export async function POST(request: Request) {
  const body = loginSchema.safeParse(await request.json());
  if (!body.success || !isValidHostKey(body.data.hostKey)) return NextResponse.json({ error: "HOST_UNAUTHORIZED" }, { status: 403 });
  const session = createHostSession();
  if (!session) return NextResponse.json({ error: "GAME_NOT_CONFIGURED" }, { status: 503 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(HOST_SESSION_COOKIE, session, { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
  return response;
}
