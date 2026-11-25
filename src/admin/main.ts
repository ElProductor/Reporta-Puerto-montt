import type { Layer, Map as LeafletMap, Marker, TileLayer } from 'leaflet';
import { isWithinPuertoMontt, validateRutModulo11, workingDaysBetween } from '../domain';
import type { ChartInstance } from '../types/browser-globals';
import { createCanvasHeatmapLayer } from './heatmap';

interface MediaItem {
  readonly type: string;
  readonly data: string;
}

interface HistoryEntry {
  readonly status: string;
  readonly date: string;
  readonly comment: string;
}

interface ClosureInfo {
  readonly text: string;
  readonly crew: string;
  readonly closedAt: string;
  readonly days: number;
}

interface PublicReport {
  readonly id: string;
  readonly folio: string;
  readonly category: string;
  readonly description: string;
  readonly lat: number;
  readonly lng: number;
  readonly status: string;
  readonly department: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly supportCount: number;
  readonly priority: string;
  readonly before: string | null;
  readonly after: string | null;
  readonly media: readonly MediaItem[];
  readonly closure: ClosureInfo | null;
  readonly history: readonly HistoryEntry[];
}

interface AdminReport extends PublicReport {
  readonly citizen?: {
    readonly name: string;
    readonly rut: string;
    readonly email: string;
    readonly phone: string;
  };
}

interface StaffUser {
  readonly name: string;
  readonly email: string;
  readonly role: string;
  readonly department: string;
}

interface CitizenUser {
  readonly name: string;
  readonly email: string;
  readonly rut: string;
  readonly role: string;
  readonly identityVerified: boolean;
}

interface AdminMetrics {
  readonly total: number;
  readonly open: number;
  readonly resolved: number;
  readonly rejected: number;
  readonly resolutionRate: number;
  readonly averageWorkdays: number;
  readonly byStatus: Record<string, number>;
  readonly byCategory: Record<string, number>;
  readonly byDepartment: Record<string, number>;
  readonly events: number;
  readonly heat: readonly { readonly lat: number; readonly lng: number; readonly intensity: number }[];
}

interface VerificationRequestItem {
  readonly id: string;
  readonly folio: string;
  readonly name: string;
  readonly email: string;
  readonly rut: string;
  readonly status: string;
  readonly createdAt: string;
}

interface AdminCommentItem {
  readonly id: string;
  readonly folio: string;
  readonly name: string;
  readonly text: string;
  readonly status: string;
}

interface CitizenNotification {
  readonly id: string;
  readonly folio: string;
  readonly status: string;
  readonly message: string;
  readonly date: string;
  readonly readAt: string | null;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: string }>;
}

function $<T extends HTMLElement = HTMLElement>(selector: string, root: ParentNode = document): T | null {
  return root.querySelector<T>(selector);
}

function $$<T extends HTMLElement = HTMLElement>(selector: string, root: ParentNode = document): T[] {
  return Array.from(root.querySelectorAll<T>(selector));
}

const esc = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, ch =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] ?? ch,
  );

const dateFmt = (d: string): string =>
  new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short' }).format(new Date(d));

const dateTime = (d: string): string =>
  new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d));

const HUMAN_STATUS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  EN_REVISION: 'En revisión',
  EN_TERRENO: 'En terreno',
  DERIVADO: 'Derivado',
  RESUELTO: 'Resuelto',
  RECHAZADO: 'Rechazado',
};

const STATUS_SYMBOL: Record<string, string> = {
  PENDIENTE: '!',
  EN_REVISION: '⌕',
  EN_TERRENO: '⚒',
  DERIVADO: '↗',
  RESUELTO: '✓',
  RECHAZADO: '×',
};

const STATUS_COLOR: Record<string, string> = {
  PENDIENTE: 'red',
  EN_REVISION: 'amber',
  EN_TERRENO: 'blue',
  DERIVADO: 'purple',
  RESUELTO: 'green',
  RECHAZADO: 'red',
};

const CATEGORY_ICON: Record<string, string> = {
  'Alumbrado público': '☼',
  'Baches y calzadas': '⌁',
  'Aseo y microbasurales': '♲',
  'Áreas verdes': '❀',
  Señalética: '⚑',
  'Agua y alcantarillado': '≈',
  Otro: '✳',
};

const DEPARTMENTS = ['Mesa de ayuda', 'Operaciones', 'Aseo y Ornato', 'Tránsito', 'Medio Ambiente', 'SECPLAN'] as const;

const human = (s: string): string => HUMAN_STATUS[s] ?? s;
const sym = (s: string): string => STATUS_SYMBOL[s] ?? '•';
const color = (s: string): string => STATUS_COLOR[s] ?? 'red';
const catIcon = (s: string): string => CATEGORY_ICON[s] ?? '✳';

let categories: string[] = [];
let holidays = new Set<string>();
let reports: PublicReport[] = [];
let map: LeafletMap | undefined;
let miniMap: LeafletMap | undefined;
let heatMap: LeafletMap | undefined;
let heatLayer: Layer | null = null;
let heatOverlayMarkers: Layer[] = [];
let markers: Marker[] = [];
let miniMarker: Marker | undefined;
let selectedStatus = '';
let selectedCoords: [number, number] | null = null;
let photoData: { data: string } | null = null;
let mediaItems: MediaItem[] = [];
let wizardStep = 1;
let token = localStorage.getItem('reporta_token') || '';
let currentUser: StaffUser | null = null;
let citizenUser: CitizenUser | null = null;
let adminReports: AdminReport[] = [];
let metrics: AdminMetrics | null = null;
let statusChart: ChartInstance | undefined;
let categoryChart: ChartInstance | undefined;
let toastTimer: number | undefined;
let notificationTimer: number | undefined;
let installPrompt: BeforeInstallPromptEvent | null = null;
let closurePhotoData: string | null = null;
let closurePhotoType = 'image/jpeg';

type HttpError = Error & { status?: number; data?: unknown };

async function api<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const customHeaders = (opts.headers as Record<string, string> | undefined) ?? {};
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...customHeaders };
  if (token && !headers.Authorization) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(url, { ...opts, headers });
  } catch {
    throw new Error('No se pudo conectar con el servidor local. Revisa que la aplicación esté iniciada.');
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = { error: 'Respuesta inesperada del servidor.' };
  }

  if (!res.ok) {
    const errObj = data as { error?: string };
    const error = new Error(errObj.error || 'Ocurrió un error.') as HttpError;
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data as T;
}

function toast(msg: string): void {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.classList.remove('show'), 3100);
}

function showView(name: string): void {
  $$('.view').forEach(x => x.classList.toggle('active', x.id === `view-${name}`));
  $$('.nav-link').forEach(x => x.classList.toggle('active', x.dataset.view === name));
  $('.main-nav')?.classList.remove('open');
  if (name === 'mapa') window.setTimeout(() => map?.invalidateSize(), 80);
  if (name === 'reportar') {
    window.setTimeout(() => {
      initMiniMap();
      miniMap?.invalidateSize();
    }, 80);
    updateAsideMetrics();
  }
  if (name === 'admin') {
    window.setTimeout(() => {
      if ($('#adminPanel')?.classList.contains('hidden')) {
        $<HTMLInputElement>('#loginEmail')?.focus();
      } else {
        void refreshAdmin();
      }
    }, 60);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function iconForStatus(s: string): string {
  return `<span class="dot ${color(s)}"></span>${esc(human(s))}`;
}

function fillCategories(): void {
  const opts = categories.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
  $('#categoryFilter')?.insertAdjacentHTML('beforeend', opts);
  const reportCategory = $('#reportCategory');
  if (reportCategory) reportCategory.innerHTML = `<option value="">Selecciona una categoría</option>${opts}`;
  $('#adminCategoryFilter')?.insertAdjacentHTML('beforeend', opts);
}

function watchTileAvailability(layer: TileLayer, noteId: string): void {
  const note = $(`#${noteId}`);
  const setOffline = () => note?.classList.remove('hidden');
  const setOnline = () => note?.classList.add('hidden');
  layer.on('tileerror', setOffline);
  layer.on('tileload', () => {
    if (navigator.onLine) setOnline();
  });
  if (!navigator.onLine) setOffline();
  window.addEventListener('online', () => {
    if (noteId === 'mapOfflineNote') setOnline();
  });
}

function initMap(): void {
  const mapEl = $('#map');
  if (!window.L || map || !mapEl) return;
  map = window.L.map(mapEl, { zoomControl: true }).setView([-41.4689, -72.9411], 12);
  const tiles = window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors',
  }).addTo(map);
  watchTileAvailability(tiles, 'mapOfflineNote');
  map.setZoom(12);
}

