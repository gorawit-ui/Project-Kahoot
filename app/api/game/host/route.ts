import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { isValidHostKey } from "@/lib/host-auth";

const commandSchema = z.object({ room: z.string().regex(/^\d{6}$/), position: z.number().int().min(1).max(20), status: z.enum(["lobby", "question", "reveal", "paused", "finished"]) });

export async function POST(request: Request) {
  const hostToken = request.headers.get("x-jixgo-host-token");
  const body = commandSchema.safeParse(await request.json());
  const supabase = getSupabaseAdmin();
  if (!body.success || !isValidHostKey(hostToken)) return NextResponse.json({ error: "HOST_UNAUTHORIZED" }, { status: 403 });
  if (!supabase) return NextResponse.json({ error: "GAME_NOT_CONFIGURED" }, { status: 503 });
  const { data, error } = await supabase.rpc("host_set_question", { p_code: body.data.room, p_host_token: hostToken, p_position: body.data.position, p_status: body.data.status });
  if (error) return NextResponse.json({ error: error.message }, { status: 403 });
  return NextResponse.json(data);
}
