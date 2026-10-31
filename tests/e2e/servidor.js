// Servidor estático mínimo para los E2E: sirve app/ en localhost, sin dependencias.
// Se usa de dos formas: como proceso del webServer de Playwright, y desde los
// tests de red (AC-12, AC-13), que arrancan uno propio para registrar todo lo
// que llega al origen.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../app/', import.meta.url));

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function leerCuerpo(peticion) {
  return new Promise((resolver, rechazar) => {
    const trozos = [];
    peticion.on('data', (t) => trozos.push(t));
    peticion.on('end', () => resolver(Buffer.concat(trozos)));
    peticion.on('error', rechazar);
  });
}

// `registro`, si se pasa, recibe cada petición tal como llega al servidor.
export function crearServidor(registro) {
  return createServer(async (peticion, respuesta) => {
    try {
      const cuerpo = await leerCuerpo(peticion);
      registro?.({
        metodo: peticion.method,
        url: peticion.url,
        cabeceras: peticion.rawHeaders,
        cuerpo: cuerpo.toString('utf8'),
      });
      const ruta = decodeURIComponent(new URL(peticion.url, 'http://localhost').pathname);
      const fichero = normalize(join(RAIZ, ruta.endsWith('/') ? ruta + 'index.html' : ruta));
      if (!fichero.startsWith(RAIZ) && fichero + sep !== RAIZ) {
        respuesta.writeHead(403).end();
        return;
      }
      const contenido = await readFile(fichero);
      respuesta.writeHead(200, {
        'Content-Type': TIPOS[extname(fichero)] ?? 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      respuesta.end(contenido);
    } catch (error) {
      respuesta.writeHead(error instanceof URIError ? 400 : 404).end();
    }
  });
}

// Arranca un servidor en un puerto libre y devuelve su URL base y cómo cerrarlo.
export function arrancar(registro) {
  const servidor = crearServidor(registro);
  return new Promise((resolver) => {
    servidor.listen(0, '127.0.0.1', () => {
      resolver({
        base: `http://127.0.0.1:${servidor.address().port}/`,
        cerrar: () => new Promise((r) => {
          servidor.closeAllConnections();
          servidor.close(r);
        }),
      });
    });
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const puerto = Number(process.env.PUERTO ?? 4791);
  crearServidor().listen(puerto, '127.0.0.1', () => {
    console.log(`Sirviendo ${RAIZ} en http://127.0.0.1:${puerto}/`);
  });
}
