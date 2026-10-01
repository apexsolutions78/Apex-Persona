import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePersonaInput, validateRunType } from '../src/services/persona-validation.js';

const validPersona = {
  name: 'Product manager',
  learning_goal: 'Learn the knowledge required to become a competent product manager',
  scope: { include_topics: ['discovery', 'roadmapping'], exclude_topics: ['stock trading'] },
};

test('persona seed with a bounded scope is accepted', () => {
  assert.deepEqual(validatePersonaInput(validPersona), []);
});

test('missing goal and scope boundaries are rejected', () => {
  const errors = validatePersonaInput({ name: 'No scope', learning_goal: 'Learn a topic', scope: { include_topics: [], exclude_topics: [] } });
  assert.ok(errors.some((error) => error.startsWith('scope must include')));
});

test('source policies reject unknown source types and unbounded document counts', () => {
  const errors = validatePersonaInput({
    ...validPersona,
    source_policy: { allowed_source_types: ['magic'], max_documents_per_run: 0 },
  });
  assert.ok(errors.some((error) => error.includes('unsupported type')));
  assert.ok(errors.some((error) => error.includes('max_documents_per_run')));
});

test('policy thresholds are bounded and risk level is enumerated', () => {
  const errors = validatePersonaInput({
    ...validPersona,
    risk_level: 'extreme',
    learning_policy: { minimum_core_confidence: 1.5 },
  });
  assert.ok(errors.some((error) => error.includes('risk_level')));
  assert.ok(errors.some((error) => error.includes('minimum_core_confidence')));
});

test('run types match the supported manual learning lifecycle', () => {
  assert.equal(validateRunType('initial_build'), true);
  assert.equal(validateRunType('manual_import'), true);
  assert.equal(validateRunType('autonomous_internet_crawl'), false);
});
