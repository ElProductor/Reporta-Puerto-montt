import * as http from 'node:http';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import * as bcrypt from 'bcryptjs';
import * as domain from './domain';
import { URL } from 'node:url';
import {
  JsonFileRepository,
  type CitizenRecord,
  type DatabaseState,
  type MediaAttachment,
  type ReportCommentEntry,
  type ReportRecord,
  type StaffRecord,
} from './repository';

const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = process.env.REPORTA_DATA_DIR || path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PORT = Number(process.env.PORT || 3001);
const ALLOWED_ORIGINS = new Set(
  (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(x => x.trim())
    .filter(Boolean),
);

function loadAuthSecret(): string {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (process.env.JWT_SECRET) {
    if (process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET debe tener al menos 32 caracteres.');
    }
    return process.env.JWT_SECRET;
  }
  const file = path.join(DATA_DIR, '.auth-secret');
  try {
    const existing = fs.readFileSync(file, 'utf8').trim();
    if (existing.length < 40) {
      throw new Error('El secreto local de autenticación no es válido.');
    }
    return existing;
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== 'ENOENT') throw err;
    const secret = crypto.randomBytes(48).toString('base64url');
    try {
      fs.writeFileSync(file, secret, { flag: 'wx', mode: 0o600 });
      return secret;
    } catch (writeError) {
      const writeCode = (writeError as { code?: string }).code;
      if (writeCode !== 'EEXIST') throw writeError;
      return fs.readFileSync(file, 'utf8').trim();
    }
  }
}

const AUTH_SECRET = loadAuthSecret();
const PII_SECRET = process.env.PII_HASH_SECRET || AUTH_SECRET;
if (PII_SECRET.length < 32) {
  throw new Error('PII_HASH_SECRET debe tener al menos 32 caracteres.');
}

const BBOX = domain.PUERTO_MONTT_BOUNDS;
const STATES = domain.REPORT_STATUSES;
const CATEGORIES = [
  'Alumbrado público',
  'Baches y calzadas',
  'Aseo y microbasurales',
  'Áreas verdes',
  'Señalética',
  'Agua y alcantarillado',
  'Otro',
] as const;
const ROLES = ['OPERADOR_MESA', 'INSPECTOR_DEPTO', 'ADMIN_MUNICIPAL'] as const;
const VALID_DEPARTMENTS = new Set([
  'Mesa de ayuda',
  'Operaciones',
  'Aseo y Ornato',
  'Tránsito',
  'Medio Ambiente',
  'SECPLAN',
]);

const days = (n: number): string => new Date(Date.now() - n * 86_400_000).toISOString();

const repository = new JsonFileRepository(DATA_DIR, DB_FILE, PII_SECRET);
const HOLIDAYS = repository.loadHolidayCalendar();
const db: DatabaseState = repository.load();

interface LoginThrottleState {
  readonly startedAt: number;
  count: number;
}
const loginAttempts = new Map<string, LoginThrottleState>();

type HttpStatusError = Error & { status?: number };

function httpError(message: string, status: number): HttpStatusError {
  return Object.assign(new Error(message), { status });
}

function loginKey(req: http.IncomingMessage, email: unknown): string {
  return `${req.socket.remoteAddress || 'local'}:${String(email || '').trim().toLowerCase()}`;
}

function loginBlocked(req: http.IncomingMessage, email: unknown): boolean {
  const key = loginKey(req, email);
  const state = loginAttempts.get(key);
  if (!state) return false;
  if (Date.now() - state.startedAt > 15 * 60 * 1000) {
    loginAttempts.delete(key);
    return false;
  }
  return state.count >= 5;
}

function noteLoginFailure(req: http.IncomingMessage, email: unknown): boolean {
  const key = loginKey(req, email);
  const now = Date.now();
  const state = loginAttempts.get(key);
  if (!state || now - state.startedAt > 15 * 60 * 1000) {
    loginAttempts.set(key, { startedAt: now, count: 1 });
  } else {
    state.count++;
  }
  return (loginAttempts.get(key)?.count ?? 0) >= 5;
}

function persist(): Promise<void> {
  return repository.persist(db);
}

function id(): string {
  return crypto.randomUUID();
}

function active(r: ReportRecord): boolean {
  return domain.isActiveStatus(r.status);
}

function priority(r: ReportRecord): string {
  return domain.priorityFor(r.severity, r.supporters.length);
}

function workdays(from: string | Date, to: Date = new Date()): number {
  return domain.workingDaysBetween(from, to, HOLIDAYS);
}

