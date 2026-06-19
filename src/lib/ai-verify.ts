import OpenAI from 'openai';
import type { VerificationResult, LandingConfig } from '@/lib/types';

let openai: OpenAI | null = null;

function getOpenAI() {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return null;
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

interface VerifyOptions {
  imageUrl: string;
  userEmail: string;
  config: LandingConfig;
}

export async function verifyReceiptWithAI(options: VerifyOptions): Promise<VerificationResult> {
  const { imageUrl, userEmail, config } = options;
  const client = getOpenAI();

  if (!client) {
    return {
      verified: false,
      confidence: 0,
      reason: 'Servicio de IA no configurado. Contacta al administrador.',
    };
  }

  const hasReference = config.referenceImageEnabled !== 'false' && config.referenceImageUrl;

  let prompt: string;
  let userContent: any[];

  if (hasReference) {
    prompt = `Eres un verificador de comprobantes de registro para "${config.platformName}".

TE VOY A ENVIAR DOS IMÁGENES:
1. IMAGEN DE REFERENCIA: Es un ejemplo de cómo se ve un registro exitoso CORRECTO en la plataforma.
2. COMPROBANTE DEL USUARIO: Es la captura que el usuario subió para verificar su registro.

Analiza AMBAS imágenes y determina:

1. **SIMILITUD VISUAL**: ¿El comprobante del usuario muestra el MISMO TIPO de pantalla que la imagen de referencia? (ambas deberían mostrar una confirmación de registro, cuenta creada, bienvenida, o pantalla de dashboard post-registro)
2. Debe haber coincidencia en el TIPO de contenido (ambas son capturas de confirmación de registro), NO necesariamente ser idénticas (pueden variar colores, idioma, etc.)
3. **EMAIL**: ¿Se puede leer claramente el email "${userEmail}" en el comprobante del usuario?
4. **PLATAFORMA**: ¿La plataforma/marca "${config.platformName}" es visible o reconocible en el comprobante del usuario?
5. **PALABRAS CLAVE**: ¿Se ven palabras clave como: ${config.platformKeywords}?
6. **LEGITIMIDAD**: ¿El comprobante del usuario NO parece editado, manipulado, o falso?

Responde SOLO con JSON (sin markdown):

{
  "verified": boolean,
  "confidence": number (0-100),
  "reason": "string (explicación breve en español)",
  "similarToReference": boolean,
  "extractedText": "string (texto relevante extraído)",
  "emailFound": "string (email si aparece en la imagen)",
  "platformDetected": "string (nombre de plataforma detectada)",
  "dateFound": "string (fecha si aparece)"
}

IMPORTANTE: 
- verified=true SOLO si: (a) el comprobante del usuario muestra una confirmación de registro SIMILAR a la referencia, O (b) tienes ALTA confianza (80%+) de que es un registro legítimo.
- Si el comprobante no se parece en nada a la referencia O no hay suficiente evidencia de un registro real → marca verified=false.
- Si hay la más mínima duda, marca false.`;

    userContent = [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: config.referenceImageUrl!, detail: 'auto' } },
      { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
    ];
  } else {
    prompt = `Eres un verificador de comprobantes de registro para "${config.platformName}".

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

    userContent = [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
    ];
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Eres un validador de comprobantes de registro. Responde SOLO con JSON.',
        },
        {
          role: 'user',
          content: userContent,
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
