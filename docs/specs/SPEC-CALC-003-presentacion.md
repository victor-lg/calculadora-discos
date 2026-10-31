---
id: SPEC-CALC-003
titulo: Presentación de la calculadora
estado: en-revision
version: 0.3
riesgo: R1
sustituye: null
adr: [ADR-0001, ADR-0003, ADR-0005]
transversales: []
---

<!--
Redactada con sdd-spec (VIC-9) a partir de docs/diseno/notas-diseno-interfaz.md
§3–§6 y §8 y de docs/diseno/maqueta-interfaz.html, con las decisiones que Víctor
tomó en las sesiones de diseño del 23 al 25 de octubre. Las reglas de cálculo,
validación y guardado, y sus textos, viven en SPEC-CALC-001 y SPEC-CALC-002:
esta spec dice dónde y cómo se presentan. En la revisión del PR #16, Víctor
confirmó como reglas tres inferencias de Claude a partir de la maqueta: FR-08
(solo se puede deshacer el último borrado), FR-09 (una confirmación añade una
sola vez) y FR-12 (el dibujo acaba en la carga actual). También fijó el
contraste WCAG 2.2 AA (NFR-02) y la prueba con el zoom de página de Safari al
200 % (NFR-03), en lugar del texto ampliado del sistema, que Safari no aplica a
una web.
Tras la ronda 1 de G4 (2026-10-26), Víctor decidió el aviso general para un peso
de barra no válido (FR-05), que manda WCAG 2.2 AA sobre la referencia visual y que
los puntos de color son decorativos (NFR-02), y que se oculta un dibujo que ya no
corresponde a la carga (FR-15). Son propuestas de Claude, para revisar en el PR,
el foco tras borrar y tras cerrar el campo de añadir (FR-08, FR-09), el anuncio
del resumen de Mis discos (FR-04), que el número del peso se reduzca si no cabe
(FR-02), que una tarjeta nueva aparezca ya cargada (FR-10) y el estado
observable del dibujo (FR-16).
Tras la ronda 2 de G4 (2026-10-26), Víctor decidió el separador " + " de la
etiqueta del dibujo (FR-07), que lo pegado no se recorta (FR-02, FR-09), que
perder el foco al pasar a segundo plano no confirma (FR-09) y la pulsación larga
como alternativa al gesto de borrar (FR-08, WCAG 2.5.7). Son propuestas de Claude
los 500 ms de la pulsación larga, a quién pasa el foco (FR-08, FR-09) y cómo
reaparecen las series (FR-10).
Tras la ronda 3 de G4 (2026-10-26), Víctor decidió que el aviso de "Deshacer" no
tiene plazo y dura hasta la siguiente acción (FR-08, WCAG 2.2.1). El resto de
los cambios de esa ronda son aclaraciones, sin otra ronda de revisión.
La versión 0.2 (VIC-13) solo cambia el peso de la recta y la Z en el resumen de
Carga y en sus fichas (FR-03, AC-03): el del campo mientras es válido y, si no, el
confirmado de SPEC-CALC-001 v0.7 FR-11, en lugar del último válido tecleado.
Decisiones de Víctor del 2026-10-29, en las rondas 1 y 2 de G4 del PR #22, que
ajusta esta spec en el mismo PR que SPEC-CALC-001 v0.7 y SPEC-CALC-002 v0.3.
Tras la ronda 3, FR-08 aclara que el aviso de "Deshacer" desaparece al teclear en
un peso, como ya decía AC-12.
La versión 0.3 (VIC-11) quita "añadir una serie" de las acciones que cierran el
aviso de "Deshacer" (FR-08), para que cuadre con AC-13, que añade el 70 con el
aviso abierto y después pulsa "Deshacer". Es una aclaración de Víctor del
2026-10-31, sin reglas nuevas, en el mismo PR que SPEC-CALC-001 v0.8.
-->

# SPEC-CALC-003 — Presentación de la calculadora

## 1. Objetivo

Que Víctor vea de un vistazo, con el móvil en una mano y entre series, qué cargar en cada serie, con la carga dibujada como la verá en la barra o en la máquina, y que la app siga siendo usable sin 3D, sin animaciones y con el zoom de página.

## 2. Alcance y exclusiones

- **Incluye:**
  - la estructura de la única pantalla y el orden de sus bloques;
  - dónde aparecen los textos, avisos y errores de SPEC-CALC-001 y SPEC-CALC-002;
  - la tarjeta de cada serie;
  - añadir y borrar series, y deshacer un borrado;
  - los paneles Carga y Mis discos;
  - el dibujo 3D de la carga, su movimiento y su desactivación;
  - el funcionamiento sin 3D y tras perder el contexto gráfico;
  - la accesibilidad: tamaño de toque, contraste, alternativas a los gestos y zoom de página.
- **Excluye:**
  - las reglas de cálculo, validación y guardado, y sus textos, que fijan SPEC-CALC-001 y SPEC-CALC-002. Los textos propios de la presentación (etiquetas, avisos de la interfaz como el de FR-05.2 y el de "Deshacer") sí son de esta spec;
  - la tecnología del dibujo, que fija ADR-0003;
  - el tema claro;
  - una tarjeta fija para el 100 %;
  - ampliar una serie a pantalla completa;
  - mantener la pantalla encendida;
  - el landmine;
  - las funciones 1 a 6 de la lista de ideas de las sesiones de diseño.

