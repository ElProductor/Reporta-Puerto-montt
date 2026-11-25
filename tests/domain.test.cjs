const { test } = require('node:test');
const assert = require('node:assert/strict');
const domain = require('../build/domain.js');

test('strict domain contracts validate Chilean RUT and reject trivial identifiers', () => {
  assert.equal(domain.validateRutModulo11('12.345.678-5'), true);
  assert.equal(domain.validateRutModulo11('12.345.678-4'), false);
  assert.equal(domain.validateRutModulo11('11.111.111-1'), false);
  assert.equal(domain.validateRutModulo11(null), false);
});

test('strict domain contracts enforce Puerto Montt polygon bounds and Haversine radius', () => {
  const origin = { lat: -41.4689, lng: -72.9411 };
  assert.equal(domain.isWithinPuertoMontt(origin), true);
  assert.equal(domain.isWithinPuertoMontt({ lat: -41.437, lng: -72.917 }), true); // Alerce
  assert.equal(domain.isWithinPuertoMontt({ lat: -41.505, lng: -72.851 }), true); // Carretera Austral
  assert.equal(domain.isWithinPuertoMontt({ lat: -41.63, lng: -73.22 }), false); // Mar abierto fuera de polígono aunque dentro de BBox
  assert.equal(domain.isWithinPuertoMontt({ lat: -41.31, lng: -72.62 }), false); // Cordillera fuera de polígono aunque dentro de BBox
  assert.equal(domain.isWithinPuertoMontt({ lat: 0, lng: 0 }), false);
  assert.ok(domain.distanceMeters(origin, origin) < 0.01);
  const near25m = { lat: origin.lat, lng: origin.lng + 25 / (111_320 * Math.cos(origin.lat * Math.PI / 180)) };
  assert.ok(Math.abs(domain.distanceMeters(origin, near25m) - 25) < 0.1);
});

test('strict domain contracts allow only report-state graph transitions', () => {
  assert.equal(domain.isAllowedTransition('PENDIENTE', 'EN_REVISION'), true);
  assert.equal(domain.isAllowedTransition('EN_REVISION', 'EN_TERRENO'), true);
  assert.equal(domain.isAllowedTransition('RESUELTO', 'PENDIENTE'), false);
  assert.equal(domain.isAllowedTransition('UNKNOWN', 'EN_REVISION'), false);
  assert.equal(domain.requiresJustification('DERIVADO', 'corta'), true);
  assert.equal(domain.requiresJustification('EN_REVISION', 'corta'), false);
});

test('strict domain closure gate requires field work, a 50-character report, and a photo', () => {
  assert.deepEqual(domain.validateCloseGate({ status: 'PENDIENTE', technicalNote: 'x'.repeat(50), hasPhoto: true }), { ok: false, reason: 'WRONG_STATUS' });
  assert.deepEqual(domain.validateCloseGate({ status: 'EN_TERRENO', technicalNote: 'corto', hasPhoto: true }), { ok: false, reason: 'SHORT_NOTE' });
  assert.deepEqual(domain.validateCloseGate({ status: 'EN_TERRENO', technicalNote: 'x'.repeat(50), hasPhoto: false }), { ok: false, reason: 'PHOTO_REQUIRED' });
  assert.deepEqual(domain.validateCloseGate({ status: 'EN_TERRENO', technicalNote: 'x'.repeat(50), hasPhoto: true }), { ok: true });
});

test('strict domain SLA calculation excludes weekends and configured holidays', () => {
  assert.equal(domain.workingDaysBetween('2026-11-16T12:00:00.000Z', '2026-11-19T12:00:00.000Z', new Set(['2026-11-17'])), 2);
  assert.equal(domain.workingDaysBetween('not-a-date', '2026-11-19'), 0);
});

test('strict domain priority uses severity and supporter count', () => {
  assert.equal(domain.priorityFor(2, 0), 'BAJA');
  assert.equal(domain.priorityFor(4, 2), 'ALTA');
  assert.equal(domain.priorityFor(5, 8), 'CRÍTICA');
});
