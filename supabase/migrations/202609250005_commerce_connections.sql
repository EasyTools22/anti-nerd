-- Multi-business commerce and non-destructive Shopify replacement. Apply after 004.
-- No users, business records, history or live credentials are seeded or removed.
begin;
alter table public.integration_connections add column pending_shop text, add column pending_expires_at timestamptz;
alter table private.shopify_oauth_states add column envelope jsonb, add column access_expires_at timestamptz, add column refresh_expires_at timestamptz;
alter table public.audit_events add column business_id uuid;
alter table public.audit_events add constraint audit_business_binding foreign key(organization_id,business_id) references public.businesses(organization_id,id);
alter table public.audit_events drop constraint audit_subject;
alter table public.audit_events add constraint audit_subject check(action_id is not null or integration_connection_id is not null or (business_id is not null and actor_id is not null and action_type in ('business.created','business.selected')));

create function public.create_business(org uuid,business_name text,kind text) returns uuid
language plpgsql security definer set search_path='' as $$
declare biz uuid:=gen_random_uuid(); actor uuid:=auth.uid();
begin
 if coalesce(private.member_role(org),'') not in ('owner','admin') then raise exception 'NOT_AUTHORIZED'; end if;
 if business_name is null or length(trim(business_name)) not between 1 and 120 or kind is null or kind not in ('ecommerce','hospitality','restaurant','agency','other') then raise exception 'INVALID_INPUT'; end if;
 insert into public.businesses(id,organization_id,name,business_type) values(biz,org,trim(business_name),kind);
 insert into public.integration_connections(organization_id,business_id,provider,display_name) values(org,biz,'shopify','Shopify');
 insert into public.audit_events(id,organization_id,business_id,actor_id,agent,provider,action_type,resource,reason,confidence,policy_decision,change_parameters,result,source,requested_at)
 values(gen_random_uuid(),org,biz,actor,'operations','anti-nerd','business.created',biz::text,'Business created.',1,'{}','{}','succeeded','live',clock_timestamp());
 return biz;
end $$;
create function public.select_business(org uuid,business uuid) returns uuid
language plpgsql security definer set search_path='' as $$
begin
 if private.member_role(org) is null or not exists(select 1 from public.businesses where id=business and organization_id=org and status='active') then raise exception 'NOT_AUTHORIZED'; end if;
 insert into public.audit_events(id,organization_id,business_id,actor_id,agent,provider,action_type,resource,reason,confidence,policy_decision,change_parameters,result,source,requested_at)
 values(gen_random_uuid(),org,business,auth.uid(),'operations','anti-nerd','business.selected',business::text,'Active business selected.',1,'{}','{}','succeeded','live',clock_timestamp());
 return business;
end $$;
revoke all on function public.create_business(uuid,text,text),public.select_business(uuid,uuid) from public,anon,service_role;
grant execute on function public.create_business(uuid,text,text),public.select_business(uuid,uuid) to authenticated;

