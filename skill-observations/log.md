# Skill Observation Log

Observations captured during task-oriented work.

**Status key:** OPEN = not yet actioned | ACTIONED (YYYY-MM-DD) = skill
updated/created | DECLINED (YYYY-MM-DD) = user decided not to pursue —
resolved statuses always carry their resolution date

---

## 2026-08-14

### Observation 1: Distinguish compile-time completeness from runtime readiness

**Status:** OPEN
**Date:** 2026-08-14
**Session context:** User asked whether the project is currently functional; review covered docs, source, builds, and host environment.
**Skill:** New skill candidate: project-readiness-review
**Type:** open-source
**Phase/Area:** Verification / reporting

**Issue:** A "is this functional?" review can look complete from source and docs while the host cannot actually run the app (missing Docker, database, env files). Reporting only the documented MVP status would have overstated readiness.

**Suggested improvement:** A short review skill that always splits the answer into (1) code completeness, (2) compile/build evidence, (3) runtime environment on this machine, and (4) known product gaps. Require an actual build or typecheck when dependencies can be installed, and an explicit "cannot run here" when infra is missing.

**Principle:** Completeness of the codebase is not the same as the product being runnable on the current machine; report both, with evidence.

### Observation 2: Match DATABASE_URL role when installing Homebrew PostgreSQL

**Status:** OPEN
**Date:** 2026-08-14
**Session context:** Lifting PermisoGT locally: installed PostgreSQL 16 via Homebrew, created DB, migrated, seeded, started API and portal.
**Skill:** New skill candidate: project-readiness-review
**Type:** open-source
**Phase/Area:** Local database bootstrap

**Issue:** Homebrew PostgreSQL creates a superuser named after the macOS account, not `postgres`. The app `.env` used `postgresql://postgres:postgres@localhost:5432/...`. Connecting without creating that role would fail even after a successful install.

**Suggested improvement:** When bootstrapping Postgres for an app whose URL specifies user `postgres`, create/align that role and password (and the named database) instead of assuming the default cluster user is enough. Prefer `prisma migrate deploy` plus seed over interactive `migrate dev` on an existing migration history.

**Principle:** Installing the database engine is not the same as matching the credentials and database name the application already expects.

### Observation 3: Recommended stack is enough when a plan asks the user to choose then says implement

**Status:** OPEN
**Date:** 2026-08-14
**Session context:** User attached a plan with per-phase options and then asked to implement it without restating A1/A5/B1/C1.
**Skill:** New skill candidate: project-readiness-review
**Type:** open-source
**Phase/Area:** Decision capture

**Issue:** The plan listed mutually exclusive vendors and a recommended combination. The implement instruction did not repeat the picks. Using the documented recommendation unblocked delivery; inventing a different mix would have been wrong.

**Suggested improvement:** When a plan includes a "recommended combination", treat that as the default implementation target unless the user names different letters. Record the choice in a decision log in the same change.

**Principle:** If a plan both asks for a choice and names a recommended default, implementing the default is the correct interpretation of "implement the plan as specified."

### Observation 4: Pin current Gemini Flash, not a remembered 2.x id

**Status:** OPEN
**Date:** 2026-08-14
**Session context:** Local PermisoGT document vision; free Gemini key rejected `gemini-2.0-flash` then `gemini-2.5-flash` for new users.
**Skill:** Existing skill gap: env/API vendor defaults
**Type:** project-specific
**Phase/Area:** Third-party model IDs

**Issue:** A hardcoded Flash id compiled and the key authenticated, but generateContent still 404'd because Google closes older Flash aliases to new keys. The UI then dumped the vendor JSON as a warning.

**Suggested improvement:** Default `GEMINI_MODEL` to the current Flash on the Gemini API (today `gemini-3.6-flash`). When the vendor returns "no longer available", surface a short Spanish hint to update `GEMINI_MODEL` instead of the raw JSON.

**Principle:** Vendor model aliases expire independently of API keys; verify the id against current docs when a 404 says the model is unavailable.
