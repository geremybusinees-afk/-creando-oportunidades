import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { head } from '@vercel/blob';

// POST /api/upload/confirm — Confirmar subida y devolver URL final del comprobante
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
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

    return NextResponse.json({
      success: true,
      data: { url: finalUrl },
    });
  } catch (error) {
    console.error('Error confirming upload:', error);
    return NextResponse.json(
      { success: false, error: 'Error al confirmar la subida' },
      { status: 500 }
    );
  }
}
