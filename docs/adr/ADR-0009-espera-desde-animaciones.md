---
id: ADR-0009
titulo: la espera antes de axe separa lo que tarda la página en responder de lo que duran las animaciones
estado: Propuesto         # Propuesto | Aceptado | Rechazado | Sustituido
fecha: 2026-11-19
sustituye: null
sustituido_por: null
modifica: ["ADR-0008 (§3, punto 1, «Tiempo máximo explícito, de 2 s» y «Fallo claro ante una animación que no termina»: la espera se hace en dos tiempos, una primera lectura con su propio tiempo máximo, de 10 s, y su mensaje, y los 2 s contados desde que vuelve una lectura con animaciones, con un mensaje que dice también si había una lectura en curso; §4 y §6: «el tiempo máximo» es el de 2 s del segundo tiempo, y una primera lectura de más de 2 s cuenta como cercana a un plazo de la app; §5: qué se mide y qué se exige antes de fusionar el #56)"]
referencias: ["ADR-0003", "ADR-0007", "ADR-0008", "SPEC-CALC-001", "SPEC-CALC-003", "VIC-31", "PR #56"]
---

<!--
Redactado por Claude (VIC-31), por decisión de Víctor en el PR #56: si, tras pasar AC-13 de
sin-conexion.spec.js a la vista sin dibujo y después probar un solo proceso de Playwright en la
CI, alguna espera sin animaciones seguía sin margen, proponer este ADR con la opción de contar
los 2 s desde la primera lectura que ve animaciones (aquí, la A). Víctor pidió después que la
primera lectura tuviera su propio tiempo máximo, con su mensaje, su medición y su criterio de
revisión. Cambia solo los puntos de la cabecera (`modifica`); el resto de ADR-0008 sigue
vigente y no se edita.
-->

# ADR-0009 — La espera antes de axe separa lo que tarda la página en responder de lo que duran las animaciones

## 1. Contexto

ADR-0008 §3, punto 1, fija una espera de solo lectura antes de `analyze()`, hasta que
`document.getAnimations()` esté vacío, con un tiempo máximo de 2 s que se pasa a la propia
espera. Los 2 s salen de las duraciones nominales: más del doble de la cadena de animaciones
más larga (unos 850 ms). Su §5 pide medir en la CI la espera más larga y, si no hay margen,
que la persona decida con un ADR nuevo.

La espera lee `getAnimations()` con `page.evaluate`, y su tiempo incluye lo que tarda cada
lectura en volver. En la CI del #56 la espera se ha agotado varias veces sin que volviera
ninguna lectura: el mensaje de ADR-0008 sale seguido de
`Timeout 2000ms exceeded while waiting on the predicate`, que es lo que da `expect.poll`
cuando no ha recibido ningún resultado [F1, F2]:

| CI del #56 | Qué cambiaba | Con animaciones (anotada) | Sin animaciones | Esperas agotadas sin lectura |
| --- | --- | --- | --- | --- |
| `336851d` | — (2 CPU) | 495 ms | 1223 ms | SPEC-CALC-001/AC-13 (Chromium) |
| `7e2a34f` | AC-13 sin dibujo (2 CPU) | 276 ms | 742 ms | AC-19 de `dibujo.spec.js` y AC-22 de `accesibilidad.spec.js`, en su `beforeEach` (línea 59) (Chromium) |
| `b4ace2a` | un proceso; el runner pasa a 4 CPU | 541 ms | 1331 ms | ninguna |
| `a7987f5` | AC-13 vuelve al 3D (ADR-0003) | 449 ms | 1436 ms | SPEC-CALC-001/AC-13 (Chromium) |

Las cifras son máximos por proceso, anotados solo cuando superan en 100 ms el anterior; no
son una distribución. Hasta `b4ace2a` había un solo máximo para las dos clases, así que la
columna «con animaciones» solo es la máxima de su clase en `a7987f5`. Las CPU salen de la
anotación desde `b4ace2a` y, antes, del baseline del #56 [F1]. De las esperas agotadas solo
se sabe que pasaron de 2 s. En WebKit no ha habido ninguna. En `7e2a34f`, además, AC-21 de
`accesibilidad.spec.js` (Chromium) agotó los 30 s del test en un `click`, esperando a que el
botón estuviera visible, habilitado y quieto, justo después de un análisis que había
pasado; no se sabe cuánto duró esa espera ni si tiene la misma causa.

Solo se agotan esperas de Chromium con el dibujo 3D, que en la CI se pinta por software. La
hipótesis es que el tiempo se va en que vuelva la lectura, no en las animaciones; por qué
tarda (la página ocupada pintando, el proceso de Playwright o el protocolo) no se sabe.
AC-13 de SPEC-CALC-001 no puede quedarse en la vista sin dibujo: ADR-0003 (tabla de
riesgos) cuenta con que vigile la red con three.js en uso. Sin decidir, el #56 no tiene la
CI en verde y no puede fusionarse.

