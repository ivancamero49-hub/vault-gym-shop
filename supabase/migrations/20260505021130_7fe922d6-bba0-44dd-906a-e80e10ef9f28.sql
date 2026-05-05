
-- Recreate view with security_invoker (RLS applies to caller)
drop view if exists public.v_credit_balance;
create view public.v_credit_balance with (security_invoker = true) as
select user_id, period_start, coalesce(sum(amount),0)::int as balance
from public.credit_ledger
group by user_id, period_start;

-- Lock down SECURITY DEFINER functions
revoke all on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;
-- handle_new_user is only invoked by the trigger; no grants needed.

revoke all on function public.touch_updated_at() from public, anon, authenticated;
