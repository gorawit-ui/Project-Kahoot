import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const answerSchema = z.object({ room: z.string().regex(/^\d{6}$/), questionId: z.string().uuid(), response: z.union([z.object({ option: z.string().min(1).max(1000) }).strict(), z.object({ answers: z.array(z.string().max(200)).length(10) }).strict()]) });

export async function POST(request: Request) {
  const body = answerSchema.safeParse(await request.json().catch(() => null));
  const token = (await cookies()).get("jixgo_player_token")?.value;
  const supabase = getSupabaseAdmin();
  if (!body.success || !token) return NextResponse.json({ error: "INVALID_ANSWER" }, { status: 400 });
  if (!supabase) return NextResponse.json({ error: "GAME_NOT_CONFIGURED" }, { status: 503 });
  const { data, error } = await supabase.rpc("submit_answer_for_question", { p_code: body.data.room, p_session_token: token, p_question_id: body.data.questionId, p_response: body.data.response });
  if (error) return NextResponse.json({ error: error.message }, { status: 409 });
  return NextResponse.json(data);
}
