---
id: SPEC-CALC-003
titulo: Presentación de la calculadora
estado: en-revision
version: 0.1
riesgo: R1
sustituye: null
adr: [ADR-0001, ADR-0003]
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
  - las reglas de cálculo, validación y guardado, y sus textos, que fijan SPEC-CALC-001 y SPEC-CALC-002;
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
  - admite como máximo 6 caracteres y abre el teclado decimal;
  - su línea inferior toma el color de acento cuando tiene el foco.
- **FR-03:** el panel Carga:
  - plegado, muestra un resumen en una línea: "Barra · <nombre de la barra> <peso> kg", con " · collarines" al final si están activados (SPEC-CALC-001 FR-15), en el modo Barra, o "Dos lados · máquina" y "Un punto · máquina" en los demás modos. En la recta y la Z, el peso es el último válido (SPEC-CALC-001 FR-02). Por ejemplo, "Barra · Olímpica 20 kg · collarines";
  - desplegado, muestra los tres modos como un control segmentado de tres botones con icono y texto: "Barra", "Dos lados" y "Un punto". El modo elegido se distingue visualmente y se anuncia como seleccionado;
  - solo en el modo Barra, muestra:
    - una ficha por barra (Olímpica 20 kg, Olímpica 15 kg, Recta y Z), con su miniatura, su nombre y su peso; la elegida se distingue y se anuncia como seleccionada;
    - el interruptor "Collarines de competición", con el texto "2,5 kg cada uno; suman 5 kg en las series con discos";
    - con la recta o la Z elegidas, el campo "Peso de la barra" (kg) y, debajo, su mensaje de error (SPEC-CALC-001 FR-02);
  - en los modos Dos lados y Un punto, muestra "Los discos se cargan en el cuerno de la máquina." en lugar de las fichas, el interruptor y el campo.
- **FR-04:** el panel Mis discos:
  - plegado, muestra un punto del color de cada uno de los 7 tipos, apagado si está deshabilitado, y "N de 7" cuando no están todos habilitados (por ejemplo, "5 de 7");
  - desplegado, muestra los 7 tipos dibujados en plano, cada uno con su peso. Tocar uno cambia su estado (SPEC-CALC-002 FR-02). Un tipo deshabilitado se ve gris y con el peso tachado, y su estado se anuncia como no activado.
- **FR-05:** los avisos generales están en una región que los lectores de pantalla anuncian al cambiar. Pueden aparecer varios a la vez (SPEC-CALC-002 FR-06), en este orden:
  1. el del peso de trabajo (SPEC-CALC-001 FR-03);
  2. el de la lista vacía (SPEC-CALC-001 FR-13);
  3. el de ningún disco habilitado (SPEC-CALC-002 FR-06);
  4. el de peso inferior a la barra (SPEC-CALC-001 FR-12);
  5. el de fallo al guardar (SPEC-CALC-002 FR-09).

  El error del peso de la barra aparece bajo su campo (FR-03) y el del porcentaje, bajo el campo de añadir (FR-09), no entre los avisos generales.
- **FR-06:** la tarjeta de una serie tiene dos columnas, el texto a la izquierda y el dibujo a la derecha, en una proporción de 1 a 1,3. Con un ancho de pantalla de 360 px o menos, las dos van en una sola columna. El texto, de arriba abajo:
  1. el porcentaje ("70 %") y, si hay diferencia (SPEC-CALC-001 FR-06), la marca "−D kg" en gris. La marca es un botón: al pulsarla toma el color de acento y despliega la explicación; al pulsarla otra vez, la pliega. Se anuncia como "D kg menos que el objetivo. Ver detalle" y con su estado de desplegada o plegada;
  2. el peso total, en grande ("157,5 kg");
  3. "Por lado" o "Total en discos" (SPEC-CALC-001 FR-08);
  4. los discos, de mayor a menor, cada tipo con un punto de su color, su peso y, si se repite, "×n". Cada uno se anuncia como "n discos de W kg" o "1 disco de W kg";
  5. si la serie lleva collarines, "+ collarín de 2,5 kg", con menos énfasis.

  Sin discos (SPEC-CALC-001 FR-09), las líneas 3 a 5 se sustituyen por la línea "Solo la barra" o "Sin discos", destacada, y la explicación debajo.

  Debajo de las dos columnas, a todo el ancho y dentro de la tarjeta:
  - la explicación de la diferencia, cuando está desplegada. La tarjeta crece para contenerla y nunca la tapa ni la recorta;
  - el aviso de capacidad, si lo hay (SPEC-CALC-001 FR-16).
