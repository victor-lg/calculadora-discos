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
  const prohibidas = /document\.cookie|cookieStore|sendBeacon|WebSocket|WebTransport|EventSource|XMLHttpRequest|RTCPeerConnection|importScripts|\bimport\s*\(/;
  const scripts = FICHEROS_DE_TEXTO.filter((f) => f.endsWith('.js'));
  assert.ok(scripts.length > 0);
  for (const f of scripts) {
    assert.doesNotMatch(readFileSync(`${APP}${f}`, 'utf8'), prohibidas, f);
  }
  // La interfaz no hace peticiones por su cuenta ni navega: solo el service
  // worker pide ficheros, y solo los de la app. `fetch` se prohíbe como palabra
  // para cubrir también el acceso indirecto (globalThis['fetch']), y los
  // nombres de elementos que cargan recursos, para cubrir createElement('img').
  const enInterfaz = /\bfetch\b|new\s+Image\b|new\s+Audio\b|\bWorker\s*\(|SharedWorker|window\.open|\blocation\s*\.|\blocation\s*=|pushState|replaceState|\.ping\b|\.(src|srcset|href|action|formAction|data|poster)\s*=|setAttribute\s*\(\s*['"`](src|srcset|href|action|formaction|data|poster|ping)['"`]/i;
  const elementosConRecursos = /['"`](img|image|script|iframe|frame|link|object|embed|audio|video|source|track|picture|a|form|base|meta|style|svg|use)['"`]/i;
  const interfaz = FICHEROS_DE_TEXTO.filter((f) => f.startsWith('js/'));
  assert.ok(interfaz.length > 0);
  for (const f of interfaz) {
    const texto = readFileSync(`${APP}${f}`, 'utf8');
    assert.doesNotMatch(texto, enInterfaz, f);
    assert.doesNotMatch(texto, elementosConRecursos, f);
  }
});

// SPEC-CALC-001/AC-13 (ADR-0001 §3.4): la única petición propia del service
// worker es reenviar la que recibe; la precarga usa la lista fija FICHEROS.
test('SPEC-CALC-001/AC-13 el service worker solo reenvía event.request', () => {
  const sw = readFileSync(`${APP}sw.js`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.equal(sw.match(/\bfetch\b/g)?.length, 2);
  assert.equal(sw.match(/addEventListener\('fetch',/g)?.length, 1);
  assert.equal(sw.match(/\bfetch\(event\.request\)/g)?.length, 1);
  assert.equal(sw.match(/\bnew\s+Request\s*\(/g)?.length, 1);
  assert.match(sw, /cache\.addAll\(FICHEROS\.map\(\(url\) => new Request\(url, \{ cache: 'reload' \}\)\)\)/);
  assert.doesNotMatch(sw, /importScripts|\bcache\.add\s*\(|\bcache\.put\s*\(/);
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
