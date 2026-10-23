---
id: SPEC-CALC-002
titulo: Inventario de discos disponibles
estado: en-revision
version: 0.1
riesgo: R1
sustituye: null
adr: [ADR-0001, ADR-0002]
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
  - el diseño visual de los discos (por ejemplo, con imágenes), que se decide aparte.

## 3. Actores

Víctor, único usuario, en su iPhone. Los discos habilitados son un dato introducido por la persona a efectos de SPEC-CALC-001 NFR-02 (y de SPEC-CALC-001 AC-13).

## 4. Requisitos funcionales

- **FR-01:** los tipos de disco son exactamente los 7 de SPEC-CALC-001 (FR-07): 25, 20, 15, 10, 5, 2,5 y 1,25 kg. Cada uno está habilitado o deshabilitado. La persona no puede añadir ni quitar tipos ni indicar cantidades: cada tipo habilitado tiene existencias ilimitadas.
- **FR-02:** la app muestra los 7 tipos, cada uno con su peso y con su estado (habilitado o deshabilitado). Cuando la persona toca un tipo, su estado cambia al contrario. La forma visual (por ejemplo, una imagen de cada disco) no forma parte de esta spec.
- **FR-03:** el cálculo de SPEC-CALC-001 usa solo los tipos habilitados, en los tres modos y con todas las barras. Cada serie se calcula por separado con todos los tipos habilitados: un disco usado en una serie no se descuenta para las demás.
- **FR-04:** de todas las combinaciones de discos habilitados que dan el peso cargado de SPEC-CALC-001 FR-06 (por lado en los modos Barra y Dos lados, y en el único punto en el modo Un punto), la app elige:
  1. la que usa menos discos;
  2. si empatan, la que tiene el disco más grande. Si también empatan en ese disco, se compara el siguiente más grande, y así hasta que uno sea mayor.

  Los discos se muestran de mayor a menor. Con los 7 tipos habilitados, el resultado coincide con tomar los discos de mayor a menor, tantos de cada uno como quepan.
- **FR-05:** el "disco más pequeño" de SPEC-CALC-001 FR-09 es el tipo habilitado más pequeño. Los mensajes de FR-09 en los modos Dos lados y Un punto dicen ese peso: "el disco mínimo es de Y kg".
- **FR-06:** cuando no hay ningún tipo habilitado, la app no muestra ninguna serie y muestra una indicación para habilitar al menos un disco. Esta indicación aparece además de las indicaciones, avisos o errores que correspondan por SPEC-CALC-001 (FR-03, FR-12 y FR-13).
- **FR-07:** cuando la persona habilita o deshabilita un tipo, las series se recalculan al momento, sin un botón de calcular, como en SPEC-CALC-001 FR-10.
- **FR-08:** los tipos habilitados se guardan en el dispositivo y se recuperan cuando la app arranca de cero, aunque no haya ninguno habilitado. Un cambio se guarda aunque no haya series que recalcular (por ejemplo, con el peso de trabajo vacío o no válido).
  - Los 7 tipos están habilitados solo la primera vez, o si los datos guardados faltan, no se pueden leer o no son válidos.
  - Los datos guardados de los tipos solo son válidos si son una lista de pesos sin repetidos en la que cada peso es uno de los 7 tipos. La lista vacía es válida (ningún tipo habilitado). Cualquier otra cosa no es válida: por ejemplo, un peso que no es uno de los 7, un peso repetido o un valor que no es una lista.
  - Los tipos habilitados y la lista de porcentajes (SPEC-CALC-001 FR-11) se recuperan por separado: si los datos de uno faltan o no son válidos, el otro se recupera igualmente.
  - Cuando la app vuelve de segundo plano sin haberse cerrado, conserva los tipos habilitados. Si iOS la cerró mientras estaba en segundo plano, la vuelta es un arranque de cero (ADR-0001).
- **FR-09:** si la app no puede guardar un cambio de los tipos habilitados o de la lista de porcentajes (SPEC-CALC-001 FR-11), sigue funcionando con los valores que tiene en memoria y muestra un aviso discreto: "No se ha podido guardar: se mantendrá hasta cerrar la app". Las series se calculan con esos valores como si se hubiera guardado. El aviso sigue visible hasta que un cambio posterior se guarda bien.

## 5. Criterios de aceptación

Salvo que se diga otra cosa, los pesos de los AC son pesos de trabajo y los tipos que no se mencionan están habilitados.

