// ADR-0007 §3.3, con ADR-0008 y ADR-0009: la única forma de analizar con axe en
// los E2E. Se llama con la página bajo prueba, después de comprobar su estado:
// al llegar y tras cada acción del usuario que cambia lo que se ve. Sin opciones
// ni otros métodos del builder, sin capturar sus errores y sin tocar la página
// para el análisis.
import { cpus } from 'node:os';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';
import { iso } from 'playwright-core/lib/coreBundle';
import { sinExcepcion, yaNoAparecen } from './excepciones-axe.js';

// ADR-0009 §3, primer tiempo: lo que puede tardar en volver la primera lectura.
// Una elección que ningún dato acota; se revisa si una pasa de 5 s, o de 7,5 s
// en SPEC-CALC-001/AC-13 (ADR-0009 §6, con ADR-0010).
const LECTURA_MAXIMA_MS = 10_000;
// ADR-0008 §3, punto 1, con ADR-0009: el tiempo máximo de las animaciones, más
// del doble de la cadena más larga de la app (unos 850 ms), contado desde que
// vuelve la primera lectura que las ve.
const ESPERA_MAXIMA_MS = 2000;
const INTERVALO_MS = 50;
// ADR-0009 §5: una primera lectura de más de 2 s se anota siempre, con su test.
const LECTURA_ANOTADA_MS = 2000;
// Como `expect`, la espera termina 250 ms antes que el tiempo máximo del test,
// para fallar con su propio mensaje y no con el del test.
const MARGEN_TEST_MS = 250;

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

// El reloj y el fin del tiempo máximo del test son los de Playwright, que no los
// publica: `iso.monotonicTime()` de playwright-core y `TestInfo._deadline()`,
// los mismos que usa `expect`. Playwright está fijado a una versión exacta
// (ADR-0007 §3.2); si dejan de existir, falla aquí.
// `finDelTest()` se llama antes que `ahora()`, para que, si faltan, el fallo lo
// diga. Si desaparece el export `iso`, falla antes, al importar este módulo.
const ahora = () => iso.monotonicTime();
function finDelTest() {
  const info = test.info();
  if (typeof info._deadline !== 'function' || typeof iso?.monotonicTime !== 'function') {
    throw new Error('La espera antes de axe (ADR-0009 de la calculadora) necesita TestInfo._deadline() e iso.monotonicTime() de Playwright, que esta versión no tiene');
  }
  return info._deadline().deadline - MARGEN_TEST_MS;
}

// Una lectura con plazo: lo que vuelve, o null si el plazo llega antes. Si la
// lectura falla, el error sube tal cual. Una lectura que vuelve o falla después
// del plazo ya no cuenta (ADR-0009 §3): Promise.race no la espera.
async function leer(page, hasta) {
  const inicio = ahora();
  let reloj;
  const plazo = new Promise((resolver) => { reloj = setTimeout(() => resolver(null), Math.max(0, hasta - inicio)); });
  const lectura = page.evaluate(animacionesEnCurso).then((enCurso) => ({ enCurso, ms: Math.round(ahora() - inicio) }));
  try {
    const leida = await Promise.race([lectura, plazo]);
    return leida ?? { enCurso: null, ms: Math.round(ahora() - inicio) };
  } finally {
    clearTimeout(reloj);
  }
}

const pausa = (ms) => new Promise((resolver) => { setTimeout(resolver, Math.max(0, ms)); });

// ADR-0009 §5: por proceso, la primera lectura más larga, el segundo tiempo más
// largo y el total más largo de las esperas con animaciones, solo en la salida
// del test. La CI los recoge como anotaciones del job (`::notice::`). Se
// escriben cuando superan en 100 ms el anterior de su clase, para no pasar del
// límite de anotaciones del job, así que el máximo real puede ser hasta 99 ms
// mayor que el último anotado. Cada primera lectura de más de 2 s se anota
// siempre, con su test, en cuanto vuelve (aunque el segundo tiempo falle).
const masLarga = { primera: 0, segundo: 0, total: 0 };

function anotar(texto) {
  const info = test.info();
  const donde = `${info.project.name}, ${info.titlePath.join(' › ')}`;
  const procesos = `${info.config.workers} procesos, ${cpus().length} CPU`;
  const linea = `${texto} (${donde}; ${procesos})`.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
  console.log(`\n::notice::${linea}`);
}

