import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { config } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { issueSignedToken, presignUrl, del } from '@vercel/blob';

// POST /api/admin/reference-image — Generar URL firmada para subir imagen directo a Blob
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
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'webp'];
    if (!ext || !allowedExtensions.includes(ext)) {
      return NextResponse.json(
        { success: false, error: 'Solo se permiten imágenes PNG, JPG o WebP' },
        { status: 400 }
      );
    }

    // Validar tamaño (10MB máximo)
    if (fileSize && fileSize > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'La imagen debe ser menor a 10MB' },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const safeFileName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const pathname = `reference-images/${timestamp}-${safeFileName}`;

    // Generar token firmado para subida
    const signedToken = await issueSignedToken({
      pathname,
      operations: ['put'],
      maximumSizeInBytes: Math.min(fileSize || 10 * 1024 * 1024, 10 * 1024 * 1024),
      allowedContentTypes: ['image/png', 'image/jpeg', 'image/webp'],
    });

    // Generar URL presignada para PUT
    const { presignedUrl: uploadUrl } = await presignUrl(signedToken, {
      pathname,
      operation: 'put',
      access: 'public',
    } as any);

    return NextResponse.json({
      success: true,
      data: { uploadUrl, pathname, signedToken },
    });
  } catch (error) {
    console.error('Error generating reference image upload URL:', error);
    return NextResponse.json(
      { success: false, error: 'Error al generar URL de subida. Verifica que BLOB_READ_WRITE_TOKEN esté configurado.' },
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
