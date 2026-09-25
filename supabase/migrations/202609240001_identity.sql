-- Identity and persistence foundation. No users, passwords, tokens or live connections are seeded.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '' check (length(display_name)<=120), avatar_url text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.organizations (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 120),
 slug text not null unique check(slug ~ '^[a-z0-9][a-z0-9-]{2,79}$'),
 created_by uuid not null references auth.users(id), policy_revision integer not null default 1 check(policy_revision>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.organization_members (
 organization_id uuid not null references public.organizations(id), user_id uuid not null references auth.users(id),
 role text not null check(role in ('owner','admin','member','viewer')), created_at timestamptz not null default now(),
 primary key(organization_id,user_id)
);
create index organization_members_user on public.organization_members(user_id,organization_id);
create table public.businesses (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 name text not null check(length(name) between 1 and 120), business_type text not null check(business_type in ('ecommerce','hospitality','restaurant','agency','other')),
 status text not null default 'active' check(status in ('active','archived')), country text check(country ~ '^[A-Z]{2}$'),
 currency text not null default 'EUR' check(currency ~ '^[A-Z]{3}$'), timezone text not null default 'UTC',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,id)
);
create table public.integration_connections (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), business_id uuid not null,
 provider text not null check(provider in ('shopify','woocommerce','meta_ads','tiktok_ads','google_ads','email')),
 external_account_identifier text, display_name text not null, status text not null default 'not_connected' check(status in ('not_connected','unavailable','revoked')),
 granted_capabilities text[] not null default '{}', credential_reference uuid check(credential_reference is null), last_sync_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(organization_id,business_id) references public.businesses(organization_id,id), unique(organization_id,business_id,provider)
);
create table public.provider_connections (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id),
 provider text not null check(provider in ('anti-nerd','openai','anthropic','google','mock')),
 status text not null default 'not_connected' check(status in ('not_connected','unavailable','revoked')),
 credential_reference uuid check(credential_reference is null),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id,provider)
);
create table public.organization_policies (
 organization_id uuid not null references public.organizations(id), capability text not null check(capability in ('store.read','store.write','store.publish','products.read','products.write','products.price.write','products.delete','orders.read','orders.write','orders.refund','customers.read','inventory.read','inventory.write','discounts.read','discounts.write','fulfillment.read','fulfillment.write')),
 mode text not null check(mode in ('DENIED','READ_ONLY','ASK_FIRST','AUTOMATIC_WITH_LIMITS','AUTOMATIC')),
 limits jsonb, revision integer not null check(revision>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), primary key(organization_id,capability),
 check(limits is null or (jsonb_typeof(limits)='object' and length(limits::text)<1000))
);
create table public.actions (
 id uuid primary key, organization_id uuid not null references public.organizations(id), business_id uuid,
 actor_id uuid not null references auth.users(id), agent text not null, provider text not null check(provider='mock'),
 tool text not null, resource_type text not null, resource_id text not null, proposal jsonb not null,
 proposal_fingerprint text not null check(proposal_fingerprint ~ '^[a-f0-9]{64}$'), reason text not null check(length(reason)<=1000),
 confidence double precision not null check(confidence between 0 and 1),
 status text not null default 'proposed' check(status in ('proposed','awaiting_approval','started','succeeded','failed','denied','not_implemented','rejected')),
 policy_revision integer, receipt jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(organization_id,business_id) references public.businesses(organization_id,id),
 foreign key(organization_id,actor_id) references public.organization_members(organization_id,user_id),
 unique(organization_id,id), unique(organization_id,id,proposal_fingerprint), check(jsonb_typeof(proposal)='object' and length(proposal::text)<=10000)
);
create table public.approvals (
 id uuid primary key, organization_id uuid not null references public.organizations(id), action_id uuid not null,
 proposal_fingerprint text not null, policy_revision integer not null, expires_at timestamptz not null,
 approved_by uuid references auth.users(id), rejected_by uuid references auth.users(id), consumed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(action_id),
 foreign key(organization_id,action_id,proposal_fingerprint) references public.actions(organization_id,id,proposal_fingerprint),
 check(not(approved_by is not null and rejected_by is not null)), check((consumed_at is null) = (approved_by is null and rejected_by is null))
);
create table public.audit_events (
 id uuid primary key, organization_id uuid not null references public.organizations(id), action_id uuid not null, actor_id uuid not null references auth.users(id),
 agent text not null, provider text not null check(provider='mock'), action_type text not null, resource text not null,
 reason text not null, confidence double precision not null check(confidence between 0 and 1), policy_decision jsonb not null,
 change_parameters jsonb not null, result text not null, source text not null check(source='mock'), rollback_available boolean not null default false check(not rollback_available),
 approved_by uuid references auth.users(id), requested_at timestamptz not null, executed_at timestamptz, created_at timestamptz not null default now(),
 foreign key(organization_id,action_id) references public.actions(organization_id,id)
);
create table public.business_instructions (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id), business_id uuid,
 instruction text not null check(length(instruction) between 1 and 5000), priority integer not null default 0 check(priority between 0 and 100),
 active boolean not null default true, created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(organization_id,business_id) references public.businesses(organization_id,id)
);
create index actions_org_created on public.actions(organization_id,created_at desc);
create index approvals_org_pending on public.approvals(organization_id,expires_at) where consumed_at is null;
create index audit_org_created on public.audit_events(organization_id,created_at desc,id);
create index instructions_org_business on public.business_instructions(organization_id,business_id);

