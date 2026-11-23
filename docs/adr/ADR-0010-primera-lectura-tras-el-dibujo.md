---
id: ADR-0010
titulo: la primera lectura lenta antes de axe en AC-13 es un límite aceptado del dibujo 3D por software
estado: Aceptado          # Propuesto | Aceptado | Rechazado | Sustituido · opción A, decisión de Víctor del 2026-11-23
fecha: 2026-11-23
sustituye: null
sustituido_por: null
modifica: ["ADR-0009 (§6, primer criterio, entero, con su paréntesis y su frase final: el aviso por la primera lectura más larga pasa a 7,5 s en SPEC-CALC-001/AC-13 y sigue en 5 s en los demás tests; «se agota alguna vez» no cambia. §4, tabla de riesgos, primera fila: «§6 pide revisar a la mitad» pasa a «§6 pide revisar a la mitad, o a tres cuartos en AC-13»)"]
referencias: ["ADR-0003", "ADR-0008", "ADR-0009", "SPEC-CALC-001", "VIC-35", "VIC-31", "PR #56"]
---

<!--
Redactado por Claude (VIC-35). La issue pide medir por qué la primera lectura de
`getAnimations()` en SPEC-CALC-001/AC-13 tarda varios segundos en la CI y, o bien bajarla de
5 s, o bien proponer un ADR con los datos. Víctor eligió la opción A en el PR #79. Cambia
solo los puntos de la cabecera (`modifica`); el resto de ADR-0009 sigue vigente y no se edita.
-->

# ADR-0010 — La primera lectura lenta antes de axe en AC-13 es un límite aceptado del dibujo 3D por software

## 1. Contexto

ADR-0009 da a la primera lectura de `getAnimations()` antes de axe 10 s, y su §6 pide a la
persona que decida si la más larga medida en la CI pasa de 5 s. Ha pasado tres veces, siempre
en AC-13 de SPEC-CALC-001: 6100 ms en la medición del PR #56 (run 44524504021, intento 1),
que Víctor aceptó sin ADR nuevo y dejó para VIC-35 [F3], y después 6072 ms en `a304984` y
6770 ms en `914446f` [F1]. AC-13 recorre la app con el dibujo 3D activo, porque ADR-0003
(tabla de riesgos) cuenta con que vigile la red con three.js en uso; en la CI ese dibujo se
pinta por software (SwiftShader).

**Lo medido en la CI** [F1]. Son 24 ejecuciones de los jobs `e2e` (contando cada intento
como una) con la anotación de ADR-0009 §5, todas con 1 proceso y 4 CPU, y todas anotan una
primera lectura de AC-13. Su máximo por ejecución:

| Ejecuciones | Mínimo | Mediana | Máximo | Más de 5 s |
| --- | --- | --- | --- | --- |
| 24 | 1052 ms | 3181 ms | 6770 ms | 3 |

Hay 30 primeras lecturas de más de 2 s. Son de AC-13 en Chromium 27, y las 26 que dicen si
había animaciones vuelven sin ninguna (la de `3e6fe4d` es anterior a que la anotación lo
dijera). En 6 ejecuciones AC-13 tiene dos de más de 2 s. Las otras tres son AC-21 de
`accesibilidad.spec.js` (Chromium, dos) y AC-08 de `dibujo.spec.js` (WebKit, una); la más
larga de cualquier test que no sea AC-13 es de 2413 ms. Las anotaciones no dicen en cuál de
las seis llamadas a axe de AC-13 ocurre cada una.

**Lo medido en local** [F2]. AC-13 solo, con la configuración de la CI (1 proceso, 4 CPU con
`taskset`) y, para acercarse a la CI, la CPU de la página frenada 8 veces con
`Emulation.setCPUThrottlingRate`. Con una sonda temporal en la espera de `axe.js` y medidas
temporales en `app/js/dibujo.js`, ninguna fusionada. Dos repeticiones, casi iguales:

| Llamada a axe en AC-13 | Primera lectura | Lo que ocupa la página |
| --- | --- | --- |
| 1, primera carga, referencia | 4–9 ms | la lectura llega antes del primer dibujo (720 ms) |
| 2, tras `reload`, referencia | 66–70 ms | la lectura llega antes; justo después, un primer dibujo de 890–960 ms |
| 3, primera carga, con datos | 3–10 ms | como la 1 |
| 4, tras editar | 2–4 ms | — |
| **5, tras `reload`, con datos** | **2109–2222 ms** | **tarea larga de 2028–2048 ms: el primer `pintarPendientes()`**, y otra de 630–650 ms |
| 6, tras cambiar la barra | 98–184 ms | redibujos de 100–970 ms |

