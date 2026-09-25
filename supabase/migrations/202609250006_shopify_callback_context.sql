-- Recover only a verified user's own durable OAuth attempt. No credentials exposed.
begin;
create function public.shopify_oauth_context(state_digest text, actor uuid, operation text default 'lookup') returns jsonb
language plpgsql security definer set search_path='' as $$
declare s private.shopify_oauth_states; c public.integration_connections;
begin
 if state_digest is null or state_digest !~ '^[a-f0-9]{64}$' or actor is null or operation is null or operation not in ('lookup','cancel') then raise exception 'INVALID_STATE'; end if;
 -- Connection first, then state: same lock order as begin/consume/commit.
 select i.* into c from public.integration_connections i join private.shopify_oauth_states o on o.connection_id=i.id
 where o.digest=state_digest and o.actor_id=actor for update of i;
 if c.id is null then return null; end if;
 select * into s from private.shopify_oauth_states o where o.digest=state_digest and o.actor_id=actor
  and o.connection_id=c.id and o.organization_id=c.organization_id and o.business_id=c.business_id and o.generation=c.generation for update;
 if s.digest is null then return null; end if;
 if operation='cancel' then
  -- A duplicate/bad callback must never cancel another in-flight code exchange.
  if s.consumed_at is null or s.expires_at<=clock_timestamp() then
   delete from private.shopify_oauth_states where digest=s.digest;
   update public.integration_connections set pending_shop=null,pending_expires_at=null where id=c.id and generation=s.generation;
   perform private.shopify_audit(c,'connection_failed',actor);
  end if;
  return null;
 end if;
 if s.consumed_at is not null or private.actor_role(s.organization_id,actor) is distinct from 'owner'
  or not exists(select 1 from public.businesses b where b.id=s.business_id and b.organization_id=s.organization_id and b.status='active') then return null; end if;
 -- Expired metadata may restore the business for a retry, but cannot authorize
 -- execution: the existing atomic consume RPC independently enforces expiry.
 return jsonb_build_object('organizationId',s.organization_id,'businessId',s.business_id,'actorId',s.actor_id,
  'connectionId',s.connection_id,'generation',s.generation,'expiresAt',s.expires_at);
end $$;
revoke all on function public.shopify_oauth_context(text,uuid,text) from public,anon,authenticated;
grant execute on function public.shopify_oauth_context(text,uuid,text) to service_role;

create function public.shopify_pending(org uuid,business uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('domain',s.shop,'expiresAt',least(s.expires_at,c.pending_expires_at))
 from private.shopify_oauth_states s join public.integration_connections c on c.id=s.connection_id
 join public.businesses b on b.id=s.business_id and b.organization_id=s.organization_id
 where s.organization_id=org and s.business_id=business and private.member_role(org) is not null
 and b.status='active' and private.actor_role(org,s.actor_id)='owner'
 and c.organization_id=org and c.business_id=business and c.generation=s.generation
 and c.pending_shop=s.shop and c.pending_expires_at>now() and s.expires_at>now()
 limit 1
$$;
revoke all on function public.shopify_pending(uuid,uuid) from public,anon,service_role;
grant execute on function public.shopify_pending(uuid,uuid) to authenticated;

-- Keep version 2 compatible with the currently deployed code during rollout.
alter function public.backend_readiness() rename to commerce_readiness;
alter function public.commerce_readiness() set schema private;
revoke all on function private.commerce_readiness() from public,anon,authenticated,service_role;
create function public.backend_readiness() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare base jsonb; valid boolean;
begin
 base:=private.commerce_readiness();
 valid:=to_regprocedure('public.shopify_oauth_context(text,uuid,text)') is not null
  and to_regprocedure('public.shopify_pending(uuid,uuid)') is not null
  and not has_function_privilege('anon','public.shopify_oauth_context(text,uuid,text)','EXECUTE')
  and not has_function_privilege('authenticated','public.shopify_oauth_context(text,uuid,text)','EXECUTE')
  and has_function_privilege('service_role','public.shopify_oauth_context(text,uuid,text)','EXECUTE')
  and not has_function_privilege('anon','public.shopify_pending(uuid,uuid)','EXECUTE')
  and not has_function_privilege('service_role','public.shopify_pending(uuid,uuid)','EXECUTE')
  and has_function_privilege('authenticated','public.shopify_pending(uuid,uuid)','EXECUTE')
  and not has_function_privilege('authenticated','private.commerce_readiness()','EXECUTE');
 return base || jsonb_build_object('ready',(base->>'ready')::boolean and valid,'migrations',base->'migrations'||jsonb_build_object('006',valid));
end $$;
revoke all on function public.backend_readiness() from public,anon,authenticated;
grant execute on function public.backend_readiness() to service_role;
notify pgrst, 'reload schema';
commit;
