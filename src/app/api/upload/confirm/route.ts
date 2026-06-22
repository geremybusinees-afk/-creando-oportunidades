import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// POST /api/upload/confirm — Confirmar subida y devolver URL final del comprobante
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { uploadUrl } = body;

    if (!uploadUrl) {
      return NextResponse.json({ success: false, error: 'uploadUrl requerido' }, { status: 400 });
    }

    // La URL de Supabase Storage ya es pública y definitiva
    return NextResponse.json({
      success: true,
      data: { url: uploadUrl },
    });
  } catch (error) {
    console.error('Error confirming upload:', error);
    return NextResponse.json(
      { success: false, error: 'Error al confirmar la subida' },
      { status: 500 }
    );
  }
}
