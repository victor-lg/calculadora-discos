---
id: SPEC-CALC-002
titulo: Inventario de discos disponibles
estado: en-revision
version: 0.3
riesgo: R1
sustituye: null
adr: [ADR-0001, ADR-0002, ADR-0004, ADR-0005]
transversales: []
---

<!--
Redactada con sdd-spec a partir de discovery/VIC-8-notas.md (2026-10-23).
Las reglas de negocio las decidió Víctor; las que eran propuesta de Claude y
él aceptó están marcadas en las notas, igual que las cuatro inferencias de
Claude, que Víctor confirmó el 2026-10-23. Ajusta SPEC-CALC-001 (v0.5) en FR-06, FR-07, FR-08,
FR-09, FR-11, FR-12, SPEC-CALC-001 AC-13, §2, §6 y §11 para que el cálculo use los discos
habilitados. La validez de los datos guardados (FR-08) y el fallo al guardar (FR-09) los
decidió Víctor el 2026-10-23, en la revisión del PR #12. Qué se guarda y dónde lo fija ADR-0002.
La versión 0.2 (VIC-9) no cambia las reglas del inventario: adapta los textos y los AC a
SPEC-CALC-001 v0.6 (FR-08, FR-09), fija el texto de FR-06, deja la presentación en
SPEC-CALC-003 y extiende el aviso de FR-09 a todos los datos guardados (decisión de Víctor,
2026-10-26). Enlaza ADR-0004.
La versión 0.3 (VIC-13) adapta el aviso de FR-09 a SPEC-CALC-001 v0.7, que guarda
los pesos al terminar de editarlos: en los pesos, el aviso compara el valor
confirmado con el último guardado bien y no cambia mientras se escribe (FR-09,
AC-14, AC-15). Decisión de Víctor del 2026-10-26, confirmada el 2026-10-29: este
ajuste va en el mismo PR que SPEC-CALC-001 v0.7. Enlaza ADR-0005. Tras la ronda 1
de G4 del PR #22 decidió que, tras un fallo, cada peso se reintenta en cada final
de su edición (SPEC-CALC-001 FR-11).
-->

# SPEC-CALC-002 — Inventario de discos disponibles

## 1. Objetivo

Que Víctor indique qué tipos de disco hay disponibles en el gimnasio y que el cálculo de SPEC-CALC-001 use solo esos, para que la app no proponga discos que no puede cargar.

## 2. Alcance y exclusiones

- **Incluye:**
  - habilitar y deshabilitar cada uno de los 7 tipos de disco de SPEC-CALC-001 (FR-07);
  - la elección de la combinación de discos cuando no están todos los tipos;
  - que la selección se recuerde;
  - el caso de que no haya ningún tipo habilitado.
- **Excluye:**
  - cantidades por tipo: cada tipo habilitado tiene existencias ilimitadas;
  - tipos nuevos o pesos que no sean los 7 actuales;
  - varios juegos de discos (por ejemplo, casa y gimnasio);
  - la presentación de los discos y de su selección, que fija SPEC-CALC-003.

## 3. Actores

Víctor, único usuario, en su iPhone. Los discos habilitados son un dato introducido por la persona a efectos de SPEC-CALC-001 NFR-02 (y de SPEC-CALC-001 AC-13).

## 4. Requisitos funcionales

- **FR-01:** los tipos de disco son exactamente los 7 de SPEC-CALC-001 (FR-07): 25, 20, 15, 10, 5, 2,5 y 1,25 kg. Cada uno está habilitado o deshabilitado. La persona no puede añadir ni quitar tipos ni indicar cantidades: cada tipo habilitado tiene existencias ilimitadas.
- **FR-02:** la app muestra los 7 tipos, cada uno con su peso y con su estado (habilitado o deshabilitado). Cuando la persona toca un tipo, su estado cambia al contrario. La forma visual la fija SPEC-CALC-003.
- **FR-03:** el cálculo de SPEC-CALC-001 usa solo los tipos habilitados, en los tres modos y con todas las barras. Cada serie se calcula por separado con todos los tipos habilitados: un disco usado en una serie no se descuenta para las demás.
- **FR-04:** de todas las combinaciones de discos habilitados que dan el peso cargado de SPEC-CALC-001 FR-06 (por lado en los modos Barra y Dos lados, y en el único punto en el modo Un punto), la app elige:
  1. la que usa menos discos;
  2. si empatan, la que tiene el disco más grande. Si también empatan en ese disco, se compara el siguiente más grande, y así hasta que uno sea mayor.

  Los discos se muestran de mayor a menor. Con los 7 tipos habilitados, el resultado coincide con tomar los discos de mayor a menor, tantos de cada uno como quepan.
