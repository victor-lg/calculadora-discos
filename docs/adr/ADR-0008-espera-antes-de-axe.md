---
id: ADR-0008
titulo: axe analiza sin animaciones en curso, y cómo se comprueba que una excepción ya no aparece
estado: Propuesto         # Propuesto | Aceptado | Rechazado | Sustituido
fecha: 2026-11-18
sustituye: null
sustituido_por: null
modifica: ["ADR-0007 (§3.3: en la forma admitida, una espera de solo lectura antes de analyze(); en la cobertura, dos huecos, los estados que solo existen durante animaciones y los tests con el reloj parado; en las excepciones, el selector admitido, cuándo una ya no aparece, una comparación por nodo fuera de la función auxiliar y su test; en las violaciones previas, que la espera no es una salida para una violación concreta)"]
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
- Con `page.clock.pauseAt`, `analyze()` se cuelga hasta el tiempo máximo del test, en los dos navegadores (una medición del #56). Los tests que paran el reloj (11 de `anadir-borrar.spec.js` y 8 de `dibujo.spec.js`) solo pueden analizar antes de pararlo, no después de cada acción, como pide la cobertura de §3.3. Víctor lo decidió así en el #56 [F2].

Sin esta decisión, el #56 no cumple ADR-0007 y no puede fusionarse.

Las animaciones de la app hoy son cortas y terminan solas [F3]:
- el fundido de entrada de FR-10 y FR-13 (240 ms);
- la salida y la vuelta de una tarjeta al soltarla (200 ms);
- el cierre del hueco de la tarjeta que sale (260 ms), que empieza al terminar su salida o, si esa transición no avisa, con un temporizador de 400 ms; si el cierre tampoco avisa, otro temporizador lo da por hecho a los 450 ms. La cadena dura unos 460 ms por la vía normal y hasta unos 850 ms por la de los temporizadores.

Ninguna es infinita ni tiene `fill`. Con "Reducir movimiento" no hay ninguna (FR-13). La app tiene además plazos que los tests miden: 400 ms para empezar a animar el dibujo (FR-11), 500 ms para la pulsación larga (FR-08), 3 s para recuperar el dibujo (FR-15) y 5 s para el aviso de "Deshacer" (FR-08). En la CI, con el dibujo por software, un fotograma puede pasar de medio segundo [F3].

## 2. Alternativas consideradas

### Espera antes del análisis

#### Opción A: esperar en la función auxiliar, solo leyendo, a que no haya animaciones

- **Ventajas:** el análisis no cae a media animación, en ninguna llamada. No cambia la página.
- **Inconvenientes:** ningún estado intermedio de una animación o una transición CSS se analiza, en ninguna regla y en ningún elemento (§4). Suma a algunos análisis lo que quede de la animación en curso.

#### Opción B: esperar en cada test la animación que provoca

- **Ventajas:** más estrecha: solo espera donde el test sabe que hay una animación.
- **Inconvenientes:** más código en cada test, y es fácil olvidarla. Una espera olvidada da resultados que dependen del momento, que es justo el problema.

#### Opción C: excepción de `color-contrast` para la tarjeta que entra

- **Ventajas:** es una de las dos salidas que ya da ADR-0007 §3.3.
- **Inconvenientes:** la violación solo aparece si el análisis cae dentro de los 240 ms, así que sería intermitente. Con la lectura de "ya no aparece" que elige este ADR (§3, punto 3), una excepción intermitente hace fallar el test.

#### Opción D: analizar con "Reducir movimiento" o terminando las animaciones

- **Ventajas:** no hay que esperar.
- **Inconvenientes:** cambia la página para el análisis (emular la preferencia, `finish()`, `currentTime`, CSS inyectado): se analizaría una vista que no es la que se está probando.

#### Opción E: corregir la app

- **Ventajas:** quita de raíz la violación del fundido, si es una violación.
- **Inconvenientes:** que el texto a media opacidad durante 240 ms incumpla o no NFR-02 de SPEC-CALC-003 es una pregunta de la spec (§6). Aunque se corrigiera, cualquier animación futura volvería a dar resultados que dependen del momento.

### Tests con el reloj parado

- **Reanudar el reloj para analizar y volver a pararlo,** o **avanzarlo sin pararlo** (`runFor` sin `pauseAt`): mueven el reloj de la página para el análisis, lo que el punto 1 prohíbe, y cambian lo que el test mide.
- **Analizar hasta pararlo y no después** (la elegida): no toca el reloj. Lo que se ve con él parado se analiza en tests con tiempo real.

### Cuándo una excepción ya no aparece

- **Por llamada, en sentido literal** (lo que hace hoy el #56): la excepción tiene que salir en cada análisis. Falla de forma segura, pero no se puede usar.
- **Por ejecución:** la excepción tiene que salir en algún análisis de toda la ejecución. Los E2E corren en varios procesos, en dos navegadores y en tres trozos de la CI, y en local se lanzan a menudo solo algunos tests. Juntar los resultados exige un reporter o un paso más en `tests.yml`, y una ejecución parcial daría falsos fallos.
- **Por llamada, solo donde axe pudo verla:** la excepción ya no aparece cuando, en un análisis, axe evaluó esa regla en ese elemento y pasó. Si el elemento no está o la regla no se aplica a él, ese análisis no dice nada. Se decide en cada llamada, sin juntar nada. Exige que axe nombre siempre igual el elemento de la excepción (§3, punto 3).

## 3. Decisión

**Opción A, analizar hasta parar el reloj, y "por llamada, solo donde axe pudo verla".**

1. **Espera antes del análisis.** Antes de `analyze()`, la función auxiliar de ADR-0007 §3.3 espera a que `document.getAnimations()` de la página bajo prueba esté vacío, y solo entonces analiza. Condiciones:
   - **Solo lee.** Ni la espera ni nada a su alrededor cambia la página: no pausa, termina, cancela ni acelera animaciones (`pause`, `finish`, `cancel`, `playbackRate`, `currentTime`), no emula "Reducir movimiento", no inyecta CSS ni mueve el reloj de la página. Lo demás de "Sin trampas alrededor" (ADR-0007 §3.3) se aplica igual a la espera.
   - **Tiempo máximo explícito, de 2 s.** Es una constante con nombre en la función auxiliar, pasada como tiempo máximo de la propia espera, no el de `expect` por defecto. Son más del doble de la cadena de animaciones más larga de hoy (unos 850 ms). La espera sondea hasta ese tiempo máximo; no se reintenta la espera entera ni se captura su error al agotarlo.
   - **Fallo claro ante una animación que no termina.** Si se agota el tiempo, el test falla con un mensaje que dice que se esperaba a que terminaran las animaciones antes de axe y cita «ADR-0008 de la calculadora». El fallo muestra las animaciones que siguen en curso, con datos que solo se leen. El mensaje sale de la propia espera, sin capturar su error.
   - **Sin filtros.** La espera cuenta todas las animaciones del documento. No se ignora ninguna por nombre, elemento ni duración. Una animación infinita, o una que se queda en la lista al terminar (`fill: forwards` o `both`), hace fallar el test; si la app la necesita, la persona decide cómo se analiza esa vista, con un ADR nuevo.
   - **Estados que solo existen mientras hay animaciones.** Un elemento o estado que solo existe mientras `getAnimations()` no está vacío, sea por una animación o por varias encadenadas, no se analiza con axe: la espera llega cuando ya no está. Es un hueco de cobertura (punto 4). Hoy es el caso de la tarjeta que sale, cuyo contenido y controles se analizan antes de soltarla. Si la app añade otro con contenido o controles que no se analizan en ningún estado sin animaciones en curso (por ejemplo, un aviso que entra, se queda y sale con animaciones), esa vista no se da por analizada con la espera: la persona decide cómo se analiza, con un ADR nuevo. El aviso de "Deshacer" de hoy se quita con un temporizador, no con una animación [F3].
   - **Plazos de la app.** Donde un plazo de la app tiene que seguir corriendo para el paso siguiente del test (por ejemplo, el aviso de "Deshacer" para pulsarlo), el análisis va después de ese paso, no antes. Donde lo analizado es un estado que caduca con un plazo de la app (por ejemplo, el aviso), el test vuelve a comprobar ese estado después del análisis, para que falle si caducó antes. La revisión lo comprueba.
   - **Después de comprobar el estado.** Como pide ADR-0007 §3.3, el análisis se llama después de comprobar el estado, no en medio de un cambio que el test aún no ha comprobado.
   - **Lo que no garantiza.**
     - Que no empiece una animación durante el análisis: solo que no hay ninguna en curso al empezar `analyze()`. Una animación encadenada (como el cierre del hueco, por cualquiera de sus dos vías) puede empezar después, si entre una y otra hay un instante sin animaciones.
     - Esperar a lo que no aparece en `getAnimations()` del documento principal: animaciones hechas con JavaScript (`requestAnimationFrame` o temporizadores que cambian estilos, como el dibujo 3D) y lo que pase en iframes. Lo que axe no puede decidir sobre el dibujo sigue en `incomplete` (ADR-0007 §3.3). Una animación nueva de la app hecha con JavaScript que cambie lo que axe mide (opacidad, color, tamaño) se trata como una animación que no termina: la persona decide, con un ADR nuevo.
2. **Tests con el reloj parado.** Mientras el reloj de la página está parado (desde `page.clock.pauseAt` hasta `page.clock.resume`, si lo hay), `analyze()` no funciona y el test no analiza. Avanzar el reloj parado (`runFor`, `fastForward`, `setSystemTime`) no cuenta como reanudarlo. `page.clock.setFixedTime` no para los temporizadores y no es reloj parado: con él se analiza como siempre [F5]. Es un hueco de cobertura (punto 4). Condiciones:
   - antes de parar el reloj, el test analiza como siempre: al llegar y tras cada acción que cambia lo que se ve, también tras instalarlo (`page.clock.install`), y justo antes de pararlo; tras `resume`, vuelve la cobertura normal;
   - el código que para el reloj cita este ADR y nombra, en su comentario, el test con tiempo real que analiza cada estado que se ve con el reloj parado: los que quedan en pantalla con `getAnimations()` vacío (por ejemplo, el aviso de "Deshacer") y el dibujo animándose. El #56 lo escribe para los 19 tests con el reloj parado que ya existen. Lo que solo existe mientras hay animaciones no entra aquí: es el hueco del punto 1;
   - el reloj se para solo cuando el AC que se prueba lo necesita, nunca para no tener que analizar.
3. **Excepciones.**
   - **Selector admitido.** El selector de una excepción es el `target` que da axe para un elemento con un id único en el documento: `#` y el id, escapado como lo escribe axe. Se copia del resultado de axe, no se escribe a mano. axe-core nombra así a ese elemento en todos los estados mientras su id siga siendo único [F4]. Un elemento sin id único no puede llevar excepción hasta que lo tenga, y ponérselo es un cambio de la app, con su issue.
   - **Comparación por nodo.** Un nodo de una violación está cubierto si hay una excepción con la misma regla y su `target` tiene un solo elemento, exactamente el selector de la excepción. Una violación pasa si todos sus nodos están cubiertos, cada uno por la excepción que le corresponda, y tiene al menos un nodo.
   - **Cuándo ya no aparece.** Se comprueba en cada llamada, solo donde axe pudo verla: el test falla si, en ese análisis, la regla de la excepción aparece entre las que pasan (`passes`) con un nodo cuyo `target` es el de la excepción. Si el elemento no está en la página, o la regla no se aplica o queda en `incomplete` para él, esa llamada no dice nada de la excepción.
   - Lo demás de "Excepciones" de ADR-0007 §3.3 no cambia: una violación que no está cubierta hace fallar el test, en cualquier llamada.
   - Una violación que en un mismo elemento aparece en unos estados y no en otros no puede llevar excepción: con esta lectura, hace fallar el test en los estados en que pasa. Se corrige o se decide en un ADR nuevo.
   - **Dónde vive y su test.** La lista de excepciones y la comparación viven en un módulo propio que se puede importar sin Playwright ni axe, y la función auxiliar las usa. El PR que añada la primera excepción añade un test unitario que comprueba, como mínimo: que un nodo con la misma regla y el mismo `target` de un elemento está cubierto; que no lo está con otra regla, otro selector o un `target` de dos elementos; que una violación sin nodos no pasa; que una violación con nodos de dos excepciones de la misma regla pasa; y que el id de cada excepción existe en `app/`.
4. **Qué cambia de ADR-0007 §3.3.**
   - "Cobertura": se admiten dos huecos, además de los dos saltos que ya había: los estados que solo existen mientras hay animaciones (punto 1) y los tests mientras el reloj está parado (punto 2).
   - "Forma admitida": entre la llamada a la función auxiliar y `analyze()` se admite la espera del punto 1, y nada más.
   - "Excepciones": el selector admitido, la comparación por nodo, cuándo una excepción ya no aparece, y que la lista y la comparación viven en un módulo que usa la función auxiliar, con su test, como dice el punto 3. Siguen aplicándose de una sola forma.
   - "Violaciones previas": la espera es una regla general sobre el momento del análisis, no una tercera salida para una violación concreta. Una violación previa que se vea sin animaciones en curso sigue teniendo solo las dos salidas de ADR-0007.
   - Lo demás de ADR-0007 sigue igual.

## 4. Consecuencias

- **Beneficios:**
  - El análisis no cae a media animación.
  - Las excepciones se pueden usar sin juntar resultados entre procesos, navegadores ni trozos de la CI.
  - Los tests con el reloj parado tienen una regla escrita, en vez de un desvío que solo consta en el baseline.
- **Costes aceptados:**
  - Ningún estado intermedio de una animación o una transición CSS se analiza con axe, en ninguna regla. Lo señalaron los dos revisores de la ronda 1 del #56 [F1]. Una violación que solo exista durante una animación no la verá axe; los tests propios de AC-20 a AC-22 siguen como estaban.
  - Lo que solo existe mientras hay animaciones no se analiza nunca. Hoy, la tarjeta que sale, entre que se suelta y que se borra.
  - Si el test comprueba un estado que dura lo que una animación (por ejemplo, la tarjeta que sale al soltarla), axe analiza el estado que queda después, que puede no ser el que el test comprobó.
  - Lo que se ve con el reloj parado depende de que otro test con tiempo real lo analice (punto 2). Si ese test cambia, solo lo ve la revisión, por el comentario que lo nombra.
  - Un estado con plazo se puede quedar sin analizar si caduca durante la espera; el test lo detecta porque vuelve a comprobarlo después (punto 1), y entonces falla.
  - Los análisis que coinciden con una animación esperan lo que quede de ella: hoy, como mucho, la cadena de la tarjeta que sale. Con más de 300 llamadas, el #56 mide el tiempo total frente al aviso de 12 min de ADR-0007 §6.
  - Los 2 s salen de las duraciones nominales. Si la CI, con el dibujo por software, tarda más en dar por terminadas las animaciones, el fallo es ruidoso pero intermitente. Lo mide el #56 (§5).
  - Una excepción deja de comprobarse en silencio si su elemento desaparece de la app, si la regla pasa a no aplicarse o a quedar en `incomplete` para él, o si solo existe en estados que ningún test analiza. Mientras siga escrita, cubre esa regla en ese elemento. La revisión del PR que cambie ese elemento la retira; si el id desaparece de `app/`, el test unitario falla.
  - Una excepción cubre cualquier violación de su regla en su elemento, en todos los estados, aunque cambie el motivo. Si su id pasa a otro elemento, cubre ese otro. En las reglas que se evalúan sobre un contenedor y fallan por sus hijos (por ejemplo, `list` o `aria-required-children`), eso incluye un hijo nuevo. Ya era así en ADR-0007; con un `#id` estable, la cobertura llega a todos los estados.
  - Un elemento sin id único no puede llevar excepción (punto 3).
  - La regla la sigue comprobando la revisión del PR, sin un control automático.
- **Riesgos y mitigaciones:**

  | Riesgo | Mitigación |
  | --- | --- |
  | La espera se convierte en una forma de esquivar axe (una animación hecha a propósito para que el análisis no llegue, una espera que cambie la página, un estado que vive solo dentro de animaciones) | Una animación que no termina en 2 s hace fallar el test, no lo salta. La espera solo lee y no filtra animaciones. Un estado nuevo con contenido o controles que no se analizan sin animaciones no se da por analizado (punto 1). La revisión lo comprueba. |
  | Una animación que empieza durante `analyze()` vuelve a dar resultados que dependen del momento | Se analiza después de comprobar el estado (ADR-0007 §3.3). Hoy solo el cierre del hueco puede empezar así. |
  | La espera deja caducar un plazo de la app antes del análisis | El análisis va después del paso que necesita el plazo, y el estado con plazo se vuelve a comprobar después del análisis (punto 1). |
  | Se para el reloj para no analizar | Solo cuando el AC lo necesita, analizando hasta el momento de pararlo, con el código citando este ADR y nombrando el test con tiempo real (punto 2). |
  | Una excepción tapa una violación en otro elemento | Solo el `#id` único que da axe, un `target` de un solo elemento y la comparación por nodo (punto 3). |

- **Impacto:** en el PR #56:
  - `tests/e2e/axe.js`: la espera con su tiempo máximo y su mensaje; la lista de excepciones y la comparación por nodo pasan a un módulo propio, y "ya no aparece" mira `passes`;
  - los `pararReloj` de `anadir-borrar.spec.js` y `dibujo.spec.js`: la cita de este ADR y los tests con tiempo real que cubren cada estado;
  - los análisis de estados con plazo: vuelven a comprobar el estado después;
  - su baseline: corrige lo que dice de las tarjetas que salen.

  Este ADR no cambia la app.

## 5. Validación

- **En el #56:** según su baseline, con la espera la violación de `color-contrast` del fundido de FR-10 deja de salir, y fuera del fundido no hay otra [F2].
- **Antes de fusionar el #56:**
  - la espera cumple el punto 1 (solo lectura, tiempo máximo de 2 s, mensaje, sin filtros y estados con plazo comprobados de nuevo), los tests con el reloj parado, el punto 2, y la comprobación de excepciones, el punto 3. Lo mira la ronda 2 de G4 del #56, con su CI en verde;
  - el #56 mide en la CI, en los dos navegadores y con el 3D, la espera más larga observada, y deja escrito en su baseline el margen frente a los 2 s. Si no hay margen, la persona decide, con un ADR nuevo.

## 6. Seguimiento

- **Pendiente de la persona:** si NFR-02 de SPEC-CALC-003 se aplica a estados transitorios, como el texto a media opacidad durante el fundido de FR-10. Se decide en otra issue; este ADR no lo cierra.
- Se revisa este ADR si:
  - la app pasa a tener una animación infinita, con `fill` que la deje en la lista, más larga que el tiempo máximo, o un estado con contenido o controles que vive solo dentro de animaciones;
  - una animación o una cadena de animaciones de la app se acerca al tiempo máximo o a un plazo de la app que los tests analizan;
  - alguna violación real resulta estar solo en un estado intermedio de una animación;
  - axe deja de funcionar con el reloj instalado, o lo que se ve con el reloj parado deja de analizarse en algún test con tiempo real;
  - axe o Playwright ofrecen una forma, sin tocar la página, de analizar en un momento fijo de una animación o con el reloj parado.

## 7. Fuentes

Consultadas el 2026-11-18. Lo esencial de [F1] y [F2] está resumido en §1.

- [F1] Reconciliación de la ronda 1 de G4 del PR #56, hallazgos A, B, F e I, con las respuestas de los dos revisores: https://github.com/victor-lg/calculadora-discos/pull/56#issuecomment-6977588400
- [F2] `docs/baseline-controles.md`, "M27: axe en los E2E (ADR-0007)", en la rama `test/vic-31-axe` (`6c2d778`): la violación, la espera y el reloj parado. Llega a `main` con el #56.
- [F3] De `main` (`06dac50`): `app/js/app.js` (`entrar`, `salir`, `cerrarHueco`, `PULSACION_LARGA_MS`, `SALIDA_MS`, `CIERRE_MS` y `PLAZO_AVISO_MS`), `app/js/dibujo.js` (`ESPERA_MS` y `RECUPERAR_MS`) y `app/css/estilos.css` (`.serie.sale`, `.serie.vuelve`, `.deslizable.se-cierra`). Del #56, `tests/e2e/dibujo.spec.js` (`pararReloj`): el fotograma de más de medio segundo en la CI.
- [F4] `axe-core` 4.14.0, `node_modules/axe-core/axe.js`: `generateSelector` usa `#` y el id escapado de un elemento cuando ese id es único en su documento (`getElmId`, `idSelector`); si no, combina clases, atributos y `:nth-child`, que cambian con el resto de la página.
- [F5] `playwright-core` 1.65.0, `types/types.d.ts`, `Clock`: `setFixedTime` fija `Date.now` y deja correr los temporizadores; `runFor`, `fastForward` y `setSystemTime` avanzan o cambian la hora sin reanudar un reloj parado con `pauseAt`.
