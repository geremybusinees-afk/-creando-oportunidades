import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { config } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
  }

  const configRows = await getDb().select().from(config);
  const configMap = Object.fromEntries(configRows.map((c) => [c.key, c.value]));

  return NextResponse.json({ success: true, data: configMap });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
  }

  const body = await request.json();

  for (const [key, value] of Object.entries(body)) {
    const [existing] = await getDb()
      .select()
      .from(config)
      .where(eq(config.key, key))
      .limit(1);

    if (existing) {
      await getDb()
        .update(config)
        .set({ value: String(value), updatedAt: new Date() })
        .where(eq(config.key, key));
    } else {
      await getDb()
        .insert(config)
        .values({ key, value: String(value) });
    }
  }

  return NextResponse.json({ success: true });
}
