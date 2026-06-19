import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { config } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { put, del } from '@vercel/blob';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Archivo requerido' }, { status: 400 });
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Solo se permiten imágenes PNG, JPG o WebP' },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'La imagen debe ser menor a 10MB' },
        { status: 400 }
      );
    }

    // Subir imagen de referencia a Vercel Blob
    const blob = await put(`reference-images/${Date.now()}-${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    // Guardar URL en la tabla config
    const [existing] = await getDb()
      .select()
      .from(config)
      .where(eq(config.key, 'referenceImageUrl'))
      .limit(1);

    if (existing) {
      await getDb()
        .update(config)
        .set({ value: blob.url, updatedAt: new Date() })
        .where(eq(config.key, 'referenceImageUrl'));
    } else {
      await getDb()
        .insert(config)
        .values({ key: 'referenceImageUrl', value: blob.url });
    }

    return NextResponse.json({
      success: true,
      data: { url: blob.url },
    });
  } catch (error) {
    console.error('Error uploading reference image:', error);
    return NextResponse.json(
      { success: false, error: 'Error al subir la imagen de referencia' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    // Obtener URL actual de la imagen de referencia
    const [existing] = await getDb()
      .select()
      .from(config)
      .where(eq(config.key, 'referenceImageUrl'))
      .limit(1);

    if (existing?.value) {
      // Intentar eliminar de Vercel Blob
      try {
        await del(existing.value);
      } catch {
        // Si falla la eliminación del blob, continuamos igual
        console.warn('No se pudo eliminar el blob, pero continuamos');
      }

      // Eliminar de la BD
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
