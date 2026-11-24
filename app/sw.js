// Prueba desechable de VIC-61: este PR no se fusiona.
// Service worker propio (ADR-0001 §3.3). Sirve primero desde la caché de su
// versión. Sin skipWaiting() ni clients.claim(): una versión nueva solo entra
// cuando no queda ninguna ventana de la app abierta, así que nunca cambia el
// código a mitad de un uso.

// El workflow de publicación sustituye este marcador por el SHA del commit.
const VERSION = '__VERSION__';
const PREFIJO = 'calculadora-discos-';
const CACHE = PREFIJO + VERSION;

const FICHEROS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/estilos.css',
  'js/app.js',
  'js/vista.js',
  'js/calculo.js',
  'js/entrada.js',
  'js/formato.js',
  'js/almacenamiento.js',
  'js/dibujo.js',
  'js/modelo3d.js',
  'vendor/three/three.module.min.js',
  'vendor/three/LICENSE',
  'iconos/icono-180.png',
  'iconos/icono-192.png',
  'iconos/icono-512.png',
  'fuentes/OFL.txt',
  'fuentes/barlow-latin-400-normal.woff2',
  'fuentes/barlow-latin-500-normal.woff2',
  'fuentes/barlow-latin-600-normal.woff2',
  'fuentes/barlow-semi-condensed-latin-500-normal.woff2',
  'fuentes/barlow-semi-condensed-latin-600-normal.woff2',
  'fuentes/barlow-semi-condensed-latin-700-normal.woff2',
  'fuentes/barlow-semi-condensed-latin-800-normal.woff2',
];

self.addEventListener('install', (event) => {
  // cache: 'reload' se salta la caché HTTP para no precargar ficheros viejos.
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(FICHEROS.map((url) => new Request(url, { cache: 'reload' })))),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nombres) => Promise.all(
      nombres
        .filter((n) => n.startsWith(PREFIJO) && n !== CACHE)
        .map((n) => caches.delete(n)),
    )),
  );
});

self.addEventListener('fetch', (event) => {
  // Solo responde a peticiones GET del propio origen (ADR-0001 §3.4).
  if (event.request.method !== 'GET') return;
  if (new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE)
      .then((cache) => cache.match(event.request))
      .then((respuesta) => respuesta || fetch(event.request)),
  );
});