- **FR-05:** el "disco más pequeño" de SPEC-CALC-001 FR-09 es el tipo habilitado más pequeño. Es el peso que dicen las explicaciones de SPEC-CALC-001 FR-09 ("el disco más pequeño (Y kg)") y el que cuenta para calcular lo que falta.
- **FR-06:** cuando no hay ningún tipo habilitado, la app no muestra ninguna serie y muestra la indicación "Habilita al menos un disco en Mis discos.". Esta indicación aparece además de las indicaciones, avisos o errores que correspondan por SPEC-CALC-001 (FR-02, FR-03, FR-12 y FR-13).
- **FR-07:** cuando la persona habilita o deshabilita un tipo, las series se recalculan al momento, sin un botón de calcular, como en SPEC-CALC-001 FR-10.
- **FR-08:** los tipos habilitados se guardan en el dispositivo y se recuperan cuando la app arranca de cero, aunque no haya ninguno habilitado. Un cambio se guarda aunque no haya series que recalcular (por ejemplo, con el peso de trabajo vacío o no válido).
  - Los 7 tipos están habilitados solo la primera vez, o si los datos guardados faltan, no se pueden leer o no son válidos.
  - Los datos guardados de los tipos solo son válidos si son una lista de números sin repetidos en la que cada número es el peso en kg de uno de los 7 tipos. El orden de la lista no importa y la lista vacía es válida (ningún tipo habilitado). Cualquier otra cosa no es válida: por ejemplo, un peso que no es uno de los 7, un peso repetido, un peso escrito como texto o un valor que no es una lista.
  - Los tipos habilitados y cada dato de SPEC-CALC-001 FR-11 se recuperan por separado: si los datos de uno faltan o no son válidos, los demás se recuperan igualmente.
  - Cuando la app vuelve de segundo plano sin haberse cerrado, conserva los tipos habilitados. Si iOS la cerró mientras estaba en segundo plano, la vuelta es un arranque de cero (ADR-0001).
- **FR-09:** si la app no puede guardar un cambio de alguno de los datos guardados (los tipos habilitados y los datos de SPEC-CALC-001 FR-11: la lista de porcentajes, el peso de trabajo, los pesos de la recta y de la Z y la opción de collarines), sigue funcionando con los valores que tiene en memoria y muestra un aviso discreto: "No se ha podido guardar: se mantendrá hasta cerrar la app". Las series se calculan como si se hubiera guardado: con los valores en memoria y, en los pesos, con lo que muestran los campos (SPEC-CALC-001 FR-10).
  - El aviso se muestra mientras el valor actual de alguno de los datos guardados no coincida con el último que se guardó bien, y desaparece cuando todos coinciden. En los pesos, que solo se guardan al terminar de editarlos y si son válidos (SPEC-CALC-001 FR-11), el valor actual es el confirmado, no lo que hay escrito en el campo: mientras se escribe, el aviso no aparece ni desaparece. El peso de trabajo se compara por su texto ("100" y "100,0" no coinciden) y los pesos de barra, por su valor. La app lo sabe sin volver a leer el almacenamiento: al arrancar de cero, el último guardado de cada dato es el valor con el que arranca. Por ejemplo, si se deshace el cambio que no se pudo guardar, el aviso desaparece aunque el almacenamiento siga sin poder guardar.
  - Tras un fallo, cada dato se vuelve a intentar en su propio guardado: un peso, en cada final de su edición, aunque el campo esté vacío o no sea válido (SPEC-CALC-001 FR-11); los demás datos, en su siguiente cambio.
  - El aviso solo aparece al guardar; en los pesos, al terminar de editarlos (SPEC-CALC-001 FR-11). Un fallo al leer los datos al arrancar de cero se trata según FR-08 y SPEC-CALC-001 FR-11, sin aviso.

## 5. Criterios de aceptación

Salvo que se diga otra cosa, los pesos de los AC son pesos de trabajo y los tipos que no se mencionan están habilitados.

