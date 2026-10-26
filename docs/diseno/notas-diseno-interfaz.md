# Notas de diseño: rediseño de la interfaz con 3D

- **Proyecto:** `victor-lg/calculadora-discos`
- **Fecha:** 2026-10-25
- **Autoría:** Víctor, con Claude en la app (sesiones de diseño del 23 al 25 de octubre)
- **Estado:** referencia para redactar specs y ADR. **No es norma.** Lo que obliga es lo que se apruebe en las specs y los ADR que salgan de aquí (G1).

## 0. Cómo usar este documento

Este documento lo lee el agente al redactar las specs y los ADR, y después al planificar y al implementar.

1. **Las specs aprobadas mandan.** Si algo de aquí contradice una spec o un ADR en `main`, gana `main`. La contradicción se señala en el PR de spec; no se resuelve en silencio.
2. **Las decisiones ya están tomadas por Víctor.** El agente no las reabre. Si una le parece incoherente o le falta un dato, lo pregunta.
3. **Ficheros de referencia**, junto a este documento:
   - `maqueta-interfaz.html`: la interfaz completa con el 3D en vivo. Es la referencia visual y de comportamiento.
   - `discos-3d.html`: el banco 3D con todos los equipos y discos. Sirve para revisar el modelado sin la interfaz.

   Los dos cargan three.js y las fuentes desde una CDN. **Eso no puede pasar a la app** (§7.1). Su código es un prototipo: se puede reutilizar, pero no es la arquitectura de la app.
4. Los números entre paréntesis son milímetros, salvo que se diga otra cosa.

## 1. Cambios de spec propuestos

### 1.1 SPEC-CALC-001 → v0.6

El agente parte de la versión vigente en `main`. Los FR y AC citados son los de la v0.1; si han cambiado de número, se aplican a los que correspondan.

| Requisito | Hoy | Propuesta |
| --- | --- | --- |
| **FR-02** (barras) | Recta y Z con el peso que se introduce en cada uso, con las reglas de FR-03 | Peso de 1 a 50 kg, con dos decimales como máximo. Se guarda por barra y la primera vez es 10 kg. Mientras no es válido: mensaje "Escribe un peso de barra entre 1 y 50 kg, con dos decimales como máximo." y no se muestran series (sigue cubriendo AC-08) |
| **FR-04** (porcentajes) | Enteros del 1 al 99, en el orden de entrada | Enteros del **1 al 100**, ordenados de menor a mayor y **sin repetir**. No válido: "Escribe un porcentaje entre 0 y 100." Repetido: "Ya tienes una serie del 70 %." Dos porcentajes distintos que cargan lo mismo se siguen mostrando los dos |
| **FR-06** (redondeo) | La serie muestra el objetivo y la diferencia | La serie muestra la diferencia en una marca ("−0,4 kg") junto al porcentaje. Al tocarla se despliega dentro de la tarjeta: "El 40 % de 226 kg son 90,4 kg. Con tus discos, lo más cercano sin pasarte es 90 kg: 0,4 kg menos." |
| **FR-08** (contenido de la serie) | Porcentaje, total, discos, peso de discos por lado y aviso | Porcentaje, total y discos. Cada disco lleva su punto de color y su peso; los repetidos llevan "×n". La etiqueta es "Por lado" (Barra y Dos lados) o "Total en discos" (Un punto). **Desaparece el peso de discos por lado.** Afecta a las tablas de AC-01 y AC-05 |
| **FR-09** (sin discos) | "Solo barra (X kg) · 0 kg por lado" y "… demasiado pequeño: el disco mínimo es de 1,25 kg" | **Textos nuevos, más claros** (Víctor, 25-10). Dicen qué cargar, por qué y cuánto falta (§3.4). Sin marca de diferencia. Cambian AC-03, AC-07 y AC-14 |
| **FR-11** (qué se guarda) | Solo los porcentajes; al abrir, peso vacío | Se guardan los porcentajes, el **último peso de trabajo**, el **peso de la recta y de la Z** y la **opción de collarines**. Primera vez: 100 kg con 40, 70 y 90 %, modo Barra, olímpica de 20 y collarines desactivados. El modo y la barra no se guardan. Requiere el ADR de §2.2 |
| **FR-12** (peso inferior a la barra) | Texto aprobado | El mismo: "El peso de trabajo es inferior a la barra: elige una barra más ligera o revisa el peso." |
| **FR nuevo:** collarines | — | Opción "Collarines de competición", de 2,5 kg cada uno. Solo en el modo Barra y solo en las series con discos. Antes de repartir se restan 5 kg del objetivo, y el total los incluye. La serie muestra "+ collarín de 2,5 kg" y el resumen de Carga, "· collarines" |
| **FR nuevo:** capacidad de la manga | — | Los discos se apilan con su grosor real (§5.1). Manga útil: olímpica 20 → 375 mm (37,5 cm); olímpica 15 → 280; recta y Z → 200; máquina → 310. Si no caben, el cálculo no cambia y la serie avisa: "No caben en la manga: faltan X cm. Se dibujan los que caben." (X redondeado al milímetro, en cm) |
| **FR nuevo:** máquina | — | Dos lados y Un punto usan el mismo dibujo: la máquina con un cuerno de 320 mm y sin collarín |
| **FR-03** | Más de 0 y hasta 500 kg, dos decimales | Sin cambios. Textos de la maqueta: "Escribe el peso de trabajo.", "El peso de trabajo debe estar entre 0 y 500 kg." y "El peso de trabajo admite como máximo dos decimales." |

