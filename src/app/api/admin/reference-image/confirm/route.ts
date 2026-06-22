import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { config } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { head, del } from '@vercel/blob';

// POST /api/admin/reference-image/confirm — Confirmar subida y guardar URL
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
    let finalUrl = uploadUrl;

    try {
      const blobInfo = await head(uploadUrl || pathname);
      if (blobInfo?.url) {
        finalUrl = blobInfo.url;
      }
    } catch {
      // Si head() falla, construir URL desde uploadUrl (sin query params)
      if (uploadUrl) {
        try {
          const parsedUrl = new URL(uploadUrl);
          finalUrl = `${parsedUrl.origin}${parsedUrl.pathname}`;
        } catch {
          // mantiene el uploadUrl original
        }
      }
    }

    // Eliminar imagen anterior de Blob si existe
    const [oldConfig] = await getDb()
      .select()
      .from(config)
      .where(eq(config.key, 'referenceImageUrl'))
      .limit(1);

    if (oldConfig?.value && oldConfig.value.includes('blob.vercel-storage.com')) {
      try { await del(oldConfig.value); } catch { /* ignore */ }
    }

    // Guardar nueva URL en la tabla config
    const [existing] = await getDb()
      .select()
      .from(config)
      .where(eq(config.key, 'referenceImageUrl'))
      .limit(1);

    if (existing) {
      await getDb()
        .update(config)
        .set({ value: finalUrl, updatedAt: new Date() })
        .where(eq(config.key, 'referenceImageUrl'));
    } else {
      await getDb()
        .insert(config)
        .values({ key: 'referenceImageUrl', value: finalUrl });
    }

    return NextResponse.json({
      success: true,
      data: { url: finalUrl },
    });
  } catch (error) {
    console.error('Error confirming reference image upload:', error);
    return NextResponse.json(
      { success: false, error: 'Error al confirmar la subida de la imagen' },
      { status: 500 }
    );
  }
}