## 3. Actores

Víctor, único usuario, en su iPhone, con el dedo, con el teclado del sistema o con VoiceOver.

## 4. Requisitos funcionales

- **FR-01:** la app tiene una sola pantalla, con tema oscuro y un solo color de acento. Sus bloques, de arriba abajo, son:
  1. el peso de trabajo;
  2. el panel Carga, plegable y plegado al arrancar;
  3. el panel Mis discos, plegable y plegado al arrancar;
  4. los avisos generales;
  5. las series, una tarjeta por porcentaje, en el orden de SPEC-CALC-001 FR-04;
  6. el botón "+ Añadir porcentaje".
- **FR-02:** el peso de trabajo:
  - lleva la etiqueta "Peso de trabajo" y muestra el número en grande, con "kg" pegado a la cifra;
  - el campo crece con lo que se escribe, sin desplazar ni recortar el texto;
  - abre el teclado decimal y no deja teclear más de 6 caracteres. Un texto pegado más largo no se recorta: se conserva entero y se valida (SPEC-CALC-001 FR-03 y FR-14);
  - su línea inferior toma el color de acento cuando tiene el foco;
  - si el número no cabe en el ancho disponible (por ejemplo, con el zoom de página de NFR-03), su tamaño se reduce hasta caber.
- **FR-03:** el panel Carga:
  - plegado, muestra un resumen en una línea: "Barra · <nombre> <peso> kg", con los nombres "Olímpica", "Recta" y "Z", con " · collarines" al final si están activados (SPEC-CALC-001 FR-15), en el modo Barra, o "Dos lados · máquina" y "Un punto · máquina" en los demás modos. En la recta y la Z, el peso es el del campo si es válido, el mismo con el que se calculan las series (SPEC-CALC-001 FR-10); si el campo está vacío o no es válido, es el confirmado (SPEC-CALC-001 FR-02 y FR-11). Por ejemplo, "Barra · Olímpica 20 kg · collarines";
  - desplegado, muestra los tres modos como un control segmentado de tres botones con icono y texto: "Barra", "Dos lados" y "Un punto". El modo elegido se distingue visualmente y se anuncia como seleccionado;
  - solo en el modo Barra, muestra:
    - una ficha por barra (Olímpica 20 kg, Olímpica 15 kg, Recta y Z), con su miniatura, su nombre y su peso (en la recta y la Z: la elegida, el mismo peso que el resumen; la otra, su peso confirmado, SPEC-CALC-001 FR-11); la elegida se distingue y se anuncia como seleccionada;
    - el interruptor "Collarines de competición", con el texto "2,5 kg cada uno; suman 5 kg en las series con discos";
    - con la recta o la Z elegidas, el campo "Peso de la barra" (kg), con esa etiqueta accesible y el teclado decimal, y, debajo, su mensaje de error (SPEC-CALC-001 FR-02);
  - en los modos Dos lados y Un punto, muestra "Los discos se cargan en el cuerno de la máquina." en lugar de las fichas, el interruptor y el campo.

  Los paneles Carga y Mis discos anuncian si están plegados o desplegados.
- **FR-04:** el panel Mis discos:
  - plegado, muestra un punto del color de cada uno de los 7 tipos, apagado si está deshabilitado, y "N de 7" cuando no están todos habilitados (por ejemplo, "5 de 7"). Los puntos son decorativos: el resumen se anuncia como "Mis discos: N de 7 habilitados";
  - desplegado, muestra los 7 tipos dibujados en plano, cada uno con su peso. Tocar uno cambia su estado (SPEC-CALC-002 FR-02). Un tipo deshabilitado se ve gris y con el peso tachado, y su estado se anuncia como no activado.
- **FR-05:** los avisos generales están en una región que los lectores de pantalla anuncian al cambiar, sin interrumpir lo que estén leyendo. Pueden aparecer varios a la vez (SPEC-CALC-002 FR-06), en este orden:
  1. el del peso de trabajo (SPEC-CALC-001 FR-03);
  2. mientras el peso de la recta o de la Z elegida no es válido (SPEC-CALC-001 FR-02), "Revisa el peso de la barra en Carga.", esté el panel plegado o desplegado;
  3. el de la lista vacía (SPEC-CALC-001 FR-13);
  4. el de ningún disco habilitado (SPEC-CALC-002 FR-06);
  5. el de peso inferior a la barra (SPEC-CALC-001 FR-12);
  6. el de fallo al guardar (SPEC-CALC-002 FR-09).

  El mensaje completo del peso de la barra aparece bajo su campo (FR-03) y el del porcentaje, bajo el campo de añadir (FR-09).