**Algoritmo de discos.** Lo fija SPEC-CALC-002, ya implementado en el PR #14: solo los tipos habilitados, la combinación con menos discos y, si empatan, la del disco más grande. La maqueta usa su propia versión (mayor peso, luego menos discos, luego disco más grande), que **no es normativa**: la app conserva la del #14.

### 1.2 SPEC-CALC-002 (inventario)

Las reglas no cambian. Solo cambia la presentación, que va en SPEC-CALC-003. Si SPEC-CALC-002 fija un texto (por ejemplo, el de "ningún disco habilitado"), manda ese texto; la maqueta usa "Habilita al menos un disco en Mis discos."

### 1.3 SPEC-CALC-003 "Presentación" (nueva)

Recoge §3–§6 de este documento como requisitos verificables: estructura de la pantalla, estados, textos, dibujo 3D, movimiento, accesibilidad y alternativas. Los detalles puramente visuales (colores, medidas del 3D) pueden ir como anexo o referencia a este documento, para no inflar la spec. Lo que debe quedar como requisito con AC:

- qué muestra cada tarjeta y en qué orden (§3.4);
- el gesto de borrar y Deshacer, con su alternativa accesible (§3.5);
- la animación y su desactivación con "reducir movimiento" (§6);
- la vista de solo texto sin WebGL y la recuperación tras perder el contexto (§4.5);
- tamaños mínimos de toque (44 × 44 pt) y contraste;
- la prueba en el iPhone con el texto ampliado (§8).

## 2. ADR propuestos

### 2.1 ADR-0003 — Dibujo 3D en vivo con un solo renderizador

- **Contexto:** cada tarjeta muestra la carga en 3D y puede haber muchas. iOS limita los contextos WebGL por página (a partir de unos 8–16, descarta los más antiguos).
- **Decisión:**
  - un único `WebGLRenderer` sobre un lienzo fuera de pantalla, con `preserveDrawingBuffer`;
  - cada tarjeta tiene su propio lienzo 2D y su grupo en la escena;
  - para pintar una tarjeta se deja visible solo su grupo, se renderiza y se copia con `drawImage`;
  - solo se repintan las tarjetas con una animación activa o marcadas como "sucias";
  - three.js empaquetado en la app (no desde CDN) y con la versión fijada (la maqueta usa 0.160.0).
