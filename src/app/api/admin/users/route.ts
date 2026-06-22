import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { users, verifications } from '@/lib/db/schema';
import { desc, eq } from 'drizzle-orm';

export async function GET() {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== 'admin') {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
  }

  const allUsers = await getDb()
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      status: users.status,
      role: users.role,
      createdAt: users.createdAt,
      maxAttempts: users.maxAttempts,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  // Attach latest verification for each user
  const usersWithVerifications = await Promise.all(
    allUsers.map(async (u) => {
      const [lastVer] = await getDb()
        .select()
        .from(verifications)
        .where(eq(verifications.userId, u.id))
        .orderBy(desc(verifications.createdAt))
        .limit(1);
      return { ...u, verification: lastVer || null };
    })
  );

  return NextResponse.json({ success: true, data: usersWithVerifications });
}
