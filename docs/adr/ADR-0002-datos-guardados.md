---
id: ADR-0002
titulo: Datos guardados en el dispositivo
estado: Propuesto         # Propuesto | Aceptado | Rechazado | Sustituido
fecha: 2026-10-23
sustituye: null
sustituido_por: null
modifica: [ADR-0001 (§3.2)]
referencias: [ADR-0001, SPEC-CALC-001, SPEC-CALC-002, VIC-8, PR #12]
---

<!--
Redactado por Claude a partir de las decisiones de Víctor del 2026-10-23
(VIC-8), tomadas en la revisión del PR #12. Cambia solo ADR-0001 §3.2;
el resto de ADR-0001 sigue vigente y no se edita.
-->

# ADR-0002 — Datos guardados en el dispositivo

## 1. Contexto

ADR-0001 §3.2 guarda solo la lista de porcentajes (SPEC-CALC-001 FR-11) en `localStorage` y deja el resto del estado en memoria. SPEC-CALC-002 (PR #12) añade un segundo dato que debe sobrevivir a un arranque de cero, los tipos de disco habilitados (FR-08), y exige que cada dato se recupere aunque el otro falte o no sea válido. Sin esta decisión, §3.2 prohíbe guardar los discos.

## 2. Alternativas consideradas

- **A. Una entrada de `localStorage` por dato.** Cada dato se lee, se valida y se recupera por su cuenta. Es la misma pieza que ADR-0001, sin código ni dependencias nuevas.
- **B. Una sola entrada con los dos datos.** Si esa entrada no se puede leer, se pierden los dos datos a la vez. La spec lo impide.
- **C. IndexedDB.** Es asíncrono y necesita más código, sin ninguna ventaja para dos datos pequeños. Además, en iOS se desaloja igual que `localStorage` (ADR-0001, [F4]).

## 3. Decisión

**Opción A.** Esta decisión sustituye a ADR-0001 §3.2:

1. **Qué se guarda.** Se guardan dos datos, cada uno por separado:
   - la lista de porcentajes (SPEC-CALC-001 FR-11);
   - los tipos de disco habilitados (SPEC-CALC-002 FR-08).
2. **Dónde.** En `localStorage`, en una entrada propia para cada dato, de modo que escribir o leer uno no toca el otro.
3. **Datos ilegibles.** Se tratan según la spec de cada dato: SPEC-CALC-001 FR-11 para los porcentajes y SPEC-CALC-002 FR-08 para los discos. Cualquier fallo al leer cuenta como "no se puede leer". Las reglas de validez y los valores por defecto viven solo en las specs.
4. **El resto del estado** vive solo en memoria, como hasta ahora. Si iOS termina la app en segundo plano, la vuelta es un arranque de cero.

Un dato nuevo que tenga que guardarse exige otro ADR que modifique este.

## 4. Consecuencias

- **Beneficios:** un fallo en un dato no arrastra al otro, y no hay dependencias ni piezas nuevas.
- **Costes aceptados:** los riesgos de ADR-0001 §4 sobre la lista guardada valen ahora para los dos datos:
  - iOS puede borrarlos;
  - se pierden si cambia el subdominio.
  
  En los dos casos, cada dato vuelve a su valor por defecto según su spec.
- **Impacto:** el PR #12 cita este ADR desde SPEC-CALC-001 y SPEC-CALC-002 (frontmatter `adr` y §11). Después, el PR de código lo aplica.

## 5. Validación

- Tests de SPEC-CALC-002 AC-11 y AC-12 en la CI.
- **Prueba manual en el iPhone**, registrada en el PR de código con la versión de iOS anotada:
  1. deshabilitar dos tipos de disco y cambiar la lista de porcentajes;
  2. cerrar la app desde el selector de apps y volver a abrirla;
  3. comprobar que se conservan los dos datos;
  4. repetir el paso a otra app y la vuelta (SPEC-CALC-002 AC-13).

  SPEC-CALC-002 AC-13 no se da por cumplido sin esta prueba, igual que AC-12 y AC-22 de SPEC-CALC-001 (ADR-0001 §3.8).

## 6. Seguimiento

- Revisar este ADR si hace falta guardar un dato más, si un dato deja de caber en `localStorage` o si iOS empieza a borrar los datos con frecuencia.
