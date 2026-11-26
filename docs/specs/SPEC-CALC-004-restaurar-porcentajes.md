---
id: SPEC-CALC-004
titulo: Volver a los porcentajes habituales
estado: en-revision
version: 0.1
riesgo: R1
sustituye: null
adr: [ADR-0001, ADR-0002, ADR-0004]
transversales: []
---

<!--
Redactada con sdd-spec el 2026-11-26, en la prueba real de VIC-58 (ADR-0009 §3.6
del workflow). La idea y sus reglas las decidió Víctor el 2026-11-26: un botón
bajo "+ Añadir porcentaje", visible solo cuando la lista no es 40, 70 y 90; un
aviso con "Deshacer" en vez de una confirmación previa; las tarjetas se animan
como al añadir y al borrar; y añadir un porcentaje cierra el aviso, a diferencia
del de SPEC-CALC-003 FR-08 (FR-03, con el motivo). Las propuestas eran de Claude
y Víctor las eligió entre otras opciones.
Amplía SPEC-CALC-003 (v0.6) sin cambiar su texto: añade un elemento tras el
bloque 6 de FR-01 y un segundo tipo de aviso con "Deshacer" junto al de FR-08.
-->

# SPEC-CALC-004 — Volver a los porcentajes habituales

## 1. Objetivo

Que Víctor, tras añadir o quitar series sobre la marcha, vuelva de un toque a su esquema habitual de 40, 70 y 90 %, sin borrar y añadir porcentajes uno a uno.

## 2. Alcance y exclusiones

- **Incluye:**
  - un botón que sustituye la lista de porcentajes por 40, 70 y 90 %;
  - cuándo se ve el botón;
  - el aviso con "Deshacer" que deja recuperar la lista anterior;
  - el foco y las animaciones al restaurar y al deshacer.
- **Excluye:**
  - elegir o guardar otros esquemas de porcentajes: el esquema es siempre 40, 70 y 90 %;
  - restaurar cualquier otro dato (peso de trabajo, modo, barra, collarines, discos habilitados);
  - cambiar las reglas de la lista de SPEC-CALC-001 FR-04 o el aviso de borrar una serie de SPEC-CALC-003 FR-08.

## 3. Actores

Víctor, único usuario, en su iPhone, con el dedo, con el teclado del sistema o con VoiceOver.

## 4. Requisitos funcionales

En esta spec, "el esquema habitual" es la lista de porcentajes 40, 70 y 90 %, la misma que SPEC-CALC-001 FR-11 usa la primera vez.

- **FR-01:** justo debajo del botón "+ Añadir porcentaje" (SPEC-CALC-003 FR-01, bloque 6), o del campo de añadir cuando está abierto (SPEC-CALC-003 FR-09), hay un botón "Volver a 40, 70 y 90 %":
  - se ve siempre que la lista de porcentajes no es exactamente el esquema habitual, también con la lista vacía y aunque la app no muestre series (por ejemplo, con el peso de trabajo vacío o no válido, o sin ningún disco habilitado);
  - cuando la lista es exactamente el esquema habitual, no se ve ni se puede alcanzar con el teclado ni con VoiceOver;
  - cumple SPEC-CALC-003 NFR-01 (tamaño de toque) y NFR-02 (contraste), y su aspecto es secundario frente a "+ Añadir porcentaje": sin borde discontinuo ni fondo propio.
- **FR-02:** cuando la persona pulsa "Volver a 40, 70 y 90 %":
  - si el campo de añadir está abierto, primero pierde el foco y hace lo mismo que al confirmar (SPEC-CALC-003 FR-09): un porcentaje válido se añade antes de restaurar;
  - después, si la lista no es ya el esquema habitual, pasa a serlo, se guarda como cualquier cambio de la lista (SPEC-CALC-001 FR-11; si no se puede guardar, SPEC-CALC-002 FR-09) y las series se recalculan al momento (SPEC-CALC-001 FR-10). Si la lista ya es el esquema habitual, no cambia nada y no aparece el aviso de FR-03.
- **FR-03:** tras restaurar, aparece el aviso "Porcentajes restaurados" con el botón "Deshacer":
  - está en el mismo sitio, se anuncia igual a los lectores de pantalla, no tapa "+ Añadir porcentaje" y tiene el mismo plazo de 5 s que el aviso de SPEC-CALC-003 FR-08, contado igual (tiempo real, también en segundo plano, sin detenerse con el foco);
  - solo hay un aviso con "Deshacer" a la vez: uno nuevo, de restaurar o de borrar una serie, sustituye al anterior, que ya no se puede deshacer, y empieza un plazo de 5 s nuevo;
  - se cierra antes por las mismas causas que el de SPEC-CALC-003 FR-08 (borrar una serie, teclear en un peso, cambiar el modo, la barra, los collarines o los discos habilitados, o pulsar "Deshacer") y, además, cuando la persona añade un porcentaje, que se queda en la lista. Esta diferencia con FR-08 es deliberada: "Deshacer" de un borrado devuelve una sola tarjeta y convive bien con lo añadido después, mientras que "Deshacer" de una restauración sustituye la lista entera, y no debe quitar ni conservar en silencio lo añadido entretanto;
  - "Deshacer" vuelve a poner la lista exactamente como estaba antes de restaurar, aunque estuviera vacía, la guarda (SPEC-CALC-001 FR-11) y cierra el aviso. Cuando el aviso desaparece, ya no se puede deshacer.