- **FR-06:** la tarjeta de una serie tiene dos columnas, el texto a la izquierda y el dibujo a la derecha, en una proporción de 1 a 1,3. Con un ancho de pantalla de 360 px o menos, las dos van en una sola columna. El texto, de arriba abajo:
  1. el porcentaje ("70 %") y, si hay diferencia (SPEC-CALC-001 FR-06), la marca "−D kg" en gris. La marca es un botón: al pulsarla toma el color de acento y despliega la explicación; al pulsarla otra vez, la pliega. Se anuncia como "D kg menos que el objetivo. Ver detalle" y con su estado de desplegada o plegada;
  2. el peso total, en grande ("157,5 kg");
  3. "Por lado" o "Total en discos" (SPEC-CALC-001 FR-08);
  4. los discos, de mayor a menor, cada tipo con un punto de su color, su peso y, si se repite, "×n". Cada uno se anuncia como "n discos de W kg" o "1 disco de W kg";
  5. si la serie lleva collarines, "+ collarín de 2,5 kg", con menos énfasis.

  Sin discos (SPEC-CALC-001 FR-09), las líneas 3 a 5 se sustituyen por la línea "Solo la barra" o "Sin discos", destacada, y debajo, en la misma columna y siempre visible, su explicación.

  Debajo de las dos columnas, a todo el ancho y dentro de la tarjeta:
  - la explicación de la diferencia, cuando está desplegada. La tarjeta crece para contenerla y nunca la tapa ni la recorta;
  - el aviso de capacidad, si lo hay (SPEC-CALC-001 FR-16).
- **FR-07:** el dibujo de la carga:
  - cada tarjeta dibuja en 3D su equipo con la carga de la serie: la barra elegida en el modo Barra, o la máquina con un cuerno de 320 mm (310 mm útiles, SPEC-CALC-001 FR-16), la misma en los modos Dos lados y Un punto;
  - los discos se colocan de dentro afuera y de mayor a menor. Se dibujan en ese orden hasta el primero que no cabe en la manga útil (SPEC-CALC-001 FR-16), aunque alguno más pequeño que venga después sí cupiera;
  - si la serie lleva collarines, se dibuja el collarín después del último disco dibujado. La máquina no lleva collarín;
  - el dibujo se anuncia como una imagen con la etiqueta "Carga: " seguida de los discos dibujados de un lado (o del único punto), de mayor a menor, con "n de W" para los repetidos, separados por " + " y terminados en " kg" (por ejemplo, "Carga: 2 de 25 + 15 kg"), o "Sin discos", sin el prefijo, si no hay ninguno;
  - las fichas de barra del panel Carga muestran una miniatura de la barra con el mismo dibujo, todas a la misma escala;
  - la referencia visual (escena, medidas de discos, barras, máquina y collarín) es la de §11.
- **FR-08:** borrar una serie:
  - la persona desliza la tarjeta hacia la izquierda; deslizar en vertical sigue desplazando la página. Mientras arrastra, debajo aparece un fondo con "Borrar" en rojo claro sobre un granate tenue; pasado el 35 % del ancho de la tarjeta, el fondo pasa a rojo vivo, el texto a blanco y el icono crece;
  - si la suelta pasado el 35 %, la tarjeta sale de lado, su hueco se cierra, se quita el porcentaje de la lista (SPEC-CALC-001 FR-04) y aparece el aviso "Serie del P % borrada" con el botón "Deshacer". El aviso no tiene plazo: dura hasta la siguiente acción de la persona que cambie algo (borrar una serie, teclear en un peso, cambiar el modo, la barra, los collarines o los discos habilitados) o hasta que pulse "Deshacer". Se anuncia a los lectores de pantalla y no tapa el botón "+ Añadir porcentaje";
  - si la suelta sin pasar el 35 %, la tarjeta vuelve a su sitio y la lista no cambia;
  - cada tarjeta tiene un botón "Quitar la serie del P %", que hace lo mismo que el gesto, aviso incluido. Está oculto a la vista salvo cuando recibe el foco o cuando la persona mantiene pulsada la tarjeta 500 ms sin moverla; así se puede borrar con un toque, sin arrastrar (WCAG 2.5.7). Si el dedo se mueve antes de los 500 ms, es el gesto de deslizar; si se mueve después, no pasa nada más. Al soltar tras la pulsación larga, no se activa nada de la tarjeta (ni la marca de diferencia), y durante la pulsación no aparecen la selección de texto ni el menú del sistema. Mostrado por la pulsación larga, se oculta al tocar fuera de él;
  - tras borrar con este botón, el foco pasa a "Deshacer". Si el foco sigue en el aviso cuando desaparece o cuando se pulsa "Deshacer", pasa al botón "+ Añadir porcentaje" o, si el campo de añadir está abierto, a ese campo. Si la persona ha llevado el foco a otro sitio, no se mueve;
  - "Deshacer" vuelve a poner el porcentaje en la lista, en su orden. Si ese porcentaje ya está otra vez en la lista, "Deshacer" no añade nada. Al pulsarlo, el aviso se cierra. Solo se puede deshacer el último borrado: un borrado nuevo sustituye el aviso anterior. Cuando el aviso desaparece, ya no se puede deshacer.