Sin frenar la CPU, la más larga es de 117 ms y el test dura 44 s (en la CI, más de 90 s).

**La causa.** Al arrancar, la app espera a las fuentes y, en un mismo fotograma, ilumina la
escena (`iluminar()`, 15–55 ms en local) y hace el primer `pintarPendientes()`. Ese primer
dibujo pinta una sola tarjeta, porque el presupuesto por fotograma (`PRESUPUESTO_MS`) deja
las demás para los siguientes, pero es el primero con esa escena, con SwiftShader y en el
hilo principal; la hipótesis es que compila ahí sus sombreadores (sombras suaves y
antialias). Tras el `reload` del
recorrido con datos ese fotograma pasa de 0,7–1 s a 2 s. No se ha medido qué parte es la
compilación y qué parte el pintado. `page.evaluate` se ejecuta en el mismo hilo, así que una
lectura que llega durante esa tarea queda en cola detrás. No es Playwright ni el protocolo:
una segunda lectura justo después tarda lo mismo que lo que queda de la tarea.

Que la lectura caiga antes o detrás del primer dibujo es una carrera: por eso la cifra varía
tanto entre ejecuciones. Hay un primer dibujo tras cada `reload` (llamadas 2 y 5). En local,
la lectura de la llamada 2 llega antes; si en la CI llegan detrás las dos, salen las dos
lecturas lentas de un mismo test.

**Límites de lo medido.** En local el Chromium es el 1248 de Playwright, no el 1254 de la
CI (el sandbox no deja descargarlo), y el frenado de CPU es una emulación: reproduce el orden
de magnitud (2,2 s), no la cifra de la CI. Que en la CI sean las llamadas 2 y 5 es una
inferencia: ninguna anotación lo dice.

## 2. Alternativas consideradas

### Opción A: aceptarlo como límite y mover el aviso de §6 a 7,5 s solo en AC-13

- **Ventajas:** no cambia la app ni los tests; solo un criterio de revisión. La causa está
  medida en local, se infiere en la CI (§1, «Límites de lo medido») y es un coste del
  dibujo por software que ya acepta ADR-0009 §4 («una primera
  lectura que tarda hasta 10 s pasa sin fallo»). El aviso deja de saltar en 3 de cada 24
  ejecuciones por una causa ya estudiada y sigue saltando antes del fallo. Los demás tests,
  sin causa estudiada, conservan el aviso a 5 s.
- **Inconvenientes:** 7,5 s es una elección: el máximo medido (6770 ms) más un 10 %,
  redondeado. Con 24 datos, la cola no se conoce.
- **Riesgos:** que la cifra de AC-13 suba por otra causa y el aviso tarde más en verlo.

### Opción B: aceptarlo sin tocar §6

- **Ventajas:** no cambia ningún ADR.
- **Inconvenientes:** §6 vuelve a pedir una decisión cada vez que una lectura de AC-13 pase
  de 5 s, que con lo medido es en 3 de cada 24 ejecuciones, por la misma causa.

### Opción C: mover el aviso a 7,5 s en todos los tests

- **Inconvenientes:** relaja el aviso también en tests cuya lectura lenta nadie ha
  estudiado (AC-21 de `accesibilidad.spec.js`, AC-08 de `dibujo.spec.js`, WebKit).

### Opción D: partir AC-13 en dos tests (lo que sugería la issue)

- **Inconvenientes:** no baja la lectura. Su coste es el primer dibujo tras un `reload`, que
  ocurre igual en un test más corto. Solo cambiaría el tiempo total del test.

### Opción E: esperar en el test a que el dibujo esté hecho antes de llamar a axe

- **Ventajas:** axe analizaría la página con el dibujo terminado.
- **Inconvenientes:** no quita el tiempo, lo mueve a otra espera, que necesitaría su
  propio tiempo máximo por encima de los 5 s de `expect` y dejaría de verse en la medición
  de ADR-0009 §5. Cambia lo que hace AC-13.

### Opción F: aligerar el primer fotograma de la app

