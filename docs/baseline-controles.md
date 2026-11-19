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

## M27: axe en los E2E (ADR-0007, ADR-0008 y ADR-0009)

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
  fundido no hay violación, y NFR-02 se aplica al estado estable (SPEC-CALC-003 v0.6). Por
  ADR-0008 §3.1, con ADR-0009 §3, la función auxiliar espera, solo leyendo, a que
  `document.getAnimations()` esté vacío antes de analizar, en dos tiempos:
  - **Primer tiempo:** hasta que vuelve la primera lectura, como mucho 10 s
    (`LECTURA_MAXIMA_MS`). Si se agota, el test falla con un mensaje que cita «ADR-0009 de
    la calculadora», dice que no se obtuvo ninguna lectura, cuánto se esperó y si lo
    acortó el tiempo máximo del test.
  - **Segundo tiempo:** si esa lectura ve animaciones, se lee cada 50 ms hasta que no
    quede ninguna, como mucho 2 s (`ESPERA_MAXIMA_MS`) desde que volvió. Si se agota, el
    mensaje es el de ADR-0008 («Se esperaba a que terminaran las animaciones antes de axe
    (ADR-0008 de la calculadora); siguen en curso»), con la cita de ADR-0009, cuánto se
    esperó, si había una lectura en curso y cuánto llevaba, lo que tardaron la primera
    lectura y la última que volvió, y sus animaciones. No se lanza una lectura con menos de
    50 ms por delante, así que en la práctica dura algo menos de 2 s: falla antes, nunca
    deja pasar.
  - **Mecanismo:** un bucle propio que lanza su propio error (ADR-0009 §3). Cada lectura
    compite con su plazo en un `Promise.race`; una lectura que falla sube tal cual, y una
    que vuelve o falla después del plazo ya no cuenta, y su temporizador se cancela en un
    `finally`. Ningún error se captura.
  - **El tiempo máximo del test:** las dos esperas terminan 250 ms antes que él, como
    `expect`, para fallar con su propio mensaje. Playwright no publica ni el fin del tiempo
    máximo del test ni su reloj: se usan `TestInfo._deadline()` e `iso.monotonicTime()` de
    `playwright-core/lib/coreBundle`, los mismos que usa `expect`. Playwright está fijado a
    1.65.0 (`overrides` y el test del lockfile, ADR-0007 §3.2). Si una versión quita
    `_deadline()` o `monotonicTime()`, la función falla con un mensaje que lo dice, antes de
    leer el reloj; si quita el export `iso`, falla al importar `axe.js`. En los dos casos,
    falla: nunca deja pasar un análisis.
  - **Medición manual en local**, con páginas de prueba fuera del repo (no es un test del
    repo, y no hay ninguno del mecanismo): una animación infinita
    falla a los 2 s con el mensaje de ADR-0008 y ADR-0009; una página colgada falla a los
    10 s con el de ADR-0009; con 5 s de test, a los 4,7 s, «lo acortó el tiempo máximo del
    test». Antes de ADR-0009, una primera lectura agotada salía con el mensaje de ADR-0008
    seguido de `Timeout 2000ms exceeded while waiting on the predicate` y sin animaciones
    (CI de `7e2a34f`).
- **Reloj parado (ADR-0008 §3.2):** con `page.clock.pauseAt`, `analyze()` se cuelga hasta
  el timeout en los dos navegadores (axe usa los temporizadores de la página). En los tests
  con el reloj parado (11 de `anadir-borrar.spec.js` y 8 de `dibujo.spec.js`) se analiza
  hasta pararlo: en el `beforeEach`, tras cada serie que quita el `pararReloj` de
  `dibujo.spec.js` y en los dos `pararReloj`, tras la recarga con el reloj ya instalado (así
  axe sí funciona). Los dos `pararReloj` citan el ADR y nombran los tests con tiempo real
  que analizan lo que se ve con el reloj parado: el aviso de "Deshacer", el foco, el campo
  de añadir con su error, los paneles y el dibujo quieto. El campo de añadir con su error
  y, a la vez, el aviso con el foco en "Deshacer" no lo analiza ningún test: sus partes se
  analizan por separado. Las tarjetas que salen no se analizan, ni con tiempo real (la
  espera llega cuando ya no están) ni con el reloj parado: es el hueco de ADR-0008 §3.1.
  Su contenido se analiza antes de quitarlas. **El dibujo animándose y el que espera los
  400 ms de FR-11 son otro hueco** (G4 del #56, ronda 2; decisión de Víctor del
  2026-11-19): el recorrido con el dibujo de `dibujo.spec.js` analiza en cuanto empieza
  la animación (con `data-animando`), pero nada comprueba que siga cuando corre axe, y la
  espera antes de axe puede durar más que la animación (la animación del dibujo es de
  JavaScript, así que la espera no la ve).