## 2. Alternativas consideradas

### Opción A: separar la primera lectura del tiempo de las animaciones

- **Ventajas:** el tiempo máximo de 2 s vuelve a medir lo que ADR-0008 quería, cuánto
  duran las animaciones. Una animación que no termina sigue haciendo fallar el test a los
  2 s de verla. Cada fallo dice cuál de las dos cosas se agotó.
- **Inconvenientes:** la primera lectura necesita su propio tiempo máximo, que mide otra
  cosa (cuánto tarda en volver una lectura) y no tiene un techo conocido. Las lecturas del
  segundo tiempo siguen incluyendo ese retraso.
- **Riesgos:** que la cifra elegida para la primera lectura no baste (§6).

### Opción B: subir el tiempo máximo de 2 s

- **Ventajas:** un solo número; nada más cambia.
- **Inconvenientes:** alarga también el tiempo que se le da a una animación que no
  termina, por un motivo que no tiene que ver con ella. Como en A, la cifra sería una
  elección, no una medida; la diferencia es que en B esa elección afloja también el
  control de las animaciones.

### Opción C: quitar carga a la CI

- **Ventajas:** no cambia ADR-0008.
- **Inconvenientes:** pasar AC-13 a la vista sin dibujo choca con ADR-0003, y aun así no
  bastó en `7e2a34f`. AC-19 de `dibujo.spec.js` y AC-20 a AC-22 de `accesibilidad.spec.js`
  necesitan el 3D. Con un proceso y 4 CPU, `b4ace2a` pasó, pero con AC-13 sin dibujo; con
  AC-13 otra vez en 3D (`a7987f5`), falló. Las CPU del runner no las decide el proyecto.

### Opción D: medir las animaciones con el reloj de la página

Comparar, solo leyendo, el tiempo de cada animación con `document.timeline.currentTime`,
para que el retraso de las lecturas no cuente.

- **Ventajas:** el segundo tiempo dejaría de depender de lo que tarda cada lectura.
- **Inconvenientes:** cada lectura sigue necesitando volver, así que no quita el problema
  de la primera. Cambia más de ADR-0008 que A.

## 3. Decisión

**Opción A.** La espera de ADR-0008 §3, punto 1, se hace en dos tiempos, los dos solo
leyendo y sin capturar errores. Es la espera que admite ADR-0008 en su forma («la espera
del punto 1, y nada más»); el mecanismo lo elige el PR que la implementa.

1. **Primer tiempo: hasta que vuelva la primera lectura.** Los 10 s empiezan al empezar la
   espera y terminan cuando vuelve una lectura de `getAnimations()`. Son una constante con
   nombre en la función auxiliar, pasada al propio primer tiempo. Si la lectura vuelve sin
   animaciones, se analiza.
   - **Si una lectura falla con un error** (por ejemplo, porque la página se ha cerrado),
     el test falla con ese error, como hoy: no se captura ni se repite.
   - **Si se agota**, el test falla con un mensaje que cita «ADR-0009 de la calculadora» y
     dice que no se obtuvo ninguna lectura en 10 s. No se reintenta la espera ni se
     captura el error. Una lectura que siga en curso cuando se agota no cambia nada: solo
     lee, y el test ya ha fallado.
2. **Segundo tiempo: si la primera lectura vuelve con animaciones.** Se sigue leyendo,
   como en ADR-0008, hasta que no haya ninguna, con el tiempo máximo de 2 s de ADR-0008,
   **contado desde que vuelve esa primera lectura** y pasado a la propia espera.
   - **Si se agota**, el test falla con un mensaje que cita «ADR-0008 de la calculadora» y
     «ADR-0009 de la calculadora», muestra las animaciones de la última lectura que volvió
     y dice si había una lectura en curso al agotarse y cuánto llevaba esperando. Así se
     distingue una animación que no termina (las lecturas vuelven y siguen viéndola) de
     una lectura que no vuelve.

Lo demás de ADR-0008 §3, punto 1, no cambia: solo lee, no filtra, y una animación que no
termina hace fallar el test. En ADR-0008 §4 y §6, «el tiempo máximo» es ahora el de 2 s
del segundo tiempo; y como una primera lectura puede durar más que los plazos de la app
que los tests analizan (los 5 s del aviso de "Deshacer" y los 3 s de FR-15), una primera
lectura de más de 2 s se anota con su test (§5) y cuenta para el criterio de ADR-0008 §6
sobre los plazos.

**Los 10 s son una elección; ningún dato los acota.** De las primeras lecturas solo se sabe
que las que volvieron tardaron como mucho 1436 ms y que otras pasaron de 2 s, sin saber
cuánto. 10 s son 5 veces el tiempo máximo anterior y dejan al menos 20 s de los 30 s de un
test para el resto. Si AC-21 tuvo la misma causa, 10 s no le habrían bastado, pero el test
habría fallado a los 10 s con el mensaje de ADR-0009 en lugar de a los 30 s sin decir qué
pasó. Se revisan con la medición (§5) y el criterio de §6.

