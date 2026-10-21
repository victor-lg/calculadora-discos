// Objetivos y discos de cada serie (FR-05, FR-06, FR-07, FR-09).
// Todo en centésimas de kg, como enteros.

export const DISCOS_CENT = [2500, 2000, 1500, 1000, 500, 250, 125];
const DISCO_MINIMO_CENT = 125;

// FR-05: peso de trabajo × porcentaje / 100, a dos decimales con la mitad hacia arriba.
export function objetivoCent(trabajoCent, porcentaje) {
  return Math.floor((trabajoCent * porcentaje + 50) / 100);
}

// FR-07: de mayor a menor, tantos de cada uno como quepan.
// `cent` es siempre múltiplo del disco mínimo.
export function repartirDiscos(cent) {
  const discos = [];
  let resto = cent;
  for (const disco of DISCOS_CENT) {
    while (resto >= disco) {
      discos.push(disco);
      resto -= disco;
    }
  }
  return discos;
}

// Calcula una serie. `modo` es 'barra', 'dos-lados' o 'un-punto';
// `barraCent` solo se usa en el modo Barra.
// Devuelve { minimo: true, objetivo } en los casos de FR-09, o
// { minimo: false, objetivo, cargado, discos, discosCent, diferencia }.
// `discos` y `discosCent` son por lado en Barra y Dos lados, y en el único
// punto en Un punto.
export function calcularSerie({ modo, barraCent, trabajoCent, porcentaje }) {
  const objetivo = objetivoCent(trabajoCent, porcentaje);
  let discosCent;
  let cargado;
  if (modo === 'un-punto') {
    discosCent = Math.floor(objetivo / DISCO_MINIMO_CENT) * DISCO_MINIMO_CENT;
    cargado = discosCent;
  } else {
    const base = modo === 'barra' ? barraCent : 0;
    // Mayor múltiplo de 1,25 kg por lado tal que base + 2 × lado ≤ objetivo.
    discosCent = objetivo < base
      ? 0
      : Math.floor((objetivo - base) / (2 * DISCO_MINIMO_CENT)) * DISCO_MINIMO_CENT;
    cargado = base + 2 * discosCent;
  }
  if (discosCent === 0) return { minimo: true, objetivo };
  return {
    minimo: false,
    objetivo,
    cargado,
    discos: repartirDiscos(discosCent),
    discosCent,
    diferencia: cargado - objetivo,
  };
}