- **Plazos reales (ADR-0008 §3.1):** donde el aviso de "Deshacer" (5 s) tiene que seguir
  visible para el paso siguiente, el análisis va después de ese paso. Donde se analiza con
  el aviso comprobado, el test lo vuelve a comprobar después del análisis, para fallar si
  caducó durante la espera o el análisis.
- **Excepciones (ADR-0008 §3.3):** la lista y la comparación están en
  `excepciones-axe.js`, sin Playwright ni axe. Un nodo está cubierto si su regla y su
  `target`, de un solo elemento, son los de una excepción; una violación sin nodos no pasa.
  Una excepción "ya no aparece" si su regla pasa en su elemento (`passes`). Con la lista
  vacía no hay test unitario: llega con la primera excepción.
- **Espera más larga (ADR-0008 §5, ADR-0009 §5).** Desde ADR-0009, cada proceso de
  Playwright anota en la salida del test, como `::notice::`, tres máximos por separado,
  cuando superan en 100 ms el anterior de su clase: la primera lectura (con o sin
  animaciones), el segundo tiempo y el total de las esperas con animaciones (estos dos,
  con la primera lectura, el segundo tiempo y el total). Además, cada primera lectura de
  más de 2 s se anota siempre, con su test, en cuanto vuelve, aunque el segundo tiempo
  falle después. En la CI de `3e6fe4d`, con la primera versión de ADR-0009 en `axe.js`
  (antes de las correcciones de la ronda 3 de G4), los tres trozos pasaron: primera
  lectura más larga, 2413 ms (Chromium, AC-21 de `accesibilidad.spec.js`) y 2006 ms
  (Chromium, SPEC-CALC-001/AC-13), las dos de más de 2 s, que con ADR-0008 habrían
  fallado; segundo tiempo más largo, 530 ms (Chromium, AC-22). Trozos: 576, 327 y 484 s.
  No cuenta para ADR-0009 §5, que pide las dos ejecuciones sobre el SHA final. Las cifras
  anteriores, de antes de ADR-0009: cada proceso escribía cada espera que superaba en
  100 ms la máxima anterior de su clase
  (con alguna animación vista o sin ninguna), con los sondeos que vieron alguna; la CI la
  recoge como anotación del job. El escalón de 100 ms evita pasar del límite de
  anotaciones del job, y hace que la máxima real pueda ser hasta 99 ms mayor que la última
  anotada. Hasta `b4ace2a` había una sola máxima para las dos clases, así que una espera
  con animaciones posterior a una más larga sin ellas no se anotaba: las cifras «con
  animaciones» de abajo son solo las anotadas, no la máxima. En local, con el Chromium de
  1.64, la más larga fue de 1110 ms en `dibujo.spec.js` (AC-19, al pasar a la vista sin
  dibujo), y no por las animaciones: el primer sondeo ya las encontraba vacías, pero
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
  AC-21 incluido. Con animaciones, la más larga anotada es de 541 ms (Chromium, AC-22, 6
  sondeos con alguna; en WebKit, 299 ms), antes de la de 1331 ms sin ninguna (Chromium,
  AC-19 de `dibujo.spec.js`), que sí es la máxima, con hasta 99 ms de error: entre 1331 y
  1430 ms. Por debajo de 1,5 s, así que no hace falta el ADR-0009, con un margen de entre
  70 y 169 ms frente a 1,5 s y de entre 570 y 669 ms frente a los 2 s, en una sola
  ejecución. El experimento no aísla la causa: entre `7e2a34f` y `b4ace2a` el repo pasó a
  ser público y el runner, de 2 a 4 CPU. Con 2 CPU, Playwright ya usaba un proceso por
  defecto (la mitad de las CPU), así que lo que cambió fue la máquina; con 4, sin
  `workers: 1`, usaría 2. Se queda `workers: 1` porque es lo que se midió en verde; su
  comentario pide revisarlo con los criterios de ADR-0009 §6 o si el runner vuelve a 2 CPU.