function initMiniMap(): void {
  const miniEl = $('#miniMap');
  if (!window.L || miniMap || !miniEl) return;
  miniMap = window.L.map(miniEl, { zoomControl: false }).setView(selectedCoords ?? [-41.4689, -72.9411], 13);
  const tiles = window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors',
  }).addTo(miniMap);
  watchTileAvailability(tiles, 'miniMapOfflineNote');
  miniMap.on('click', e => setCoords(e.latlng.lat, e.latlng.lng));
  if (selectedCoords) setCoords(selectedCoords[0], selectedCoords[1]);
}

function setCoords(lat: number, lng: number): boolean {
  selectedCoords = [lat, lng];
  if (miniMap && window.L) {
    if (!miniMarker) {
      miniMarker = window.L.marker([lat, lng], { draggable: true }).addTo(miniMap);
    } else {
      miniMarker.setLatLng([lat, lng]);
    }
    miniMarker.off('dragend').on('dragend', () => {
      if (!miniMarker) return;
      const pos = miniMarker.getLatLng();
      setCoords(pos.lat, pos.lng);
    });
    miniMap.setView([lat, lng], Math.max(miniMap.getZoom(), 15));
  }
  const coordsText = $('#coordsText');
  if (coordsText) coordsText.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const ok = isWithinPuertoMontt({ lat, lng });
  const locValid = $('#locationValid');
  if (locValid) {
    locValid.textContent = ok ? 'Dentro de Puerto Montt' : 'Fuera de zona';
    locValid.classList.toggle('ok', ok);
  }
  const locErr = $('#locationError');
  if (locErr) locErr.textContent = ok ? '' : 'La ubicación debe estar dentro de los límites de Puerto Montt.';
  return ok;
}

function markerIcon(r: PublicReport) {
  return window.L.divIcon({
    className: 'custom-marker',
    html: `<span class="report-pin marker-dot ${color(r.status)}" title="${esc(r.folio)}"></span>`,
    iconSize: [28, 32],
    iconAnchor: [14, 29],
  });
}

function renderReports(): void {
  const listEl = $('#reportList');
  if (!listEl) return;
  const catFilter = $<HTMLSelectElement>('#categoryFilter')?.value ?? '';
  let filtered = reports.filter(
    r => (!selectedStatus || r.status === selectedStatus) && (!catFilter || r.category === catFilter),
  );
  const q = ($<HTMLInputElement>('#mapSearch')?.value ?? '').trim().toLowerCase();
  if (q) {
    filtered = filtered.filter(
      r =>
        r.folio.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q),
    );
  }
  const countEl = $('#reportCount');
  if (countEl) countEl.textContent = String(filtered.length);
  listEl.innerHTML =
    filtered
      .slice(0, 50)
      .map(
        r =>
          `<div class="report-row" data-folio="${esc(r.folio)}"><span class="category-symbol">${catIcon(r.category)}</span><span><strong>${esc(r.category)}</strong><small>${esc(r.folio)} · ${iconForStatus(r.status)}</small></span><time>${dateFmt(r.createdAt)}</time></div>`,
      )
      .join('') || '<div class="loading-line">No hay reportes con estos filtros.</div>';
  $$('.report-row').forEach(el => {
    el.onclick = () => {
      if (el.dataset.folio) void openPublic(el.dataset.folio);
    };
  });
  if (map && window.L) {
    const activeMap = map;
    markers.forEach(m => activeMap.removeLayer(m));
    markers = filtered.map(r =>
      window.L.marker([r.lat, r.lng], { icon: markerIcon(r) })
        .addTo(activeMap)
        .on('click', () => void openPublic(r.folio)),
    );
  }
}

async function reloadPublic(): Promise<void> {
  try {
    reports = await api<PublicReport[]>('/api/reports');
    renderReports();
    updateAsideMetrics();
  } catch (err) {
    toast(err instanceof Error ? err.message : 'Error al recargar reportes.');
  }
}

function updateAsideMetrics(): void {
  if (!reports.length) return;
  const resolvedEl = $('#asideResolved');
  if (resolvedEl) resolvedEl.textContent = String(reports.filter(r => r.status === 'RESUELTO').length);
  const openEl = $('#asideOpen');
  if (openEl) {
    openEl.textContent = String(
      reports.filter(r => ['PENDIENTE', 'EN_REVISION', 'EN_TERRENO', 'DERIVADO'].includes(r.status)).length,
    );
  }
}

async function openPublic(folio: string): Promise<void> {
  try {
    const { report: r } = await api<{ report: PublicReport }>(`/api/reports/${encodeURIComponent(folio)}`);
    const content = $('#detailContent');
    if (content) {
      content.innerHTML = `<span class="eyebrow">SEGUIMIENTO CIUDADANO</span><h2 class="modal-title" id="detailTitle">${esc(r.category)}</h2><p class="modal-subtitle">${esc(r.folio)} · Reportado el ${dateTime(r.createdAt)}</p><span class="status-badge status-${esc(r.status)}">${sym(r.status)} ${esc(human(r.status))}</span><p>${esc(r.description)}</p>${r.before ? `<img class="modal-photo" src="${r.before}" alt="Evidencia inicial del reporte">` : ''}${r.after ? `<h3>Trabajo realizado</h3><img class="modal-photo" src="${r.after}" alt="Fotografía posterior al trabajo municipal">` : ''}${r.closure ? `<p><strong>Informe técnico:</strong> ${esc(r.closure.text)}</p><p><strong>Cuadrilla:</strong> ${esc(r.closure.crew)} · ${r.closure.days} ${r.closure.days === 1 ? 'día hábil' : 'días hábiles'}</p>` : ''}<div class="modal-kpis"><span><strong>${r.supportCount}</strong> ${r.supportCount === 1 ? 'apoyo' : 'apoyos'}</span><span><strong>${esc(r.priority)}</strong> prioridad</span><button class="button button-outline button-small" id="supportBtn">¡Yo también lo vi! +1</button></div><div class="modal-map" id="publicDetailMap"></div><h3>Historia de atención</h3>${r.history.map(h => `<div class="timeline-item"><strong>${esc(human(h.status))}</strong><small>${dateTime(h.date)} · ${esc(h.comment)}</small></div>`).join('')}`;
    }
    $('#detailModal')?.classList.remove('hidden');
    const supportBtn = $('#supportBtn');
    if (supportBtn) supportBtn.onclick = () => void supportReport(r.folio);
    window.setTimeout(() => {
      const detailMapEl = $('#publicDetailMap');
      if (window.L && detailMapEl) {
        const m = window.L.map(detailMapEl, { zoomControl: false, scrollWheelZoom: false }).setView([r.lat, r.lng], 15);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(m);
        window.L.marker([r.lat, r.lng], { icon: markerIcon(r) }).addTo(m);
      }
    }, 100);
  } catch (err) {
    toast(err instanceof Error ? err.message : 'No se pudo abrir el detalle.');
  }
}

