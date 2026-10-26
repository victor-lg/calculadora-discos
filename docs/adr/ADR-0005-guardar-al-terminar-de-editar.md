---
id: ADR-0005
titulo: Los pesos se guardan al terminar de editar
estado: Propuesto         # Propuesto | Aceptado | Rechazado | Sustituido
fecha: 2026-10-26
sustituye: null
sustituido_por: null
modifica: [ADR-0004 (§3, último párrafo; §4, segundo coste aceptado)]
referencias: [ADR-0001, ADR-0002, ADR-0004, SPEC-CALC-001, SPEC-CALC-002, VIC-13, PR #20]
---

<!--
Redactado por Claude (VIC-13) a partir de las decisiones de Víctor del 2026-10-26:
los pesos se guardan al terminar de editar y nunca con cada tecla; si en ese
momento el campo está vacío o no es válido, se conserva el último valor guardado;
cambiar de barra o de modo también termina la edición; y el cambio de ADR-0004 va
en este ADR nuevo, que se fusiona antes que SPEC-CALC-001 v0.7. Cambia solo el
último párrafo de ADR-0004 §3 y su segundo coste aceptado (§4); el resto de
ADR-0004 sigue vigente y no se edita.
-->

# ADR-0005 — Los pesos se guardan al terminar de editar

## 1. Contexto

ADR-0004 §3 termina así: "El peso de trabajo se escribe con cada tecla que deja un valor válido, porque es lo que pide FR-11 y porque así un cierre de iOS en segundo plano no pierde lo último escrito". El PR #20 (VIC-10) lo aplicó tal cual, y también a los pesos de la recta y de la Z.

Así aparece un hueco que no se vio al decidirlo. Al borrar "105" con la tecla de retroceso, "10" y "1" son valores válidos y se guardan por el camino. El campo vacío no se guarda. Al volver a abrir la app sale "1", no "105". Con los pesos de barra pasa lo mismo: al borrar "7,5", se guardan "7" y otros pasos intermedios.

SPEC-CALC-001 v0.7 (VIC-13) cambia la regla: los pesos se guardan al terminar de editar y nunca con cada tecla. Terminar de editar es salir del campo, cambiar de barra o de modo, o pasar la app a segundo plano. Si en ese momento el campo está vacío o no es válido, se conserva el último valor guardado. Ese texto contradice el último párrafo de ADR-0004 §3, que manda sobre el código hasta que otro ADR lo modifique.

El segundo motivo de ADR-0004 sigue valiendo: un cierre de iOS en segundo plano no debe perder lo último escrito. Guardar al pasar a segundo plano lo cubre, porque la app pasa siempre por segundo plano antes de que iOS la cierre o de que la persona la cierre desde el selector de apps.

## 2. Alternativas consideradas

### Opción A: guardar en los momentos en que termina la edición

Se guarda al salir del campo, al cambiar de barra o de modo, y al pasar la app a segundo plano.

- **Ventajas:**
  - es exactamente la regla de la spec: los pasos intermedios del borrado nunca llegan al almacenamiento;
  - se escribe muchas menos veces que con cada tecla;
  - sin dependencias nuevas.
- **Inconvenientes:**
  - depende de detectar el paso a segundo plano en Safari para iOS y en la app instalada. Si ese aviso no llegara, un cierre en segundo plano perdería lo escrito desde la última vez que la persona salió del campo. Se comprueba en la prueba manual de §5;
  - si la app pasa a segundo plano a mitad de borrado (por ejemplo, con "1" en el campo), se guarda ese valor, porque en ese momento es válido. Es lo que pide la spec.

### Opción B: seguir guardando con cada tecla, pero tras una pausa

Se guarda cuando la persona deja de teclear durante un tiempo, por ejemplo 1 s.

- **Inconvenientes:** no resuelve el hueco. Basta con detenerse en "1" a mitad de borrado para que se guarde. Además, añade un temporizador cuyo valor no sale de ninguna regla.

### Opción C: guardar solo al pasar a segundo plano

- **Ventajas:** un único momento de escritura.
- **Inconvenientes:** la spec también exige que salir del campo y cambiar de barra o de modo cierren la edición (SPEC-CALC-001 FR-02 y FR-11). Además, el aviso de fallo al guardar (SPEC-CALC-002 FR-09) no saldría hasta salir de la app, cuando ya no sirve.

## 3. Decisión

**Opción A.** El último párrafo de ADR-0004 §3 queda así:

> Un dato solo se escribe cuando cambia (SPEC-CALC-001 FR-11, columna "Cuándo se guarda"): el primer arranque no escribe nada. La lista de porcentajes, los tipos de disco habilitados y la opción de collarines se escriben al cambiar. El peso de trabajo y los pesos de la recta y de la Z se escriben solo al terminar de editarlos: al salir del campo, al cambiar de barra o de modo y al pasar la app a segundo plano. Nunca se escriben con cada tecla. En cada uno de esos momentos se escribe el peso solo si es válido y distinto del último que se confirmó (SPEC-CALC-001 FR-11). Así, un cierre de iOS en segundo plano no pierde lo último escrito.

Guardar en esos momentos es idempotente: si el mismo final de edición se detecta dos veces (por ejemplo, salir del campo y pasar a segundo plano a la vez), la segunda vez no escribe nada, porque el peso ya coincide con el confirmado. El cambio de barra o de modo cierra la edición en su propio manejador, sin esperar a que el campo pierda el foco, porque en iOS tocar otro control no siempre lo quita.

El resto de ADR-0004 y de ADR-0002 §3 no cambia: qué se guarda, una entrada por dato, la validez en las specs y el resto del estado en memoria.

## 4. Consecuencias

- **Beneficios:**
  - al borrar un peso tecla a tecla y cerrar, se conserva el último valor que la persona confirmó;
  - se escribe en `localStorage` una vez por edición, no con cada tecla;
  - el aviso de fallo al guardar (SPEC-CALC-002 FR-09) sale una vez por edición, al terminar de editar, y no se enciende y apaga mientras se teclea.
- **Costes aceptados** (este punto sustituye al segundo coste aceptado de ADR-0004 §4, el de escribir con cada tecla):
  - si iOS cerrara la app sin pasar por segundo plano (un fallo de la app o del sistema con el campo en edición), se perdería lo escrito desde que se terminó de editar por última vez. Se tolera: es raro y solo afecta a un peso que la persona puede volver a escribir;
  - pasar a segundo plano a mitad de una edición guarda el valor válido de ese momento, aunque sea un paso intermedio.
- **Privacidad:** sin cambios respecto a ADR-0004 §4. Se guardan los mismos datos, solo cambia cuándo.
- **Impacto:**
  - este ADR se fusiona antes que el PR de SPEC-CALC-001 v0.7 y SPEC-CALC-002 v0.3, que lo citan. Hasta entonces, cita requisitos de esas versiones que aún no están en `main`;
  - el PR de código (VIC-13) lo aplica. Tendrá que cambiar los tests que esperan una escritura con cada tecla válida, y justificarlo en su guía.

## 5. Validación

- Los tests de SPEC-CALC-001 AC-34 y de los AC nuevos del borrado tecla a tecla y del final de la edición, y los de SPEC-CALC-002 AC-15, pasan en la CI.
- **Prueba manual en el iPhone,** que se registra en el PR de código con la versión de iOS, en la app instalada en la pantalla de inicio:
  1. con el peso de trabajo "105" guardado, borrarlo con la tecla de retroceso hasta vaciarlo, cerrar la app desde el selector de apps y volver a abrirla: el peso de trabajo es "105";
  2. escribir "110" sin salir del campo, cerrar la app desde el selector de apps y volver a abrirla: el peso de trabajo es "110". Esto comprueba que el paso a segundo plano se detecta;
  3. repetir los dos pasos con el peso de la recta.

  Sin esta prueba, el inconveniente de la opción A no se da por descartado.

## 6. Seguimiento

- Revisar este ADR si la prueba manual muestra que en iOS no se detecta el paso a segundo plano, o si aparecen pesos guardados que la persona no confirmó.
