const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtemp, readFile, rm } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

async function startServer(dataDir) {
  const port = 40000 + Math.floor(Math.random() * 20000);
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(port), REPORTA_DATA_DIR: dataDir, CORS_ORIGINS: '' },
    stdio: 'ignore',
    windowsHide: true
  });
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`API exited with code ${child.exitCode}`);
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) return { child, base };
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  child.kill();
  throw new Error('API did not become ready');
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  child.kill();
  await new Promise(resolve => {
    child.once('exit', resolve);
    setTimeout(resolve, 2000).unref();
  });
}

async function login(base) {
  const response = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@reporta.local', password: 'Admin2026!' })
  });
  assert.equal(response.status, 200);
  return (await response.json()).token;
}

test('auth secret is random per installation, persistent across restarts, and legacy fallback cannot forge sessions', async () => {
  const firstDir = await mkdtemp(path.join(os.tmpdir(), 'reporta-auth-a-'));
  const secondDir = await mkdtemp(path.join(os.tmpdir(), 'reporta-auth-b-'));
  let first, second;
  try {
    first = await startServer(firstDir);
    const firstToken = await login(first.base);
    const firstSecret = (await readFile(path.join(firstDir, '.auth-secret'), 'utf8')).trim();
    assert.ok(firstSecret.length >= 40);
    assert.equal((await fetch(`${first.base}/api/admin/metrics`, { headers: { Authorization: `Bearer ${firstToken}` } })).status, 200);
    await stopServer(first.child);

    first = await startServer(firstDir);
    assert.equal((await fetch(`${first.base}/api/admin/metrics`, { headers: { Authorization: `Bearer ${firstToken}` } })).status, 200);
    assert.equal((await readFile(path.join(firstDir, '.auth-secret'), 'utf8')).trim(), firstSecret);

    second = await startServer(secondDir);
    const secondSecret = (await readFile(path.join(secondDir, '.auth-secret'), 'utf8')).trim();
    assert.notEqual(secondSecret, firstSecret);
    assert.equal((await fetch(`${second.base}/api/admin/metrics`, { headers: { Authorization: `Bearer ${firstToken}` } })).status, 401);
    const secondToken = await login(second.base);
    const forgedPayload = Buffer.from(JSON.stringify({ id: 'staff-0', role: 'ADMIN_MUNICIPAL', exp: Date.now() + 3600000 })).toString('base64url');
    const legacySignature = require('node:crypto').createHmac('sha256', 'local-demo-key-change-before-deployment').update(forgedPayload).digest('base64url');
    assert.equal((await fetch(`${second.base}/api/admin/metrics`, { headers: { Authorization: `Bearer ${forgedPayload}.${legacySignature}` } })).status, 401);
    assert.ok(secondToken);
  } finally {
    if (first) await stopServer(first.child);
    if (second) await stopServer(second.child);
    await Promise.all([rm(firstDir, { recursive: true, force: true }), rm(secondDir, { recursive: true, force: true })]);
  }
});
