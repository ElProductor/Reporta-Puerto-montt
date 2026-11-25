import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import type { Icon, Map as LeafletMap, Marker } from 'leaflet';
import { isWithinPuertoMontt } from '../domain';
import type {} from '../types/browser-globals';

type View = 'mapa' | 'feed' | 'reportar' | 'cuenta' | 'seguimiento';
type Coordinate = { lat: number; lng: number };
type PublicReport = {
  id: string; folio: string; category: string; description: string; lat: number; lng: number;
  status: string; department: string; createdAt: string; updatedAt: string; supportCount: number;
  priority: string; before: string | null; after: string | null;
  media: Array<{ type: string; data: string }>;
  closure: null | { text: string; crew: string; closedAt: string; days: number };
  history: Array<{ status: string; date: string; comment: string }>;
};
type Citizen = { name: string; email: string; rut: string; role: string; rutValid: boolean; identityVerified: boolean };
type CitizenComment = { id: string; name: string; text: string; date: string };
type CitizenNotification = { id: string; folio: string; status: string; message: string; date: string; readAt: string | null };
type ApiError = Error & { status?: number };

const CATEGORY_LIST = ['Alumbrado público', 'Baches y calzadas', 'Aseo y microbasurales', 'Áreas verdes', 'Señalética', 'Agua y alcantarillado', 'Otro'];
const CITY_CENTER: Coordinate = { lat: -41.4689, lng: -72.9411 };
const STATUS_LABEL: Record<string, string> = { PENDIENTE: 'Pendiente', EN_REVISION: 'En revisión', EN_TERRENO: 'En terreno', DERIVADO: 'Derivado', RESUELTO: 'Resuelto', RECHAZADO: 'Rechazado' };
const CATEGORY_ICON: Record<string, string> = { 'Alumbrado público': '☼', 'Baches y calzadas': '⌁', 'Aseo y microbasurales': '♲', 'Áreas verdes': '❀', Señalética: '⚑', 'Agua y alcantarillado': '≈', Otro: '✳' };
const STATUS_CLASS: Record<string, string> = { PENDIENTE: 'red', EN_REVISION: 'amber', EN_TERRENO: 'blue', DERIVADO: 'purple', RESUELTO: 'green', RECHAZADO: 'red' };

