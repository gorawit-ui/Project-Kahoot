-- Read-only deployment verification. Expected hash_select=false for both client
-- roles, and server_select=true. Does not read any actual credential hashes.
select role_name, table_name,
  has_column_privilege(role_name, 'public.' || table_name,
    case when table_name = 'rooms' then 'host_token_hash' else 'session_token_hash' end,
    'SELECT') as hash_select,
  has_table_privilege('service_role', 'public.' || table_name, 'SELECT') as server_select
from unnest(array['anon', 'authenticated']) role_name
cross join unnest(array['rooms', 'players']) table_name;
