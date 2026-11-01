# Congelador agent instructions

These instructions apply throughout this repository.

## Shared PWA baseline

Before making changes to the PWA, read
[`../pwa/AGENTS.md`](../pwa/AGENTS.md) as the shared trekm / BaseCentral PWA
baseline. Adopted revision: **2026-10-27, decision set 6**. Read the current shared
file on subsequent work; this adoption date does not freeze the baseline.

These are requirements for new work and audits, not a claim that the existing
app already complies. Preserve app-specific domain and data-integrity rules.
If the sibling baseline is unavailable, report that it could not be checked
and use a reviewed copy with its source/revision recorded; do not silently
substitute weaker rules or block unrelated safe maintenance.

Adoption alone does not authorize data migrations, runtime changes, pushes or
production deployment. Implement those only within the user's requested scope.

## Project context

Read [SUMMARY.md](SUMMARY.md) and [README.md](README.md) before changing
behavior, and verify their descriptions against current source. Preserve the
local inventory, JSON backup/restore and established mobile editing and A4/PDF
workflows. Read `scripts/deploy.sh` and README before deployment-related work.
Use the actual project checks documented in README; documentation-only adoption
does not require a runtime version bump.
