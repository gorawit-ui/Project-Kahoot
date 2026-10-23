import { readFile } from 'node:fs/promises';

export const migrations = [
  '20260906_authoritative_game', '20260906_reveal_scoreboard_results',
  '20260906_player_readiness_and_transition', '20260906_host_monitor_and_rejoin',
  '20260906_reveal_distribution_q20_summary', '20260920_fix_q20_jsonb_index',
  '20260920_q20_120_seconds', '20260920_q20_accuracy_speed_scoring',
  '20261021150659_restrict_game_table_reads', '20261021151202_bind_answers_to_question',
  '20261022174111_index_player_session_lookup', '20261023081147_lobby_player_removal', '20261023085333_trim_bonus_answer_edges',
];
export async function installSchema(db) {
  await db.exec('create schema extensions; create extension pgcrypto with schema extensions; create role anon; create role authenticated; create role service_role bypassrls;');
  for (const name of migrations) {
    const sql = (await readFile(`supabase/migrations/${name}.sql`, 'utf8')).replace(/^alter publication supabase_realtime.*$/gm, '');
    await db.exec(sql);
  }
  await db.exec('grant usage on schema public,extensions to service_role,anon,authenticated; grant all on all tables in schema public to service_role;');
}

