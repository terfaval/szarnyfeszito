# Szárnyfeszítő – Development Agent Guide (Studio + Explorer)

This repository follows a **phase-driven, audit-first development model**.
The goal is controlled iteration, reversible changes, and deterministic builds.

The system has two surfaces:

1) STUDIO (Admin / Keltető)
   - Entity CRUD (Bird / Place / Phenomenon)
   - AI content generation (server-side only)
   - Review & approval workflow
   - Publish gating (state-driven)

2) EXPLORER (Read-only experience skeleton)
   - Landing (anon) + Auth routing
   - Logged-in map (Leaflet + OSM)
   - Overlay panels (Place / Bird / Phenomenon)
   - Reads only from published + approved content
   - No runtime AI

Explorer exists to validate content contracts.
Studio remains the canonical content engine.

------------------------------------------------------------
0) PRIME DIRECTIVES
------------------------------------------------------------

• Scope-lock enforced.  
  If a feature is not in SPEC.md, governance update is required first.

• AI is server-side only.
  No runtime generation in Explorer.

• No hardcoded model names.
  Models come from ENV/config.

• Publish gating is enforced server-side.

• No architectural refactors without DECISION entry (D#).

• Secrets never committed.

------------------------------------------------------------
1) DEVELOPMENT MODEL (MANDATORY)
------------------------------------------------------------

We follow the F0–F4 cycle for every module.

------------------------------------------------------------
F0 – Ideation
------------------------------------------------------------

Goal:
Clarify the problem before writing code.

Output:
- 3–6 bullet problem framing
- Scope boundary
- Explicit NON-goals
- Open questions

No code yet.

------------------------------------------------------------
F1 – AUDIT (State Mapping)
------------------------------------------------------------

Goal:
Understand the real system state.

Requirements:
- Repo inventory (routes, libs, DB tables)
- Identify active vs legacy vs incomplete logic
- Detect implicit coupling

Mandatory Audit Output:

• All affected file paths (and line refs if known)
• List of faulty behaviors (BB-xx):
  symptom → suspected cause → affected module
• Short code snippets proving the claim
• Prioritized fix suggestions (P0/P1/P2)
• NO PATCH in audit mode
• Handoff instructions:
  - Where to start and why
  - Minimal test evidence required
  - Required inputs if DB/route access missing
  - Known traps (encoding, null vs empty string, enum drift)

If DB access is unavailable:
Do NOT claim queries were executed.
Explicitly request evidence (exported rows, API payloads).

------------------------------------------------------------
F2 – DESIGN
------------------------------------------------------------

Goal:
Make decisions explicit.

Required:
- Canonical payload definition
- Fallback logic
- Stop rules
- Retry / failure behavior
- State transitions

If UX or meaning changes:
User approval required before build.

Output:
Short design spec or D# decision entry.

------------------------------------------------------------
F3 – BUILD
------------------------------------------------------------

Goal:
Deterministic implementation.

Rules:
- Follow audit findings only.
- Stay inside scope.
- No silent refactors.
- PR-ready diff.

------------------------------------------------------------
F4 – CHECK
------------------------------------------------------------

Goal:
Validate correctness.

Include:
- Happy path smoke
- Failure path smoke
- Log/trace confirmation
- Regression check

Final output:
DONE / ITERATE / ROLLBACK

------------------------------------------------------------
2) RHYTHM
------------------------------------------------------------

1 module = 1 full F0–F4 cycle.

Small fixes may run:
F1 → F3 → F4

At module close:
Short summary required.

------------------------------------------------------------
3) CANONICAL PAYLOAD RULE
------------------------------------------------------------

If a domain defines a canonical payload:
- That payload is the primary UI source.
- Everything else is fallback only.

Forbidden:
- Stitching multiple payloads in UI.
- Reinterpreting domain data inside UI.
- Generating new semantic meaning client-side.

Studio owns content semantics.
Explorer renders it.

------------------------------------------------------------
4) CONTENT SYSTEM CONTRACT
------------------------------------------------------------

Two content types:

A) Field-Guide Dossier (Bird only)
   - Structured JSON
   - Versioned schema
   - Used in Studio workflows

B) UI Variants (Bird / Place / Phenomenon)
   - short / long / feature_block / etc.
   - Used in Explorer panels

Explorer must consume UI variants where defined.
Dossier is not the primary Explorer contract unless specified.

------------------------------------------------------------
5) STATE MACHINES
------------------------------------------------------------

Bird:
draft → text_generated → text_approved
→ images_generated → images_approved → published

Publishing allowed only if:
- text approved
- required images approved (per SPEC)

Explorer only displays:
- published entities
- approved content_blocks
- approved images

No rollback after publish (v0).

------------------------------------------------------------
6) IMAGE SYSTEM
------------------------------------------------------------

Scientific:
- main_habitat
- standing_clean
- flight_clean

Iconic:
- fixed_pose_icon_v1

Do not add new variants without SPEC + D# decision.

------------------------------------------------------------
7) GOVERNANCE-FIRST RULE
------------------------------------------------------------

Before expanding functionality:

1. Align SPEC.md
2. Align DECISIONS.md
3. Resolve contradictions
4. Define data contracts clearly

Only then implement.

------------------------------------------------------------
8) CODE QUALITY RULES
------------------------------------------------------------

• Strict schema validation for AI outputs.
• No client exposure of service role keys.
• Config centralized.
• Typed contracts preferred.
• No stringly-typed DB assumptions.

------------------------------------------------------------
9) PATCH PROTOCOL
------------------------------------------------------------

Patch only if:
- Current file state is known
OR
- File was opened during audit

Each patch must include:
- File path
- Before/after snippet
- Short reasoning

------------------------------------------------------------
END OF AGENT
------------------------------------------------------------