- **FR-07:** el dibujo de la carga:
  - cada tarjeta dibuja en 3D su equipo con la carga de la serie: la barra elegida en el modo Barra, o la máquina con un cuerno de 320 mm, la misma en los modos Dos lados y Un punto;
  - los discos se colocan de dentro afuera y de mayor a menor. Se dibujan en ese orden hasta el primero que no cabe en la manga útil (SPEC-CALC-001 FR-16);
  - si la serie lleva collarines, se dibuja el collarín después del último disco dibujado. La máquina no lleva collarín;
  - el dibujo se anuncia como una imagen con la etiqueta "Carga: " seguida de los discos dibujados de un lado (o del único punto), de mayor a menor, con "n de W" para los repetidos, separados por comas y terminados en " kg" (por ejemplo, "Carga: 2 de 25, 15 kg"), o "Sin discos" si no hay ninguno;
  - las fichas de barra del panel Carga muestran una miniatura de la barra con el mismo dibujo, todas a la misma escala;
  - la referencia visual (escena, medidas de discos, barras, máquina y collarín) es la de §11.
- **FR-08:** borrar una serie:
  - la persona desliza la tarjeta hacia la izquierda. Mientras arrastra, debajo aparece un fondo con "Borrar" en rojo claro sobre un granate tenue; pasado el 35 % del ancho de la tarjeta, el fondo pasa a rojo vivo, el texto a blanco y el icono crece;
  - si la suelta pasado el 35 %, la tarjeta sale de lado, su hueco se cierra, se quita el porcentaje de la lista (SPEC-CALC-001 FR-04) y aparece el aviso "Serie del P % borrada" con el botón "Deshacer" durante 5 s;
  - si la suelta sin pasar el 35 %, la tarjeta vuelve a su sitio y la lista no cambia;
  - cada tarjeta tiene un botón "Quitar la serie del P %", oculto a la vista salvo cuando recibe el foco, que hace lo mismo que el gesto, aviso incluido;
  - "Deshacer" vuelve a poner el porcentaje en la lista, en su orden. Si ese porcentaje ya está otra vez en la lista, "Deshacer" no añade nada. Solo se puede deshacer el último borrado: un borrado nuevo sustituye el aviso anterior. Al pasar los 5 s, el aviso desaparece y ya no se puede deshacer.
- **FR-09:** añadir una serie:
  - al pulsar "+ Añadir porcentaje", un botón con el borde discontinuo y a todo el ancho, se convierte en un campo con "Porcentaje" como texto de ayuda, "%" pegado a la cifra, un botón "✕" (cancelar) y un botón "Añadir";
  - el campo admite como máximo 3 caracteres y abre el teclado numérico, sin coma;
  - Intro o "Añadir" confirman; Escape o "✕" cancelan y cierran el campo sin cambiar la lista;
  - al confirmar, se aplica SPEC-CALC-001 FR-04: si el porcentaje se añade, el campo se cierra; si está vacío o solo tiene espacios, el campo se cierra sin mensaje; si no es válido o está repetido, el campo sigue abierto, con el borde rojo y el mensaje debajo;
  - al perder el foco, el campo hace lo mismo que al confirmar;
  - una misma confirmación añade el porcentaje una sola vez, aunque la persona pulse "Añadir" y eso haga además perder el foco al campo.
- **FR-10:** las tarjetas nuevas, las añadidas y las que vuelven con "Deshacer", entran con un fundido y un pequeño desplazamiento.
- **FR-11:** el dibujo sigue los cambios de la carga:
  - las series y sus textos se actualizan al momento (SPEC-CALC-001 FR-10). Mientras se escribe el peso de trabajo, el dibujo espera 400 ms desde la última tecla;
  - al cambiar la carga de una tarjeta, se conservan los discos interiores que no cambian y solo se anima lo que cambia, en este orden: sale el collarín, salen los discos que sobran de fuera hacia dentro y de uno en uno, entran los nuevos del más pesado al más ligero y entra el collarín, que se cierra;
  - cada tarjeta empieza su animación 90 ms después de la anterior;
  - al cambiar de equipo (de barra, o entre barra y máquina), todas las tarjetas se vacían y se cargan de nuevo;
  - al arrancar, los dibujos aparecen ya cargados, sin animación.
