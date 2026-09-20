import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getHostControlKey, HOST_SESSION_COOKIE, isValidHostSession } from "@/lib/host-auth";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const room = request.nextUrl.searchParams.get("room")?.trim();
  const session = (await cookies()).get(HOST_SESSION_COOKIE)?.value;
  const hostKey = getHostControlKey();
  const supabase = getSupabaseAdmin();

  if (!room || !isValidHostSession(session) || !hostKey) {
    return NextResponse.json({ error: "HOST_UNAUTHORIZED" }, { status: 403 });
  }
  if (!supabase) return NextResponse.json({ error: "GAME_NOT_CONFIGURED" }, { status: 503 });

  try {
    // Host is authenticated before this point. Read the same safe public game state
    // Players receive, then add Host-only aggregate counts server-side. This avoids
    // coupling the dashboard to a separate migration-versioned RPC.
    const { data: state, error: stateError } = await supabase.rpc("public_room_state", { p_code: room });
    if (stateError) return NextResponse.json({ error: stateError.message }, { status: 404 });

    const { data: roomRow, error: roomError } = await supabase
      .from("rooms")
      .select("id, quiz_id, current_position")
      .eq("code", room)
      .maybeSingle();
    if (roomError || !roomRow) {
      return NextResponse.json({ error: roomError?.message ?? "ROOM_NOT_FOUND" }, { status: 404 });
    }

    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("nickname, total_score, joined_at")
      .eq("room_id", roomRow.id)
      .order("total_score", { ascending: false })
      .order("joined_at", { ascending: true });
    if (playersError) return NextResponse.json({ error: playersError.message }, { status: 500 });

    const { data: question, error: questionError } = await supabase
      .from("questions")
      .select("id")
      .eq("quiz_id", roomRow.quiz_id)
      .eq("position", roomRow.current_position)
      .maybeSingle();
    if (questionError) return NextResponse.json({ error: questionError.message }, { status: 500 });

    let answerCount = 0;
    if (question?.id) {
      const { count, error: answersError } = await supabase
        .from("answers")
        .select("*", { count: "exact", head: true })
        .eq("room_id", roomRow.id)
        .eq("question_id", question.id);
      if (answersError) return NextResponse.json({ error: answersError.message }, { status: 500 });
      answerCount = count ?? 0;
    }

    const readyCount =
      typeof state === "object" &&
      state !== null &&
      "room" in state &&
      typeof state.room === "object" &&
      state.room !== null &&
      "readyCount" in state.room &&
      typeof state.room.readyCount === "number"
        ? state.room.readyCount
        : 0;

    return NextResponse.json(
      {
        state,
        playerCount: players?.length ?? 0,
        readyCount,
        answerCount,
        leaderboard: (players ?? []).map(({ nickname, total_score }) => ({
          nickname,
          score: total_score,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : "HOST_STATE_UNEXPECTED";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
