import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { verifications, users, config } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyReceiptWithAI } from '@/lib/ai-verify';
import type { LandingConfig } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

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
        { success: false, error: 'Has agotado tus intentos. Contacta a soporte.' },
        { status: 403 }
      );
    }

    // Obtener configuración
    const configRows = await getDb().select().from(config);
    const configMap = Object.fromEntries(configRows.map((c) => [c.key, c.value]));
    const landingConfig: LandingConfig = {
      landingHeadline: configMap.landingHeadline || '',
      landingSubheadline: configMap.landingSubheadline || '',
      offerLink: configMap.offerLink || '',
      driveLink: configMap.driveLink || '',
      platformName: configMap.platformName || 'Plataforma',
      platformKeywords: configMap.platformKeywords || '',
    };

    // Llamar a la IA
    const result = await verifyReceiptWithAI({
      imageUrl,
      userEmail: user.email,
      config: landingConfig,
    });

    // Guardar verificación
    await getDb()
      .insert(verifications)
      .values({
        userId,
        imageUrl,
        verified: result.verified,
        confidence: result.confidence,
        aiResponse: result as any,
        reason: result.reason,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      });

    // Actualizar usuario
    if (result.verified) {
      await getDb()
        .update(users)
        .set({ status: 'verified', updatedAt: new Date() })
        .where(eq(users.id, userId));
    } else {
      await getDb()
        .update(users)
        .set({ maxAttempts: user.maxAttempts - 1, updatedAt: new Date() })
        .where(eq(users.id, userId));
    }

    return NextResponse.json({
      success: true,
      data: {
        verified: result.verified,
        confidence: result.confidence,
        reason: result.reason,
        remainingAttempts: result.verified ? 3 : user.maxAttempts - 1,
      },
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al verificar el comprobante' },
      { status: 500 }
    );
  }
}