- **FR-09:** añadir una serie:
  - al pulsar "+ Añadir porcentaje", un botón con el borde discontinuo y a todo el ancho, se convierte en un campo con "Porcentaje" como texto de ayuda, "%" pegado a la cifra, un botón "✕", anunciado como "Cancelar", y un botón "Añadir";
  - el campo abre el teclado numérico, sin coma, y no deja teclear más de 3 caracteres. Un texto pegado más largo no se recorta: se conserva entero y se valida (SPEC-CALC-001 FR-04);
  - Intro (si el teclado la tiene) o "Añadir" confirman; Escape o "✕" cancelan y cierran el campo sin cambiar la lista y descartan lo escrito y el mensaje;
  - el mensaje de error desaparece en cuanto cambia lo escrito, y el campo se abre siempre vacío;
  - al confirmar, se aplica SPEC-CALC-001 FR-04: si el porcentaje se añade, el campo se cierra; si está vacío o solo tiene espacios, el campo se cierra sin mensaje; si no es válido o está repetido, el campo sigue abierto, con el borde rojo y el mensaje debajo;
  - al perder el foco porque la persona toca otra cosa, el campo hace lo mismo que al confirmar, salvo que lo pierda porque la persona cancela: cancelar prevalece y la lista no cambia;
  - perder el foco porque la app pasa a segundo plano o se bloquea el teléfono no confirma: al volver, el campo sigue abierto con lo escrito;
  - una misma confirmación añade el porcentaje una sola vez, aunque la persona pulse "Añadir" o Intro y eso haga además perder el foco al campo. Cerrar el campo no confirma otra vez;
  - cuando el campo se cierra con Intro, "Añadir", Escape o "✕", el foco vuelve al botón "+ Añadir porcentaje". Si se cierra porque la persona tocó otro elemento, el foco se queda en ese elemento.
- **FR-10:** las tarjetas nuevas, las añadidas y las que vuelven con "Deshacer", entran con un fundido y un pequeño desplazamiento, y su dibujo aparece ya cargado, sin animación de discos. Cuando las series dejan de mostrarse por una regla de SPEC-CALC-001 o SPEC-CALC-002 (peso vacío o no válido, lista vacía, ningún disco habilitado), desaparecen sin animación; cuando vuelven por corregirse esa regla, aparecen como al arrancar: sin entrada y con el dibujo ya cargado. Una tarjeta que aparece porque la persona añade un porcentaje o pulsa "Deshacer" entra siempre como añadida, aunque la lista estuviera vacía.
- **FR-11:** el dibujo sigue los cambios de la carga:
  - las series y sus textos se actualizan al momento (SPEC-CALC-001 FR-10). Mientras se escribe el peso de trabajo o el de la barra, el dibujo espera 400 ms desde la última tecla. Los demás cambios (añadir, collarines, modo, barra, discos habilitados) se dibujan al momento. Con "Reducir movimiento" la espera es la misma. Durante esa espera y la animación, el dibujo puede ir por detrás del texto;
  - al cambiar la carga de una tarjeta, se conservan los discos interiores que no cambian y solo se anima lo que cambia, en este orden: sale el collarín, salen los discos que sobran de fuera hacia dentro y de uno en uno, entran los nuevos del más pesado al más ligero y entra el collarín, que se cierra;
  - cada tarjeta empieza su animación 90 ms después de la anterior;
  - al cambiar de equipo (de barra, o entre barra y máquina), todas las tarjetas se vacían y se cargan de nuevo;
  - al arrancar, los dibujos aparecen ya cargados, sin animación.
- **FR-12:** si la carga cambia mientras su animación está en curso, el dibujo termina mostrando la carga actual de la serie, sin discos ni collarines de más o de menos.
- **FR-13:** con la preferencia del sistema "Reducir movimiento" activada, no hay ninguna animación: ni en los dibujos, ni al borrar (la tarjeta desaparece sin salir de lado y su hueco se cierra sin transición), ni al añadir o deshacer, ni al desplegar la explicación o los paneles. Durante el gesto de borrar, la tarjeta sigue al dedo.
- **FR-14:** si el dispositivo no puede dibujar en 3D (porque el navegador no lo admite o porque falla al prepararlo), la app funciona igual, con todas las reglas de SPEC-CALC-001 y SPEC-CALC-002: las tarjetas muestran solo el texto, en una columna, y las fichas de barra muestran un dibujo plano.
- **FR-15:** si el sistema retira el contexto gráfico (por ejemplo, Safari con la app en segundo plano):
  - los dibujos ya pintados se siguen viendo mientras correspondan a la carga de su serie;
  - una tarjeta cuya carga cambia sin contexto oculta su dibujo en el mismo momento en que cambia su texto, y queda como en FR-14 (solo texto, en una columna, con el aviso de capacidad sin "Se dibujan los que caben.") hasta que se repinta. Sin contexto, nunca se ve un dibujo que no corresponde al texto;
  - cuando el contexto vuelve, y cuando la app vuelve a primer plano, todas las tarjetas se repintan con su carga actual;
  - una tarjeta que aparece sin contexto queda como en FR-14 hasta que se pinta. Las miniaturas de las fichas de barra, ya pintadas, se siguen viendo;
  - si al volver a primer plano el contexto no se puede recuperar, la app pasa a la vista de FR-14 hasta el siguiente arranque.
