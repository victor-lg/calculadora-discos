# Baseline de los controles de la plantilla

Lo heredado que rechaza o señala un check de la plantilla del workflow SDD + IA y que se
queda como está, de momento. Es una lista para personas: **ningún check lee este fichero
y ninguno se relaja por él**. Si un PR toca uno de estos ficheros, el check salta igual y
el PR lo corrige o lo explica.

Se comprobó con el `checks.py` de `plantilla-proyecto` en `main` de `sdd-workflow`
(commit `7bb2a74`, 2026-11-14), con sus funciones aplicadas a todos los ADR y specs de
`main` de la calculadora (commit `3b0b1bf`). La estructura de las specs (`specs`) pasa
sin errores.

## M7: referencias sin comillas en la cabecera YAML de los ADR (`adr`, error)

Los cinco ADR escriben las listas `modifica` y `referencias` sin comillas. En YAML, un
`#` sin comillas empieza un comentario, así que `PR #20` se lee como `PR`, y una coma
dentro de un paréntesis parte la referencia en dos.

| ADR | Lo que el check lee mal |
| --- | --- |
| `docs/adr/ADR-0001-tecnologia-pwa.md` | `SPEC-CALC-001`, `docs/vision.md`, `PR` |
| `docs/adr/ADR-0002-datos-guardados.md` | `ADR-0001 (§3.2)`, `ADR-0001`, `SPEC-CALC-001`, `SPEC-CALC-002`, `VIC-8`, `PR` |
| `docs/adr/ADR-0003-dibujo-3d.md` | `ADR-0001 (§3.1)`, `ADR-0001`, `SPEC-CALC-003`, `SPEC-CALC-001`, `VIC-9`, `PR` |
| `docs/adr/ADR-0004-mas-datos-guardados.md` | `ADR-0002 (§3.1)`, `ADR-0001`, `ADR-0002`, `SPEC-CALC-001`, `SPEC-CALC-002`, `VIC-9`, `PR` |
| `docs/adr/ADR-0005-guardar-al-terminar-de-editar.md` | `ADR-0004 (§3`, `último párrafo; §4`, `segundo coste aceptado)`, `ADR-0001`, `ADR-0002`, `ADR-0004`, `SPEC-CALC-001`, `SPEC-CALC-002`, `VIC-13`, `PR` |

**Cuándo salta:** solo en un PR que cambie ese ADR; el check mira los ADR que cambian,
no todos.

**Por qué no se corrige aquí:** los ADR son normativos (`/docs/adr/` en CODEOWNERS) y
VIC-24 no puede tocarlos. El PR que cambie un ADR pone sus referencias entre comillas.

## M39: historial en la cabecera de las specs (`historial`, solo aviso)

Las tres specs llevan, en el comentario que va tras el frontmatter, el historial de sus
versiones: rondas de revisión, versiones anteriores, referencias a PR y fechas.

- `docs/specs/SPEC-CALC-001-series-calentamiento.md`
- `docs/specs/SPEC-CALC-002-inventario-discos.md`
- `docs/specs/SPEC-CALC-003-presentacion.md`

**Cuándo salta:** en un PR que cambie esa spec, como aviso. No bloquea.

**Por qué no se corrige aquí:** cambiar una spec va en su propio PR, y VIC-24 no toca
specs.

## M11: convenciones de nombres antiguas (`convenciones`, `commits` y `autoria`, error)

Dos ficheros que guían a las personas y al agente siguen la convención anterior a M11.
Quien la siga hará un PR que los checks de la plantilla rechazan:

- `.github/pull_request_template.md`: pone el ID como alcance del título
  (`feat(VIC-5): …`) y empieza la descripción por `Issue de Linear: <ID>`. La plantilla
  pide el alcance como zona (`feat(calculo): …`) y que la descripción empiece por
  `Fixes`, `Part of` o `Refs VIC-N`.
