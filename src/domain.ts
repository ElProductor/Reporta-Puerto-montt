export const REPORT_STATUSES = [
  'PENDIENTE',
  'EN_REVISION',
  'EN_TERRENO',
  'DERIVADO',
  'RESUELTO',
  'RECHAZADO',
] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];

export interface Coordinates {
  readonly lat: number;
  readonly lng: number;
}

export interface MunicipalBounds {
  readonly minLat: number;
  readonly maxLat: number;
  readonly minLng: number;
  readonly maxLng: number;
}

export interface CloseGateInput {
  readonly status: string;
  readonly technicalNote: unknown;
  readonly hasPhoto: boolean;
}

export type CloseGateResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: 'WRONG_STATUS' | 'SHORT_NOTE' | 'PHOTO_REQUIRED' };

export const PUERTO_MONTT_BOUNDS: MunicipalBounds = Object.freeze({
  minLat: -41.65,
  maxLat: -41.3,
  minLng: -73.25,
  maxLng: -72.6,
});

/**
 * Polígono comunal aproximado de Puerto Montt (continental y corredor Carretera Austral).
 * Refina el BBox rectangular excluyendo áreas marítimas del Seno de Reloncaví y comunas vecinas.
 */
export const PUERTO_MONTT_POLYGON: readonly Coordinates[] = Object.freeze([
  { lat: -41.322, lng: -73.225 },
  { lat: -41.345, lng: -73.060 },
  { lat: -41.335, lng: -72.975 },
  { lat: -41.355, lng: -72.830 },
  { lat: -41.400, lng: -72.690 },
  { lat: -41.520, lng: -72.620 },
  { lat: -41.640, lng: -72.640 },
  { lat: -41.625, lng: -72.780 },
  { lat: -41.545, lng: -72.860 },
  { lat: -41.515, lng: -72.925 },
  { lat: -41.555, lng: -73.040 },
  { lat: -41.520, lng: -73.170 },
  { lat: -41.420, lng: -73.235 },
]);

const ALLOWED_TRANSITIONS: Readonly<Record<ReportStatus, readonly ReportStatus[]>> = {
  PENDIENTE: ['EN_REVISION', 'RECHAZADO'],
  EN_REVISION: ['EN_TERRENO', 'DERIVADO', 'RECHAZADO'],
  EN_TERRENO: ['DERIVADO'],
  DERIVADO: ['EN_REVISION'],
  RESUELTO: [],
  RECHAZADO: [],
};

export function isReportStatus(value: string): value is ReportStatus {
  return (REPORT_STATUSES as readonly string[]).includes(value);
}

export function isActiveStatus(value: string): boolean {
  return value === 'PENDIENTE' || value === 'EN_REVISION' || value === 'EN_TERRENO';
}

export function isAllowedTransition(from: string, to: string): boolean {
  return isReportStatus(from) && isReportStatus(to) && ALLOWED_TRANSITIONS[from].includes(to);
}

export function requiresJustification(status: string, comment: unknown, minLength = 20): boolean {
  if (status !== 'DERIVADO' && status !== 'RECHAZADO') return false;
  return typeof comment !== 'string' || comment.trim().length < minLength;
}

export function validateRutModulo11(raw: unknown): boolean {
  if (typeof raw !== 'string') return false;
  const rut = raw.replace(/[.\-\s]/g, '').toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(rut)) return false;

  const body = rut.slice(0, -1);
  if (/^(\d)\1+$/.test(body)) return false;

  let sum = 0;
  let multiplier = 2;
  for (let index = body.length - 1; index >= 0; index--) {
    const digit = Number(body[index]);
    if (!Number.isInteger(digit)) return false;
    sum += digit * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? '0' : remainder === 10 ? 'K' : String(remainder);
  return expected === rut.at(-1);
}

export function isPointInPolygon(point: Coordinates, polygon: readonly Coordinates[]): boolean {
  const count = polygon.length;
  if (count < 3) return false;
  let inside = false;
  for (let i = 0, j = count - 1; i < count; j = i++) {
    const vi = polygon[i];
    const vj = polygon[j];
    if (!vi || !vj) continue;
    const intersects = (vi.lat > point.lat) !== (vj.lat > point.lat)
      && point.lng < ((vj.lng - vi.lng) * (point.lat - vi.lat)) / (vj.lat - vi.lat) + vi.lng;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function isWithinPuertoMontt(coordinates: Coordinates): boolean {
  const { lat, lng } = coordinates;
  if (
    !Number.isFinite(lat)
    || !Number.isFinite(lng)
    || lat < PUERTO_MONTT_BOUNDS.minLat
    || lat > PUERTO_MONTT_BOUNDS.maxLat
    || lng < PUERTO_MONTT_BOUNDS.minLng
    || lng > PUERTO_MONTT_BOUNDS.maxLng
  ) {
    return false;
  }
  return isPointInPolygon(coordinates, PUERTO_MONTT_POLYGON);
}

export function distanceMeters(a: Coordinates, b: Coordinates): number {
  const radians = (degrees: number): number => degrees * Math.PI / 180;
  const deltaLat = radians(b.lat - a.lat);
  const deltaLng = radians(b.lng - a.lng);
  const haversine = Math.sin(deltaLat / 2) ** 2
    + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(deltaLng / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function priorityFor(severity: number | undefined, supporterCount: number): 'BAJA' | 'MEDIA' | 'ALTA' | 'CRÍTICA' {
  const score = (severity || 2) + Math.floor(Math.log2(Math.max(1, supporterCount)) * 1.5);
  if (score >= 7) return 'CRÍTICA';
  if (score >= 5) return 'ALTA';
  if (score >= 3) return 'MEDIA';
  return 'BAJA';
}

export function workingDaysBetween(
  from: Date | string,
  to: Date | string = new Date(),
  holidays: ReadonlySet<string> = new Set<string>(),
): number {
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  let count = 0;
  while (start < end) {
    start.setDate(start.getDate() + 1);
    const weekday = start.getDay();
    const isoDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
    if (weekday !== 0 && weekday !== 6 && !holidays.has(isoDate)) count++;
  }
  return count;
}

export function validateCloseGate(input: CloseGateInput): CloseGateResult {
  if (input.status !== 'EN_TERRENO') return { ok: false, reason: 'WRONG_STATUS' };
  if (typeof input.technicalNote !== 'string' || input.technicalNote.trim().length < 50) {
    return { ok: false, reason: 'SHORT_NOTE' };
  }
  if (!input.hasPhoto) return { ok: false, reason: 'PHOTO_REQUIRED' };
  return { ok: true };
}
