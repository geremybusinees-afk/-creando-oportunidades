import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { config } from '@/lib/db/schema';

export async function GET() {
  try {
    const configRows = await getDb().select().from(config);
    const configMap = Object.fromEntries(configRows.map((c) => [c.key, c.value]));

    // Solo devolver configuraciones públicas
    const publicKeys = ['videoUrl', 'videoType', 'landingHeadline', 'landingSubheadline', 'offerLink', 'driveLink', 'platformName', 'referenceImageUrl', 'whatsappGroupUrl'];
    const publicConfig: Record<string, string> = {};
    for (const key of publicKeys) {
      if (configMap[key]) {
        publicConfig[key] = configMap[key];
      }
    }

    return NextResponse.json({ success: true, data: publicConfig });
  } catch (error) {
    console.error('Error fetching public config:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener configuración' },
      { status: 500 }
    );
  }
}