- **AC-01 → FR-01, FR-02:** la app muestra los 7 tipos con su peso y su estado. Al tocar el de 25 kg, que está habilitado, pasa a deshabilitado; al tocarlo otra vez, vuelve a habilitado. La app no ofrece ninguna forma de añadir tipos, quitarlos ni indicar cantidades.
- **AC-02 → FR-03, FR-04:** con el de 25 kg deshabilitado, la barra de 20 kg, 100 kg y el 90 % (objetivo 90 kg, 35 kg por lado), la serie muestra 90 kg con 20 + 15 por lado, sin diferencia.
- **AC-03 → FR-03, FR-04:** con solo los de 25 y 20 kg habilitados y 100 kg:
  - en el modo Dos lados, con el 80 % (objetivo 80 kg, 40 kg por lado), la serie muestra 80 kg con 20 + 20 por lado, sin diferencia. Tomar de mayor a menor habría cargado solo un disco de 25 por lado;
  - en el modo Un punto, con el 40 % (objetivo 40 kg), la serie muestra 40 kg con 20 + 20 en el único punto, sin diferencia. Tomar de mayor a menor habría cargado solo un disco de 25.
- **AC-04 → FR-04:** en el modo Dos lados:
  - con solo los de 25, 15, 10 y 5 kg habilitados, 100 kg y el 60 % (30 kg por lado), la serie muestra 25 + 5 por lado, no 15 + 15 (mismo número de discos, gana el disco más grande) ni 10 + 10 + 10 (más discos);
  - con solo los de 25, 20 y 5 kg habilitados, 100 kg y el 80 % (40 kg por lado), la serie muestra 20 + 20 por lado, no 25 + 5 + 5 + 5 (más discos).
- **AC-05 → FR-03, FR-04:** con solo los de 20 y 10 kg habilitados, la barra de 20 kg, 100 kg y el 70 % (objetivo 70 kg, 25 kg por lado), la app carga 60 kg (20 por lado, no 10 + 10) y muestra la diferencia −10 kg (objetivo 70 kg).
- **AC-06 → FR-05:** con solo el de 25 kg habilitado:
  - con la barra de 20 kg, 100 kg y el 40 % (objetivo 40 kg, menor que 20 + 2 × 25 kg), la serie muestra "Solo la barra" y "El 40 % son 40 kg: faltan 30 kg para poner el disco más pequeño (25 kg) a cada lado.", sin diferencia;
  - en el modo Dos lados, con 100 kg y el 40 % (20 kg por lado), la serie muestra "Sin discos", un total de 0 kg y "El 40 % son 40 kg: faltan 10 kg para poner el disco más pequeño (25 kg) a cada lado.", sin diferencia;
  - en el modo Un punto, con 100 kg y el 20 %, la serie muestra "Sin discos", un total de 0 kg y "El 20 % son 20 kg: faltan 5 kg para poner el disco más pequeño (25 kg).", sin diferencia;
  - en el modo Un punto, con 100 kg y el 25 % (objetivo 25 kg), la app carga 25 kg (un disco de 25), sin diferencia.
- **AC-07 → FR-05:** frontera en el modo Barra con los de 2,5 y 1,25 kg deshabilitados (disco mínimo de 5 kg), la barra de 20 kg y el 50 %:
  - con 60 kg (objetivo 30 kg, igual a 20 + 2 × 5 kg), la app carga 30 kg (5 por lado), sin diferencia;
  - con 59,98 kg (objetivo 29,99 kg), la serie muestra "Solo la barra" y "El 50 % son 29,99 kg: faltan 0,01 kg para poner el disco más pequeño (5 kg) a cada lado.", sin diferencia.
- **AC-08 → FR-06, FR-07, FR-03:** con la barra de 20 kg, 100 kg y los porcentajes 40, 70 y 90:
  - sin ningún tipo habilitado, la app no muestra ninguna serie y muestra "Habilita al menos un disco en Mis discos.";
  - al habilitar solo el de 10 kg, sin ninguna otra acción, aparecen las tres series: 40 kg (10 por lado) sin diferencia; 60 kg (10 ×2 por lado) con la diferencia −10 kg (objetivo 70 kg); y 80 kg (10 ×3 por lado) con la diferencia −10 kg (objetivo 90 kg).
