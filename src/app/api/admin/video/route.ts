import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { config } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { put, del } from '@vercel/blob';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Archivo requerido' }, { status: 400 });
    }

    // Validar tipo de archivo
    const videoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!videoTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Solo se permiten archivos de video (MP4, WebM, OGG, MOV)' },
        { status: 400 }
      );
    }

    // Límite de 500MB para videos
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'El video debe ser menor a 500MB' },
        { status: 400 }
      );
    }

    // Subir video a Vercel Blob
    const blob = await put(`videos/${Date.now()}-${file.name}`, file, {
      access: 'public',
      addRandomSuffix: true,
    });

    // Guardar URL en la tabla config
    const [existing] = await getDb()
      .select()
      .from(config)
      .where(eq(config.key, 'videoUrl'))
      .limit(1);

    if (existing) {
      // Eliminar video anterior de Blob si existe
      const [oldConfig] = await getDb()
        .select()
        .from(config)
        .where(eq(config.key, 'videoUrl'))
        .limit(1);
      if (oldConfig?.value && oldConfig.value.startsWith('https://')) {
        try { await del(oldConfig.value); } catch { /* ignore */ }
      }

      await getDb()
        .update(config)
        .set({ value: blob.url, updatedAt: new Date() })
        .where(eq(config.key, 'videoUrl'));
    } else {
      await getDb()
        .insert(config)
        .values({ key: 'videoUrl', value: blob.url });
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
      data: { url: blob.url, type: 'upload' },
    });
  } catch (error) {
    console.error('Error uploading video:', error);
    return NextResponse.json(
      { success: false, error: 'Error al subir el video' },
      { status: 500 }
    );
  }
}

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

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user || (session.user as any).role !== 'admin') {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    // Obtener URL actual del video
    const [existing] = await getDb()
      .select()
      .from(config)
      .where(eq(config.key, 'videoUrl'))
      .limit(1);

    if (existing?.value) {
      // Intentar eliminar de Vercel Blob si es una subida
      if (existing.value.includes('blob.vercel-storage.com') || existing.value.includes('public.blob.vercel-storage.com')) {
        try { await del(existing.value); } catch { /* ignore */ }
      }

      await getDb()
        .delete(config)
        .where(eq(config.key, 'videoUrl'));
    }

    // Limpiar también el tipo
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
