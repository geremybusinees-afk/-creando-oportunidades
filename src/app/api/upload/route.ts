import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { auth } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
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

    const blob = await put(`receipts/${session.user.id}/${Date.now()}-${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    return NextResponse.json({
      success: true,
      data: { url: blob.url },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al subir la imagen' },
      { status: 500 }
    );
  }
}
