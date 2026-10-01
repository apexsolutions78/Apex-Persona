import test from 'node:test';
import assert from 'node:assert/strict';

test('MySQL-backed persona and learning-run workflow', {
  skip: process.env.RUN_MYSQL_INTEGRATION !== '1' && 'Set RUN_MYSQL_INTEGRATION=1 to run against a prepared MySQL schema',
}, async () => {
  const [{ default: app }, { pool }] = await Promise.all([
    import('../src/app.js'),
    import('../src/db/pool.js'),
  ]);
  const server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const health = await fetch(`${baseUrl}/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: 'ok', database: 'connected' });

    const createPersona = await fetch(`${baseUrl}/api/v1/personas`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'Integration test persona',
        learning_goal: 'Build a dependable product manager knowledge base',
        role_description: 'Product manager',
        scope: { include_topics: ['product discovery'], exclude_topics: ['stock trading'] },
      }),
    });
    assert.equal(createPersona.status, 201);
    const persona = await createPersona.json();
    assert.ok(persona.id);
    assert.equal(persona.name, 'Integration test persona');

    const createRun = await fetch(`${baseUrl}/api/v1/personas/${persona.id}/learning-runs`, { method: 'POST' });
    assert.equal(createRun.status, 201);
    const run = await createRun.json();
    assert.equal(run.status, 'queued');
    assert.equal(run.query_plan.length, 10);
    assert.ok(run.query_plan.every((query) => query.status === 'planned'));

    const approve = await fetch(`${baseUrl}/api/v1/learning-runs/${run.id}/query-plan`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query_ids: [run.query_plan[0].id], decision: 'approved' }),
    });
    assert.equal(approve.status, 200);
    const updatedRun = await approve.json();
    assert.equal(updatedRun.query_plan[0].status, 'approved');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
});
