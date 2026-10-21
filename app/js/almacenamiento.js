// FR-11: la lista de porcentajes se guarda en el dispositivo (ADR-0001 §3.2).
import { esPorcentajeValido } from './entrada.js';

export const CLAVE_PORCENTAJES = 'calculadora-discos:v1:porcentajes';
export const PORCENTAJES_INICIALES = [40, 70, 90];

// Lo guardado solo es válido si es un array de enteros del 1 al 99, de tipo
// número. Si falta, no se puede leer o no es válido, se usa la lista inicial.
export function leerPorcentajes(almacen) {
  try {
    const crudo = almacen.getItem(CLAVE_PORCENTAJES);
    if (crudo === null) return [...PORCENTAJES_INICIALES];
    const lista = JSON.parse(crudo);
    if (Array.isArray(lista) && lista.every(esPorcentajeValido)) return lista;
  } catch {
    // Cualquier fallo cuenta como "no se puede leer".
  }
  return [...PORCENTAJES_INICIALES];
}

// Guardar es una mejora: si falla, la app sigue funcionando con la lista en memoria.
export function guardarPorcentajes(almacen, lista) {
  try {
    almacen.setItem(CLAVE_PORCENTAJES, JSON.stringify(lista));
  } catch {
    // Sin almacenamiento disponible: la lista vive solo en memoria.
  }
}
