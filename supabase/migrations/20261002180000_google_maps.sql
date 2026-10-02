begin;
-- Durable provider data is limited to the Place ID. Everything else is our own workflow metadata.
create table if not exists public.sales_maps_prospects (
 place_id text primary key check(place_id ~ '^[A-Za-z0-9_-]{10,255}$'),
 service text not null check(service in ('website','system','store','social','full','unsure')),
 notes text not null default '' check(length(notes)<=3000),
 status text not null default 'new' check(status in ('new','reviewing','contacted','not_fit')),
 next_action_at timestamptz,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table if not exists public.sales_maps_usage(day date primary key,calls integer not null default 0);
alter table public.sales_maps_prospects enable row level security;
alter table public.sales_maps_usage enable row level security;
revoke all on public.sales_maps_prospects,public.sales_maps_usage from anon,authenticated;
grant all on public.sales_maps_prospects,public.sales_maps_usage to service_role;
create or replace function public.consume_sales_maps_quota(p_limit integer)
returns boolean language plpgsql security invoker set search_path=public as $$
declare total integer;
begin
 if p_limit<1 or p_limit>500 then raise exception 'Invalid limit';end if;
 insert into public.sales_maps_usage as usage(day,calls) values((now() at time zone 'UTC')::date,1)
 on conflict(day) do update set calls=least(usage.calls+1,p_limit+1) returning calls into total;
 delete from public.sales_maps_usage where day<(now() at time zone 'UTC')::date-90;
 return total<=p_limit;
end $$;
revoke all on function public.consume_sales_maps_quota(integer) from public,anon,authenticated;
grant execute on function public.consume_sales_maps_quota(integer) to service_role;
commit;