function medirPrimera(primera, conAnimaciones) {
  if (primera >= masLarga.primera + 100 || primera > LECTURA_ANOTADA_MS) {
    masLarga.primera = Math.max(masLarga.primera, primera);
    const mas = primera > LECTURA_ANOTADA_MS ? ' (más de 2 s)' : '';
    anotar(`axe: la primera lectura tardó ${primera} ms${mas}, ${conAnimaciones ? 'con' : 'sin'} animaciones`);
  }
}

function medirSegundo(primera, segundo, total, sondeos) {
  const texto = `${sondeos} lecturas con alguna animación; la primera lectura, ${primera} ms; el segundo tiempo, ${segundo} ms; en total, ${total} ms`;
  if (segundo >= masLarga.segundo + 100) {
    masLarga.segundo = segundo;
    anotar(`axe: segundo tiempo más largo: ${texto}`);
  }
  if (total >= masLarga.total + 100) {
    masLarga.total = total;
    anotar(`axe: espera con animaciones más larga: ${texto}`);
  }
}

export async function analizarConAxe(page) {
  // ADR-0008 §3, punto 1, con ADR-0009: se analiza sin animaciones en curso. La
  // espera solo lee: a media animación (por ejemplo, el fundido de entrada de
  // una tarjeta, SPEC-CALC-003 FR-10), axe mediría el texto a media opacidad, y
  // el contraste se exige en el estado estable (SPEC-CALC-003 v0.6, NFR-02).
  const finTest = finDelTest();
  const inicio = ahora();

  // Primer tiempo: hasta que vuelva la primera lectura.
  const hasta = Math.min(inicio + LECTURA_MAXIMA_MS, finTest);
  const primera = await leer(page, hasta);
  if (primera.enCurso === null) {
    const acortado = hasta < inicio + LECTURA_MAXIMA_MS ? '; lo acortó el tiempo máximo del test' : '';
    throw new Error(`No se obtuvo ninguna lectura de las animaciones antes de axe en ${primera.ms} ms, de los ${LECTURA_MAXIMA_MS} ms del primer tiempo (ADR-0009 de la calculadora)${acortado}`);
  }
  medirPrimera(primera.ms, primera.enCurso.length > 0);

  // Segundo tiempo: si la primera lectura vuelve con animaciones, se sigue
  // leyendo hasta que no haya ninguna, con 2 s desde que volvió. No se lanza
  // una lectura con menos de un intervalo por delante, así que en la práctica
  // dura algo menos de 2 s: falla antes, nunca deja pasar.
  if (primera.enCurso.length) {
    let sondeos = 1;
    const desde = ahora();
    const limite = Math.min(desde + ESPERA_MAXIMA_MS, finTest);
    let ultima = primera;
    let pendiente = null;
    while (ultima.enCurso.length) {
      if (ahora() + INTERVALO_MS >= limite) break;
      await pausa(INTERVALO_MS);
      if (limite - ahora() < INTERVALO_MS) break;
      const leida = await leer(page, limite);
      if (leida.enCurso === null) {
        pendiente = leida.ms;
        break;
      }
      ultima = leida;
      if (ultima.enCurso.length) sondeos += 1;
    }
    if (ultima.enCurso.length) {
      const esperado = Math.round(ahora() - desde);
      const acortado = limite < desde + ESPERA_MAXIMA_MS ? '; lo acortó el tiempo máximo del test' : '';
      const enVuelo = pendiente === null ? 'ninguna lectura en curso' : `una lectura en curso desde hace ${pendiente} ms`;
      throw new Error([
        'Se esperaba a que terminaran las animaciones antes de axe (ADR-0008 de la calculadora); siguen en curso.',
        `Segundo tiempo (ADR-0009 de la calculadora): ${esperado} ms de ${ESPERA_MAXIMA_MS} ms${acortado}; ${enVuelo}; la primera lectura tardó ${primera.ms} ms; la última que volvió, ${ultima.ms} ms, y vio:`,
        JSON.stringify(ultima.enCurso, null, 2),
      ].join('\n'));
    }
    const fin = ahora();
    medirSegundo(primera.ms, Math.round(fin - desde), Math.round(fin - inicio), sondeos);
  }

  const resultado = await new AxeBuilder({ page }).analyze();
  // Falla si queda una violación sin su excepción o si una excepción ya no aparece.
  expect({
    sinExcepcion: sinExcepcion(resultado.violations),
    yaNoAparecen: yaNoAparecen(resultado.passes),
  }).toEqual({ sinExcepcion: [], yaNoAparecen: [] });
}