- **Alternativas descartadas:**
  - un contexto por tarjeta: choca con el límite de iOS;
  - SVG o imágenes pregeneradas: pierden el realismo y la animación que Víctor eligió;
  - un solo lienzo con todas las tarjetas: rompe el desplazamiento y el gesto de borrar.
- **Consecuencias:**
  - una dependencia nueva (three.js, MIT, unos 600 KB) que pasa por la revisión de dependencias;
  - más código fuera de la lógica pura, que no se cubre con tests unitarios (§8);
  - la app debe funcionar sin WebGL (§4.5).

### 2.2 ADR-0004 — Más datos guardados en el dispositivo

- **Modifica:** ADR-0002, cuya lista estricta de datos guardados hay que ampliar.
- **Datos nuevos:**
  - último peso de trabajo (texto tal como se escribió);
  - peso de la recta y de la Z (número válido de 1 a 50);
  - opción de collarines (sí/no).
- **Reglas:** las de ADR-0002 para validez, fallo al guardar y fallo al leer. Un dato no válido al leerlo vuelve a su valor de primera vez.
- **Sin cambio:** el modo y la barra no se guardan.

## 3. Interfaz

Una sola pantalla. Tema oscuro únicamente y un solo acento, naranja. Objetos físicos en 3D; controles planos.

### 3.1 Estructura, de arriba abajo

1. **Peso de trabajo:**
   - etiqueta "Peso de trabajo";
   - número grande (64 px; 52 px en pantallas de 360 px o menos) con "kg" pegado al número;
   - el campo crece con lo que se escribe, mediante una copia invisible del texto en la misma celda (`width:0; min-width:100%` en el input). Medirlo con JavaScript falló en Safari;
   - máximo 6 caracteres; teclado decimal;
   - línea inferior que se vuelve naranja con el foco.
2. **Carga** (plegable, plegada al abrir):
   - **Resumen en una línea:** "CARGA · Barra · Olímpica 20 kg · collarines" o "CARGA · Dos lados · máquina".
   - **Modos:** control segmentado de tres botones con icono y texto: Barra, Dos lados, Un punto.
   - **Solo en el modo Barra:**
     - cuatro fichas de barra (Olímpica 20 kg, Olímpica 15 kg, Recta 10 kg, Z 10 kg), cada una con su miniatura 3D, nombre y peso;
     - el interruptor "Collarines de competición", con el texto "2,5 kg cada uno; suman 5 kg en las series con discos";
     - con la recta o la Z elegidas, el campo "Peso de la barra" (kg) y su mensaje de error debajo.
   - **En los modos de máquina:** "Los discos se cargan en el cuerno de la máquina."
3. **Mis discos** (plegable, plegado al abrir):
   - **Resumen:** puntos de color de los 7 discos, apagados los deshabilitados; "5 de 7" cuando no están todos.
   - **Panel:** 7 discos dibujados en plano con su peso. Tocar uno lo habilita o deshabilita; el deshabilitado queda gris y tachado.
4. **Avisos** generales (región `aria-live`).
5. **Series:** una tarjeta por porcentaje, ordenadas.
6. **"+ Añadir porcentaje":** botón de borde discontinuo a todo el ancho.

Descartado y fuera del alcance: la tarjeta fija del 100 %, ampliar una serie, mantener la pantalla encendida, el landmine, el tema claro y las funciones 1 a 6 de la lista de ideas.

### 3.2 Iconos

- **Modos:** iconos de línea propios, con viewBox de 40×20, trazo de 1,75, extremos redondeados y `currentColor` (SVG en la maqueta, `ICON_MODO`):
  - **Barra:** una barra con un disco y un tope a cada lado;
  - **Dos lados:** dos postes, cada uno con su cuerno y su disco;
  - **Un punto:** un solo poste con su cuerno y su disco.
