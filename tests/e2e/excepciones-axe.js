// ADR-0008 §3.3: la lista de excepciones de axe y su comparación, por nodo.
// Sin Playwright ni axe, para poder probarlas con un test unitario, que llega
// con la primera excepción.

// Excepciones escritas en una spec o en un ADR: { regla, selector, cita }. El
// selector es el `target` que da axe para un elemento con un id único (`#` y
// el id, escapado como lo escribe axe), copiado de su resultado. Las generales
// de una spec no valen (por ejemplo, las de SPEC-CALC-003 NFR-02).
const EXCEPCIONES = [];

// El nodo es de la regla de la excepción y su `target` es un solo elemento,
// exactamente el selector.
const cubre = (excepcion, regla, nodo) => excepcion.regla === regla
  && nodo.target.length === 1 && nodo.target[0] === excepcion.selector;

// Las violaciones que no pasan: sin nodos, o con algún nodo que ninguna
// excepción cubre.
export const sinExcepcion = (violaciones) => violaciones.filter((v) => v.nodes.length === 0
  || !v.nodes.every((nodo) => EXCEPCIONES.some((e) => cubre(e, v.id, nodo))));

// Las excepciones que ya no aparecen: axe evaluó su regla en su elemento y
// pasó (`passes`). Si no la evaluó, este análisis no dice nada de ella.
export const yaNoAparecen = (pasan) => EXCEPCIONES.filter((e) => pasan.some((p) => p.nodes.some((nodo) => cubre(e, p.id, nodo))));
