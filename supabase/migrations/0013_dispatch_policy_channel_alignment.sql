set search_path = career_copilot, public, extensions;

alter table career_copilot.daily_application_policies
  alter column allowed_channels set default array['platform','boss','linkedin','bonjour','greenhouse','lever','company_form','email'],
  alter column allowed_workplaces set default array['remote','hybrid','onsite']::career_copilot.job_workplace[];

update career_copilot.daily_application_policies
set allowed_channels = (
      select array_agg(value order by position)
      from (
        select value, min(position) as position
        from unnest(array_prepend('platform', allowed_channels)) with ordinality as item(value, position)
        group by value
      ) deduplicated
    ),
    allowed_workplaces = array['remote','hybrid','onsite']::career_copilot.job_workplace[],
    updated_at = now();