- **Fichas de barra:** miniaturas renderizadas una vez al arrancar con el mismo motor y los mismos materiales:
  - media barra (agarre desde −360, tope y manga), vista de frente;
  - todas a la misma escala, para que se aprecie la diferencia de manga;
  - el agarre se funde hacia la izquierda con una máscara CSS.

  Si el 3D no está disponible, se usa un dibujo plano.

### 3.3 Avisos y textos

| Situación | Texto | Efecto |
| --- | --- | --- |
| Peso de trabajo vacío | Escribe el peso de trabajo. | Sin series |
| Fuera de rango | El peso de trabajo debe estar entre 0 y 500 kg. | Sin series |
| Más de 2 decimales | El peso de trabajo admite como máximo dos decimales. | Sin series |
| Lista vacía | Añade al menos un porcentaje. | Sin series |
| Ningún disco habilitado | Habilita al menos un disco en Mis discos. (o el de SPEC-CALC-002) | Sin series |
| Peso inferior a la barra | El peso de trabajo es inferior a la barra: elige una barra más ligera o revisa el peso. | Series calculadas igualmente |
| Peso de barra no válido | Escribe un peso de barra entre 1 y 50 kg, con dos decimales como máximo. (bajo el campo) | Sin series |
| Porcentaje no válido | Escribe un porcentaje entre 0 y 100. (bajo el campo) | El campo sigue abierto, con el borde rojo |
| Porcentaje repetido | Ya tienes una serie del 70 %. | Ídem |

### 3.4 Tarjeta de serie

Hay dos columnas: el texto a la izquierda y el dibujo a la derecha, con una relación 1 : 1,3. En pantallas de 360 px o menos van en una sola columna.

- **Línea 1:** "70 %" y, si hay redondeo, la marca "−0,7 kg" (gris). Pulsada se vuelve naranja y abre la explicación.
- **Línea 2:** el total, "157,5 kg", en grande.
- **Línea 3:** "Por lado" o "Total en discos".
- **Línea 4:** los discos, de mayor a menor, cada uno con un punto de color y su peso; los repetidos con "×n".
- **Línea 5 (si aplica):** "+ collarín de 2,5 kg", discreta.
- **Sin discos:** en lugar de los discos, una línea destacada y una explicación debajo. "El disco más pequeño" es el menor de los habilitados en Mis discos. "Falta" es lo que haría falta para cargarlo, menos el objetivo.

  | Caso | Línea | Explicación (ejemplo) |
  | --- | --- | --- |
  | Barra, objetivo menor que la barra | Solo la barra | El 15 % son 15 kg, menos que la barra (20 kg). |
  | Barra, no llega a un disco por lado | Solo la barra | El 42 % son 21 kg: faltan 1,5 kg para poner el disco más pequeño (1,25 kg) a cada lado. |
  | Ídem, con collarines | Solo la barra | El 50 % son 22 kg: faltan 5,5 kg para poner el disco más pequeño (1,25 kg) y el collarín a cada lado. |
  | Dos lados | Sin discos | El 10 % son 1 kg: faltan 1,5 kg para poner el disco más pequeño (1,25 kg) a cada lado. |
  | Un punto | Sin discos | El 10 % son 1 kg: faltan 0,25 kg para poner el disco más pequeño (1,25 kg). |

  El total muestra la barra (Barra) o 0 kg (máquina).
- **Debajo, a todo el ancho:**
  - la explicación del redondeo, dentro de la tarjeta (la tarjeta crece; nunca flota encima, porque se recortaría);
  - la nota de capacidad, si aplica.
- **El dibujo** (relación 1,25) lleva una etiqueta accesible: "Carga: 2 de 25, 15 kg" o "Sin discos".

### 3.5 Borrar y añadir

- **Deslizar a la izquierda** para borrar. Debajo aparece un fondo que solo existe mientras se arrastra:
  - mientras no se pasa el umbral, granate muy tenue (`#3b1c1e`) con "Borrar" en rojo claro (`#ff9592`);
  - pasado el 35 % del ancho, rojo vivo (`#e5484d`), texto blanco y el icono crece un 15 %.
