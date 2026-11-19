---
id: ADR-0009
titulo: el tiempo máximo de la espera antes de axe cuenta desde la primera lectura que ve animaciones
estado: Propuesto         # Propuesto | Aceptado | Rechazado | Sustituido
fecha: 2026-11-19
sustituye: null
sustituido_por: null
modifica: ["ADR-0008 (§3.1, «Tiempo máximo explícito, de 2 s»: desde cuándo se cuentan los 2 s)"]
referencias: ["ADR-0003", "ADR-0007", "ADR-0008", "SPEC-CALC-001", "SPEC-CALC-003", "VIC-31", "PR #56"]
---

<!--
Redactado por Claude (VIC-31), por decisión de Víctor en el PR #56: si, tras pasar AC-13 de
sin-conexion.spec.js a la vista sin dibujo y después probar un solo proceso de Playwright en la
CI, alguna espera sin animaciones seguía sin margen, proponer este ADR con su opción 1. Cambia
solo el punto de la cabecera (`modifica`); el resto de ADR-0008 sigue vigente y no se edita.
-->

# ADR-0009 — El tiempo máximo de la espera antes de axe cuenta desde la primera lectura que ve animaciones

## 1. Contexto

ADR-0008 §3.1 fija una espera de solo lectura antes de `analyze()`, hasta que
`document.getAnimations()` esté vacío, con un tiempo máximo de 2 s que se pasa a la propia
espera. Los 2 s salen de las duraciones nominales: más del doble de la cadena de animaciones
más larga (unos 850 ms). Su §5 pide medir en la CI la espera más larga y, si no hay margen,
que la persona decida con un ADR nuevo.

La espera lee `getAnimations()` con `page.evaluate`, y su tiempo incluye lo que tarda cada
lectura en volver. Con el dibujo 3D por software (la CI no tiene GPU), el hilo principal de
la página puede estar ocupado más de 2 s, y entonces la primera lectura no vuelve a tiempo
aunque no haya ninguna animación. El fallo cita ADR-0008, pero sigue
`Timeout 2000ms exceeded while waiting on the predicate`, sin animaciones que mostrar [F1]:

| CI del #56 | Qué cambiaba | Con animaciones (anotada) | Sin animaciones | Primeras lecturas de más de 2 s |
| --- | --- | --- | --- | --- |
| `336851d` | — (2 CPU) | 495 ms | 1223 ms | SPEC-CALC-001/AC-13 (Chromium) |
| `7e2a34f` | AC-13 sin dibujo (2 CPU) | 276 ms | 742 ms | AC-19 de `dibujo.spec.js` y el `beforeEach` de `accesibilidad.spec.js` (Chromium) |
| `b4ace2a` | un proceso; el runner pasa a 4 CPU | 541 ms | 1331 ms | ninguna |
| `a7987f5` | AC-13 vuelve al 3D (ADR-0003) | 449 ms | 1436 ms | SPEC-CALC-001/AC-13 (Chromium) |

En WebKit no ha habido ninguna. Las esperas con animaciones nunca han pasado de 541 ms
anotados. Lo que agota los 2 s no son las animaciones, sino lo que tarda la página en
responder con el 3D. AC-13 de SPEC-CALC-001 no puede quedarse en la vista sin dibujo:
ADR-0003 (tabla de riesgos) cuenta con que vigile la red con three.js en uso. Sin decidir,
el #56 no tiene la CI en verde y no puede fusionarse.

## 2. Alternativas consideradas

### Opción A: contar los 2 s desde la primera lectura que ve animaciones

- **Ventajas:** el tiempo máximo vuelve a medir lo que ADR-0008 quería, cuánto duran las
  animaciones. Una animación que no termina sigue haciendo fallar el test a los 2 s de
  verla. No cambia la página ni el tiempo máximo.
- **Inconvenientes:** la primera lectura no tiene tiempo máximo propio: queda acotada por el
  del test. Las lecturas siguientes siguen incluyendo lo que tarda la página en responder.

### Opción B: subir el tiempo máximo

- **Ventajas:** un solo número; nada más cambia.
- **Inconvenientes:** se alarga también el tiempo que se le da a una animación que no
  termina, por un motivo que no tiene que ver con ella. Lo que tarde la página con el 3D
  por software no tiene un techo conocido: no hay un número con margen seguro.

### Opción C: quitar carga a la CI

- **Inconvenientes:** se probó. Pasar AC-13 a la vista sin dibujo no bastó y choca con
  ADR-0003; AC-19 de `dibujo.spec.js` y AC-20 a AC-22 de `accesibilidad.spec.js` necesitan
  el 3D. Un solo proceso con 4 CPU pasó una vez y falló la siguiente.

## 3. Decisión

**Opción A.** La espera de ADR-0008 §3.1 se hace en dos tiempos, los dos solo leyendo:

1. **Primera lectura**, sin tiempo máximo propio (el del test la acota). Si no hay ninguna
   animación en curso, se analiza.
2. **Si hay alguna,** la espera sigue leyendo hasta que no haya ninguna, con el tiempo
   máximo de 2 s de ADR-0008 contado desde esa primera lectura y pasado a la propia espera.
   El fallo y su mensaje son los de ADR-0008: citan «ADR-0008 de la calculadora» y
   muestran las animaciones en curso, sin capturar el error.

Lo demás de ADR-0008 §3.1 no cambia: solo lee, no filtra, y una animación que no termina
hace fallar el test.

## 4. Consecuencias

- **Beneficios:** la CI sin GPU deja de fallar porque la página tarde en responder, y el
  tiempo máximo vuelve a ser el de las animaciones.
- **Costes aceptados:**
  - Si la página no responde, la primera lectura espera hasta el tiempo máximo del test, y
    el fallo es de tiempo del test, no el mensaje de ADR-0008.
  - Las lecturas del segundo tiempo siguen incluyendo lo que tarda la página en responder:
    si las animaciones coinciden con la página ocupada, se puede agotar igual. La medición
    de §5 lo vigila.
- **Riesgos y mitigaciones:**

  | Riesgo | Mitigación |
  | --- | --- |
  | Se pierde un aviso temprano de una página colgada | El tiempo máximo del test sigue fallando; ninguna espera se reintenta ni se captura. |
  | Un fallo intermitente en el segundo tiempo | La medición de §5 anota las esperas con animaciones aparte; si se repite, la persona decide. |

- **Impacto:** en el #56, `tests/e2e/axe.js` y su baseline. No cambia la app ni los tests.

## 5. Validación

Antes de fusionar el #56: la CI en verde en los dos navegadores y con el 3D, y en el
baseline, la espera más larga del segundo tiempo frente a los 2 s.

## 6. Seguimiento

Se revisa este ADR si el segundo tiempo falla en la CI sin una animación que no termina, o
si la CI pasa a tener GPU.

## 7. Fuentes

- [F1] Anotaciones `::notice::` y de fallo de los jobs `e2e` del PR #56 en `336851d`,
  `7e2a34f`, `b4ace2a` y `a7987f5`, y su baseline (`docs/baseline-controles.md`, M27, en la
  rama del #56). Los logs de Actions no se leen desde el sandbox del agente; las
  anotaciones, sí.
