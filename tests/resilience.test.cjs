const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { copyFile, mkdtemp, readFile, rm, writeFile } = require('node:fs/promises');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address();
      srv.close(() => resolve(addr.port));
    });
  });
}

async function startServer(dataDir) {
  const port = await getFreePort();
  const base = `http://127.0.0.1:${port}`;
  const proc = spawn(process.execPath, ['server.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      REPORTA_DATA_DIR: dataDir,
      JWT_SECRET: 'reporta-resilience-secret-that-is-at-least-32-bytes',
    },
    stdio: 'ignore',
    windowsHide: true,
  });
  for (let i = 0; i < 80; i++) {
    try {
      const r = await fetch(`${base}/api/health`);
      if (r.ok) return { proc, base };
    } catch {}
    await new Promise(r => setTimeout(r, 125));
  }
  proc.kill();
  throw new Error('Server failed to start within timeout');
}

async function stopServer(proc) {
  if (!proc || proc.exitCode !== null) return;
  proc.kill();
  await new Promise(resolve => {
    if (proc.exitCode !== null) resolve();
    else {
      proc.once('exit', resolve);
      setTimeout(resolve, 2000).unref();
    }
  });
}

async function req(base, route, options = {}) {
  const res = await fetch(`${base}${route}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : null };
}

test('CP-33 concurrent writes preserve all reports, unique folios and valid JSON across restart', async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'reporta-conc-'));
  let srv = await startServer(dataDir);
  try {
    const reg = await req(srv.base, '/api/citizens/register', {
      method: 'POST',
      body: {
        name: 'Vecino Concurrencia',
        rut: '12.345.678-5',
        email: 'concurrencia@example.test',
        password: 'ClaveConcurrencia2026!',
      },
    });
    assert.equal(reg.status, 201);
    const token = reg.data.token;
    const beforeCount = (await req(srv.base, '/api/reports')).data.length;

    const media = 'data:image/jpeg;base64,/9j/';
    const parallel = await Promise.all(
      Array.from({ length: 10 }, (_, idx) =>
        req(srv.base, '/api/reports', {
          method: 'POST',
          token,
          body: {
            lat: -41.468 + idx * 0.001,
            lng: -72.942 + idx * 0.001,
            category: 'Alumbrado público',
            description: `Reporte concurrente número ${idx + 1} en sector urbano de Puerto Montt.`,
            photo: media,
            media: [{ type: 'image/jpeg', data: media }],
          },
        }),
      ),
    );

    assert.ok(parallel.every(r => r.status === 201));
    const folios = new Set(parallel.map(r => r.data.report.folio));
    assert.equal(folios.size, 10);

    await stopServer(srv.proc);
    srv = await startServer(dataDir);
    const afterRestart = await req(srv.base, '/api/reports');
    assert.equal(afterRestart.data.length, beforeCount + 10);
    const persisted = JSON.parse(await readFile(path.join(dataDir, 'db.json'), 'utf8'));
    assert.equal(persisted.schemaVersion, 3);
    assert.equal(persisted.tables.reports.length, beforeCount + 10);
  } finally {
    await stopServer(srv.proc);
    await rm(dataDir, { recursive: true, force: true });
  }
});

test('CP-34 crash recovery ignores orphaned truncated .tmp file and preserves committed db.json', async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'reporta-recov-'));
  let srv = await startServer(dataDir);
  try {
    const reg = await req(srv.base, '/api/citizens/register', {
      method: 'POST',
      body: {
        name: 'Vecina Recuperación',
        rut: '12.345.678-5',
        email: 'recuperacion@example.test',
        password: 'ClaveRecuperacion2026!',
      },
    });
    assert.equal(reg.status, 201);
    const token = reg.data.token;
    const media = 'data:image/jpeg;base64,/9j/';
    const created = await req(srv.base, '/api/reports', {
      method: 'POST',
      token,
      body: {
        lat: -41.4685,
        lng: -72.9425,
        category: 'Otro',
        description: 'Bache crítico previo a corte eléctrico simulado durante escritura.',
        photo: media,
        media: [{ type: 'image/jpeg', data: media }],
      },
    });
    assert.equal(created.status, 201);
    const expectedFolio = created.data.report.folio;

    await stopServer(srv.proc);
    // Simulate crash mid-write leaving truncated .tmp file alongside intact db.json
    await writeFile(path.join(dataDir, 'db.json.tmp'), '{"schemaVersion":3,"tables":{"reports":[TRUNCATED');
    srv = await startServer(dataDir);

    const lookup = await req(srv.base, `/api/reports/${expectedFolio}`);
    assert.equal(lookup.status, 200);
    assert.equal(lookup.data.report.folio, expectedFolio);

    // Subsequent write must overwrite/clean cleanly
    const second = await req(srv.base, '/api/reports', {
      method: 'POST',
      token,
      body: {
        lat: -41.464,
        lng: -72.936,
        category: 'Otro',
        description: 'Nuevo reporte post-recuperación para validar continuidad operativa.',
        photo: media,
        media: [{ type: 'image/jpeg', data: media }],
      },
    });
    assert.equal(second.status, 201);
  } finally {
    await stopServer(srv.proc);
    await rm(dataDir, { recursive: true, force: true });
  }
});

test('CP-35 backup and restore of db.json recovers exact prior database snapshot', async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'reporta-bkp-'));
  const backupFile = path.join(dataDir, 'db.backup.json');
  let srv = await startServer(dataDir);
  try {
    const reg = await req(srv.base, '/api/citizens/register', {
      method: 'POST',
      body: {
        name: 'Vecino Respaldo',
        rut: '12.345.678-5',
        email: 'respaldo@example.test',
        password: 'ClaveRespaldo2026!',
      },
    });
    assert.equal(reg.status, 201);
    const token = reg.data.token;
    const baseline = (await req(srv.base, '/api/reports')).data.length;

    await stopServer(srv.proc);
    await copyFile(path.join(dataDir, 'db.json'), backupFile);

    // Mutate state after backup
    srv = await startServer(dataDir);
    const media = 'data:image/jpeg;base64,/9j/';
    const extra = await req(srv.base, '/api/reports', {
      method: 'POST',
      token,
      body: {
        lat: -41.4675,
        lng: -72.9415,
        category: 'Alumbrado público',
        description: 'Microbasural creado después del respaldo para verificar restauración.',
        photo: media,
        media: [{ type: 'image/jpeg', data: media }],
      },
    });
    assert.equal(extra.status, 201);
    const extraFolio = extra.data.report.folio;
    assert.equal((await req(srv.base, '/api/reports')).data.length, baseline + 1);

    // Restore backup
    await stopServer(srv.proc);
    await copyFile(backupFile, path.join(dataDir, 'db.json'));
    srv = await startServer(dataDir);

    assert.equal((await req(srv.base, '/api/reports')).data.length, baseline);
    const missing = await req(srv.base, `/api/reports/${extraFolio}`);
    assert.equal(missing.status, 404);
  } finally {
    await stopServer(srv.proc);
    await rm(dataDir, { recursive: true, force: true });
  }
});