- **Al soltar** pasado el umbral:
  - la tarjeta sale de lado (200 ms);
  - su hueco se cierra (altura y margen a 0, con opacidad, 260 ms, `cubic-bezier(.2,.8,.2,1)`);
  - se borra la serie y aparece el aviso "Serie del 70 % borrada" con "Deshacer" durante 5 s.
- **Sin pasar el umbral,** la tarjeta vuelve a su sitio.
- **Alternativa accesible:** un botón visualmente oculto, "Quitar la serie del 70 %", que se ve al recibir el foco. Hace lo mismo.
- **Deshacer** no puede duplicar una serie. Las tarjetas nuevas (las añadidas o las que vuelven con Deshacer) entran con opacidad y un pequeño desplazamiento (240 ms).
- **Añadir:**
  - el botón se convierte en un campo con "Porcentaje" de texto de ayuda, "%" pegado, "✕" (cancelar) y "Añadir";
  - teclado numérico sin coma, máximo 3 caracteres;
  - Intro o "Añadir" confirma, Escape o "✕" cancela;
  - al perder el foco: si es válido se añade, si está vacío se cierra y si no es válido se queda abierto con el error.

### 3.6 Tokens visuales

| Token | Valor |
| --- | --- |
| Fondo | `#0d0e10` |
| Superficie | `#16181b` |
| Superficie 2 | `#1e2125` |
| Línea | `#2b2f35` |
| Texto | `#f1f2f4` |
| Texto secundario | `#a6abb3` |
| Acento | `#ff8a2a` |
| Tinta sobre acento | `#1a0e02` |
| Rojo (error y borrar) | `#e5484d` |
| Texto de error | `#ff9b9b` |

- **Tipografía:**
  - **números:** Barlow Semi Condensed (500–800);
  - **interfaz:** Barlow (400–600);
  - las dos con licencia OFL. **Se sirven desde la propia app**, no desde Google Fonts.
- **Radios:** paneles 16, tarjetas 14, fichas y botones 12.
- **Márgenes laterales:** 16 px, o el área segura si es mayor.
- **Ancho máximo:** 480 px.
- **Toque:** 44 px de alto como mínimo en todo lo pulsable.

## 4. Dibujo 3D

### 4.1 Escena

- **Cámara ortográfica:**
  - dirección de vista (0,6, 0,16, 0,784), normalizada, hacia el objetivo (110, −10, 0);
  - alto visible de 540 mm con barras y de 600 con máquina.

  Es la vista "aún más de frente" que eligió Víctor.
- **Entorno PMREM de estudio,** generado con planos emisivos:

  | Plano | Tamaño | Posición | Intensidad |
  | --- | --- | --- | --- |
  | Principal | 1400×900 | (−900, 1100, 900) | 8 |
  | Recorte | 260×1700 | (1300, 300, −300) | 4,5 |
  | Reflejo suave en las caras | 1000×700 | (1100, 650, −1100) | 0,8 |
  | Relleno bajo | 1700×500 | (0, −900, 1100) | 0,22 |
  | Techo | 3000×3000 | (0, 1700, 0) | 0,05 |

- **Luces:**
  - direccional principal con intensidad 1,8 en (−900, 1100, 900), con sombras PCFSoft (mapa de 2048, radio 4, bias −0,0005, caja ±900);
  - recorte con intensidad 0,9 en (600, 250, −700);
  - plano de sombra en z = −260, con una opacidad de 0,32.
- **Salida:** ACES Filmic, exposición 1,05, sRGB. Fondo transparente: la tarjeta pone el color.
- **Lienzo:** relación de 1,25 y resolución de hasta 2× la del dispositivo.

### 4.2 Discos (medidas IPF)