- **SPEC-CALC-001/AC-13 vuelve al 3D** (G4 del #56, ronda 2; decisión de Víctor del
  2026-11-19). Había pasado a la vista sin dibujo por la medición de `336851d`, pero
  ADR-0003 (tabla de riesgos) cuenta con que ese E2E vigile la red con three.js en uso:
  sin 3D, three.js se carga pero no se ejecuta. Vuelve como en `main`. En la CI de
  `a7987f5` (un proceso, 4 CPU), con la espera aún de ADR-0008, no cupo: en Chromium la
  primera lectura de AC-13 no volvió en 2 s y el test falló, en el recorrido de
  `sin-conexion.spec.js`. Las demás: con animaciones, como mucho 449 ms (Chromium, AC-22,
  6 sondeos con alguna; en WebKit, 289 ms); sin ninguna, 1436 ms (Chromium, AC-13) y
  1425 ms (Chromium, AC-19 de `dibujo.spec.js`), cada una con hasta 99 ms de error. AC-21
  pasó. **Decisión de Víctor:** ADR-0009 (#60), que da a la primera lectura su propio
  tiempo máximo, de 10 s, y cuenta los 2 s desde que vuelve. Fusionado en `main` el
  2026-11-19 y aplicado en `axe.js`.
- **Medición con ADR-0009 (§5): dos ejecuciones completas de la CI**, sobre `30f6bd9`
  (run 44524504021, intentos 1 y 2), con un proceso y 4 CPU. Las dos en verde, en los dos
  navegadores y con el 3D (AC-13 de SPEC-CALC-001 incluido). Cada cifra puede ser hasta
  99 ms mayor por el escalón de la anotación.

  | | Primera lectura más larga (frente a 10 s) | Segundo tiempo más largo (frente a 2 s) | Total más largo con animaciones | Trozos |
  | --- | --- | --- | --- | --- |
  | Intento 1 | **6100 ms** (Chromium, SPEC-CALC-001/AC-13; otra de 2158 ms en el mismo test) | 406 ms (Chromium, AC-22) | 407 ms | 413, 410 y 485 s |
  | Intento 2 | 1867 ms (Chromium, SPEC-CALC-001/AC-13) | 478 ms (Chromium, AC-22) | 479 ms | 496, 299 y 398 s |

  Márgenes: la primera lectura, 3,9 s frente a los 10 s en el intento 1 y 8,1 s en el 2;
  el segundo tiempo, 1,5 s frente a los 2 s. En WebKit, como mucho 494 ms de primera
  lectura y 263 ms de segundo tiempo. Las primeras lecturas con animaciones vuelven en
  1 o 2 ms: el retraso solo aparece en lecturas sin animaciones, con el 3D. **Se cumple
  un criterio de ADR-0009 §6** (la primera lectura pasa de 5 s en el intento 1).
  **Decisión de Víctor** (2026-11-19, por ADR-0009 §6): se aceptan los 6100 ms como dentro
  del margen, sin ADR nuevo. La investigación de por qué AC-13 de SPEC-CALC-001 concentra
  las primeras lecturas lentas va aparte, en VIC-35.
- **Tercera ejecución de ADR-0009 §5**, sobre `eab8788`, el último commit del #56 (mismo
  árbol que `1f8db57`, su squash en `main`), con un proceso (`workers: 1`). Datos de
  Víctor, en verde: primera lectura más larga, 1618 ms (Chromium, SPEC-CALC-001/AC-13),
  con 8,4 s de margen frente a los 10 s; segundo tiempo más largo, 509 ms, con 1,5 s frente
  a los 2 s. Cada cifra, con hasta 99 ms de error por el escalón de la anotación. No se
  cumple ningún criterio de ADR-0009 §6. AC-13 vuelve a tener la primera lectura más larga
  (VIC-35).
- **Sin 3D:** los E2E que no tratan del dibujo ya corrían en la vista de FR-14
  (`sin-dibujo.js`). Siguen con el 3D `dibujo.spec.js`, `accesibilidad.spec.js` (AC-20 a
  AC-22 miden la pantalla entera, dibujo incluido) y `sin-conexion.spec.js` (SPEC-CALC-001
  AC-12 y AC-13).
- **Lo que hace la librería:** `analyze()` deja `window.axe` en la página analizada y, al
  terminar, abre una página `about:blank` en el mismo contexto, la analiza y la cierra
  (`@axe-core/playwright` 4.14.0, `finishRun`). No genera peticiones de red: los tests que
  vigilan el tráfico (`sin-conexion.spec.js`, AC-12 y AC-13) pasan con ella.
