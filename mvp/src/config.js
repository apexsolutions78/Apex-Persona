import 'dotenv/config';

const positiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const config = Object.freeze({
  env: process.env.NODE_ENV ?? 'development',
  host: process.env.HOST ?? '127.0.0.1',
  port: positiveInteger(process.env.PORT, 3000),
  database: Object.freeze({
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: positiveInteger(process.env.DB_PORT, 3306),
    name: process.env.DB_NAME ?? 'apex_persona',
    user: process.env.DB_USER ?? 'apex_persona',
    password: process.env.DB_PASSWORD ?? '',
    connectionLimit: positiveInteger(process.env.DB_CONNECTION_LIMIT, 10),
  }),
  storageRoot: process.env.STORAGE_ROOT ?? './storage',
});

export function assertDatabaseConfigured() {
  const { host, name, user, password } = config.database;
  if (!host || !name || !user || !password) {
    throw new Error('Set DB_HOST, DB_NAME, DB_USER, and DB_PASSWORD in the environment before starting the API.');
  }
}
