import { NextResponse } from 'next/server';
import { issueSignedToken, presignUrl } from '@vercel/blob';
import { auth } from '@/lib/auth';

// POST /api/upload — Generar URL firmada para subir comprobante directo a Blob
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { filename, contentType, fileSize } = body;

    if (!filename) {
      return NextResponse.json({ success: false, error: 'Nombre de archivo requerido' }, { status: 400 });
    }

    // Validar tipo
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (contentType && !allowedTypes.includes(contentType)) {
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
    const pathname = `receipts/${session.user.id}/${timestamp}-${safeFileName}`;

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
      data: { uploadUrl, pathname },
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json(
      { success: false, error: 'Error al generar URL de subida' },
      { status: 500 }
    );
  }
}