create function private.actor_role(org uuid, actor uuid) returns text language sql stable security definer set search_path='' as $$
 select role from public.organization_members where organization_id=org and user_id=actor
$$;
grant usage on schema private to authenticated;
revoke all on function private.actor_role(uuid,uuid) from public,anon,authenticated;
create function private.member_role(org uuid) returns text language sql stable security definer set search_path='' as $$
 select private.actor_role(org,auth.uid())
$$;
revoke all on function private.member_role(uuid) from public,anon;
grant execute on function private.member_role(uuid) to authenticated;
-- Not exposed as a public RPC; an authenticated user may only inspect their own membership through RLS.
create function private.touch_updated() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
create function private.immutable_audit() returns trigger language plpgsql set search_path='' as $$ begin raise exception 'APPEND_ONLY'; end $$;
create trigger audit_immutable before update or delete on public.audit_events for each row execute function private.immutable_audit();
create function private.immutable_action() returns trigger language plpgsql set search_path='' as $$
 begin
 if (new.id,new.organization_id,new.business_id,new.actor_id,new.agent,new.provider,new.tool,new.resource_type,new.resource_id,new.proposal,new.proposal_fingerprint,new.reason,new.confidence,new.created_at)
 is distinct from (old.id,old.organization_id,old.business_id,old.actor_id,old.agent,old.provider,old.tool,old.resource_type,old.resource_id,old.proposal,old.proposal_fingerprint,old.reason,old.confidence,old.created_at) then raise exception 'INVALID_ACTION'; end if;
 return new;
 end $$;
