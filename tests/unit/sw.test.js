// NFR-01: el service worker precarga todos los ficheros de la app, y solo esos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const APP = fileURLToPath(new URL('../../app/', import.meta.url));

test('la precarga del service worker coincide con los ficheros de app/', () => {
  const sw = readFileSync(`${APP}sw.js`, 'utf8');
  const lista = sw.match(/const FICHEROS = \[([^\]]*)\]/)[1];
  const precargados = [...lista.matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const ficheros = readdirSync(APP, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile())
    .map((d) => `${d.parentPath}/${d.name}`.slice(APP.length).replace(/^\//, ''))
    .filter((f) => f !== 'sw.js');
  assert.deepEqual([...precargados].sort(), ['./', ...ficheros].sort());
});

test('el service worker no llama a skipWaiting() ni a clients.claim()', () => {
  const sw = readFileSync(`${APP}sw.js`, 'utf8').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(sw, /skipWaiting\s*\(/);
  assert.doesNotMatch(sw, /clients\.claim\s*\(/);
});

test('la app no usa innerHTML ni recursos de terceros', () => {
  const ficheros = readdirSync(APP, { recursive: true })
    .filter((f) => /\.(js|html|css|webmanifest)$/.test(f));
  for (const f of ficheros) {
    const texto = readFileSync(`${APP}${f}`, 'utf8');
    assert.doesNotMatch(texto, /\.innerHTML\b|insertAdjacentHTML|outerHTML\s*=/, f);
    assert.doesNotMatch(texto, /(src|href)=["']?(https?:)?\/\//i, f);
  }
});
