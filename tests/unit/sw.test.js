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

const FICHEROS_DE_TEXTO = readdirSync(APP, { recursive: true })
  .filter((f) => /\.(js|html|css|webmanifest)$/.test(f));

test('la app no usa innerHTML ni recursos de terceros', () => {
  for (const f of FICHEROS_DE_TEXTO) {
    const texto = readFileSync(`${APP}${f}`, 'utf8');
    assert.doesNotMatch(texto, /\.innerHTML\b|insertAdjacentHTML|outerHTML\s*=/, f);
    // Ninguna URL absoluta ni relativa al protocolo, en ningún contexto.
    assert.doesNotMatch(texto, /[a-z][a-z0-9+.-]*:\/\/|["'(=\s]\/\/[a-z0-9]/i, f);
  }
});

// SPEC-CALC-001/AC-13 (NFR-02): la app no tiene otra vía para sacar datos.
test('SPEC-CALC-001/AC-13 la app no usa cookies ni otras API de red', () => {
  const prohibidas = /document\.cookie|cookieStore|sendBeacon|WebSocket|EventSource|XMLHttpRequest|RTCPeerConnection|\bimport\s*\(/;
  for (const f of FICHEROS_DE_TEXTO.filter((f) => f.endsWith('.js'))) {
    assert.doesNotMatch(readFileSync(`${APP}${f}`, 'utf8'), prohibidas, f);
  }
  // La interfaz no hace peticiones por su cuenta ni navega: solo el service
  // worker pide ficheros, y solo los de la app.
  const enInterfaz = /\bfetch\s*\(|new\s+Image\b|\bWorker\s*\(|SharedWorker|window\.open|\blocation\s*\.|\blocation\s*=|pushState|replaceState|\.ping\b/;
  for (const f of FICHEROS_DE_TEXTO.filter((f) => f.startsWith('js/'))) {
    assert.doesNotMatch(readFileSync(`${APP}${f}`, 'utf8'), enInterfaz, f);
  }
});

// ADR-0001 §3.3: el workflow de publicación sustituye este marcador por el SHA.
test('sw.js conserva el marcador de versión que sustituye la publicación', () => {
  const sw = readFileSync(`${APP}sw.js`, 'utf8');
  assert.equal(sw.match(/'__VERSION__'/g)?.length, 1);
  assert.match(sw, /^const VERSION = '__VERSION__';$/m);
});

// ADR-0001 §3.4: la CSP del documento, exacta y como primer elemento del head.
test('SPEC-CALC-001/AC-13 la CSP es la acordada y va la primera en el head', () => {
  const html = readFileSync(`${APP}index.html`, 'utf8');
  const head = html.match(/<head>\s*(<[^>]+>)/)[1];
  assert.equal(
    head,
    '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; connect-src \'self\'; '
      + 'script-src \'self\'; style-src \'self\'; img-src \'self\'; manifest-src \'self\'; '
      + 'worker-src \'self\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'">',
  );
  assert.equal(html.match(/Content-Security-Policy/g).length, 1);
});
