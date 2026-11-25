const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const { mkdtemp, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const domain = require('../build/domain.js');

const root = path.resolve(__dirname, '..');

test('initial seed places all 50 reports on urban Puerto Montt land with complete multi-step audit trails', async () => {
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'reporta-seed-check-'));
  const port = 42000 + Math.floor(Math.random() * 15000);
  const base = `http://127.0.0.1:${port}`;
  const proc = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(port), REPORTA_DATA_DIR: dataDir, CORS_ORIGINS: '' },
    stdio: 'ignore',
    windowsHide: true,
  });

  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      if (proc.exitCode !== null) throw new Error(`API exited early with ${proc.exitCode}`);
      try {
        if ((await fetch(`${base}/api/health`)).ok) { ready = true; break; }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(ready, 'seeded API should become healthy');

    const dbFile = path.join(dataDir, 'db.json');
    let parsed = null;
    for (let i = 0; i < 40; i++) {
      if (fs.existsSync(dbFile)) {
        try {
          parsed = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
          if (parsed?.tables?.reports?.length === 50) break;
        } catch {}
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    assert.ok(parsed && parsed.schemaVersion === 3, 'db.json should persist in schemaVersion 3');
    const reports = parsed.tables.reports;
    const events = parsed.tables.events;
    assert.equal(reports.length, 50);
    assert.ok(events.length > 50, `expected > 50 audit events for multi-step seeded cases, got ${events.length}`);

    for (const report of reports) {
      assert.equal(
        domain.isWithinPuertoMontt({ lat: report.lat, lng: report.lng }),
        true,
        `${report.folio} (${report.lat}, ${report.lng}) must be inside Puerto Montt polygon`,
      );
      const reportEvents = events.filter(e => e.reportId === report.id);
      if (report.status === 'PENDIENTE') {
        assert.ok(reportEvents.length >= 1, `${report.folio} should have creation event`);
      } else if (report.status === 'EN_REVISION') {
        assert.ok(reportEvents.length >= 2, `${report.folio} (EN_REVISION) should have >= 2 events`);
      } else if (report.status === 'DERIVADO' || report.status === 'EN_TERRENO') {
        assert.ok(reportEvents.length >= 3, `${report.folio} (${report.status}) should have >= 3 events`);
      } else if (report.status === 'RESUELTO') {
        assert.ok(reportEvents.length >= 4, `${report.folio} (RESUELTO) should have >= 4 events`);
        assert.equal(reportEvents.at(-1)?.status, 'RESUELTO');
        assert.ok(report.closure && report.closure.text.length >= 50);
      }
    }
  } finally {
    if (proc.exitCode === null) proc.kill();
    await new Promise(resolve => {
      if (proc.exitCode !== null) return resolve();
      proc.once('exit', resolve);
      setTimeout(resolve, 2000).unref();
    });
    await rm(dataDir, { recursive: true, force: true });
  }
});
