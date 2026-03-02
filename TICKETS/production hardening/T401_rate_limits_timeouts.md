# T401 – Rate Limits & Timeouts

## Goal
Prevent abuse and handle long-running requests safely.

## Scope
- Server-side request timeout strategy
- Per-admin rate limit (simple in-memory ok v0)
- Clear error messages

## Acceptance Criteria
- No hanging requests
- Graceful failure paths