## 4. Consecuencias

- **Beneficios:** la CI sin GPU deja de fallar porque una lectura tarde unos segundos en
  volver, y el tiempo de 2 s vuelve a ser el de las animaciones. Cada fallo dice qué se
  agotó: la primera lectura (ADR-0009) o el segundo tiempo (ADR-0008), con o sin una
  lectura en curso.
- **Costes aceptados:**
  - Una primera lectura que tarda hasta 10 s pasa sin fallo.
  - Varias primeras lecturas lentas en un test, cada una por debajo de 10 s, pueden agotar
    los 30 s del test, y entonces el fallo es el del test, sin citar ningún ADR. Las
    lecturas de más de 2 s quedan anotadas con su test (§5).
  - Un estado con plazo puede caducar durante una primera lectura lenta. Lo detecta la
    comprobación posterior que exige ADR-0008, con un mensaje que parece un fallo de la
    app; la anotación de §5 lo liga a la lectura lenta.
  - Una animación finita pero más larga de lo debido puede terminar dentro de una primera
    lectura lenta y no llegar a verse. Antes fallaba a los 2 s. Solo pasa con lecturas
    lentas; en local o con lecturas rápidas se sigue viendo.
  - El segundo tiempo sigue incluyendo lo que tardan las lecturas: si las animaciones
    coinciden con lecturas lentas, se puede agotar igual. Sería un fallo de más, no un
    hueco, y su mensaje dice si había una lectura en curso.
  - El tiempo del job puede crecer hasta 10 s por análisis en el peor caso. Un trozo ya
    llegó a 12,2 min con tres fallos (`7e2a34f`); ADR-0007 §6 sigue pidiendo revisarlo si
    un trozo pasa de 12 min de forma habitual.
  - Las anotaciones solo se ven si alguien las mira: la revisión de §6 no salta sola.
- **Riesgos y mitigaciones:**

  | Riesgo | Mitigación |
  | --- | --- |
  | La primera lectura se acerca a los 10 s y el fallo se vuelve intermitente | §5 la anota aparte; §6 pide revisar a la mitad. |
  | Un fallo intermitente en el segundo tiempo | Su mensaje dice si había una lectura en curso; §5 anota el segundo tiempo aparte; §6. |
  | La causa del retraso no es la que se supone | No cambia la decisión, que no depende de ella; si la medición no la sostiene, §6. |

- **Impacto:** en el #56, `tests/e2e/axe.js` y su baseline. No cambia la app ni lo que
  comprueban los tests.

## 5. Validación

La medición de ADR-0008 §5 pasa a anotar, en la salida de los tests de la CI:

- por cada proceso de Playwright, la **primera lectura** más larga (desde que empieza la
  espera hasta que vuelve la primera lectura), haya visto animaciones o no;
- por cada proceso, el **segundo tiempo** más largo, desde que vuelve la primera lectura
  con animaciones hasta que no queda ninguna, con lo que tardó esa primera lectura;
- cada primera lectura de más de 2 s, con su test, aunque no sea la más larga.

Antes de fusionar el #56: **dos** ejecuciones completas de la CI en verde, en los dos
navegadores y con el 3D, y en su baseline, de las dos, la primera lectura más larga frente
a los 10 s y el segundo tiempo más largo frente a los 2 s, con sus márgenes. Dos
ejecuciones no prueban que no vaya a fallar; bastan para fusionar porque el criterio de §6
sigue vigilando después. Si en alguna la primera lectura pasa de 5 s, se aplica §6 antes
de fusionar.

## 6. Seguimiento

La persona decide, con un ADR nuevo si cambia la decisión:

- si la primera lectura más larga medida en la CI pasa de 5 s (la mitad de su tiempo
  máximo) o se agota alguna vez. Es un aviso de fallo cercano, no de deriva: una subida
  lenta por debajo de 5 s no lo dispara;
- si el segundo tiempo se agota en la CI con una lectura en curso;
- si falla un test (por un plazo de la app o por su tiempo máximo) con una primera lectura
  de más de 2 s anotada;
- si la CI pasa a tener GPU, o cambian las CPU del runner.

## 7. Fuentes

Consultadas el 2026-11-19.

- [F1] Anotaciones `::notice::` y de fallo de los jobs `e2e` del PR #56 en `336851d`,
  `7e2a34f`, `b4ace2a` y `a7987f5`, y su baseline (`docs/baseline-controles.md`, M27, en la
  rama del #56).
- [F2] `playwright` 1.65.0, `lib/matchers/expect.js` (`invokePollMatcher`): `expect.poll`
  no repite una lectura que lanza un error, y al agotarse muestra el último resultado si
  hubo alguno; si no, solo `Timeout … while waiting on the predicate`.