- `AGENTS.md`: pone el ID como alcance del título, nombra las ramas `vic-N-…`, `ci-…`…
  en lugar de `<tipo>/vic-N-…`, y pide `Co-Authored-By` del agente en los commits, que
  el check `autoria` rechaza (ADR-0007 del workflow). Tampoco pide el pie
  `Refs: VIC-N` en los commits.

**Cuándo salta:** en cualquier PR que siga estos ficheros al pie de la letra.

**Por qué no se corrige aquí:** los dos ficheros son de configuración del agente y de
GitHub (R2) y están fuera de los ficheros permitidos de VIC-24. Su puesta al día va a
otra issue.

## M26 y M23: controles de calidad (`calidad.yml`)

Llegaron con VIC-27 (#48): el `calidad.yml` de la plantilla, con los jobs `mutaciones`
(Stryker), `codigo-sobrante` (knip) y `duplicados` (jscpd), cada uno con la configuración
de `main`. Medido en la CI del #48 y en local; las cifras de la CI son de una ejecución.

### `mutaciones` (Stryker)

- **Configuración** (`stryker.config.json`): runner `tap` de Stryker, que solo lanza los
  ficheros de test que pasan por cada mutante, y 3 procesos (`concurrency`), con la espera
  por mutante por defecto (`timeoutMS` 5000, `timeoutFactor` 1,5). Con el runner
  `command` cada mutante lanzaba todos los unitarios y el job se canceló a los 30 minutos
  (`timeout-minutes`), con 2 procesos y 6,4 s por ejecución (run 43879302616). Umbral
  `break` 90: la menor puntuación medida (92,68, en local) menos 2, redondeado hacia abajo.
- **Qué muta:** los cinco módulos que importan los tests unitarios: `almacenamiento.js`,
  `calculo.js`, `entrada.js`, `formato.js` y `vista.js`.
- **Qué queda fuera, como hallazgo:** `app/js/app.js`, `app/js/dibujo.js` y
  `app/js/modelo3d.js` solo los cubren los E2E, que Stryker no lanza: mutarlos daría
  mutantes sin cubrir. `app/sw.js` tampoco se muta: su test (`tests/unit/sw.test.js`) lo
  lee como texto, no lo ejecuta. Para que entren hacen falta tests unitarios de esos
  módulos (otra issue).
- **Tests que Stryker no lanza:** `tests/unit/sw.test.js`. Lee el código de `app/js/` como
  texto y busca API prohibidas; el código instrumentado por Stryker lleva construcciones
  que el test rechaza y falla siempre. Sigue corriendo en el job `tests`.
- **`disableTypeChecks: false`:** sin él, Stryker añade `// @ts-nocheck` a todos los `.js`
  de su copia de trabajo, también a `app/vendor/three/`, y falla el test que comprueba que
  la copia de three.js es idéntica a la del paquete (ADR-0003 §3.3).
- **Mediciones** (runner `tap`, los 842 mutantes; cada fila, una ejecución):

  | Dónde | Procesos | Job | Muertos | Por tiempo | Supervivientes | Con error | Puntuación |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | Local | 2 | 5 min 55 s | 728 | 6 | 58 | 50 | 92,68 |
  | Local | 4 | 3 min 5 s | 728 | 6 | 58 | 50 | 92,68 |
  | Local, `timeoutMS` 15000 | 4 | 3 min 50 s | 728 | 6 | 58 | 50 | 92,68 |
  | Local, configuración final | 3 | 4 min 19 s | 728 | 6 | 58 | 50 | 92,68 |
  | CI (run 43890811680) | 2 | 20 min 29 s | 711 | 41 | 40 | 50 | 94,95 |
  | CI (run 43896837699) | 4 | 11 min 47 s | 643 | 135 | 14 | 50 | 98,23 |
  | CI (run 43905675262), `timeoutMS` 15000 | 4 | 17 min 40 s | 644 | 130 | 18 | 50 | 97,73 |
  | CI (run 43909150386) | 3 | 13 min 14 s | 647 | 122 | 23 | 50 | 97,10 |
  | CI (run 43913962175), configuración final | 3 | 12 min 45 s | 644 | 129 | 19 | 50 | 97,60 |
  | CI (run 43919204327), configuración final | 3 | 9 min 55 s | 658 | 109 | 25 | 50 | 96,84 |

  En local, los 58 supervivientes: 21 en `vista.js`, 19 en `calculo.js`, 13 en
  `almacenamiento.js` y 5 en `entrada.js`.
- **La puntuación varía con el runner, por los mutantes por tiempo.** Stryker da por
  detectado un mutante que agota su tiempo. En local acaban así 6, con 2, 3 o 4
  procesos; en el runner de la CI, entre 41 y 135 según la configuración (con la final,
  entre 109 y 129 en tres ejecuciones), y con ellos
  hasta 44 de los 58 que en local sobreviven cuentan como detectados. Por eso la
  puntuación de la CI es más alta que la real y el umbral se fija sobre la de local. La
  consecuencia: en la CI el check está casi ciego, porque un test debilitado puede no
  notarse si sus mutantes acaban por tiempo.
- **Lo que se probó para acercar la CI a local, sin conseguirlo** (VIC-27): subir la
  espera por mutante de 5 a 15 s apenas cambia nada (de 135 a 130 por tiempo) y alarga el
  job casi 6 minutos; bajar a 3 procesos deja 122. Solo con 2 procesos bajan a 41, pero
  el job tarda más de 20 minutos. Que más espera no los recupere apunta a que no son
  ejecuciones algo más lentas, sino procesos que en el runner no terminan: la causa está
  sin averiguar y la investiga VIC-29. Una pista para VIC-29 (G4 del #48, sin medir): el
  repo es privado, y en los repos privados el runner `ubuntu-latest` tiene 2 vCPU, no 4;
  con 3 o 4 procesos de Stryker más el principal, la CPU va sobrecargada.
- **Decisión** (Víctor, 2026-11-16): se queda con 3 procesos, la espera por defecto y
  `break` 90, sabiendo que en la CI el check está casi ciego. `mutaciones` corre en cada PR
  pero **no pasa a check requerido** en la regla de `main` hasta cerrar VIC-29. Mientras,
  sus fallos se miran, pero su verde no prueba que los tests detecten los mutantes.
  La cabecera de `calidad.yml` dice que el nombre de cada job es el check que se marca
  como requerido: en la calculadora, para `mutaciones`, todavía no.
- **Ficheros de test:** Stryker lanza `tests/unit/**/!(sw).test.js`, los mismos que
  `npm test` salvo `sw.test.js`, también en subcarpetas.
- **Los 50 con error:** el proceso de `tests/unit/series.test.js` sale con el código 7 en
  lugar de fallar un test, y el runner `tap` da por error cualquier salida distinta de 0 sin
  ningún test fallido (`tap-helper.js` de `@stryker-mutator/tap-runner`). Con el runner `command` esos mismos mutantes contaban como
  detectados y la puntuación local era 93,11. Con el error no cuentan en la puntuación.

### `codigo-sobrante` (knip)

- **Configuración** (`knip.json`): la de la plantilla, con los 18 tipos en `"warn"`, más
  `entry` (`app/js/app.js`, que carga `app/index.html`, y `app/sw.js`, que `app.js`
  registra como service worker) e `ignore` de `app/vendor/**`. Sin `entry`, knip daba por
  sobrante casi toda la app; sin `ignore`, unos 390 exports de three.js.
- **Resultado:** salida 0 (todo en `"warn"`); job de 12 a 14 s.
- **Avisos** (5, run 43913962175; con el runner `command` salía uno más,
  `@stryker-mutator/command-runner`, que el plugin de Stryker de knip deducía de él):
  - `three`, dependencia sin usar: la app usa la copia de `app/vendor/three/`, y el
    paquete solo está para comprobar que la copia es idéntica (ADR-0003 §3.2 y §3.3). No
    es código que sobre.
  - Cuatro exports que nadie importa: `PORCENTAJES_INICIALES` (`almacenamiento.js`) y
    `PESO_MAXIMO_CENT`, `BARRA_MINIMA_CENT` y `BARRA_MAXIMA_CENT` (`entrada.js`).
- **Pasar a `"error"`:** cuando estén resueltos (otra issue). Antes, dos límites que hoy no
  importan porque todo está en `"warn"` (G4 del #48; los dos figuran como límites aceptados
  en `docs/herramientas.md` del workflow):
  - knip carga y ejecuta `playwright.config.js` de la rama (su plugin de Playwright se activa
    con `@playwright/test`), y ese fichero no es R2: con una regla en `"error"`, una rama
    podría decidir el resultado del job. Se cierra desactivando ese plugin en `knip.json`
    (`"playwright": false`) o haciendo R2 su configuración;
  - las etiquetas JSDoc `@public`, `@beta` y `@alias` sacan un export del informe, y nada
    las detecta en la CI, a diferencia de los silenciadores de Stryker y jscpd.

### `duplicados` (jscpd)

- **Configuración** (`.jscpd.json`): la de la plantilla, tal cual (ignora el Markdown y los
  `package-lock.json`).
- **Clones heredados** (run 43879302616): 49 ficheros, 13 682 líneas, 40 clones, 4,28 %
  de líneas duplicadas. La mayoría, entre los E2E (`tests/e2e/`) y entre las dos maquetas
  de `docs/diseno/`. No cuentan: el job solo falla con clones que no están en `main`.
  Informe de salud: E, 32/100.
- **Tiempo:** 0,2 s de análisis; job de 6 a 7 s.
- **El #48 falla en este job:** su único clon nuevo está dentro del propio `calidad.yml`
  (líneas 59–65 y 158–164), que no está en `main`. Al fusionarse pasa a ser heredado.
  Le pasará a cualquier proyecto que adopte `calidad.yml`; se corrige en la plantilla
  (VIC-28).

## M6: contenedor de Playwright por digest y job `versiones` (`tests.yml`)

Llegó con VIC-31 (#53): el `tests.yml` del ejemplo del workflow (sdd-workflow#47), con
Playwright 1.65.0 y su imagen `mcr.microsoft.com/playwright:v1.65.0-noble` fijada por el
digest de su índice (`sha256:9beb5460…4e73dbe`). Sustituye al #42 de Dependabot, que subía
el paquete sin la imagen.

- **La imagen arranca** (pendiente desde sdd-workflow#47): los tres trozos pasan dentro de
  ella con Chromium y WebKit (runs 44162310687 y 44164892525). Con el paquete subido y la
  imagen aún en 1.64.1, los tres fallaron (run 44152968157), como se esperaba.
- **El digest:** lo leyó Víctor del registro el 2026-11-17 (sdd-workflow#47). `versiones`
  compara la etiqueta escrita junto al digest, no lo que el digest contiene. Lo que confirma
  que el digest es de 1.65.0 son los E2E en verde: Playwright 1.65.0 no encuentra sus
  navegadores en una imagen de otra versión, como se vio con la 1.64.1.
- **La imagen ya no está escrita en `container.image`:** la lee de la salida de
  `versiones`, para que esté escrita en un solo sitio. Un escáner de workflows que busque
  imágenes sin digest ya no la ve; el formato con digest lo exige el script de
  `versiones`. Se acepta ese coste.
- **`versiones`:** de 6 a 7 s. En local, su script da salida 0 con el lockfile de 1.65.0 y
  salida 1 con el de 1.64.1, con el mensaje que pide subir la imagen.
- **Tiempos** (el job entero y, entre paréntesis, su paso "Initialize containers", que
  descarga la imagen):

  | Trozo | 1.64.1 (run 43938296852) | 1.65.0 (run 44162310687) | 1.65.0 (run 44164892525) |
  | --- | --- | --- | --- |
  | 1/3 | 549 s (imagen 29 s) | 523 s (imagen 45 s) | 626 s |
  | 2/3 | 324 s (imagen 25 s) | 331 s (imagen 30 s) | 252 s |
  | 3/3 | 267 s (imagen 42 s) | 291 s (imagen 43 s) | 325 s |

  El trozo 1 tarda de 9 a 10,5 minutos, unos dos tercios de su límite de 15.
- **`test.skip()` en 1.65:** sus notas dicen que ahora solo acepta una descripción. Las dos
  formas con condición del repo siguen saltando lo mismo:
  - en local, con 1.65.0, un fichero de prueba con la forma de `sin-conexion.spec.js` (a
    nivel de fichero, con una función) y otro con la de `referencia-visual.spec.js`
    (dentro del test, con una condición): cada uno se salta en el navegador que debe y
    corre en el otro (2 passed, 2 skipped);
  - `npx playwright test --list` da 141 tests por proyecto (Chromium y WebKit), con 1.64.1
    y con 1.65.0.

  No se pudo leer cuántos tests salta cada trozo en la CI: el sandbox del agente no llega
  al almacén de los logs de Actions.

## M27: axe en los E2E (ADR-0007 y ADR-0008)

Llegó con VIC-31 (#56): `@axe-core/playwright` 4.14.0, con `axe-core` 4.14.0 y
`playwright-core` 1.65.0 en `overrides`, la función auxiliar `tests/e2e/axe.js` y el
módulo de excepciones `tests/e2e/excepciones-axe.js`, con la lista vacía. La función la
llaman todos los `*.spec.js` de `tests/e2e/`, en los dos proyectos: al llegar y tras cada
estado que el test comprueba después de una acción que cambia lo que se ve (327 llamadas
en el código).

- **Violaciones previas:** una, y no queda en la app. `color-contrast` en la tarjeta
  recién añadida mientras dura su fundido de entrada (SPEC-CALC-003 FR-10, 240 ms): axe
  medía el texto a media opacidad (contraste de 1,14 a 2,06). Salió con el dibujo 3D, en
  Chromium y en WebKit (`dibujo.spec.js` AC-09 y `accesibilidad.spec.js` AC-22). Fuera del
  fundido no hay violación, y NFR-02 se aplica al estado estable (SPEC-CALC-003 v0.6). Por ADR-0008 §3.1, la función auxiliar espera, solo leyendo y
  como mucho 2 s (`ESPERA_MAXIMA_MS`), a que `document.getAnimations()` esté vacío antes de
  analizar. Si se agota, el test falla con un mensaje que cita «ADR-0008 de la
  calculadora» y muestra las animaciones en curso.
- **Reloj parado (ADR-0008 §3.2):** con `page.clock.pauseAt`, `analyze()` se cuelga hasta
  el timeout en los dos navegadores (axe usa los temporizadores de la página). En los tests
  con el reloj parado (11 de `anadir-borrar.spec.js` y 8 de `dibujo.spec.js`) se analiza
  hasta pararlo: en el `beforeEach`, tras cada serie que quita el `pararReloj` de
  `dibujo.spec.js` y en los dos `pararReloj`, tras la recarga con el reloj ya instalado (así
  axe sí funciona). Los dos `pararReloj` citan el ADR y nombran los tests con tiempo real
  que analizan lo que se ve con el reloj parado: el aviso de "Deshacer", el foco, el campo
  de añadir con su error, los paneles y el dibujo. Para el dibujo animándose, el recorrido
  con el dibujo de `dibujo.spec.js` analiza en cuanto empieza la animación (con
  `data-animando`). Las tarjetas que salen no se analizan, ni con tiempo real (la espera
  llega cuando ya no están) ni con el reloj parado: es el hueco de ADR-0008 §3.1. Su
  contenido se analiza antes de quitarlas.
- **Plazos reales (ADR-0008 §3.1):** donde el aviso de "Deshacer" (5 s) tiene que seguir
  visible para el paso siguiente, el análisis va después de ese paso. Donde se analiza con
  el aviso comprobado, el test lo vuelve a comprobar después del análisis, para fallar si
  caducó durante la espera o el análisis.
- **Excepciones (ADR-0008 §3.3):** la lista y la comparación están en
  `excepciones-axe.js`, sin Playwright ni axe. Un nodo está cubierto si su regla y su
  `target`, de un solo elemento, son los de una excepción; una violación sin nodos no pasa.
  Una excepción "ya no aparece" si su regla pasa en su elemento (`passes`). Con la lista
  vacía no hay test unitario: llega con la primera excepción.
- **Espera más larga (ADR-0008 §5):** cada proceso de Playwright escribe en la salida del
  test, como `::notice::`, cada espera que supera en 100 ms su máxima anterior, con los
  sondeos que vieron alguna animación; la CI la recoge como anotación del job. En local,
  con el Chromium de 1.64, la más larga fue de 1110 ms en `dibujo.spec.js` (AC-19, al pasar a la vista
  sin dibujo), y no por las animaciones: el primer sondeo ya las encontraba vacías, pero
  `page.evaluate` tardaba en volver con la página ocupada. En la CI de `336851d`, con AC-13
  de `sin-conexion.spec.js` aún con el 3D: la más larga con animaciones, 495 ms (Chromium,
  6 sondeos con alguna; en WebKit, 298 ms); sin ninguna, 1223 ms (Chromium, AC-19 de
  `dibujo.spec.js`). En AC-13, Chromium, la primera lectura no volvió en 2 s y el test
  falló (`Timeout 2000ms exceeded while waiting on the predicate`, sin animaciones que
  mostrar): no había margen. **Decisión de Víctor:** AC-13 a la vista sin dibujo; si
  entonces todas las esperas sin animaciones quedan por debajo de 1,5 s, se sigue; si no,
  un ADR-0009 que cuente los 2 s desde la primera lectura que ve animaciones. En la CI de
  `7e2a34f`, con AC-13 ya sin dibujo, no bastó: con animaciones, como mucho 276 ms; sin
  ninguna, 742 ms, y dos primeras lecturas que no volvieron en 2 s (Chromium, AC-19 de
  `dibujo.spec.js` y el `beforeEach` de `accesibilidad.spec.js`). Además, AC-21 de
  `accesibilidad.spec.js` agotó los 30 s del test esperando a que «+ Añadir porcentaje»
  estuviera quieto. **Experimento de Víctor:** un solo proceso de Playwright en la CI
  (`workers: 1` en `playwright.config.js`), por si era contención de CPU; la anotación
  dice cuántos procesos y CPU ve el runner. En la CI de `b4ace2a` pasan los tres trozos,
  AC-21 incluido. Con animaciones, como mucho 541 ms (Chromium, AC-22, 6 sondeos con
  alguna; en WebKit, 299 ms); sin ninguna, 1331 ms (Chromium, AC-19 de `dibujo.spec.js`):
  por debajo de 1,5 s, así que no hace falta el ADR-0009. El margen es corto (169 ms) y es
  una sola ejecución. Y el experimento no aísla la causa: entre `7e2a34f` y `b4ace2a` el
  repo pasó a ser público y el runner, de 2 a 4 CPU. Con 2 CPU, Playwright ya usaba un
  proceso por defecto (la mitad de las CPU), así que lo que cambió fue la máquina; con 4,
  sin `workers: 1`, usaría 2. Se queda `workers: 1` porque es lo que se midió en verde.
- **Sin 3D:** los E2E que no tratan del dibujo ya corrían en la vista de FR-14
  (`sin-dibujo.js`). Siguen con el 3D `dibujo.spec.js`, `accesibilidad.spec.js` (AC-20 a
  AC-22 miden la pantalla entera, dibujo incluido) y AC-12 de `sin-conexion.spec.js`. AC-13
  de `sin-conexion.spec.js` pasa a la vista sin dibujo, en sus dos contextos (el segundo,
  abierto con `browser.newContext`, no hereda el `test` de `sin-dibujo.js`, así que
  `sinDibujo` se le aplica a mano), por la medición de la espera (arriba). Decisión de
  Víctor del 2026-11-18. No cambia lo que comprueba AC-13.
- **Lo que hace la librería:** `analyze()` deja `window.axe` en la página analizada y, al
  terminar, abre una página `about:blank` en el mismo contexto, la analiza y la cierra
  (`@axe-core/playwright` 4.14.0, `finishRun`). No genera peticiones de red: los tests que
  vigilan el tráfico (`sin-conexion.spec.js`, AC-12 y AC-13) pasan con ella.
- **Tiempos** (job entero; run 44288720687 frente a los del #53):

  | Trozo | 1.65.0 sin axe (44162310687 / 44164892525) | Con axe (44288720687) | Con axe, 1 proceso y 4 CPU (44397305353) |
  | --- | --- | --- | --- |
  | 1/3 | 523 s / 626 s | 677 s | 585 s |
  | 2/3 | 331 s / 252 s | 519 s | 339 s |
  | 3/3 | 291 s / 325 s | 543 s | 487 s |

  Con 2 CPU, el más lento fue de 11 min 17 s: cabe en los 15, pero roza los 12 min en que
  ADR-0007 §6 pide revisarlo si pasa de forma habitual. Con 4 CPU y un proceso, 9 min 45 s.
  Una sola ejecución de cada.
- **`duplicados` (jscpd) en rojo, por decisión de Víctor:** 16 clones nuevos, todos en
  tests. 15 son bloques de los E2E que ya se parecían (el `beforeEach` con `goto` y
  `localStorage`, `segundoPlano`, `romperAlmacen`, los eventos de ciclo de vida, tests de
  añadir y borrar casi iguales) y que, con la línea de axe en los dos lados, pasan del
  mínimo de tokens. El otro es la cabecera de `tests/unit/axe-core.test.js`, igual que la de
  `three.test.js`. No es un check obligatorio. Sacar a `pantalla.js` lo repetido de los E2E
  va a otra issue.
- **En local** no se pudieron usar los navegadores de 1.65 (el sandbox no llega a
  `cdn.playwright.dev`): los E2E se ejecutaron con los de 1.64 que había en la caché, con
  una configuración fuera del repo.

## osv-scanner: `picomatch` 4.0.7 (GHSA-fc5q-39xc-vjpf), pendiente

- **Hallazgo:** ReDoS con extglobs repetidos de una sola rama, alto (8,7), en `picomatch`
  hasta la 4.0.7, que es la última publicada: no hay versión corregida.
- **Origen:** job `osv-scanner` del #53 (run 44162310702). No lo trae ese PR, que no toca
  `picomatch`: es dependencia de desarrollo de `knip` 6.45.1 (la última), directa y a
  través de `fdir` y `tinyglobby`. El #42, con el mismo `picomatch` 4.0.7, pasó el job el
  2026-11-16; el aviso es del 2026-10-19, así que lo que cambió es la base de datos de
  osv-scanner. Falla igual en cualquier PR desde ahora.
- **Decisión pendiente** (la persona): exceptuarlo en `osv-scanner.toml`, como los de
  Stryker, u otra salida. `osv-scanner.toml` es R2 y no está entre los ficheros de VIC-31.

## Exclusiones de los escáneres

osv-scanner: seis avisos medios en `osv-scanner.toml` (#49 y #50, VIC-27), todos de
dependencias de desarrollo que traen dos paquetes de Stryker 10.1.1, la última versión, con
rangos que no admiten las versiones corregidas:

- `@stryker-mutator/core`: GHSA-g3hv-75wg-m249 (`minimatch` 10.2.6, corregido en la
  11.0.1, fuera de su rango `~10.2.4`) y GHSA-4mjr-xmp4-gh2g, GHSA-6pq8-jhm2-2vcw,
  GHSA-q8mj-m7cp-5q26 y GHSA-x5fp-wj9c-mxmx (`qs` 6.15.1, que `typed-rest-client` 2.3.1
  fija exacto);
- `@stryker-mutator/tap-runner`: GHSA-3g3m-2fjr-6pw4 (`glob` 13.0.7, corregido en la
  14.0.2, fuera de su rango `~13.0.0`).

Solo corren en la CI, en el job `mutaciones`, sobre el código del repo y sin entrada
externa. Caducan el 2027-02-16 (`effectiveUntil`): si para entonces Stryker no ha subido
esas dependencias, el check vuelve a fallar y se decide de nuevo. La excepción es por ID de
aviso en todo el repo: silencia esos seis avisos en cualquier versión afectada de `qs`,
`minimatch` o `glob`, también si los trae una dependencia de producción y también en la
tarea mensual. Mientras dure, un PR que añada dependencias de producción mira a mano si
trae alguno de los tres.

Semgrep: tres entradas en `.semgrepignore`, cada una con su motivo. Excluir un fichero
entero lo deja fuera de **todas** las reglas, no solo de la que dio el hallazgo: si uno
de estos ficheros crece o cambia de uso, la exclusión se revisa. El fichero es R2 y la
CI usa el de `main`.

### `app/vendor/three/**`

- **Qué es:** three.js 0.170.0 (la versión de `package.json`), copiado tal cual del
  paquete npm (minificado, con su `LICENSE`), según ADR-0003 §3.2.
- **Por qué se excluye:** es código de terceros que no se edita aquí. Un hallazgo en él no
  se corregiría en este repo, sino actualizando la versión.
- **Qué lo cubre:** la versión exacta está en `package.json`; ADR-0003 §3.2 hace de
  cada cambio de versión un PR R2 propio, y el test de identidad de
  `tests/unit/three.test.js` comprueba que la copia es la del paquete (§3.3). Dependabot
  propone `three` en un PR aparte (`.github/dependabot.yml`).

### `tests/e2e/pantalla.js`

- **Hallazgo:** `detect-non-literal-regexp`, en la línea 7: `new RegExp(`^${nombre}( |$)`)`,
  dentro de `barra()`.
- **Origen:** job `semgrep` de calculadora-discos#40, run 43593585195.
- **Por qué no es un riesgo:** es código de test. Los argumentos son literales del propio
  repositorio: los nombres de barra que pasan los tests (`'Recta'`, `'Z'`,
  `'Olímpica 20 kg'`…), directamente o desde un array literal en `interfaz.spec.js`. No
  hay entrada de usuario ni datos externos, así que no cabe una expresión regular
  maliciosa (ReDoS).

### `tests/unit/fuentes.test.js`

- **Hallazgo:** `detect-non-literal-regexp`, en la línea 49:
  `new RegExp(`${p}:\\s*([^;]+);`)`, dentro de `caras()`.
- **Origen:** job `semgrep` de calculadora-discos#40, run 43593585195.
- **Por qué no es un riesgo:** es código de test. `p` solo toma los literales
  `'font-family'`, `'font-weight'`, `'font-style'` y `'src'`, y la expresión se aplica al
  `app/css/estilos.css` del propio repositorio. No hay entrada de usuario ni datos
  externos.

Los tests no se cambian para esquivar la regla.
