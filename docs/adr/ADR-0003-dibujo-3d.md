---
id: ADR-0003
titulo: Dibujo 3D en vivo con three.js y un solo renderizador
estado: Propuesto          # Propuesto | Aceptado | Rechazado | Sustituido
fecha: 2026-10-26
sustituye: null
sustituido_por: null
modifica: [ADR-0001 (§3.1)]
referencias: [ADR-0001, SPEC-CALC-003, SPEC-CALC-001, VIC-9, PR #16, docs/diseno/notas-diseno-interfaz.md]
---

<!--
Redactado por Claude (VIC-9) a partir de docs/diseno/notas-diseno-interfaz.md §2.1,
§4 y §7 y del prototipo docs/diseno/maqueta-interfaz.html, con las decisiones de
Víctor de las sesiones de diseño del 23 al 25 de octubre. Cambia solo ADR-0001
§3.1; el resto de ADR-0001 sigue vigente y no se edita. Datos de three.js
consultados en el registro de npm el 2026-10-26 (§7).
-->

# ADR-0003 — Dibujo 3D en vivo con three.js y un solo renderizador

## 1. Contexto

SPEC-CALC-003 (PR #16) pide que cada tarjeta de serie dibuje en 3D su carga y la anime al cambiar (FR-07, FR-11 a FR-13). También pide que la app funcione sin WebGL (FR-14) y que se recupere si pierde el contexto gráfico (FR-15). Puede haber muchas tarjetas a la vez.

Las restricciones vigentes son:

- **ADR-0001 §3.1:** HTML, CSS y JavaScript estándar, sin paso de compilación y con **cero dependencias en tiempo de ejecución**. Esta regla impide usar cualquier librería 3D.
- **ADR-0001 §3.4:** ningún recurso de terceros, y una CSP en `<meta>` con `script-src 'self'`, sin scripts en línea. SPEC-CALC-001 NFR-01 y NFR-02 piden además funcionar sin conexión y no salir del propio origen.
- **Contextos WebGL:** según las notas de diseño (§2.1), iOS limita los contextos WebGL por página y, a partir de unos 8 a 16, descarta los más antiguos. No lo he contrastado con una fuente.
- **Lógica pura:** la lógica de modos, redondeo, discos, collarines, capacidad y validación debe seguir separada del dibujo y probándose con tests unitarios (notas §7.2).

Sin esta decisión no se puede implementar SPEC-CALC-003.

## 2. Alternativas consideradas

### Opción A: three.js, con un solo renderizador para todas las tarjetas

- **Ventajas:**
  - es lo que usa el prototipo que eligió Víctor: materiales físicos con barniz, entorno PMREM, sombras suaves y tono ACES;
  - un solo contexto WebGL, sea cual sea el número de tarjetas;
  - cada tarjeta conserva su propio lienzo, así que el desplazamiento y el gesto de borrar no cambian.
- **Inconvenientes:**
  - es una dependencia en tiempo de ejecución, la primera;
  - pesa unos 670 KB minificada y unos 167 KB con gzip (0.160.0, §7);
  - copiar cada imagen a su lienzo 2D (`drawImage`) cuesta algo por fotograma.
- **Riesgos:**
  - que el rendimiento no baste en el iPhone (se mitiga como dice §4);
  - que los cambios de three.js entre versiones obliguen a adaptar el código al actualizar.

### Opción B: three.js con un contexto WebGL por tarjeta

- **Ventajas:** el código es más simple.
- **Inconvenientes:** choca con el límite de contextos de iOS. Con más tarjetas que contextos, los dibujos más antiguos se pierden.

### Opción C: WebGL escrito a mano, sin librería

- **Ventajas:** mantiene las cero dependencias.
- **Inconvenientes:** hay que reescribir materiales físicos, entorno PMREM, sombras y tono de salida. Son miles de líneas fuera de la lógica pura, sin tests, para obtener lo que three.js ya da probado.

### Opción D: SVG o imágenes generadas de antemano

- **Ventajas:** sin dependencias y con menos peso.
- **Inconvenientes:** pierden el realismo y la animación de discos y collarín que eligió Víctor (SPEC-CALC-003 FR-11). Las combinaciones de equipo, discos y collarín son demasiadas para generarlas de antemano.

### Opción E: un solo lienzo WebGL para todas las tarjetas

- **Ventajas:** un contexto y sin copias.
- **Inconvenientes:** el dibujo deja de pertenecer a cada tarjeta. Eso rompe el desplazamiento de la página, el gesto de borrar y la entrada y salida de tarjetas (SPEC-CALC-003 FR-08 y FR-10).

## 3. Decisión

**Opción A.** Modifica ADR-0001 §3.1, que queda así:

1. **Tecnología.**
   - HTML, CSS y JavaScript estándar, sin framework y sin paso de compilación.
   - **Una sola dependencia en tiempo de ejecución, three.js.** Añadir otra exige un ADR nuevo.
2. **Versión y procedencia.**
   - three.js (licencia MIT) se fija a una versión exacta. Se parte de 0.160.0, la del prototipo.
   - Figura en `package.json` con esa versión exacta y la integridad del `package-lock.json`.
   - Cambiar de versión es un PR de riesgo R2 propio.
3. **Servida por la app.**
   - Se incluye en `app/` una copia de `build/three.module.min.js` con su `LICENSE`, y se importa por ruta relativa. Así el despliegue de `app/` sigue sin paso de compilación.
   - Un test comprueba que la copia es idéntica, byte a byte, al fichero del paquete de la versión fijada.
   - El service worker la guarda en caché como el resto de la app (NFR-01).
4. **Sin módulos de `examples/jsm`.**
   - Los módulos de ejemplo importan `three` por nombre, y resolverlo exige un mapa de importación en línea. La CSP de ADR-0001 §3.4 lo bloquea. Ni la CSP ni el contenido de la copia se tocan.
   - Lo que el prototipo toma de ahí (`RoundedBoxGeometry`, para el brazo de la máquina) se escribe en el código de la app.
5. **Un solo renderizador.**
   - Hay un único `WebGLRenderer` sobre un lienzo fuera de la página, con `preserveDrawingBuffer`.
   - Cada tarjeta tiene su lienzo 2D y su grupo en la escena. Para pintar una tarjeta, se deja visible solo su grupo, se renderiza y se copia la imagen a su lienzo con `drawImage`.
   - Solo se repintan las tarjetas con una animación en curso o marcadas como pendientes.
   - Las miniaturas de las fichas de barra se pintan una vez con el mismo renderizador y se conservan en sus propios lienzos 2D, no como imágenes `data:` o `blob:`. Así la CSP de ADR-0001 §3.4 (`img-src 'self'`) no cambia.
6. **Robustez.**
   - Si WebGL no está disponible o falla al crearse, la app no carga el dibujo y sigue con la vista de solo texto (SPEC-CALC-003 FR-14).
   - Si se pierde el contexto, los lienzos 2D conservan lo pintado. Al recuperarlo, se rehace el entorno y se repintan todas las tarjetas (FR-15).
7. **La lógica sigue pura.**
   - El dibujo recibe el resultado del cálculo y no calcula nada.
   - La lógica sigue sin depender de three.js ni del DOM, y se prueba con `node --test` (ADR-0001 §3.7).

## 4. Consecuencias

- **Beneficios:**
  - el dibujo y la animación del prototipo, con un solo contexto WebGL;
  - la CSP y el "solo el propio origen" de ADR-0001 no cambian.
- **Costes aceptados:**
  - la primera carga añade unos 670 KB (unos 167 KB comprimidos con gzip); después se sirve desde la caché;
  - hay más código fuera de la lógica pura, que no se cubre con tests unitarios: el dibujo se comprueba con E2E (lienzo y etiqueta accesible, sin comparar píxeles) y a mano en el iPhone (SPEC-CALC-003 §11);
  - hay que mantener a mano la copia de three.js y lo que se reescribe de `examples/jsm`.
- **Riesgos y mitigaciones:**

  | Riesgo | Mitigación |
  | --- | --- |
  | El dibujo va pesado en el iPhone | Se mide en el iPhone 15 Pro Max con 6 series (SPEC-CALC-003 NFR-04). Si no basta, se reduce primero la resolución de las sombras. |
  | Se cuela una petición a terceros desde three.js | La CSP no cambia; el test de SPEC-CALC-001 AC-13 y `sw.test.js` cubren también la copia. |
  | La copia de three.js se modifica o no corresponde a su versión | Test de identidad con el paquete fijado (§3.3). |
  | WebGL no está disponible en Playwright | La vista sin WebGL se prueba forzando su ausencia. Está por comprobar si Chromium y WebKit sin pantalla, en la CI, crean el contexto. |
  | Una versión de three.js con un fallo de seguridad | Se sigue el registro de cambios de three.js; actualizar es un PR R2 (§3.2). |

- **Impacto:**
  - el PR de código que añade three.js es R2, porque añade una dependencia, y pasa la revisión de dependencias;
  - las fuentes Barlow (licencia OFL) son recursos estáticos, no código: se sirven desde la app como el resto (ADR-0001 §3.4) y no cuentan como dependencia;
  - SPEC-CALC-003 cita este ADR y no se fusiona antes que él.

## 5. Validación

- La CI está en verde, con el test de identidad de la copia y los de red de SPEC-CALC-001 AC-13.
- Los E2E de SPEC-CALC-003 AC-09, AC-10, AC-18 y AC-19 pasan.
- La prueba manual en el iPhone (SPEC-CALC-003 AC-23 y AC-24) pasa, con la versión de iOS anotada en el PR de código.

## 6. Seguimiento

- **Pendiente:** confirmar 0.160.0 o pasar a una versión más reciente antes del PR de código (la última publicada es 0.186.1, del 2026-09-24). Es una decisión de Víctor en la revisión de dependencias, y no cambia este ADR.
- **Revisar este ADR si:**
  - el rendimiento en el iPhone no basta;
  - iOS cambia su límite de contextos WebGL;
  - hace falta otra dependencia en tiempo de ejecución;
  - el peso de three.js deja de compensar.

## 7. Fuentes

Consultadas el 2026-10-26.

- [F1] Registro de npm, `three@0.160.0`: licencia MIT, publicada el 2023-12-22; `three@0.186.1`, publicada el 2026-09-24 (`npm view three`).
- [F2] Paquete `three-0.160.0.tgz` del registro de npm: `build/three.module.min.js` ocupa 670 681 bytes y 166 748 con gzip. `examples/jsm/geometries/RoundedBoxGeometry.js` importa `three` por nombre.
- El límite de contextos WebGL de iOS sale de las notas de diseño (§2.1) y no lo he contrastado con una fuente.
