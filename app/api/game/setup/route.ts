import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sampleQuestions } from "@/data/questions";
import { getHostControlKey, HOST_SESSION_COOKIE, isValidHostSession } from "@/lib/host-auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const QUIZ_TITLE = "JIXGO Magical 24";

export async function POST(request: Request) {
  const session = (await cookies()).get(HOST_SESSION_COOKIE)?.value;
  const hostKey = getHostControlKey();
  const supabase = getSupabaseAdmin();
  if (!isValidHostSession(session) || !hostKey) return NextResponse.json({ error: "HOST_UNAUTHORIZED" }, { status: 403 });
  if (!supabase) return NextResponse.json({ error: "GAME_NOT_CONFIGURED" }, { status: 503 });

  const { data: existingQuiz, error: readQuizError } = await supabase.from("quizzes").select("id").eq("title", QUIZ_TITLE).maybeSingle();
  if (readQuizError) return NextResponse.json({ error: readQuizError.message }, { status: 500 });
  const { data: quiz, error: quizError } = existingQuiz ? { data: existingQuiz, error: null } : await supabase.from("quizzes").insert({ title: QUIZ_TITLE }).select("id").single();
  if (quizError || !quiz) return NextResponse.json({ error: quizError?.message ?? "QUIZ_CREATE_FAILED" }, { status: 500 });

  const rows = sampleQuestions.map((question) => question.kind === "choice" ? ({
    quiz_id: quiz.id, position: question.id, kind: question.kind, prompt: question.prompt, media: question.media,
    options: question.choices, time_limit_seconds: question.timeSeconds, correct_answer: { option: question.answer },
  }) : ({
    quiz_id: quiz.id, position: question.id, kind: question.kind, prompt: question.prompt, media: {},
    options: question.bonusEntries.map((entry) => ({ id: entry.id, prompt: entry.prompt })), time_limit_seconds: question.timeSeconds,
    correct_answer: { answers: question.bonusEntries.map((entry) => entry.answer) },
  }));
  const { error: questionError } = await supabase.from("questions").upsert(rows, { onConflict: "quiz_id,position" });
  if (questionError) return NextResponse.json({ error: questionError.message }, { status: 500 });

  const code = "142426";
  const { error: roomError } = await supabase.rpc("initialize_game_room", { p_quiz_id: quiz.id, p_code: code, p_host_token: hostKey });
  if (roomError) return NextResponse.json({ error: roomError.message }, { status: 500 });
  return NextResponse.json({ ok: true, room: code, questionCount: rows.length });
}