- **AC-09 → FR-06:** sin ningún tipo habilitado:
  - con el peso de trabajo vacío, la app muestra la indicación de rellenarlo y la de habilitar al menos un disco, sin ningún mensaje de error;
  - con la lista de porcentajes vacía y 100 kg, muestra la indicación de añadir porcentajes y la de habilitar al menos un disco;
  - con la barra de 20 kg y 15 kg, muestra el aviso de que el peso de trabajo es inferior a la barra y la indicación de habilitar al menos un disco, sin ninguna serie;
  - con un peso de trabajo de 0, muestra el mensaje que dice qué falla y la indicación de habilitar al menos un disco, sin ninguna serie;
  - con la Z, un peso de barra de 0 y 50 kg, muestra el mensaje de peso de barra no válido (SPEC-CALC-001 FR-02, con el aviso general de SPEC-CALC-003 FR-05) y la indicación de habilitar al menos un disco, sin ninguna serie.
- **AC-10 → FR-07, FR-04:** con la barra de 20 kg, 100 kg y el 90 %, la serie muestra 25 + 10 por lado. Al deshabilitar el de 25 kg, sin ninguna otra acción, muestra 20 + 15 por lado; al volver a habilitarlo, otra vez 25 + 10.
- **AC-11 → FR-08:** al recuperar los tipos habilitados en un arranque de cero:
  - la primera vez que se abre la app, los 7 tipos están habilitados;
  - si la persona deshabilita los de 25 y 1,25 kg, cierra la app y la vuelve a abrir, esos dos siguen deshabilitados y los demás habilitados;
  - si la persona deshabilita todos, cierra la app y la vuelve a abrir, sigue sin haber ninguno habilitado y se muestra la indicación de habilitar al menos un disco;
  - si, con el peso de trabajo vacío, la persona deshabilita el de 25 kg, cierra la app y la vuelve a abrir, el de 25 kg sigue deshabilitado;
  - los 7 tipos están habilitados si los datos guardados de los tipos:
    - faltan;
    - no se pueden leer;
    - incluyen un peso que no es uno de los 7 (por ejemplo, 50 kg);
    - repiten un peso (por ejemplo, 25 y 25);
    - incluyen un peso escrito como texto (por ejemplo, "25");
    - no son una lista;
  - si los datos guardados son la lista 1,25 y 25 (en ese orden), solo esos dos tipos están habilitados.
- **AC-12 → FR-08:** los datos guardados se recuperan por separado:
  - con el de 25 kg deshabilitado y los datos de los porcentajes ilegibles, al arrancar de cero la lista es 40, 70 y 90 y el de 25 kg sigue deshabilitado;
  - con la lista 50 y 75 y los datos de los tipos ilegibles, al arrancar de cero los 7 tipos están habilitados y la lista sigue siendo 50 y 75.
- **AC-13 → FR-08:** con el de 25 kg deshabilitado, la barra de 20 kg, 100 kg y el 90 %, si la persona pasa a otra app y vuelve sin que la app haya arrancado de cero, el de 25 kg sigue deshabilitado y la serie sigue mostrando 20 + 15 por lado.
- **AC-14 → FR-09:** con la barra de 20 kg, 100 kg, el 90 %, sin el aviso de fallo al guardar y con el almacenamiento del dispositivo sin poder guardar, cada caso desde ese punto de partida:
  - al deshabilitar el de 25 kg, el de 25 kg queda deshabilitado, la serie muestra 20 + 15 por lado y la app muestra el aviso "No se ha podido guardar: se mantendrá hasta cerrar la app";
  - al añadir el porcentaje 50, aparece la serie del 50 % y la app muestra el mismo aviso;
  - al cambiar el peso de trabajo a 105 kg y salir del campo, las series se recalculan y la app muestra el mismo aviso;
  - al quitar el porcentaje 90, desaparece su serie y la app muestra el mismo aviso;
  - al deshabilitar el de 25 kg (aparece el aviso), si después el almacenamiento vuelve a poder guardar y la persona añade el porcentaje 50, la lista se guarda pero el aviso sigue, porque los tipos habilitados no se han guardado; al habilitar otra vez el de 25 kg, los tipos se guardan y el aviso desaparece;
  - al deshabilitar el de 25 kg (aparece el aviso) y volver a habilitarlo con el almacenamiento todavía sin poder guardar, el aviso desaparece, porque los dos datos vuelven a coincidir con lo último que se guardó bien;
  - al añadir el porcentaje 50 (aparece el aviso), si después el almacenamiento vuelve a poder guardar y la persona deshabilita el de 25 kg, los tipos se guardan pero el aviso sigue, porque la lista no coincide con la última guardada.
