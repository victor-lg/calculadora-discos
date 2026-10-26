// Datos guardados en el dispositivo (ADR-0002, ampliado por ADR-0004): la
// lista de porcentajes, el peso de trabajo, el peso de la recta, el de la Z y
// la opción de collarines (SPEC-CALC-001 FR-11), y los tipos de disco
// habilitados (SPEC-CALC-002 FR-08), cada uno en su propia entrada de localStorage.
import { esPorcentajeValido, analizarPeso, esPesoBarraValido } from './entrada.js';
import { DISCOS_CENT } from './calculo.js';

export const CLAVE_PORCENTAJES = 'calculadora-discos:v1:porcentajes';
export const PORCENTAJES_INICIALES = [40, 70, 90];
export const CLAVE_DISCOS = 'calculadora-discos:v1:discos';
export const CLAVE_TRABAJO = 'calculadora-discos:v1:trabajo';
export const CLAVES_BARRA = Object.freeze({
  recta: 'calculadora-discos:v1:peso-recta',
  z: 'calculadora-discos:v1:peso-z',
});
export const CLAVE_COLLARINES = 'calculadora-discos:v1:collarines';

// Lee y descodifica una entrada. Devuelve null si falta, no se puede leer o
// `esValido` la rechaza: cualquier fallo cuenta como "no se puede leer".
function leer(almacen, clave, esValido) {
  try {
    const crudo = almacen.getItem(clave);
    if (crudo === null) return null;
    const valor = JSON.parse(crudo);
    return esValido(valor) ? valor : null;
  } catch {
    return null;
  }
}

// Devuelve true si se ha guardado y false si no (SPEC-CALC-002 FR-09).
function guardar(almacen, clave, valor) {
  try {
    almacen.setItem(clave, JSON.stringify(valor));
    return true;
  } catch {
    return false;
  }
}

// Lo guardado solo es válido si es un array de enteros del 1 al 100, de tipo
// número. Si falta, no se puede leer o no es válido, se usa la lista inicial.
export function leerPorcentajes(almacen) {
  const lista = leer(almacen, CLAVE_PORCENTAJES, (v) => Array.isArray(v) && v.every(esPorcentajeValido));
  return lista ?? [...PORCENTAJES_INICIALES];
}

export function guardarPorcentajes(almacen, lista) {
  return guardar(almacen, CLAVE_PORCENTAJES, lista);
}

// SPEC-CALC-002 FR-08: se guardan los pesos en kg de los tipos habilitados.
const DISCOS_KG = DISCOS_CENT.map((cent) => cent / 100);

// Solo es válida una lista de números sin repetidos, cada uno el peso en kg de
// uno de los 7 tipos, en cualquier orden y quizá vacía. Si falta, no se puede
// leer o no es válida, se habilitan los 7. Se devuelve en centésimas, de mayor a menor.
export function leerDiscos(almacen) {
  const lista = leer(almacen, CLAVE_DISCOS, (v) => Array.isArray(v)
    && v.every((kg) => typeof kg === 'number' && DISCOS_KG.includes(kg))
    && new Set(v).size === v.length);
  if (lista === null) return [...DISCOS_CENT];
  return DISCOS_CENT.filter((cent) => lista.includes(cent / 100));
}

export function guardarDiscos(almacen, discos) {
  return guardar(almacen, CLAVE_DISCOS, discos.map((cent) => cent / 100));
}

// SPEC-CALC-001 FR-11: un peso de barra guardado, en kg, es válido si cumple
// FR-02: de 1 a 50 kg con dos decimales como máximo.
function centDeKg(kg) {
  if (typeof kg !== 'number') return null;
  const cent = Math.round(kg * 100);
  return cent / 100 === kg && esPesoBarraValido(cent) ? cent : null;
}

// SPEC-CALC-001 FR-11: el peso de trabajo, los pesos de la recta y de la Z y
// la opción de collarines, cada uno por separado. Solo trae los que están y son
// válidos; los demás toman su valor de la primera vez (vista.js, estadoInicial).
// El peso de trabajo se guarda como el texto escrito y es válido si cumple FR-03.
export function leerAjustes(almacen) {
  const ajustes = {};
  const trabajo = leer(almacen, CLAVE_TRABAJO, (v) => typeof v === 'string' && analizarPeso(v).estado === 'ok');
  if (trabajo !== null) ajustes.trabajo = trabajo;
  for (const [barra, clave] of Object.entries(CLAVES_BARRA)) {
    const kg = leer(almacen, clave, (v) => centDeKg(v) !== null);
    if (kg !== null) ajustes[barra] = centDeKg(kg);
  }
  const collarines = leer(almacen, CLAVE_COLLARINES, (v) => typeof v === 'boolean');
  if (collarines !== null) ajustes.collarines = collarines;
  return ajustes;
}

// SPEC-CALC-002 FR-09: guarda los datos que han cambiado de `anterior` a
// `nuevo` y anota en `guardados` el último valor que se guardó bien de cada uno.
// Si guardar falla, la app sigue con el valor en memoria. De los pesos solo se
// guarda el último válido (SPEC-CALC-001 FR-11).
export function guardarCambios(almacen, anterior, nuevo) {
  const guardados = { ...nuevo.guardados };
  if (nuevo.porcentajes !== anterior.porcentajes && guardarPorcentajes(almacen, nuevo.porcentajes)) {
    guardados.porcentajes = nuevo.porcentajes;
  }
  if (nuevo.discos !== anterior.discos && guardarDiscos(almacen, nuevo.discos)) {
    guardados.discos = nuevo.discos;
  }
  if (nuevo.trabajoValido !== anterior.trabajoValido && guardar(almacen, CLAVE_TRABAJO, nuevo.trabajoValido)) {
    guardados.trabajo = nuevo.trabajoValido;
  }
  for (const [barra, clave] of Object.entries(CLAVES_BARRA)) {
    const cent = nuevo.barraValida[barra];
    if (cent !== anterior.barraValida[barra] && guardar(almacen, clave, cent / 100)) guardados[barra] = cent;
  }
  if (nuevo.collarines !== anterior.collarines && guardar(almacen, CLAVE_COLLARINES, nuevo.collarines)) {
    guardados.collarines = nuevo.collarines;
  }
  return { ...nuevo, guardados };
}