async function supportReport(folio: string): Promise<void> {
  const citizenToken = localStorage.getItem('reporta_citizen_token');
  if (!citizenToken) {
    toast('Inicia sesión para apoyar un caso.');
    showView('cuenta');
    return;
  }
  try {
    await api(`/api/reports/${encodeURIComponent(folio)}/support`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizenToken}` },
      body: '{}',
    });
    toast('Tu apoyo se agregó al reporte.');
    $('#detailModal')?.classList.add('hidden');
    await reloadPublic();
    await openPublic(folio);
  } catch (err) {
    toast(err instanceof Error ? err.message : 'No se pudo registrar el apoyo.');
  }
}

function showStep(n: number): void {
  wizardStep = n;
  $$('.form-step').forEach(x => x.classList.toggle('active', Number(x.dataset.step) === n));
  $$('.steps .step').forEach((x, i) => {
    x.classList.toggle('active', i + 1 === n);
    x.classList.toggle('done', i + 1 < n);
    const span = x.querySelector('span');
    if (span) span.textContent = i + 1 < n ? '✓' : String(i + 1);
  });
  $('#prevStep')?.classList.toggle('hidden', n === 1);
  $('#nextStep')?.classList.toggle('hidden', n === 4);
  $('#submitReport')?.classList.toggle('hidden', n !== 4);
  if (n === 1) window.setTimeout(() => miniMap?.invalidateSize(), 50);
}

async function validateStep(): Promise<boolean> {
  if (wizardStep === 1) {
    if (!selectedCoords) {
      const err = $('#locationError');
      if (err) err.textContent = 'Marca en el mapa dónde ocurre la incidencia.';
      return false;
    }
    return setCoords(selectedCoords[0], selectedCoords[1]);
  }
  if (wizardStep === 2) {
    let ok = true;
    const cat = $<HTMLSelectElement>('#reportCategory')?.value ?? '';
    const catErr = $('#categoryError');
    if (catErr) catErr.textContent = cat ? '' : 'Selecciona una categoría.';
    if (!cat) ok = false;
    const desc = ($<HTMLTextAreaElement>('#reportDescription')?.value ?? '').trim();
    const descErr = $('#descriptionError');
    if (descErr) descErr.textContent = desc.length >= 10 ? '' : 'Escribe una descripción de al menos 10 caracteres.';
    if (desc.length < 10) ok = false;
    if (ok && selectedCoords) {
      const dupNotice = $('#duplicateNotice');
      dupNotice?.classList.add('hidden');
      try {
        const dup = await api<{ duplicate: PublicReport | null; distance: number | null }>('/api/reports/duplicate', {
          method: 'POST',
          body: JSON.stringify({ lat: selectedCoords[0], lng: selectedCoords[1], category: cat }),
        });
        if (dup.duplicate && dupNotice) {
          dupNotice.innerHTML = `Hay un reporte activo a ${dup.distance ?? 0} m: <strong>${esc(dup.duplicate.folio)}</strong>. <button type="button" class="text-button" id="openDuplicate">Ver y apoyar →</button>`;
          dupNotice.classList.remove('hidden');
          const openBtn = $('#openDuplicate');
          const targetFolio = dup.duplicate.folio;
          if (openBtn) openBtn.onclick = () => void openPublic(targetFolio);
          return false;
        }
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Error al verificar duplicados.');
        return false;
      }
    }
    return ok;
  }
  if (wizardStep === 3) {
    const hasImage = mediaItems.some(m => m.type.startsWith('image/'));
    const photoErr = $('#photoError');
    const msg = !mediaItems.length
      ? 'Agrega una foto de evidencia (obligatoria); puedes sumar videos.'
      : !hasImage
        ? 'La foto es obligatoria; el video puede acompañarla.'
        : '';
    if (photoErr) photoErr.textContent = msg;
    return !msg;
  }
  if (wizardStep === 4) {
    let ok = true;
    const rutErr = $('#rutError');
    if (!localStorage.getItem('reporta_citizen_token')) {
      if (rutErr) rutErr.textContent = 'Inicia sesión o crea tu cuenta ciudadana para enviar el reporte.';
      return false;
    }
    const rut = ($<HTMLInputElement>('#reportRut')?.value ?? '').trim();
    const rutOk = validateRutModulo11(rut);
    if (rutErr) rutErr.textContent = rutOk ? '' : 'Ingresa un RUT válido.';
    if (!rutOk) ok = false;
    const email = ($<HTMLInputElement>('#reportEmail')?.value ?? '').trim();
    const emailOk = /^\S+@\S+\.\S+$/.test(email);
    const emailErr = $('#emailError');
    if (emailErr) emailErr.textContent = emailOk ? '' : 'Ingresa un correo válido.';
    if (!emailOk) ok = false;
    return ok;
  }
  return true;
}

async function submitReport(e: Event): Promise<void> {
  e.preventDefault();
  const submitErr = $('#submitError');
  if (submitErr) submitErr.textContent = '';
  if (!(await validateStep())) return;
  if (wizardStep < 4) {
    showStep(wizardStep + 1);
    return;
  }
  if (!selectedCoords) return;
  const btn = $<HTMLButtonElement>('#submitReport');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Enviando…';
  }
  try {
    const out = await api<{ report: PublicReport }>('/api/reports', {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('reporta_citizen_token') ?? ''}` },
      body: JSON.stringify({
        lat: selectedCoords[0],
        lng: selectedCoords[1],
        category: $<HTMLSelectElement>('#reportCategory')?.value ?? '',
        description: $<HTMLTextAreaElement>('#reportDescription')?.value ?? '',
        rut: $<HTMLInputElement>('#reportRut')?.value ?? '',
        email: $<HTMLInputElement>('#reportEmail')?.value ?? '',
        name: $<HTMLInputElement>('#reportName')?.value ?? '',
        phone: $<HTMLInputElement>('#reportPhone')?.value ?? '',
        photo: photoData?.data ?? null,
        media: mediaItems,
      }),
    });
    toast(`Reporte creado: ${out.report.folio}`);
    $<HTMLFormElement>('#reportForm')?.reset();
    const descCount = $('#descCount');
    if (descCount) descCount.textContent = '0';
    selectedCoords = null;
    photoData = null;
    mediaItems = [];
    $('#photoPreview')?.classList.add('hidden');
    showStep(1);
    await reloadPublic();
    showView('mapa');
    await openPublic(out.report.folio);
  } catch (err) {
    if (submitErr) submitErr.textContent = err instanceof Error ? err.message : 'Error al enviar reporte.';
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = 'Enviar reporte <span>→</span>';
    }
  }
}

function readPhoto(event: Event): void {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  mediaItems = [];
  photoData = null;
  if (!files.length) return;
  const photoErr = $('#photoError');
  if (files.length > 3 || files.some(f => f.size > 5 * 1024 * 1024) || files.reduce((n, f) => n + f.size, 0) > 5 * 1024 * 1024) {
    if (photoErr) photoErr.textContent = 'Máximo 3 archivos y 5 MB en total.';
    input.value = '';
    return;
  }
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'];
  if (files.some(f => !allowed.includes(f.type))) {
    if (photoErr) photoErr.textContent = 'Usa JPG, PNG, WebP, MP4 o WebM.';
    input.value = '';
    return;
  }
  void Promise.all(
    files.map(
      f =>
        new Promise<MediaItem>((resolve, reject) => {
          const rd = new FileReader();
          rd.onload = () =>
            typeof rd.result === 'string'
              ? resolve({ type: f.type, data: rd.result })
              : reject(new Error('Lectura inválida.'));
          rd.onerror = () => reject(new Error('Error leyendo archivo.'));
          rd.readAsDataURL(f);
        }),
    ),
  )
    .then(items => {
      mediaItems = items;
      const firstImg = items.find(x => x.type.startsWith('image/'));
      photoData = firstImg ? { data: firstImg.data } : null;
      if (photoErr) photoErr.textContent = '';
      const preview = $('#photoPreview');
      if (preview) {
        preview.innerHTML = items
          .map((m, i) =>
            m.type.startsWith('video/')
              ? `<video src="${m.data}" controls playsinline style="max-width:160px;max-height:120px"></video>`
              : `<img src="${m.data}" alt="Vista previa ${i + 1}" style="max-width:120px;max-height:120px;object-fit:cover">`,
          )
          .join('');
        preview.classList.remove('hidden');
      }
    })
    .catch(() => {
      if (photoErr) photoErr.textContent = 'No se pudieron leer los archivos.';
    });
}

async function trackFolio(e: Event): Promise<void> {
  e.preventDefault();
  const f = ($<HTMLInputElement>('#trackFolio')?.value ?? '').trim();
  if (!f) return;
  try {
    const { report: r } = await api<{ report: PublicReport }>(`/api/reports/${encodeURIComponent(f)}`);
    renderTrack([r]);
  } catch (err) {
    const resEl = $('#trackResults');
    if (resEl) resEl.innerHTML = `<p class="field-error">${esc(err instanceof Error ? err.message : 'No encontrado.')}</p>`;
  }
}

