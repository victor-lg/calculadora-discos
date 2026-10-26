---
id: ADR-0003
titulo: Dibujo 3D en vivo con three.js y un solo renderizador
estado: Aceptado          # Propuesto | Aceptado | Rechazado | Sustituido
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
Revisado en G4 en el PR #17 (dos revisores, sin nada que corregir tras bcb26c3).
Aceptado con el merge del PR #17.
-->

# ADR-0003 — Dibujo 3D en vivo con three.js y un solo renderizador

## 1. Contexto

SPEC-CALC-003 (PR #16) pide que cada tarjeta de serie dibuje en 3D su carga y la anime al cambiar (FR-07, FR-11 a FR-13). También pide que la app funcione sin WebGL (FR-14) y que se recupere si pierde el contexto gráfico (FR-15). Puede haber muchas tarjetas a la vez.

Las restricciones vigentes son:

- **ADR-0001 §3.1:** HTML, CSS y JavaScript estándar, sin paso de compilación y con **cero dependencias en tiempo de ejecución**. Esta regla impide usar cualquier librería 3D.
- **ADR-0001 §3.4:** ningún recurso de terceros (ninguna petición fuera del propio origen), y una CSP en `<meta>` con `script-src 'self'`, sin scripts en línea. SPEC-CALC-001 NFR-01 y NFR-02 piden además funcionar sin conexión y no salir del propio origen.
- **Contextos WebGL:** WebKit limita los contextos WebGL activos por página a 16. Al crear uno más, descarta el más antiguo, y ese contexto no se puede recuperar [F3]. La fuente es el código de WebKit para macOS; no he confirmado que iOS use la misma cifra (las notas de diseño, §2.1, hablan de 8 a 16). SPEC-CALC-003 no pone tope a la lista de series (§6).
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
- **Inconvenientes:** como la lista de series no tiene tope, pasado el límite de contextos de WebKit [F3] los dibujos más antiguos se pierden sin recuperación. Una variante que solo crea contextos para las tarjetas visibles evita el límite, pero obliga a crear y destruir contextos al desplazarse, y cada contexto nuevo recompila sombreadores y rehace el entorno. Con las 6 series con que se mide el rendimiento (SPEC-CALC-003 NFR-04), B funcionaría; la descarta que la spec admite más.

### Opción C: WebGL escrito a mano, sin librería

- **Ventajas:** mantiene las cero dependencias.
- **Inconvenientes:** hay que reescribir materiales físicos, entorno PMREM, sombras y tono de salida. Estimo, sin haberlo medido, miles de líneas fuera de la lógica pura y sin tests, para obtener lo que three.js ya da probado. Una librería WebGL más ligera tendría el mismo problema con esos materiales, y una versión recortada de three.js exige un paso de compilación, que ADR-0001 §3.1 descarta.

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
   - **Una sola dependencia en tiempo de ejecución, three.js.** Añadir otra exige un ADR nuevo. Esto deja sin efecto también el "cero dependencias en tiempo de ejecución" de los beneficios de ADR-0001 §4.
2. **Versión y procedencia.**
   - three.js (licencia MIT) se fija a una versión exacta. Se parte de 0.160.0, la del prototipo; la elección final se hace en el PR de código (§6).
   - Figura en `dependencies` de `package.json`, con esa versión exacta y la integridad del `package-lock.json`. La app no la usa desde `node_modules`: está ahí para que el test de identidad (§3.3) tenga con qué comparar. Playwright sigue siendo la única dependencia de desarrollo (ADR-0001 §3.7).
   - Elegir o cambiar de versión es un PR de riesgo R2 propio. En ese PR se repiten las comprobaciones de [F2] (peso y cadenas de `sw.test.js`) sobre la versión elegida y se revisan sus avisos de seguridad (`npm audit` y los avisos de GitHub del paquete).
3. **Servida por la app.**
   - Se incluye una copia de `build/three.module.min.js` en `app/vendor/three/three.module.min.js`, con su `LICENSE` en `app/vendor/three/LICENSE`, y se importa por ruta relativa. Así el despliegue de `app/` sigue sin paso de compilación. Es código de terceros servido desde el propio origen: no hace peticiones fuera de él, así que es compatible con ADR-0001 §3.4.
   - Un test comprueba que la copia es idéntica, byte a byte, al fichero del paquete de la versión fijada.
   - El service worker la guarda en caché como el resto de la app (NFR-01).
   - **Tests estáticos de `tests/unit/sw.test.js`.** Comprobado sobre la copia de 0.160.0 [F2b]:
     - pasa la regla de `innerHTML`, `insertAdjacentHTML` y `outerHTML`, y la de API de red de SPEC-CALC-001 AC-13 (cookies, `sendBeacon`, `WebSocket`, `XMLHttpRequest`, `importScripts`, `import(` y demás). Estas siguen aplicándose a la copia;
     - no pasa la regla de URL absolutas: contiene `http://` una vez y `https://` dos. **Solo esa regla** deja de aplicarse, y solo a la ruta exacta `app/vendor/three/three.module.min.js`;
     - las reglas de la interfaz (`fetch`, `.src=`, `location`, nombres de elementos) solo se aplican, hoy como antes, a `app/js/`. La copia no está en `app/js/` y contiene `fetch` 5 veces, `.data=` 8, `.src=` 1 y `location =` 1, todas en sus cargadores, que la app no usa. Lo cubren la CSP (`connect-src 'self'`, `img-src 'self'`), el test de identidad y el E2E de red de SPEC-CALC-001 AC-13;
     - el resto de `app/`, incluido el código nuevo del dibujo, sigue sujeto a todas las reglas. No se abre ninguna otra excepción, ni por carpeta ni por extensión.

     Víctor decidió excluir la copia (2026-10-26); tras la revisión G4, la exclusión se limita a la única regla que falla. El cambio de `sw.test.js` va en el PR de código R2, con este apartado como motivo.
4. **Sin módulos de `examples/jsm`.**
   - Los módulos de ejemplo importan `three` por nombre, y resolverlo exige un mapa de importación en línea. La CSP de ADR-0001 §3.4 lo bloquea. Ni la CSP ni el contenido de la copia se tocan.
   - Lo que el prototipo toma de ahí (`RoundedBoxGeometry`, para el brazo de la máquina) se escribe en el código de la app.
5. **Un solo renderizador.**
   - Hay un único contexto WebGL para toda la app, fuera de la página.
   - Cada tarjeta, y cada miniatura de las fichas de barra, tiene su propio lienzo 2D, donde se copia lo que pinta ese renderizador. El lienzo 2D conserva lo pintado aunque se pierda el contexto WebGL.
   - Solo se repintan las tarjetas que lo necesitan (con una animación en curso o con la carga cambiada).
   - Las miniaturas no se guardan como imágenes `data:` o `blob:`, así que la CSP (`img-src 'self'`) no cambia.

   Cómo se reparte la escena y se copia cada tarjeta es parte del plan del PR de código, no de este ADR.
6. **Robustez.**
   - Si WebGL no está disponible o falla al crearse, la app no carga el dibujo y sigue con la vista de solo texto (SPEC-CALC-003 FR-14).
   - Si se pierde el contexto, los lienzos 2D conservan lo pintado. Al recuperarlo, se rehace el entorno y se repintan todas las tarjetas. Si no se recupera, se aplica SPEC-CALC-003 FR-15 (vista de FR-14 hasta el siguiente arranque).
7. **La lógica sigue pura.**
   - El dibujo recibe el resultado del cálculo y no calcula nada.
   - La lógica sigue sin depender de three.js ni del DOM, y se prueba con `node --test` (ADR-0001 §3.7).

## 4. Consecuencias

- **Beneficios:**
  - el dibujo y la animación del prototipo, con un solo contexto WebGL;
  - la CSP y el "solo el propio origen" de ADR-0001 no cambian.
- **Costes aceptados:**
  - la primera carga añade el peso de la versión fijada (hoy, 0.160.0: unos 670 KB, unos 167 KB comprimidos con gzip); después se sirve desde la caché;
  - hay más código fuera de la lógica pura, que no se cubre con tests unitarios: el dibujo se comprueba con E2E (lienzo y etiqueta accesible, sin comparar píxeles) y a mano en el iPhone (SPEC-CALC-003 §11);
  - hay que mantener a mano la copia de three.js y lo que se reescribe de `examples/jsm`.
- **Riesgos y mitigaciones:**

  | Riesgo | Mitigación |
  | --- | --- |
  | El dibujo va pesado en el iPhone | Se mide en el iPhone 15 Pro Max con 6 series (SPEC-CALC-003 NFR-04). Si no basta, se reduce primero la resolución de las sombras. |
  | Se cuela una petición a terceros desde three.js | La CSP no cambia y bloquea cualquier petición fuera del origen; el E2E de SPEC-CALC-001 AC-13 lo comprueba en uso. La copia sigue sujeta a las reglas de red de `sw.test.js` salvo la de URL (§3.3). El test de identidad prueba que es la del paquete fijado, no que el paquete sea inocuo: eso lo cubren la CSP y la revisión de avisos de seguridad de cada versión (§3.2). |
  | La copia de three.js se modifica o no corresponde a su versión | Test de identidad con el paquete fijado (§3.3). |
  | Los E2E del dibujo pasan en falso sin WebGL en la CI | En local, Chromium de Playwright crea WebGL2 por software (SwiftShader) y WebKit también lo crea, sin pantalla [F4]. En la CI, cada E2E del dibujo comprueba antes que el dibujo 3D está activo y **falla** si no lo está, en lugar de saltarse. Si la CI no lo ofrece, se arregla la CI, no el test. La vista sin WebGL se prueba aparte, forzando su ausencia. |
  | Una versión de three.js con un fallo de seguridad | Cada PR R2 de elección o cambio de versión revisa sus avisos de seguridad (§3.2). Las alertas de Dependabot del repositorio avisarían de los fallos publicados entre versiones; no he comprobado si están activadas, y activarlas es decisión de Víctor. |

- **Impacto:**
  - `tests/unit/sw.test.js` deja de aplicar solo su regla de URL absolutas, y solo a la copia de three.js (§3.3). Lo decidió Víctor el 2026-10-26;
  - el dibujo plano de las fichas sin WebGL (SPEC-CALC-003 FR-14) se hace con lienzo 2D, porque `sw.test.js` prohíbe crear elementos `svg` o `img` desde `app/js/`;
  - el PR de código que añade three.js es R2, porque añade una dependencia, y pasa la revisión de dependencias;
  - SPEC-CALC-003 cita este ADR y no se fusiona antes que él.

## 5. Validación

- La CI está en verde, con el test de identidad de la copia y los de red de SPEC-CALC-001 AC-13.
- Los E2E de SPEC-CALC-003 AC-09, AC-10, AC-15 a AC-17 y AC-19 se ejecutan, con el dibujo 3D activo, en Chromium y WebKit, y pasan. AC-18 pasa con WebGL forzado a no estar disponible.
- Un E2E crea 20 series, más que el límite de contextos de WebKit [F3], y comprueba que la app crea un solo contexto WebGL y que todas las tarjetas tienen su dibujo.
- La prueba manual en el iPhone (SPEC-CALC-003 AC-23 y AC-24) pasa, con la versión de iOS anotada en el PR de código.

## 6. Seguimiento

- **Pendiente:** confirmar 0.160.0 o pasar a una versión más reciente (la última publicada es 0.186.1, del 2026-09-24). Lo decide Víctor en el PR de código R2, con las comprobaciones de §3.2. Las cifras de este ADR son de 0.160.0; si cambia la versión, valen las que ese PR mida.
- **Revisar este ADR si:**
  - el rendimiento en el iPhone no basta;
  - el límite de contextos de iOS resulta ser otro y cambia el balance con la opción B;
  - hace falta otra dependencia en tiempo de ejecución;
  - el peso de three.js deja de compensar.

## 7. Fuentes

Consultadas el 2026-10-26.

- [F1] Registro de npm, `three@0.160.0`: licencia MIT, publicada el 2023-12-22; `three@0.186.1`, publicada el 2026-09-24 (`npm view three`).
- [F2] Paquete `three-0.160.0.tgz` del registro de npm: `build/three.module.min.js` ocupa 670 681 bytes y 166 748 con gzip. `examples/jsm/geometries/RoundedBoxGeometry.js` importa `three` por nombre. `three.module.min.js` contiene 3 veces `://`, 3 veces `fetch(` y 1 vez `.src=`, comprobado con `grep` sobre el paquete (detalle por regla en [F2b]).
- [F2b] Las mismas expresiones regulares de `tests/unit/sw.test.js`, aplicadas con Node sobre `three.module.min.js` de 0.160.0: `innerHTML`, 0; URL absolutas, 3 (`http://` 1 y `https://` 2); API de red de AC-13, 0; reglas de la interfaz, 15 (`fetch` 5, `.data=` 8, `.src=` 1 y `location =` 1).
- [F3] WebKit, commit 70e10861, "Creating a large number of WebGL contexts should recycle older contexts" (bug 156689): límite de 16 contextos activos en macOS; se descarta el más antiguo y no se puede recuperar. <https://webkit.googlesource.com/WebKit/+/70e10861eb2fbd9d0862fd8702874c25ae5d8bfd> y <https://bugs.webkit.org/show_bug.cgi?id=156689>. No confirma la cifra en iOS.
- [F4] Comprobación local del 2026-10-26 con los navegadores de Playwright del repositorio, sin pantalla: Chromium, `webgl2`, "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))"; WebKit, `webgl2`. Falta comprobarlo en el contenedor de la CI.
