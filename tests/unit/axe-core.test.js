// ADR-0007 §3.2: axe-core entra por @axe-core/playwright y se fija con un
// override. Su versión del lockfile tiene que cumplir el rango que declara
// @axe-core/playwright, y el test falla si no sabe leer ese rango.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const leer = (ruta) => JSON.parse(readFileSync(`${RAIZ}${ruta}`, 'utf8'));
const EXACTA = /^(\d+)\.(\d+)\.(\d+)$/;

// Solo las formas que usa npm para un paquete así: exacta, ~ y ^, sobre una
// versión X.Y.Z. Cualquier otra lanza un error, y el test falla.
function cumpleRango(version, rango) {
  const v = version.match(EXACTA)?.slice(1).map(Number);
  const r = rango.match(/^([~^]?)(\d+)\.(\d+)\.(\d+)$/);
  if (!v) throw new Error(`versión que no es X.Y.Z: ${version}`);
  if (!r) throw new Error(`rango que no se sabe leer: ${rango}`);
  const [operador, ...minima] = [r[1], ...r.slice(2).map(Number)];
  const comparar = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  if (operador === '') return comparar(v, minima) === 0;
  let tope;
  if (operador === '~') tope = [minima[0], minima[1] + 1, 0];
  else if (minima[0] > 0) tope = [minima[0] + 1, 0, 0];
  else if (minima[1] > 0) tope = [0, minima[1] + 1, 0];
  else tope = [0, 0, minima[2] + 1];
  return comparar(v, minima) >= 0 && comparar(v, tope) < 0;
}

test('cumpleRango lee las formas exacta, ~ y ^, y falla con las demás', () => {
  assert.equal(cumpleRango('4.14.0', '~4.14.0'), true);
  assert.equal(cumpleRango('4.14.9', '~4.14.0'), true);
  assert.equal(cumpleRango('4.15.0', '~4.14.0'), false);
  assert.equal(cumpleRango('4.13.9', '~4.14.0'), false);
  assert.equal(cumpleRango('4.99.0', '^4.14.0'), true);
  assert.equal(cumpleRango('5.0.0', '^4.14.0'), false);
  assert.equal(cumpleRango('0.3.9', '^0.3.1'), true);
  assert.equal(cumpleRango('0.4.0', '^0.3.1'), false);
  assert.equal(cumpleRango('0.0.3', '^0.0.3'), true);
  assert.equal(cumpleRango('0.0.4', '^0.0.3'), false);
  assert.equal(cumpleRango('4.14.0', '4.14.0'), true);
  assert.equal(cumpleRango('4.14.1', '4.14.0'), false);
  for (const rango of ['>=4.14.0', '4.14.x', '~4.14', '~4.14.0 || ^5.0.0', '*', 'latest', 'npm:axe-core@4.14.0']) {
    assert.throws(() => cumpleRango('4.14.0', rango), /no se sabe leer/);
  }
  assert.throws(() => cumpleRango('4.14.0-canary.1', '~4.14.0'), /no es X\.Y\.Z/);
});

test('axe-core del lockfile cumple el rango que declara @axe-core/playwright', () => {
  const paquetes = leer('package-lock.json').packages;
  const rango = paquetes['node_modules/@axe-core/playwright'].dependencies['axe-core'];
  const copias = Object.keys(paquetes).filter((ruta) => /(^|\/)node_modules\/axe-core$/.test(ruta));
  assert.deepEqual(copias, ['node_modules/axe-core']);
  assert.equal(cumpleRango(paquetes['node_modules/axe-core'].version, rango), true);
});

test('los overrides son axe-core y playwright-core, exactos y alineados con el lockfile', () => {
  const paquete = leer('package.json');
  const paquetes = leer('package-lock.json').packages;
  assert.deepEqual(Object.keys(paquete.overrides).sort(), ['axe-core', 'playwright-core']);
  for (const [nombre, version] of Object.entries(paquete.overrides)) {
    assert.match(version, EXACTA, nombre);
    assert.equal(paquetes[`node_modules/${nombre}`].version, version, nombre);
  }
  assert.match(paquete.devDependencies['@axe-core/playwright'], EXACTA);
  assert.equal(paquete.overrides['playwright-core'], paquete.devDependencies['@playwright/test']);
});

test('axe-core entra solo por su override, y los dos paquetes vienen del registro con su integridad', () => {
  const paquete = leer('package.json');
  const paquetes = leer('package-lock.json').packages;
  assert.equal(paquete.devDependencies['axe-core'], undefined);
  assert.equal(paquete.dependencies?.['axe-core'], undefined);
  for (const nombre of ['@axe-core/playwright', 'axe-core']) {
    const entrada = paquetes[`node_modules/${nombre}`];
    assert.equal(entrada.resolved, `https://registry.npmjs.org/${nombre}/-/${nombre.split('/').at(-1)}-${entrada.version}.tgz`);
    assert.match(entrada.integrity, /^sha512-/);
    assert.equal(entrada.dev, true, nombre);
    assert.equal(entrada.hasInstallScript, undefined, nombre);
  }
});
