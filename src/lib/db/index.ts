import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL no configurada');
    }
    const sql = postgres(url, {
      prepare: false,
      max: 1,
      idle_timeout: 5,
      connect_timeout: 10,
    });
    _db = drizzle(sql, { schema });
  }
  return _db;
}

