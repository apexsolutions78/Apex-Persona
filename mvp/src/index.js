import app from './app.js';
import { config } from './config.js';
import { pool } from './db/pool.js';

const server = app.listen(config.port, () => {
  console.log(`Apex Persona MVP listening on port ${config.port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received; closing the API`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
