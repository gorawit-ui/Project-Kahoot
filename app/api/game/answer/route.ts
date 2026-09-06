import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const answerSchema = z.object({ room: z.string().regex(/^\d{6}$/), response: z.object({ option: z.string().optional(), answers: z.array(z.string()).optional() }) });

export async function POST(request: Request) {
  const body = answerSchema.safeParse(await request.json());
  const token = (await cookies()).get("jixgo_player_token")?.value;
  const supabase = getSupabaseAdmin();
  if (!body.success || !token) return NextResponse.json({ error: "INVALID_ANSWER" }, { status: 400 });
  if (!supabase) return NextResponse.json({ error: "GAME_NOT_CONFIGURED" }, { status: 503 });
  const { data, error } = await supabase.rpc("submit_answer", { p_code: body.data.room, p_session_token: token, p_response: body.data.response });
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json(data);
}