function validateMedia(items: unknown): MediaAttachment[] {
  if (!Array.isArray(items) || items.length < 1 || items.length > 3) {
    throw httpError('Adjunta entre 1 y 3 archivos.', 400);
  }
  let total = 0;
  const clean: MediaAttachment[] = [];
  for (const rawItem of items) {
    const item = rawItem as { readonly data?: unknown } | null;
    const m = String(item?.data ?? '').match(
      /^data:(image\/(?:jpeg|png|webp)|video\/(?:mp4|webm));base64,([A-Za-z0-9+/=]+)$/,
    );
    if (!m || !m[1] || !m[2]) {
      throw httpError('Formato multimedia no admitido.', 400);
    }
    const mimeType = m[1];
    const buf = Buffer.from(m[2], 'base64');
    total += buf.length;
    if (buf.length === 0) throw httpError('Archivo vacío.', 400);
    if (mimeType === 'image/jpeg' && !(buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)) {
      throw httpError('La firma del archivo JPG no es válida.', 400);
    }
    if (mimeType === 'image/png' && ![0x89, 0x50, 0x4e, 0x47].every((x, i) => buf[i] === x)) {
      throw httpError('La firma del archivo PNG no es válida.', 400);
    }
    if (
      mimeType === 'image/webp' &&
      !(buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP')
    ) {
      throw httpError('La firma del archivo WebP no es válida.', 400);
    }
    if (mimeType === 'video/mp4' && buf.subarray(4, 8).toString() !== 'ftyp') {
      throw httpError('La firma del video MP4 no es válida.', 400);
    }
    if (mimeType === 'video/webm' && !Buffer.from([0x1a, 0x45, 0xdf, 0xa3]).equals(buf.subarray(0, 4))) {
      throw httpError('La firma del video WebM no es válida.', 400);
    }
    clean.push({ type: mimeType, data: String(item?.data ?? '') });
  }
  if (total > 5 * 1024 * 1024) {
    throw httpError('El total multimedia no puede superar 5 MB.', 400);
  }
  if (!clean.some(x => x.type.startsWith('image/'))) {
    throw httpError('La fotografía de evidencia es obligatoria; puedes agregar video.', 400);
  }
  return clean;
}

function publicHistoryComment(status: string): string {
  const labels: Record<string, string> = {
    PENDIENTE: 'Reporte recibido',
    EN_REVISION: 'En revisión municipal',
    EN_TERRENO: 'Trabajo municipal en curso',
    DERIVADO: 'Caso derivado a la unidad responsable',
    RESUELTO: 'Trabajo finalizado y verificado',
    RECHAZADO: 'Caso cerrado según evaluación municipal',
  };
  return labels[status] ?? 'Actualización del caso';
}

function publicReport(r: ReportRecord) {
  return {
    id: r.id,
    folio: r.folio,
    category: r.category,
    description: r.description,
    lat: r.lat,
    lng: r.lng,
    status: r.status,
    department: r.department,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    supportCount: r.supporters.length,
    priority: priority(r),
    before: r.before || null,
    media: (r.media || []).filter(x => x.data !== r.before && x.data !== r.after),
    after: r.after || null,
    closure: r.closure
      ? {
          text: r.closure.text,
          crew: 'Cuadrilla municipal',
          closedAt: r.closure.closedAt,
          days: workdays(r.createdAt, new Date(r.closure.closedAt)),
        }
      : null,
    history: r.history.map(h => ({
      status: h.status,
      date: h.date,
      comment: publicHistoryComment(h.status),
    })),
  };
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function tokenFor(user: { readonly id: string; readonly role: string }): string {
  const payload = Buffer.from(
    JSON.stringify({ id: user.id, role: user.role, exp: Date.now() + 8 * 3_600_000 }),
  ).toString('base64url');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

interface TokenPayload {
  readonly id: string;
  readonly role: string;
  readonly exp: number;
}

function parseTokenPayload(req: http.IncomingMessage, missingMessage: string): TokenPayload {
  const authHeader = String(req.headers.authorization || '');
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) throw httpError(missingMessage, 401);
  const [p, s] = token.split('.');
  const sig = crypto.createHmac('sha256', AUTH_SECRET).update(p || '').digest('base64url');
  if (!p || !safeEqual(sig, s || '')) throw httpError('Sesión no válida.', 401);
  let payload: TokenPayload;
  try {
    payload = JSON.parse(Buffer.from(p, 'base64url').toString()) as TokenPayload;
  } catch {
    throw httpError('Sesión no válida.', 401);
  }
  if (payload.exp < Date.now()) throw httpError('Sesión vencida.', 401);
  return payload;
}

function citizenAuth(req: http.IncomingMessage): CitizenRecord {
  const payload = parseTokenPayload(req, 'Inicia sesión como ciudadano.');
  const user = db.citizens.find(x => x.id === payload.id);
  if (!user) throw httpError('Cuenta no encontrada.', 401);
  return user;
}

function auth(req: http.IncomingMessage, roles: readonly string[] = []): StaffRecord {
  const payload = parseTokenPayload(req, 'Inicia sesión para continuar.');
  if (roles.length && !roles.includes(payload.role)) {
    throw httpError('Tu perfil no tiene permiso para esta acción.', 403);
  }
  const staff = db.staff.find(x => x.id === payload.id);
  if (!staff) throw httpError('Cuenta inactiva.', 401);
  return staff;
}

function hashPass(pass: unknown): string {
  return bcrypt.hashSync(String(pass), 12);
}

function checkPass(pass: unknown, hash: string): boolean {
  if (String(hash).startsWith('$2')) {
    return bcrypt.compareSync(String(pass), hash);
  }
  const [salt, digest] = String(hash).split(':');
  return !!salt && !!digest && safeEqual(crypto.scryptSync(String(pass), salt, 64).toString('hex'), digest);
}

function seed(): void {
  if (!db.staff.length) {
    const defaultStaff: readonly [string, string, string, string][] = [
      ['mesa@reporta.local', 'Mesa2026!', 'OPERADOR_MESA', 'Mesa de ayuda'],
      ['inspector@reporta.local', 'Inspector2026!', 'INSPECTOR_DEPTO', 'Operaciones'],
      ['admin@reporta.local', 'Admin2026!', 'ADMIN_MUNICIPAL', 'Administración'],
    ];
    db.staff = defaultStaff.map(([email, password, role, department]) => ({
      id: id(),
      email,
      passwordHash: hashPass(password),
      role,
      department,
      name:
        role === 'OPERADOR_MESA'
          ? 'Operador Mesa'
          : role === 'INSPECTOR_DEPTO'
            ? 'Inspector Municipal'
            : 'Administrador',
    }));
  }

  const cats = CATEGORIES.slice(0, 6);
  const spots: readonly (readonly [number, number])[] = [
    [-41.469, -72.941],
    [-41.474, -72.936],
    [-41.455, -72.917],
    [-41.486, -72.925],
    [-41.437, -72.917],
    [-41.505, -72.851],
    [-41.397, -73.015],
    [-41.471, -72.932],
  ];
  const sectors = ['Centro', 'Mirasol', 'Alerce', 'Pelluco', 'Bosquemar', 'Chinquihue'] as const;
  const depts = ['Operaciones', 'Aseo y Ornato', 'Tránsito'] as const;
  const earlyStatuses = ['PENDIENTE', 'EN_REVISION', 'EN_TERRENO', 'DERIVADO'] as const;

  for (let i = db.reports.length; i < 50; i++) {
    const s = spots[i % spots.length] ?? [-41.469, -72.941];
    const cat = cats[i % cats.length] ?? 'Otro';
    const status = i < 12 ? (earlyStatuses[i % 4] ?? 'PENDIENTE') : i % 6 === 0 ? 'RESUELTO' : 'PENDIENTE';
    const created = days((i % 12) + 1);
    const sector = sectors[i % sectors.length] ?? 'Centro';
    const dept = depts[i % depts.length] ?? 'Operaciones';
    db.reports.push({
      id: id(),
      folio: `RPM-${new Date().getFullYear()}-${String(i + 1).padStart(4, '0')}`,
      category: cat,
      description: `${cat}: requiere revisión municipal en sector ${sector}.`,
      lat: s[0] + ((i % 3) - 1) * 0.00018,
      lng: s[1] + ((i % 4) - 1.5) * 0.00014,
      status,
      department: dept,
      createdAt: created,
      updatedAt: created,
      anonymousName: 'Vecino',
      rut: '',
      email: '',
      phone: '',
      supporters: [],
      severity: 2 + (i % 4),
      before: null,
      after: null,
      media: [],
      closure: null,
      history: [{ status: 'PENDIENTE', date: created, comment: 'Reporte recibido' }],
    });
  }
}

fs.mkdirSync(DATA_DIR, { recursive: true });
seed();
if (!db.events.length) {
  db.events = db.reports.flatMap(r =>
    r.history.map(h => ({
      id: id(),
      reportId: r.id,
      staffId: null,
      status: h.status,
      date: h.date,
      comment: h.comment,
    })),
  );
}
for (const r of db.reports) {
  if (r.status === 'RESUELTO' && (!r.closure || Date.parse(r.closure.closedAt) <= Date.parse(r.createdAt))) {
    r.closure = {
      text: 'Incidencia atendida por la cuadrilla municipal. Se verificó la reparación en terreno.',
      crew: 'Cuadrilla municipal',
      closedAt: new Date(Date.parse(r.createdAt) + 3 * 86_400_000).toISOString(),
    };
  }
}
void persist();

function applyCors(req: http.IncomingMessage, res: http.ServerResponse): void {
  const origin = typeof req.headers.origin === 'string' ? req.headers.origin : '';
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  }
}

function json(res: http.ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
}

function body(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > 24 * 1024 * 1024) {
        reject(httpError('La solicitud supera 9 MB.', 413));
        req.destroy();
      } else {
        chunks.push(chunk);
      }
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? (JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>) : {});
      } catch {
        reject(httpError('JSON no válido.', 400));
      }
    });
    req.on('error', reject);
  });
}

