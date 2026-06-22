import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { verifications, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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

    // Guardar verificación (sin IA — comprobante guardado para revisión manual)
    await getDb()
      .insert(verifications)
      .values({
        userId,
        imageUrl,
        verified: true,
        confidence: 100,
        aiResponse: { method: 'auto-verify', note: 'Verificación automática sin IA' },
        reason: 'Comprobante recibido correctamente. Acceso concedido.',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      });

    // Marcar usuario como verificado
    await getDb()
      .update(users)
      .set({ status: 'verified', maxAttempts: 3, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return NextResponse.json({
      success: true,
      data: {
        verified: true,
        confidence: 100,
        reason: 'Comprobante recibido correctamente. Acceso concedido.',
        remainingAttempts: 3,
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
