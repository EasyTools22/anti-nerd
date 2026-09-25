begin;
grant select,insert on public.actions to service_role;
grant select on public.approvals to service_role;
grant select,insert on public.audit_events to service_role;
grant select on public.organization_members,public.organizations,public.businesses,public.organization_policies to service_role;
create function public.policy_snapshot(org uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('organizationId',o.id,'revision',o.policy_revision,'rules',coalesce((select jsonb_object_agg(p.capability,jsonb_strip_nulls(jsonb_build_object('mode',p.mode,'limits',p.limits))) from public.organization_policies p where p.organization_id=o.id),'{}'::jsonb)) from public.organizations o where o.id=org
$$;
revoke all on function public.policy_snapshot(uuid) from public,anon;
grant execute on function public.policy_snapshot(uuid) to authenticated;
create function public.claim_approval(org uuid, action uuid, approval uuid, fingerprint text, actor uuid) returns boolean
 language plpgsql security definer set search_path='' as $$
 declare rev integer; claimed uuid;
 begin
 if private.actor_role(org,actor) is distinct from 'owner' then raise exception 'NOT_AUTHORIZED'; end if;
 -- Same lock order as policy updates: organization before approval/action. Database clock only.
 select policy_revision into rev from public.organizations where id=org for update;
 update public.approvals p set approved_by=actor,consumed_at=clock_timestamp()
 where p.organization_id=org and p.action_id=action and p.id=approval and p.proposal_fingerprint=fingerprint
 and p.policy_revision=rev and p.expires_at>clock_timestamp() and p.consumed_at is null
 and exists(select 1 from public.actions a where a.organization_id=org and a.id=action and a.proposal_fingerprint=fingerprint and a.status='awaiting_approval') returning p.id into claimed;
 return claimed is not null;
 end $$;
create function public.reject_approval(org uuid, approval uuid, actor uuid) returns boolean
 language plpgsql security definer set search_path='' as $$
 declare a uuid;
 begin
 if private.actor_role(org,actor) is distinct from 'owner' then raise exception 'NOT_AUTHORIZED'; end if;
 perform 1 from public.organizations where id=org for update;
 update public.approvals set rejected_by=actor,consumed_at=clock_timestamp() where organization_id=org and id=approval and consumed_at is null and expires_at>clock_timestamp() returning action_id into a;
 if a is null then return false; end if;
 update public.actions set status='rejected' where organization_id=org and id=a;
 insert into public.audit_events(id,organization_id,action_id,actor_id,agent,provider,action_type,resource,reason,confidence,policy_decision,change_parameters,result,source,requested_at)
 select gen_random_uuid(),org,id,actor,agent,provider,'approval.rejected',resource_id,'Owner rejected this action.',confidence,coalesce(receipt->'decision','{}'),jsonb_build_object('tool',tool,'input',proposal->'input'),'rejected','mock',created_at from public.actions where id=a;
 return true;
 end $$;
-- Atomic receipt + approval persistence, immutable proposal and guarded state transitions.
create function public.save_action(org uuid, action uuid, actor uuid, fingerprint text, receipt_data jsonb, approval_data jsonb) returns void
 language plpgsql security definer set search_path='' as $$
 declare row public.actions; rev integer; st text:=receipt_data->>'status';
 begin
 if private.actor_role(org,actor) is null then raise exception 'NOT_AUTHORIZED'; end if;
 select policy_revision into rev from public.organizations where id=org for update;
 select * into row from public.actions where organization_id=org and id=action for update;
 if row.id is null or row.proposal_fingerprint<>fingerprint or (row.actor_id<>actor and private.actor_role(org,actor)<>'owner') then raise exception 'INVALID_ACTION'; end if;
 if row.status in ('succeeded','failed','denied','not_implemented','rejected') then raise exception 'INVALID_ACTION'; end if;
 if row.status='awaiting_approval' and not exists(select 1 from public.approvals where action_id=action and approved_by=actor and consumed_at is not null) then raise exception 'INVALID_ACTION'; end if;
 if st='awaiting_approval' then
 if approval_data is null or (approval_data->>'policyRevision')::integer<>rev then raise exception 'POLICY_CHANGED'; end if;
 insert into public.approvals(id,organization_id,action_id,proposal_fingerprint,policy_revision,expires_at)
 values((approval_data->>'id')::uuid,org,action,fingerprint,rev,least((approval_data->>'expiresAt')::timestamptz,clock_timestamp()+interval '15 minutes'));
 end if;
 update public.actions set status=st,policy_revision=(receipt_data->'decision'->>'policyRevision')::integer,receipt=receipt_data-'data' where id=action;
 end $$;
revoke all on function public.claim_approval(uuid,uuid,uuid,text,uuid),public.reject_approval(uuid,uuid,uuid),public.save_action(uuid,uuid,uuid,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.claim_approval(uuid,uuid,uuid,text,uuid),public.reject_approval(uuid,uuid,uuid),public.save_action(uuid,uuid,uuid,text,jsonb,jsonb) to service_role;
commit;