async function trackRut(e: Event): Promise<void> {
  e.preventDefault();
  const citizenToken = localStorage.getItem('reporta_citizen_token');
  const resEl = $('#trackResults');
  if (!citizenToken) {
    if (resEl) resEl.innerHTML = '<p class="field-error">Inicia sesión para consultar tus reportes por RUT.</p>';
    return;
  }
  try {
    const { reports: r } = await api<{ reports: PublicReport[] }>('/api/track', {
      method: 'POST',
      headers: { Authorization: `Bearer ${citizenToken}` },
      body: '{}',
    });
    renderTrack(r);
  } catch (err) {
    if (resEl) resEl.innerHTML = `<p class="field-error">${esc(err instanceof Error ? err.message : 'Error al consultar.')}</p>`;
  }
}

function renderTrack(list: readonly PublicReport[]): void {
  const resEl = $('#trackResults');
  if (!resEl) return;
  resEl.innerHTML = list.length
    ? `<h3>Tus reportes (${list.length})</h3>` +
      list
        .map(
          r =>
            `<div class="track-result" data-folio="${esc(r.folio)}"><div style="display:flex;justify-content:space-between"><h3>${esc(r.category)}</h3><span class="status-badge status-${esc(r.status)}">${esc(human(r.status))}</span></div><p>${esc(r.folio)} · ${dateFmt(r.createdAt)}</p><p>${esc(r.description)}</p><button class="text-button">Ver detalles y novedades →</button></div>`,
        )
        .join('')
    : '<p>No encontramos reportes asociados a ese RUT.</p>';
  $$('.track-result').forEach(x => {
    x.onclick = () => {
      if (x.dataset.folio) void openPublic(x.dataset.folio);
    };
  });
}

async function login(e: Event): Promise<void> {
  e.preventDefault();
  const errEl = $('#loginError');
  if (errEl) errEl.textContent = '';
  try {
    const d = await api<{ token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: $<HTMLInputElement>('#loginEmail')?.value ?? '',
        password: $<HTMLInputElement>('#loginPassword')?.value ?? '',
      }),
    });
    token = d.token;
    localStorage.setItem('reporta_token', token);
    await loadMe();
    await refreshAdmin();
  } catch (err) {
    if (errEl) errEl.textContent = err instanceof Error ? err.message : 'Error de autenticación.';
  }
}

async function loadMe(): Promise<void> {
  const d = await api<{ user: StaffUser }>('/api/admin/me');
  currentUser = d.user;
  $('#adminLogin')?.classList.add('hidden');
  $('#adminPanel')?.classList.remove('hidden');
  const nameEl = $('#adminName');
  if (nameEl) nameEl.textContent = currentUser.name;
  const roleEl = $('#adminRole');
  if (roleEl) roleEl.textContent = `${currentUser.role.replaceAll('_', ' ')} · ${currentUser.department}`;
  const avatarEl = $('#adminAvatar');
  if (avatarEl) avatarEl.textContent = currentUser.name[0] ?? 'M';
}

function logout(show = true): void {
  token = '';
  currentUser = null;
  adminReports = [];
  localStorage.removeItem('reporta_token');
  $('#adminPanel')?.classList.add('hidden');
  $('#adminLogin')?.classList.remove('hidden');
  if (show) toast('Sesión cerrada.');
}

async function refreshAdmin(): Promise<void> {
  if (!currentUser) return;
  try {
    const [fetchedReports, fetchedMetrics] = await Promise.all([
      api<AdminReport[]>('/api/admin/reports'),
      api<AdminMetrics>('/api/admin/metrics'),
    ]);
    adminReports = fetchedReports;
    metrics = fetchedMetrics;
    renderMetrics();
    renderAdminRows();
    if (!$('#adminAnalytics')?.classList.contains('hidden')) {
      drawCharts();
      refreshHeatLayer();
    }
    if (currentUser.role === 'ADMIN_MUNICIPAL') {
      void loadModeration();
      void loadVerificationQueue();
    }
  } catch (err) {
    const httpErr = err as HttpError;
    toast(httpErr.message || 'Error al cargar panel.');
    if (httpErr.status === 401) logout(false);
  }
}

function renderMetrics(): void {
  const m = metrics;
  const grid = $('#metricGrid');
  if (!m || !grid) return;
  grid.innerHTML = `<div class="metric"><label>Total de reportes</label><strong>${m.total}</strong><small>${m.events} eventos auditados</small></div><div class="metric"><label>En seguimiento</label><strong>${m.open}</strong><small>casos abiertos</small></div><div class="metric"><label>Tiempo medio de resolución</label><strong>${m.averageWorkdays} <small style="display:inline">días hábiles</small></strong><small>desde el ingreso al cierre</small></div><div class="metric"><label>Tasa de resolución</label><strong>${m.resolutionRate}%</strong><small>${m.resolved} reportes resueltos</small></div>`;
  const sts = $<HTMLSelectElement>('#adminStatusFilter');
  if (sts && sts.options.length === 1) {
    sts.insertAdjacentHTML(
      'beforeend',
      ['PENDIENTE', 'EN_REVISION', 'EN_TERRENO', 'DERIVADO', 'RESUELTO', 'RECHAZADO']
        .map(s => `<option value="${s}">${human(s)}</option>`)
        .join(''),
    );
  }
  drawCharts();
}

function renderAdminRows(): void {
  const tbody = $('#adminRows');
  if (!tbody) return;
  let list = [...adminReports];
  const st = $<HTMLSelectElement>('#adminStatusFilter')?.value ?? '';
  const cat = $<HTMLSelectElement>('#adminCategoryFilter')?.value ?? '';
  if (st) list = list.filter(r => r.status === st);
  if (cat) list = list.filter(r => r.category === cat);
  const rank: Record<string, number> = { CRÍTICA: 4, ALTA: 3, MEDIA: 2, BAJA: 1 };
  list.sort(
    (a, b) =>
      (rank[b.priority] ?? 0) - (rank[a.priority] ?? 0) ||
      workingDaysBetween(b.createdAt, new Date(), holidays) - workingDaysBetween(a.createdAt, new Date(), holidays),
  );
  tbody.innerHTML =
    list
      .map(r => {
        const age = workingDaysBetween(r.createdAt, new Date(), holidays);
        return `<tr><td><input type="checkbox" class="case-select" value="${esc(r.id)}" aria-label="Seleccionar ${esc(r.folio)}"></td><td><strong>${esc(r.folio)}</strong><small>${dateFmt(r.createdAt)}</small></td><td><strong>${esc(r.category)}</strong><small>${esc(r.description.slice(0, 62))}${r.description.length > 62 ? '…' : ''}</small></td><td><span class="status-badge status-${esc(r.status)}">${esc(human(r.status))}</span></td><td>${esc(r.department || 'Sin asignar')}</td><td class="${age >= 5 ? 'sla-bad' : age >= 3 ? 'sla-warn' : 'sla-good'}">${age} ${age === 1 ? 'día' : 'días'}</td><td><span class="priority-badge">${esc(r.priority)}</span></td><td><button class="row-action" data-open-admin="${esc(r.id)}">Abrir caso</button></td></tr>`;
      })
      .join('') || '<tr><td colspan="8">No hay reportes en esta bandeja.</td></tr>';

  $$<HTMLButtonElement>('[data-open-admin]').forEach(b => {
    b.onclick = () => {
      if (b.dataset.openAdmin) openAdminDetail(b.dataset.openAdmin);
    };
  });

  const sync = (): void => {
    const n = $$<HTMLInputElement>('.case-select:checked').length;
    const bulkCount = $('#bulkCount');
    if (bulkCount) bulkCount.textContent = `${n} ${n === 1 ? 'seleccionado' : 'seleccionados'}`;
    const bulkBtn = $<HTMLButtonElement>('#bulkAssign');
    if (bulkBtn) bulkBtn.disabled = !n;
  };
  $$<HTMLInputElement>('.case-select').forEach(x => {
    x.onchange = sync;
  });
  const selectAll = $<HTMLInputElement>('#selectAllCases');
  if (selectAll) {
    selectAll.checked = false;
    selectAll.onchange = () => {
      $$<HTMLInputElement>('.case-select').forEach(x => {
        x.checked = selectAll.checked;
      });
      sync();
    };
  }
  const bulkAssign = $<HTMLButtonElement>('#bulkAssign');
  if (bulkAssign) {
    bulkAssign.onclick = async () => {
      const ids = $$<HTMLInputElement>('.case-select:checked').map(x => x.value);
      if (!ids.length) return;
      try {
        await api('/api/admin/reports/batch', {
          method: 'POST',
          body: JSON.stringify({
            ids,
            status: 'DERIVADO',
            department: $<HTMLSelectElement>('#bulkDepartment')?.value ?? 'Operaciones',
            comment: 'Asignación masiva revisada y derivada al departamento municipal responsable.',
          }),
        });
        toast(`${ids.length} ${ids.length === 1 ? 'caso asignado' : 'casos asignados'} en una operación`);
        await refreshAdmin();
      } catch (err) {
        toast(err instanceof Error ? err.message : 'Error en asignación por lotes.');
      }
    };
  }
  sync();
}

