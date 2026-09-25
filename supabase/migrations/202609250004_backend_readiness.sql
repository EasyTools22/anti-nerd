-- Read-only catalog attestation for the production readiness gate. No application rows read.
begin;
create function public.backend_readiness() returns jsonb
language sql stable security definer set search_path='' as $$
with expected(migration, kind, object_name, require_rls) as (
 values
 ('001','table','public.profiles',true),
 ('001','table','public.organizations',true),
 ('001','table','public.organization_members',true),
 ('001','table','public.businesses',true),
 ('001','table','public.integration_connections',true),
 ('001','table','public.provider_connections',true),
 ('001','table','public.organization_policies',true),
 ('001','table','public.actions',true),
 ('001','table','public.approvals',true),
 ('001','table','public.audit_events',true),
 ('001','table','public.business_instructions',true),
 ('001','table','private.rate_limits',false),
 ('001','function','private.actor_role(uuid,uuid)',null),
 ('001','function','private.member_role(uuid)',null),
 ('001','function','public.create_workspace(text,text,text)',null),
 ('001','function','public.save_instruction(uuid,uuid,uuid,text,integer,boolean)',null),
 ('001','function','public.set_policy(uuid,text,text,jsonb,integer)',null),
 ('001','function','public.consume_rate_limit(text,text)',null),
 ('002','function','public.policy_snapshot(uuid)',null),
 ('002','function','public.claim_approval(uuid,uuid,uuid,text,uuid)',null),
 ('002','function','public.reject_approval(uuid,uuid,uuid)',null),
 ('002','function','public.save_action(uuid,uuid,uuid,text,jsonb,jsonb)',null),
 ('003','table','private.shopify_credentials',true),
 ('003','table','private.shopify_oauth_states',true),
 ('003','table','private.shopify_deliveries',true),
 ('003','table','private.shopify_privacy_requests',true),
 ('003','function','public.shopify_operation(text,uuid,uuid,uuid,jsonb)',null),
 ('003','function','public.shopify_webhook(text,text,text,timestamp with time zone,jsonb)',null)
), inspected as (
 select e.*,
 case when kind='table' then to_regclass(object_name) is not null
      else to_regprocedure(object_name) is not null end as present,
 case when kind='table' then (select c.relrowsecurity from pg_class c where c.oid=to_regclass(object_name)) end as rls_enabled,
 case when kind='table' then (select count(*) from pg_policy p where p.polrelid=to_regclass(object_name)) end as policy_count
 from expected e
)
, checks as (
 select
 coalesce(bool_and(present),false) as objects_ready,
 coalesce(bool_and(case when require_rls then coalesce(rls_enabled,false) else true end),false) as rls_ready,
 coalesce(bool_and(case when kind='table' and object_name like 'public.%' then policy_count>0 else true end),false) as policies_ready,
 coalesce(bool_and(present) filter(where migration='001'),false) as m001,
 coalesce(bool_and(present) filter(where migration='002'),false) as m002,
 coalesce(bool_and(present) filter(where migration='003'),false) as m003
 from inspected
), permissions as (
 select not exists (
 select 1 from inspected i cross join (values ('anon'),('authenticated'),('service_role')) roles(role)
 where i.kind='table' and i.object_name like 'private.shopify_%'
 and (to_regclass(i.object_name) is null or has_table_privilege(roles.role,to_regclass(i.object_name),'SELECT,INSERT,UPDATE,DELETE,TRUNCATE'))
 ) and not exists (
 select 1 from inspected i cross join (values ('anon'),('authenticated')) roles(role)
 where i.kind='function' and i.object_name in (
 'public.consume_rate_limit(text,text)', 'public.claim_approval(uuid,uuid,uuid,text,uuid)',
 'public.reject_approval(uuid,uuid,uuid)', 'public.save_action(uuid,uuid,uuid,text,jsonb,jsonb)',
 'public.shopify_operation(text,uuid,uuid,uuid,jsonb)',
 'public.shopify_webhook(text,text,text,timestamp with time zone,jsonb)')
 and (to_regprocedure(i.object_name) is null or has_function_privilege(roles.role,to_regprocedure(i.object_name),'EXECUTE'))
 ) and not exists (
 select 1 from inspected i
 where i.kind='table' and i.object_name like 'public.%'
 and (to_regclass(i.object_name) is null
 or not has_table_privilege('authenticated',to_regclass(i.object_name),'SELECT')
 or has_table_privilege('authenticated',to_regclass(i.object_name),'INSERT,UPDATE,DELETE,TRUNCATE')
 or has_table_privilege('anon',to_regclass(i.object_name),'SELECT,INSERT,UPDATE,DELETE,TRUNCATE')
 or (i.object_name<>'public.profiles' and not has_table_privilege('service_role',to_regclass(i.object_name),'SELECT')))
 ) and not exists (
 select 1 from (values ('public.actions'),('public.audit_events')) required(relation)
 where to_regclass(required.relation) is null
 or not has_table_privilege('service_role',to_regclass(required.relation),'INSERT')
 ) and not exists (
 select 1 from inspected i where i.kind='function' and i.object_name like 'public.%'
 and (to_regprocedure(i.object_name) is null or not has_function_privilege(
 case when i.object_name in ('public.create_workspace(text,text,text)',
 'public.save_instruction(uuid,uuid,uuid,text,integer,boolean)',
 'public.set_policy(uuid,text,text,jsonb,integer)','public.policy_snapshot(uuid)')
 then 'authenticated' else 'service_role' end,to_regprocedure(i.object_name),'EXECUTE'))
 ) as ready
), columns_check as (
 select not exists (
 select 1 from (values
 ('public.integration_connections','shop_id'),('public.integration_connections','connection_health'),
 ('public.integration_connections','generation'),('public.integration_connections','refresh_lease'),
 ('public.integration_connections','access_expires_at'),('public.integration_connections','refresh_expires_at'),
 ('public.actions','execution_source'),('public.audit_events','integration_connection_id')
 ) required(relation,column_name)
 where not exists(select 1 from pg_attribute a where a.attrelid=to_regclass(required.relation) and a.attname=required.column_name and not a.attisdropped)
 ) as ready
)
select jsonb_build_object(
 'version',1,'ready',c.objects_ready and c.rls_ready and c.policies_ready and p.ready and x.ready,
 'migrations',jsonb_build_object('001',c.m001,'002',c.m002,'003',c.m003),
 'rls',c.rls_ready and c.policies_ready,'permissions',p.ready,'columns',x.ready
) from checks c cross join permissions p cross join columns_check x;
$$;
revoke all on function public.backend_readiness() from public,anon,authenticated;
grant execute on function public.backend_readiness() to service_role;
notify pgrst, 'reload schema';
commit;
