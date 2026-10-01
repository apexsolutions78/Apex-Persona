import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { pool, withTransaction } from '../db/pool.js';
import { generateQueryPlan } from '../services/planning.js';
import { validatePersonaInput, validateRunType } from '../services/persona-validation.js';

const router = Router();
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value) => typeof value === 'string' && uuidPattern.test(value);
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

router.post('/personas', asyncRoute(async (req, res) => {
  const errors = validatePersonaInput(req.body);
  if (errors.length) return res.status(400).json({ error: 'Invalid persona specification', details: errors });
  const input = req.body;
  const sourcePolicy = {
    allowed_source_types: ['web_page', 'pdf', 'paper', 'book', 'uploaded_file'],
    allowed_domains: [],
    prohibited_domains: [],
    max_documents_per_run: 100,
    ...(input.source_policy ?? {}),
  };
  if (!Array.isArray(sourcePolicy.allowed_source_types) || !Array.isArray(sourcePolicy.allowed_domains) || !Array.isArray(sourcePolicy.prohibited_domains)) {
    return res.status(400).json({ error: 'source_policy domain and source type rules must be arrays' });
  }
  if (!Number.isInteger(sourcePolicy.max_documents_per_run) || sourcePolicy.max_documents_per_run < 1 || sourcePolicy.max_documents_per_run > 1000) {
    return res.status(400).json({ error: 'source_policy.max_documents_per_run must be between 1 and 1,000' });
  }
  const id = randomUUID();
  await pool.execute(
    `INSERT INTO persona_specs
      (id, name, learning_goal, role_description, scope_json, risk_level,
       freshness_policy_json, source_policy_json, learning_policy_json, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, input.name.trim(), input.learning_goal.trim(), input.role_description?.trim() || null,
      JSON.stringify(input.scope), input.risk_level ?? 'medium',
      JSON.stringify(input.freshness_policy ?? { fast_changing_domain: false, preferred_age_months: 24 }),
      JSON.stringify(sourcePolicy),
      JSON.stringify(input.learning_policy ?? { minimum_core_confidence: 0.70, minimum_sources_for_high_confidence: 2, human_review_threshold: 0.45 }),
      input.created_by?.trim() || 'local-user'],
  );
  const [rows] = await pool.execute('SELECT * FROM persona_specs WHERE id = ?', [id]);
  res.status(201).json(rows[0]);
}));

router.get('/personas', asyncRoute(async (req, res) => {
  const limit = boundedInteger(req.query.limit, 50, 1, 100);
  const offset = boundedInteger(req.query.offset, 0, 0, 1_000_000);
  const [rows] = await pool.execute(
    'SELECT * FROM persona_specs ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset],
  );
  res.json({ items: rows, limit, offset });
}));

router.get('/personas/:personaId', asyncRoute(async (req, res) => {
  if (!isUuid(req.params.personaId)) return res.status(400).json({ error: 'personaId must be a UUID' });
  const [rows] = await pool.execute('SELECT * FROM persona_specs WHERE id = ?', [req.params.personaId]);
  if (!rows.length) return res.status(404).json({ error: 'Persona specification not found' });
  res.json(rows[0]);
}));

router.post('/personas/:personaId/learning-runs', asyncRoute(async (req, res) => {
  const { personaId } = req.params;
  if (!isUuid(personaId)) return res.status(400).json({ error: 'personaId must be a UUID' });
  const [personas] = await pool.execute('SELECT * FROM persona_specs WHERE id = ?', [personaId]);
  if (!personas.length) return res.status(404).json({ error: 'Persona specification not found' });
  const persona = personas[0];
  if (persona.status === 'archived') return res.status(409).json({ error: 'Archived persona specifications cannot start new learning runs' });
  const runType = req.body?.run_type ?? 'initial_build';
  if (!validateRunType(runType)) return res.status(400).json({ error: 'Unsupported run_type' });
  if (req.body?.created_by !== undefined && (typeof req.body.created_by !== 'string' || req.body.created_by.length > 200)) {
    return res.status(400).json({ error: 'created_by must be a string of at most 200 characters' });
  }
  const scope = typeof persona.scope_json === 'string' ? JSON.parse(persona.scope_json) : persona.scope_json;
  let plan;
  try {
    plan = generateQueryPlan({ learningGoal: persona.learning_goal, includeTopics: scope.include_topics ?? [], excludeTopics: scope.exclude_topics ?? [] });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  const runId = randomUUID();
  await withTransaction(async (connection) => {
    await connection.execute(
      `INSERT INTO learning_runs
        (id, persona_spec_id, run_type, status, config_snapshot_json, summary_json, created_by)
       VALUES (?, ?, ?, 'queued', ?, ?, ?)`,
      [runId, personaId, runType, JSON.stringify({ scope, source_policy: persona.source_policy_json, freshness_policy: persona.freshness_policy_json, learning_policy: persona.learning_policy_json }), JSON.stringify({ queries_planned: plan.length }), req.body?.created_by?.trim() || 'local-user'],
    );
    for (const item of plan) {
      await connection.execute(
        `INSERT INTO query_plans
          (id, learning_run_id, persona_spec_id, objective, topic, query_text, query_type, target_source_classes, priority, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'planned')`,
        [randomUUID(), runId, personaId, persona.learning_goal, item.topic, item.query_text, item.query_type,
          JSON.stringify(item.target_source_classes), item.priority],
      );
    }
  });
  const run = await getRun(runId);
  res.status(201).json(run);
}));

router.get('/personas/:personaId/learning-runs', asyncRoute(async (req, res) => {
  if (!isUuid(req.params.personaId)) return res.status(400).json({ error: 'personaId must be a UUID' });
  const [rows] = await pool.execute(
    'SELECT * FROM learning_runs WHERE persona_spec_id = ? ORDER BY created_at DESC LIMIT 100',
    [req.params.personaId],
  );
  res.json(rows);
}));

router.get('/learning-runs/:runId', asyncRoute(async (req, res) => {
  if (!isUuid(req.params.runId)) return res.status(400).json({ error: 'runId must be a UUID' });
  const run = await getRun(req.params.runId);
  if (!run) return res.status(404).json({ error: 'Learning run not found' });
  res.json(run);
}));

router.patch('/learning-runs/:runId/query-plan', asyncRoute(async (req, res) => {
  const { runId } = req.params;
  const { query_ids: queryIds, decision } = req.body ?? {};
  if (!isUuid(runId)) return res.status(400).json({ error: 'runId must be a UUID' });
  if (!Array.isArray(queryIds) || !queryIds.length || queryIds.length > 30 || !queryIds.every(isUuid)) {
    return res.status(400).json({ error: 'query_ids must contain 1–30 UUIDs' });
  }
  if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'decision must be approved or rejected' });
  await withTransaction(async (connection) => {
    const [runRows] = await connection.execute('SELECT id FROM learning_runs WHERE id = ? FOR UPDATE', [runId]);
    if (!runRows.length) return;
    for (const queryId of new Set(queryIds)) {
      const [result] = await connection.execute(
        'UPDATE query_plans SET status = ? WHERE id = ? AND learning_run_id = ? AND status = \'planned\'',
        [decision, queryId, runId],
      );
      if (!result.affectedRows) throw Object.assign(new Error(`Query ${queryId} is not a planned query in this run`), { statusCode: 400 });
    }
  });
  const run = await getRun(runId);
  if (!run) return res.status(404).json({ error: 'Learning run not found' });
  res.json(run);
}));

router.patch('/learning-runs/:runId/status', asyncRoute(async (req, res) => {
  const { runId } = req.params;
  const { status } = req.body ?? {};
  const allowed = new Set(['queued', 'running', 'completed', 'failed', 'cancelled']);
  if (!isUuid(runId)) return res.status(400).json({ error: 'runId must be a UUID' });
  if (!allowed.has(status)) return res.status(400).json({ error: 'Unsupported learning run status' });
  const [result] = await pool.execute(
    `UPDATE learning_runs SET status = ?,
      started_at = CASE WHEN ? = 'running' THEN COALESCE(started_at, UTC_TIMESTAMP(3)) ELSE started_at END,
      completed_at = CASE WHEN ? IN ('completed','failed','cancelled') THEN UTC_TIMESTAMP(3) WHEN ? = 'running' THEN NULL ELSE completed_at END
     WHERE id = ?`,
    [status, status, status, status, runId],
  );
  if (!result.affectedRows) return res.status(404).json({ error: 'Learning run not found' });
  res.json(await getRun(runId));
}));

async function getRun(runId) {
  const [runs] = await pool.execute('SELECT * FROM learning_runs WHERE id = ?', [runId]);
  if (!runs.length) return null;
  const [queryPlans] = await pool.execute('SELECT * FROM query_plans WHERE learning_run_id = ? ORDER BY priority DESC, created_at', [runId]);
  return { ...runs[0], query_plan: queryPlans };
}

function boundedInteger(value, fallback, min, max) {
  const number = Number.parseInt(value ?? '', 10);
  return Number.isInteger(number) ? Math.min(Math.max(number, min), max) : fallback;
}

export { router };
