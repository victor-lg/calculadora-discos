// Servidor estático mínimo para los E2E: sirve app/ en localhost, sin dependencias.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../app/', import.meta.url));
const PUERTO = Number(process.env.PUERTO ?? 4173);

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
};

createServer(async (peticion, respuesta) => {
  const ruta = decodeURIComponent(new URL(peticion.url, 'http://localhost').pathname);
  const fichero = normalize(join(RAIZ, ruta.endsWith('/') ? ruta + 'index.html' : ruta));
  if (!fichero.startsWith(RAIZ) && fichero + sep !== RAIZ) {
    respuesta.writeHead(403).end();
    return;
  }
  try {
    const cuerpo = await readFile(fichero);
    respuesta.writeHead(200, {
      'Content-Type': TIPOS[extname(fichero)] ?? 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    respuesta.end(cuerpo);
  } catch {
    respuesta.writeHead(404).end();
  }
}).listen(PUERTO, '127.0.0.1', () => {
  console.log(`Sirviendo ${RAIZ} en http://127.0.0.1:${PUERTO}/`);
});