- **AC-01 → FR-01, FR-02:** la app muestra los 7 tipos con su peso y su estado. Al tocar el de 25 kg, que está habilitado, pasa a deshabilitado; al tocarlo otra vez, vuelve a habilitado. La app no ofrece ninguna forma de añadir tipos, quitarlos ni indicar cantidades.
- **AC-02 → FR-03, FR-04:** con el de 25 kg deshabilitado, la barra de 20 kg, 100 kg y el 90 % (objetivo 90 kg, 35 kg por lado), la serie muestra 90 kg con 20 + 15 por lado y 35 kg por lado, sin aviso de redondeo.
- **AC-03 → FR-03, FR-04:** con solo los de 25 y 20 kg habilitados y 100 kg:
  - en el modo Dos lados, con el 80 % (objetivo 80 kg, 40 kg por lado), la serie muestra 80 kg con 20 + 20 por lado, sin aviso de redondeo. Tomar de mayor a menor habría cargado solo un disco de 25 por lado;
  - en el modo Un punto, con el 40 % (objetivo 40 kg), la serie muestra 40 kg con 20 + 20 en el único punto, sin aviso de redondeo. Tomar de mayor a menor habría cargado solo un disco de 25.
- **AC-04 → FR-04:** en el modo Dos lados:
  - con solo los de 25, 15, 10 y 5 kg habilitados, 100 kg y el 60 % (30 kg por lado), la serie muestra 25 + 5 por lado, no 15 + 15 (mismo número de discos, gana el disco más grande) ni 10 + 10 + 10 (más discos);
  - con solo los de 25, 20 y 5 kg habilitados, 100 kg y el 80 % (40 kg por lado), la serie muestra 20 + 20 por lado, no 25 + 5 + 5 + 5 (más discos).
- **AC-05 → FR-03, FR-04:** con solo los de 20 y 10 kg habilitados, la barra de 20 kg, 100 kg y el 70 % (objetivo 70 kg, 25 kg por lado), la app carga 60 kg (20 por lado, no 10 + 10) y avisa: objetivo 70 kg, diferencia −10 kg.
- **AC-06 → FR-05:** con solo el de 25 kg habilitado:
  - con la barra de 20 kg, 100 kg y el 40 % (objetivo 40 kg, menor que 20 + 2 × 25 kg), la serie muestra "Solo barra (20 kg) · 0 kg por lado" y que el objetivo era 40 kg, sin cifra de diferencia;
  - en el modo Dos lados, con 100 kg y el 40 % (20 kg por lado), la serie muestra "Peso por lado demasiado pequeño: el disco mínimo es de 25 kg" y que el objetivo era 40 kg, sin peso total ni cifra de diferencia;
  - en el modo Un punto, con 100 kg y el 20 %, la serie muestra "Peso demasiado pequeño: el disco mínimo es de 25 kg" y que el objetivo era 20 kg, sin peso total ni cifra de diferencia;
  - en el modo Un punto, con 100 kg y el 25 % (objetivo 25 kg), la app carga 25 kg (un disco de 25), sin aviso de redondeo.
- **AC-07 → FR-05:** frontera en el modo Barra con los de 2,5 y 1,25 kg deshabilitados (disco mínimo de 5 kg), la barra de 20 kg y el 50 %:
  - con 60 kg (objetivo 30 kg, igual a 20 + 2 × 5 kg), la app carga 30 kg (5 por lado), sin aviso de redondeo;
  - con 59,98 kg (objetivo 29,99 kg), la serie muestra "Solo barra (20 kg) · 0 kg por lado" y que el objetivo era 29,99 kg, sin cifra de diferencia.
- **AC-08 → FR-06, FR-07, FR-03:** con la barra de 20 kg, 100 kg y los porcentajes 40, 70 y 90:
  - sin ningún tipo habilitado, la app no muestra ninguna serie y muestra la indicación de habilitar al menos un disco;
  - al habilitar solo el de 10 kg, sin ninguna otra acción, aparecen las tres series: 40 kg (10 por lado) sin aviso; 60 kg (10 + 10 por lado) con objetivo 70 kg y diferencia −10 kg; y 80 kg (10 + 10 + 10 por lado) con objetivo 90 kg y diferencia −10 kg.
- **AC-09 → FR-06:** sin ningún tipo habilitado:
  - con el peso de trabajo vacío, la app muestra la indicación de rellenarlo y la de habilitar al menos un disco, sin ningún mensaje de error;
  - con la lista de porcentajes vacía y 100 kg, muestra la indicación de añadir porcentajes y la de habilitar al menos un disco;
  - con la barra de 20 kg y 15 kg, muestra el aviso de que el peso de trabajo es inferior a la barra y la indicación de habilitar al menos un disco, sin ninguna serie;
  - con un peso de trabajo de 0, muestra el mensaje que dice qué falla y la indicación de habilitar al menos un disco, sin ninguna serie.
