import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Establish the browser identity before creating a player. If the subsequent
// Join response is lost, retrying still carries the same opaque identity.
export async function GET() {
  const token = (await cookies()).get("jixgo_player_token")?.value ?? randomUUID();
  const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set("jixgo_player_token", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
  return response;
}
