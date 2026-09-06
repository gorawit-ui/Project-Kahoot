import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const joinSchema = z.object({ room: z.string().regex(/^\d{6}$/), nickname: z.string().trim().min(1).max(24) });

export async function POST(request: Request) {
  const body = joinSchema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: "INVALID_JOIN" }, { status: 400 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "GAME_NOT_CONFIGURED" }, { status: 503 });
  const token = randomUUID();
  const { data, error } = await supabase.rpc("join_room", { p_code: body.data.room, p_nickname: body.data.nickname, p_session_token: token });
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  const response = NextResponse.json(data);
  response.cookies.set("jixgo_player_token", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
  return response;
}
