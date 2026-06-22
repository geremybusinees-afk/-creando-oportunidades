import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { config } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { issueSignedToken, presignUrl, del } from '@vercel/blob';

// POST /api/admin/video — Generar URL firmada para subir video directo a Blob
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { filename, contentType, fileSize } = body;

    if (!filename) {
      return NextResponse.json({ success: false, error: 'Nombre de archivo requerido' }, { status: 400 });
    }

    // Validar extensión
    const ext = filename.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['mp4', 'webm', 'ogg', 'mov'];
    if (!ext || !allowedExtensions.includes(ext)) {
      return NextResponse.json(
        { success: false, error: 'Solo se permiten archivos MP4, WebM, OGG o MOV' },
        { status: 400 }
      );
    }

    // Validar tamaño (500MB máximo)
    if (fileSize && fileSize > 500 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'El video debe ser menor a 500MB' },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const safeFileName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const pathname = `videos/${timestamp}-${safeFileName}`;

    // Generar token firmado para subida
    const signedToken = await issueSignedToken({
      pathname,
      operations: ['put'],
      maximumSizeInBytes: Math.min(fileSize || 500 * 1024 * 1024, 500 * 1024 * 1024),
      allowedContentTypes: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
    });

    // Generar URL presignada para PUT
    const { presignedUrl: uploadUrl } = await presignUrl(signedToken, {
      pathname,
      operation: 'put',
      access: 'public',
    } as any);

    return NextResponse.json({
      success: true,
      data: {
        uploadUrl,
        pathname,
        signedToken,
      },
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json(
      { success: false, error: 'Error al generar URL de subida' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/video — Guardar enlace externo (YouTube, Vimeo, etc.)
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ success: false, error: 'URL requerida' }, { status: 400 });
    }

    // Guardar URL del video (enlace externo: YouTube, Vimeo, etc.)
    const [existingUrl] = await getDb()
      .select()
      .from(config)
      .where(eq(config.key, 'videoUrl'))
      .limit(1);

    if (existingUrl) {
      await getDb()
        .update(config)
        .set({ value: url, updatedAt: new Date() })
        .where(eq(config.key, 'videoUrl'));
    } else {
      await getDb()
        .insert(config)
        .values({ key: 'videoUrl', value: url });
    }

    // Guardar el tipo como 'link'
    const [existingType] = await getDb()
      .select()
      .from(config)
      .where(eq(config.key, 'videoType'))
      .limit(1);
    if (existingType) {
      await getDb()
        .update(config)
        .set({ value: 'link', updatedAt: new Date() })
        .where(eq(config.key, 'videoType'));
    } else {
      await getDb()
        .insert(config)
        .values({ key: 'videoType', value: 'link' });
    }

    return NextResponse.json({ success: true, data: { url, type: 'link' } });
  } catch (error) {
    console.error('Error saving video link:', error);
    return NextResponse.json(
      { success: false, error: 'Error al guardar el enlace del video' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/video — Eliminar video
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    const [existing] = await getDb()
      .select()
      .from(config)
      .where(eq(config.key, 'videoUrl'))
      .limit(1);

    if (existing?.value) {
      if (existing.value.includes('blob.vercel-storage.com')) {
        try { await del(existing.value); } catch { /* ignore */ }
      }

      await getDb()
        .delete(config)
        .where(eq(config.key, 'videoUrl'));
    }

    const [existingType] = await getDb()
      .select()
      .from(config)
      .where(eq(config.key, 'videoType'))
      .limit(1);
    if (existingType) {
      await getDb()
        .delete(config)
        .where(eq(config.key, 'videoType'));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting video:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar el video' },
      { status: 500 }
    );
  }
}
