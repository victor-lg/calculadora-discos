// Objetivos y discos de cada serie (FR-05, FR-06, FR-07, FR-09; SPEC-CALC-002
// FR-03, FR-04, FR-05). Todo en centésimas de kg, como enteros.

// Los 7 tipos de disco, de mayor a menor (SPEC-CALC-002 FR-01).
export const DISCOS_CENT = [2500, 2000, 1500, 1000, 500, 250, 125];
// Todos los tipos son múltiplos de 1,25 kg: las combinaciones se buscan en esa unidad.
const UNIDAD_CENT = 125;

// FR-05: peso de trabajo × porcentaje / 100, a dos decimales con la mitad hacia arriba.
export function objetivoCent(trabajoCent, porcentaje) {
  return Math.floor((trabajoCent * porcentaje + 50) / 100);
}

// SPEC-CALC-002 FR-04: entre dos combinaciones del mismo peso, ordenadas de
// mayor a menor, gana la de menos discos y, si empatan, la que tiene el disco
// más grande, comparando uno a uno.
function mejor(a, b) {
  if (a.length !== b.length) return a.length < b.length ? a : b;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] > b[i] ? a : b;
  }
  return a;
}

// Para cada peso de 0 a `maxUnidades` (en unidades de 1,25 kg), la mejor
// combinación con los tipos dados, o null si no hay ninguna. La mejor de n se
// obtiene añadiendo un disco t a la mejor de n − t y quedándose con la mejor:
// si la óptima de n usa t como disco más grande, el resto es la óptima de n − t.
const tablas = new Map();
function tablaCombinaciones(tipos, maxUnidades) {
  const clave = tipos.join(',');
  const guardada = tablas.get(clave);
  if (guardada && guardada.length > maxUnidades) return guardada;
  const tabla = [[]];
  for (let n = 1; n <= maxUnidades; n++) {
    let elegida = null;
    for (const t of tipos) {
      const u = t / UNIDAD_CENT;
      if (u > n || tabla[n - u] === null) continue;
      const candidata = [...tabla[n - u], t].sort((x, y) => y - x);
      elegida = elegida ? mejor(elegida, candidata) : candidata;
    }
    tabla.push(elegida);
  }
  tablas.set(clave, tabla);
  return tabla;
}

// Mayor peso cargable con los tipos dados que no supera `maxCent`, con su
// combinación de discos de mayor a menor. Devuelve [] si no cabe ninguno.
export function repartirDiscos(maxCent, tipos = DISCOS_CENT) {
  const maxUnidades = Math.max(0, Math.floor(maxCent / UNIDAD_CENT));
  const tabla = tablaCombinaciones(tipos, maxUnidades);
  for (let n = maxUnidades; n > 0; n--) {
    if (tabla[n] !== null) return [...tabla[n]];
  }
  return [];
}

// Calcula una serie. `modo` es 'barra', 'dos-lados' o 'un-punto';
// `barraCent` solo se usa en el modo Barra; `tipos` son los tipos habilitados,
// de mayor a menor y al menos uno (sin ninguno no hay series, SPEC-CALC-002 FR-06).
// Devuelve { minimo: true, objetivo } en los casos de FR-09, o
// { minimo: false, objetivo, cargado, discos, discosCent, diferencia }.
// `discos` y `discosCent` son por lado en Barra y Dos lados, y en el único
// punto en Un punto.
export function calcularSerie({ modo, barraCent, trabajoCent, porcentaje, tipos = DISCOS_CENT }) {
  const objetivo = objetivoCent(trabajoCent, porcentaje);
  const base = modo === 'barra' ? barraCent : 0;
  const lados = modo === 'un-punto' ? 1 : 2;
  // Peso de discos máximo de cada lado (o del único punto) sin pasar del objetivo.
  const maxCent = objetivo < base ? 0 : Math.floor((objetivo - base) / lados);
  const discos = repartirDiscos(maxCent, tipos);
  // FR-09: no cabe ni el tipo habilitado más pequeño (SPEC-CALC-002 FR-05).
  if (discos.length === 0) return { minimo: true, objetivo };
  const discosCent = discos.reduce((a, b) => a + b, 0);
  const cargado = base + lados * discosCent;
  return {
    minimo: false,
    objetivo,
    cargado,
    discos,
    discosCent,
    diferencia: cargado - objetivo,
  };
}