- **AC-10 → FR-07, FR-04:** con la barra de 20 kg, 100 kg y el 90 %, la serie muestra 25 + 10 por lado. Al deshabilitar el de 25 kg, sin ninguna otra acción, muestra 20 + 15 por lado; al volver a habilitarlo, otra vez 25 + 10.
- **AC-11 → FR-08:** al recuperar los tipos habilitados en un arranque de cero:
  - la primera vez que se abre la app, los 7 tipos están habilitados;
  - si la persona deshabilita los de 25 y 1,25 kg, cierra la app y la vuelve a abrir, esos dos siguen deshabilitados y los demás habilitados;
  - si la persona deshabilita todos, cierra la app y la vuelve a abrir, sigue sin haber ninguno habilitado y se muestra la indicación de habilitar al menos un disco;
  - si, con el peso de trabajo vacío, la persona deshabilita el de 25 kg, cierra la app y la vuelve a abrir, el de 25 kg sigue deshabilitado;
  - si los datos guardados de los tipos faltan, no se pueden leer, incluyen un peso que no es uno de los 7 (por ejemplo, 50 kg), repiten un peso (por ejemplo, 25 y 25) o no son una lista, los 7 tipos están habilitados.
- **AC-12 → FR-08:** los datos guardados se recuperan por separado:
  - con el de 25 kg deshabilitado y los datos de los porcentajes ilegibles, al arrancar de cero la lista es 40, 70 y 90 y el de 25 kg sigue deshabilitado;
  - con la lista 50 y 75 y los datos de los tipos ilegibles, al arrancar de cero los 7 tipos están habilitados y la lista sigue siendo 50 y 75.
- **AC-13 → FR-08:** con el de 25 kg deshabilitado, la barra de 20 kg, 100 kg y el 90 %, si la persona pasa a otra app y vuelve sin que la app haya arrancado de cero, el de 25 kg sigue deshabilitado y la serie sigue mostrando 20 + 15 por lado.
- **AC-14 → FR-09:** con la barra de 20 kg, 100 kg, el 90 % y el almacenamiento del dispositivo sin poder guardar:
  - al deshabilitar el de 25 kg, el de 25 kg queda deshabilitado, la serie muestra 20 + 15 por lado y la app muestra el aviso "No se ha podido guardar: se mantendrá hasta cerrar la app";
  - al añadir el porcentaje 50, aparece la serie del 50 % y la app muestra el mismo aviso;
  - si después el almacenamiento vuelve a poder guardar y la persona habilita el de 25 kg, el cambio se guarda y el aviso desaparece.

## 6. Casos límite, errores y decisiones pendientes

- **Casos límite y errores:**
  - un subconjunto en el que tomar de mayor a menor no da el mayor peso: la app busca la mejor combinación (FR-04, AC-03);
  - varias combinaciones con el mismo peso: gana la de menos discos y, si empatan, la del disco más grande (FR-04, AC-04);
  - el objetivo no llega al tipo habilitado más pequeño: "Solo barra" o aviso de peso demasiado pequeño con ese mínimo (FR-05, AC-06, AC-07);
  - ningún tipo habilitado: sin series y con una indicación, junto a las demás indicaciones o avisos (FR-06, AC-08, AC-09);
  - ningún tipo habilitado guardado: se recupera así (FR-08, AC-11);
  - datos guardados de los tipos que faltan, ilegibles o no válidos (con un peso ajeno a los 7, con un peso repetido o que no son una lista): los 7 habilitados, sin afectar a la lista de porcentajes (FR-08, AC-11, AC-12);
  - habilitar o deshabilitar con el peso vacío o no válido: no hay series que recalcular, pero el cambio se aplica y se guarda (FR-02, FR-08, AC-11);
  - fallo al guardar los tipos o los porcentajes: la app sigue con los valores en memoria y muestra un aviso discreto (FR-09, AC-14).
- **Decisiones pendientes:** ninguna crítica. El diseño visual de los tipos se decide aparte y no cambia esta spec.

---

## 11. Dependencias y restricciones

- Depende de SPEC-CALC-001 v0.5, que delega en esta spec qué discos se usan (FR-06, FR-07 y FR-09) e incluye los tipos habilitados en SPEC-CALC-001 AC-13.
- ADR-0002, que modifica ADR-0001 §3.2, fija qué se guarda en el dispositivo y dónde: la lista de porcentajes y los tipos habilitados, cada uno en su propia entrada. Las reglas de validez, los valores por defecto y el fallo al guardar viven en esta spec (FR-08, FR-09) y en SPEC-CALC-001 FR-11.
- AC-13 no se da por cumplido sin la prueba manual en el iPhone de ADR-0002 §5.
