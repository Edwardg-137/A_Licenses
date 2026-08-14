import { checklistFor, VISION_JSON_SHAPE } from './checklists';
import { ContentIssue, FieldCheck } from './types';
import { isValidGuatemalaCui } from './nit';

const MAX_INLINE_BYTES = 12 * 1024 * 1024;

export interface VisionResult {
  check: FieldCheck;
  issues: ContentIssue[];
  extracted: Record<string, string | number | boolean | null>;
  engine: string;
}

function emptyExtracted(): Record<string, string | number | boolean | null> {
  return {
    cui: null,
    fullName: null,
    nit: null,
    direccion: null,
    finca: null,
    folio: null,
    libro: null,
    fechaEmision: null,
    fechaVencimiento: null,
    totalQuetzales: null,
    montoQuetzales: null,
    hasOwnerSignature: null,
    hasProfessionalSignature: null,
    bothDpiSides: null,
    categoriaMarn: null,
  };
}

interface GeminiJson {
  documentMatchesRequirement?: boolean;
  confidence?: number;
  issues?: { severity?: string; message?: string }[];
  extracted?: Record<string, string | number | boolean | null>;
}

function parseGeminiText(text: string): GeminiJson | null {
  const trimmed = text.trim();
  const jsonBlock = trimmed.startsWith('{')
    ? trimmed
    : trimmed.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonBlock) return null;
  try {
    return JSON.parse(jsonBlock) as GeminiJson;
  } catch {
    return null;
  }
}

function geminiHttpDetail(errText: string, status: number): string {
  try {
    const parsed = JSON.parse(errText) as { error?: { message?: string } };
    const msg = parsed.error?.message?.trim();
    if (msg) {
      if (/no longer available/i.test(msg)) {
        return 'El modelo de Gemini configurado ya no está disponible. Actualice GEMINI_MODEL.';
      }
      return msg.slice(0, 180);
    }
  } catch {
    /* cuerpo no JSON */
  }
  return errText.slice(0, 180) || `HTTP ${status}`;
}

/**
 * Visión LLM (B1): Gemini Flash. Sin clave o DWG → skip.
 * Un mismatch con baja confianza se degrada a warn para no bloquear de más.
 */
export async function analyzeWithGemini(input: {
  buffer: Buffer;
  mimeType: string;
  requirementCode: string;
  formCode: string;
  apiKey?: string;
  model?: string;
}): Promise<VisionResult> {
  const skipExtracted = emptyExtracted();
  if (input.mimeType === 'image/vnd.dwg') {
    return {
      check: {
        status: 'skip',
        message: 'DWG excluido del análisis por visión; el revisor lo validará',
      },
      issues: [],
      extracted: skipExtracted,
      engine: 'none',
    };
  }

  const key = input.apiKey?.trim();
  if (!key) {
    return {
      check: {
        status: 'warn',
        message:
          'Análisis semántico omitido (configure GEMINI_API_KEY). El revisor validará el contenido.',
      },
      issues: [
        {
          severity: 'warn',
          code: 'VISION_SKIPPED',
          message: 'Sin clave Gemini: no se clasificó el documento',
        },
      ],
      extracted: skipExtracted,
      engine: 'none',
    };
  }

  if (input.buffer.length > MAX_INLINE_BYTES) {
    return {
      check: {
        status: 'warn',
        message: 'El archivo es demasiado grande para el análisis automático; el revisor lo revisará',
      },
      issues: [{ severity: 'warn', code: 'TOO_LARGE', message: 'Archivo > 12 MB para visión' }],
      extracted: skipExtracted,
      engine: 'gemini',
    };
  }

  const model = input.model?.trim() || 'gemini-3.6-flash';
  const prompt =
    `${checklistFor(input.requirementCode, input.formCode)}\n\n` +
    `Formato de salida:\n${VISION_JSON_SHAPE}`;

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent` +
    `?key=${encodeURIComponent(key)}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: input.mimeType,
                  data: input.buffer.toString('base64'),
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        check: {
          status: 'warn',
          message: `Gemini no disponible (HTTP ${response.status}). El revisor validará el documento.`,
        },
        issues: [
          {
            severity: 'warn',
            code: 'VISION_HTTP',
            message: geminiHttpDetail(errText, response.status),
          },
        ],
        extracted: skipExtracted,
        engine: 'gemini',
      };
    }

    const body = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('\n') ?? '';
    const parsed = parseGeminiText(text);
    if (!parsed) {
      return {
        check: {
          status: 'warn',
          message: 'No se pudo interpretar la respuesta del modelo. El revisor validará el documento.',
        },
        issues: [{ severity: 'warn', code: 'VISION_PARSE', message: 'JSON de visión inválido' }],
        extracted: skipExtracted,
        engine: 'gemini',
      };
    }

    const confidence = Number(parsed.confidence ?? 0);
    const extracted = { ...skipExtracted, ...(parsed.extracted ?? {}) };
    const issues: ContentIssue[] = (parsed.issues ?? [])
      .filter((i) => i.message)
      .map((i) => ({
        severity: i.severity === 'fail' ? 'fail' : 'warn',
        code: 'VISION',
        message: String(i.message),
      }));

    if (parsed.documentMatchesRequirement === false) {
      const severity = confidence >= 0.65 ? 'fail' : 'warn';
      issues.unshift({
        severity,
        code: 'TYPE_MISMATCH',
        message: `El archivo no parece corresponder al requisito ${input.requirementCode}`,
      });
    }

    if (input.requirementCode === 'D-01') {
      if (extracted.bothDpiSides === false) {
        issues.push({
          severity: 'fail',
          code: 'DPI_SIDES',
          message: 'No se ven ambas caras del DPI (anverso y reverso)',
        });
      }
      const cui = extracted.cui != null ? String(extracted.cui) : '';
      if (cui && !isValidGuatemalaCui(cui)) {
        issues.push({
          severity: 'warn',
          code: 'CUI_CHECKSUM',
          message: `El CUI leído (${cui}) no pasa el dígito verificador`,
        });
      }
    }

    if (input.requirementCode === 'D-14') {
      if (extracted.hasOwnerSignature === false || extracted.hasProfessionalSignature === false) {
        issues.push({
          severity: 'fail',
          code: 'SIGNATURES',
          message: 'Faltan firmas visibles del propietario y/o del profesional en el formulario',
        });
      }
    }

    const hasFail = issues.some((i) => i.severity === 'fail');
    const hasWarn = issues.some((i) => i.severity === 'warn');
    const status = hasFail ? 'fail' : hasWarn ? 'warn' : 'ok';
    return {
      check: {
        status,
        message: hasFail
          ? 'El análisis automático encontró problemas que debe corregir'
          : hasWarn
            ? 'El análisis automático dejó observaciones para el revisor'
            : 'El documento parece corresponder al requisito',
        evidence: { confidence, documentMatchesRequirement: parsed.documentMatchesRequirement ?? null },
      },
      issues,
      extracted,
      engine: 'gemini',
    };
  } catch {
    return {
      check: {
        status: 'warn',
        message: 'Error de red al analizar el documento. El revisor lo validará.',
      },
      issues: [{ severity: 'warn', code: 'VISION_NETWORK', message: 'Fallo de red hacia Gemini' }],
      extracted: skipExtracted,
      engine: 'gemini',
    };
  }
}