- **FR-16:** cada dibujo expone a los tests, sin cambiar lo que se ve, si tiene una animación en curso y qué carga muestra, collarín incluido. Su etiqueta accesible (FR-07) describe la carga dibujada: cambia cuando el dibujo termina de cambiar.

## 5. Criterios de aceptación

Salvo que se diga otra cosa, los AC parten de la primera vez que se abre la app (SPEC-CALC-001 AC-11: 100 kg, 40, 70 y 90 %, modo Barra con la olímpica de 20 kg), con una pantalla de 390 px de ancho.

- **AC-01 → FR-01:** al abrir, la pantalla muestra, de arriba abajo, el peso de trabajo, el panel Carga plegado, el panel Mis discos plegado, las tarjetas del 40, 70 y 90 % en ese orden y el botón "+ Añadir porcentaje".
- **AC-02 → FR-02:** el campo del peso de trabajo muestra "100" con "kg" al lado, tiene la etiqueta accesible "Peso de trabajo", no deja teclear más de 6 caracteres y pide el teclado decimal. Al escribir "102,55", el campo se ensancha y muestra el texto entero. Al pegar de verdad (no asignando el valor por programa) "100,125", el campo muestra "100,125" y la app muestra "El peso de trabajo admite como máximo dos decimales.", sin series.
- **AC-03 → FR-03:** el resumen de Carga dice "Barra · Olímpica 20 kg". Al desplegarlo:
  - se ven los tres modos, con "Barra" seleccionado, las cuatro fichas de barra, con "Olímpica 20 kg" seleccionada, y el interruptor de collarines desactivado, con su texto;
  - al activar los collarines, el resumen dice "Barra · Olímpica 20 kg · collarines";
  - al elegir la Z, aparece el campo "Peso de la barra" con "10"; al escribir "0,5", aparece debajo "Escribe un peso de barra entre 1 y 50 kg, con dos decimales como máximo." y el resumen sigue diciendo "Barra · Z 10 kg · collarines";
  - con la Z en 10 kg, al escribir "8,5" sin salir del campo, el resumen dice "Barra · Z 8,5 kg · collarines", la ficha de la Z muestra 8,5 kg y la de la recta sigue mostrando 10 kg; si después borra el campo sin haber salido de él, los dos vuelven a 10 kg;
  - al elegir "Dos lados", desaparecen las fichas, el interruptor y el campo, aparece "Los discos se cargan en el cuerno de la máquina." y el resumen dice "Dos lados · máquina"; con "Un punto", "Un punto · máquina";
  - con la Z y "0,5", se ven a la vez el mensaje bajo el campo y "Revisa el peso de la barra en Carga." entre los avisos;
  - cada panel se anuncia como plegado o desplegado.
- **AC-04 → FR-04:** el resumen de Mis discos muestra 7 puntos encendidos y ningún "N de 7", y se anuncia como "Mis discos: 7 de 7 habilitados". Al desplegarlo y tocar los de 25 y 1,25 kg, esos dos se ven grises, con el peso tachado y anunciados como no activados, y el resumen muestra dos puntos apagados y "5 de 7" y se anuncia como "Mis discos: 5 de 7 habilitados". Al deshabilitar los siete, muestra "0 de 7".
- **AC-05 → FR-05:** sin ningún tipo habilitado, con la lista vacía y el peso de trabajo vacío, la región de avisos muestra, en este orden, "Escribe el peso de trabajo.", "Añade al menos un porcentaje." y "Habilita al menos un disco en Mis discos.", y la región está marcada para que los lectores de pantalla la anuncien. Con la Z elegida y un peso de barra de 0,5, la lista vacía, ningún tipo habilitado y el aviso de fallo al guardar presente (SPEC-CALC-002 FR-09), muestra en este orden "Revisa el peso de la barra en Carga.", "Añade al menos un porcentaje.", "Habilita al menos un disco en Mis discos." y "No se ha podido guardar: se mantendrá hasta cerrar la app". Con la olímpica de 20 kg, un peso de trabajo de 15 kg y ningún tipo habilitado, muestra "Habilita al menos un disco en Mis discos." y después "El peso de trabajo es inferior a la barra: elige una barra más ligera o revisa el peso.".
- **AC-06 → FR-06:** con 105 kg, la tarjeta del 70 % muestra "70 %", la marca "−1 kg", "72,5 kg", "Por lado" y los discos "25" y "1,25", cada uno con su punto de color. Al pulsar la marca, aparece dentro de la tarjeta "El 70 % de 105 kg son 73,5 kg. Con tus discos, lo más cercano sin pasarte es 72,5 kg: 1 kg menos.", la tarjeta crece y la marca se anuncia como "1 kg menos que el objetivo. Ver detalle", desplegada; al pulsarla otra vez, la explicación desaparece.
- **AC-07 → FR-06:** con 40 kg, la tarjeta del 40 % muestra "Solo la barra", "20 kg" y "El 40 % son 16 kg, menos que la barra (20 kg).", sin marca de diferencia ni "Por lado". Con 120 kg y el 100 %, la tarjeta muestra "25" con "×2", anunciado como "2 discos de 25 kg". Con los collarines activados y 100 kg, la tarjeta del 70 % muestra "+ collarín de 2,5 kg".
- **AC-08 → FR-06:** con un ancho de 360 px, el texto y el dibujo de cada tarjeta van en una sola columna; con 390 px, en dos.
- **AC-09 → FR-07:** cada tarjeta tiene un dibujo con su etiqueta accesible: el 90 % de 100 kg, "Carga: 25 + 10 kg"; el 40 % de 40 kg, "Sin discos"; con 120 kg y el 100 %, "Carga: 2 de 25 kg".
- **AC-10 → FR-07:** en el modo Un punto, con 500 kg y el 100 % (20 discos de 25 que no caben, SPEC-CALC-001 AC-39), la etiqueta del dibujo cita solo los discos que caben en 310 mm (11 de 25: "Carga: 11 de 25 kg") y la tarjeta muestra el aviso de capacidad a todo el ancho. En el modo Un punto, con 301,25 kg y el 100 % (12 de 25 y uno de 1,25), la etiqueta es "Carga: 11 de 25 kg": el de 1,25 no se dibuja aunque cabría en los 13 mm que quedan.
- **AC-11 → FR-08:** al deslizar la tarjeta del 70 % hacia la izquierda:
  - un 20 % del ancho y soltar: la tarjeta vuelve a su sitio y siguen las tres series;
  - un 50 % del ancho y soltar: la tarjeta desaparece, la lista es 40 y 90 y aparece "Serie del 70 % borrada" con "Deshacer". Al pulsar "Deshacer", vuelve la tarjeta del 70 % entre la del 40 y la del 90 y el aviso se cierra;
  - mantener pulsada la tarjeta del 70 % 500 ms sin moverla muestra "Quitar la serie del 70 %"; al tocarlo se borra la serie, con el mismo aviso. Si en vez de eso se toca fuera, el botón se oculta y la lista no cambia.
