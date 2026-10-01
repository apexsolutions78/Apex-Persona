import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';
import { config, assertDatabaseConfigured } from '../config.js';

const migrationId = '001_core';
assertDatabaseConfigured();

const connection = await mysql.createConnection({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  connectionLimit: config.database.connectionLimit,
  multipleStatements: true,
  charset: 'utf8mb4',
  timezone: 'Z',
});

try {
  const [lockRows] = await connection.query('SELECT GET_LOCK(?, 30) AS acquired', ['apex_persona_schema']);
  if (lockRows[0]?.acquired !== 1) throw new Error('Could not obtain the database setup lock.');

  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(100) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  const [appliedRows] = await connection.execute('SELECT version FROM schema_migrations WHERE version = ?', [migrationId]);
  if (appliedRows.length) {
    console.log(`Database schema ${migrationId} is already applied.`);
  } else {
    const [tableRows] = await connection.query('SHOW TABLES');
    const existingTables = tableRows
      .flatMap((row) => Object.values(row))
      .filter((name) => name !== 'schema_migrations');
    if (existingTables.length) {
      throw new Error(`Database is not empty (${existingTables.length} existing table(s)); refusing to install over untracked data.`);
    }
    const schemaPath = fileURLToPath(new URL('./schema.sql', import.meta.url));
    await connection.query(await readFile(schemaPath, 'utf8'));
    await connection.execute('INSERT INTO schema_migrations (version) VALUES (?)', [migrationId]);
    console.log(`Database schema ${migrationId} installed.`);
  }
} finally {
  await connection.query('SELECT RELEASE_LOCK(?)', ['apex_persona_schema']).catch(() => {});
  await connection.end();
}
