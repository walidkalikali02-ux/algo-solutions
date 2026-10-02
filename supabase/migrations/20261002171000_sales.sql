begin;
create table if not exists public.sales_leads (
 id uuid primary key default gen_random_uuid(),
 "requestId" uuid not null unique, locale text not null check(locale in ('ar','en')),
 goal text not null,service text not null default '',name text not null,company text not null default '',email text not null default '',phone text not null default '',sector text not null default '',role text not null default '',website text not null default '',note text not null default '',budget text not null default '',timeline text not null default '',type text not null default '',source text not null default '',
 score integer not null check(score between 0 and 100),reasons jsonb not null default '[]',
 stage text not null default 'new' check(stage in ('new','qualified','meeting','proposal','negotiation','won','lost')),
 next_action_at timestamptz default now()+interval '1 day',
 value numeric check(value>=0),cost numeric check(cost>=0),loss_reason text not null default '',sales_note text not null default '',version integer not null default 1,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index if not exists sales_leads_priority on public.sales_leads(stage,next_action_at,score desc);
create table if not exists public.sales_capture_limits(fingerprint text primary key,window_start timestamptz not null default now(),attempts integer not null default 0);
alter table public.sales_leads enable row level security;
alter table public.sales_capture_limits enable row level security;
revoke all on public.sales_leads,public.sales_capture_limits from anon,authenticated;
grant all on public.sales_leads,public.sales_capture_limits to service_role;
create or replace function public.capture_sales_lead(p_brief jsonb,p_score integer,p_reasons jsonb,p_fingerprint text)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare v_lead public.sales_leads;v_attempts integer;
begin
 -- Serialize retries for the same request before checking the unique constraint.
 perform pg_advisory_xact_lock(hashtextextended(p_brief->>'requestId',0));
 select * into v_lead from public.sales_leads where "requestId"=(p_brief->>'requestId')::uuid;
 if found then
  if v_lead.email=coalesce(p_brief->>'email','') and v_lead.phone=coalesce(p_brief->>'phone','') and v_lead.name=p_brief->>'name' then return jsonb_build_object('id',v_lead.id);end if;
  return jsonb_build_object('error','conflict');
 end if;
 insert into public.sales_capture_limits as l(fingerprint,attempts) values(p_fingerprint,1)
 on conflict(fingerprint) do update set attempts=case when l.window_start<now()-interval '1 hour' then 1 else l.attempts+1 end,window_start=case when l.window_start<now()-interval '1 hour' then now() else l.window_start end returning attempts into v_attempts;
 if v_attempts>10 then return jsonb_build_object('error','rate_limit');end if;
 delete from public.sales_capture_limits where window_start<now()-interval '2 days';
 insert into public.sales_leads("requestId",locale,goal,service,name,company,email,phone,sector,role,website,note,budget,timeline,type,source,score,reasons)
 values((p_brief->>'requestId')::uuid,p_brief->>'locale',p_brief->>'goal',p_brief->>'service',p_brief->>'name',p_brief->>'company',p_brief->>'email',p_brief->>'phone',p_brief->>'sector',p_brief->>'role',p_brief->>'website',p_brief->>'note',p_brief->>'budget',p_brief->>'timeline',p_brief->>'type',p_brief->>'source',p_score,p_reasons) returning * into v_lead;
 return jsonb_build_object('id',v_lead.id);
end $$;
revoke all on function public.capture_sales_lead(jsonb,integer,jsonb,text) from public,anon,authenticated;
grant execute on function public.capture_sales_lead(jsonb,integer,jsonb,text) to service_role;
commit;
