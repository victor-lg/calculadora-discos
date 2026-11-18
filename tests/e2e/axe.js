// ADR-0007 §3.3, con ADR-0008: la única forma de analizar con axe en los E2E.
// Se llama con la página bajo prueba, después de comprobar su estado: al llegar
// y tras cada acción del usuario que cambia lo que se ve. Sin opciones ni otros
// métodos del builder, sin capturar sus errores y sin tocar la página para el
// análisis.
import { cpus } from 'node:os';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';
import { sinExcepcion, yaNoAparecen } from './excepciones-axe.js';

// ADR-0008 §3.1: el tiempo máximo de la espera, más del doble de la cadena de
// animaciones más larga de la app (unos 850 ms).
const ESPERA_MAXIMA_MS = 2000;

// Las animaciones en curso, solo leídas, para el mensaje si la espera se agota.
const animacionesEnCurso = () => document.getAnimations().map((a) => {
  const el = a.effect?.target;
  const { duration, iterations, fill } = a.effect?.getTiming() ?? {};
  return {
    tipo: a.constructor.name,
    nombre: a.animationName ?? a.transitionProperty ?? a.id,
    elemento: el ? `${el.localName}${el.id ? `#${el.id}` : ''}${[...el.classList].map((c) => `.${c}`).join('')}${a.effect.pseudoElement ?? ''}` : null,
    estado: a.playState,
    duracion: duration,
    iteraciones: iterations,
    fill,
  };
});

// ADR-0008 §5: la espera más larga de este proceso, solo en la salida del test.
// La CI la recoge como anotación del job (`::notice::`).
let esperaMasLarga = 0;

export async function analizarConAxe(page) {
  // ADR-0008 §3.1: se analiza sin animaciones en curso. La espera solo lee: a
  // media animación (por ejemplo, el fundido de entrada de una tarjeta,
  // SPEC-CALC-003 FR-10), axe mediría el texto a media opacidad, y el contraste
  // se exige en el estado estable (SPEC-CALC-003 v0.6, NFR-02).
  const inicio = Date.now();
  let conAnimaciones = 0;
  await expect.poll(async () => {
    const enCurso = await page.evaluate(animacionesEnCurso);
    if (enCurso.length) conAnimaciones += 1;
    return enCurso;
  }, {
    message: 'Se esperaba a que terminaran las animaciones antes de axe (ADR-0008 de la calculadora); siguen en curso',
    timeout: ESPERA_MAXIMA_MS,
    intervals: [50],
  }).toEqual([]);
  const espera = Date.now() - inicio;
  if (espera >= esperaMasLarga + 100) {
    esperaMasLarga = espera;
    const donde = `${test.info().project.name}, ${test.info().titlePath.join(' › ')}`.replaceAll('%', '%25');
    const procesos = `${test.info().config.workers} procesos, ${cpus().length} CPU`;
    console.log(`\n::notice::axe esperó ${espera} ms a las animaciones, ${conAnimaciones} sondeos con alguna en curso (${donde}; ${procesos})`);
  }
  const resultado = await new AxeBuilder({ page }).analyze();
  // Falla si queda una violación sin su excepción o si una excepción ya no aparece.
  expect({
    sinExcepcion: sinExcepcion(resultado.violations),
    yaNoAparecen: yaNoAparecen(resultado.passes),
  }).toEqual({ sinExcepcion: [], yaNoAparecen: [] });
}
