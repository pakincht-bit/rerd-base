---
description: Review product roadmap progress, reprioritize features, and plan the next sprint of work
---

# Roadmap Review Workflow

## Steps

1. **Read the Product Manager skill** — Load `.agents/skills/product-manager/SKILL.md` for frameworks.

2. **Check roadmap artifact** — Read the latest roadmap strategy document from the brain artifacts directory.

3. **Audit current state** — Scan `data/changelogData.ts` to see what's been shipped recently.

4. **Review open gaps** — Check codebase for TODO comments, incomplete features, and unfinished wiring (e.g., Supabase client exists but no auth UI).

5. **Reprioritize** — Apply RICE or Impact/Effort matrix to the remaining roadmap items based on current state.

6. **Recommend next feature** — Pick the highest-value, lowest-effort item that's currently unblocked.

7. **Deliver** — Update or create a roadmap progress artifact with:
   - What's been shipped since last review
   - Current priority ranking
   - Recommended next feature with brief spec
   - Risks or blockers identified
