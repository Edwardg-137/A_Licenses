import { FieldCheck } from './types';

const ZONAS_GUATEMALA = new Set([
  '1', '2', '3', '4', '5', '6', '7', '8', '9', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '21', '24', '25',
]);

const STREET_HINT =
  /\b(av(enida)?|calle|calz(ada)?|blvd|bulevar|ruta|km|diagonal|manzana|lote|casa)\b/i;

/** Heurística local (A4): zona del catálogo, longitud y algún número de vía. */
export function heuristicAddress(direccion: string, zona: string): FieldCheck {
  const text = String(direccion ?? '').trim();
  const zonaNorm = String(zona ?? '').trim();

  if (!ZONAS_GUATEMALA.has(zonaNorm)) {
    return { status: 'fail', message: `La zona ${zonaNorm || '(vacía)'} no está en el catálogo de Guatemala` };
  }
  if (text.length < 10) {
    return { status: 'fail', message: 'La dirección es demasiado corta para identificar el inmueble' };
  }
  if (!/\d/.test(text)) {
    return { status: 'fail', message: 'La dirección debe incluir un número (casa, avenida o kilometraje)' };
  }

  const evidence: Record<string, unknown> = { zona: zonaNorm, engine: 'heuristic' };
  if (!STREET_HINT.test(text)) {
    return {
      status: 'warn',
      message:
        'No se reconoció un tipo de vía (avenida, calle, calzada…). Confirme que la dirección sea la del inmueble.',
      evidence,
    };
  }
  return {
    status: 'ok',
    message: 'La dirección tiene el formato esperado para el municipio de Guatemala',
    evidence,
  };
}

interface GeocodeResult {
  formatted: string;
  lat: number;
  lng: number;
  zonaFromComponents: string | null;
  inGuatemala: boolean;
}

function extractZona(formatted: string, components: { long_name: string; types: string[] }[]): string | null {
  const fromText = formatted.match(/\bzona\s*(\d{1,2})\b/i);
  if (fromText) return fromText[1];
  for (const c of components) {
    const m = c.long_name.match(/^zona\s*(\d{1,2})$/i);
    if (m) return m[1];
  }
  return null;
}

async function geocodeGoogle(
  direccion: string,
  zona: string,
  apiKey: string,
): Promise<GeocodeResult | null> {
  const query = `${direccion}, Zona ${zona}, Ciudad de Guatemala, Guatemala`;
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json` +
    `?address=${encodeURIComponent(query)}&language=es&region=gt&key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const body = (await response.json()) as {
    status: string;
    results?: {
      formatted_address: string;
      geometry: { location: { lat: number; lng: number } };
      address_components: { long_name: string; types: string[] }[];
    }[];
  };
  if (body.status !== 'OK' || !body.results?.[0]) return null;
  const top = body.results[0];
  const inGuatemala = /guatemala/i.test(top.formatted_address);
  return {
    formatted: top.formatted_address,
    lat: top.geometry.location.lat,
    lng: top.geometry.location.lng,
    zonaFromComponents: extractZona(top.formatted_address, top.address_components ?? []),
    inGuatemala,
  };
}

/**
 * Dirección: Google Geocoding (A5) si hay clave; si no, heurística (A4).
 * Un desajuste de zona o un geocode vacío es `warn`, no `fail` (el geocoder falla a menudo en GT).
 */
export async function validateAddress(
  direccion: string,
  zona: string,
  googleApiKey?: string,
): Promise<{ check: FieldCheck; engine: string }> {
  const local = heuristicAddress(direccion, zona);
  if (local.status === 'fail') {
    return { check: local, engine: 'heuristic' };
  }

  const key = googleApiKey?.trim();
  if (!key) {
    return {
      check: {
        ...local,
        message:
          local.status === 'ok'
            ? `${local.message} (sin geocoder: configure GOOGLE_MAPS_API_KEY para confirmar en mapa)`
            : local.message,
      },
      engine: 'heuristic',
    };
  }

  try {
    const geo = await geocodeGoogle(direccion, zona, key);
    if (!geo) {
      return {
        check: {
          status: 'warn',
          message:
            'Google no encontró esa dirección exacta. Revísela; si es correcta, el revisor la confirmará.',
          evidence: { engine: 'google', queriedZona: zona },
        },
        engine: 'google',
      };
    }
    if (!geo.inGuatemala) {
      return {
        check: {
          status: 'fail',
          message: `La dirección geocodificada no parece estar en Guatemala (${geo.formatted})`,
          evidence: { formatted: geo.formatted, lat: geo.lat, lng: geo.lng },
        },
        engine: 'google',
      };
    }
    if (geo.zonaFromComponents && geo.zonaFromComponents !== String(zona).trim()) {
      return {
        check: {
          status: 'warn',
          message: `El mapa sugiere Zona ${geo.zonaFromComponents}, pero el formulario indica Zona ${zona}. Confirme la zona.`,
          evidence: { formatted: geo.formatted, lat: geo.lat, lng: geo.lng, zonaMapa: geo.zonaFromComponents },
        },
        engine: 'google',
      };
    }
    return {
      check: {
        status: 'ok',
        message: `Dirección localizada: ${geo.formatted}`,
        evidence: { formatted: geo.formatted, lat: geo.lat, lng: geo.lng },
      },
      engine: 'google',
    };
  } catch {
    return {
      check: {
        status: 'warn',
        message: `${local.message} (el geocoder no respondió; se usó solo la heurística)`,
        evidence: local.evidence,
      },
      engine: 'heuristic-fallback',
    };
  }
}
