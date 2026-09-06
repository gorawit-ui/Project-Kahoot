import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getHostControlKey, HOST_SESSION_COOKIE, isValidHostSession } from "@/lib/host-auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const room = request.nextUrl.searchParams.get("room")?.trim();
  const session = (await cookies()).get(HOST_SESSION_COOKIE)?.value;
  const hostKey = getHostControlKey();
  const supabase = getSupabaseAdmin();
  if (!room || !isValidHostSession(session) || !hostKey) return NextResponse.json({ error: "HOST_UNAUTHORIZED" }, { status: 403 });
  if (!supabase) return NextResponse.json({ error: "GAME_NOT_CONFIGURED" }, { status: 503 });
  const { data, error } = await supabase.rpc("host_room_state", { p_code: room, p_host_token: hostKey });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
