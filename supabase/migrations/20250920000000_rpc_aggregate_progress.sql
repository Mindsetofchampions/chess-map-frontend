-- Create RPC to return per-category totals and completed counts for the authenticated user
-- Returns jsonb with keys: character, health, exploration, stem, stewardship each containing { total int, completed int }

create or replace function public.rpc_get_student_progress()
returns table(category text, total int, completed int)
language sql stable security definer as $$
with quests_filtered as (
  select id, lower(coalesce(attribute_id::text, 'character')) as category
  from quests
  where active = true and status = 'approved'
),
user_completed as (
  select qs.quest_id
  from quest_submissions qs
  where qs.status in ('accepted','autograded') and qs.user_id = auth.uid()
)
select qf.category as category, count(*) as total,
  sum(case when qf.id in (select quest_id from user_completed) then 1 else 0 end) as completed
from quests_filtered qf
group by qf.category
order by qf.category;
$$;

-- Grant execute to authenticated
grant execute on function public.rpc_get_student_progress() to authenticated;