function drawCharts(): void {
  const ChartCtor = window.Chart;
  if (!ChartCtor || !metrics) return;
  statusChart?.destroy();
  categoryChart?.destroy();

  const statusCanvas = $<HTMLCanvasElement>('#statusChart');
  if (statusCanvas) {
    const s = metrics.byStatus;
    statusChart = new ChartCtor(statusCanvas, {
      type: 'doughnut',
      data: {
        labels: Object.keys(s).map(human),
        datasets: [
          {
            data: Object.values(s),
            backgroundColor: ['#e87866', '#ddb14f', '#668bc4', '#8b6cad', '#56a17b', '#a6afaa'],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 8, font: { family: 'DM Sans', size: 9 }, usePointStyle: true },
          },
        },
      },
    });
  }

  const categoryCanvas = $<HTMLCanvasElement>('#categoryChart');
  if (categoryCanvas) {
    const cats = metrics.byCategory;
    categoryChart = new ChartCtor(categoryCanvas, {
      type: 'bar',
      data: {
        labels: Object.keys(cats),
        datasets: [{ data: Object.values(cats), backgroundColor: '#6ca187', borderRadius: 4, maxBarThickness: 27 }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { font: { family: 'DM Sans', size: 8 }, maxRotation: 45 }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { precision: 0, font: { size: 8 } }, grid: { color: '#edf1ed' } },
        },
      },
    });
  }
}