- **FR-12:** si la carga cambia mientras su animación está en curso, el dibujo termina mostrando la carga actual de la serie, sin discos ni collarines de más o de menos.
- **FR-13:** con la preferencia del sistema "Reducir movimiento" activada, no hay ninguna animación: ni en los dibujos, ni al borrar (la tarjeta desaparece sin salir de lado y su hueco se cierra sin transición), ni al añadir o deshacer, ni al desplegar la explicación. Durante el gesto de borrar, la tarjeta sigue al dedo.
- **FR-14:** si el dispositivo no puede dibujar en 3D (no hay WebGL o falla al crearlo), la app funciona igual, con todas las reglas de SPEC-CALC-001 y SPEC-CALC-002: las tarjetas muestran solo el texto, en una columna, y las fichas de barra muestran un dibujo plano.
- **FR-15:** si el sistema retira el contexto gráfico (por ejemplo, Safari con la app en segundo plano), los dibujos ya pintados se siguen viendo. Cuando el contexto vuelve, y cuando la app vuelve a primer plano, todas las tarjetas se repintan con su carga actual.

## 5. Criterios de aceptación

Salvo que se diga otra cosa, los AC parten de la primera vez que se abre la app (SPEC-CALC-001 AC-11: 100 kg, 40, 70 y 90 %, modo Barra con la olímpica de 20 kg), con una pantalla de 390 px de ancho.

- **AC-01 → FR-01:** al abrir, la pantalla muestra, de arriba abajo, el peso de trabajo, el panel Carga plegado, el panel Mis discos plegado, las tarjetas del 40, 70 y 90 % en ese orden y el botón "+ Añadir porcentaje".
- **AC-02 → FR-02:** el campo del peso de trabajo muestra "100" con "kg" al lado, tiene la etiqueta accesible "Peso de trabajo", admite como máximo 6 caracteres y pide el teclado decimal. Al escribir "102,55", el campo se ensancha y muestra el texto entero.
- **AC-03 → FR-03:** el resumen de Carga dice "Barra · Olímpica 20 kg". Al desplegarlo:
  - se ven los tres modos, con "Barra" seleccionado, las cuatro fichas de barra, con "Olímpica 20 kg" seleccionada, y el interruptor de collarines desactivado, con su texto;
  - al activar los collarines, el resumen dice "Barra · Olímpica 20 kg · collarines";
  - al elegir la Z, aparece el campo "Peso de la barra" con "10"; al escribir "0,5", aparece debajo "Escribe un peso de barra entre 1 y 50 kg, con dos decimales como máximo." y el resumen sigue diciendo "Barra · Z 10 kg · collarines";
  - al elegir "Dos lados", desaparecen las fichas, el interruptor y el campo, aparece "Los discos se cargan en el cuerno de la máquina." y el resumen dice "Dos lados · máquina".
- **AC-04 → FR-04:** el resumen de Mis discos muestra 7 puntos encendidos y ningún "N de 7". Al desplegarlo y tocar los de 25 y 1,25 kg, esos dos se ven grises, con el peso tachado y anunciados como no activados, y el resumen muestra dos puntos apagados y "5 de 7".
- **AC-05 → FR-05:** sin ningún tipo habilitado, con la lista vacía y el peso de trabajo vacío, la región de avisos muestra, en este orden, "Escribe el peso de trabajo.", "Añade al menos un porcentaje." y "Habilita al menos un disco en Mis discos.", y la región está marcada para que los lectores de pantalla la anuncien.
- **AC-06 → FR-06:** con 105 kg, la tarjeta del 70 % muestra "70 %", la marca "−1 kg", "72,5 kg", "Por lado" y los discos "25" y "1,25", cada uno con su punto de color. Al pulsar la marca, aparece dentro de la tarjeta "El 70 % de 105 kg son 73,5 kg. Con tus discos, lo más cercano sin pasarte es 72,5 kg: 1 kg menos.", la tarjeta crece y la marca se anuncia como desplegada; al pulsarla otra vez, la explicación desaparece.
- **AC-07 → FR-06:** con 40 kg, la tarjeta del 40 % muestra "Solo la barra", "20 kg" y "El 40 % son 16 kg, menos que la barra (20 kg).", sin marca de diferencia ni "Por lado". Con 120 kg y el 100 %, la tarjeta muestra "25" con "×2", anunciado como "2 discos de 25 kg". Con los collarines activados y 100 kg, la tarjeta del 70 % muestra "+ collarín de 2,5 kg".
- **AC-08 → FR-06:** con un ancho de 360 px, el texto y el dibujo de cada tarjeta van en una sola columna; con 390 px, en dos.
- **AC-09 → FR-07:** cada tarjeta tiene un dibujo con su etiqueta accesible: el 90 % de 100 kg, "Carga: 25, 10 kg"; el 40 % de 40 kg, "Sin discos"; con 120 kg y el 100 %, "Carga: 2 de 25 kg".
- **AC-10 → FR-07:** en el modo Un punto, con 500 kg y el 100 % (20 discos de 25 que no caben, SPEC-CALC-001 AC-39), la etiqueta del dibujo cita solo los discos que caben en 310 mm (11 de 25: "Carga: 11 de 25 kg") y la tarjeta muestra el aviso de capacidad a todo el ancho.
- **AC-11 → FR-08:** al deslizar la tarjeta del 70 % hacia la izquierda:
  - un 20 % del ancho y soltar: la tarjeta vuelve a su sitio y siguen las tres series;
  - un 50 % del ancho y soltar: la tarjeta desaparece, la lista es 40 y 90 y aparece "Serie del 70 % borrada" con "Deshacer". Al pulsar "Deshacer", vuelve la tarjeta del 70 % entre la del 40 y la del 90.
