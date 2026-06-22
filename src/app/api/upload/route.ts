import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const BUCKET = 'receipts';

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

    // Aceptar cualquier tipo de archivo, límite de 50MB
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: 'El archivo debe ser menor a 50MB' },
        { status: 400 }
      );
    }

    const fileExt = file.name.split('.').pop() || 'png';
    const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const path = `${folder.replace(/^receipts\//, '')}/${safeName}`;
    const cleanPath = path.replace(/^\/+/, '');

    // Subir a Supabase Storage
    const supabasePath = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${cleanPath}`;

    const uploadRes = await fetch(supabasePath, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: Buffer.from(await file.arrayBuffer()),
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error('Supabase upload error:', uploadRes.status, errText);
      throw new Error(`Error al subir: ${uploadRes.status}`);
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${cleanPath}`;

    return NextResponse.json({
      success: true,
      data: { url: publicUrl, type: 'file' },
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al subir el archivo' },
      { status: 500 }
    );
  }
}
