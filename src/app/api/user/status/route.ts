import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { users, verifications } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

// GET /api/user/status — Consultar estado de verificación del usuario actual
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    if (Number.isNaN(userId)) {
      return NextResponse.json({ success: false, error: 'ID de usuario inválido' }, { status: 400 });
    }

    const [user] = await getDb()
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Obtener la última verificación
    const [lastVerification] = await getDb()
      .select()
      .from(verifications)
      .where(eq(verifications.userId, userId))
      .orderBy(desc(verifications.createdAt))
      .limit(1);

    return NextResponse.json({
      success: true,
      data: {
        status: user.status,
        email: user.email,
        name: user.name,
        maxAttempts: user.maxAttempts,
        lastVerification: lastVerification
          ? {
              id: lastVerification.id,
              verified: lastVerification.verified,
              imageUrl: lastVerification.imageUrl,
              reason: lastVerification.reason,
              createdAt: lastVerification.createdAt,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Error fetching user status:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener estado' },
      { status: 500 }
    );
  }
}