- **AC-12 → FR-08:** con el teclado, al llevar el foco al botón "Quitar la serie del 70 %", el botón se ve; al activarlo, se borra la serie y aparece el mismo aviso con "Deshacer", que la recupera.
- **AC-13 → FR-08:** "Deshacer" no duplica ni recupera de más:
  - al borrar el 70 %, añadir 70 y pulsar "Deshacer", la lista es 40, 70 y 90, con un solo 70;
  - al borrar el 70 % y después el 40 %, el aviso dice "Serie del 40 % borrada" y "Deshacer" recupera solo el 40;
  - al borrar el 70 % y esperar 5 s, el aviso desaparece y la lista sigue siendo 40 y 90.
- **AC-14 → FR-09:** al pulsar "+ Añadir porcentaje", aparece el campo con "Porcentaje", "%", "✕" y "Añadir", que admite como máximo 3 caracteres y pide el teclado numérico:
  - al escribir 50 y pulsar Intro, la lista es 40, 50, 70 y 90 y el campo se cierra;
  - al escribir 60 y pulsar "Añadir", la lista gana un solo 60;
  - al escribir 55 y tocar fuera del campo, se añade el 55;
  - al escribir 30 y pulsar Escape o "✕", la lista no cambia y el campo se cierra;
  - al dejar el campo vacío y tocar fuera, el campo se cierra sin mensaje;
  - al escribir 0 y tocar fuera, el campo sigue abierto, con el borde rojo y "Escribe un porcentaje entre 1 y 100." debajo;
  - al escribir 70 y pulsar Intro, el campo sigue abierto, con el borde rojo y "Ya tienes una serie del 70 %." debajo.
- **AC-15 → FR-10, FR-13:** sin "Reducir movimiento", una tarjeta añadida entra con una transición de opacidad. Con "Reducir movimiento" activado, ninguna tarjeta ni ningún dibujo tienen animaciones ni transiciones en curso al añadir, borrar, deshacer, desplegar la explicación o cambiar el peso de trabajo.
- **AC-16 → FR-11:** al cambiar el peso de trabajo de 100 a 105, el texto de las tarjetas cambia en cuanto se teclea, y el dibujo no cambia hasta 400 ms después de la última tecla. Al abrir la app, no hay ninguna animación en curso.
- **AC-17 → FR-12:** con 100 kg, al cambiar el peso de trabajo a 200 y, mientras se anima, a 105, al terminar la animación la etiqueta del dibujo del 70 % es "Carga: 25, 1,25 kg" (SPEC-CALC-001 AC-02).
- **AC-18 → FR-14:** sin WebGL disponible, la app muestra las series de SPEC-CALC-001 AC-01 solo con texto y en una columna, sin dibujos, y añadir, borrar, deshacer, cambiar de modo y de barra y habilitar discos funcionan igual que con WebGL.
- **AC-19 → FR-15:** al perderse el contexto WebGL, los dibujos siguen visibles; al recuperarlo, todas las tarjetas se repintan y sus etiquetas coinciden con su carga, también la de una serie que cambió mientras no había contexto.
- **AC-20 → NFR-01:** a 390 px de ancho, en cada estado de los AC anteriores, todos los elementos que se pueden pulsar, incluido el botón "Quitar la serie del P %" con el foco, miden al menos 44 × 44 px.
- **AC-21 → NFR-02:** cada pareja de texto y fondo cumple 4,5:1, el texto grande 3:1, y los bordes de los campos, el indicador de foco, el estado de los interruptores y los puntos de los discos frente a su fondo 3:1.
- **AC-22 → NFR-03:** con el zoom de página al 200 % sobre una pantalla de 390 px de ancho (equivale a 195 px CSS), no hay desplazamiento horizontal, ningún texto se corta ni se solapa, y se pueden añadir, borrar y deshacer series y abrir los paneles Carga y Mis discos. En el iPhone, con la app abierta en Safari y el zoom de página al 200 %, ocurre lo mismo.
- **AC-23 → NFR-04:** en el iPhone 15 Pro Max, con 6 series y la animación activa, Víctor anota en el PR que la animación y el gesto de borrar son fluidos.
- **AC-24 → FR-08, FR-13, FR-15, NFR-03:** en el iPhone, registrado en el PR con la versión de iOS:
  - el gesto de borrar funciona con el dedo, con su umbral;
  - la animación se ve y desaparece con "Reducir movimiento";
  - tras dejar la app un rato en segundo plano y volver, los dibujos se ven bien;
  - con la app abierta en Safari y el zoom de página al 200 %, se cumple AC-22;
  - en modo avión, la app se abre con las fuentes y el dibujo (SPEC-CALC-001 AC-12).