| kg | Radio | Grosor | Color | Tinta | Buje (radio) |
| --- | --- | --- | --- | --- | --- |
| 25 | 225 | 27 | `#c8102e` | blanca | 50 |
| 20 | 225 | 22,5 | `#0b4fc4` | blanca | 50 |
| 15 | 200 | 21 | `#e9a600` | blanca | 50 |
| 10 | 162,5 | 21 | `#13893a` | blanca | 50 |
| 5 | 114 | 16 | `#ffffff` | negra | 40 |
| 2,5 | 95 | 12 | `#1b1c1f` | blanca | 40 |
| 1,25 | 80 | 11 | `#c3c8cf` (metálico) | negra | 34 |

- **Cara:**
  - centro macizo, corona rebajada (2,2 mm) y aro exterior en relieve (8,9 % del radio);
  - anillo intermedio en relieve: a 0,42 R en los grandes y a buje + 12 en el de 5; sin anillo en el de 2,5 ni en el de 1,25;
  - agujero de 50,5 mm en todos y buje cromado mecanizado con escalón.
- **Pintura:** física con barniz (clearcoat 0,85), rugosidad 0,42 y grano sutil. Sin piel de naranja ni reflejos que laven el color (se probaron y se descartaron).
- **Rotulación,** impresa y plana (sin relieve):
  - "BVNKER" arriba y abajo de la corona, el de abajo girado 180°. Barlow Semi Condensed 800, cuerpo de 0,66 × el ancho de la corona e interletrado de 0,08 × el cuerpo;
  - interletrado por parejas: BV −0,07, VN −0,075, NK 0,04, KE 0,035, ER 0,04;
  - peso a izquierda y derecha (el derecho girado 180°): altura A = 0,56 × el ancho de la corona; decimales al 78 % y coma al 60 %; "KG" debajo a 0,34 A (0,44 A en los discos con decimales).

### 4.3 Barras y máquina

- **Olímpica de 20:** manga de 415, agarre de radio 14 cromado y moleteado.
- **Olímpica de 15:** manga de 320, agarre de radio 12,5.
- **Recta y Z:** manga de 240, agarre de radio 12,5, cromado y moleteado.
  - La Z se dibuja con quiebros en ángulo (CatmullRom centrípeta).
  - El moleteado repite (79, 30).
- **Tope:** radio 30, de 30 mm, cromado.
- **Manga:** radio 25, con ranuras mecanizadas y bisel final.
- **Máquina** (Dos lados y Un punto), todo en la misma línea X:
  - brazo naranja `#ff7a1a`, curvo, de sección rectangular redondeada de 56×90. Por abajo es lo bastante largo para salir del encuadre;
  - el brazo pasa entre dos pletinas negras sobre un montante;
  - casquillo naranja, eje, arandela y cabeza hexagonal;
  - tope de goma perpendicular al brazo, con su tubo;
  - cuerno de 320 soldado al costado exterior del brazo, con collar;
  - la estructura se retira 6 mm para que el primer disco quede en el mismo sitio que en las barras;
  - sin collarín;
  - en pantalla, el dibujo se funde arriba y abajo (máscara del 11 %).

### 4.4 Collarín (diseño propio)

- Anillo partido de grafito con bisel (radio exterior 40, interior 25,4, ancho 32) y banda naranja.
- Orejetas, tornillo y leva con palanca naranja de 65 mm.
- **Abierto:** palanca a 1,15 rad y ranura de 7 mm. **Cerrado:** palanca plana y ranura de 3 mm.
- No es la copia de ningún producto comercial; los diseños de marcas se descartaron expresamente.

### 4.5 Robustez

- **Sin WebGL** (o si falla al crearlo): la app sigue funcionando en una columna, solo con texto.
- **Pérdida de contexto** (Safari en segundo plano):
  - los lienzos 2D conservan lo pintado;
  - al recuperarlo se rehace el entorno y se repintan todas las tarjetas;
  - al volver a primer plano también se marcan para repintar.
- Las miniaturas se generan una vez y se guardan como imagen.

## 5. Cálculo de capacidad

### 5.1 Grosor y manga útil

