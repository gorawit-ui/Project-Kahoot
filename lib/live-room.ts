import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export type LiveEvent =
  | { type: "player-joined"; playerId: string; nickname: string }
  | { type: "game-started"; questionIndex: number; startedAt: number; deadlineAt: number }
  | { type: "question-changed"; questionIndex: number; startedAt: number; deadlineAt: number }
  | { type: "game-paused" }
  | { type: "game-finished" }
  | { type: "player-answered"; playerId: string; nickname: string; questionIndex: number; selectedIndex: number; answeredAt: number };

export function getPlayerId() {
  if (typeof window === "undefined") return "server-preview";
  const key = "jixgo-player-id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const next = crypto.randomUUID();
  localStorage.setItem(key, next);
  return next;
}

export function openRoomChannel(roomCode: string, onEvent: (event: LiveEvent) => void) {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !roomCode) return null;
  const channel = supabase.channel(`jixgo-room-${roomCode}`);
  channel.on("broadcast", { event: "jixgo-event" }, ({ payload }) => onEvent(payload as LiveEvent));
  channel.subscribe();
  return channel;
}

export function sendRoomEvent(channel: RealtimeChannel | null, event: LiveEvent) {
  if (!channel) return;
  void channel.send({ type: "broadcast", event: "jixgo-event", payload: event });
}
