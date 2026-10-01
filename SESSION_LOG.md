# Apex Persona build session log

## Source of truth

Implementation decisions are based on the three planning documents at the repository root. The target deployment is DirectAdmin with Node.js, MySQL, and SSH. The MVP is an auditable learning pipeline across Layers 0–4; persona identity synthesis, public chat, and autonomous actions remain deferred.

## Engineering checkpoints

### Milestone 1 — Persona seed and bounded learning plan

**Implemented:** Initial MySQL schema for the Layers 0–4 entities; Node.js 20+ / Express API; MySQL connection pool and guarded first-install setup; persona-seed validation; deterministic research-plan generation covering eight intent classes; learning-run audit creation; query-plan review endpoints; GitHub Actions workflow provisioned with MySQL 8 for integration checks; DirectAdmin deployment guidance.

**Local checks:** `npm test` — 10 passed, 0 failed, 1 MySQL integration test skipped because this workstation has no accessible MySQL service. `node --check` passed for all 11 JavaScript source and test files. Dependency install completed with 0 reported vulnerabilities.

**Status: COMPLETE.** GitHub Actions run [#15](https://github.com/apexsolutions78/Apex-Persona/actions/runs/36875225868) completed successfully on 2026-10-01. The MySQL 8 service started, dependencies installed, guarded schema setup passed, and `npm test` passed with the MySQL integration enabled. The `mysql-api` job and all listed steps succeeded. No application data or credentials are stored in Git.

**Next:** Begin milestone 2 — bounded document ingestion, normalization, durable file storage, and provenance records. Gate the milestone on hostile-URL protections, file size/type limits, deduplication, parser failure handling, and MySQL integration tests.

## Deployment notes

- App root for DirectAdmin: `mvp`
- Startup file: `src/index.js`
- Runtime: Node.js 20 or newer; use the `PORT` supplied by DirectAdmin/Passenger.
- Database: MySQL 8.0.16+ (so declared check constraints are enforced).
- First deployment: create an empty application database/user, set environment variables, run `npm ci`, run `npm run db:setup` once, then restart the app.
- `mvp/.env` and local raw/normalized document storage are excluded from Git.

## Git state

The supplied GitHub remote is connected and the full milestone 1 checkpoint has been published to `main`. MySQL integration passed in GitHub Actions run #15. The local CLI cannot update this checkout's `.git` metadata due to filesystem permissions; GitHub API commits are present remotely. The repository remains ready for server-side `git pull` over SSH.