- **Grosor:** el de §4.2.
- **Manga útil:** la manga menos 40 en las barras (espacio del collarín) y menos 10 en la máquina.
- **Reparto en el dibujo:** los discos se colocan de dentro afuera desde x = 1. Se dibujan, en orden, los que caben. Lo que no cabe se avisa en centímetros (§1.1).

### 5.2 Collarines

En el cálculo, el collarín resta 2,5 kg por lado del objetivo antes de buscar discos. Solo cuenta si la serie lleva algún disco. Si al restarlo no cabe ningún disco, la serie queda sin discos y sin collarín.

## 6. Movimiento

Al cambiar la carga de una tarjeta se conservan los discos interiores que no cambian, y solo se anima lo que cambia, en este orden:

| Paso | Qué pasa | Duración y curva |
| --- | --- | --- |
| 1. Sale el collarín | Se abre la palanca y la ranura, y luego desliza hacia fuera | Palanca 220 ms y ranura 160 ms (curva de entrada); salida 260 ms (cúbica de salida) |
| 2. Salen los discos | De uno en uno, de fuera hacia dentro; el siguiente no se mueve hasta que el anterior sale | (140 + 0,5 × distancia) ms cada uno, cúbica |
| 3. Entran los nuevos | Del más pesado al más ligero, ocultos hasta que les toca; cada uno empieza al 75 % del anterior | (220 + 0,7 × distancia) ms, cúbica de salida |
| 4. Entra el collarín | Llega con la palanca abierta, la cierra con rebote y se cierra la ranura | (200 + 0,6 × distancia) ms; palanca 340 ms con rebote (c1 = 1,9); ranura 180 ms |

- Cada tarjeta empieza 90 ms después de la anterior.
- Al escribir el peso de trabajo, el dibujo espera 400 ms desde la última tecla.
- Al cambiar de equipo (barra o máquina), todas las tarjetas se vacían y se cargan de nuevo.
- Con "reducir movimiento" no hay animaciones (ni en las tarjetas, ni al borrar ni al añadir).
- Sin animación al abrir la app.

## 7. Restricciones para la implementación

1. **Nada de red de terceros.** three.js y las fuentes van empaquetados y servidos por la app. Si no, se rompen NFR-01 (sin conexión) y NFR-02 (no salir del dispositivo), y los tests de CSP y de red protegidos.
2. **La lógica sigue siendo pura y testeable,** separada del dibujo: modos, redondeo, discos, collarines, capacidad y validaciones.
3. **Las dependencias nuevas** (three.js) se fijan a una versión exacta y pasan por la revisión de seguridad que toque según el riesgo.
4. **El rendimiento se mide en el iPhone 15 Pro Max** con 6 series y animación. Si se nota pesado, se reduce primero la resolución de las sombras.

## 8. Pruebas

- **Unitarias:** todo §1.1 y §5, con los ejemplos de los AC.
- **E2E (Playwright):** estados de §3.3, añadir, borrar y Deshacer (también con el botón accesible), orden de las series y persistencia de §2.2.
  - El dibujo no se compara píxel a píxel.
  - Basta con que haya lienzo y su etiqueta accesible sea la correcta.
- **Manuales en el iPhone:**
  - gesto de borrar;
  - animación y "reducir movimiento";
  - texto ampliado del sistema;
  - volver tras un rato en segundo plano (pérdida de contexto);
  - modo avión.

## 9. Orden de trabajo sugerido

1. PR de spec: SPEC-CALC-001 v0.6 y SPEC-CALC-003, con este documento y los dos HTML en `docs/diseno/`.
2. PR de ADR-0003 y PR de ADR-0004.
3. Lógica nueva (§1.1, §5), sin tocar la interfaz.
4. Interfaz nueva sin 3D: el dibujo es la vista de solo texto.
5. Dibujo 3D y movimiento.

Las piezas 3 a 5 son issues separadas. Cada una deja la app publicable.
