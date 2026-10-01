import test from 'node:test';
import assert from 'node:assert/strict';
import { generateQueryPlan, queryPlanIntents } from '../src/services/planning.js';

test('a single learning topic gets the minimum ten planned queries', () => {
  const plan = generateQueryPlan({ learningGoal: 'Become a reliable product manager', includeTopics: ['product management'] });
  assert.equal(plan.length, 10);
  assert.deepEqual(new Set(plan.map((item) => item.query_type)), new Set(queryPlanIntents));
  assert.ok(plan.every((item) => item.status === 'planned' && item.query_text.length > 10));
});

test('planning covers each in-scope topic across the intent categories', () => {
  const plan = generateQueryPlan({
    learningGoal: 'Become a reliable product manager',
    includeTopics: ['research', 'roadmapping'],
  });
  assert.equal(plan.length, 16);
  for (const topic of ['research', 'roadmapping']) {
    assert.deepEqual(new Set(plan.filter((item) => item.topic === topic).map((item) => item.query_type)), new Set(queryPlanIntents));
  }
});

test('query plans stay within the documented 10 to 30 query boundary', () => {
  const plan = generateQueryPlan({ learningGoal: 'Learn climate science', includeTopics: ['A', 'B', 'C', 'D'] });
  assert.ok(plan.length >= 10 && plan.length <= 30);
  assert.ok(plan.every((item) => Array.isArray(item.target_source_classes) && item.target_source_classes.length > 0));
});

test('excluded topics are omitted and an all-excluded scope is rejected', () => {
  const plan = generateQueryPlan({
    learningGoal: 'Learn design',
    includeTopics: ['user research', 'visual design'],
    excludeTopics: ['visual design'],
  });
  assert.deepEqual(new Set(plan.map((item) => item.topic)), new Set(['user research']));
  assert.throws(
    () => generateQueryPlan({ learningGoal: 'Learn design', includeTopics: ['visual design'], excludeTopics: ['visual design'] }),
    /in-scope topic/,
  );
});

test('a learning goal is required', () => {
  assert.throws(() => generateQueryPlan({ learningGoal: '  ' }), /learningGoal/);
});
