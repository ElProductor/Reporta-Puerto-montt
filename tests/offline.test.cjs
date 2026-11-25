const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');

test('PWA map and charts use local libraries and cache their complete offline shell', () => {
  const citizen = fs.readFileSync(path.join(publicDir, 'citizen.html'), 'utf8');
  const municipal = fs.readFileSync(path.join(publicDir, 'municipal.html'), 'utf8');
  const html = `${citizen}\n${municipal}`;
  for (const localAsset of ['/vendor/leaflet/leaflet.js', '/vendor/leaflet/leaflet.css', '/vendor/markercluster/leaflet.markercluster.js', '/vendor/chartjs/chart.umd.js', '/offline.css']) {
    assert.ok(html.includes(localAsset), `HTML should load ${localAsset} locally`);
    assert.ok(fs.existsSync(path.join(publicDir, localAsset.slice(1))), `${localAsset} should exist`);
  }
  assert.match(citizen, /citizen\.bundle\.js/);
  assert.match(citizen, /citizen-react\.css/);
  assert.doesNotMatch(citizen, /src="\/app\.js"/);
  assert.match(municipal, /src="\/app\.js"/);
  for (const asset of ['/citizen.bundle.js', '/citizen-react.css']) assert.ok(fs.existsSync(path.join(publicDir, asset.slice(1))), `${asset} should be built and exist`);
  assert.doesNotMatch(html, /(?:unpkg\.com|cdn\.jsdelivr\.net)\/.*(?:leaflet|chart)/i);
  const source = fs.readFileSync(path.join(publicDir, 'sw.js'), 'utf8');
  const context = { self: { location: { origin: 'http://localhost:3001' }, addEventListener() {} }, URL };
  vm.createContext(context);
  vm.runInContext(`${source}\nglobalThis.__shell=SHELL;globalThis.__publicApiPath=publicApiPath;`, context);
  for (const asset of ['/vendor/leaflet/leaflet.js', '/vendor/leaflet/leaflet.css', '/vendor/markercluster/leaflet.markercluster.js', '/vendor/chartjs/chart.umd.js', '/offline.css', '/citizen.bundle.js', '/citizen-react.css']) assert.ok(context.__shell.includes(asset));
  assert.equal(context.__publicApiPath('/api/reports'), true);
  assert.equal(context.__publicApiPath('/api/reports/RPM-2026-0001/comments'), true);
  for (const privatePath of ['/api/admin/metrics', '/api/citizens/me', '/api/citizens/notifications', '/api/track']) assert.equal(context.__publicApiPath(privatePath), false);
  assert.match(source, /request\.method!=='GET'\|\|!publicApiPath/);
});
