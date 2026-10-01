import mysql from 'mysql2/promise';
import { config, assertDatabaseConfigured } from '../config.js';

assertDatabaseConfigured();

export const pool = mysql.createPool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
  connectionLimit: config.database.connectionLimit,
  charset: 'utf8mb4',
  timezone: 'Z',
  namedPlaceholders: true,
  waitForConnections: true,
  queueLimit: 0,
  decimalNumbers: true,
  multipleStatements: false,
});

export async function withTransaction(work) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
