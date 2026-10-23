-- Lobby departure and Host roster removal, released with matching server routes.
-- Invoker privileges + service-role-only EXECUTE keep this behind server routes.
create or replace function public.remove_lobby_player(
  p_code text, p_session_token text, p_player_id uuid, p_host_token text
) returns jsonb language plpgsql security invoker
set search_path = public, extensions, pg_temp as $$
declare v_room public.rooms; v_player public.players; v_removed integer;
begin
  -- DELETE and Host's UPDATE of this row serialize against this lock. Once the
  -- game-start update commits, a waiting removal must recheck the new state.
  select * into v_room from public.rooms where code=upper(trim(p_code)) for update;
  if v_room.id is null then raise exception 'ROOM_NOT_FOUND'; end if;

  if p_player_id is not null then
    if p_session_token is not null or p_host_token is null then raise exception 'INVALID_REMOVAL'; end if;
    if v_room.host_token_hash is distinct from extensions.crypt(p_host_token,v_room.host_token_hash) then
      raise exception 'HOST_UNAUTHORIZED';
    end if;
    select * into v_player from public.players where id=p_player_id and room_id=v_room.id;
  else
    if p_session_token is null or p_host_token is not null then raise exception 'INVALID_REMOVAL'; end if;
    select * into v_player from public.find_player_by_session(v_room.id,p_session_token);
  end if;

  -- Also refuse a room put back into lobby after play, and guard pre-existing
  -- answers so the ON DELETE CASCADE cannot erase any gameplay history.
  if v_room.status <> 'lobby' or v_room.question_started_at is not null
    or exists(select 1 from public.answers where room_id=v_room.id)
    or exists(select 1 from public.players where room_id=v_room.id and total_score<>0) then
    raise exception 'LOBBY_CLOSED';
  end if;

  -- Repeated calls are successful no-ops if the first response was lost.
  if v_player.id is null then return jsonb_build_object('removed',false); end if;
  delete from public.players where id=v_player.id and room_id=v_room.id;
  get diagnostics v_removed = row_count;
  return jsonb_build_object('removed',v_removed=1);
end $$;
revoke all on function public.remove_lobby_player(text,text,uuid,text) from public,anon,authenticated;
grant execute on function public.remove_lobby_player(text,text,uuid,text) to service_role;
