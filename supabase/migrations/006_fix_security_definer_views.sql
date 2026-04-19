-- Fix Supabase lint: security_definer_view
-- Keep existing view definitions intact and only enforce invoker security semantics.

alter view if exists public.activities_full
  set (security_invoker = true);

alter view if exists public.messages_full
  set (security_invoker = true);
