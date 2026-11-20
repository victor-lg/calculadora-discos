// Lectura de ficheros del repo por su ruta desde la raíz, para los tests que
// comprueban paquetes y copias (three.js, axe-core).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));

export const leerDeRaiz = (ruta) => readFileSync(`${RAIZ}${ruta}`);
