---
id: ADR-0005
titulo: Los pesos se guardan al terminar de editar
estado: Propuesto         # Propuesto | Aceptado | Rechazado | Sustituido
fecha: 2026-10-29
sustituye: null
sustituido_por: null
modifica: [ADR-0004 (§3, último párrafo; §4, segundo coste aceptado)]
referencias: [ADR-0001, ADR-0002, ADR-0004, SPEC-CALC-001, SPEC-CALC-002, VIC-13, PR #20]
---

<!--
Redactado por Claude (VIC-13) a partir de las decisiones de Víctor del 2026-10-26
y del 2026-10-29: los pesos se guardan al terminar de editar y nunca con cada
tecla; si en ese momento el campo está vacío o no es válido, se conserva el último
valor confirmado; cambiar de barra o de modo también termina la edición; y el
cambio de ADR-0004 va en este ADR nuevo, que se fusiona antes que SPEC-CALC-001
v0.7 y SPEC-CALC-002 v0.3. Cambia solo el último párrafo de ADR-0004 §3 y su
segundo coste aceptado (§4); el resto de ADR-0004 sigue vigente y no se edita.
-->

# ADR-0005 — Los pesos se guardan al terminar de editar

## 1. Contexto

ADR-0004 §3 termina así: "El peso de trabajo se escribe con cada tecla que deja un valor válido, porque es lo que pide FR-11 y porque así un cierre de iOS en segundo plano no pierde lo último escrito". El PR #20 (VIC-10) lo aplicó tal cual, y también a los pesos de la recta y de la Z.

Esto deja un hueco que no se vio al decidirlo. Al borrar "105" con la tecla de retroceso, "10" y "1" son valores válidos y se guardan por el camino. El campo vacío no se guarda. Al volver a abrir la app sale "1", no "105". Con los pesos de barra pasa lo mismo: al borrar "7,5", se guarda "7".

SPEC-CALC-001 v0.7 (VIC-13, FR-11) cambia la regla: los pesos se guardan al terminar de editarlos y nunca con cada tecla. Si en ese momento el campo está vacío o no es válido, se conserva el último valor confirmado. Qué cuenta como terminar de editar lo fija esa spec. Esa regla contradice el último párrafo de ADR-0004 §3, que manda sobre el código hasta que otro ADR lo modifique.

El segundo motivo de ADR-0004 sigue valiendo: un cierre de iOS en segundo plano no debe perder lo último escrito. Guardar al pasar a segundo plano lo cubre si la app recibe el aviso de que pasa a segundo plano antes de que iOS la cierre o de que la persona la cierre desde el selector de apps. **Es una hipótesis, no un hecho comprobado:** la verifica la prueba manual de §5.

## 2. Alternativas consideradas

### Opción A: guardar en los momentos en que termina la edición

Se guarda al salir del campo, al cambiar de barra o de modo, y al pasar la app a segundo plano.

- **Ventajas:**
  - es la regla de la spec: los pasos intermedios del borrado no llegan al almacenamiento;
  - se escribe muchas menos veces que con cada tecla;
  - sin dependencias nuevas.
- **Inconvenientes:**
  - depende de recibir el aviso de paso a segundo plano en la app instalada. Si no llegara, un cierre perdería lo escrito desde la última vez que terminó una edición;
  - si la app pasa a segundo plano a mitad de borrado (por ejemplo, con "1" en el campo), se guarda ese valor, porque en ese momento es válido. Es lo que pide la spec.

### Opción B: seguir guardando con cada tecla, pero tras una pausa

Se guarda cuando la persona deja de teclear durante un tiempo, por ejemplo 1 s.

- **Inconvenientes:** no resuelve el hueco. Basta con detenerse en "1" a mitad de borrado para que se guarde. Además, añade un temporizador cuyo valor no sale de ninguna regla.

### Opción C: guardar solo al pasar a segundo plano

- **Ventajas:** un único momento de escritura.
- **Inconvenientes:** la spec también exige que salir del campo y cambiar de barra o de modo terminen la edición (SPEC-CALC-001 FR-02 y FR-11). Además, el aviso de fallo al guardar (SPEC-CALC-002 FR-09) no saldría hasta salir de la app, cuando ya no sirve.

## 3. Decisión

**Opción A.** El último párrafo de ADR-0004 §3 queda así:

> Un dato solo se escribe cuando cambia (SPEC-CALC-001 FR-11, columna "Cuándo se guarda"): el primer arranque no escribe nada. La lista de porcentajes, los tipos de disco habilitados y la opción de collarines se escriben al cambiar. El peso de trabajo y los pesos de la recta y de la Z se escriben solo al terminar de editarlos, según SPEC-CALC-001 FR-11, y nunca con cada tecla. Se escribe un peso cuando es válido y distinto del último que se guardó bien. Así, tras un fallo al guardar, el siguiente final de edición lo vuelve a intentar.

Además:

- **Paso a segundo plano.** La señal que manda es el evento `visibilitychange` cuando la página pasa a `hidden`. `pagehide` también termina la edición, como respaldo. Si un mismo final de edición se detecta más de una vez (por ejemplo, salir del campo y pasar a segundo plano a la vez), las veces siguientes no escriben nada, porque el peso ya coincide con el último guardado bien.
- **Cambio de barra o de modo.** Termina la edición aunque el campo conserve el foco: en iOS, tocar otro control no siempre lo quita.
- **Restos del modelo anterior en ADR-0004.** El argumento contra su opción B ("guardar el peso de trabajo, que cambia con cada tecla válida, reescribiría los demás ajustes") y la referencia de §4 a medir la escritura con cada tecla quedan como contexto histórico. La conclusión de su opción B sigue en pie por el otro motivo que da: SPEC-CALC-001 FR-11 pide recuperar cada dato por separado.

El resto de ADR-0004 y de ADR-0002 §3 no cambia: qué se guarda, una entrada por dato, la validez en las specs y el resto del estado en memoria.

## 4. Consecuencias

- **Beneficios:**
  - al borrar un peso tecla a tecla hasta vaciarlo, o al salir del campo antes de cerrar, se conserva el último valor confirmado. Si la app pasa a segundo plano a mitad de borrado, se guarda el valor válido de ese momento (ver costes);
  - se escribe en `localStorage` una vez por edición, no con cada tecla.
- **Costes aceptados.** El primero sustituye al segundo coste aceptado de ADR-0004 §4, el de escribir con cada tecla. El segundo es nuevo. Los demás puntos de ADR-0004 §4 siguen vigentes.
  - Si la app se cerrara sin recibir el aviso de paso a segundo plano (un fallo de la app o del sistema con el campo en edición), se perdería lo escrito desde que terminó la última edición. Se tolera: es raro y solo afecta a un peso que la persona puede volver a escribir. Con el almacenamiento lleno, cada final de edición vuelve a fallar, pero el aviso de SPEC-CALC-002 FR-09 es uno solo, así que se tolera igual que antes.
  - Pasar a segundo plano a mitad de una edición guarda el valor válido de ese momento, aunque sea un paso intermedio (por ejemplo, "1" al borrar "105").
- **Privacidad:** sin cambios respecto a ADR-0004 §4. Se guardan los mismos datos, solo cambia cuándo.
- **Impacto:**
  - este ADR se fusiona antes que el PR de SPEC-CALC-001 v0.7 y SPEC-CALC-002 v0.3, que lo citan. Hasta entonces, cita requisitos de esas versiones que aún no están en `main`;
  - ese PR de spec tiene que:
    - reescribir SPEC-CALC-001 AC-34, cuyos casos ("100,12" y después "100,123"; 7,5 y después 0,5) suponen la escritura con cada tecla;
    - redefinir en SPEC-CALC-002 FR-09 la diferencia que enciende el aviso: el valor confirmado frente al último guardado bien, y no lo tecleado frente a lo guardado. Si no, el aviso se encendería a mitad de edición. Si la spec no lo cubre, este ADR no debe aceptarse;
  - el PR de código (VIC-13) lo aplica. Tendrá que cambiar los tests que esperan una escritura con cada tecla válida, y justificarlo en su guía.

## 5. Validación

- Los tests de SPEC-CALC-001 AC-34, AC-42 y AC-43 y de SPEC-CALC-002 AC-15, en sus versiones del PR de spec, pasan en la CI.
- **Prueba manual en el iPhone,** que se registra en el PR de código con la versión de iOS, en la app instalada en la pantalla de inicio (ADR-0001). Safari sin instalar queda fuera, porque la app se usa instalada:
  1. con el peso de trabajo "105" guardado, borrarlo con la tecla de retroceso hasta vaciarlo, cerrar la app desde el selector de apps y volver a abrirla: el peso de trabajo es "105";
  2. escribir "110" sin salir del campo, cerrar la app desde el selector de apps y volver a abrirla: el peso de trabajo es "110". Esto comprueba que se recibe el aviso de paso a segundo plano;
  3. con "105" guardado, borrar hasta "1" y, sin salir del campo, cerrar la app desde el selector de apps: al volver a abrirla, el peso de trabajo es "1". Es el comportamiento esperado (§4, costes);
  4. con la recta elegida y el teclado abierto, cambiar su peso a 8 y tocar la Z sin cerrar el teclado; cerrar la app y volver a abrirla: la recta pesa 8 kg. Repetir pasando al modo Dos lados en lugar de tocar la Z;
  5. con un peso a medio escribir, pasar a otra app y volver: el campo conserva lo escrito (SPEC-CALC-001 AC-22 y AC-43);
  6. repetir los pasos 1 y 2 con el peso de la recta.

  Sin esta prueba, la hipótesis de §1 no se da por comprobada.

## 6. Seguimiento

- Revisar este ADR si la prueba manual muestra que en iOS no se recibe el aviso de paso a segundo plano, o si aparecen pesos guardados que la persona no confirmó.