- **FR-04:** el foco:
  - tras pulsar "Volver a 40, 70 y 90 %", que deja de verse, el foco pasa a "Deshacer". Si no aparece el aviso (FR-02, la lista ya era el esquema habitual), pasa a "+ Añadir porcentaje";
  - si el foco sigue en el aviso cuando desaparece o cuando se pulsa "Deshacer", pasa a "+ Añadir porcentaje" o, si el campo de añadir está abierto, a ese campo, como en SPEC-CALC-003 FR-08. Si la persona ha llevado el foco a otro sitio, no se mueve.
- **FR-05:** las tarjetas, al restaurar y al deshacer:
  - las de los porcentajes que entran en la lista entran como añadidas (SPEC-CALC-003 FR-10): con el fundido y el dibujo ya cargado;
  - las de los que salen de la lista desaparecen sin salir de lado, y su hueco se cierra como el de una tarjeta borrada (SPEC-CALC-003 FR-08);
  - las de los que siguen en la lista no se animan ni cambian su carga;
  - con "Reducir movimiento" activado, no hay ninguna animación ni transición (SPEC-CALC-003 FR-13);
  - mientras la app no muestra series, no hay tarjetas que animar: al volver a mostrarse, aparecen como al arrancar (SPEC-CALC-003 FR-10).

## 5. Criterios de aceptación

Cada AC indica qué requisito demuestra. Salvo que diga otra cosa, parte de la olímpica de 20 kg, 100 kg y todos los discos habilitados.

- **AC-01 → FR-01:** al arrancar por primera vez, con la lista 40, 70 y 90, no hay ningún botón "Volver a 40, 70 y 90 %", ni a la vista ni para el teclado o VoiceOver. Al borrar la serie del 70 %, aparece justo debajo de "+ Añadir porcentaje", mide al menos 44 × 44 px y cumple el contraste de SPEC-CALC-003 NFR-02. Al pulsar "Deshacer" del borrado, deja de verse.
- **AC-02 → FR-01:** el botón se ve con la lista vacía y el peso de trabajo vacío, junto a "Escribe el peso de trabajo." y "Añade al menos un porcentaje."; con la lista 40, 70, 90 y 100; y, con el campo de añadir abierto y la lista 40 y 70, justo debajo del campo.
- **AC-03 → FR-02, FR-03:** con la lista 50 y 80, al pulsar el botón, la app muestra las series de SPEC-CALC-001 AC-01, el aviso "Porcentajes restaurados" con "Deshacer", y el botón deja de verse. Tras arrancar de cero, la lista es 40, 70 y 90. Si en lugar de arrancar de cero se pulsa "Deshacer", la lista vuelve a ser 50 y 80, el aviso se cierra, el botón vuelve a verse, y tras arrancar de cero la lista es 50 y 80.
- **AC-04 → FR-03:** con la lista vacía, al pulsar el botón y después "Deshacer", la app no muestra ninguna serie y muestra "Añade al menos un porcentaje."; tras arrancar de cero, la lista sigue vacía.
- **AC-05 → FR-03:** con la lista 50 y 80 y el aviso "Porcentajes restaurados" recién aparecido, cada punto parte de ese estado y los tiempos se cuentan desde que aparece el aviso:
  - a los 5 s el aviso ha desaparecido y la lista sigue siendo 40, 70 y 90;
  - al añadir el 50 %, el aviso se cierra y la lista es 40, 50, 70 y 90;
  - al borrar la serie del 70 %, aparece "Serie del 70 % borrada" en lugar de "Porcentajes restaurados", y su "Deshacer" devuelve la lista 40, 70 y 90: no vuelven el 50 ni el 80;
  - al escribir 105 en el peso de trabajo, el aviso se cierra;
  - al pasar la app a segundo plano 6 s y volver, el aviso ya no está.