- **AC-12 → FR-08:** con el teclado, al llevar el foco al botón "Quitar la serie del 70 %", el botón se ve; al activarlo, se borra la serie, aparece el mismo aviso y el foco pasa a "Deshacer", que la recupera; entonces el foco pasa a "+ Añadir porcentaje". Si tras borrar la persona lleva el foco al peso de trabajo y escribe 105, el aviso desaparece y el foco sigue en el peso de trabajo.
- **AC-13 → FR-08:** "Deshacer" no duplica ni recupera de más:
  - al borrar el 70 %, añadir 70 y pulsar "Deshacer", la lista es 40, 70 y 90, con un solo 70;
  - al borrar el 70 % y después el 40 %, el aviso dice "Serie del 40 % borrada" y "Deshacer" recupera solo el 40;
  - al borrar el 70 % y esperar un minuto sin hacer nada, el aviso sigue visible y "Deshacer" lo recupera;
  - al borrar el 70 % y activar los collarines, el aviso desaparece y la lista sigue siendo 40 y 90.
- **AC-14 → FR-09:** al pulsar "+ Añadir porcentaje", aparece el campo con "Porcentaje", "%", "✕" y "Añadir", que no deja teclear más de 3 caracteres y pide el teclado numérico. Cada punto parte de ese estado:
  - al escribir 50 y pulsar Intro, la lista es 40, 50, 70 y 90, el campo se cierra y el foco está en "+ Añadir porcentaje";
  - al escribir 60 y pulsar "Añadir", la lista gana un solo 60;
  - al escribir 55 y tocar el campo del peso de trabajo, se añade el 55 y el foco queda en el peso de trabajo;
  - al escribir 5 y pasar la app a segundo plano, al volver el campo sigue abierto con "5" y la lista no cambia;
  - al escribir 0 (aparece el error) y cambiar a 05, el error desaparece hasta volver a confirmar;
  - al escribir 30, pulsar Escape y volver a abrir el campo, está vacío;
  - al pegar "1000", el campo muestra "1000" y, al confirmar, "Escribe un porcentaje entre 1 y 100.";
  - al escribir 30 y pulsar Escape, o tocar "✕" (que antes quita el foco al campo), la lista no cambia y el campo se cierra;
  - al dejar el campo vacío y tocar fuera, el campo se cierra sin mensaje;
  - al escribir 0 y tocar fuera, el campo sigue abierto, con el borde rojo y "Escribe un porcentaje entre 1 y 100." debajo;
  - al escribir 70 y pulsar Intro, el campo sigue abierto, con el borde rojo y "Ya tienes una serie del 70 %." debajo.
