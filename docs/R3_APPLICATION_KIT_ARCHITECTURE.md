# R3 Application Kit Architecture

## Channel resolution

- `email_compose`: valid recruiter email; build a prefilled `mailto:` action.
- `link_handoff`: valid HTTP/HTTPS application URL; open the real source page.
- `unavailable`: no verified link or recruiter email; block handoff and request a real entry.

## Generated bundle

`application_packages.content_bundle` stores all application copy and the generated tailored resume. `submission_capability` records the supported handoff action. `prepared_at` records preparation time.

## Truth boundary

The generator may use only saved profile data, an existing resume, and verified evidence when evidence is used. It must not invent metrics, employers, projects, qualifications, or application outcomes.

## Submission state

Opening a mail client or recruitment page only writes `handoff_opened_at` and `last_submission_action`. The application remains `ready_to_submit` until the user explicitly confirms external submission.
