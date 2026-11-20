// ADR-0003 §3.2 y §3.3: la copia de three.js que sirve la app es, byte a byte,
// la del paquete de la versión fijada en package.json, con su licencia.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leerDeRaiz as leer } from './raiz.js';

test('three.js tiene una versión exacta y es la instalada', () => {
  const version = JSON.parse(leer('package.json')).dependencies.three;
  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.equal(JSON.parse(leer('node_modules/three/package.json')).version, version);
  const lock = JSON.parse(leer('package-lock.json')).packages['node_modules/three'];
  assert.equal(lock.version, version);
  assert.match(lock.integrity, /^sha512-/);
});

test('la copia de three.js en app/vendor es idéntica a la del paquete', () => {
  assert.ok(leer('app/vendor/three/three.module.min.js').equals(leer('node_modules/three/build/three.module.min.js')));
  assert.ok(leer('app/vendor/three/LICENSE').equals(leer('node_modules/three/LICENSE')));
});
