const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { mkdtemp, rm, writeFile } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

let proc, base, dataDir, reports, adminToken, operatorToken, inspectorToken, citizenToken;
async function req(route, options = {}) {
  const response = await fetch(`${base}${route}`, { ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}), ...options.headers }, body: options.body ? JSON.stringify(options.body) : undefined });
  const text = await response.text();
  return { status: response.status, data: text ? JSON.parse(text) : null };
}
async function login(email, password) { return req('/api/auth/login', { method: 'POST', body: { email, password } }); }
before(async () => {
  dataDir = await mkdtemp(path.join(os.tmpdir(), 'reporta-test-'));
  const day='2026-11-16T12:00:00.000Z';
  const fixtures=Array.from({length:50},(_,i)=>({id:`fixture-${i}`,folio:`RPM-2026-${String(i+1).padStart(4,'0')}`,category:'Alumbrado público',description:`Caso sintético de prueba ${i+1}.`,lat:-41.45+(i*.0001),lng:-72.90,status:i===0?'RESUELTO':i===1?'EN_REVISION':'PENDIENTE',department:i===2?'Aseo y Ornato':'Operaciones',createdAt:day,updatedAt:day,severity:2,closure:i===0?{text:'Trabajo realizado, verificado en terreno y documentado por cuadrilla municipal.',crew:'Cuadrilla de prueba',closedAt:'2026-11-17T12:00:00.000Z'}:null,reporterId:null}));
  const oldStaff=[['mesa@reporta.local','Mesa2026!','OPERADOR_MESA','Mesa de ayuda','Operador Mesa'],['inspector@reporta.local','Inspector2026!','INSPECTOR_DEPTO','Operaciones','Inspector Municipal'],['admin@reporta.local','Admin2026!','ADMIN_MUNICIPAL','Administración','Administrador']].map(([email,password,role,department,name],i)=>{const salt=`test-salt-${i}`,passwordHash=`${salt}:${crypto.scryptSync(password,salt,64).toString('hex')}`;return{id:`staff-${i}`,email,role,department,name,passwordHash}});
  await writeFile(path.join(dataDir,'db.json'),JSON.stringify({schemaVersion:3,tables:{reports:fixtures,staff:oldStaff,citizens:[],reporters:[],verificationRequests:[],events:[],supporters:[],reportHistory:fixtures.map(r=>({reportId:r.id,status:r.status,date:r.createdAt,comment:'Semilla segura',staff:null})),reportComments:[],reportMedia:[]}}));
  const port = 32000 + Math.floor(Math.random() * 20000); base = `http://127.0.0.1:${port}`;
  proc = spawn(process.execPath, ['server.js'], { cwd: path.resolve(__dirname, '..'), env: { ...process.env, PORT: String(port), REPORTA_DATA_DIR: dataDir, JWT_SECRET: 'reporta-test-secret-that-is-at-least-32-bytes-long', CORS_ORIGINS:'https://portal.example.test', REPORTA_HOLIDAYS:'2026-11-17,invalid-date' }, stdio: 'ignore', windowsHide: true });
  for (let i = 0; i < 80; i++) { try { if ((await fetch(`${base}/api/health`)).ok) break; } catch {} await new Promise(r => setTimeout(r, 125)); }
  const list = await req('/api/reports'); reports = list.data;
  adminToken = (await login('admin@reporta.local', 'Admin2026!')).data.token;
  operatorToken = (await login('mesa@reporta.local', 'Mesa2026!')).data.token;
  inspectorToken = (await login('inspector@reporta.local','Inspector2026!')).data.token;
  const citizen = await req('/api/citizens/register',{method:'POST',body:{name:'Vecina de Prueba',rut:'12.345.678-5',email:'ciudadana@example.test',password:'CiudadanaTest2026!'}});
  assert.equal(citizen.status,201); citizenToken=citizen.data.token;
});
after(async () => { if (proc && proc.exitCode === null) proc.kill(); if (dataDir) await rm(dataDir, { recursive: true, force: true }); });

