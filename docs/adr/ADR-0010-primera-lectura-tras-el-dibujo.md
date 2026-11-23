---
id: ADR-0010
titulo: la primera lectura lenta antes de axe en AC-13 es un límite aceptado del dibujo 3D por software
estado: Propuesto         # Propuesto | Aceptado | Rechazado | Sustituido
fecha: 2026-11-23
sustituye: null
sustituido_por: null
modifica: ["ADR-0009 (§6, primer criterio: el aviso por la primera lectura más larga pasa de 5 s a 7,5 s; «se agota alguna vez» no cambia)"]
referencias: ["ADR-0003", "ADR-0008", "ADR-0009", "SPEC-CALC-001", "SPEC-CALC-003", "VIC-35", "VIC-31", "PR #56"]
---

<!--
Redactado por Claude (VIC-35). La issue pide medir por qué la primera lectura de
`getAnimations()` en SPEC-CALC-001/AC-13 tarda varios segundos en la CI y, o bien bajarla de
5 s, o bien proponer un ADR con los datos. Cambia solo el punto de la cabecera (`modifica`);
el resto de ADR-0009 sigue vigente y no se edita.
-->

# ADR-0010 — La primera lectura lenta antes de axe en AC-13 es un límite aceptado del dibujo 3D por software

## 1. Contexto

ADR-0009 da a la primera lectura de `getAnimations()` antes de axe 10 s, y su §6 pide a la
persona que decida si la más larga medida en la CI pasa de 5 s. Ya ha pasado: 6072 ms en
`a304984` y 6770 ms en `914446f` [F1].

**Lo medido en la CI** [F1]. De las ejecuciones de `tests.yml` entre el 2026-11-19 y el
2026-11-23 (todas con 1 proceso y 4 CPU), 23 anotan una primera lectura de AC-13. Su máximo
por ejecución:

| n | mínimo | mediana | p90 | máximo | > 5 s |
| --- | --- | --- | --- | --- | --- |
| 23 | 1052 ms | 3181 ms | 4274 ms | 6770 ms | 2 |

Hay 28 primeras lecturas de más de 2 s; 25 son de AC-13 en Chromium y **todas las que lo
anotan vuelven sin animaciones** (la de `3e6fe4d` es anterior a que la anotación lo dijera). Las otras tres son AC-21 de `accesibilidad.spec.js` (Chromium, dos) y AC-08
de `dibujo.spec.js` (WebKit, una), ninguna por encima de 2,5 s. Las anotaciones no dicen en
cuál de las seis llamadas a axe de AC-13 ocurre.

**Lo medido en local** [F2]. AC-13 solo, con la configuración de la CI (1 proceso, 4 CPU con
`taskset`) y, para acercarse a la CI, la CPU de la página frenada 8 veces con
`Emulation.setCPUThrottlingRate`. Con una sonda temporal en la espera de `axe.js` y medidas
temporales en `app/js/dibujo.js`, ninguna fusionada. Dos repeticiones, casi iguales:

| Llamada a axe en AC-13 | Primera lectura | Lo que ocupa la página |
| --- | --- | --- |
| 1, primera carga, referencia | 4–9 ms | la lectura llega antes del primer dibujo (720 ms) |
| 2, tras `reload`, referencia | 66–70 ms | la lectura llega antes; justo después, un dibujo de 890–960 ms |
| 3, primera carga, con datos | 3–10 ms | como la 1 |
| 4, tras editar | 2–4 ms | — |
| **5, tras `reload`, con datos** | **2109–2222 ms** | **tarea larga de 2028–2048 ms: el primer `pintarPendientes()`**, y otra de 630–650 ms |
| 6, tras cambiar la barra | 98–184 ms | redibujos de 100–970 ms |

Sin frenar la CPU, la más larga es de 117 ms y el test dura 44 s (en la CI, más de 90 s).

**La causa.** Al arrancar, la app espera a las fuentes y, en un solo fotograma, ilumina la
escena y hace el primer `pintarPendientes()`: el primer dibujo de todas las tarjetas, que
compila los sombreadores (sombras suaves y antialias) y pinta con SwiftShader, en el hilo
principal. Tras el `reload` del recorrido con datos hay tres tarjetas con discos guardadas, y
ese fotograma pasa de 0,7 s a 2 s. `page.evaluate` se ejecuta en el mismo hilo, así que la
lectura queda en cola detrás. No es Playwright ni el protocolo: una segunda lectura justo
después tarda lo mismo que lo que queda de la tarea. Que la lectura caiga antes o detrás del
dibujo es una carrera; por eso la cifra varía tanto entre ejecuciones.

