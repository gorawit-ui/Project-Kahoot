import { NextResponse } from "next/server";
import { z } from "zod";
import { isValidHostKey } from "@/lib/host-auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const resetSchema = z.object({ room: z.literal("142426") });

// The reset endpoint is intentionally limited to the named test room. Production rooms
// remain immutable records, while this room can be reused safely during UAT.
export async function POST(request: Request) {
  const hostKey = request.headers.get("x-jixgo-host-token");
  const body = resetSchema.safeParse(await request.json());
  const supabase = getSupabaseAdmin();
  if (!body.success || !isValidHostKey(hostKey)) return NextResponse.json({ error: "HOST_UNAUTHORIZED" }, { status: 403 });
  if (!supabase) return NextResponse.json({ error: "GAME_NOT_CONFIGURED" }, { status: 503 });

  // Re-use the protected RPC so the provided Host key is verified against this room.
  const { error: authorizationError } = await supabase.rpc("host_room_state", { p_code: body.data.room, p_host_token: hostKey });
  if (authorizationError) return NextResponse.json({ error: "HOST_UNAUTHORIZED" }, { status: 403 });

  const { data: room, error: roomError } = await supabase.from("rooms").select("id").eq("code", body.data.room).single();
  if (roomError || !room) return NextResponse.json({ error: "ROOM_NOT_FOUND" }, { status: 404 });
  const { error: playerError } = await supabase.from("players").delete().eq("room_id", room.id);
  if (playerError) return NextResponse.json({ error: playerError.message }, { status: 500 });
  const { error: resetError } = await supabase.from("rooms").update({ status: "lobby", current_position: 1, question_started_at: null, question_deadline_at: null }).eq("id", room.id);
  if (resetError) return NextResponse.json({ error: resetError.message }, { status: 500 });
  return NextResponse.json({ ok: true, room: body.data.room, status: "lobby" });
}
