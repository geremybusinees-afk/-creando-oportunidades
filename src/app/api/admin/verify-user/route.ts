import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { users, verifications } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

// PATCH /api/admin/verify-user — Aprobar o rechazar manualmente un usuario
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, action, reason } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { success: false, error: 'userId y action requeridos' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'action debe ser "approve" o "reject"' },
        { status: 400 }
      );
    }

    const userIdInt = parseInt(userId);
    if (Number.isNaN(userIdInt)) {
      return NextResponse.json({ success: false, error: 'userId inválido' }, { status: 400 });
    }

    const [user] = await getDb()
      .select()
      .from(users)
      .where(eq(users.id, userIdInt))
      .limit(1);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (action === 'approve') {
      // Marcar usuario como verificado
      await getDb()
        .update(users)
        .set({ status: 'verified', updatedAt: new Date() })
        .where(eq(users.id, userIdInt));

      // Actualizar la última verificación pendiente a verificada
      const [pendingVerification] = await getDb()
        .select()
        .from(verifications)
        .where(eq(verifications.userId, userIdInt))
        .orderBy(desc(verifications.createdAt))
        .limit(1);

      if (pendingVerification) {
        await getDb()
          .update(verifications)
          .set({
            verified: true,
            confidence: 100,
            reason: reason || 'Aprobado manualmente por el administrador',
            aiResponse: { method: 'manual-approve', adminEmail: session.user.email },
          })
          .where(eq(verifications.id, pendingVerification.id));
      }

      return NextResponse.json({
        success: true,
        data: { message: 'Usuario aprobado correctamente' },
      });
    } else {
      // Rechazar: resetear intentos y dejar pending
      await getDb()
        .update(users)
        .set({
          status: 'pending',
          maxAttempts: Math.max(0, user.maxAttempts - 1),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userIdInt));

      // Actualizar la última verificación
      const [lastVerification] = await getDb()
        .select()
        .from(verifications)
        .where(eq(verifications.userId, userIdInt))
        .orderBy(desc(verifications.createdAt))
        .limit(1);

      if (lastVerification) {
        await getDb()
          .update(verifications)
          .set({
            verified: false,
            confidence: 0,
            reason: reason || 'Rechazado por el administrador',
            aiResponse: { method: 'manual-reject', adminEmail: session.user.email, reason },
          })
          .where(eq(verifications.id, lastVerification.id));
      }

      return NextResponse.json({
        success: true,
        data: { message: 'Usuario rechazado', remainingAttempts: Math.max(0, user.maxAttempts - 1) },
      });
    }
  } catch (error) {
    console.error('Error verifying user:', error);
    return NextResponse.json(
      { success: false, error: 'Error al procesar la verificación' },
      { status: 500 }
    );
  }
}

// GET /api/admin/verify-user?userId=X — Obtener detalles de verificación de un usuario
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      // Devolver todos los usuarios con sus verificaciones pendientes
      const allUsers = await getDb()
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          status: users.status,
          createdAt: users.createdAt,
          maxAttempts: users.maxAttempts,
        })
        .from(users)
        .orderBy(desc(users.createdAt));

      // Obtener la última verificación de cada usuario con manejo de errores individual
      const usersWithVerifications = await Promise.all(
        allUsers.map(async (u) => {
          try {
            const [lastVer] = await getDb()
              .select()
              .from(verifications)
              .where(eq(verifications.userId, u.id))
              .orderBy(desc(verifications.createdAt))
              .limit(1);
            return { ...u, verification: lastVer || null };
          } catch (err) {
            console.error(`Error fetching verification for user ${u.id}:`, err);
            return { ...u, verification: null };
          }
        })
      );

      return NextResponse.json({ success: true, data: usersWithVerifications });
    }

    const userIdInt = parseInt(userId);
    if (Number.isNaN(userIdInt)) {
      return NextResponse.json({ success: false, error: 'userId inválido' }, { status: 400 });
    }

    const userVerifications = await getDb()
      .select()
      .from(verifications)
      .where(eq(verifications.userId, userIdInt))
      .orderBy(desc(verifications.createdAt));

    return NextResponse.json({ success: true, data: userVerifications });
  } catch (error) {
    console.error('Error fetching verifications:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return NextResponse.json(
      { success: false, error: 'Error al obtener verificaciones' },
      { status: 500 }
    );
  }
}
