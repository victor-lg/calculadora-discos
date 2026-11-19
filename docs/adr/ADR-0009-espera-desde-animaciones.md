---
id: ADR-0009
titulo: la espera antes de axe separa lo que tarda la página en responder de lo que duran las animaciones
estado: Propuesto         # Propuesto | Aceptado | Rechazado | Sustituido
fecha: 2026-11-19
sustituye: null
sustituido_por: null
modifica: ["ADR-0008 (§3.1, «Tiempo máximo explícito, de 2 s» y «Fallo claro ante una animación que no termina»: la espera se hace en dos tiempos, una primera lectura con su propio tiempo máximo, de 10 s, y su mensaje, y los 2 s contados desde que vuelve una lectura con animaciones; §4 y §6: «el tiempo máximo» es el de 2 s del segundo tiempo, y los plazos de la app se miden también frente a la primera lectura; §5: qué se mide y qué se exige antes de fusionar el #56)"]
referencias: ["ADR-0003", "ADR-0007", "ADR-0008", "SPEC-CALC-001", "SPEC-CALC-003", "VIC-31", "PR #56"]
---

<!--
Redactado por Claude (VIC-31), por decisión de Víctor en el PR #56: si, tras pasar AC-13 de
sin-conexion.spec.js a la vista sin dibujo y después probar un solo proceso de Playwright en la
CI, alguna espera sin animaciones seguía sin margen, proponer este ADR con su opción 1. Víctor
pidió después que la primera lectura tuviera su propio tiempo máximo, con su mensaje, su
medición y su criterio de revisión. Cambia solo los puntos de la cabecera (`modifica`); el
resto de ADR-0008 sigue vigente y no se edita.
-->

# ADR-0009 — La espera antes de axe separa lo que tarda la página en responder de lo que duran las animaciones

## 1. Contexto

ADR-0008 §3.1 fija una espera de solo lectura antes de `analyze()`, hasta que
`document.getAnimations()` esté vacío, con un tiempo máximo de 2 s que se pasa a la propia
espera. Los 2 s salen de las duraciones nominales: más del doble de la cadena de animaciones
más larga (unos 850 ms). Su §5 pide medir en la CI la espera más larga y, si no hay margen,
que la persona decida con un ADR nuevo.

La espera lee `getAnimations()` con `page.evaluate`, y su tiempo incluye lo que tarda cada
lectura en volver. En la CI del #56 la espera se ha agotado varias veces sin ninguna
animación que mostrar: el mensaje de ADR-0008 sale seguido de
`Timeout 2000ms exceeded while waiting on the predicate`, sin ninguna lectura recibida [F1]:

| CI del #56 | Qué cambiaba | Con animaciones (anotada) | Sin animaciones | Esperas agotadas sin animaciones |
| --- | --- | --- | --- | --- |
| `336851d` | — (2 CPU) | 495 ms | 1223 ms | SPEC-CALC-001/AC-13 (Chromium) |
| `7e2a34f` | AC-13 sin dibujo (2 CPU) | 276 ms | 742 ms | AC-19 de `dibujo.spec.js` y `accesibilidad.spec.js:59`, el `beforeEach` (Chromium) |
| `b4ace2a` | un proceso; el runner pasa a 4 CPU | 541 ms | 1331 ms | ninguna |
| `a7987f5` | AC-13 vuelve al 3D (ADR-0003) | 449 ms | 1436 ms | SPEC-CALC-001/AC-13 (Chromium) |

En WebKit no ha habido ninguna. En `7e2a34f`, además, AC-21 de `accesibilidad.spec.js`
(Chromium) agotó los 30 s del test en un `click`, esperando a que el botón estuviera
visible, habilitado y quieto, justo después de un análisis que había pasado. No se sabe
cuánto duró esa espera ni si tiene la misma causa.

Las esperas con animaciones nunca han pasado de 541 ms anotados, y solo fallan las de
Chromium con el dibujo 3D, que en la CI se pinta por software. La hipótesis es que la
página, ocupada pintando, tarda en responder a la lectura, no que haya animaciones: es
compatible con los datos, pero no está probada. La medición de §5 la confirma o la
descarta. AC-13 de SPEC-CALC-001 no puede quedarse en la vista sin dibujo: ADR-0003 (tabla
de riesgos) cuenta con que vigile la red con three.js en uso. Sin decidir, el #56 no tiene
la CI en verde y no puede fusionarse.

