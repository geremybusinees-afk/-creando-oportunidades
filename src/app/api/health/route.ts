import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    const db = getDb();
    const result = await db.execute(sql`SELECT NOW() as current_time`);
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    return NextResponse.json({
      success: true,
      database: 'conectada',
      time: result[0]?.current_time,
      tables: tables.map((t: any) => t.table_name),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || 'Error de conexión',
    }, { status: 500 });
  }
}
