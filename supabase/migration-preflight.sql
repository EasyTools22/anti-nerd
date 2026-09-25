-- Read-only catalog inspection. Run in the intended project's SQL Editor as postgres.
-- No application/user rows, credentials or function bodies are read.
-- Rerun after each migration. Presence is evidence, not a complete schema-drift audit.
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
 ('003','function','public.shopify_webhook(text,text,text,timestamp with time zone,jsonb)',null),
 ('004','function','public.backend_readiness()',null)
), inspected as (
 select e.*,
 case when kind='table' then to_regclass(object_name) is not null
      else to_regprocedure(object_name) is not null end as present,
 case when kind='table' then (select c.relrowsecurity from pg_class c where c.oid=to_regclass(object_name)) end as rls_enabled,
 case when kind='table' then (select count(*) from pg_policy p where p.polrelid=to_regclass(object_name)) end as policy_count
 from expected e
)
select migration, kind, object_name, present, require_rls, rls_enabled, policy_count
from inspected order by migration,kind,object_name;