- **AC-15 → FR-10, FR-13, FR-16:** sin "Reducir movimiento", una tarjeta añadida entra con una transición de opacidad y su dibujo no tiene animación en curso. Con "Reducir movimiento" activado, ninguna tarjeta, ningún panel y ningún dibujo tienen animaciones ni transiciones en curso al añadir, borrar, deshacer, desplegar la explicación o un panel o cambiar el peso de trabajo. Al borrar el peso de trabajo y volver a escribir 100, las tarjetas vuelven sin transición y con el dibujo sin animación en curso; con la lista vacía, al añadir 50, su tarjeta entra con la transición de opacidad.
- **AC-16 → FR-11, FR-16:** al cambiar el peso de trabajo de 100 a 105, el texto de las tarjetas cambia en cuanto se teclea, y la carga que muestra el dibujo no cambia ni empieza a animarse hasta 400 ms después de la última tecla. Al abrir la app, ningún dibujo tiene una animación en curso.
- **AC-17 → FR-12:** con 100 kg, al cambiar el peso de trabajo a 200 y, mientras el dibujo del 70 % se anima, a 105, cuando el dibujo del 70 % deja de tener una animación en curso, la carga que muestra y su etiqueta son "Carga: 25 + 1,25 kg" (SPEC-CALC-001 AC-02). El segundo cambio se hace más de 400 ms después del primero; los tests controlan el reloj.
- **AC-18 → FR-14:** sin poder dibujar en 3D, la app muestra las series de SPEC-CALC-001 AC-01 solo con texto y en una columna, sin dibujos, las fichas de barra con su dibujo plano y, en el modo Un punto con 500 kg y el 100 %, el aviso "No caben en la manga: faltan 23 cm.", y añadir, borrar, deshacer, cambiar de modo y de barra y habilitar discos funcionan igual que con el dibujo 3D.
- **AC-19 → FR-15:** al perderse el contexto gráfico, los dibujos siguen visibles. Si entonces el peso de trabajo pasa de 100 a 105, las tarjetas del 70 y del 90 %, cuya carga cambia, ocultan su dibujo en ese momento y muestran solo el texto, en una columna; la del 40 %, que no cambia, conserva el suyo. Al recuperar el contexto, todas las tarjetas se repintan y sus etiquetas coinciden con su carga. Si al volver a primer plano el contexto no se recupera, la app muestra la vista de FR-14.
- **AC-20 → NFR-01:** a 390 px de ancho, con los paneles plegados y desplegados, el campo de añadir abierto y el aviso de "Deshacer" visible, los botones, campos, interruptores, fichas de barra, marcas de diferencia y tipos de Mis discos, incluido el botón "Quitar la serie del P %" con el foco, miden al menos 44 × 44 px.
- **AC-21 → NFR-02:** cada pareja de texto y fondo, incluidos "Borrar" sobre su fondo y el peso de un tipo deshabilitado, cumple 4,5:1, y el texto grande 3:1. Los bordes de los campos, el indicador de foco y el estado de los interruptores y de los tipos de Mis discos cumplen 3:1 frente a su fondo. Los puntos de color y el dibujo 3D no se miden. Se mide sobre los estilos calculados de los textos y controles visibles en los estados de AC-20 y además en estos: el fondo de borrar antes y después del 35 %, un campo con error (borde y mensaje), la marca de diferencia plegada y desplegada, la explicación desplegada, "+ collarín de 2,5 kg", un tipo deshabilitado y el peso de trabajo con el foco; es texto grande el de 24 px o más, o de 18,66 px o más en negrita.
- **AC-22 → NFR-03:** con el zoom de página al 200 % sobre una pantalla de 390 px de ancho (equivale a 195 px CSS), no hay desplazamiento horizontal, ningún texto se corta ni se solapa, y se pueden añadir, borrar y deshacer series y abrir los paneles Carga y Mis discos. La prueba en el iPhone está en AC-24.
- **AC-23 → NFR-04:** en el iPhone 15 Pro Max, con 6 series y la animación activa, Víctor anota en el PR que la animación y el gesto de borrar son fluidos.
- **AC-24 → FR-01, FR-02, FR-06, FR-07, FR-08, FR-10, FR-11, FR-13, FR-15, NFR-03:** en el iPhone, registrado en el PR con la versión de iOS:
  - el gesto de borrar funciona con el dedo, con su umbral, sin chocar con el gesto de volver del sistema, y la pulsación larga muestra "Quitar" sin seleccionar texto;
  - con el campo de añadir abierto y "5" escrito, pasar a otra app y volver no añade nada;
  - la animación se ve y desaparece con "Reducir movimiento";
  - tras dejar la app un rato en segundo plano y volver, los dibujos se ven bien;
  - con la app abierta en Safari y el zoom de página al 200 %, se cumple AC-22;
  - en modo avión, la app se abre con las fuentes y el dibujo (SPEC-CALC-001 AC-12);
  - la presentación coincide con la referencia visual de §11, incluidos lo que no tiene AC propio: tema y acento (FR-01), línea del campo con el foco (FR-02), proporción de la tarjeta (FR-06), orden de los discos, collarín y escala de las miniaturas (FR-07), colores del fondo de borrar (FR-08), entrada de las tarjetas (FR-10) y secuencia y desfase de la animación (FR-11).
- **AC-25 → FR-05:** con la Z elegida, al escribir 0,5 en su peso y plegar el panel Carga, no hay series y la región de avisos muestra "Revisa el peso de la barra en Carga.". Al desplegarlo y escribir 8,5, el aviso desaparece y vuelven las series.