create trigger action_snapshot before update on public.actions for each row execute function private.immutable_action();
do $$ declare t text; begin
 foreach t in array array['profiles','organizations','businesses','integration_connections','provider_connections','organization_policies','actions','approvals','business_instructions'] loop
 execute format('create trigger touch_updated before update on public.%I for each row execute function private.touch_updated()',t);
 end loop;
 foreach t in array array['organizations','organization_members','businesses','integration_connections','provider_connections','organization_policies','actions','approvals','audit_events','business_instructions'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public, anon, authenticated, service_role',t);
 execute format('grant select on public.%I to authenticated, service_role',t);
 execute format('create policy tenant_read on public.%I for select to authenticated using (private.member_role(%s) is not null)',t,case when t='organizations' then 'id' else 'organization_id' end);
 end loop;
 end $$;
alter table public.profiles enable row level security;
revoke all on public.profiles from public,anon,authenticated,service_role;
grant select on public.profiles to authenticated;
create policy own_profile on public.profiles for select to authenticated using(id=(select auth.uid()));
-- All writes go through narrowly scoped RPCs. No generic browser action/audit/role mutations.
create function public.create_workspace(workspace_name text, business_name text, kind text) returns uuid
 language plpgsql security definer set search_path='' as $$
 declare org uuid:=gen_random_uuid(); biz uuid:=gen_random_uuid(); actor uuid:=auth.uid();
 begin
 if actor is null then raise exception 'NOT_AUTHENTICATED'; end if;
 if length(trim(workspace_name)) not between 1 and 120 or length(trim(business_name)) not between 1 and 120 then raise exception 'INVALID_INPUT'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
 if (select count(*) from public.organization_members where user_id=actor and role='owner')>=20 then raise exception 'WORKSPACE_LIMIT'; end if;
 insert into public.profiles(id) values(actor) on conflict do nothing;
 insert into public.organizations(id,name,slug,created_by) values(org,trim(workspace_name),'workspace-'||org::text,actor);
 insert into public.organization_members values(org,actor,'owner',now());
 insert into public.businesses(id,organization_id,name,business_type) values(biz,org,trim(business_name),kind);
 insert into public.integration_connections(organization_id,business_id,provider,display_name) values(org,biz,'shopify','Shopify');
 insert into public.provider_connections(organization_id,provider) select org,p from unnest(array['anti-nerd','openai','anthropic','google']) p;
 return org;
 end $$;
create function public.save_instruction(org uuid, business uuid, item uuid, body text, rank integer, enabled boolean) returns uuid
 language plpgsql security definer set search_path='' as $$
 declare result uuid;
 begin
 if coalesce(private.member_role(org),'') not in ('owner','admin','member') then raise exception 'NOT_AUTHORIZED'; end if;
 if item is null then
 insert into public.business_instructions(organization_id,business_id,instruction,priority,active,created_by) values(org,business,body,rank,enabled,auth.uid()) returning id into result;
 else
 update public.business_instructions set instruction=body,priority=rank,active=enabled where id=item and organization_id=org and business_id is not distinct from business returning id into result;
 if result is null then raise exception 'NOT_AUTHORIZED'; end if;
 end if;
 return result;
 end $$;
create function public.set_policy(org uuid, cap text, setting text, config jsonb, expected_revision integer) returns integer
 language plpgsql security definer set search_path='' as $$
 declare rev integer;
 begin
 if private.member_role(org) is distinct from 'owner' then raise exception 'NOT_AUTHORIZED'; end if;
 select policy_revision into rev from public.organizations where id=org for update;
 if rev is distinct from expected_revision then raise exception 'POLICY_CHANGED'; end if;
 if config is not null and (cap<>'products.price.write' or setting<>'AUTOMATIC_WITH_LIMITS' or not(config ?& array['currency','maxNewPriceMinor']) or jsonb_typeof(config->'maxNewPriceMinor') is distinct from 'number' or (config->>'maxNewPriceMinor')!~'^[0-9]{1,9}$' or coalesce(config->>'currency','') not in ('EUR','USD','GBP') or config- 'currency'- 'maxNewPriceMinor'<>'{}'::jsonb) then raise exception 'INVALID_LIMIT'; end if;
 if setting='AUTOMATIC_WITH_LIMITS' and config is null then raise exception 'INVALID_LIMIT'; end if;
 rev:=rev+1;
 update public.organizations set policy_revision=rev where id=org;
 insert into public.organization_policies(organization_id,capability,mode,limits,revision) values(org,cap,setting,config,rev)
 on conflict(organization_id,capability) do update set mode=excluded.mode,limits=excluded.limits,revision=excluded.revision;
 return rev;
 end $$;
-- Persisted counters: only server can choose keys/scopes. No memory fallback.
create table private.rate_limits (bucket text primary key, hits integer not null, resets_at timestamptz not null);
create function public.consume_rate_limit(bucket_key text, scope text) returns boolean language plpgsql security definer set search_path='' as $$
 declare allowance integer; duration interval; n integer;
 begin
 case scope when 'auth' then allowance:=8; duration:=interval '15 minutes'; when 'approval' then allowance:=30; duration:=interval '1 minute'; when 'mutation' then allowance:=60; duration:=interval '1 minute'; else raise exception 'RATE_LIMIT_UNAVAILABLE'; end case;
 insert into private.rate_limits values(scope||':'||bucket_key,1,clock_timestamp()+duration)
 on conflict(bucket) do update set hits=case when private.rate_limits.resets_at<=clock_timestamp() then 1 else least(private.rate_limits.hits+1,1000000) end, resets_at=case when private.rate_limits.resets_at<=clock_timestamp() then clock_timestamp()+duration else private.rate_limits.resets_at end returning hits into n;
 return n<=allowance;
 end $$;
-- Functions are not implicitly executable by PUBLIC (PostgreSQL's default).
revoke all on function public.create_workspace(text,text,text), public.save_instruction(uuid,uuid,uuid,text,integer,boolean), public.set_policy(uuid,text,text,jsonb,integer) from public,anon;
grant execute on function public.create_workspace(text,text,text), public.save_instruction(uuid,uuid,uuid,text,integer,boolean), public.set_policy(uuid,text,text,jsonb,integer) to authenticated;
revoke all on function public.consume_rate_limit(text,text) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text,text) to service_role;
revoke all on all tables in schema private from public,anon,authenticated;
commit;