## 2. Alternativas consideradas

### Opción A: separar la primera lectura del tiempo de las animaciones

- **Ventajas:** el tiempo máximo de 2 s vuelve a medir lo que ADR-0008 quería, cuánto
  duran las animaciones. Una animación que no termina sigue haciendo fallar el test a los
  2 s de verla. Cada fallo dice cuál de las dos cosas pasó.
- **Inconvenientes:** la primera lectura necesita su propio tiempo máximo, que mide otra
  cosa (cuánto tarda la página en responder) y tampoco tiene un techo conocido. Las
  lecturas del segundo tiempo siguen incluyendo lo que tarda la página en responder.

### Opción B: subir el tiempo máximo de 2 s

- **Ventajas:** un solo número; nada más cambia.
- **Inconvenientes:** alarga también el tiempo que se le da a una animación que no
  termina, por un motivo que no tiene que ver con ella. Como en A, la cifra para la página
  lenta sería una elección, no una medida; la diferencia es que en B esa elección afloja
  también el control de las animaciones.

### Opción C: quitar carga a la CI

- **Inconvenientes:** pasar AC-13 a la vista sin dibujo choca con ADR-0003, y sin él
  tampoco bastó en `7e2a34f`. AC-19 de `dibujo.spec.js` y AC-20 a AC-22 de
  `accesibilidad.spec.js` necesitan el 3D. Con un proceso y 4 CPU, `b4ace2a` pasó, pero con
  AC-13 sin dibujo; con AC-13 otra vez en 3D (`a7987f5`), falló. Además, las CPU del
  runner no las decide el proyecto.

### Opción D: medir las animaciones con el reloj de la página

Comparar, solo leyendo, el tiempo de cada animación con `document.timeline.currentTime`,
para que la latencia de las lecturas no cuente.

- **Inconvenientes:** cada lectura sigue necesitando que la página responda, así que no
  quita el problema de la primera lectura. Cambia más de ADR-0008 que A.

## 3. Decisión

**Opción A.** La espera de ADR-0008 §3.1 se hace en dos tiempos, los dos solo leyendo. Es
la espera que admite ADR-0008 en su forma («la espera del punto 1, y nada más»); el
mecanismo lo elige el PR que la implementa.

1. **Primer tiempo: hasta que vuelva una lectura.** Se lee `getAnimations()` hasta que una
   lectura vuelva, con un tiempo máximo propio de **10 s**, en una constante con nombre en
   la función auxiliar y pasado al propio primer tiempo. Una lectura que falla con un
   error (por ejemplo, porque la página se recarga) se repite, como en ADR-0008. Si vuelve
   sin animaciones, se analiza.
   - **Si se agota**, el test falla con un mensaje que cita «ADR-0009 de la calculadora»,
     dice que la página no respondió a la lectura en 10 s y que no hay animaciones que
     mostrar. No se reintenta la espera ni se captura el error. Una lectura que siga en
     curso cuando se agota no cambia nada: solo lee, y el test ya ha fallado.
2. **Segundo tiempo: si la lectura vuelve con animaciones.** Se sigue leyendo hasta que no
   haya ninguna, con el tiempo máximo de 2 s de ADR-0008, **contado desde que vuelve esa
   primera lectura** y pasado a la propia espera.
   - **Si se agota**, el fallo es el de ADR-0008: cita «ADR-0008 de la calculadora» y
     muestra las animaciones en curso de la última lectura que volvió. Además, dice cuánto
     tardó en volver esa última lectura, para distinguir una animación que no termina de
     una página que no responde.

Lo demás de ADR-0008 §3.1 no cambia: solo lee, no filtra, y una animación que no termina
hace fallar el test. En ADR-0008 §4 y §6, «el tiempo máximo» es ahora el de 2 s del
segundo tiempo.

**Los 10 s son una elección, no una medida.** De las primeras lecturas solo se sabe que
las que volvieron tardaron como mucho 1436 ms y que otras pasaron de 2 s, sin saber
cuánto; y AC-21 muestra que la página puede tardar más en algo que no se midió. 10 s dejan
sitio para varias veces lo que ya se ha visto pasar de 2 s, y quedan lejos de los 30 s de
un test, que fallaría sin decir qué pasó. Se revisan con la medición (§5) y el criterio
de §6.

