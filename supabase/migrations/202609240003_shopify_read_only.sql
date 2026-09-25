-- Requires the two identity migrations. No live credentials are seeded.
begin;
alter table public.integration_connections drop constraint integration_connections_status_check;
alter table public.integration_connections drop constraint integration_connections_credential_reference_check;
alter table public.integration_connections add constraint integration_status check(status in ('not_connected','unavailable','revoked','connected'));
alter table public.integration_connections add column shop_id text, add column currency text,
 add column connected_at timestamptz, add column last_verified_at timestamptz,
 add column access_expires_at timestamptz, add column refresh_expires_at timestamptz,
 add column connection_health text not null default 'DISCONNECTED' check(connection_health in ('CONNECTED','NEEDS_REAUTHORIZATION','MISSING_SCOPE','TOKEN_REFRESH_FAILED','DISCONNECTED','ERROR')),
 add column generation integer not null default 0,
 add column refresh_lease uuid, add column refresh_started_at timestamptz;
alter table public.integration_connections add unique(organization_id,business_id,id);
create unique index shopify_one_workspace_per_shop on public.integration_connections(external_account_identifier) where provider='shopify' and external_account_identifier is not null and shop_id is not null;
alter table public.integration_connections add constraint shopify_domain check(provider<>'shopify' or external_account_identifier is null or external_account_identifier ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.myshopify\.com$');
alter table public.integration_connections add constraint verified_connection check(status<>'connected' or (provider='shopify' and credential_reference is not null and last_verified_at is not null and shop_id is not null));
create table private.shopify_credentials (
 id uuid primary key, organization_id uuid not null, business_id uuid not null, connection_id uuid not null unique,
 purpose text not null check(purpose='integration:shopify'), envelope jsonb not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(organization_id,business_id,connection_id) references public.integration_connections(organization_id,business_id,id),
 unique(organization_id,business_id,connection_id,id)
);
alter table public.integration_connections add constraint shopify_credential_binding foreign key(organization_id,business_id,id,credential_reference) references private.shopify_credentials(organization_id,business_id,connection_id,id) deferrable initially deferred;
create table private.shopify_oauth_states (
 digest text primary key check(digest ~ '^[a-f0-9]{64}$'), organization_id uuid not null, business_id uuid not null, actor_id uuid not null references auth.users(id),
 connection_id uuid not null, generation integer not null, shop text not null, redirect_uri text not null,
 expires_at timestamptz not null default now()+interval '10 minutes', consumed_at timestamptz,
 foreign key(organization_id,business_id,connection_id) references public.integration_connections(organization_id,business_id,id)
);
create index shopify_state_expiry on private.shopify_oauth_states(expires_at);
create table private.shopify_deliveries (id text primary key,topic text not null,received_at timestamptz not null default now());
revoke all on private.shopify_credentials,private.shopify_oauth_states,private.shopify_deliveries from public,anon,authenticated,service_role;
alter table private.shopify_credentials enable row level security;
alter table private.shopify_oauth_states enable row level security;
alter table private.shopify_deliveries enable row level security;
-- Extend the existing audit rather than creating an unaudited integration side channel.
alter table public.audit_events alter column action_id drop not null, alter column actor_id drop not null;
alter table public.audit_events drop constraint audit_events_provider_check, drop constraint audit_events_source_check;
alter table public.audit_events add constraint audit_provider check(provider in ('mock','anti-nerd','shopify')), add constraint audit_source check(source in ('mock','live'));
alter table public.audit_events add column integration_connection_id uuid references public.integration_connections(id);
alter table public.audit_events add constraint audit_subject check(action_id is not null or integration_connection_id is not null);
alter table public.actions drop constraint actions_provider_check;
alter table public.actions add constraint action_provider check(provider in ('mock','anti-nerd'));
alter table public.actions add column execution_source text not null default 'mock' check(execution_source in ('mock','live'));
alter table public.actions add constraint live_read_only check(execution_source='mock' or tool in ('getStore','listProducts','getProduct','listOrders','getOrder','listCustomers','getInventory'));
create or replace function private.immutable_action() returns trigger language plpgsql set search_path='' as $$
 begin
 if (new.id,new.organization_id,new.business_id,new.actor_id,new.agent,new.provider,new.tool,new.resource_type,new.resource_id,new.proposal,new.proposal_fingerprint,new.reason,new.confidence,new.created_at,new.execution_source)
 is distinct from (old.id,old.organization_id,old.business_id,old.actor_id,old.agent,old.provider,old.tool,old.resource_type,old.resource_id,old.proposal,old.proposal_fingerprint,old.reason,old.confidence,old.created_at,old.execution_source) then raise exception 'INVALID_ACTION'; end if;
 return new;
 end $$;

create or replace function public.reject_approval(org uuid, approval uuid, actor uuid) returns boolean
 language plpgsql security definer set search_path='' as $$
 declare a uuid;
 begin
 if private.actor_role(org,actor) is distinct from 'owner' then raise exception 'NOT_AUTHORIZED'; end if;
 perform 1 from public.organizations where id=org for update;
 update public.approvals set rejected_by=actor,consumed_at=clock_timestamp() where organization_id=org and id=approval and consumed_at is null and expires_at>clock_timestamp() returning action_id into a;
 if a is null then return false; end if;
 update public.actions set status='rejected' where organization_id=org and id=a;
 insert into public.audit_events(id,organization_id,action_id,actor_id,agent,provider,action_type,resource,reason,confidence,policy_decision,change_parameters,result,source,requested_at)
 select gen_random_uuid(),org,id,actor,agent,provider,'approval.rejected',resource_id,'Owner rejected this action.',confidence,coalesce(receipt->'decision','{}'),jsonb_build_object('tool',tool,'input',proposal->'input'),'rejected',execution_source,created_at from public.actions where id=a;
 return true;
 end $$;

create function private.shopify_audit(c public.integration_connections,event text,actor uuid) returns void language sql security definer set search_path='' as $$
 insert into public.audit_events(id,organization_id,integration_connection_id,actor_id,agent,provider,action_type,resource,reason,confidence,policy_decision,change_parameters,result,source,requested_at)
 values(gen_random_uuid(),c.organization_id,c.id,actor,'operations','shopify','shopify.'||event,coalesce(c.external_account_identifier,'shopify'),event,1,'{}','{}',event,'live',clock_timestamp())
$$;
revoke all on function private.shopify_audit(public.integration_connections,text,uuid) from public,anon,authenticated,service_role;
-- Narrow server-only RPC. All tenant values originate in the verified session DAL.
create function public.shopify_operation(operation text,org uuid,business uuid,actor uuid,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.integration_connections; s private.shopify_oauth_states; role text; envelope jsonb; ref uuid; lease uuid; moment timestamptz:=clock_timestamp();
begin
 role:=private.actor_role(org,actor);
 if role is null or not exists(select 1 from public.businesses where id=business and organization_id=org and status='active') then raise exception 'NOT_AUTHORIZED'; end if;
 if operation in ('begin','consume','stage','commit','abort','disconnect') and role<>'owner' then raise exception 'NOT_AUTHORIZED'; end if;
 select * into c from public.integration_connections where organization_id=org and business_id=business and provider='shopify' for update;
 if c.id is null then raise exception 'NOT_CONNECTED'; end if;
 if operation='begin' then
  -- Fence installation against both token refresh and an in-flight code exchange.
  if (c.refresh_lease is not null and c.refresh_started_at>moment-interval '45 seconds') or exists(select 1 from private.shopify_oauth_states where connection_id=c.id and generation=c.generation and consumed_at>moment-interval '45 seconds') then raise exception 'REFRESH_IN_PROGRESS'; end if;
  if payload->>'shop' !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.myshopify\.com$' then raise exception 'INVALID_SHOP'; end if;
  if c.external_account_identifier is not null and c.external_account_identifier<>payload->>'shop' then raise exception 'SHOP_MISMATCH'; end if;
  if exists(select 1 from public.integration_connections x where x.provider='shopify' and x.shop_id is not null and x.external_account_identifier=payload->>'shop' and x.id<>c.id) then raise exception 'SHOP_ALREADY_LINKED'; end if;
  update public.integration_connections set external_account_identifier=payload->>'shop',generation=generation+1,status='unavailable',connection_health='NEEDS_REAUTHORIZATION',refresh_lease=null,refresh_started_at=null where id=c.id returning * into c;
  insert into private.shopify_oauth_states(digest,organization_id,business_id,actor_id,connection_id,generation,shop,redirect_uri) values(payload->>'digest',org,business,actor,c.id,c.generation,payload->>'shop',payload->>'redirectUri') returning * into s;
  perform private.shopify_audit(c,'connection_started',actor);return to_jsonb(s);
 elsif operation='consume' then
  update private.shopify_oauth_states set consumed_at=moment where digest=payload->>'digest' and organization_id=org and business_id=business and actor_id=actor and shop=payload->>'shop' and connection_id=c.id and generation=c.generation and consumed_at is null and expires_at>moment returning * into s;
  return case when s.digest is null then null else to_jsonb(s) end;
 elsif operation='secret' then
  if c.credential_reference is null or c.credential_reference::text is distinct from payload->>'reference' then raise exception 'NOT_CONNECTED'; end if;
  if c.status<>'connected' and not exists(select 1 from private.shopify_oauth_states where digest=payload->>'digest' and organization_id=org and business_id=business and actor_id=actor and connection_id=c.id and generation=c.generation and consumed_at is not null and expires_at>moment) then raise exception 'NOT_CONNECTED'; end if;
  select e.envelope into envelope from private.shopify_credentials e where e.id=c.credential_reference and e.organization_id=org and e.business_id=business and e.connection_id=c.id and e.purpose='integration:shopify';return envelope;
 elsif operation in ('stage','commit') then
  select * into s from private.shopify_oauth_states where digest=payload->>'digest' and organization_id=org and business_id=business and actor_id=actor and connection_id=c.id and generation=c.generation and consumed_at is not null and expires_at>moment;
  if s.digest is null or (operation='commit' and c.external_account_identifier is distinct from payload->'shop'->>'domain') then raise exception 'INVALID_STATE'; end if;
  envelope:=payload->'envelope';ref:=(envelope->>'id')::uuid;
  if envelope->>'organizationId' is distinct from org::text or envelope->>'businessId' is distinct from business::text or envelope->>'connectionId' is distinct from c.id::text or envelope->>'purpose' is distinct from 'integration:shopify' then raise exception 'NOT_AUTHORIZED'; end if;
  update public.integration_connections set credential_reference=null where id=c.id;
  delete from private.shopify_credentials where connection_id=c.id;
  insert into private.shopify_credentials(id,organization_id,business_id,connection_id,purpose,envelope) values(ref,org,business,c.id,'integration:shopify',envelope);
  if operation='stage' then
   update public.integration_connections set credential_reference=ref,status='unavailable',last_verified_at=null,access_expires_at=(payload->>'accessExpiresAt')::timestamptz,refresh_expires_at=(payload->>'refreshExpiresAt')::timestamptz where id=c.id;
   return '{}'::jsonb;
  end if;
  update public.integration_connections set credential_reference=ref,status='connected',connection_health='CONNECTED',shop_id=payload->'shop'->>'id',display_name=payload->'shop'->>'name',currency=payload->'shop'->>'currencyCode',granted_capabilities=array(select jsonb_array_elements_text(payload->'scopes')),connected_at=moment,last_verified_at=moment,access_expires_at=(payload->>'accessExpiresAt')::timestamptz,refresh_expires_at=(payload->>'refreshExpiresAt')::timestamptz,refresh_lease=null,refresh_started_at=null where id=c.id;
  delete from private.shopify_oauth_states where connection_id=c.id;
  perform private.shopify_audit(c,case when c.connected_at is null then 'connected' else 'reauthorized' end,actor);return '{}'::jsonb;
 elsif operation='abort' then
  if c.generation<>(payload->>'generation')::integer then return '{}'::jsonb; end if;
  update public.integration_connections set status='unavailable',connection_health='ERROR',credential_reference=null where id=c.id;
  delete from private.shopify_credentials where connection_id=c.id;
  delete from private.shopify_oauth_states where connection_id=c.id;
  perform private.shopify_audit(c,'connection_failed',actor);return '{}'::jsonb;
 elsif operation='lock_refresh' then
  if c.status<>'connected' or c.credential_reference::text is distinct from payload->>'reference' then raise exception 'NOT_CONNECTED'; end if;
  if c.refresh_lease is not null then
   if c.refresh_started_at < moment-interval '45 seconds' then
    update public.integration_connections set status='unavailable',connection_health='TOKEN_REFRESH_FAILED' where id=c.id;
    perform private.shopify_audit(c,'token_refresh_failed',actor);
   end if;
   return null; -- Never reuse an uncertain refresh token after an abandoned lease.
  end if;
  if c.access_expires_at>moment+interval '60 seconds' then return null; end if;
  lease:=gen_random_uuid();update public.integration_connections set refresh_lease=lease,refresh_started_at=moment where id=c.id;return to_jsonb(lease);
 elsif operation='rotate' then
  if c.status<>'connected' or c.refresh_lease is null or c.refresh_lease::text is distinct from payload->>'lease' or c.credential_reference::text is distinct from payload->>'reference' then raise exception 'INVALID_LEASE'; end if;
  envelope:=payload->'envelope';
  if envelope->>'id'<>c.credential_reference::text or envelope->>'organizationId' is distinct from org::text or envelope->>'businessId' is distinct from business::text or envelope->>'connectionId' is distinct from c.id::text or envelope->>'purpose' is distinct from 'integration:shopify' then raise exception 'NOT_AUTHORIZED'; end if;
  update private.shopify_credentials set envelope=payload->'envelope',updated_at=moment where id=c.credential_reference;
  update public.integration_connections set access_expires_at=(payload->>'accessExpiresAt')::timestamptz,refresh_expires_at=(payload->>'refreshExpiresAt')::timestamptz,refresh_lease=null,refresh_started_at=null,connection_health='CONNECTED' where id=c.id;
  perform private.shopify_audit(c,'credential_refreshed',actor);return '{}'::jsonb;
 elsif operation='unhealthy' then
  if payload ? 'lease' and c.refresh_lease::text is distinct from payload->>'lease' then return '{}'::jsonb; end if;
  if payload ? 'generation' and c.generation<>(payload->>'generation')::integer then return '{}'::jsonb; end if;
  if c.status='revoked' then return '{}'::jsonb; end if;
  update public.integration_connections set connection_health=payload->>'health',status=case when payload->>'health' in ('ERROR','MISSING_SCOPE') and credential_reference is not null and last_verified_at is not null then 'connected' else 'unavailable' end,refresh_lease=null,refresh_started_at=null where id=c.id;
  perform private.shopify_audit(c,'connection_unhealthy',actor);return '{}'::jsonb;
 elsif operation='observed' then
  if c.status<>'connected' then raise exception 'NOT_CONNECTED'; end if;
  update public.integration_connections set last_sync_at=moment where id=c.id;return '{}'::jsonb;
 elsif operation='disconnect' then
  update public.integration_connections set status='revoked',connection_health='DISCONNECTED',credential_reference=null,generation=generation+1,refresh_lease=null,refresh_started_at=null,access_expires_at=null,refresh_expires_at=null where id=c.id;
  delete from private.shopify_credentials where connection_id=c.id;delete from private.shopify_oauth_states where connection_id=c.id;
  perform private.shopify_audit(c,'disconnected',actor);return '{}'::jsonb;
 else raise exception 'INVALID_OPERATION'; end if;
end $$;
revoke all on function public.shopify_operation(text,uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.shopify_operation(text,uuid,uuid,uuid,jsonb) to service_role;
-- Webhook signature/body is verified on the server before this privileged call.
create table private.shopify_privacy_requests (
 delivery text primary key references private.shopify_deliveries(id), connection_id uuid not null references public.integration_connections(id),
 topic text not null, identifiers jsonb not null, status text not null default 'pending' check(status in ('pending','fulfilled')),
 received_at timestamptz not null default now(), fulfilled_at timestamptz
);
revoke all on private.shopify_privacy_requests from public,anon,authenticated,service_role;
alter table private.shopify_privacy_requests enable row level security;
create function public.shopify_webhook(delivery text,topic text,shop text,occurred_at timestamptz,identifiers jsonb default '{}') returns void language plpgsql security definer set search_path='' as $$
declare c public.integration_connections; inserted text;
begin
 if topic not in ('app/uninstalled','app/scopes_update','customers/data_request','customers/redact','shop/redact') then raise exception 'INVALID_TOPIC'; end if;
 insert into private.shopify_deliveries(id,topic) values(delivery,topic) on conflict do nothing returning id into inserted;
 if inserted is null then return; end if;
 select * into c from public.integration_connections where provider='shopify' and external_account_identifier=shop for update;
 if c.id is null then return; end if;
 -- A delayed uninstall/redaction must not destroy a newer reinstallation.
 if topic in ('app/uninstalled','shop/redact','app/scopes_update') and (c.connected_at is null or occurred_at>=c.connected_at) then
  update public.integration_connections set status='revoked',connection_health=case when topic='app/scopes_update' then 'NEEDS_REAUTHORIZATION' else 'DISCONNECTED' end,credential_reference=null,generation=generation+1,refresh_lease=null,refresh_started_at=null,access_expires_at=null,refresh_expires_at=null where id=c.id;
  delete from private.shopify_credentials where connection_id=c.id;delete from private.shopify_oauth_states where connection_id=c.id;
 end if;
 -- Durable manual fulfillment queue, not a claim that privacy obligations were fulfilled.
 if topic in ('customers/data_request','customers/redact','shop/redact') then
  insert into private.shopify_privacy_requests(delivery,connection_id,topic,identifiers) values(delivery,c.id,topic,identifiers);
 end if;
 perform private.shopify_audit(c,replace(topic,'/','_'),null);
end $$;
revoke all on function public.shopify_webhook(text,text,text,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.shopify_webhook(text,text,text,timestamptz,jsonb) to service_role;
commit;
