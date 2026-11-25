const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtemp, readFile, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

async function main() {
  const root = path.resolve(__dirname, '..');
  const server = path.join(root, 'release-final', 'win-unpacked', 'resources', 'reporta-backend', 'server.js');
  const dataDir = await mkdtemp(path.join(os.tmpdir(), 'reporta-package-smoke-'));
  const port = 41000 + Math.floor(Math.random() * 20000);
  const base = `http://127.0.0.1:${port}`;
  const env = { ...process.env, PORT: String(port), REPORTA_DATA_DIR: dataDir, CORS_ORIGINS: '' };
  delete env.JWT_SECRET;
  const child = spawn(process.execPath, [server], { cwd: path.dirname(server), env, stdio: 'ignore', windowsHide: true });
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null) throw new Error(`Packaged API exited with code ${child.exitCode}`);
      try {
        if ((await fetch(`${base}/api/health`)).ok) { ready = true; break; }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(ready, 'packaged API should start');
    const appPage = await fetch(`${base}/app`);
    assert.equal(appPage.status, 200);
    const appHtml = await appPage.text();
    assert.match(appHtml, /\/citizen\.bundle\.js/);
    assert.match(appHtml, /citizenRoot/);
    const adminPage = await fetch(`${base}/admin`);
    assert.equal(adminPage.status, 200);
    assert.match(await adminPage.text(), /\/app\.js/);
    for (const asset of ['/sw.js', '/offline.css', '/citizen.bundle.js', '/citizen-react.css', '/vendor/leaflet/leaflet.js', '/vendor/markercluster/leaflet.markercluster.js', '/vendor/chartjs/chart.umd.js']) assert.equal((await fetch(`${base}${asset}`)).status, 200, `${asset} should be present in the packaged app`);
    const login = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@reporta.local', password: 'Admin2026!' })
    });
    assert.equal(login.status, 200);
    const { token, user } = await login.json();
    assert.equal(user.role, 'ADMIN_MUNICIPAL');
    const metrics = await fetch(`${base}/api/admin/metrics`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(metrics.status, 200);
    const secret = (await readFile(path.join(dataDir, '.auth-secret'), 'utf8')).trim();
    assert.ok(secret.length >= 40);
    console.log('Packaged smoke passed: citizen app, offline libraries, health, admin login, protected metrics, per-install auth key.');
  } finally {
    child.kill();
    await new Promise(resolve => {
      if (child.exitCode !== null) return resolve();
      child.once('exit', resolve);
      setTimeout(resolve, 2000).unref();
    });
    await rm(dataDir, { recursive: true, force: true });
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