create or replace function public.shopify_operation(operation text,org uuid,business uuid,actor uuid,payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare c public.integration_connections; s private.shopify_oauth_states; role text; envelope jsonb; ref uuid; lease uuid; moment timestamptz:=clock_timestamp();
begin
 role:=private.actor_role(org,actor);
 if role is null or not exists(select 1 from public.businesses where id=business and organization_id=org and status='active') then raise exception 'NOT_AUTHORIZED'; end if;
 if operation in ('begin','consume','stage','commit','abort','disconnect') and role<>'owner' then raise exception 'NOT_AUTHORIZED'; end if;
 select * into c from public.integration_connections where organization_id=org and business_id=business and provider='shopify' for update;
 if c.id is null then raise exception 'NOT_CONNECTED'; end if;
 if operation in ('begin','disconnect') and payload ? 'expectedGeneration' and (payload->>'expectedGeneration')::integer is distinct from c.generation then raise exception 'CONNECTION_CHANGED'; end if;
 if operation='begin' then
  -- Fence installation against both token refresh and an in-flight code exchange.
  if (c.refresh_lease is not null and c.refresh_started_at>moment-interval '45 seconds') or exists(select 1 from private.shopify_oauth_states where connection_id=c.id and generation=c.generation and consumed_at>moment-interval '45 seconds') then raise exception 'REFRESH_IN_PROGRESS'; end if;
  if payload->>'shop' is null or payload->>'shop' !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.myshopify\.com$' then raise exception 'INVALID_SHOP'; end if;
  if c.external_account_identifier is not null and c.external_account_identifier<>payload->>'shop' and payload->>'replace' is distinct from 'true' then raise exception 'REPLACEMENT_CONFIRMATION_REQUIRED'; end if;
  if exists(select 1 from public.integration_connections x where x.provider='shopify' and x.shop_id is not null and x.external_account_identifier=payload->>'shop' and x.id<>c.id) then raise exception 'SHOP_ALREADY_LINKED'; end if;
  -- The active domain, credential and health remain untouched until verified commit.
  delete from private.shopify_oauth_states where connection_id=c.id;
  -- Fence an abandoned refresh. Its token outcome is unknown, so reauthorization is required.
  if c.refresh_lease is not null then
   update public.integration_connections set refresh_lease=null,refresh_started_at=null,status='unavailable',connection_health='TOKEN_REFRESH_FAILED' where id=c.id;
  end if;
  update public.integration_connections set generation=generation+1,pending_shop=payload->>'shop',pending_expires_at=moment+interval '10 minutes' where id=c.id returning * into c;
  insert into private.shopify_oauth_states(digest,organization_id,business_id,actor_id,connection_id,generation,shop,redirect_uri) values(payload->>'digest',org,business,actor,c.id,c.generation,payload->>'shop',payload->>'redirectUri') returning * into s;
  perform private.shopify_audit(c,'connection_started',actor);return to_jsonb(s);
 elsif operation='consume' then
  if c.refresh_lease is not null then raise exception 'REFRESH_IN_PROGRESS'; end if;
  update private.shopify_oauth_states set consumed_at=moment where digest=payload->>'digest' and organization_id=org and business_id=business and actor_id=actor and shop=payload->>'shop' and connection_id=c.id and generation=c.generation and consumed_at is null and expires_at>moment returning * into s;
  return case when s.digest is null then null else to_jsonb(s) end;
 elsif operation='secret' then
  if payload ? 'digest' then
   -- A staged envelope is usable only by its consumed, current, actor-bound OAuth attempt.
   select * into s from private.shopify_oauth_states where digest=payload->>'digest'
    and organization_id=org and business_id=business and actor_id=actor and connection_id=c.id
    and generation=c.generation and consumed_at is not null and expires_at>moment;
   if s.digest is null or s.envelope->>'id' is distinct from payload->>'reference' then raise exception 'NOT_CONNECTED'; end if;
   return s.envelope;
  end if;
  if c.status<>'connected' or c.credential_reference is null or c.credential_reference::text is distinct from payload->>'reference' then raise exception 'NOT_CONNECTED'; end if;
  select e.envelope into envelope from private.shopify_credentials e where e.id=c.credential_reference and e.organization_id=org and e.business_id=business and e.connection_id=c.id and e.purpose='integration:shopify';return envelope;
 elsif operation in ('stage','commit') then
  select * into s from private.shopify_oauth_states where digest=payload->>'digest' and organization_id=org and business_id=business and actor_id=actor and connection_id=c.id and generation=c.generation and consumed_at is not null and expires_at>moment;
  if s.digest is null then raise exception 'INVALID_STATE'; end if;
  envelope:=payload->'envelope';ref:=(envelope->>'id')::uuid;
  if ref is null or envelope->>'organizationId' is distinct from org::text or envelope->>'businessId' is distinct from business::text or envelope->>'connectionId' is distinct from c.id::text or envelope->>'purpose' is distinct from 'integration:shopify' then raise exception 'NOT_AUTHORIZED'; end if;
  if operation='stage' then
   if s.envelope is not null then raise exception 'INVALID_STATE'; end if;
   update private.shopify_oauth_states set envelope=payload->'envelope',access_expires_at=(payload->>'accessExpiresAt')::timestamptz,refresh_expires_at=(payload->>'refreshExpiresAt')::timestamptz where digest=s.digest;
   return '{}'::jsonb;
  end if;
  if s.shop is distinct from payload->'shop'->>'domain' or s.envelope is distinct from envelope
   or s.access_expires_at is distinct from (payload->>'accessExpiresAt')::timestamptz
   or s.refresh_expires_at is distinct from (payload->>'refreshExpiresAt')::timestamptz
   or coalesce(payload->'shop'->>'id','') !~ '^gid://shopify/Shop/[0-9]+$'
   or c.refresh_lease is not null then raise exception 'INVALID_STATE'; end if;
  -- Serialize contenders for this shop; the unique index also guards concurrent commits.
  perform pg_advisory_xact_lock(hashtextextended(s.shop,0));
  if exists(select 1 from public.integration_connections x where x.provider='shopify' and x.shop_id is not null and x.external_account_identifier=s.shop and x.id<>c.id) then raise exception 'SHOP_ALREADY_LINKED'; end if;
  delete from private.shopify_credentials where connection_id=c.id;
  insert into private.shopify_credentials(id,organization_id,business_id,connection_id,purpose,envelope) values(ref,org,business,c.id,'integration:shopify',envelope);
  update public.integration_connections set external_account_identifier=s.shop,credential_reference=ref,status='connected',connection_health='CONNECTED',shop_id=payload->'shop'->>'id',display_name=payload->'shop'->>'name',currency=payload->'shop'->>'currencyCode',granted_capabilities=array(select jsonb_array_elements_text(payload->'scopes')),connected_at=moment,last_verified_at=moment,last_sync_at=null,access_expires_at=s.access_expires_at,refresh_expires_at=s.refresh_expires_at,refresh_lease=null,refresh_started_at=null,pending_shop=null,pending_expires_at=null where id=c.id;
  delete from private.shopify_oauth_states where connection_id=c.id;
  insert into public.audit_events(id,organization_id,business_id,integration_connection_id,actor_id,agent,provider,action_type,resource,reason,confidence,policy_decision,change_parameters,result,source,requested_at)
  values(gen_random_uuid(),org,business,c.id,actor,'operations','shopify',
   case when c.external_account_identifier is null then 'shopify.connected' when c.external_account_identifier=s.shop then 'shopify.reconnected' else 'shopify.store_replaced' end,
   s.shop,'Verified Shopify connection activated.',1,'{}',jsonb_build_object('previousShop',c.external_account_identifier,'newShop',s.shop),'succeeded','live',moment);
  return '{}'::jsonb;
 elsif operation='abort' then
  if c.generation is distinct from (payload->>'generation')::integer then return '{}'::jsonb; end if;
  delete from private.shopify_oauth_states where connection_id=c.id and generation=c.generation;
  update public.integration_connections set pending_shop=null,pending_expires_at=null where id=c.id;
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
  if exists(select 1 from private.shopify_oauth_states where connection_id=c.id and generation=c.generation and consumed_at is not null and expires_at>moment) then return null; end if;
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
  if c.status='revoked' or c.credential_reference is null then return '{}'::jsonb; end if;
  update public.integration_connections set connection_health=payload->>'health',status=case when payload->>'health' in ('ERROR','MISSING_SCOPE') and credential_reference is not null and last_verified_at is not null then 'connected' else 'unavailable' end,refresh_lease=null,refresh_started_at=null where id=c.id;
  perform private.shopify_audit(c,'connection_unhealthy',actor);return '{}'::jsonb;
 elsif operation='observed' then
  if c.status<>'connected' or c.credential_reference::text is distinct from payload->>'reference' then raise exception 'NOT_CONNECTED'; end if;
  update public.integration_connections set last_sync_at=moment where id=c.id;return '{}'::jsonb;
 elsif operation='disconnect' then
  update public.integration_connections set status='not_connected',connection_health='DISCONNECTED',credential_reference=null,external_account_identifier=null,shop_id=null,currency=null,display_name='Shopify',granted_capabilities='{}',connected_at=null,last_verified_at=null,last_sync_at=null,pending_shop=null,pending_expires_at=null,generation=generation+1,refresh_lease=null,refresh_started_at=null,access_expires_at=null,refresh_expires_at=null where id=c.id;
  delete from private.shopify_credentials where connection_id=c.id;delete from private.shopify_oauth_states where connection_id=c.id;
  perform private.shopify_audit(c,'disconnected',actor);return '{}'::jsonb;
 else raise exception 'INVALID_OPERATION'; end if;
end $$;
revoke all on function public.shopify_operation(text,uuid,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.shopify_operation(text,uuid,uuid,uuid,jsonb) to service_role;

create or replace function public.shopify_webhook(delivery text,topic text,shop text,occurred_at timestamptz,identifiers jsonb default '{}') returns void language plpgsql security definer set search_path='' as $$
declare c public.integration_connections; inserted text;
begin
 if topic not in ('app/uninstalled','app/scopes_update','customers/data_request','customers/redact','shop/redact') then raise exception 'INVALID_TOPIC'; end if;
 insert into private.shopify_deliveries(id,topic) values(delivery,topic) on conflict do nothing returning id into inserted;
 if inserted is null then return; end if;
 select * into c from public.integration_connections where provider='shopify' and external_account_identifier=shop for update;
 if c.id is null then return; end if;
 -- A delayed uninstall/redaction must not destroy a newer reinstallation.
 if topic in ('app/uninstalled','shop/redact','app/scopes_update') and (c.connected_at is null or occurred_at>=c.connected_at) then
  update public.integration_connections set pending_shop=null,pending_expires_at=null,status='revoked',connection_health=case when topic='app/scopes_update' then 'NEEDS_REAUTHORIZATION' else 'DISCONNECTED' end,credential_reference=null,generation=generation+1,refresh_lease=null,refresh_started_at=null,access_expires_at=null,refresh_expires_at=null where id=c.id;
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

alter function public.backend_readiness() set schema private;
revoke all on function private.backend_readiness() from public,anon,authenticated,service_role;
create function public.backend_readiness() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare base jsonb; valid boolean;
begin
 base:=private.backend_readiness();
 valid:=to_regprocedure('public.create_business(uuid,text,text)') is not null
  and to_regprocedure('public.select_business(uuid,uuid)') is not null
  and not has_function_privilege('anon','public.create_business(uuid,text,text)','EXECUTE')
  and not has_function_privilege('anon','public.select_business(uuid,uuid)','EXECUTE')
  and has_function_privilege('authenticated','public.create_business(uuid,text,text)','EXECUTE')
  and has_function_privilege('authenticated','public.select_business(uuid,uuid)','EXECUTE')
  and not has_function_privilege('authenticated','private.backend_readiness()','EXECUTE')
  and not exists(select 1 from (values ('public.integration_connections','pending_shop'),('public.integration_connections','pending_expires_at'),('private.shopify_oauth_states','envelope'),('private.shopify_oauth_states','access_expires_at'),('private.shopify_oauth_states','refresh_expires_at'),('public.audit_events','business_id')) required(relation,column_name)
   where not exists(select 1 from pg_attribute where attrelid=to_regclass(required.relation) and attname=required.column_name and not attisdropped));
 return base || jsonb_build_object('version',2,'ready',(base->>'ready')::boolean and valid,'migrations',base->'migrations'||jsonb_build_object('005',valid));
end $$;
revoke all on function public.backend_readiness() from public,anon,authenticated;
grant execute on function public.backend_readiness() to service_role;
notify pgrst, 'reload schema';
commit;