- **AC-15 → FR-09:** con la barra de 20 kg, el peso de trabajo guardado "100", sin el aviso de fallo al guardar y con el almacenamiento sin poder guardar:
  - al cambiar el peso de trabajo a "105", el aviso no aparece mientras se escribe; al salir del campo, aparece; al volver a escribir "100" y salir del campo, desaparece;
  - al cambiar el peso de trabajo a "105" y salir del campo (aparece el aviso), y después borrar el campo y salir de él, el aviso sigue, porque el peso confirmado, "105", no coincide con el guardado;
  - al cambiar el peso de trabajo a "105" y salir del campo (aparece el aviso), si después la persona vuelve a escribir "100" sin salir del campo, el aviso sigue; al salir del campo, desaparece;
  - al cambiar el peso de trabajo a "105" y salir del campo (aparece el aviso), si después el almacenamiento vuelve a poder guardar y la persona entra en el campo y sale sin cambiar nada, se guarda "105" y el aviso desaparece. Lo mismo si, en lugar de no cambiar nada, borra el campo y sale con el campo vacío;
  - al escribir "105" en el peso de trabajo y, sin salir del campo, pasar la app a segundo plano, al volver la app muestra el aviso;
  - al activar los collarines, aparece el aviso; al desactivarlos, desaparece;
  - al cambiar a la Z, escribir 8,5 kg en su peso y salir del campo, aparece el aviso. Si después el almacenamiento vuelve a poder guardar y la persona elige la recta, el aviso sigue, porque el peso de la Z no se ha vuelto a intentar; al volver a la Z, entrar en su campo y salir, se guarda 8,5 kg y el aviso desaparece.

## 6. Casos límite, errores y decisiones pendientes

- **Casos límite y errores:**
  - un subconjunto en el que tomar de mayor a menor no da el mayor peso: la app busca la mejor combinación (FR-04, AC-03);
  - varias combinaciones con el mismo peso: gana la de menos discos y, si empatan, la del disco más grande (FR-04, AC-04);
  - el objetivo no llega al tipo habilitado más pequeño: "Solo la barra" o "Sin discos", con lo que falta para ese mínimo (FR-05, AC-06, AC-07);
  - ningún tipo habilitado: sin series y con una indicación, junto a las demás indicaciones o avisos (FR-06, AC-08, AC-09);
  - ningún tipo habilitado guardado: se recupera así (FR-08, AC-11);
  - datos guardados de los tipos que faltan, ilegibles o no válidos (con un peso ajeno a los 7, con un peso repetido o que no son una lista): los 7 habilitados, sin afectar a la lista de porcentajes (FR-08, AC-11, AC-12);
  - habilitar o deshabilitar con el peso vacío o no válido: no hay series que recalcular, pero el cambio se aplica y se guarda (FR-02, FR-08, AC-11);
  - fallo al guardar cualquier dato guardado: la app sigue con los valores en memoria y muestra un aviso discreto mientras alguno no coincida con lo último que se guardó bien; en los pesos cuenta el valor confirmado, y el aviso no cambia mientras se escribe (FR-09, AC-14, AC-15);
  - pocos tipos habilitados y un objetivo grande (por ejemplo, solo el de 1,25 kg y 500 kg en el modo Un punto, 400 discos): se muestran todos los discos, sin límite, agrupados por tipo (SPEC-CALC-001 FR-08), con el aviso de capacidad de SPEC-CALC-001 FR-16.
- **Decisiones pendientes:** ninguna crítica.

---

## 11. Dependencias y restricciones

- Depende de SPEC-CALC-001 v0.7, que delega en esta spec qué discos se usan (FR-06, FR-07 y FR-09) e incluye los tipos habilitados en SPEC-CALC-001 AC-13.
- La presentación de los tipos ("Mis discos") la fija SPEC-CALC-003.
- ADR-0002, que modifica ADR-0001 §3.2, y ADR-0004, que lo amplía, fijan qué se guarda en el dispositivo y dónde; ADR-0005 modifica ADR-0004 para que los pesos se escriban al terminar de editarlos. Esta versión no se fusiona antes que ADR-0005. Las reglas de validez, los valores por defecto y el fallo al guardar viven en esta spec (FR-08, FR-09) y en SPEC-CALC-001 FR-11.
- SPEC-CALC-002 AC-13 no se da por cumplido sin la prueba manual en el iPhone de ADR-0002 §5.
