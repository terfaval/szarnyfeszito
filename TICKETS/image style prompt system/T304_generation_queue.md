# T304 – Generation Queue (v0 light)

## Goal
Prevent UI blocking and enable retries.

## Scope
- Introduce a simple jobs table (generation_jobs):
  - id, entity_type, entity_id, job_type(text/images), status, attempts, error
- API routes create job + return job_id
- Admin UI polls job status

## Acceptance Criteria
- Image generation doesn’t time out UI
- Retry works (max attempts)