## 6. Casos límite, errores y decisiones pendientes

- **Casos límite y errores:**
  - varios avisos generales a la vez: se muestran todos, en el orden de FR-05 (AC-05);
  - deslizar sin pasar el umbral: la tarjeta vuelve y no se borra nada (AC-11);
  - deshacer cuando el porcentaje ya volvió a la lista, o tras otro borrado, o pasados 5 s: no se duplica nada (AC-13);
  - confirmar con "Añadir" o con Intro, que a la vez quitan el foco al campo: se añade una sola vez (AC-14);
  - perder el foco con un porcentaje vacío, no válido o repetido: se cierra sin mensaje, o se queda abierto con el error (AC-14);
  - más discos de los que caben: se dibujan los que caben y la etiqueta cita solo esos (AC-10);
  - cambios de carga en plena animación: el dibujo acaba en la carga actual (AC-17);
  - sin WebGL o tras perder el contexto: la app sigue funcionando y los dibujos se recuperan (AC-18, AC-19);
  - una pantalla de 360 px o menos: una sola columna por tarjeta (AC-08).
- **Decisiones pendientes:** ninguna crítica. La duración de 5 s del aviso de "Deshacer" no se amplía con el foco; si VoiceOver la hace corta en el uso real, se revisa en otra versión.

---

## 10. Requisitos no funcionales

- **NFR-01:** todo lo que se puede pulsar mide al menos 44 × 44 px CSS (44 × 44 pt en el iPhone).
- **NFR-02:** contraste según WCAG 2.2 AA: 4,5:1 en el texto, 3:1 en el texto grande y 3:1 en los componentes y estados que no son texto (bordes de campos, indicador de foco, interruptores y puntos de color de los discos).
- **NFR-03:** con el zoom de página de Safari al 200 %, la interfaz se puede usar entera: no necesita desplazamiento horizontal y ningún texto se corta ni se solapa. No se exige adaptar la app al tamaño de texto del sistema, que Safari no aplica a una web.
- **NFR-04:** en el iPhone 15 Pro Max, con 6 series y la animación activa, la animación y el gesto de borrar se ven fluidos a juicio de Víctor, que lo anota en el PR. Si no lo son, se reduce primero la resolución de las sombras.

## 11. Dependencias y restricciones

- Las reglas y los textos de las series vienen de SPEC-CALC-001 v0.6 y SPEC-CALC-002 v0.2. Esta spec no los cambia.
- La tecnología del dibujo la fija ADR-0003, que modifica la regla de "cero dependencias en tiempo de ejecución" de ADR-0001 §3.1. Esta spec no se fusiona antes que ADR-0003.
- Todo lo que usa la presentación (fuentes, librería 3D e iconos) se sirve desde el propio origen de la app, sin red de terceros (SPEC-CALC-001 NFR-01 y NFR-02, ADR-0001 §3.4).
- **Referencia visual:** `docs/diseno/maqueta-interfaz.html` y `docs/diseno/notas-diseno-interfaz.md` §3.2, §3.6, §4 y §6 (iconos, colores, tipografía, radios, márgenes, escena, medidas IPF de los discos, barras, máquina, collarín y duraciones). Son la referencia que acepta Víctor en la prueba manual (AC-24), no requisitos con AC propio. Donde la maqueta contradiga SPEC-CALC-001 o SPEC-CALC-002 (por ejemplo, en cómo elige los discos, en qué guarda o en que reescribe lo tecleado en el campo de porcentaje), mandan las specs.
- **Pruebas:** la lógica, con tests unitarios; los AC de esta spec, salvo AC-23 y AC-24, con E2E de Playwright, sin comparar el dibujo píxel a píxel: basta con que haya dibujo y su etiqueta sea la correcta. AC-23 y AC-24 son pruebas manuales en el iPhone.
