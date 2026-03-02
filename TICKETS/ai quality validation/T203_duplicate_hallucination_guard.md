# T203 – Hallucination/Duplication Guardrails

## Goal
Catch common failure modes (repetition, improbable claims).

## Scope
- Basic heuristics:
  - repeated sentences detection
  - forbidden tone patterns (excess slang)
  - banned claims list (config file)
- Flag content as needs_review with reasons

## Acceptance Criteria
- Flags displayed in UI
- Approval requires acknowledging flags
