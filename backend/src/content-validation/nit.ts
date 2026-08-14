/**
 * Validador de NIT de Guatemala (dígito verificador SAT) y CUI del DPI.
 * No consulta SAT ni RENAP (decisión D-017 / opción A1).
 */

export function normalizeNit(raw: string): string {
  return String(raw ?? '')
    .replace(/[\s.\-]/g, '')
    .toUpperCase();
}

/** Consumidor final o NIT con dígito verificador válido. */
export function isValidGuatemalaNit(raw: string): boolean {
  const nit = normalizeNit(raw);
  if (nit === 'CF' || nit === 'C/F') return true;
  if (!/^\d+[0-9K]$/.test(nit) || nit.length < 2) return false;

  const body = nit.slice(0, -1);
  const dv = nit.slice(-1);
  let sum = 0;
  let pos = body.length + 1;
  for (let i = 0; i < body.length; i++) {
    sum += Number(body[i]) * pos;
    pos -= 1;
  }
  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
  return dv === expected;
}

const MUNIS_POR_DEPTO = [
  17, 8, 16, 16, 13, 14, 19, 8, 24, 21, 9, 30, 32, 21, 8, 17, 14, 5, 11, 11, 7, 17,
];

export function normalizeCui(raw: string): string {
  return String(raw ?? '').replace(/\D/g, '');
}

/** CUI de 13 dígitos: depto/municipio plausibles + dígito verificador. */
export function isValidGuatemalaCui(raw: string): boolean {
  const cui = normalizeCui(raw);
  if (cui.length !== 13) return false;
  const depto = Number(cui.slice(0, 2));
  const muni = Number(cui.slice(2, 4));
  if (depto < 1 || depto > 22) return false;
  if (muni < 1 || muni > MUNIS_POR_DEPTO[depto - 1]) return false;

  const numero = cui.slice(4, 12);
  let total = 0;
  for (let i = 0; i < numero.length; i++) {
    total += Number(numero[i]) * (i + 2);
  }
  return total % 11 === Number(cui.slice(12, 13));
}
