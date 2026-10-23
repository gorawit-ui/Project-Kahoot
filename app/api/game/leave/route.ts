import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { removalErrorStatus } from "@/lib/lobby-removal";

const schema = z.object({ room: z.string().regex(/^\d{6}$/) }).strict();

export async function POST(request: Request) {
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "INVALID_ROOM" }, { status: 400 });
  const token = (await cookies()).get("jixgo_player_token")?.value;
  if (!token) return NextResponse.json({ error: "PLAYER_SESSION_REQUIRED" }, { status: 401 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "GAME_NOT_CONFIGURED" }, { status: 503 });
  const { data, error } = await supabase.rpc("remove_lobby_player", {
    p_code: body.data.room, p_session_token: token, p_player_id: null, p_host_token: null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: removalErrorStatus(error.message) });
  // Preserve the cookie: the same browser may also have a player in another room.
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
