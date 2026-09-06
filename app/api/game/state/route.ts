import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const room = request.nextUrl.searchParams.get("room");
  const supabase = getSupabaseAdmin();
  if (!room) return NextResponse.json({ error: "ROOM_REQUIRED" }, { status: 400 });
  if (!supabase) return NextResponse.json({ error: "GAME_NOT_CONFIGURED" }, { status: 503 });
  const { data, error } = await supabase.rpc("public_room_state", { p_code: room });
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