test('CP-01 API health reports service ready', async () => assert.equal((await req('/api/health')).data.ok, true));
test('CP-02 citizen app serves its independent React PWA entry and bundle', async () => { const response=await fetch(`${base}/app`); assert.equal(response.status,200); const html=await response.text(); assert.match(html,/citizenRoot/); assert.match(html,/citizen\.bundle\.js/); assert.doesNotMatch(html,/src="\/app\.js"/); assert.equal((await fetch(`${base}/citizen.bundle.js`)).status,200); assert.equal((await fetch(`${base}/citizen-react.css`)).status,200); });
test('CP-03 municipal app keeps its separate administration interface', async () => { const response=await fetch(`${base}/admin`); assert.equal(response.status,200); const html=await response.text(); assert.match(html,/src="\/app\.js"/); assert.doesNotMatch(html,/citizenRoot/); });
test('CP-04 metadata provides category catalog and bounds', async () => { const d=(await req('/api/meta')).data; assert.ok(d.categories.length >= 6); assert.ok(d.bbox.minLat < d.bbox.maxLat); });
test('CP-05 seed persists at least 50 cases in normalized relational JSON tables', async () => { assert.ok(reports.length >= 50); const db=require(path.join(dataDir,'db.json')); assert.equal(db.schemaVersion,3); assert.ok(db.tables.reports.length>=50); assert.ok(db.tables.events.length>=50); assert.equal('history' in db.tables.reports[0],false); });
test('CP-06 public report listing excludes rejected cases', async () => assert.ok(reports.every(r => r.status !== 'RECHAZADO')));
test('CP-07 Haversine duplicate lookup detects exact coordinates', async () => { const r=reports.find(x=>['PENDIENTE','EN_REVISION','EN_TERRENO'].includes(x.status)); const d=await req('/api/reports/duplicate',{method:'POST',body:{lat:r.lat,lng:r.lng,category:r.category}}); assert.ok(d.data.duplicate); assert.equal(d.status,200); });
test('CP-08 duplicate lookup rejects malformed category', async () => assert.equal((await req('/api/reports/duplicate',{method:'POST',body:{lat:-41.4,lng:-72.9,category:'invalid'}})).status,400));
test('CP-09 public case by folio omits citizen identity', async () => { const d=(await req(`/api/reports/${reports[0].folio}`)).data.report; assert.equal(d.citizen,undefined); });
test('CP-10 public comment list is available', async () => assert.equal((await req(`/api/reports/${reports[0].folio}/comments`)).status,200));
test('CP-11 too-short authenticated comment is rejected', async () => assert.equal((await req(`/api/reports/${reports[0].folio}/comments`,{method:'POST',token:citizenToken,body:{text:'no'}})).status,400));
test('CP-12 authenticated comment containing email is rejected', async () => assert.equal((await req(`/api/reports/${reports[0].folio}/comments`,{method:'POST',token:citizenToken,body:{text:'Contacta vecino@mail.com'}})).status,400));
test('CP-13 safe comment is moderated and public name stays anonymous', async () => { assert.equal((await req(`/api/reports/${reports[0].folio}/comments`,{method:'POST',token:citizenToken,body:{text:'La luminaria sigue apagada desde ayer.'}})).status,201); const queued=(await req('/api/admin/comments',{token:adminToken})).data.find(c=>c.text==='La luminaria sigue apagada desde ayer.'); assert.ok(queued); assert.equal((await req(`/api/admin/comments/${queued.id}`,{method:'PATCH',token:adminToken,body:{status:'PUBLICADO'}})).status,200); const published=(await req(`/api/reports/${reports[0].folio}/comments`)).data.comments[0]; assert.equal(published.name,'Vecino/a'); assert.equal('citizenId' in published,false); });
test('CP-14 municipal login returns admin role', async () => assert.equal((await login('admin@reporta.local','Admin2026!')).data.user.role,'ADMIN_MUNICIPAL'));
test('CP-15 invalid staff password is denied', async () => assert.equal((await login('admin@reporta.local','incorrecta')).status,401));
test('CP-16 protected metrics deny anonymous access', async () => assert.equal((await req('/api/admin/metrics')).status,401));
test('CP-17 admin metrics include seeded reports', async () => assert.ok((await req('/api/admin/metrics',{token:adminToken})).data.total>=50));
test('CP-18 municipal report list requires auth', async () => assert.equal((await req('/api/admin/reports')).status,401));
test('CP-19 municipal report list works for authenticated staff', async () => assert.ok((await req('/api/admin/reports',{token:adminToken})).data.length>=50));
test('CP-20 private citizen tracking and municipal queue reject anonymous access', async () => { assert.equal((await req('/api/track',{method:'POST',body:{rut:'12.345.678-5'}})).status,401); assert.equal((await req('/api/admin/verification-requests')).status,401); assert.equal((await req('/api/citizens/notifications')).status,401); });
test('CP-21 batch with missing report changes none', async () => { const r=reports.find(x=>x.status==='PENDIENTE'); const before=(await req(`/api/reports/${r.folio}`)).data.report.status; const out=await req('/api/admin/reports/batch',{method:'POST',token:adminToken,body:{ids:[r.id,'missing-id'],status:'EN_REVISION'}}); assert.equal(out.status,404); assert.equal((await req(`/api/reports/${r.folio}`)).data.report.status,before); });
test('CP-22 batch with invalid state among selected changes none', async () => { const a=reports.find(x=>x.status==='PENDIENTE'), b=reports.find(x=>x.status==='RESUELTO'); const out=await req('/api/admin/reports/batch',{method:'POST',token:adminToken,body:{ids:[a.id,b.id],status:'EN_REVISION'}}); assert.equal(out.status,409); assert.equal((await req(`/api/reports/${a.folio}`)).data.report.status,'PENDIENTE'); });
test('CP-23 valid batch updates cases and audit event count', async () => { const candidates=reports.filter(x=>x.status==='PENDIENTE').slice(0,2); assert.equal(candidates.length,2); const before=(await req('/api/admin/metrics',{token:adminToken})).data.events; const out=await req('/api/admin/reports/batch',{method:'POST',token:adminToken,body:{ids:candidates.map(x=>x.id),status:'EN_REVISION',comment:'Revisión conjunta de los antecedentes y asignación municipal.'}}); assert.equal(out.status,200); assert.equal(out.data.updated,2); assert.equal((await req('/api/admin/metrics',{token:adminToken})).data.events,before+2); });
test('CP-24 department RBAC and citizen-authenticated report creation', async () => { const candidate=reports.find(x=>x.status==='EN_REVISION'),outsider=reports.find(x=>x.department==='Aseo y Ornato'); const denied=await req('/api/admin/reports/batch',{method:'POST',token:operatorToken,body:{ids:[candidate.id],status:'EN_TERRENO'}}); assert.equal(denied.status,403); assert.equal((await req(`/api/admin/reports/${outsider.id}/transition`,{method:'POST',token:inspectorToken,body:{status:'EN_REVISION'}})).status,403); assert.equal((await req('/api/reports',{method:'POST',body:{lat:-41.33,lng:-73.2}})).status,401); const media='data:image/jpeg;base64,/9j/'; const outOfBounds=await req('/api/reports',{method:'POST',token:citizenToken,body:{lat:0,lng:0}}); assert.equal(outOfBounds.status,400); const created=await req('/api/reports',{method:'POST',token:citizenToken,body:{lat:-41.33,lng:-73.2,category:'Otro',description:'Una luminaria comunitaria requiere reparación pronta.',rut:'11.111.111-1',email:'suplantacion@example.test',name:'Nombre falso',photo:media,media:[{type:'image/jpeg',data:media}]}}); assert.equal(created.status,201); const folio=created.data.report.folio,caseId=created.data.report.id;let notes=(await req('/api/citizens/notifications',{token:citizenToken})).data.notifications;assert.equal(notes.length,1);assert.equal('citizenId' in notes[0],false);assert.equal((await req(`/api/admin/reports/${caseId}/transition`,{method:'POST',token:adminToken,body:{status:'EN_REVISION',comment:'Antecedentes recibidos; inicia la revisión municipal.'}})).status,200);notes=(await req('/api/citizens/notifications',{token:citizenToken})).data.notifications;assert.equal(notes.length,2);assert.ok(notes.some(n=>n.status==='EN_REVISION'));assert.equal((await req('/api/citizens/notifications/read-all',{method:'PATCH',token:citizenToken,body:{}})).status,200);assert.ok((await req('/api/citizens/notifications',{token:citizenToken})).data.notifications.every(n=>n.readAt));assert.equal((await req(`/api/reports/${folio}/support`,{method:'POST',token:citizenToken,body:{}})).status,200); assert.equal((await req(`/api/reports/${folio}/support`,{method:'POST',token:citizenToken,body:{}})).status,409); const stored=JSON.parse(require('node:fs').readFileSync(path.join(dataDir,'db.json'),'utf8')); const persisted=stored.tables.reports.find(x=>x.id===created.data.report.id),support=stored.tables.supporters.find(x=>x.reportId===persisted.id); assert.equal('rut' in persisted,false); assert.equal('email' in persisted,false); assert.ok(stored.tables.citizens.some(c=>c.id===persisted.reporterId&&c.rut==='12.345.678-5'&&c.email==='ciudadana@example.test'&&c.name==='Vecina de Prueba')); assert.equal('rut' in support,false); assert.equal(support.rutHash.length,64); assert.equal(stored.tables.reports.length,reports.length+1); });
test('CP-25 CORS allows configured origin and rejects arbitrary sites', async () => { const allowed=await fetch(`${base}/api/health`,{headers:{Origin:'https://portal.example.test'}}); assert.equal(allowed.headers.get('access-control-allow-origin'),'https://portal.example.test'); const denied=await fetch(`${base}/api/health`,{headers:{Origin:'https://evil.example'}}); assert.equal(denied.headers.get('access-control-allow-origin'),null); });
test('CP-26 SLA subtracts configured Chilean holiday dates from KPI workdays', async () => { const meta=(await req('/api/meta')).data; assert.deepEqual(meta.holidays,['2026-11-17']); const metrics=(await req('/api/admin/metrics',{token:adminToken})).data; assert.equal(metrics.averageWorkdays,0); });
test('CP-27 repeated invalid logins are rate limited', async () => { let response; for(let i=0;i<5;i++)response=await login('unknown-rate-limit@example.test','incorrecta'); assert.equal(response.status,429); assert.equal((await login('unknown-rate-limit@example.test','incorrecta')).status,429); });
test('CP-28 staff and citizen passwords are stored with bcrypt cost 12', async () => { const db=JSON.parse(require('node:fs').readFileSync(path.join(dataDir,'db.json'),'utf8')); assert.ok(db.tables.staff.every(x=>/^\$2[aby]\$12\$/.test(x.passwordHash))); assert.ok(db.tables.citizens.every(x=>/^\$2[aby]\$12\$/.test(x.passwordHash))); });
test('CP-29 TypeScript domain close gate is enforced by the HTTP API', async () => { const candidate=(await req('/api/admin/reports',{token:adminToken})).data.find(r=>r.status==='PENDIENTE'); assert.ok(candidate); assert.equal((await req(`/api/admin/reports/${candidate.id}/transition`,{method:'POST',token:adminToken,body:{status:'EN_REVISION'}})).status,200); assert.equal((await req(`/api/admin/reports/${candidate.id}/transition`,{method:'POST',token:adminToken,body:{status:'EN_TERRENO'}})).status,200); const short=await req(`/api/admin/reports/${candidate.id}/close`,{method:'POST',token:adminToken,body:{text:'corto'}}); assert.equal(short.status,400); assert.match(short.data.error,/50 caracteres/); const noPhoto=await req(`/api/admin/reports/${candidate.id}/close`,{method:'POST',token:adminToken,body:{text:'Se reparó el elemento y se verificó su funcionamiento con el equipo municipal en el sector.'}}); assert.equal(noPhoto.status,400); assert.match(noPhoto.data.error,/fotografía/); const photo='data:image/jpeg;base64,/9j/'; const closed=await req(`/api/admin/reports/${candidate.id}/close`,{method:'POST',token:adminToken,body:{text:'Se reparó el elemento y se verificó su funcionamiento con el equipo municipal en el sector.',photo,media:[{type:'image/jpeg',data:photo}]}}); assert.equal(closed.status,200); assert.equal(closed.data.report.status,'RESUELTO'); });
test('CP-30 municipal bundle handles optional manual coords and close endpoint accepts photo without duplicate media array', async () => {
  const bundleRes = await fetch(`${base}/app.js`);
  assert.equal(bundleRes.status, 200);
  const bundle = await bundleRes.text();
  assert.doesNotMatch(bundle, /useManualCoords\)\s*\.onclick/);
  assert.match(bundle, /media:\[\{type:/);
  const candidate = (await req('/api/admin/reports', { token: adminToken })).data.find(r => r.status === 'PENDIENTE');
  assert.ok(candidate);
  assert.equal((await req(`/api/admin/reports/${candidate.id}/transition`, { method: 'POST', token: adminToken, body: { status: 'EN_REVISION' } })).status, 200);
  assert.equal((await req(`/api/admin/reports/${candidate.id}/transition`, { method: 'POST', token: adminToken, body: { status: 'EN_TERRENO' } })).status, 200);
  const photo = 'data:image/jpeg;base64,/9j/';
  const closed = await req(`/api/admin/reports/${candidate.id}/close`, {
    method: 'POST',
    token: adminToken,
    body: { text: 'Cierre técnico ejecutado por cuadrilla municipal con fotografía posterior verificada.', crew: 'Cuadrilla Operaciones', photo }
  });
  assert.equal(closed.status, 200);
  assert.equal(closed.data.report.status, 'RESUELTO');
});
test('CP-31 commune polygon rejects coordinates outside Puerto Montt even inside rectangular BBox', async () => {
  const meta = (await req('/api/meta')).data;
  assert.ok(Array.isArray(meta.polygon) && meta.polygon.length >= 10);
  const res = await req('/api/reports', {
    method: 'POST',
    token: citizenToken,
    body: { lat: -41.63, lng: -73.22, category: 'Otro', description: 'Punto marino fuera del polígono comunal.' }
  });
  assert.equal(res.status, 400);
  assert.match(res.data.error, /límite comunal/);
});
test('CP-32 admin bundle omits demo passwords and heatmap metrics + Canvas layer operate', async () => {
  const adminHtml = await (await fetch(`${base}/admin`)).text();
  const bundle = await (await fetch(`${base}/app.js`)).text();
  assert.doesNotMatch(adminHtml, /data-demo|Accesos de demostración/);
  assert.doesNotMatch(bundle, /Mesa2026!|Inspector2026!|Admin2026!|data-demo/);
  assert.match(bundle, /leaflet-heatmap-layer/);
  assert.match(bundle, /createRadialGradient/);
  const m = (await req('/api/admin/metrics', { token: adminToken })).data;
  assert.ok(Array.isArray(m.heat) && m.heat.length > 0);
  assert.ok(m.heat.every(p => typeof p.lat === 'number' && typeof p.lng === 'number' && p.intensity >= 1));
});