El pintado ya se reparte por tarjetas (`PRESUPUESTO_MS`). Quedaría compilar los sombreadores
antes del primer dibujo, si la compilación resulta ser la parte cara (no se ha medido), o
sacar `iluminar()` de ese fotograma.

- **Ventajas:** acortaría la tarea larga, también en dispositivos lentos.
- **Inconvenientes:** es cambiar la app para la CI, fuera del alcance de VIC-35. En el
  iPhone, con GPU, no hay ningún dato de que haga falta, y no se ha medido cuánto bajaría.

## 3. Decisión

**Opción A.** La primera lectura lenta de AC-13 es un coste aceptado del dibujo 3D por
software, ya cubierto por los 10 s de ADR-0009 §3, que no cambian. AC-13 no se parte y la
app no cambia.

El primer criterio de ADR-0009 §6 queda, entero, así:

> si la primera lectura más larga medida en la CI pasa de 5 s (la mitad de su tiempo máximo)
> en cualquier test salvo SPEC-CALC-001/AC-13, o de 7,5 s (tres cuartos) en AC-13, o se
> agota alguna vez. Es un aviso de fallo cercano, no de deriva: una subida lenta por debajo
> de esas cifras no lo dispara;

En la tabla de riesgos de ADR-0009 §4, «§6 pide revisar a la mitad» pasa a «§6 pide revisar
a la mitad, o a tres cuartos en AC-13». El resto de §6 no cambia, incluido el criterio que liga un test
fallido a una primera lectura de más de 2 s en la misma ejecución. Aparte, este ADR añade en
su §6 un criterio propio, no de ADR-0009: el de más de 3 s fuera de AC-13 no es un aviso de
fallo cercano, sino una señal de que hay lecturas lentas que esta causa no explica.

## 4. Consecuencias

- **Beneficios:** VIC-35 se cierra con la causa medida, y el aviso de §6 vuelve a señalar
  algo nuevo.
- **Costes aceptados:**
  - En AC-13, el margen entre el aviso y el fallo baja de 5 s a 2,5 s.
  - En AC-13, una subida por otra causa por debajo de 7,5 s no hace saltar el aviso.
  - Siguen en pie los costes de ADR-0009 §4 (un plazo de la app que caduca durante una
    lectura lenta, varias lecturas lentas en un test).
- **Riesgos y mitigaciones:**

  | Riesgo | Mitigación |
  | --- | --- |
  | La lectura de AC-13 se acerca a 10 s y falla de forma intermitente | El aviso a 7,5 s; si salta, la Opción F es la siguiente que mirar. |
  | La causa en la CI no es la medida en local | §6 de este ADR: una primera lectura de más de 2 s con animaciones, o de más de 3 s en un test que no sea AC-13, no la explica esta causa y se revisa. |

- **Impacto:** ningún fichero de la app ni de los tests en este PR. El comentario de
  `LECTURA_MAXIMA_MS` en `tests/e2e/axe.js` dice «se revisa si una pasa de 5 s (§6)»; se
  actualiza a las cifras de este ADR en un PR de código aparte, que necesita su propia
  issue; hasta entonces, manda este ADR.

## 5. Validación

No hay medición nueva: sigue la de ADR-0009 §5, que anota cada primera lectura de más de
2 s con su test y si había animaciones. Con eso se comprueban los criterios de §6.

## 6. Seguimiento

La persona decide, con un ADR nuevo si cambia la decisión:

- si salta el primer criterio de ADR-0009 §6, con las cifras de este ADR;
- si una primera lectura de más de 2 s vuelve con animaciones, o si un test que no sea
  AC-13 anota una de más de 3 s (hoy, como mucho, 2413 ms): esta causa no lo explica;
- si la CI pasa a tener GPU, o cambian las CPU del runner (ya en ADR-0009 §6).

## 7. Fuentes

Consultadas el 2026-11-23.

- [F1] Anotaciones `::notice::` de los jobs `e2e` de las 100 últimas ejecuciones de
  `tests.yml` (de la 44264119935 a la 45141784296), en todos sus intentos.
- [F2] Ejecuciones locales de `tests/e2e/sin-conexion.spec.js -g AC-13` del 2026-11-23,
  descritas en §1, con Playwright 1.65.0.
- [F3] `docs/baseline-controles.md`, M27: la medición de ADR-0009 §5 sobre `30f6bd9` y la
  decisión de Víctor del 2026-11-19.