function openAdminDetail(id0: string): void {
  const r = adminReports.find(x => x.id === id0);
  const detailContainer = $('#adminDetail');
  if (!r || !detailContainer || !currentUser) return;
  const allowed: Record<string, readonly string[]> = {
    PENDIENTE: ['EN_REVISION', 'RECHAZADO'],
    EN_REVISION: ['EN_TERRENO', 'DERIVADO', 'RECHAZADO'],
    DERIVADO: ['EN_REVISION'],
    EN_TERRENO: ['DERIVADO'],
  };
  const next = allowed[r.status] ?? [];
  const canClose = r.status === 'EN_TERRENO' && ['INSPECTOR_DEPTO', 'ADMIN_MUNICIPAL'].includes(currentUser.role);
  closurePhotoData = null;
  const contactHeader = [
    r.citizen?.name || 'Vecino (registro semilla)',
    r.citizen?.rut ? `RUT ${r.citizen.rut}` : 'Sin RUT asociado',
  ].join(' · ');
  const contactDetail = [
    r.citizen?.email || 'Sin correo registrado',
    r.citizen?.phone || 'Sin teléfono registrado',
  ].join(' · ');
  const supportLabel = `${r.supportCount} ${r.supportCount === 1 ? 'apoyo' : 'apoyos'}`;

  detailContainer.innerHTML = `<div class="card detail-view" id="detail-${esc(r.id)}"><div style="padding:16px 17px 0;display:flex;justify-content:space-between"><div><span class="eyebrow">EXPEDIENTE MUNICIPAL</span><h2 style="font:700 16px var(--display);margin:4px 0">${esc(r.category)} <span style="font-size:10px;color:#84918b">${esc(r.folio)}</span></h2></div><button class="row-action" id="closeAdminDetail">Cerrar</button></div><div class="detail-row" style="padding:0 17px"><div class="detail-section"><h3>Descripción y ubicación</h3><p>${esc(r.description)}</p><p>${r.lat.toFixed(5)}, ${r.lng.toFixed(5)} · ${supportLabel}</p>${r.before ? `<img src="${r.before}" alt="Foto inicial" style="width:100%;max-height:150px;object-fit:cover;border-radius:5px">` : ''}</div><div class="detail-section"><h3>Datos de contacto (uso municipal)</h3><p>${esc(contactHeader)}</p><p>${esc(contactDetail)}</p></div></div><div class="detail-row" style="padding:0 17px"><div class="detail-section"><h3>Historial de auditoría</h3>${r.history.map(h => `<div class="timeline-item"><strong>${esc(human(h.status))}</strong><small>${dateTime(h.date)} · ${esc(h.comment)}</small></div>`).join('')}</div><div class="detail-section"><h3>Registrar gestión</h3>${next.length ? `<label>Próximo estado<select id="nextStatus"><option value="">Selecciona acción</option>${next.map(s => `<option value="${s}">${human(s)}</option>`).join('')}</select></label>` : '<p>Este caso no admite nuevas transiciones.</p>'}<label>Departamento<select id="nextDepartment">${DEPARTMENTS.map(d => `<option ${d === r.department ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></label><label>Comentario de auditoría<textarea id="transitionComment" rows="3" placeholder="Motivo o detalle de la acción"></textarea></label><button class="button button-dark button-small" id="saveTransition">Guardar gestión</button></div></div>${canClose ? `<div class="detail-section" style="margin:0 17px 16px"><h3>Cierre técnico verificado</h3><label>Informe técnico (mínimo 50 caracteres)<textarea id="closureText" rows="3" maxlength="2000" placeholder="Describe el trabajo realizado, materiales y resultado…"></textarea><span id="closureCount" class="field-meta">0 / 50 mínimo</span></label><label>Cuadrilla ejecutora<input id="closureCrew" placeholder="Cuadrilla de Operaciones"></label><label>Fotografía posterior (máx. 5 MB)<input id="closurePhoto" type="file" accept="image/jpeg,image/png,image/webp"></label><div id="closurePreview"></div><button class="button button-primary button-small" id="closeCase">Confirmar resolución</button><p id="closeError" class="field-error"></p></div>` : ''}</div>`;

  const closeBtn = $('#closeAdminDetail');
  if (closeBtn) closeBtn.onclick = () => { detailContainer.innerHTML = ''; };
  const saveBtn = $('#saveTransition');
  if (saveBtn) saveBtn.onclick = () => void saveTransition(r.id);
  const closureText = $<HTMLTextAreaElement>('#closureText');
  if (closureText) {
    closureText.oninput = () => {
      const counter = $('#closureCount');
      if (counter) counter.textContent = `${closureText.value.trim().length} / 50 mínimo`;
    };
  }
  const closurePhoto = $<HTMLInputElement>('#closurePhoto');
  if (closurePhoto) {
    closurePhoto.onchange = () => {
      const f = closurePhoto.files?.[0];
      if (f) readClosurePhoto(f);
    };
  }
  const closeCaseBtn = $('#closeCase');
  if (closeCaseBtn) closeCaseBtn.onclick = () => void closeCase(r.id);
}

function readClosurePhoto(file: File): void {
  const errEl = $('#closeError');
  if (errEl) errEl.textContent = '';
  if (file.size > 5 * 1024 * 1024) {
    if (errEl) errEl.textContent = 'La imagen supera 5 MB.';
    return;
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    if (errEl) errEl.textContent = 'Formato de imagen no admitido.';
    return;
  }
  const rd = new FileReader();
  rd.onload = () => {
    if (typeof rd.result !== 'string') return;
    closurePhotoData = rd.result;
    closurePhotoType = file.type;
    const prev = $('#closurePreview');
    if (prev) {
      prev.innerHTML = `<img src="${rd.result}" alt="Vista previa fotografía posterior" style="width:120px;height:75px;object-fit:cover;border-radius:5px">`;
    }
  };
  rd.readAsDataURL(file);
}

async function saveTransition(id0: string): Promise<void> {
  const status = $<HTMLSelectElement>('#nextStatus')?.value ?? '';
  if (!status) {
    toast('Selecciona la acción que quieres registrar.');
    return;
  }
  try {
    await api(`/api/admin/reports/${id0}/transition`, {
      method: 'POST',
      body: JSON.stringify({
        status,
        department: $<HTMLSelectElement>('#nextDepartment')?.value ?? 'Operaciones',
        comment: $<HTMLTextAreaElement>('#transitionComment')?.value ?? '',
      }),
    });
    toast('Gestión registrada en la auditoría.');
    const detailContainer = $('#adminDetail');
    if (detailContainer) detailContainer.innerHTML = '';
    await refreshAdmin();
  } catch (err) {
    toast(err instanceof Error ? err.message : 'No se pudo registrar la gestión.');
  }
}

async function closeCase(id0: string): Promise<void> {
  const errEl = $('#closeError');
  if (errEl) errEl.textContent = '';
  const text = ($<HTMLTextAreaElement>('#closureText')?.value ?? '').trim();
  if (text.length < 50) {
    if (errEl) errEl.textContent = 'El informe debe tener al menos 50 caracteres.';
    return;
  }
  if (!closurePhotoData) {
    if (errEl) errEl.textContent = 'La foto posterior es obligatoria.';
    return;
  }
  try {
    await api(`/api/admin/reports/${id0}/close`, {
      method: 'POST',
      body: JSON.stringify({
        text,
        crew: $<HTMLInputElement>('#closureCrew')?.value ?? '',
        photo: closurePhotoData,
        media: [{ type: closurePhotoType, data: closurePhotoData }],
      }),
    });
    closurePhotoData = null;
    toast('Caso resuelto y notificación disponible en seguimiento.');
    const detailContainer = $('#adminDetail');
    if (detailContainer) detailContainer.innerHTML = '';
    await refreshAdmin();
    await reloadPublic();
  } catch (err) {
    if (errEl) errEl.textContent = err instanceof Error ? err.message : 'Error al cerrar el caso.';
  }
}

function refreshHeatLayer(): void {
  if (!heatMap || !window.L) return;
  const activeHeatMap = heatMap;
  if (heatLayer) {
    activeHeatMap.removeLayer(heatLayer);
    heatLayer = null;
  }
  heatOverlayMarkers.forEach(m => activeHeatMap.removeLayer(m));
  heatOverlayMarkers = [];

  const active = adminReports.filter(r => r.status !== 'RESUELTO' && r.status !== 'RECHAZADO');
  const points = active.map(r => ({
    lat: r.lat,
    lng: r.lng,
    intensity: (r.supportCount || 0) + 1,
    label: `${r.folio} · ${r.category}`,
  }));

  heatLayer = createCanvasHeatmapLayer(window.L, points, { radius: 24, blur: 16 });
  heatLayer.addTo(activeHeatMap);

  for (const r of active) {
    const marker = window.L.circleMarker([r.lat, r.lng], {
      radius: 10,
      stroke: false,
      fillOpacity: 0.01,
    })
      .addTo(activeHeatMap)
      .bindPopup(`${esc(r.folio)} · ${esc(r.category)} (${r.supportCount + 1} peso)`);
    heatOverlayMarkers.push(marker);
  }
}

function initHeat(): void {
  const heatEl = $('#heatMap');
  if (!window.L || !heatEl) return;
  if (!heatMap) {
    heatMap = window.L.map(heatEl).setView([-41.4689, -72.9411], 11);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(heatMap);
  }
  refreshHeatLayer();
}

function locate(forReport: boolean): void {
  if (!navigator.geolocation) {
    toast('Este dispositivo no ofrece geolocalización.');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      if (forReport) {
        setCoords(lat, lng);
        miniMap?.setView([lat, lng], 16);
      } else if (map && window.L) {
        map.setView([lat, lng], 16);
        window.L.marker([lat, lng]).addTo(map).bindPopup('Tu ubicación').openPopup();
      }
    },
    () => toast('No se pudo obtener la ubicación. Revisa los permisos del navegador.'),
    { enableHighAccuracy: true, timeout: 10000 },
  );
}

async function renderFeed(): Promise<void> {
  const listEl = $('#feedList');
  if (!listEl) return;
  const filter = $<HTMLSelectElement>('#feedFilter')?.value ?? 'active';
  const list = reports.filter(
    r =>
      filter === 'all' ||
      (filter === 'RESUELTO' ? r.status === 'RESUELTO' : r.status !== 'RESUELTO' && r.status !== 'RECHAZADO'),
  );
  const feedTotal = $('#feedTotal');
  if (feedTotal) feedTotal.textContent = `${list.length} casos`;
  listEl.innerHTML = list
    .map(r => {
      const media = [
        ...(r.before ? [{ type: 'image/evidence', data: r.before }] : []),
        ...(r.media ?? []).filter(m => m.data !== r.before),
      ];
      const gallery = media.length
        ? `<div class="post-gallery">${media.map(m => (m.type.startsWith('video/') ? `<video src="${m.data}" controls playsinline preload="metadata"></video>` : `<img src="${m.data}" alt="Foto del problema en ${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}">`)).join('')}</div>`
        : r.before
          ? `<img class="feed-media" src="${r.before}" alt="Foto del problema">`
          : '';
      return `<article class="feed-post card"><div class="feed-post-head"><span class="feed-avatar">${catIcon(r.category)}</span><span><h3>${esc(r.category)}</h3><small>${esc(r.folio)} · ${dateFmt(r.createdAt)} · ${esc(human(r.status))}</small></span></div><div class="post-location">⌖ Puerto Montt · <a target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lng}#map=17/${r.lat}/${r.lng}">${r.lat.toFixed(4)}, ${r.lng.toFixed(4)} · Abrir mapa</a></div>${gallery}<p>${esc(r.description)}</p><div class="feed-actions"><button data-feed-support="${esc(r.folio)}">♡ Apoyar · ${r.supportCount}</button><button data-feed-comments="${esc(r.folio)}">Comentar</button><button data-feed-open="${esc(r.folio)}">Ver caso</button></div><div class="feed-comments" id="comments-${esc(r.folio)}"></div></article>`;
    })
    .join('');

  $$('[data-feed-open]').forEach(b => {
    b.onclick = () => {
      if (b.dataset.feedOpen) void openPublic(b.dataset.feedOpen);
    };
  });
  $$('[data-feed-support]').forEach(b => {
    b.onclick = () => {
      if (b.dataset.feedSupport) void supportReport(b.dataset.feedSupport);
    };
  });
  $$('[data-feed-comments]').forEach(b => {
    b.onclick = () => {
      if (b.dataset.feedComments) void loadComments(b.dataset.feedComments);
    };
  });
}

