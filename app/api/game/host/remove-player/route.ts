import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { getHostControlKey, HOST_SESSION_COOKIE, isValidHostSession } from "@/lib/host-auth";
import { removalErrorStatus } from "@/lib/lobby-removal";

const schema = z.object({ room: z.string().regex(/^\d{6}$/), playerId: z.string().uuid() }).strict();

export async function POST(request: Request) {
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "INVALID_REMOVAL" }, { status: 400 });
  const session = (await cookies()).get(HOST_SESSION_COOKIE)?.value;
  const hostToken = getHostControlKey();
  if (!isValidHostSession(session) || !hostToken) return NextResponse.json({ error: "HOST_UNAUTHORIZED" }, { status: 403 });
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "GAME_NOT_CONFIGURED" }, { status: 503 });
  const { data, error } = await supabase.rpc("remove_lobby_player", {
    p_code: body.data.room, p_session_token: null, p_player_id: body.data.playerId, p_host_token: hostToken,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: removalErrorStatus(error.message) });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
