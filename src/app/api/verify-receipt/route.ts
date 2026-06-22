import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { verifications, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// POST /api/verify-receipt — Guardar comprobante para revisión MANUAL
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    if (Number.isNaN(userId)) {
      return NextResponse.json({ success: false, error: 'ID de usuario inválido' }, { status: 400 });
    }

    const { imageUrl } = await request.json();
    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'URL de imagen requerida' },
        { status: 400 }
      );
    }

    const [user] = await getDb()
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (user.maxAttempts <= 0) {
      return NextResponse.json(
        { success: false, error: 'Has agotado tus intentos. Contacta al soporte.' },
        { status: 400 }
      );
    }

    // Guardar verificación como PENDIENTE (revisión manual)
    await getDb()
      .insert(verifications)
      .values({
        userId,
        imageUrl,
        imageBlobUrl: imageUrl,
        verified: false,
        confidence: 0,
        aiResponse: { method: 'manual-review', status: 'pending' },
        reason: 'Pendiente de revisión manual por el administrador',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      });

    // Marcar usuario como 'pending_review' (en revisión)
    await getDb()
      .update(users)
      .set({
        status: 'pending_review',
        maxAttempts: user.maxAttempts - 1,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return NextResponse.json({
      success: true,
      data: {
        verified: false,
        status: 'pending_review',
        message: 'Comprobante recibido. Pendiente de revisión manual.',
        remainingAttempts: user.maxAttempts - 1,
      },
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al procesar el comprobante' },
      { status: 500 }
    );
  }
}
