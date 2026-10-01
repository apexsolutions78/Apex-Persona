# Apex Persona

A governed learning system that starts from an empty persona seed, learns from bounded sources, creates traceable knowledge atoms, scores evidence and uncertainty, and retrieves supported knowledge with its provenance. Persona identity synthesis and public chat are later layers, not the first MVP.

## Current implementation

The MVP is a Node.js API backed by MySQL. The first milestone implements persona specifications, policy snapshots, a bounded 10–30 query research plan, query approval, and learning-run audit records. Later milestones add document ingestion, atom extraction, validation, review, and retrieval.

See the planning source documents in this repository and the API guide in [mvp/README.md](mvp/README.md).

## DirectAdmin deployment

1. Create a MySQL database and a dedicated database user in DirectAdmin. Grant that user access only to the application database.
2. Enable a supported Node.js version (20 or newer) and set the Node application root to `mvp`, startup file to `src/index.js`, and production environment variables in DirectAdmin.
3. Pull the repository through SSH in the application directory. Install the exact locked dependencies with `npm ci`.
4. Configure `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, and the DirectAdmin supplied `PORT`. Keep `.env` and all credentials out of Git.
5. From `mvp`, run `npm run db:setup` once against a new, empty database, then restart the Node application in DirectAdmin.
6. Verify `GET /health`; it reports the API and database connection state.

The setup command refuses to install into a database containing untracked tables. Back up any existing database and use a reviewed migration before upgrading a deployed version.

## Local development

Copy `mvp/.env.example` to `mvp/.env`, set the MySQL connection values, install with `npm ci`, run `npm run db:setup`, then start with `npm run dev`. Run `npm test` for unit and database integration checks. Set `RUN_MYSQL_INTEGRATION=1` and point the DB variables at a prepared MySQL schema to enable the integration test; GitHub Actions provisions MySQL automatically.

The repository intentionally does not contain `.env`, raw source documents, normalized files, or local storage contents.

