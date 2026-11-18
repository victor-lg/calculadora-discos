---
id: ADR-0008
titulo: axe analiza sin animaciones en curso, y cómo se comprueba que una excepción ya no aparece
estado: Propuesto         # Propuesto | Aceptado | Rechazado | Sustituido
fecha: 2026-11-18
sustituye: null
sustituido_por: null
modifica: ["ADR-0007 (§3.3: en la forma admitida, una espera de solo lectura antes de analyze(); en la cobertura, los tests con el reloj parado; en las excepciones, el selector admitido, cuándo una ya no aparece y un test de la comparación; en las violaciones previas, que la espera no es una salida para una violación concreta)"]
referencias: ["ADR-0007", "SPEC-CALC-003", "VIC-31", "PR #55", "PR #56"]
---

<!--
Redactado por Claude (VIC-31). En el PR #56 (axe en los E2E), la función auxiliar espera a que
no haya animaciones antes de analizar, algo que ADR-0007 §3.3 no admite. Víctor decidió
formalizarlo en un ADR propio, fusionado antes que el #56, y aclarar a la vez la mejora I de la
ronda 1 de G4 del #56 (comentario de VIC-31, 2026-11-18). Recoge también el hueco del reloj
parado (hallazgo A de esa ronda), que Víctor decidió en el #56. Cambia solo los puntos de la
cabecera (`modifica`); el resto de ADR-0007 sigue vigente y no se edita. Fuentes en §7.
-->

# ADR-0008 — axe analiza sin animaciones en curso, y cómo se comprueba que una excepción ya no aparece

> No confundir con el ADR-0008 del workflow (herramientas de terceros).

## 1. Contexto

ADR-0007 §3.3 fija la única forma de analizar con axe en los E2E: una función auxiliar que hace `new AxeBuilder({ page }).analyze()` y después la comprobación, sin nada alrededor.

Al aplicarlo en el PR #56 salió una violación, `color-contrast`, en la tarjeta recién añadida mientras dura su fundido de entrada (SPEC-CALC-003 FR-10, 240 ms): axe medía el texto a media opacidad, con contrastes de 1,14 a 2,06. Salió con el dibujo 3D, en Chromium y en WebKit. Fuera del fundido no hay violación [F2].

Para que el análisis no caiga a media animación, la función auxiliar del #56 espera, antes de `analyze()`, a que `document.getAnimations()` esté vacío. Los dos revisores de la ronda 1 de G4 del #56 señalaron que eso va más allá de §3.3: no es ninguna de sus dos salidas para una violación previa (corregirla o escribir su excepción) y afecta a todas las llamadas [F1].

De la misma ronda salieron otros dos huecos de §3.3 [F1]:
- El test falla "si una excepción ya no aparece", pero no dice si se mide en cada llamada o en toda la ejecución. Medido en cada llamada, una excepción tendría que aparecer en todos los estados de todos los tests, y no se podría usar.
- Con `page.clock.pauseAt`, `analyze()` se cuelga hasta el tiempo máximo del test, en los dos navegadores. Los tests que paran el reloj (11 de `anadir-borrar.spec.js` y 8 de `dibujo.spec.js`) solo pueden analizar antes de pararlo, no después de cada acción, como pide la cobertura de §3.3. Víctor lo decidió así en el #56 [F2].

Sin esta decisión, el #56 no cumple ADR-0007 y no puede fusionarse.

Las animaciones de la app hoy son cortas y terminan solas: el fundido de entrada de FR-10 y FR-13 (240 ms), la salida y la vuelta de una tarjeta al soltarla (200 ms) y el cierre de su hueco (260 ms). Ninguna es infinita. Con "Reducir movimiento" no hay ninguna (FR-13) [F3].

## 2. Alternativas consideradas

### Espera antes del análisis

#### Opción A: esperar, solo leyendo, a que no haya animaciones

- **Ventajas:** el análisis no cae a media animación. No cambia la página.
- **Inconvenientes:** ningún estado intermedio de una animación o una transición CSS se analiza, en ninguna regla y en ningún elemento (§4). Suma a algunos análisis lo que quede de la animación en curso.