## 6. Casos límite, errores y decisiones pendientes

- **Casos límite y errores:**
  - varios avisos generales a la vez: se muestran todos, en el orden de FR-05 (AC-05);
  - deslizar sin pasar el umbral: la tarjeta vuelve y no se borra nada (AC-11);
  - deshacer cuando el porcentaje ya volvió a la lista o tras otro borrado: no se duplica nada; el aviso no tiene plazo y se cierra con la siguiente acción (AC-13);
  - confirmar con "Añadir" o con Intro, que a la vez quitan el foco al campo: se añade una sola vez (AC-14);
  - perder el foco con un porcentaje vacío, no válido o repetido: se cierra sin mensaje, o se queda abierto con el error (AC-14);
  - más discos de los que caben: se dibujan los que caben y la etiqueta cita solo esos (AC-10);
  - cambios de carga en plena animación: el dibujo acaba en la carga actual (AC-17);
  - sin dibujo 3D o tras perder el contexto: la app sigue funcionando, nunca se ve un dibujo que no corresponde al texto y los dibujos se recuperan (AC-18, AC-19);
  - peso de barra no válido con el panel Carga plegado: el aviso general lo dice (FR-05, AC-25);
  - cancelar el campo de añadir, que a la vez le quita el foco: no se añade nada (AC-14);
  - una pantalla de 360 px o menos: una sola columna por tarjeta (AC-08);
  - texto pegado más largo que el límite del campo: no se recorta y se valida entero (AC-02);
  - la app pasa a segundo plano con el campo de añadir abierto: no se añade nada (AC-14);
  - las series desaparecen y vuelven al corregir el peso: sin animación (FR-10);
  - muchas series: la lista no tiene tope y cada tarjeta se dibuja. El rendimiento se comprueba con 6 series (NFR-04); con más, es un riesgo aceptado.
- **Decisiones pendientes:** ninguna crítica.

---

## 10. Requisitos no funcionales

- **NFR-01:** todo lo que se puede pulsar mide al menos 44 × 44 px CSS (44 × 44 pt en el iPhone).
- **NFR-02:** contraste según WCAG 2.2 AA: 4,5:1 en el texto, 3:1 en el texto grande y 3:1 en los componentes y estados que no son texto (bordes de campos, indicador de foco, interruptores y estado de los tipos de Mis discos). Los puntos de color de los discos son decorativos, porque el peso siempre va escrito, y el dibujo 3D tampoco cuenta. Donde la referencia visual de §11 no llegue a estos umbrales, manda este requisito.
- **NFR-03:** con el zoom de página de Safari al 200 %, la interfaz se puede usar entera: no necesita desplazamiento horizontal y ningún texto se corta ni se solapa. No se exige adaptar la app al tamaño de texto del sistema, que Safari no aplica a una web. El zoom de página solo existe en Safari, no en la app instalada en la pantalla de inicio, así que se prueba allí.
- **NFR-04:** en el iPhone 15 Pro Max, con 6 series y la animación activa, la animación y el gesto de borrar se ven fluidos a juicio de Víctor, que lo anota en el PR.

## 11. Dependencias y restricciones

- Las reglas y los textos de las series vienen de SPEC-CALC-001 v0.7 y SPEC-CALC-002 v0.3. Esta spec no los cambia.
- La tecnología del dibujo la fija ADR-0003, que modifica la regla de "cero dependencias en tiempo de ejecución" de ADR-0001 §3.1. Esta spec no se fusiona antes que ADR-0003.
- Todo lo que usa la presentación (fuentes, librería 3D e iconos) se sirve desde el propio origen de la app, sin red de terceros (SPEC-CALC-001 NFR-01 y NFR-02, ADR-0001 §3.4).
- **Referencia visual:** `docs/diseno/maqueta-interfaz.html`, `docs/diseno/discos-3d.html` (banco del modelado) y `docs/diseno/notas-diseno-interfaz.md` §3.2, §3.6, §4 y §6 (iconos, colores, tipografía, radios, márgenes, escena, medidas IPF de los discos, barras, máquina, collarín y duraciones). Son la referencia que acepta Víctor en la prueba manual (AC-24), no requisitos con AC propio. Donde la maqueta contradiga SPEC-CALC-001, SPEC-CALC-002 o esta spec (por ejemplo, en el contraste de NFR-02, en cómo elige los discos, en qué guarda, en que reescribe lo tecleado en el campo de porcentaje o en que no tiene pulsación larga), mandan las specs. Sus fuentes y three.js se cargan de terceros; eso no pasa a la app.
- **Pruebas:** la lógica, con tests unitarios; los AC de esta spec, salvo AC-23 y AC-24, con E2E de Playwright, sin comparar el dibujo píxel a píxel: basta con que haya dibujo, que su etiqueta sea la correcta y que su estado observable (FR-16) sea el esperado. AC-23 y AC-24 son pruebas manuales en el iPhone. Los AC del dibujo (AC-09, AC-10, AC-15 a AC-17 y AC-19) solo cuentan en un navegador de la CI que dibuje en 3D: el test comprueba antes que el dibujo está activo, para no pasar en falso por la vista de FR-14.
