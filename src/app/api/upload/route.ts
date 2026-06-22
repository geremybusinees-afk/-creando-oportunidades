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
    const folder = (formData.get('folder') as string) || `receipts/${session.user.id}`;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Archivo requerido' }, { status: 400 });
    }

    const imageTypes = ['image/png', 'image/jpeg', 'image/webp'];
    const videoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];
    const isVideo = videoTypes.includes(file.type);
    const isImage = imageTypes.includes(file.type);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { success: false, error: 'Solo se permiten imágenes (PNG, JPG, WebP) o videos (MP4, WebM)' },
        { status: 400 }
      );
    }

    const maxSize = isVideo ? 200 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      const sizeLabel = isVideo ? '200MB' : '10MB';
      return NextResponse.json(
        { success: false, error: `El archivo debe ser menor a ${sizeLabel}` },
        { status: 400 }
      );
    }

    const blob = await put(`${folder}/${Date.now()}-${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    return NextResponse.json({
      success: true,
      data: { url: blob.url, type: isVideo ? 'video' : 'image' },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al subir el archivo' },
      { status: 500 }
    );
  }
}