async function api<T>(route: string, options: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('reporta_token');
  if (options.auth !== false && token) headers.Authorization = `Bearer ${token}`;
  let response: Response;
  try {
    response = await fetch(route, { method: options.method || 'GET', headers, ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }) });
  } catch {
    throw new Error('No hay conexión al servidor. Revisa la red e inténtalo otra vez.');
  }
  const data = await response.json().catch(() => ({ error: 'Respuesta inesperada del servidor.' })) as T & { error?: string };
  if (!response.ok) {
    const error = new Error(data.error || 'Ocurrió un error.') as ApiError;
    error.status = response.status;
    throw error;
  }
  return data;
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}.`));
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Formato de archivo no válido.'));
    reader.readAsDataURL(file);
  });
}

function MapView(props: { reports: PublicReport[]; center?: Coordinate; select?: (report: PublicReport) => void; setCoordinates?: (point: Coordinate) => void; className?: string }): ReactElement {
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const [tilesUnavailable, setTilesUnavailable] = useState(!navigator.onLine);
  const center = props.center || CITY_CENTER;

  useEffect(() => {
    if (!element.current || map.current || !window.L) return;
    const leafletMap = window.L.map(element.current, { zoomControl: true }).setView([center.lat, center.lng], 12);
    const tileLayer = window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' }).addTo(leafletMap);
    tileLayer.on('tileerror', () => setTilesUnavailable(true));
    tileLayer.on('tileload', () => { if (navigator.onLine) setTilesUnavailable(false); });
    if (props.setCoordinates) leafletMap.on('click', event => props.setCoordinates?.({ lat: event.latlng.lat, lng: event.latlng.lng }));
    map.current = leafletMap;
    return () => { leafletMap.remove(); map.current = null; markers.current = []; };
  }, []);

  useEffect(() => {
    if (!map.current || !window.L) return;
    markers.current.forEach(marker => marker.remove());
    markers.current = props.reports.map(report => {
      const icon = window.L.divIcon({ className: 'citizen-leaflet-marker', html: `<span class="report-pin ${STATUS_CLASS[report.status] || 'red'}"></span>`, iconSize: [24, 30], iconAnchor: [12, 28] }) as unknown as Icon;
      return window.L.marker([report.lat, report.lng], { icon }).addTo(map.current!).on('click', () => props.select?.(report));
    });
    map.current.setView([center.lat, center.lng], map.current.getZoom());
  }, [props.reports, props.select, center.lat, center.lng]);

  return <div className={`citizen-map-wrap ${props.className || ''}`}>
    <div className="citizen-map" ref={element} role="application" aria-label={props.setCoordinates ? 'Selecciona la ubicación del incidente' : 'Mapa de reportes de Puerto Montt'} />
    {tilesUnavailable && <div className="citizen-map-offline" role="status">Mapa base sin conexión. Los reportes guardados siguen visibles. {props.setCoordinates ? 'Usa GPS o escribe las coordenadas abajo.' : ''}</div>}
  </div>;
}

function App(): ReactElement {
  const [view, setView] = useState<View>('mapa');
  const [reports, setReports] = useState<PublicReport[]>([]);
  const [categories, setCategories] = useState<string[]>(CATEGORY_LIST);
  const [citizen, setCitizen] = useState<Citizen | null>(null);
  const [notifications, setNotifications] = useState<CitizenNotification[]>([]);
  const [selected, setSelected] = useState<PublicReport | null>(null);
  const [comments, setComments] = useState<CitizenComment[]>([]);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(!navigator.onLine);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [mapCenter, setMapCenter] = useState(CITY_CENTER);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [draft, setDraft] = useState({ location: null as Coordinate | null, category: '', description: '', files: [] as Array<{ type: string; data: string; name: string }>, step: 1 });
  const [form, setForm] = useState({ name: '', rut: '', email: '', password: '' });
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [commentText, setCommentText] = useState('');
  const [folio, setFolio] = useState('');
  const [trackedReport, setTrackedReport] = useState<PublicReport | null>(null);
  const [myReports, setMyReports] = useState<PublicReport[]>([]);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [pending, setPending] = useState(false);
  const token = localStorage.getItem('reporta_token');

  const tellError = (value: unknown) => { setError(value instanceof Error ? value.message : 'Ocurrió un error.'); setNotice(''); };
  const tellNotice = (value: string) => { setNotice(value); setError(''); };

  async function refreshReports(): Promise<PublicReport[]> {
    const list = await api<PublicReport[]>('/api/reports', { auth: false });
    setReports(list);
    return list;
  }

  async function refreshAccount(): Promise<void> {
    if (!localStorage.getItem('reporta_token')) { setCitizen(null); setNotifications([]); return; }
    const response = await api<{ user: Citizen }>('/api/citizens/me');
    setCitizen(response.user);
    const inbox = await api<{ notifications: CitizenNotification[] }>('/api/citizens/notifications');
    setNotifications(inbox.notifications);
  }

  useEffect(() => {
    if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    void Promise.all([api<{ categories: string[] }>('/api/meta', { auth: false }), refreshReports()]).then(([meta]) => setCategories(meta.categories)).catch(tellError);
    if (localStorage.getItem('reporta_token')) void refreshAccount().catch(() => { localStorage.removeItem('reporta_token'); setCitizen(null); });
    const onOffline = () => setOffline(true);
    const onOnline = () => { setOffline(false); void refreshReports().catch(() => undefined); };
    const onInstall = (event: Event) => { event.preventDefault(); setInstallEvent(event as BeforeInstallPromptEvent); };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    window.addEventListener('beforeinstallprompt', onInstall);
    return () => { window.removeEventListener('offline', onOffline); window.removeEventListener('online', onOnline); window.removeEventListener('beforeinstallprompt', onInstall); };
  }, []);

  useEffect(() => {
    if (!token) return;
    const timer = window.setInterval(() => { void api<{ notifications: CitizenNotification[] }>('/api/citizens/notifications').then(result => setNotifications(result.notifications)).catch(() => undefined); }, 30_000);
    return () => window.clearInterval(timer);
  }, [token]);

  useEffect(() => {
    if (!selected) { setComments([]); return; }
    void api<{ comments: CitizenComment[] }>(`/api/reports/${encodeURIComponent(selected.folio)}/comments`, { auth: false }).then(result => setComments(result.comments)).catch(() => setComments([]));
  }, [selected?.folio]);

  const filtered = useMemo(() => reports.filter(report => (!statusFilter || report.status === statusFilter)
    && (!query || `${report.folio} ${report.category} ${report.description}`.toLowerCase().includes(query.toLowerCase()))), [reports, statusFilter, query]);

  function go(next: View): void { setView(next); setError(''); setNotice(''); setSelected(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function updateForm(event: ChangeEvent<HTMLInputElement>): void { setForm(current => ({ ...current, [event.target.name]: event.target.value })); }
  function updateLocation(point: Coordinate): void {
    const valid = isWithinPuertoMontt(point);
    setDraft(current => ({ ...current, location: point }));
    setManualLat(point.lat.toFixed(5)); setManualLng(point.lng.toFixed(5));
    if (!valid) tellError('La ubicación debe estar dentro de los límites de Puerto Montt.'); else setError('');
  }

  async function locate(): Promise<void> {
    if (!navigator.geolocation) { tellError('Este dispositivo no ofrece geolocalización.'); return; }
    navigator.geolocation.getCurrentPosition(position => updateLocation({ lat: position.coords.latitude, lng: position.coords.longitude }), () => tellError('No se pudo obtener la ubicación. Revisa los permisos del navegador.'), { enableHighAccuracy: true, timeout: 10_000 });
  }

  async function selectFiles(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const files = Array.from(event.target.files || []);
    if (files.length < 1 || files.length > 3) { tellError('Adjunta entre 1 y 3 archivos: una foto y hasta dos videos.'); return; }
    if (files.reduce((sum, file) => sum + file.size, 0) > 5 * 1024 * 1024) { tellError('Los archivos no pueden superar 5 MB en total.'); return; }
    try {
      const loaded = await Promise.all(files.map(async file => ({ type: file.type, data: await readFile(file), name: file.name })));
      if (!loaded.some(item => item.type.startsWith('image/'))) { tellError('Agrega al menos una fotografía.'); return; }
      if (loaded.some(item => !['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'].includes(item.type))) { tellError('Usa fotos JPG, PNG o WebP y videos MP4 o WebM.'); return; }
      setDraft(current => ({ ...current, files: loaded })); setError('');
    } catch (caught) { tellError(caught); }
  }

  async function authenticate(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); setPending(true);
    try {
      const result = await api<{ token: string; user: Citizen }>(authMode === 'register' ? '/api/citizens/register' : '/api/citizens/login', { method: 'POST', body: form, auth: false });
      localStorage.setItem('reporta_token', result.token); setCitizen(result.user); await refreshAccount(); setForm({ name: '', rut: '', email: '', password: '' }); tellNotice('Sesión ciudadana iniciada.');
    } catch (caught) { tellError(caught); } finally { setPending(false); }
  }

  async function submitReport(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); if (!citizen) { setAuthMode('login'); go('cuenta'); tellError('Inicia sesión para enviar el reporte.'); return; }
    if (!draft.location || !isWithinPuertoMontt(draft.location)) { tellError('Selecciona una ubicación dentro de Puerto Montt.'); return; }
    const photo = draft.files.find(file => file.type.startsWith('image/'));
    if (!photo || !draft.category || draft.description.trim().length < 10) { tellError('Completa categoría, descripción y fotografía antes de enviar.'); return; }
    setPending(true);
    try {
      const result = await api<{ report: PublicReport }>('/api/reports', { method: 'POST', body: { lat: draft.location.lat, lng: draft.location.lng, category: draft.category, description: draft.description, photo: photo.data, media: draft.files.map(file => ({ type: file.type, data: file.data })) } });
      setReports(current => [result.report, ...current]); setTrackedReport(result.report); setFolio(result.report.folio); setDraft({ location: null, category: '', description: '', files: [], step: 1 }); go('seguimiento'); tellNotice(`Reporte recibido. Tu folio es ${result.report.folio}.`);
    } catch (caught) { tellError(caught); } finally { setPending(false); }
  }

  async function loadComments(report: PublicReport): Promise<void> {
    setSelected(report);
    try { const response = await api<{ comments: CitizenComment[] }>(`/api/reports/${encodeURIComponent(report.folio)}/comments`, { auth: false }); setComments(response.comments); } catch { setComments([]); }
  }

  async function support(report: PublicReport): Promise<void> {
    if (!citizen) { go('cuenta'); tellError('Inicia sesión para apoyar un reporte.'); return; }
    try { await api(`/api/reports/${encodeURIComponent(report.folio)}/support`, { method: 'POST', body: {} }); await refreshReports(); tellNotice('Tu apoyo quedó registrado.'); }
    catch (caught) { tellError(caught); }
  }

  async function sendComment(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); if (!selected) return;
    try { await api(`/api/reports/${encodeURIComponent(selected.folio)}/comments`, { method: 'POST', body: { text: commentText } }); setCommentText(''); tellNotice('Comentario enviado a moderación municipal.'); }
    catch (caught) { tellError(caught); }
  }

  async function track(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); const key = folio.trim(); if (!key) return;
    try { const result = await api<{ report: PublicReport }>(`/api/reports/${encodeURIComponent(key)}`, { auth: false }); setTrackedReport(result.report); setError(''); }
    catch (caught) { tellError(caught); setTrackedReport(null); }
  }

  async function loadMine(): Promise<void> {
    if (!citizen) { go('cuenta'); tellError('Inicia sesión para consultar tus reportes.'); return; }
    try { const result = await api<{ reports: PublicReport[] }>('/api/track', { method: 'POST', body: {} }); setMyReports(result.reports); setError(''); }
    catch (caught) { tellError(caught); }
  }

  async function markRead(): Promise<void> {
    try { await api('/api/citizens/notifications/read-all', { method: 'PATCH', body: {} }); await refreshAccount(); }
    catch (caught) { tellError(caught); }
  }

  async function requestVerification(): Promise<void> {
    try { const result = await api<{ folio: string }>('/api/citizens/verification-request', { method: 'POST', body: {} }); tellNotice(`Solicitud de verificación enviada: ${result.folio}. La municipalidad revisará tus antecedentes.`); }
    catch (caught) { tellError(caught); }
  }

  async function installApp(): Promise<void> {
    if (!installEvent) { tellNotice('En iPhone/iPad: usa Compartir y luego “Agregar a inicio”.'); return; }
    await installEvent.prompt(); setInstallEvent(null);
  }

  return <div className="citizen-react-app">
    <header className="citizen-header">
      <a className="citizen-brand" href="#mapa" onClick={event => { event.preventDefault(); go('mapa'); }}><span className="citizen-brand-pin">●</span><span><strong>Reporta</strong><small>PUERTO MONTT</small></span></a>
      <nav aria-label="Navegación ciudadana" className="citizen-nav">
        {(['mapa', 'feed', 'reportar', 'cuenta', 'seguimiento'] as View[]).map(item => <button key={item} className={view === item ? 'active' : ''} onClick={() => go(item)}>{({ mapa: 'Mapa', feed: 'Muro vecinal', reportar: 'Reportar', cuenta: 'Mi cuenta', seguimiento: 'Seguimiento' } as Record<View, string>)[item]}</button>)}
      </nav>
      <div className="citizen-header-actions"><span className={offline ? 'connection offline' : 'connection'}>{offline ? 'Sin conexión' : 'En línea'}</span><button className="citizen-install" onClick={() => void installApp()}>Instalar app</button></div>
    </header>
    {(notice || error) && <div className={`citizen-alert ${error ? 'is-error' : ''}`} role="status"><span>{error || notice}</span><button onClick={() => { setError(''); setNotice(''); }} aria-label="Cerrar aviso">×</button></div>}

    {view === 'mapa' && <main className="citizen-map-page">
      <MapView reports={filtered} center={mapCenter} select={report => void loadComments(report)} />
      <section className="citizen-map-panel" aria-label="Reportes vecinales">
        <div className="citizen-panel-title"><div><small>VISTA COMUNAL</small><h1>Incidencias</h1></div><strong>{filtered.length}</strong></div>
        <label className="citizen-search">Buscar folio, categoría<input value={query} onChange={event => setQuery(event.target.value)} aria-label="Buscar reportes" /></label>
        <label className="citizen-select">Estado<select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">Todos</option>{Object.entries(STATUS_LABEL).filter(([key]) => key !== 'RECHAZADO').map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <div className="citizen-report-list">{filtered.slice(0, 50).map(report => <button className="citizen-report-row" key={report.id} onClick={() => { setMapCenter({ lat: report.lat, lng: report.lng }); void loadComments(report); }}><span className={`category-icon ${STATUS_CLASS[report.status] || 'red'}`}>{CATEGORY_ICON[report.category] || '✳'}</span><span><strong>{report.category}</strong><small>{report.folio} · {STATUS_LABEL[report.status] || report.status}</small></span><time>{dateLabel(report.createdAt)}</time></button>)}</div>
        <button className="citizen-primary citizen-full" onClick={() => go('reportar')}>＋ Crear reporte</button>
      </section>
      {selected && <ReportDetail report={selected} comments={comments} citizen={citizen} commentText={commentText} setCommentText={setCommentText} onSupport={() => void support(selected)} onComment={event => void sendComment(event)} onClose={() => setSelected(null)} />}
    </main>}

    {view === 'feed' && <main className="citizen-page"><PageHeading eyebrow="COMUNIDAD EN ACCIÓN" title="Muro vecinal" subtitle="Mira qué está pasando en tu barrio, apoya y comenta los reportes." /><div className="citizen-feed-grid">
      {reports.slice(0, 40).map(report => <article className="citizen-post" key={report.id}>
        {report.before && <button className="citizen-post-image" onClick={() => { setMapCenter({ lat: report.lat, lng: report.lng }); go('mapa'); void loadComments(report); }} aria-label={`Ver ubicación de ${report.folio}`}><img src={report.before} alt={`Evidencia: ${report.category}`} /></button>}
        <div className="citizen-post-copy"><div className="citizen-post-meta"><span className={`status-chip ${STATUS_CLASS[report.status] || 'red'}`}>{STATUS_LABEL[report.status] || report.status}</span><time>{dateLabel(report.createdAt)}</time></div><h2>{CATEGORY_ICON[report.category] || '✳'} {report.category}</h2><p>{report.description}</p><button className="citizen-location" onClick={() => { setMapCenter({ lat: report.lat, lng: report.lng }); setSelected(report); go('mapa'); }}>⌖ {report.lat.toFixed(5)}, {report.lng.toFixed(5)} · Ver en mapa</button><div className="citizen-post-actions"><button onClick={() => void support(report)}>♡ Apoyar · {report.supportCount}</button><button onClick={() => void loadComments(report)}>Comentar</button><button onClick={() => { setFolio(report.folio); setTrackedReport(report); go('seguimiento'); }}>Seguimiento</button></div></div>
      </article>)}
      {reports.length === 0 && <p className="citizen-empty">{offline ? 'No hay reportes guardados en este dispositivo todavía.' : 'Todavía no hay reportes vecinales.'}</p>}
    </div></main>}

    {view === 'reportar' && <main className="citizen-page"><PageHeading eyebrow={`PASO ${String(draft.step).padStart(2, '0')} DE 04`} title="Reporta una incidencia" subtitle="Ubica el problema, cuéntanos qué sucede y agrega evidencia." /><form className="citizen-wizard" onSubmit={event => { if (draft.step < 4) { event.preventDefault(); if (draft.step === 1 && !draft.location) { tellError('Selecciona la ubicación del incidente.'); return; } if (draft.step === 2 && (!draft.category || draft.description.trim().length < 10)) { tellError('Elige una categoría y describe el problema con al menos 10 caracteres.'); return; } if (draft.step === 3 && !draft.files.some(file => file.type.startsWith('image/'))) { tellError('Agrega una fotografía de evidencia.'); return; } setDraft(current => ({ ...current, step: current.step + 1 })); setError(''); } else void submitReport(event); }}>
      <div className="citizen-steps">{['Ubicación', 'Detalle', 'Evidencia', 'Enviar'].map((label, index) => <button type="button" key={label} className={draft.step === index + 1 ? 'active' : draft.step > index + 1 ? 'done' : ''} onClick={() => { if (index + 1 < draft.step) setDraft(current => ({ ...current, step: index + 1 })); }}><b>{index + 1}</b><span>{label}</span></button>)}</div>
      {draft.step === 1 && <section className="citizen-step"><h2>¿Dónde ocurre?</h2><p>Usa el mapa, tu GPS o ingresa las coordenadas del lugar.</p><MapView reports={[]} center={draft.location || CITY_CENTER} setCoordinates={updateLocation} className="citizen-mini-map" /><div className="citizen-coordinate-grid"><label>Latitud<input inputMode="decimal" type="number" step="0.00001" min="-41.65" max="-41.30" value={manualLat} onChange={event => setManualLat(event.target.value)} placeholder="-41.46890" /></label><label>Longitud<input inputMode="decimal" type="number" step="0.00001" min="-73.25" max="-72.60" value={manualLng} onChange={event => setManualLng(event.target.value)} placeholder="-72.94110" /></label><button type="button" className="citizen-secondary" onClick={() => void locate()}>◎ Usar mi ubicación</button><button type="button" className="citizen-secondary" onClick={() => updateLocation({ lat: Number(manualLat), lng: Number(manualLng) })}>Aplicar coordenadas</button></div>{draft.location && <p className="citizen-coords-summary">⌖ {draft.location.lat.toFixed(5)}, {draft.location.lng.toFixed(5)}</p>}</section>}
      {draft.step === 2 && <section className="citizen-step"><h2>Cuéntanos qué pasó</h2><label>Categoría<select required value={draft.category} onChange={event => setDraft(current => ({ ...current, category: event.target.value }))}><option value="">Selecciona una categoría</option>{categories.map(category => <option value={category} key={category}>{category}</option>)}</select></label><label>Descripción<textarea required minLength={10} maxLength={1500} rows={5} value={draft.description} onChange={event => setDraft(current => ({ ...current, description: event.target.value }))} placeholder="Ej.: Hay un bache profundo en la calzada frente a…" /><small>{draft.description.length} / 1.500 · mínimo 10</small></label></section>}
      {draft.step === 3 && <section className="citizen-step"><h2>Agrega evidencia</h2><p>Una foto es obligatoria. Puedes incluir hasta dos videos; máximo 5 MB total.</p><label className="citizen-upload">Seleccionar foto y videos<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" multiple onChange={event => void selectFiles(event)} /></label><div className="citizen-file-list">{draft.files.map(file => <span key={file.name}>✓ {file.name}</span>)}</div></section>}
      {draft.step === 4 && <section className="citizen-step"><h2>Envío seguro</h2>{citizen ? <div className="citizen-session-card"><strong>Enviando como {citizen.name}</strong><span>{citizen.email} · RUT validado</span></div> : <div className="citizen-session-card"><strong>Necesitas una cuenta ciudadana</strong><span>Tu identidad se asociará al reporte de forma privada.</span><button type="button" className="citizen-secondary" onClick={() => { setAuthMode('login'); go('cuenta'); }}>Iniciar sesión o crear cuenta</button></div>}<p>La ubicación y evidencias se enviarán al equipo municipal para su atención.</p></section>}
      <div className="citizen-wizard-actions">{draft.step > 1 && <button type="button" className="citizen-secondary" onClick={() => setDraft(current => ({ ...current, step: current.step - 1 }))}>← Anterior</button>}{draft.step < 4 ? <button type="submit" className="citizen-primary">Continuar →</button> : <button type="submit" className="citizen-primary" disabled={pending || !citizen}>{pending ? 'Enviando…' : 'Enviar reporte'}</button>}</div>
    </form></main>}

    {view === 'cuenta' && <main className="citizen-page"><PageHeading eyebrow="TU ESPACIO PERSONAL" title={citizen ? 'Mi cuenta' : 'Acceso ciudadano'} subtitle="Administra tus reportes, notificaciones y verificación de identidad." />{citizen ? <section className="citizen-account-card"><div className="citizen-account-heading"><div><small>CUENTA VERIFICADA POR RUT</small><h2>{citizen.name}</h2><p>{citizen.email} · {citizen.rut}</p><span className={citizen.identityVerified ? 'status-chip green' : 'status-chip amber'}>{citizen.identityVerified ? 'Identidad revisada por municipio' : 'RUT válido · revisión institucional pendiente'}</span></div><button className="citizen-secondary" onClick={() => { localStorage.removeItem('reporta_token'); setCitizen(null); setNotifications([]); tellNotice('Sesión cerrada.'); }}>Cerrar sesión</button></div><div className="citizen-verification"><div><strong>Verificación municipal adicional</strong><p>Solicita que el municipio revise tu identidad con los procedimientos institucionales disponibles.</p></div><button className="citizen-secondary" onClick={() => void requestVerification()}>Solicitar revisión</button></div><div className="citizen-inbox-heading"><h3>Notificaciones</h3><button onClick={() => void markRead()}>Marcar todas como leídas</button></div><div className="citizen-notifications">{notifications.map(notification => <article className={notification.readAt ? 'read' : ''} key={notification.id}><strong>{notification.message}</strong><span>{notification.folio} · {dateLabel(notification.date)}</span></article>)}{notifications.length === 0 && <p className="citizen-empty">Todavía no tienes notificaciones.</p>}</div></section> : <section className="citizen-login-card"><div className="citizen-auth-tabs"><button className={authMode === 'login' ? 'active' : ''} onClick={() => setAuthMode('login')}>Iniciar sesión</button><button className={authMode === 'register' ? 'active' : ''} onClick={() => setAuthMode('register')}>Crear cuenta</button></div><form onSubmit={event => void authenticate(event)}>{authMode === 'register' && <label>Nombre completo<input name="name" value={form.name} onChange={updateForm} required maxLength={80} autoComplete="name" /></label>}{authMode === 'register' && <label>RUT<input name="rut" value={form.rut} onChange={updateForm} required autoComplete="off" placeholder="12.345.678-5" /></label>}<label>Correo electrónico<input name="email" type="email" value={form.email} onChange={updateForm} required autoComplete="email" /></label><label>Contraseña<input name="password" type="password" value={form.password} onChange={updateForm} required minLength={authMode === 'register' ? 10 : 1} autoComplete={authMode === 'register' ? 'new-password' : 'current-password'} /></label><button className="citizen-primary" disabled={pending}>{pending ? 'Procesando…' : authMode === 'register' ? 'Crear cuenta ciudadana' : 'Iniciar sesión'}</button><p>El RUT se valida con Módulo 11. La identidad estatal requiere verificación adicional municipal.</p></form></section>}</main>}

    {view === 'seguimiento' && <main className="citizen-page"><PageHeading eyebrow="TRAZABILIDAD CIUDADANA" title="Seguimiento" subtitle="Consulta un folio público o revisa los reportes asociados a tu cuenta." /><section className="citizen-track-card"><form onSubmit={event => void track(event)}><label>Folio del reporte<input value={folio} onChange={event => setFolio(event.target.value)} placeholder="RPM-2026-0001" /></label><button className="citizen-primary">Buscar folio</button></form>{citizen && <button className="citizen-secondary" onClick={() => void loadMine()}>Ver mis reportes privados</button>}{trackedReport && <ReportSummary report={trackedReport} />}{myReports.map(report => <ReportSummary report={report} key={report.id} />)}{!citizen && <p className="citizen-private-note">Inicia sesión para consultar todos tus reportes privados por cuenta.</p>}</section></main>}

    <footer className="citizen-footer"><span>Reporta Puerto Montt · Participación ciudadana</span><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Cartografía © OpenStreetMap contributors</a><a href="/admin">Acceso municipal</a></footer>
  </div>;
}

function PageHeading(props: { eyebrow: string; title: string; subtitle: string }): ReactElement {
  return <div className="citizen-page-heading"><small>{props.eyebrow}</small><h1>{props.title}</h1><p>{props.subtitle}</p></div>;
}

function ReportSummary(props: { report: PublicReport }): ReactElement {
  const report = props.report;
  return <article className="citizen-summary"><div><span className={`status-chip ${STATUS_CLASS[report.status] || 'red'}`}>{STATUS_LABEL[report.status] || report.status}</span><h2>{report.category} · {report.folio}</h2><p>{report.description}</p>{report.closure && <p><strong>Informe técnico:</strong> {report.closure.text}</p>}{report.history.map(event => <small key={`${event.status}-${event.date}`}>{STATUS_LABEL[event.status] || event.status} · {dateLabel(event.date)}</small>)}</div>{report.before && <img src={report.before} alt="Evidencia del reporte" />}</article>;
}

function ReportDetail(props: { report: PublicReport; comments: CitizenComment[]; citizen: Citizen | null; commentText: string; setCommentText: (value: string) => void; onSupport: () => void; onComment: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void }): ReactElement {
  const report = props.report;
  return <div className="citizen-detail-backdrop" role="presentation" onClick={event => { if (event.target === event.currentTarget) props.onClose(); }}><section className="citizen-detail" role="dialog" aria-modal="true" aria-label={`Detalle ${report.folio}`}><button className="citizen-detail-close" onClick={props.onClose} aria-label="Cerrar detalle">×</button><span className={`status-chip ${STATUS_CLASS[report.status] || 'red'}`}>{STATUS_LABEL[report.status] || report.status}</span><h2>{report.category}</h2><small>{report.folio} · {dateLabel(report.createdAt)}</small><p>{report.description}</p>{report.before && <img className="citizen-detail-photo" src={report.before} alt="Foto de la incidencia" />}{report.after && <img className="citizen-detail-photo" src={report.after} alt="Foto de la reparación" />}<p>⌖ {report.lat.toFixed(5)}, {report.lng.toFixed(5)} · {report.department}</p><div className="citizen-post-actions"><button onClick={props.onSupport}>♡ Apoyar · {report.supportCount}</button><strong>Prioridad {report.priority}</strong></div><h3>Historia de atención</h3>{report.history.map(event => <p className="citizen-timeline" key={`${event.status}-${event.date}`}><strong>{STATUS_LABEL[event.status] || event.status}</strong><small>{dateLabel(event.date)} · {event.comment}</small></p>)}<h3>Comentarios vecinales</h3>{props.comments.map(comment => <p className="citizen-comment" key={comment.id}><strong>Vecino/a</strong> {comment.text}</p>)}{props.comments.length === 0 && <p className="citizen-empty">Aún no hay comentarios publicados.</p>}{props.citizen ? <form className="citizen-comment-form" onSubmit={props.onComment}><textarea value={props.commentText} maxLength={500} minLength={5} onChange={event => props.setCommentText(event.target.value)} placeholder="Escribe un comentario respetuoso" required /><button className="citizen-primary">Enviar a moderación</button></form> : <p className="citizen-private-note">Inicia sesión para apoyar o comentar.</p>}</section></div>;
}

interface BeforeInstallPromptEvent extends Event { prompt(): Promise<void>; }

const mount = document.getElementById('citizenRoot');
if (mount) createRoot(mount).render(<App />);