- **AC-06 → FR-03:** con la lista 40, 70 y 90, al borrar la serie del 70 % y pulsar "Volver a 40, 70 y 90 %" con el aviso de borrado aún visible, aparece "Porcentajes restaurados" en lugar de "Serie del 70 % borrada", y su "Deshacer" devuelve la lista 40 y 90.
- **AC-07 → FR-02:** con la lista 40 y 70 y el campo de añadir abierto, al pulsar "Volver a 40, 70 y 90 %":
  - con "90" escrito, se añade el 90 %, la lista es 40, 70 y 90, no aparece "Porcentajes restaurados" y el botón deja de verse;
  - con "55" escrito, la lista es 40, 70 y 90 y aparece "Porcentajes restaurados"; su "Deshacer" devuelve la lista 40, 55 y 70;
  - con "150" escrito, el campo sigue abierto con "Escribe un porcentaje entre 1 y 100.", la lista es 40, 70 y 90 y aparece "Porcentajes restaurados".
- **AC-08 → FR-02:** con la lista 50 y 80 y el almacenamiento sin poder guardar, al pulsar el botón la app muestra las series de SPEC-CALC-001 AC-01 y el aviso "No se ha podido guardar: se mantendrá hasta cerrar la app" (SPEC-CALC-002 FR-09).
- **AC-09 → FR-04:** con la lista 50 y 80, con el teclado:
  - al activar "Volver a 40, 70 y 90 %", el foco pasa a "Deshacer"; al activarlo, la lista vuelve a 50 y 80 y el foco pasa a "+ Añadir porcentaje";
  - si tras activar el botón el foco se queda en "Deshacer", a los 5 s el aviso desaparece y el foco pasa a "+ Añadir porcentaje";
  - si tras activar el botón la persona lleva el foco al peso de trabajo, al desaparecer el aviso el foco sigue en el peso de trabajo.
- **AC-10 → FR-05:** sin "Reducir movimiento", con la lista 40, 50 y 70, al pulsar el botón, la tarjeta del 90 % entra con una animación de opacidad (de la Web Animations API) y su dibujo no tiene animación en curso; la del 50 % desaparece sin desplazarse de lado; y las del 40 y el 70 % no tienen animación en curso y siguen mostrando la misma carga. Al pulsar "Deshacer", la tarjeta del 50 % entra como añadida y la del 90 % desaparece igual. Con "Reducir movimiento" activado, ninguna tarjeta ni ningún dibujo tiene animaciones ni transiciones en curso al restaurar ni al deshacer.
- **AC-11 → FR-05:** con el peso de trabajo vacío y la lista 50 y 80, al pulsar el botón no hay tarjetas; al escribir 100, aparecen las del 40, 70 y 90 % sin animación de entrada y con el dibujo sin animación en curso.

## 6. Casos límite, errores y decisiones pendientes

- **Casos límite y errores:**
  - la lista ya es el esquema habitual tras confirmar el campo de añadir: no cambia nada ni aparece el aviso (FR-02, AC-07);
  - un porcentaje no válido en el campo de añadir al restaurar: el error se queda y la restauración se aplica (AC-07);
  - restaurar con la lista vacía o sin series visibles: el botón se ve y funciona; "Deshacer" devuelve la lista vacía (AC-02, AC-04, AC-11);
  - restaurar y borrar una serie, en cualquier orden: el último aviso sustituye al anterior y solo se deshace la última acción (AC-05, AC-06);
  - añadir un porcentaje con el aviso de restaurar visible: el aviso se cierra y el porcentaje se queda (AC-05);
  - fallo al guardar: la app sigue con la lista restaurada en memoria y muestra el aviso de SPEC-CALC-002 FR-09 (AC-08);
  - la lista restaurada se guarda y se recupera como cualquier lista (SPEC-CALC-001 FR-11): no hay ningún dato guardado nuevo.
- **Decisiones pendientes:** ninguna crítica.

---

## 11. Dependencias y restricciones

- Depende de SPEC-CALC-001 v0.9 (FR-04, FR-10, FR-11), SPEC-CALC-002 v0.3 (FR-09) y SPEC-CALC-003 v0.6 (FR-01, FR-08, FR-09, FR-10, FR-13, NFR-01 y NFR-02). Esta spec no cambia su texto: añade el botón tras el bloque 6 de SPEC-CALC-003 FR-01 y un segundo tipo de aviso con "Deshacer" que comparte sitio y plazo con el de SPEC-CALC-003 FR-08.
- La lista se guarda donde y como fijan ADR-0002 y ADR-0004; esta spec no añade datos guardados.
- **Pruebas:** como en SPEC-CALC-003 §11: los plazos del aviso, con un reloj controlado; los AC, con E2E de Playwright; los de animación (AC-10, AC-11), solo en un navegador de la CI que dibuje en 3D, comprobando antes que el dibujo está activo.

## 12. Entregas

- VIC-65: botón «Volver a 40, 70 y 90 %» con su aviso y «Deshacer» (AC-01 a AC-11)
