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
    const { filename } = body;

    if (!filename) {
      return NextResponse.json({ success: false, error: 'Nombre de archivo requerido' }, { status: 400 });
    }

    const timestamp = Date.now();
    const safeFileName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const pathname = `receipts/${session.user.id}/${timestamp}-${safeFileName}`;

    // Generar token firmado para subida (sin restricciones de tipo/tamaño)
    const signedToken = await issueSignedToken({
      pathname,
      operations: ['put'],
      maximumSizeInBytes: 500 * 1024 * 1024, // 500MB máximo general
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