- **Tiempos** (job entero; run 44288720687 frente a los del #53):

  | Trozo | 1.65.0 sin axe (44162310687 / 44164892525) | Con axe (44288720687) | Con axe, 1 proceso y 4 CPU (44397305353) | Ídem, AC-13 con 3D (44507094960) |
  | --- | --- | --- | --- | --- |
  | 1/3 | 523 s / 626 s | 677 s | 585 s | 444 s |
  | 2/3 | 331 s / 252 s | 519 s | 339 s | 333 s (falla AC-13) |
  | 3/3 | 291 s / 325 s | 543 s | 487 s | 342 s |

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

## M27: capturas de referencia (regresión visual)

Llegan con VIC-31 (PR 4): `tests/e2e/capturas.spec.js`, con una captura de la pantalla
entera (`toHaveScreenshot`, `fullPage`) en cada uno de 10 estados de SPEC-CALC-003, a
390 × 844 px (el ancho de §5) y en los dos proyectos: 20 referencias, que irán a
`tests/e2e/capturas.spec.js-snapshots/`. Como el ejemplo de sdd-workflow#48:

- **Sin tolerancias ni máscaras.** `playwright.config.js` fija `updateSnapshots: 'none'`
  (una captura que falta es un fallo) y, para `toHaveScreenshot`, `threshold: 0` (sin él,
  Playwright compara con 0,2 y deja pasar cambios de color de decenas de niveles por
  canal), `animations: 'disabled'`, `caret: 'hide'` y `scale: 'css'`. `maxDiffPixels` y
  `maxDiffPixelRatio` quedan en 0, su valor por defecto.
- **Límites de Playwright que se aceptan:** pixelmatch no cuenta los píxeles que toma por
  antialias, y Playwright no permite cambiarlo. Con `scale: 'css'`, la captura de WebKit
  (iPhone 17, 3 px por px CSS) se reduce a un píxel por px CSS: un cambio de menos de un
  px CSS puede no verse. Es lo que hace las capturas estables entre los dos proyectos.
- **Los estados:** al abrir (AC-01), los dos paneles desplegados (AC-03 y AC-04), los
  discos de 25 y 1,25 kg deshabilitados (AC-04), los tres avisos generales (AC-05), la
  explicación del 70 % desplegada (AC-06), el collarín (AC-07), el aviso de capacidad del
  modo Un punto (AC-18), el campo de añadir abierto y con el error de 0 (AC-14) y el aviso
  de "Deshacer" con el foco (AC-12). Cada test comprueba su estado y analiza con axe al
  llegar y tras cada acción que cambia lo que se ve (ADR-0007 §3.3). Fijan el estado que
  capturan, no prueban sus AC: los títulos los citan como «SPEC-CALC-003 AC-01», no en el
  formato que cuenta `trazabilidad`.
- **El aviso de "Deshacer"** dura 5 s (FR-08). Su test instala el reloj de la página,
  analiza antes de pararlo (ADR-0008 §3.2) y lo para 1 s por delante antes de capturar,
  como el `pararReloj` de `anadir-borrar.spec.js`; comprueba el aviso y el foco antes y
  después de la captura. Con `Date.now() + 1` en lugar de 1 s, falló una vez en local
  («Cannot fast-forward to the past»).
- **Sin el dibujo 3D:** todo en la vista de FR-14 (`sin-dibujo.js`). SPEC-CALC-003 §11
  excluye comparar el dibujo píxel a píxel, y en la CI se pinta por software.
- **Lo que no se captura:** los estados intermedios (el gesto de borrar, las tarjetas
  entrando o saliendo), el ancho de 360 px (AC-08) y el zoom al 200 % (AC-22), que tienen
  sus propias medidas en los E2E.
- **Las referencias las genera Víctor** en el contenedor de `tests.yml` (Playwright 1.65.0,
  digest `sha256:9beb5460…4e73dbe`, `linux/amd64` como el runner), desde un clon limpio en
  el commit revisado, y eso vale como su aprobación. Pendiente: la generación, cinco
  ejecuciones sin `--update-snapshots` (falsos positivos) y el rojo con un cambio de
  aspecto. Si un test falla al generarlas, su PNG puede haberse escrito igual: se repite.
- **Riesgo aceptado: el control vive en la rama.** La CI usa la configuración y las
  referencias del PR, no las de `main`. Un PR puede apagarlo (`updateSnapshots` distinto
  de `'none'`, `ignoreSnapshots`, `threshold` o `maxDiff*`, otra ruta de referencias) o
  cambiar los PNG con los E2E en verde. El `checks.py` de la calculadora no marca aún
  `playwright.config.*` ni `*-snapshots/` como R2 (la plantilla sí, desde sdd-workflow#48),
  ni hay un check sobre esas opciones: hoy lo para la revisión de Víctor. Además, un
  `--update-snapshots` en el PC (WSL también es `linux`) escribe en las mismas rutas que
  las referencias aprobadas.
- **Si una captura falla en la CI,** `tests.yml` no sube `test-results/`: la imagen y la
  diferencia solo se ven reproduciéndolo en el contenedor.
- **En local**, con los navegadores de 1.64 de la caché y las referencias fuera del repo
  (no valen como referencia: otras versiones dan otros píxeles): 20 passed al generarlas,
  diez ejecuciones seguidas en verde (200 comparaciones sin diferencias) y el test del
  aviso, 60 veces seguidas en verde. Unos 13 s con 20 tests.

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
