-- Game clients read sanitized RPC responses; server routes use service_role.
-- Table-wide public SELECT exposed host_token_hash and session_token_hash.
revoke select on table public.rooms, public.players from public, anon, authenticated;

-- Defense in depth: future SELECT grants must still have an explicit policy.
drop policy if exists "public read rooms" on public.rooms;
drop policy if exists "public read leaderboard" on public.players;

-- SECURITY DEFINER game RPCs and service_role grants are deliberately unchanged.
