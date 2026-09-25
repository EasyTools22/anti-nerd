-- Read-only verification after migration 006; run in the intended SQL Editor as postgres.
select public.backend_readiness();
select n.nspname as schema_name,c.relname,c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where (n.nspname='public' and c.relname in ('businesses','organization_members','integration_connections','actions','audit_events'))
   or (n.nspname='private' and c.relname in ('shopify_credentials','shopify_oauth_states','shopify_deliveries','shopify_privacy_requests'))
order by 1,2;
select routine,
 has_function_privilege('anon',routine,'EXECUTE') as anon_can_execute,
 has_function_privilege('authenticated',routine,'EXECUTE') as member_can_execute,
 has_function_privilege('service_role',routine,'EXECUTE') as server_can_execute
from (values ('public.create_business(uuid,text,text)'),('public.select_business(uuid,uuid)'),('public.shopify_operation(text,uuid,uuid,uuid,jsonb)'),('public.backend_readiness()'),('public.shopify_oauth_context(text,uuid,text)'),('public.shopify_pending(uuid,uuid)')) r(routine);
-- Business/pending RPCs: false,true,false. Shopify/context/readiness RPCs: false,false,true.