**Límites de lo medido.** En local el Chromium es el 1248 de Playwright, no el 1254 de la
CI (el sandbox no deja descargarlo), y el frenado de CPU es una emulación: reproduce el orden
de magnitud (2,2 s), no la cifra de la CI. Que en la CI sea la llamada 5 es una inferencia:
ninguna anotación lo dice.

## 2. Alternativas consideradas

### Opción A: aceptarlo como límite y mover el aviso de §6 a 7,5 s

- **Ventajas:** no cambia la app, los tests ni el control. La causa es conocida y es un
  coste del dibujo por software que ya acepta ADR-0009 §4 («una primera lectura que tarda
  hasta 10 s pasa sin fallo»). El aviso deja de saltar en una de cada diez ejecuciones por
  una causa ya estudiada y sigue saltando antes del fallo.
- **Inconvenientes:** 7,5 s es una elección: el máximo medido (6770 ms) más un 10 %,
  redondeado. Con 23 datos, la cola no se conoce.
- **Riesgos:** que la cifra suba por otra causa y el aviso tarde más en verlo.

### Opción B: aceptarlo sin tocar §6

- **Ventajas:** no cambia ningún ADR.
- **Inconvenientes:** §6 vuelve a pedir una decisión cada vez que una lectura pase de 5 s,
  que con lo medido es una de cada diez ejecuciones, por la misma causa.

### Opción C: partir AC-13 en dos tests (lo que sugería la issue)

- **Inconvenientes:** no baja la lectura. Su coste es el primer dibujo tras un `reload` con
  datos, que ocurre igual en un test más corto. Solo cambiaría el tiempo total del test.

### Opción D: esperar en el test a que el dibujo esté hecho antes de llamar a axe

- **Ventajas:** axe analizaría la página con el dibujo terminado.
- **Inconvenientes:** no quita el tiempo, lo mueve a otra espera, que necesitaría su
  propio tiempo máximo por encima de los 5 s de `expect` y dejaría de verse en la medición
  de ADR-0009 §5. Cambia lo que hace AC-13.

### Opción E: repartir el primer dibujo de la app en varios fotogramas

Por ejemplo, una tarjeta por fotograma, o compilar los sombreadores antes.

- **Ventajas:** quitaría la tarea larga, también en dispositivos lentos.
- **Inconvenientes:** es cambiar la app para la CI, fuera del alcance de VIC-35. En el
  iPhone, con GPU, no hay ningún dato de que haga falta.

## 3. Decisión

**Opción A.** La primera lectura lenta de AC-13 es un coste aceptado del dibujo 3D por
software, ya cubierto por los 10 s de ADR-0009 §3, que no cambian. AC-13 no se parte y la
app no cambia.

En ADR-0009 §6, el primer criterio pasa a: «si la primera lectura más larga medida en la CI
pasa de **7,5 s** o se agota alguna vez». El resto de §6 no cambia, incluido el criterio que
liga un test fallido a una primera lectura de más de 2 s en la misma ejecución.

## 4. Consecuencias

- **Beneficios:** VIC-35 se cierra con la causa medida, y el aviso de §6 vuelve a señalar
  algo nuevo.
- **Costes aceptados:**
  - El margen entre el aviso y el fallo baja de 5 s a 2,5 s.
  - Una subida por otra causa por debajo de 7,5 s no hace saltar el aviso.
  - Siguen en pie los costes de ADR-0009 §4 (un plazo de la app que caduca durante una
    lectura lenta, varias lecturas lentas en un test).
- **Riesgos y mitigaciones:**

  | Riesgo | Mitigación |
  | --- | --- |
  | La lectura se acerca a 10 s y AC-13 falla de forma intermitente | El aviso a 7,5 s; si salta, la Opción E es la siguiente que mirar. |
  | La causa en la CI no es la medida en local | Las anotaciones de §5 de ADR-0009 siguen; si las lecturas lentas aparecen en otras llamadas o con animaciones, la medida no las explica y se revisa. |

- **Impacto:** ningún fichero de código ni de test. Solo cambia un criterio de revisión.

## 5. Validación

No hay medición nueva: sigue la de ADR-0009 §5.

## 6. Seguimiento

La persona decide, con un ADR nuevo si cambia la decisión:

- si salta el criterio de ADR-0009 §6 con la cifra de este ADR;
- si las primeras lecturas de más de 2 s dejan de ser casi todas de AC-13 sin animaciones;
- si la CI pasa a tener GPU, o cambian las CPU del runner (ya en ADR-0009 §6).

## 7. Fuentes

Consultadas el 2026-11-23.

- [F1] Anotaciones `::notice::` de los jobs `e2e` de las 100 últimas ejecuciones de
  `tests.yml` (de la 44264119935 a la 45141784296).
- [F2] Ejecuciones locales de `tests/e2e/sin-conexion.spec.js -g AC-13` del 2026-11-23,
  descritas en §1, con Playwright 1.65.0.