async function loadComments(folio: string): Promise<void> {
  const box = $(`#comments-${CSS.escape(folio)}`);
  if (!box) return;
  try {
    const d = await api<{ comments: readonly { id: string; name: string; text: string }[] }>(
      `/api/reports/${encodeURIComponent(folio)}/comments`,
    );
    const signedIn = !!localStorage.getItem('reporta_citizen_token');
    const composer = signedIn
      ? `<form class="feed-comment-form"><input name="text" maxlength="500" placeholder="Agrega un comentario útil…" required><button>Enviar</button></form>`
      : `<button type="button" class="text-button" data-view="cuenta">Inicia sesión para comentar</button>`;
    box.innerHTML =
      d.comments.map(c => `<div class="feed-comment"><strong>${esc(c.name)}</strong>${esc(c.text)}</div>`).join('') +
      composer +
      '<small>Los comentarios se revisan antes de publicarse. No incluyas datos personales.</small>';
    const form = box.querySelector('form');
    if (form) {
      form.onsubmit = async e => {
        e.preventDefault();
        const text = String(new FormData(form).get('text') ?? '');
        try {
          await api(`/api/reports/${encodeURIComponent(folio)}/comments`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${localStorage.getItem('reporta_citizen_token') ?? ''}` },
            body: JSON.stringify({ text }),
          });
          toast('Comentario enviado a moderación.');
          form.reset();
        } catch (err) {
          toast(err instanceof Error ? err.message : 'No se pudo enviar el comentario.');
        }
      };
    }
  } catch (err) {
    toast(err instanceof Error ? err.message : 'Error al cargar comentarios.');
  }
}

async function loadVerificationQueue(): Promise<void> {
  try {
    const items = await api<VerificationRequestItem[]>('/api/admin/verification-requests');
    let box = $('#verificationBox');
    if (!box) {
      box = document.createElement('section');
      box.id = 'verificationBox';
      box.className = 'card';
      box.style.cssText = 'padding:16px;margin-top:14px';
      $('#adminPanel')?.append(box);
    }
    const pending = items.filter(x => x.status === 'PENDIENTE');
    box.innerHTML =
      `<h2>Verificación institucional <small>${pending.length} pendientes</small></h2><p>Comprueba identidad por canal institucional autorizado; no solicites ni almacenes copias de documentos aquí.</p>` +
      (pending.length
        ? pending
            .map(
              x =>
                `<div class="feed-comment"><strong>${esc(x.folio)} · ${esc(x.name)}</strong><p>${esc(x.email)} · RUT ${esc(x.rut)} · Solicitud ${dateTime(x.createdAt)}</p><button class="row-action" data-verify-approve="${esc(x.id)}">Identidad comprobada</button> <button class="row-action" data-verify-reject="${esc(x.id)}">Rechazar</button></div>`,
            )
            .join('')
        : '<p>No hay solicitudes pendientes.</p>');
    $$('[data-verify-approve],[data-verify-reject]').forEach(b => {
      b.onclick = async () => {
        const approved = !!b.dataset.verifyApprove;
        const targetId = b.dataset.verifyApprove ?? b.dataset.verifyReject ?? '';
        const note = window.prompt('Registra brevemente cómo se realizó la comprobación (sin datos sensibles):') ?? '';
        try {
          await api(`/api/admin/verification-requests/${encodeURIComponent(targetId)}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: approved ? 'APROBADA' : 'RECHAZADA', note }),
          });
          toast('Decisión registrada con usuario y fecha.');
          await loadVerificationQueue();
        } catch (err) {
          toast(err instanceof Error ? err.message : 'No se pudo actualizar la verificación.');
        }
      };
    });
  } catch (err) {
    toast(err instanceof Error ? err.message : 'Error al cargar cola de verificación.');
  }
}

async function loadModeration(): Promise<void> {
  if (!currentUser || currentUser.role !== 'ADMIN_MUNICIPAL') return;
  try {
    const comments = await api<AdminCommentItem[]>('/api/admin/comments');
    const pending = comments.filter(c => c.status === 'PENDIENTE');
    let box = $('#moderationBox');
    if (!box) {
      box = document.createElement('section');
      box.id = 'moderationBox';
      box.className = 'card';
      box.style.cssText = 'padding:16px;margin-top:14px';
      $('#adminPanel')?.append(box);
    }
    box.innerHTML =
      `<h2>Moderación vecinal <small>${pending.length} pendientes</small></h2>` +
      (pending.length
        ? pending
            .map(
              c =>
                `<div class="feed-comment"><strong>${esc(c.folio)} · ${esc(c.name)}</strong><p>${esc(c.text)}</p><button class="row-action" data-approve="${esc(c.id)}">Publicar</button> <button class="row-action" data-hide="${esc(c.id)}">Ocultar</button></div>`,
            )
            .join('')
        : '<p>No hay comentarios pendientes.</p>');
    $$('[data-approve],[data-hide]').forEach(b => {
      b.onclick = async () => {
        const targetId = b.dataset.approve ?? b.dataset.hide ?? '';
        await api(`/api/admin/comments/${encodeURIComponent(targetId)}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: b.dataset.approve ? 'PUBLICADO' : 'OCULTO' }),
        });
        await loadModeration();
      };
    });
  } catch (err) {
    toast(err instanceof Error ? err.message : 'Error al cargar moderación.');
  }
}

async function loadCitizenNotifications(): Promise<void> {
  const box = $('#citizenNotifications');
  if (!box) return;
  const citizenToken = localStorage.getItem('reporta_citizen_token');
  if (!citizenToken) {
    box.textContent = 'Inicia sesión para ver tus notificaciones.';
    return;
  }
  try {
    const data = await api<{ notifications?: CitizenNotification[] }>('/api/citizens/notifications', {
      headers: { Authorization: `Bearer ${citizenToken}` },
    });
    const items = data.notifications ?? [];
    const unread = items.filter(x => !x.readAt).length;
    box.innerHTML = items.length
      ? items
          .map(
            n =>
              `<article class="feed-comment"><strong>${esc(n.folio)} · ${esc(human(n.status))}</strong><p>${esc(n.message)}</p><small>${dateTime(n.date)}${n.readAt ? ' · Leída' : ' · Nueva'}</small></article>`,
          )
          .join('')
      : '<p>No tienes notificaciones todavía.</p>';
    const button = $<HTMLButtonElement>('#readAllNotifications');
    if (button) {
      button.disabled = !unread;
      button.textContent = unread ? `Marcar ${unread} como leídas` : 'Todas leídas';
      button.onclick = async () => {
        try {
          await api('/api/citizens/notifications/read-all', {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${citizenToken}` },
            body: '{}',
          });
          await loadCitizenNotifications();
        } catch (err) {
          toast(err instanceof Error ? err.message : 'Error al marcar notificaciones.');
        }
      };
    }
  } catch (err) {
    box.textContent = 'No se pudieron cargar tus notificaciones.';
    console.error(err);
  }
}

