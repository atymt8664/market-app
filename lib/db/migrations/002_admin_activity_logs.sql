create table if not exists admin_activity_logs (
  id serial primary key,
  action text not null,
  actor_admin_id integer null,
  target_type text not null,
  target_id integer null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists admin_activity_logs_action_idx
  on admin_activity_logs(action);

create index if not exists admin_activity_logs_target_type_idx
  on admin_activity_logs(target_type);

create index if not exists admin_activity_logs_target_id_idx
  on admin_activity_logs(target_id);

create index if not exists admin_activity_logs_created_at_idx
  on admin_activity_logs(created_at desc);

create index if not exists admin_activity_logs_actor_admin_id_idx
  on admin_activity_logs(actor_admin_id);
