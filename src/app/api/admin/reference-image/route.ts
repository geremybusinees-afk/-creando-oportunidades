import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { config } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// POST /api/admin/reference-image — Guardar URL de imagen de referencia
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ success: false, error: 'URL de imagen requerida' }, { status: 400 });
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return NextResponse.json({ success: false, error: 'La URL debe comenzar con http:// o https://' }, { status: 400 });
    }

    // Guardar URL en la tabla config
    const [existing] = await getDb()
      .select()
      .from(config)
      .where(eq(config.key, 'referenceImageUrl'))
      .limit(1);

    if (existing) {
      await getDb()
        .update(config)
        .set({ value: url, updatedAt: new Date() })
        .where(eq(config.key, 'referenceImageUrl'));
    } else {
      await getDb()
        .insert(config)
        .values({ key: 'referenceImageUrl', value: url });
    }

    return NextResponse.json({
      success: true,
      data: { url },
    });
  } catch (error) {
    console.error('Error saving reference image URL:', error);
    return NextResponse.json(
      { success: false, error: 'Error al guardar la URL de la imagen de referencia' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/reference-image — Eliminar imagen de referencia
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    const [existing] = await getDb()
      .select()
      .from(config)
      .where(eq(config.key, 'referenceImageUrl'))
      .limit(1);

    if (existing?.value) {
      await getDb()
        .delete(config)
        .where(eq(config.key, 'referenceImageUrl'));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reference image:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar la imagen de referencia' },
      { status: 500 }
    );
  }
}