function showCitizen(user: CitizenUser): void {
  citizenUser = user;
  for (const id of ['reportName', 'reportEmail', 'reportRut', 'trackRut'] as const) {
    const el = $<HTMLInputElement>(`#${id}`);
    if (el) {
      el.value = id === 'reportName' ? user.name : id === 'reportEmail' ? user.email : user.rut || '';
      el.readOnly = true;
    }
  }
  $('#accountForms')?.classList.add('hidden');
  const statusEl = $('#accountStatus');
  if (statusEl) {
    statusEl.classList.remove('hidden');
    statusEl.innerHTML = `<h2>Hola, ${esc(user.name)}</h2><p>${esc(user.email)}</p><span class="status-badge status-${user.identityVerified ? 'RESUELTO' : 'EN_REVISION'}">${user.identityVerified ? 'Identidad revisada por municipio' : 'RUT válido · identidad pendiente'}</span><p class="muted-note">La revisión se realiza por personal municipal mediante un canal autorizado. No cargues fotos de documentos aquí.</p><section class="citizen-notifications"><h3>Notificaciones de tus reportes</h3><div id="citizenNotifications" aria-live="polite">Cargando…</div><button class="row-action" id="readAllNotifications" type="button">Marcar como leídas</button></section><div id="verifyRequestState"></div>${user.identityVerified ? '' : `<button class="button button-primary" id="requestVerification">Solicitar revisión institucional</button>`} <button class="button button-outline" id="citizenLogout">Cerrar sesión</button>`;
  }
  const logoutBtn = $('#citizenLogout');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      localStorage.removeItem('reporta_citizen_token');
      citizenUser = null;
      window.clearInterval(notificationTimer);
      for (const id of ['reportName', 'reportEmail', 'reportRut', 'trackRut'] as const) {
        const el = $<HTMLInputElement>(`#${id}`);
        if (el) {
          el.value = '';
          el.readOnly = false;
        }
      }
      $('#accountStatus')?.classList.add('hidden');
      $('#accountForms')?.classList.remove('hidden');
    };
  }
  const reqVerifyBtn = $<HTMLButtonElement>('#requestVerification');
  if (!user.identityVerified && reqVerifyBtn) {
    reqVerifyBtn.onclick = async () => {
      try {
        const d = await api<{ folio: string; status: string }>('/api/citizens/verification-request', {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('reporta_citizen_token') ?? ''}` },
          body: '{}',
        });
        const verifyState = $('#verifyRequestState');
        if (verifyState) {
          verifyState.innerHTML = `<p>Solicitud <strong>${esc(d.folio)}</strong>: ${esc(d.status)}. Contacta a la Municipalidad indicando este folio para coordinar la comprobación.</p>`;
        }
        reqVerifyBtn.disabled = true;
      } catch (err) {
        toast(err instanceof Error ? err.message : 'No se pudo solicitar revisión.');
      }
    };
  }
  window.clearInterval(notificationTimer);
  void loadCitizenNotifications();
  notificationTimer = window.setInterval(() => {
    if (citizenUser) void loadCitizenNotifications();
  }, 30_000);
}

async function bindCitizen(): Promise<void> {
  const loginForm = $<HTMLFormElement>('#citizenLogin');
  const registerForm = $<HTMLFormElement>('#citizenRegister');
  if (!loginForm || !registerForm) return;
  loginForm.onsubmit = async e => {
    e.preventDefault();
    const errEl = $('#citizenLoginError');
    if (errEl) errEl.textContent = '';
    try {
      const d = await api<{ token: string; user: CitizenUser }>('/api/citizens/login', {
        method: 'POST',
        body: JSON.stringify({
          email: $<HTMLInputElement>('#citizenEmail')?.value ?? '',
          password: $<HTMLInputElement>('#citizenPassword')?.value ?? '',
        }),
      });
      localStorage.setItem('reporta_citizen_token', d.token);
      showCitizen(d.user);
    } catch (err) {
      if (errEl) errEl.textContent = err instanceof Error ? err.message : 'Error de acceso.';
    }
  };
  registerForm.onsubmit = async e => {
    e.preventDefault();
    const errEl = $('#citizenRegError');
    if (errEl) errEl.textContent = '';
    try {
      const d = await api<{ token: string; user: CitizenUser }>('/api/citizens/register', {
        method: 'POST',
        body: JSON.stringify({
          name: $<HTMLInputElement>('#citizenName')?.value ?? '',
          rut: $<HTMLInputElement>('#citizenRut')?.value ?? '',
          email: $<HTMLInputElement>('#citizenRegEmail')?.value ?? '',
          password: $<HTMLInputElement>('#citizenRegPassword')?.value ?? '',
        }),
      });
      localStorage.setItem('reporta_citizen_token', d.token);
      showCitizen(d.user);
      toast('Cuenta creada. RUT validado por Módulo 11.');
    } catch (err) {
      if (errEl) errEl.textContent = err instanceof Error ? err.message : 'Error al registrar.';
    }
  };
  const ct = localStorage.getItem('reporta_citizen_token');
  if (ct) {
    try {
      const d = await api<{ user: CitizenUser }>('/api/citizens/me', { headers: { Authorization: `Bearer ${ct}` } });
      showCitizen(d.user);
    } catch {
      localStorage.removeItem('reporta_citizen_token');
    }
  }
}

function bind(): void {
  document.addEventListener('click', e => {
    const target = e.target as HTMLElement | null;
    const v = target?.closest<HTMLElement>('[data-view]');
    if (v?.dataset.view) {
      e.preventDefault();
      showView(v.dataset.view);
    }
  });
  const menuToggle = $('#menuToggle');
  if (menuToggle) menuToggle.onclick = () => $('.main-nav')?.classList.toggle('open');
  const mapSearch = $<HTMLInputElement>('#mapSearch');
  if (mapSearch) mapSearch.oninput = renderReports;
  const catFilter = $<HTMLSelectElement>('#categoryFilter');
  if (catFilter) catFilter.onchange = renderReports;
  $$('.filter-chip').forEach(b => {
    b.onclick = () => {
      $$('.filter-chip').forEach(x => x.classList.remove('selected'));
      b.classList.add('selected');
      selectedStatus = b.dataset.status ?? '';
      renderReports();
    };
  });
  const locateBtn = $('#locateMe');
  if (locateBtn) locateBtn.onclick = () => locate(false);
  const useGpsBtn = $('#useGps');
  if (useGpsBtn) useGpsBtn.onclick = () => locate(true);

  const useManualCoords = $('#useManualCoords');
  if (useManualCoords) {
    useManualCoords.onclick = () => {
      const lat = Number($<HTMLInputElement>('#manualLat')?.value);
      const lng = Number($<HTMLInputElement>('#manualLng')?.value);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        toast('Ingresa latitud y longitud válidas.');
        return;
      }
      if (!setCoords(lat, lng)) toast('Las coordenadas deben quedar dentro de Puerto Montt.');
    };
  }

  const nextBtn = $('#nextStep');
  if (nextBtn) {
    nextBtn.onclick = async () => {
      if (await validateStep()) showStep(wizardStep + 1);
    };
  }
  const prevBtn = $('#prevStep');
  if (prevBtn) prevBtn.onclick = () => showStep(wizardStep - 1);
  const reportForm = $<HTMLFormElement>('#reportForm');
  if (reportForm) reportForm.onsubmit = submitReport;
  const reportDesc = $<HTMLTextAreaElement>('#reportDescription');
  if (reportDesc) {
    reportDesc.oninput = () => {
      const cnt = $('#descCount');
      if (cnt) cnt.textContent = String(reportDesc.value.length);
    };
  }
  const reportPhoto = $<HTMLInputElement>('#reportPhoto');
  if (reportPhoto) reportPhoto.onchange = readPhoto;
  const trackForm = $<HTMLFormElement>('#trackForm');
  if (trackForm) trackForm.onsubmit = trackFolio;
  const trackRutForm = $<HTMLFormElement>('#trackRutForm');
  if (trackRutForm) trackRutForm.onsubmit = trackRut;

  const loginForm = $<HTMLFormElement>('#loginForm');
  if (loginForm) loginForm.onsubmit = login;
  const logoutBtn = $('#logout');
  if (logoutBtn) logoutBtn.onclick = () => logout();
  const adminStFilter = $<HTMLSelectElement>('#adminStatusFilter');
  if (adminStFilter) adminStFilter.onchange = renderAdminRows;
  const adminCatFilter = $<HTMLSelectElement>('#adminCategoryFilter');
  if (adminCatFilter) adminCatFilter.onchange = renderAdminRows;
  $$('.admin-tab').forEach(b => {
    b.onclick = () => {
      $$('.admin-tab').forEach(x => x.classList.toggle('active', x === b));
      $('#adminInbox')?.classList.toggle('hidden', b.dataset.adminTab !== 'inbox');
      $('#adminAnalytics')?.classList.toggle('hidden', b.dataset.adminTab !== 'analytics');
      if (b.dataset.adminTab === 'analytics') {
        window.setTimeout(() => {
          drawCharts();
          initHeat();
          heatMap?.invalidateSize();
        }, 50);
      }
    };
  });
  const modalClose = $('#modalClose');
  if (modalClose) modalClose.onclick = () => $('#detailModal')?.classList.add('hidden');
  const detailModal = $('#detailModal');
  if (detailModal) {
    detailModal.onclick = e => {
      if (e.target === detailModal) detailModal.classList.add('hidden');
    };
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') $('#detailModal')?.classList.add('hidden');
  });
}

async function init(): Promise<void> {
  if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  if (location.pathname === '/app' || location.pathname === '/app/') {
    document.body.classList.add('citizen-app-mode');
    showView('mapa');
  } else if (location.pathname === '/admin' || location.pathname === '/admin/') {
    document.body.classList.add('municipal-web-mode');
    showView('admin');
  }
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    installPrompt = e as BeforeInstallPromptEvent;
    $('#installApp')?.classList.remove('hidden');
  });
  try {
    const m = await api<{ categories: string[]; holidays?: string[] }>('/api/meta');
    categories = m.categories;
    holidays = new Set(m.holidays ?? []);
    fillCategories();
    reports = await api<PublicReport[]>('/api/reports');
    initMap();
    renderReports();
    void renderFeed();
    await api('/api/health');
    const onlineEl = $('.online');
    if (onlineEl) onlineEl.innerHTML = '<i></i> Sistema activo';
  } catch (err) {
    const onlineEl = $('.online');
    if (onlineEl) onlineEl.innerHTML = '<i style="background:#dc705f"></i> Sin conexión';
    console.error(err);
  }
  bind();
  const installBtn = $('#installApp');
  if (installBtn) {
    installBtn.onclick = async () => {
      if (!installPrompt) {
        toast('En iPhone/iPad: usa Compartir y luego “Agregar a inicio”.');
        return;
      }
      await installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      installBtn.classList.add('hidden');
    };
  }
  if (token) {
    try {
      await loadMe();
      await refreshAdmin();
    } catch {
      logout(false);
    }
  }
}

void init().then(bindCitizen);
