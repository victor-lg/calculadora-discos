---
id: ADR-0004
titulo: Más datos guardados en el dispositivo
estado: Propuesto          # Propuesto | Aceptado | Rechazado | Sustituido
fecha: 2026-10-26
sustituye: null
sustituido_por: null
modifica: [ADR-0002 (§3.1)]
referencias: [ADR-0001, ADR-0002, SPEC-CALC-001, SPEC-CALC-002, VIC-9, PR #16, docs/diseno/notas-diseno-interfaz.md]
---

<!--
Redactado por Claude (VIC-9) a partir de docs/diseno/notas-diseno-interfaz.md §2.2
y de SPEC-CALC-001 v0.6 FR-11 (PR #16), con las decisiones de Víctor de las
sesiones de diseño del 23 al 25 de octubre y del 2026-10-26: solo se guarda un
peso válido, y este ADR se fusiona antes que el PR #16. Cambia solo la lista de
ADR-0002 §3.1; el resto de ADR-0002 sigue vigente y no se edita.
-->

# ADR-0004 — Más datos guardados en el dispositivo

## 1. Contexto

ADR-0002 §3.1 guarda dos datos, cada uno en su entrada de `localStorage`: la lista de porcentajes y los tipos de disco habilitados. Además, el último párrafo de su §3 dice que "un dato nuevo que tenga que guardarse exige otro ADR que modifique este".

SPEC-CALC-001 v0.6 (FR-11, PR #16) añade cuatro datos que deben sobrevivir a un arranque de cero:

- el último peso de trabajo válido, tal como se escribió;
- el peso de la recta;
- el peso de la Z;
- la opción de collarines.

Es la reapertura que preveía ADR-0001 §4: el riesgo "iOS termina la app en segundo plano y se pierde el peso" se aceptó con la condición de reabrirlo con una spec nueva si molestaba. Víctor lo decidió así en las sesiones de diseño del 23 al 25 de octubre, de donde sale SPEC-CALC-001 v0.6.

La spec exige que cada dato se recupere por separado: si uno falta o no es válido, los demás se recuperan igualmente. El modo y la barra siguen sin guardarse.

Sin esta decisión, ADR-0002 prohíbe guardar esos datos y SPEC-CALC-001 v0.6 no se puede fusionar.

## 2. Alternativas consideradas

### Opción A: una entrada de `localStorage` por dato

- **Ventajas:**
  - es la misma regla de ADR-0002: cada dato se lee, se valida y se recupera por su cuenta, y el aislamiento es estructural;
  - sin código ni dependencias nuevas.
- **Inconvenientes:** seis entradas en lugar de dos. Se escriben por separado, pero los datos son independientes y no necesitan escribirse juntos.

### Opción B: una sola entrada nueva con los cuatro ajustes

- **Ventajas:** menos entradas.
- **Inconvenientes:**
  - una entrada ilegible pierde los cuatro datos a la vez, y SPEC-CALC-001 FR-11 exige recuperarlos por separado. Es el mismo motivo por el que ADR-0002 descartó su opción B;
  - guardar el peso de trabajo, que cambia con cada tecla válida, reescribiría los demás ajustes.

  Una agrupación intermedia (el peso de trabajo aparte y los otros tres juntos) tiene el mismo problema para esos tres: SPEC-CALC-001 FR-11 pide recuperar cada uno por separado.

### Opción C: IndexedDB

- **Inconvenientes:** es asíncrono y necesita más código, sin ninguna ventaja para datos tan pequeños. En iOS se desaloja igual que `localStorage` (ADR-0001 [F4]).

## 3. Decisión

**Opción A.** Modifica ADR-0002 §3.1, que queda así:

1. **Qué se guarda.** Se guardan seis datos, cada uno por separado:
   - la lista de porcentajes (SPEC-CALC-001 FR-11);
   - los tipos de disco habilitados (SPEC-CALC-002 FR-08);
   - el peso de trabajo, como el texto que escribió la persona, solo si es válido (SPEC-CALC-001 FR-03 y FR-11);
   - el peso de la recta, solo si es válido (SPEC-CALC-001 FR-02 y FR-11);
   - el peso de la Z, solo si es válido (SPEC-CALC-001 FR-02 y FR-11);
   - la opción de collarines (SPEC-CALC-001 FR-15 y FR-11).

El resto de ADR-0002 §3 no cambia:

- cada dato va en su propia entrada (§3.2);
- un fallo al leer cuenta como "no se puede leer", y la validez y los valores por defecto viven solo en las specs (§3.3);
- el resto del estado, incluidos el modo y la barra, vive solo en memoria (§3.4);
- un dato nuevo exige otro ADR que modifique este (último párrafo de ADR-0002 §3).

El fallo al guardar cualquiera de los seis lo fija SPEC-CALC-002 FR-09.

Un dato solo se escribe cuando cambia (SPEC-CALC-001 FR-11, columna "Cuándo se guarda"): el primer arranque no escribe nada. El peso de trabajo se escribe con cada tecla que deja un valor válido, porque es lo que pide FR-11 y porque así un cierre de iOS en segundo plano no pierde lo último escrito.

## 4. Consecuencias

- **Beneficios:**
  - al abrir la app, Víctor encuentra su peso de trabajo, sus barras y sus collarines;
  - un fallo en un dato no arrastra a los demás;
  - sin dependencias ni piezas nuevas.
- **Costes aceptados:**
  - los riesgos de ADR-0002 §4 valen ahora para los seis datos: iOS puede borrarlos y se pierden si cambia el subdominio. En los dos casos, cada dato vuelve a su valor de primera vez según SPEC-CALC-001 FR-11 o SPEC-CALC-002 FR-08;
  - el peso de trabajo se escribe en `localStorage` con cada tecla que deja un valor válido. Es una escritura síncrona de unos pocos bytes. No lo he medido; se comprueba en la prueba manual de §5. Con el almacenamiento lleno, cada tecla vuelve a fallar, pero el aviso de SPEC-CALC-002 FR-09 es uno solo y se mantiene mientras haya diferencia, así que se tolera.
- **Privacidad:**
  - el peso de trabajo es un dato personal, pero no sale del dispositivo: SPEC-CALC-001 NFR-02 y su AC-13 lo cubren junto con los demás datos;
  - nada de lo guardado incluye identificadores ni datos de terceros;
  - lo que se lee del almacenamiento se trata como entrada no fiable: se valida según la spec (SPEC-CALC-001 AC-33) y nunca se inserta como HTML.
- **Impacto:**
  - este ADR se fusiona antes que el PR #16, que lo cita desde SPEC-CALC-001 y SPEC-CALC-002 (frontmatter `adr` y §11). Hasta entonces, este ADR cita requisitos de SPEC-CALC-001 v0.6 que aún no están en `main`;
  - el PR de código lo aplica. Tendrá que cambiar, y justificar en su guía, los tests que esperan el peso de trabajo vacío al arrancar (`tests/unit/series.test.js`, el de SPEC-CALC-001 AC-11; `tests/e2e/interfaz.spec.js`) y ampliar el E2E de SPEC-CALC-001 AC-13 (`tests/e2e/sin-conexion.spec.js`) a los datos nuevos. Las precondiciones `localStorage.length === 0` de `tests/e2e/interfaz.spec.js` y `tests/e2e/discos.spec.js` siguen valiendo, porque el primer arranque no escribe (§3);
  - el README describirá los datos nuevos cuando el PR de código los guarde, no antes.

## 5. Validación

- Los tests de SPEC-CALC-001 AC-11, AC-13 (ampliado a los datos nuevos), AC-33 y AC-34, y los de SPEC-CALC-002 AC-12, AC-14 y AC-15, pasan en la CI.
- **Prueba manual en el iPhone,** que amplía la de ADR-0002 §5 y se registra en el PR de código con la versión de iOS:
  1. cambiar el peso de trabajo, el peso de la recta y de la Z, activar los collarines, cambiar la lista de porcentajes y deshabilitar dos tipos de disco;
  2. cerrar la app desde el selector de apps y volver a abrirla;
  3. comprobar que se conservan los seis datos y que el modo y la barra vuelven a Barra con la olímpica de 20 kg;
  4. pasar a otra app y volver, y comprobar que se conserva todo el estado (SPEC-CALC-001 AC-22).

  Igual que en ADR-0001 §3.8 y ADR-0002 §5, SPEC-CALC-001 AC-11 y AC-22 no se dan por cumplidos sin esta prueba. Es la misma prueba que la de ADR-0002 §5, ampliada; basta con hacerla una vez.

## 6. Seguimiento

- Revisar este ADR:
  - si hace falta guardar otro dato;
  - si el número de entradas hace que agrupar compense más que el aislamiento;
  - si iOS empieza a borrar los datos con frecuencia.
