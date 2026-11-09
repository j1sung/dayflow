-- Run once in your own Supabase project. No service-role key is needed in the app.
create table public.dayflow_plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 5000000),
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.dayflow_plans enable row level security;
create policy "Read own plan" on public.dayflow_plans for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own plan" on public.dayflow_plans for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own plan" on public.dayflow_plans for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.dayflow_plans from anon;
grant select, insert, update on public.dayflow_plans to authenticated;

-- Optimistic concurrency prevents another device's plan being silently overwritten.
create function public.save_dayflow_plan(new_payload jsonb, expected_revision integer)
returns integer language plpgsql security invoker set search_path = '' as $$
declare saved_revision integer;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if expected_revision = 0 then
    insert into public.dayflow_plans(user_id, payload) values (auth.uid(), new_payload)
      on conflict (user_id) do nothing returning revision into saved_revision;
  else
    update public.dayflow_plans set payload = new_payload, revision = revision + 1, updated_at = now()
      where user_id = auth.uid() and revision = expected_revision returning revision into saved_revision;
  end if;
  if saved_revision is null then raise exception 'CONFLICT: Load cloud plan first'; end if;
  return saved_revision;
end;
$$;
revoke all on function public.save_dayflow_plan(jsonb, integer) from public, anon;
grant execute on function public.save_dayflow_plan(jsonb, integer) to authenticated;
