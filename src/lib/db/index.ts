import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL no configurada');
    }
    const sql = neon(url);
    _db = drizzle(sql, { schema });
  }
  return _db;
}

// Convenience export for when DB is required
export const db = getDb();
