import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { config } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { head, del } from '@vercel/blob';

// POST /api/admin/video/confirm — Confirmar subida y guardar URL
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { uploadUrl, pathname } = body;

    if (!uploadUrl && !pathname) {
      return NextResponse.json({ success: false, error: 'uploadUrl o pathname requerido' }, { status: 400 });
    }

    // Obtener la URL final del blob usando head()
    // La URL final es el uploadUrl sin query params, o la URL devuelta por head()
    let finalUrl = uploadUrl;

    try {
      const blobInfo = await head(uploadUrl || pathname);
      if (blobInfo?.url) {
        finalUrl = blobInfo.url;
      }
    } catch {
      // Si head() falla, intentar construir URL desde uploadUrl (sin query params)
      if (uploadUrl) {
        try {
          const parsedUrl = new URL(uploadUrl);
          // Quitar parámetros de consulta para obtener URL base
          finalUrl = `${parsedUrl.origin}${parsedUrl.pathname}`;
        } catch {
          // mantiene el uploadUrl original
        }
      }
    }

    // Eliminar video anterior de Blob si existe
    const [oldConfig] = await getDb()
      .select()
      .from(config)
      .where(eq(config.key, 'videoUrl'))
      .limit(1);

    if (oldConfig?.value && oldConfig.value.includes('blob.vercel-storage.com')) {
      try { await del(oldConfig.value); } catch { /* ignore */ }
    }

    // Guardar nueva URL en la tabla config
    const [existingUrl] = await getDb()
      .select()
      .from(config)
      .where(eq(config.key, 'videoUrl'))
      .limit(1);

    if (existingUrl) {
      await getDb()
        .update(config)
        .set({ value: finalUrl, updatedAt: new Date() })
        .where(eq(config.key, 'videoUrl'));
    } else {
      await getDb()
        .insert(config)
        .values({ key: 'videoUrl', value: finalUrl });
    }

    // Guardar el tipo como 'upload'
    const [existingType] = await getDb()
      .select()
      .from(config)
      .where(eq(config.key, 'videoType'))
      .limit(1);
    if (existingType) {
      await getDb()
        .update(config)
        .set({ value: 'upload', updatedAt: new Date() })
        .where(eq(config.key, 'videoType'));
    } else {
      await getDb()
        .insert(config)
        .values({ key: 'videoType', value: 'upload' });
    }

    return NextResponse.json({
      success: true,
      data: { url: finalUrl, type: 'upload' },
    });
  } catch (error) {
    console.error('Error confirming video upload:', error);
    return NextResponse.json(
      { success: false, error: 'Error al confirmar la subida del video' },
      { status: 500 }
    );
  }
}
