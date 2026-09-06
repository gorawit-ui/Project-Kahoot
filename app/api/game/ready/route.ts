import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const readySchema = z.object({ room: z.string().regex(/^\d{6}$/) });

export async function POST(request: Request) {
  const body = readySchema.safeParse(await request.json());
  const supabase = getSupabaseAdmin();
  const token = (await cookies()).get("jixgo_player_token")?.value;

  if (!body.success) return NextResponse.json({ error: "INVALID_ROOM" }, { status: 400 });
  if (!token) return NextResponse.json({ error: "PLAYER_SESSION_REQUIRED" }, { status: 401 });
  if (!supabase) return NextResponse.json({ error: "GAME_NOT_CONFIGURED" }, { status: 503 });

  const { data, error } = await supabase.rpc("mark_player_ready", { p_code: body.data.room, p_session_token: token });
  if (error) return NextResponse.json({ error: error.message }, { status: error.message.includes("PLAYER_NOT_FOUND") ? 401 : 409 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
