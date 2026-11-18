// ADR-0007 §3.3: la única forma de analizar con axe en los E2E. Se llama con la
// página bajo prueba, después de comprobar su estado: al llegar y tras cada
// acción del usuario que cambia lo que se ve. Sin opciones ni otros métodos
// del builder, sin capturar sus errores y sin tocar la página para el análisis.
import AxeBuilder from '@axe-core/playwright';
import { expect } from '@playwright/test';

// Excepciones escritas en una spec o en un ADR que nombran la regla de axe y
// el selector exacto: { regla, selector, cita }. Las generales de una spec no
// valen (por ejemplo, las de SPEC-CALC-003 NFR-02).
const EXCEPCIONES = [];

// La violación es de la regla de la excepción y todos sus nodos son el selector.
const coincide = (excepcion, violacion) => violacion.id === excepcion.regla
  && violacion.nodes.every((nodo) => nodo.target.length === 1 && nodo.target[0] === excepcion.selector);

export async function analizarConAxe(page) {
  const resultado = await new AxeBuilder({ page }).analyze();
  if (EXCEPCIONES.length === 0) {
    expect(resultado.violations).toEqual([]);
    return;
  }
  // Falla si queda una violación sin su excepción o si una excepción ya no aparece.
  expect({
    sinExcepcion: resultado.violations.filter((v) => !EXCEPCIONES.some((e) => coincide(e, v))),
    sinViolacion: EXCEPCIONES.filter((e) => !resultado.violations.some((v) => coincide(e, v))),
  }).toEqual({ sinExcepcion: [], sinViolacion: [] });
}
