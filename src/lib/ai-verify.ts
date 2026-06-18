import OpenAI from 'openai';
import type { VerificationResult, LandingConfig } from '@/lib/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface VerifyOptions {
  imageUrl: string;
  userEmail: string;
  config: LandingConfig;
}

export async function verifyReceiptWithAI(options: VerifyOptions): Promise<VerificationResult> {
  const { imageUrl, userEmail, config } = options;

  const prompt = `Eres un verificador de comprobantes de registro para "${config.platformName}".

Analiza la imagen y responde SOLO con JSON (sin markdown):

{
  "verified": boolean,
  "confidence": number (0-100),
  "reason": "string (explicación breve en español)",
  "extractedText": "string (texto relevante extraído)",
  "emailFound": "string (email si aparece en la imagen)",
  "platformDetected": "string (nombre de plataforma detectada)",
  "dateFound": "string (fecha si aparece)"
}

Criterios de verificación:
1. ¿Es una captura de pantalla de un registro exitoso en una plataforma?
2. ¿Se puede leer claramente el email "${userEmail}" en la imagen?
3. ¿La plataforma mostrada "${config.platformName}" coincide con lo esperado?
4. ¿La captura NO parece editada o manipulada?
5. ¿Se ven palabras clave como: ${config.platformKeywords}?

IMPORTANTE: Solo marca verified=true si tienes ALTA confianza (80%+) de que el registro es legítimo. Si hay duda, marca false.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Eres un validador de comprobantes de registro. Responde SOLO con JSON.',
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return {
        verified: false,
        confidence: 0,
        reason: 'No se pudo analizar la imagen. Intenta de nuevo.',
      };
    }

    const result = JSON.parse(content) as VerificationResult;
    return result;
  } catch (error) {
    console.error('AI verification error:', error);
    return {
      verified: false,
      confidence: 0,
      reason: 'Error al conectar con el servicio de verificación.',
    };
  }
}