## 4. Consecuencias

- **Beneficios:** la CI sin GPU deja de fallar porque la página tarde unos segundos en
  responder, y el tiempo de 2 s vuelve a ser el de las animaciones. Cada fallo dice si la
  página no respondió (ADR-0009) o si una animación no terminó (ADR-0008), con lo que
  tardó la última lectura.
- **Costes aceptados:**
  - Una página que tarda hasta 10 s en responder pasa sin fallo.
  - Un test hace varios análisis: unas pocas primeras lecturas lentas, cada una por debajo
    de 10 s, pueden agotar los 30 s del test, y entonces el fallo es el del test, sin citar
    ningún ADR. La medición de §5 lo hace visible.
  - Los plazos de la app que los tests analizan (los 5 s del aviso de "Deshacer" y los 3 s
    de FR-15) caben dentro de una primera lectura de hasta 10 s. Si un estado con plazo
    caduca en ella, lo detecta la comprobación posterior que exige ADR-0008 (plazos), con
    su propio mensaje, de forma intermitente.
  - Una animación finita pero más larga de lo debido puede terminar dentro de una primera
    lectura lenta y no llegar a verse. Antes fallaba a los 2 s. Solo pasa con la página
    lenta, y en local o con la página rápida se sigue viendo.
  - El segundo tiempo sigue incluyendo lo que tarda la página en responder: si las
    animaciones coinciden con la página ocupada, se puede agotar igual. Sería un fallo de
    más, no un hueco; su mensaje dice lo que tardó la última lectura.
  - El tiempo del job puede crecer hasta 10 s por análisis en el peor caso; ADR-0007 §6
    sigue pidiendo revisarlo si un trozo pasa de 12 min.
  - Las anotaciones de la medición solo se ven si alguien las mira: la revisión de §6 no
    salta sola.
- **Riesgos y mitigaciones:**

  | Riesgo | Mitigación |
  | --- | --- |
  | La primera lectura se acerca a los 10 s y el fallo se vuelve intermitente | La medición de §5 la anota aparte; §6 pide revisar a la mitad. |
  | Un fallo intermitente en el segundo tiempo | El mensaje dice lo que tardó la última lectura; §5 anota el segundo tiempo aparte; si se repite, la persona decide. |
  | La hipótesis de §1 es falsa y la causa es otra | La medición de §5 separa la primera lectura del segundo tiempo; si no la sostiene, §6. |

- **Impacto:** en el #56, `tests/e2e/axe.js` y su baseline. No cambia la app ni lo que
  comprueban los tests.

## 5. Validación

La medición de ADR-0008 §5 pasa a anotar, en la salida de los tests de la CI y por cada
proceso de Playwright, por separado:

- la **primera lectura** más larga, haya visto animaciones o no;
- el **segundo tiempo** más largo, desde que vuelve la primera lectura con animaciones
  hasta que no queda ninguna, junto con lo que tardó esa primera lectura.

Antes de fusionar el #56:

- **dos** ejecuciones completas de la CI en verde, en los dos navegadores y con el 3D;
- en su baseline, de las dos, la primera lectura más larga frente a los 10 s y el segundo
  tiempo más largo frente a los 2 s, con sus márgenes. Si la primera lectura pasa de 5 s,
  se aplica §6 antes de fusionar.

## 6. Seguimiento

Se revisa este ADR:

- si la primera lectura más larga medida en la CI pasa de 5 s (la mitad de su tiempo
  máximo) o se agota alguna vez. Es un aviso de fallo cercano, no de deriva: una subida
  lenta por debajo de 5 s no lo dispara;
- si el segundo tiempo falla en la CI y la última lectura tardó en volver más que las
  animaciones que muestra;
- si una comprobación posterior de un plazo de la app falla tras una primera lectura
  lenta;
- si la CI pasa a tener GPU, o cambian las CPU del runner.

## 7. Fuentes

- [F1] Anotaciones `::notice::` y de fallo de los jobs `e2e` del PR #56 en `336851d`,
  `7e2a34f`, `b4ace2a` y `a7987f5`, y su baseline (`docs/baseline-controles.md`, M27, en la
  rama del #56). Los logs de Actions no se leen desde el sandbox del agente; las
  anotaciones, sí.