function audit(r: ReportRecord, staff: StaffRecord, status: string, comment: string, department = r.department): void {
  r.status = status;
  r.department = department;
  r.updatedAt = new Date().toISOString();
  r.history.push({ status, date: r.updatedAt, comment, staff: staff.name });
  db.events.push({ id: id(), reportId: r.id, staffId: staff.id, status, date: r.updatedAt, comment });
  if (r.citizenId) {
    db.notifications.push({
      id: id(),
      citizenId: r.citizenId,
      reportId: r.id,
      folio: r.folio,
      status,
      message: publicHistoryComment(status),
      date: r.updatedAt,
      readAt: null,
    });
  }
}

const CONTACT_PATTERN = /\S+@\S+\.\S+|\b\d{7,8}-?[0-9kK]\b|\+?\d[\d\s()-]{7,}/i;

async function route(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  const u = new URL(req.url || '/', 'http://localhost');
  const p = u.pathname;
  try {
    if (p === '/api/health') {
      json(res, 200, { ok: true, service: 'Reporta Puerto Montt', version: '1.0.0', storage: 'local-json-relational-3nf' });
      return;
    }
    if (p === '/api/meta') {
      json(res, 200, { categories: CATEGORIES, bbox: BBOX, polygon: domain.PUERTO_MONTT_POLYGON, states: STATES, holidays: [...HOLIDAYS].sort() });
      return;
    }
    if (p === '/api/reports' && req.method === 'GET') {
      let list = db.reports.filter(r => r.status !== 'RECHAZADO');
      const catFilter = u.searchParams.get('category');
      const stFilter = u.searchParams.get('status');
      if (catFilter) list = list.filter(r => r.category === catFilter);
      if (stFilter) list = list.filter(r => r.status === stFilter);
      const since = u.searchParams.get('since');
      const until = u.searchParams.get('until');
      if (since) list = list.filter(r => r.createdAt >= since);
      if (until) list = list.filter(r => r.createdAt <= `${until}T23:59:59.999Z`);
      json(res, 200, list.map(publicReport));
      return;
    }
    if (p === '/api/reports/duplicate' && req.method === 'POST') {
      const b = await body(req);
      const lat = Number(b.lat);
      const lng = Number(b.lng);
      const category = String(b.category ?? '');
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !(CATEGORIES as readonly string[]).includes(category)) {
        json(res, 400, { error: 'Ubicación o categoría no válida.' });
        return;
      }
      const nearest = db.reports
        .filter(x => active(x) && x.category === category)
        .map(x => ({ r: x, d: domain.distanceMeters({ lat, lng }, { lat: x.lat, lng: x.lng }) }))
        .filter(x => x.d <= 25)
        .sort((a, bItem) => a.d - bItem.d)[0];
      json(res, 200, {
        duplicate: nearest ? publicReport(nearest.r) : null,
        distance: nearest ? Math.round(nearest.d * 100) / 100 : null,
      });
      return;
    }
    if (p.startsWith('/api/reports/') && p.endsWith('/comments') && req.method === 'GET') {
      const folio = p.split('/')[3] ?? '';
      const r = db.reports.find(x => x.folio === folio);
      if (!r) {
        json(res, 404, { error: 'No se encontró el reporte.' });
        return;
      }
      json(res, 200, {
        comments: (r.comments || [])
          .filter(c => c.status === 'PUBLICADO')
          .map(({ id: cid, text, date }) => ({ id: cid, name: 'Vecino/a', text, date })),
      });
      return;
    }
    if (p.startsWith('/api/reports/') && p.endsWith('/comments') && req.method === 'POST') {
      const c = citizenAuth(req);
      const folio = p.split('/')[3] ?? '';
      const r = db.reports.find(x => x.folio === folio);
      const b = await body(req);
      if (!r) {
        json(res, 404, { error: 'No se encontró el reporte.' });
        return;
      }
      const text = String(b.text || '').trim();
      const name = c.name.slice(0, 50);
      if (text.length < 5 || text.length > 500) {
        json(res, 400, { error: 'El comentario debe tener entre 5 y 500 caracteres.' });
        return;
      }
      if (CONTACT_PATTERN.test(text)) {
        json(res, 400, { error: 'No publiques teléfonos, RUT ni correos en comentarios.' });
        return;
      }
      if (!r.comments) r.comments = [];
      r.comments.push({
        id: id(),
        citizenId: c.id,
        name,
        text,
        status: 'PENDIENTE',
        date: new Date().toISOString(),
      });
      await persist();
      json(res, 201, { message: 'Comentario enviado a revisión municipal.' });
      return;
    }
    if (p === '/api/admin/comments' && req.method === 'GET') {
      auth(req, ['ADMIN_MUNICIPAL']);
      json(
        res,
        200,
        db.reports.flatMap(r =>
          (r.comments || []).map(c => ({ ...c, folio: r.folio, category: r.category, reportId: r.id })),
        ),
      );
      return;
    }
    if (p.startsWith('/api/admin/comments/') && req.method === 'PATCH') {
      const staff = auth(req, ['ADMIN_MUNICIPAL']);
      const cid = p.split('/')[4] ?? '';
      const b = await body(req);
      let item: ReportCommentEntry | undefined;
      for (const r of db.reports) {
        const found = (r.comments || []).find(c => c.id === cid);
        if (found) {
          item = found;
          break;
        }
      }
      if (!item) {
        json(res, 404, { error: 'Comentario no encontrado.' });
        return;
      }
      const status = String(b.status ?? '');
      if (!['PUBLICADO', 'OCULTO'].includes(status)) {
        json(res, 400, { error: 'Moderación no válida.' });
        return;
      }
      item.status = status;
      item.moderatedBy = staff.id;
      item.moderatedAt = new Date().toISOString();
      await persist();
      json(res, 200, { ok: true });
      return;
    }
    if (p === '/api/reports' && req.method === 'POST') {
      const citizen = citizenAuth(req);
      const b = await body(req);
      const lat = Number(b.lat);
      const lng = Number(b.lng);
      const category = String(b.category ?? '');
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !domain.isWithinPuertoMontt({ lat, lng })) {
        json(res, 400, { error: 'Ubicación fuera del límite comunal de Puerto Montt.' });
        return;
      }
      if (!(CATEGORIES as readonly string[]).includes(category)) {
        json(res, 400, { error: 'Selecciona una categoría válida.' });
        return;
      }
      if (typeof b.description !== 'string' || b.description.trim().length < 10 || b.description.length > 1500) {
        json(res, 400, { error: 'La descripción debe tener entre 10 y 1.500 caracteres.' });
        return;
      }
      if (!domain.validateRutModulo11(citizen.rut)) {
        json(res, 400, { error: 'RUT inválido en la cuenta ciudadana.' });
        return;
      }
      const dupe = db.reports
        .filter(x => active(x) && x.category === category)
        .some(x => domain.distanceMeters({ lat, lng }, { lat: x.lat, lng: x.lng }) <= 25);
      if (dupe) {
        json(res, 409, {
          error: 'Hay un reporte de la misma categoría a 25 metros o menos. Puedes apoyarlo desde el mapa.',
          duplicate: true,
        });
        return;
      }
      const media = validateMedia(b.media);
      if (typeof b.photo !== 'string' || !b.photo.startsWith('data:image/')) {
        json(res, 400, { error: 'La fotografía de evidencia es obligatoria.' });
        return;
      }
      const m = b.photo.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!m || !m[1] || !m[2]) {
        json(res, 400, { error: 'Formato de imagen no admitido.' });
        return;
      }
      const buf = Buffer.from(m[2], 'base64');
      if (buf.length > 5 * 1024 * 1024) {
        json(res, 400, { error: 'La foto no puede superar 5 MB.' });
        return;
      }
      const signatures: Record<string, readonly number[]> = {
        'image/jpeg': [0xff, 0xd8, 0xff],
        'image/png': [0x89, 0x50, 0x4e, 0x47],
        'image/webp': [0x52, 0x49, 0x46, 0x46],
      };
      const expectedSig = signatures[m[1]] ?? [];
      if (!expectedSig.every((x, i) => buf[i] === x)) {
        json(res, 400, { error: 'El contenido del archivo no coincide con su formato de imagen.' });
        return;
      }
      const before = b.photo;
      const id0 = id();
      const nowIso = new Date().toISOString();
      const r: ReportRecord = {
        id: id0,
        folio: `RPM-${new Date().getFullYear()}-${String(db.reports.length + 1).padStart(4, '0')}`,
        category,
        description: b.description.trim(),
        lat,
        lng,
        citizenId: citizen.id,
        status: 'PENDIENTE',
        department: 'Mesa de ayuda',
        createdAt: nowIso,
        updatedAt: nowIso,
        anonymousName: citizen.name,
        rut: citizen.rut,
        email: citizen.email,
        phone: String(b.phone || '').slice(0, 30),
        supporters: [],
        severity: Number(b.severity) || 2,
        before,
        media,
        after: null,
        closure: null,
        history: [{ status: 'PENDIENTE', date: nowIso, comment: 'Reporte recibido' }],
      };
      db.reports.push(r);
      db.events.push({ id: id(), reportId: id0, status: r.status, date: r.createdAt, comment: 'Creación ciudadana' });
      db.notifications.push({
        id: id(),
        citizenId: citizen.id,
        reportId: id0,
        folio: r.folio,
        status: r.status,
        message: 'Recibimos tu reporte y lo enviaremos a revisión municipal.',
        date: r.createdAt,
        readAt: null,
      });
      await persist();
      json(res, 201, { report: publicReport(r) });
      return;
    }
    if (p.startsWith('/api/reports/') && p.endsWith('/support') && req.method === 'POST') {
      const citizen = citizenAuth(req);
      const folio = p.split('/')[3] ?? '';
      const r = db.reports.find(x => x.folio === folio);
      if (!r) {
        json(res, 404, { error: 'No se encontró el reporte.' });
        return;
      }
      const clean = crypto
        .createHmac('sha256', PII_SECRET)
        .update(citizen.rut.replace(/[.\-\s]/g, '').toUpperCase())
        .digest('hex');
      if (r.supporters.includes(clean)) {
        json(res, 409, { error: 'Este RUT ya apoyó el reporte.' });
        return;
      }
      r.supporters.push(clean);
      r.updatedAt = new Date().toISOString();
      await persist();
      json(res, 200, { report: publicReport(r) });
      return;
    }
    if (p.startsWith('/api/reports/') && req.method === 'GET') {
      const key = p.split('/')[3] ?? '';
      const r = db.reports.find(x => x.folio.toLowerCase() === key.toLowerCase());
      if (!r) {
        json(res, 404, { error: 'No se encontró un reporte con ese folio.' });
        return;
      }
      json(res, 200, { report: publicReport(r) });
      return;
    }
    if (p === '/api/track' && req.method === 'POST') {
      const citizen = citizenAuth(req);
      const rut = citizen.rut.replace(/[.\-\s]/g, '').toUpperCase();
      const list = db.reports.filter(x => x.rut.replace(/[.\-\s]/g, '').toUpperCase() === rut);
      json(res, 200, { reports: list.map(publicReport) });
      return;
    }
    if (p === '/api/citizens/register' && req.method === 'POST') {
      const b = await body(req);
      const email = String(b.email || '').trim().toLowerCase();
      const rut = String(b.rut || '').trim();
      if (!domain.validateRutModulo11(rut)) {
        json(res, 400, { error: 'RUT inválido.' });
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        json(res, 400, { error: 'Correo inválido.' });
        return;
      }
      if (String(b.password || '').length < 10) {
        json(res, 400, { error: 'La contraseña debe tener al menos 10 caracteres.' });
        return;
      }
      const normRut = rut.replace(/[.\-\s]/g, '').toUpperCase();
      if (db.citizens.some(c => c.rut.replace(/[.\-\s]/g, '').toUpperCase() === normRut || c.email === email)) {
        json(res, 409, { error: 'Ya existe una cuenta con ese correo o RUT.' });
        return;
      }
      const c: CitizenRecord = {
        id: id(),
        name: String(b.name || '').trim().slice(0, 80),
        email,
        rut,
        passwordHash: hashPass(b.password),
        createdAt: new Date().toISOString(),
      };
      db.citizens.push(c);
      await persist();
      json(res, 201, {
        token: tokenFor({ id: c.id, role: 'CIUDADANO' }),
        user: { name: c.name, email: c.email, rut: c.rut, role: 'CIUDADANO', rutValid: true, identityVerified: false },
      });
      return;
    }
    if (p === '/api/citizens/login' && req.method === 'POST') {
      const b = await body(req);
      const email = String(b.email || '').trim().toLowerCase();
      if (loginBlocked(req, email)) {
        json(res, 429, { error: 'Demasiados intentos. Espera 15 minutos antes de reintentar.' });
        return;
      }
      const c = db.citizens.find(x => x.email === email);
      if (!c || !checkPass(b.password || '', c.passwordHash)) {
        json(res, noteLoginFailure(req, email) ? 429 : 401, { error: 'Correo o contraseña incorrectos.' });
        return;
      }
      if (!String(c.passwordHash).startsWith('$2')) {
        c.passwordHash = hashPass(b.password);
        await persist();
      }
      loginAttempts.delete(loginKey(req, email));
      json(res, 200, {
        token: tokenFor({ id: c.id, role: 'CIUDADANO' }),
        user: {
          name: c.name,
          email: c.email,
          rut: c.rut,
          role: 'CIUDADANO',
          rutValid: true,
          identityVerified: !!c.identityVerified,
        },
      });
      return;
    }
    if (p === '/api/citizens/me' && req.method === 'GET') {
      const c = citizenAuth(req);
      json(res, 200, {
        user: {
          name: c.name,
          email: c.email,
          rut: c.rut,
          role: 'CIUDADANO',
          rutValid: true,
          identityVerified: !!c.identityVerified,
        },
      });
      return;
    }
    if (p === '/api/citizens/notifications' && req.method === 'GET') {
      const c = citizenAuth(req);
      const items = db.notifications
        .filter(n => n.citizenId === c.id)
        .sort((a, bItem) => bItem.date.localeCompare(a.date))
        .map(({ id: notificationId, folio, status, message, date, readAt }) => ({
          id: notificationId,
          folio,
          status,
          message,
          date,
          readAt,
        }));
      json(res, 200, { notifications: items });
      return;
    }
    if (p === '/api/citizens/notifications/read-all' && req.method === 'PATCH') {
      const c = citizenAuth(req);
      const now = new Date().toISOString();
      for (const n of db.notifications) {
        if (n.citizenId === c.id && !n.readAt) n.readAt = now;
      }
      await persist();
      json(res, 200, { ok: true });
      return;
    }
    if (p === '/api/citizens/verification-request' && req.method === 'POST') {
      const c = citizenAuth(req);
      const prior = db.verificationRequests.find(x => x.citizenId === c.id && x.status === 'PENDIENTE');
      if (prior) {
        json(res, 200, { folio: prior.folio, status: prior.status });
        return;
      }
      const r = {
        id: id(),
        folio: `VER-${new Date().getFullYear()}-${String(db.verificationRequests.length + 1).padStart(4, '0')}`,
        citizenId: c.id,
        name: c.name,
        email: c.email,
        rut: c.rut,
        status: 'PENDIENTE',
        createdAt: new Date().toISOString(),
        reviewedBy: null,
        reviewedAt: null,
      };
      db.verificationRequests.push(r);
      await persist();
      json(res, 201, { folio: r.folio, status: r.status });
      return;
    }
    if (p === '/api/admin/verification-requests' && req.method === 'GET') {
      auth(req, ['ADMIN_MUNICIPAL']);
      json(res, 200, db.verificationRequests);
      return;
    }
    if (p.startsWith('/api/admin/verification-requests/') && req.method === 'PATCH') {
      const staff = auth(req, ['ADMIN_MUNICIPAL']);
      const rid = p.split('/')[4] ?? '';
      const b = await body(req);
      const r = db.verificationRequests.find(x => x.id === rid);
      if (!r) {
        json(res, 404, { error: 'Solicitud no encontrada.' });
        return;
      }
      const decision = String(b.status ?? '');
      if (!['APROBADA', 'RECHAZADA'].includes(decision)) {
        json(res, 400, { error: 'Decisión no válida.' });
        return;
      }
      r.status = decision;
      r.reviewedBy = staff.id;
      r.reviewedAt = new Date().toISOString();
      r.reviewNote = String(b.note || '').slice(0, 300);
      const citizen = db.citizens.find(x => x.id === r.citizenId);
      if (citizen) citizen.identityVerified = decision === 'APROBADA';
      await persist();
      json(res, 200, { ok: true });
      return;
    }
    if (p === '/api/auth/login' && req.method === 'POST') {
      const b = await body(req);
      const email = String(b.email || '').trim().toLowerCase();
      if (loginBlocked(req, email)) {
        json(res, 429, { error: 'Demasiados intentos. Espera 15 minutos antes de reintentar.' });
        return;
      }
      const s = db.staff.find(x => x.email.toLowerCase() === email);
      if (!s || !checkPass(b.password || '', s.passwordHash)) {
        json(res, noteLoginFailure(req, email) ? 429 : 401, { error: 'Correo o contraseña incorrectos.' });
        return;
      }
      if (!String(s.passwordHash).startsWith('$2')) {
        s.passwordHash = hashPass(b.password);
        await persist();
      }
      loginAttempts.delete(loginKey(req, email));
      json(res, 200, {
        token: tokenFor(s),
        user: { name: s.name, email: s.email, role: s.role, department: s.department },
      });
      return;
    }
    if (p === '/api/admin/me' && req.method === 'GET') {
      const s = auth(req);
      json(res, 200, { user: { name: s.name, email: s.email, role: s.role, department: s.department } });
      return;
    }
    if (p === '/api/admin/reports' && req.method === 'GET') {
      const s = auth(req);
      let list = db.reports.filter(r => r.status !== 'RECHAZADO');
      if (s.role === 'INSPECTOR_DEPTO') {
        list = list.filter(r => !r.department || r.department === s.department);
      }
      json(
        res,
        200,
        list.map(r => ({
          ...publicReport(r),
          citizen: { name: r.anonymousName, rut: r.rut, email: r.email, phone: r.phone },
        })),
      );
      return;
    }
    if (p.startsWith('/api/admin/reports/') && p.endsWith('/transition') && req.method === 'POST') {
      const s = auth(req, ROLES);
      const b = await body(req);
      const rid = p.split('/')[4] ?? '';
      const r = db.reports.find(x => x.id === rid);
      if (!r) {
        json(res, 404, { error: 'No se encontró el reporte.' });
        return;
      }
      if (s.role === 'INSPECTOR_DEPTO' && r.department && r.department !== s.department) {
        json(res, 403, { error: 'Este reporte pertenece a otro departamento.' });
        return;
      }
      const next = String(b.status ?? '');
      if (!domain.isAllowedTransition(r.status, next)) {
        json(res, 409, { error: `Transición no permitida: ${r.status} → ${next}.` });
        return;
      }
      if (domain.requiresJustification(next, b.comment)) {
        json(res, 400, { error: 'La derivación o rechazo exige una justificación de al menos 20 caracteres.' });
        return;
      }
      if (next === 'EN_TERRENO' && s.role === 'OPERADOR_MESA') {
        json(res, 403, { error: 'Solo inspector o administrador puede despachar a terreno.' });
        return;
      }
      const dep = String(b.department || r.department);
      if (!VALID_DEPARTMENTS.has(dep)) {
        json(res, 400, { error: 'Departamento inválido.' });
        return;
      }
      audit(r, s, next, String(b.comment || '').trim() || 'Actualización administrativa', dep);
      await persist();
      json(res, 200, { report: publicReport(r) });
      return;
    }
    if (p === '/api/admin/reports/batch' && req.method === 'POST') {
      const s = auth(req, ROLES);
      const b = await body(req);
      const ids = b.ids;
      const next = String(b.status ?? '');
      const comment = String(b.comment || '').trim();
      const department = String(b.department || 'Aseo y Ornato');

      if (!Array.isArray(ids) || ids.length < 1 || ids.length > 100 || new Set(ids).size !== ids.length) {
        json(res, 400, { error: 'Selecciona entre 1 y 100 casos distintos.' });
        return;
      }
      if (!domain.isReportStatus(next) || !VALID_DEPARTMENTS.has(department)) {
        json(res, 400, { error: 'Estado o departamento inválido.' });
        return;
      }
      if (domain.requiresJustification(next, comment)) {
        json(res, 400, { error: 'La derivación o rechazo exige una justificación de al menos 20 caracteres.' });
        return;
      }
      const records = ids.map(rid => db.reports.find(r => r.id === rid));
      if (records.some(r => !r)) {
        json(res, 404, { error: 'Uno o más casos ya no existen. No se aplicó ningún cambio.' });
        return;
      }
      const validRecords = records as ReportRecord[];
      for (const r of validRecords) {
        if (!domain.isAllowedTransition(r.status, next)) {
          json(res, 409, { error: `No se aplicó ningún cambio: ${r.folio} no admite ${next} desde ${r.status}.` });
          return;
        }
        if (s.role === 'INSPECTOR_DEPTO' && r.department && r.department !== s.department) {
          json(res, 403, { error: 'No se aplicó ningún cambio: hay casos fuera de tu departamento.' });
          return;
        }
        if (next === 'EN_TERRENO' && s.role === 'OPERADOR_MESA') {
          json(res, 403, { error: 'Solo inspector o administrador puede despachar a terreno.' });
          return;
        }
      }
      const originals = validRecords.map(r => JSON.parse(JSON.stringify(r)) as ReportRecord);
      const eventCount = db.events.length;
      try {
        for (const r of validRecords) {
          audit(r, s, next, comment || `Actualización municipal por lote (${validRecords.length} casos)`, department);
        }
        await persist();
      } catch (err) {
        validRecords.forEach((r, i) => {
          const orig = originals[i];
          if (orig) Object.assign(r, orig);
        });
        db.events.length = eventCount;
        throw err;
      }
      json(res, 200, { updated: validRecords.length, reports: validRecords.map(publicReport) });
      return;
    }
    if (p.startsWith('/api/admin/reports/') && p.endsWith('/close') && req.method === 'POST') {
      const s = auth(req, ['INSPECTOR_DEPTO', 'ADMIN_MUNICIPAL']);
      const b = await body(req);
      const rid = p.split('/')[4] ?? '';
      const r = db.reports.find(x => x.id === rid);
      if (!r) {
        json(res, 404, { error: 'No se encontró el reporte.' });
        return;
      }
      if (s.role === 'INSPECTOR_DEPTO' && r.department && r.department !== s.department) {
        json(res, 403, { error: 'Este reporte pertenece a otro departamento.' });
        return;
      }
      const closeGate = domain.validateCloseGate({
        status: r.status,
        technicalNote: b.text,
        hasPhoto: typeof b.photo === 'string' && b.photo.length > 0,
      });
      if (!closeGate.ok) {
        const reasons: Record<'WRONG_STATUS' | 'SHORT_NOTE' | 'PHOTO_REQUIRED', string> = {
          WRONG_STATUS: 'Solo se pueden cerrar reportes que estén En terreno.',
          SHORT_NOTE: 'El informe técnico debe tener al menos 50 caracteres.',
          PHOTO_REQUIRED: 'La fotografía posterior es obligatoria.',
        };
        json(res, closeGate.reason === 'WRONG_STATUS' ? 409 : 400, { error: reasons[closeGate.reason] });
        return;
      }
      const noteText = String(b.text ?? '');
      const crewText = String(b.crew || '');
      if (CONTACT_PATTERN.test(noteText) || CONTACT_PATTERN.test(crewText)) {
        json(res, 400, { error: 'El informe y el nombre de cuadrilla no deben incluir datos de contacto o RUT.' });
        return;
      }
      if (typeof b.photo !== 'string') {
        json(res, 400, { error: 'La fotografía posterior es obligatoria.' });
        return;
      }
      const m = b.photo.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!m || !m[1] || !m[2]) {
        json(res, 400, { error: 'La evidencia debe ser JPG, PNG o WebP válida.' });
        return;
      }
      const mediaPayload = Array.isArray(b.media) ? b.media : [{ type: m[1], data: b.photo }];
      validateMedia(mediaPayload);
      const buf = Buffer.from(m[2], 'base64');
      const sigMap: Record<string, readonly number[]> = {
        'image/jpeg': [0xff, 0xd8, 0xff],
        'image/png': [0x89, 0x50, 0x4e, 0x47],
        'image/webp': [0x52, 0x49, 0x46, 0x46],
      };
      const sig = sigMap[m[1]] ?? [];
      if (buf.length > 5 * 1024 * 1024 || !sig.every((x, i) => buf[i] === x)) {
        json(res, 400, { error: 'Imagen posterior inválida o mayor a 5 MB.' });
        return;
      }
      r.after = b.photo;
      r.closure = {
        text: noteText.trim(),
        crew: String(b.crew || 'Cuadrilla municipal').slice(0, 120),
        closedAt: new Date().toISOString(),
      };
      audit(r, s, 'RESUELTO', 'Cierre técnico verificado');
      await persist();
      json(res, 200, { report: publicReport(r) });
      return;
    }
    if (p === '/api/admin/metrics' && req.method === 'GET') {
      auth(req);
      const all = db.reports;
      const done = all.filter(r => r.status === 'RESUELTO');
      const avg = done.length
        ? done.reduce((a, r) => a + workdays(r.createdAt, new Date(r.closure?.closedAt || r.updatedAt)), 0) / done.length
        : 0;
      json(res, 200, {
        total: all.length,
        open: all.filter(active).length,
        resolved: done.length,
        rejected: all.filter(r => r.status === 'RECHAZADO').length,
        resolutionRate: all.length ? Math.round((done.length / all.length) * 1000) / 10 : 0,
        averageWorkdays: Math.round(avg * 10) / 10,
        byStatus: Object.fromEntries(STATES.map(x => [x, all.filter(r => r.status === x).length])),
        byCategory: Object.fromEntries(CATEGORIES.map(x => [x, all.filter(r => r.category === x).length])),
        byDepartment: Object.fromEntries([...new Set(all.map(r => r.department))].map(x => [x, all.filter(r => r.department === x).length])),
        events: db.events.length,
        heat: all.filter(r => active(r)).map(r => ({ lat: r.lat, lng: r.lng, intensity: r.supporters.length + 1 })),
      });
      return;
    }
    json(res, 404, { error: 'Ruta no encontrada.' });
  } catch (err) {
    const e = err as HttpStatusError;
    json(res, e.status || 500, { error: e.status ? e.message : 'Error interno al procesar la solicitud.' });
  }
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  applyCors(req, res);
  if ((req.url || '').startsWith('/api/')) {
    void route(req, res);
    return;
  }
  let reqPath: string;
  try {
    reqPath = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
  } catch {
    reqPath = '/';
  }
  if (reqPath === '/' || reqPath === '/app' || reqPath === '/app/') reqPath = '/citizen.html';
  if (reqPath === '/admin' || reqPath === '/admin/') reqPath = '/municipal.html';
  const full = path.resolve(ROOT, 'public', `.${reqPath}`);
  if (!full.startsWith(path.resolve(ROOT, 'public') + path.sep)) {
    res.writeHead(403);
    res.end();
    return;
  }
  fs.readFile(full, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('No encontrado');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(full)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Reporta Puerto Montt disponible en http://localhost:${PORT}`);
});