#### Opción B: excepción de `color-contrast` para la tarjeta que entra

- **Ventajas:** es una de las dos salidas que ya da ADR-0007 §3.3.
- **Inconvenientes:** la violación solo aparece si el análisis cae dentro de los 240 ms, así que sería intermitente. Con la lectura de "ya no aparece" que elige este ADR (§3, punto 3), una excepción intermitente hace fallar el test.

#### Opción C: analizar con "Reducir movimiento" o terminando las animaciones

- **Ventajas:** no hay que esperar.
- **Inconvenientes:** cambia la página para el análisis (emular la preferencia, `finish()`, `currentTime`, CSS inyectado), lo que ADR-0007 §3.3 prohíbe. Se analizaría una vista que no es la que se está probando.

#### Opción D: corregir la app

- **Inconvenientes:** que el texto a media opacidad durante 240 ms incumpla o no NFR-02 de SPEC-CALC-003 es una pregunta de la spec. Aunque se corrigiera, cualquier animación futura volvería a dar resultados que dependen del momento.

### Cuándo una excepción ya no aparece

- **Por llamada, en sentido literal** (lo que hace hoy el #56): la excepción tiene que salir en cada análisis. Falla de forma segura, pero no se puede usar.
- **Por ejecución:** la excepción tiene que salir en algún análisis de toda la ejecución. Los E2E corren en varios procesos, en dos navegadores y en tres trozos de la CI, y en local se lanzan a menudo solo algunos tests. Juntar los resultados exige un reporter o un paso más en `tests.yml`, y una ejecución parcial daría falsos fallos.
- **Por llamada, solo donde axe pudo verla:** la excepción ya no aparece cuando, en un análisis, axe evaluó esa regla en ese elemento y pasó. Si el elemento no está o la regla no se aplica a él, ese análisis no dice nada. Se decide en cada llamada, sin juntar nada. Exige que axe nombre siempre igual el elemento de la excepción (§3, punto 3).

## 3. Decisión

**Opción A, y "por llamada, solo donde axe pudo verla".**

1. **Espera antes del análisis.** Antes de `analyze()`, la función auxiliar de ADR-0007 §3.3 espera a que `document.getAnimations()` de la página bajo prueba esté vacío, y solo entonces analiza. Condiciones:
   - **Solo lee.** Ni la espera ni nada a su alrededor cambia la página: no pausa, termina, cancela ni acelera animaciones (`pause`, `finish`, `cancel`, `playbackRate`, `currentTime`), no emula "Reducir movimiento", no inyecta CSS ni mueve el reloj de la página. Lo demás de "Sin trampas alrededor" (ADR-0007 §3.3) se aplica igual a la espera.
   - **Tiempo máximo explícito.** La espera tiene su propio tiempo máximo, un número fijo escrito en la función auxiliar, de 5 s como mucho: unas 20 veces la animación más larga de hoy. No se reintenta ni se captura el error al agotarlo.
   - **Fallo claro ante una animación que no termina.** Si se agota el tiempo, el test falla con un mensaje que dice que se esperaba a que terminaran las animaciones antes de axe y cita este ADR, y el fallo muestra las animaciones que siguen en curso (el elemento y el nombre de la animación o la propiedad de la transición). El mensaje sale de la propia espera, sin capturar su error: por ejemplo, sondeando la lista de animaciones y comparándola con una lista vacía, con el mensaje y el tiempo máximo como opciones de la espera. Leer esos datos no cambia la página.
   - **Sin filtros.** La espera cuenta todas las animaciones del documento. No se ignora ninguna por nombre, elemento ni duración. Si la app necesita una animación infinita, la persona decide cómo se analiza esa vista, con un ADR nuevo.
   - **Elementos que solo viven dentro de una animación.** Si la app pasa a tener un elemento que aparece y desaparece dentro de una misma animación (por ejemplo, un aviso que entra, se queda y sale con una sola animación), la espera lo dejaría sin analizar sin fallar. Esa vista no se da por analizada con la espera: la persona decide cómo se analiza, con un ADR nuevo. Hoy no hay ninguno: el aviso de "Deshacer" se quita con un temporizador, no con una animación [F3].
   - **Lo que no garantiza.** Garantiza que no hay animaciones en curso al empezar `analyze()`, no que no empiece ninguna durante el análisis. Tampoco espera al dibujo 3D, que va con `requestAnimationFrame` y no aparece en `getAnimations()`; lo que axe no puede decidir sobre él sigue en `incomplete` (ADR-0007 §3.3). Como pide ADR-0007 §3.3, el análisis se llama después de comprobar el estado, y no en medio de un cambio que el test aún no ha comprobado.
2. **Tests con el reloj parado.** Un test que para el reloj de la página (`page.clock.pauseAt` o equivalente) analiza al llegar y justo antes de pararlo, con el reloj ya instalado, y no después. Es el único hueco de cobertura que se añade a los dos saltos de ADR-0007 §3.3. Condiciones:
   - el código que para el reloj cita este ADR;
   - lo que solo se ve con el reloj parado (por ejemplo, el aviso de "Deshacer", las tarjetas que salen o el dibujo animándose) se analiza también en algún test con tiempo real, y el PR que añada un test con el reloj parado lo comprueba;
   - parar el reloj para no tener que analizar no está admitido: el reloj se para solo cuando el AC que se prueba lo necesita.
3. **Excepciones.**
   - **Selector admitido.** El selector de una excepción es el `#id` de un elemento cuyo id es único en el documento. axe-core nombra así a ese elemento en todos los estados [F4]. La comparación exige que el `target` del nodo tenga un solo elemento y sea exactamente ese selector. Un elemento sin id único no puede llevar excepción hasta que lo tenga, y ponérselo es un cambio de la app, con su issue.
   - **Cuándo ya no aparece.** Se comprueba en cada llamada, solo donde axe pudo verla: el test falla si, en ese análisis, la regla de la excepción aparece entre las que pasan (`passes`) con un nodo cuyo `target` es el de la excepción. Si el elemento no está en la página, o la regla no se aplica o queda en `incomplete` para él, esa llamada no dice nada de la excepción.
   - Lo demás de "Excepciones" de ADR-0007 §3.3 no cambia: una violación que no coincide exactamente con una excepción hace fallar el test, en cualquier llamada.
   - Una violación que en un mismo elemento aparece en unos estados y no en otros no puede llevar excepción: con esta lectura, hace fallar el test en los estados en que pasa. Se corrige o se decide en un ADR nuevo.
   - El PR que añada la primera excepción añade también un test unitario de la comparación con las excepciones.
4. **Qué cambia de ADR-0007 §3.3.**
   - "Cobertura": se admite el hueco del punto 2.
   - "Forma admitida": entre la llamada a la función auxiliar y `analyze()` se admite la espera del punto 1, y nada más.
   - "Excepciones": el selector admitido, cuándo una excepción ya no aparece y el test de la comparación, como dice el punto 3.
   - "Violaciones previas": la espera es una regla general sobre el momento del análisis, no una tercera salida para una violación concreta. Una violación previa que se vea sin animaciones en curso sigue teniendo solo las dos salidas de ADR-0007.
   - Lo demás de ADR-0007 sigue igual.

## 4. Consecuencias

- **Beneficios:**
  - El análisis no cae a media animación.
  - Las excepciones se pueden usar sin juntar resultados entre procesos, navegadores ni trozos de la CI.
  - Los tests con el reloj parado tienen una regla escrita, en vez de un desvío que solo consta en el baseline.
- **Costes aceptados:**
  - Ningún estado intermedio de una animación o una transición CSS se analiza con axe, en ninguna regla. Lo señalaron los dos revisores de la ronda 1 del #56 [F1]. Una violación que solo exista durante una animación no la verá axe; los tests propios de AC-20 a AC-22 siguen como estaban.
  - Si el test comprueba un estado que dura lo que una animación (por ejemplo, la tarjeta que sale al soltarla), axe analiza el estado que queda después, que puede no ser el que el test comprobó.
  - Lo que solo se ve con el reloj parado depende de que otro test con tiempo real lo analice (punto 2).
  - Los análisis que coinciden con una animación esperan lo que quede de ella, hoy 260 ms como mucho. Con más de 300 llamadas, el #56 mide el tiempo total frente al aviso de 12 min de ADR-0007 §6. Donde un plazo de la app tiene que seguir corriendo para el paso siguiente, el análisis va después de ese paso.
  - Una excepción deja de comprobarse en silencio si su elemento desaparece de la app, si la regla pasa a no aplicarse o a quedar en `incomplete` para él, o si solo existe en estados que ningún test analiza. Mientras siga escrita, cubre esa regla en ese elemento. La revisión del PR que cambie ese elemento la retira.
  - Un elemento sin id único no puede llevar excepción (punto 3).
  - La regla la sigue comprobando la revisión del PR, sin un control automático.
- **Riesgos y mitigaciones:**

  | Riesgo | Mitigación |
  | --- | --- |
  | La espera se convierte en una forma de esquivar axe (una animación hecha a propósito para que el análisis no llegue, una espera que cambie la página, un elemento que vive solo dentro de una animación) | Una animación que no termina hace fallar el test, no lo salta. La espera solo lee y no filtra animaciones. Un elemento que vive solo dentro de una animación no se da por analizado (punto 1). La revisión lo comprueba. |
  | Una animación que empieza durante `analyze()` vuelve a dar resultados que dependen del momento | Se analiza después de comprobar el estado (ADR-0007 §3.3). Hoy las animaciones de la app empiezan por acciones del usuario. |
  | Una animación larga alarga mucho los E2E | El tiempo máximo de 5 s por análisis. Una animación que lo pase hace fallar el test. |
  | Se para el reloj para no analizar | Solo cuando el AC lo necesita, con el código citando este ADR y lo que se ve analizado en otro test (punto 2). |
  | Una excepción tapa una violación en otro elemento | Solo `#id` único, que axe usa tal cual, y un `target` de un solo elemento (punto 3). |

- **Impacto:** `tests/e2e/axe.js` y los `pararReloj` de `anadir-borrar.spec.js` y `dibujo.spec.js`, en el PR #56, que alinea la espera, su comentario y las citas con este ADR. Este ADR no cambia la app.

## 5. Validación

- **En el #56:** según su baseline, con la espera la violación de `color-contrast` del fundido de FR-10 deja de salir, y fuera del fundido no hay otra [F2].
- **Antes de fusionar el #56:** la espera cumple el punto 1 (solo lectura, tiempo máximo fijo, mensaje y sin filtros), los tests con el reloj parado, el punto 2, y la comprobación de excepciones, el punto 3. Lo mira la ronda 2 de G4 del #56, con su CI en verde.

## 6. Seguimiento

Se revisa este ADR si:
- la app pasa a tener una animación infinita, más larga que el tiempo máximo, o un elemento que vive solo dentro de una animación;
- alguna violación real resulta estar solo en un estado intermedio de una animación;
- axe deja de funcionar con el reloj parado, o lo que se ve con él deja de analizarse en algún test con tiempo real;
- axe o Playwright ofrecen una forma, sin tocar la página, de analizar en un momento fijo de una animación o con el reloj parado.

## 7. Fuentes

Consultadas el 2026-11-18.

- [F1] Reconciliación de la ronda 1 de G4 del PR #56, hallazgos A, B e I, con las respuestas de los dos revisores: https://github.com/victor-lg/calculadora-discos/pull/56#issuecomment-6977588400
- [F2] `docs/baseline-controles.md`, "M27: axe en los E2E (ADR-0007)", en la rama `test/vic-31-axe` (`6c2d778`): la violación, la espera y el reloj parado.
- [F3] `app/js/app.js` (`entrar`, `cerrarHueco` y el aviso de "Deshacer") y `app/css/estilos.css` (`.serie.sale`, `.serie.vuelve`, `.deslizable.se-cierra`) de `main` (`06dac50`).
- [F4] `axe-core` 4.14.0, `node_modules/axe-core/axe.js`: `generateSelector` usa el `#id` de un elemento cuando ese id es único en su documento (`getElmId`); si no, combina clases, atributos y `:nth-child`, que cambian con el resto de la página.
