-- Career Copilot V2 - RLS and grants fixes for shared job pool.
-- Repairs policies created in 0008/0015 that referenced the old public schema
-- or required job ownership, which breaks scoring/alignment on shared public jobs.

-- job_scores: allow every authenticated user to score shared public jobs.
drop policy if exists job_scores_owner_all on career_copilot.job_scores;
create policy job_scores_owner_all on career_copilot.job_scores
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on career_copilot.job_scores to authenticated;

-- resume_alignments: allow aligning any usable resume version against any
-- visible job (shared pool), not only jobs owned by the current user.
drop policy if exists resume_alignments_owner_all on career_copilot.resume_alignments;
create policy resume_alignments_owner_all on career_copilot.resume_alignments
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from career_copilot.resume_versions r
      join career_copilot.profiles p on p.id = r.profile_id
      where r.id = resume_alignments.resume_version_id and p.user_id = (select auth.uid())
    )
  );
grant select, insert, update, delete on career_copilot.resume_alignments to authenticated;

-- daily_recommendations: the daily generation writes rows for the current
-- user; the original migration only granted SELECT and a select policy.
grant insert, update, delete on career_copilot.daily_recommendations to authenticated;
drop policy if exists daily_recommendations_owner_insert on career_copilot.daily_recommendations;
create policy daily_recommendations_owner_insert on career_copilot.daily_recommendations
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
drop policy if exists daily_recommendations_owner_update on career_copilot.daily_recommendations;
create policy daily_recommendations_owner_update on career_copilot.daily_recommendations
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists daily_recommendations_owner_delete on career_copilot.daily_recommendations;
create policy daily_recommendations_owner_delete on career_copilot.daily_recommendations
  for delete to authenticated
  using ((select auth.uid()) = user_id);
