---
id: SPEC-CALC-001
titulo: Series de calentamiento con cálculo de discos
estado: en-revision
version: 0.7
riesgo: R1
sustituye: null
adr: [ADR-0001, ADR-0002, ADR-0004, ADR-0005]
transversales: []
---

<!--
Redactada con sdd-spec a partir de discovery/notas-descubrimiento.md
(rondas 1–4, revisión del borrador y cierre, 2026-10-20). Todas las reglas
de negocio las decidió Víctor; las que eran propuesta de Claude y él aceptó
están marcadas en las notas. La versión 0.2 incorpora sus decisiones sobre las
rondas 1, 2 y 3 de la revisión G4 (2026-10-21), registradas en el PR #2. La
versión 0.3 enlaza ADR-0001 y aclara en FR-11 que, si iOS cierra la app en
segundo plano, la vuelta es un arranque de cero (decisión de Víctor). La
versión 0.4 hace más tolerante la escritura de pesos y porcentajes (FR-03,
FR-04) para que el recálculo al momento (FR-10) no muestre errores a mitad de
escribir, y aclara qué cuenta como espacio, qué pasa al añadir un porcentaje
vacío y que la app no reescribe lo tecleado (decisiones de Víctor, 2026-10-21).
La versión 0.5 delega en SPEC-CALC-002 qué discos se usan (FR-06, FR-07,
FR-09), qué pasa sin ningún tipo habilitado (FR-08, FR-09, FR-12) y el fallo
al guardar (FR-11), incluye los discos habilitados en AC-13, enlaza ADR-0002 y
aclara que los AC suponen los 7 tipos habilitados. Con los 7 habilitados, el
comportamiento no cambia (VIC-8, decisiones de Víctor, 2026-10-23).
La versión 0.6 (VIC-9) sale de docs/diseno/notas-diseno-interfaz.md, con las
decisiones que Víctor tomó en las sesiones de diseño del 23 al 25 de octubre.
Cambia FR-02, FR-03, FR-04, FR-06, FR-08, FR-09, FR-10, FR-11, FR-12 y FR-13,
añade los collarines (FR-15) y la capacidad de la manga (FR-16) y deja la
presentación en SPEC-CALC-003. Cuatro decisiones son de Víctor del 2026-10-26,
tomadas al preparar el PR: ADR-0004 se fusiona antes que esta versión; solo se
guarda un peso válido y el peso de barra vacío muestra el error; el mensaje
de porcentaje dice "entre 1 y 100" y una lista guardada se ordena y se quitan
los repetidos al leerla; SPEC-CALC-002 se ajusta en el mismo PR. En la revisión
del PR #16 fijó el texto de FR-03 para un peso mal escrito y confirmó como reglas
el descarte del peso no válido al cambiar de barra (FR-02) y el redondeo hacia
arriba del exceso de la manga (FR-16). Tras la ronda 1 de G4 decidió que un
peso de barra no válido también se descarta al cambiar de modo (FR-02) y que,
mientras no es válido, no se muestra el aviso de FR-12.
La versión 0.7 (VIC-13) guarda los pesos al terminar de editarlos y nunca con
cada tecla, para que borrar "105" con la tecla de retroceso no guarde "10" ni "1"
(FR-02, FR-11, AC-34, AC-42, AC-43). Decisiones de Víctor del 2026-10-26 y del
2026-10-29: terminar de editar es salir del campo, cambiar de barra o de modo o
pasar la app a segundo plano; con el campo vacío o no válido se conserva el último
valor confirmado, también al volver a una barra; el cambio de ADR-0004 va en
ADR-0005, que se fusiona antes, y SPEC-CALC-002 FR-09 se ajusta en el mismo PR.
-->

# SPEC-CALC-001 — Series de calentamiento con cálculo de discos

## 1. Objetivo

Que Víctor, en el gimnasio y desde el iPhone, sepa al instante qué discos cargar en cada serie de aproximación a partir de su peso de trabajo y de los porcentajes que elija, sin hacer cuentas.

## 2. Alcance y exclusiones

- **Incluye:**
  - tres modos de carga: con barra, dos lados sin barra y un solo punto de carga;
  - un catálogo fijo de barras;
  - una lista editable de porcentajes;
  - el cálculo de discos con redondeo hacia abajo;
  - los collarines de competición en el modo Barra;
  - el aviso de que los discos no caben en la manga;
  - que se recuerden los porcentajes, el último peso de trabajo, el peso de la recta y de la Z y la opción de collarines;
  - el funcionamiento sin conexión.
- **Excluye** (cada uno, si llega, será otra spec):
  - máquinas de placas y poleas;
  - mancuernas;
  - libras;
  - elegir qué tipos de disco están disponibles, que cubre SPEC-CALC-002;
  - la presentación (estructura de la pantalla, dibujo, movimiento y accesibilidad), que cubre SPEC-CALC-003;
  - repeticiones;
  - una serie de trabajo fija: el 100 % se puede añadir como un porcentaje más (FR-04);
  - varios usuarios, cuentas o sincronización entre dispositivos.

## 3. Actores

Víctor, único usuario, en su iPhone. Ningún otro sistema recibe datos: la app solo se descarga y actualiza desde su propio origen (NFR-02).

## 4. Requisitos funcionales

- **FR-01:** la persona elige uno de tres modos de carga:
  - **Barra:** discos repartidos a los dos lados de una barra.
  - **Dos lados sin barra:** discos repartidos en dos lados, por ejemplo una prensa o una máquina de palanca. El peso propio de la máquina no cuenta.
  - **Un punto:** todos los discos en un único punto, por ejemplo un remo en T.
- **FR-02:** en el modo Barra, la persona elige una barra de un catálogo fijo, que no puede ampliar ni reducir:
  - la olímpica de 20 kg, con peso fijo;
  - la olímpica de 15 kg, con peso fijo;
  - la recta, con el peso que introduce la persona;
  - la Z, con el peso que introduce la persona.

  El peso de la recta y el de la Z:
  - es un número de 1 a 50 kg, ambos incluidos, con hasta dos decimales;
  - se escribe con las mismas reglas que el peso de trabajo (FR-03): cifras, un separador decimal, espacios al principio y al final, separador al final o al principio sin cifras y campo que se trata como vacío;
  - es propio de cada barra: la recta y la Z tienen cada una el suyo. La primera vez, los dos son 10 kg (FR-11);
  - cuando la persona elige la recta o la Z, y al arrancar de cero, el campo muestra el peso confirmado de esa barra (FR-11) con el formato de FR-14;
  - cambiar de barra o de modo termina la edición del peso de la barra (FR-11): un peso válido se confirma y se guarda, y un texto vacío o no válido se descarta, de modo que la barra conserva su peso confirmado. Por ejemplo, con la recta confirmada en 7,5 kg, si la persona borra hasta "7," (que vale 7), después hasta vaciar el campo y elige la Z, al volver a la recta el campo muestra "7,5".

  Mientras el peso de la barra elegida no es válido, también vacío, la app muestra bajo el campo "Escribe un peso de barra entre 1 y 50 kg, con dos decimales como máximo." y no muestra series. Con el panel de la barra plegado, lo indica además un aviso general (SPEC-CALC-003 FR-05).
- **FR-03:** el peso de trabajo es mayor que 0 y como máximo 500 kg, con hasta dos decimales.
  - Se escribe solo con cifras y, si lleva decimales, un separador decimal (coma o punto) seguido como mucho de dos cifras escritas. No se admite separador de miles. Por ejemplo, "100,10" vale (equivale a 100,1); "100,120" y "1.000" se rechazan.
  - Antes de validar, y para que el recálculo al momento (FR-10) no muestre errores a mitad de escribir en los casos habituales:
    - los espacios al principio y al final se ignoran: " 100 " equivale a 100. Cuentan como espacios todos los espacios en blanco, incluidos el tabulador, el espacio duro y los saltos de línea;
    - un separador al final sin cifras detrás vale como si no estuviera: "100," equivale a 100;
    - un separador al principio sin cifras delante vale como si llevara un 0 delante: ",5" equivale a 0,5;
    - si, tras ignorar los espacios, no queda nada o solo queda el separador ("," o "."), el campo se trata como vacío.

    Estas reglas no cambian que el valor lleva como mucho un separador: "100,5," y "100,," se rechazan. Un valor que vale 0 sigue sin ser válido aunque sea un paso intermedio ("0," o ",0" al escribir ",05").
  - Mientras el campo está vacío, la app no muestra series ni ningún error: muestra la indicación "Escribe el peso de trabajo.".
  - Si el valor escrito no es válido, la app no muestra series y muestra uno de estos mensajes, el primero que se cumpla:
    1. con un solo separador seguido de más de dos cifras, como un separador de miles ("100,123", "1.000"): "El peso de trabajo admite como máximo dos decimales.";
    2. con algo que no sean cifras y un separador ("10 0", "100,5,", "abc"): "Escribe el peso solo con cifras y, si hace falta, una coma decimal." (el punto se sigue aceptando como separador);
    3. con un valor de 0 o mayor que 500: "El peso de trabajo debe estar entre 0 y 500 kg.".
- **FR-04:** los porcentajes de calentamiento forman una lista:
  - la persona puede añadir y quitar porcentajes en cualquier momento;
  - cada uno es un número entero del 1 al 100, escrito solo con cifras: "40,0" se rechaza;
  - los espacios al principio y al final se ignoran, con la misma definición de espacio que en FR-03: " 40 " equivale a 40;
  - si la persona intenta añadir un porcentaje vacío o que solo tiene espacios, la app no añade nada y no muestra ningún mensaje;
  - se muestran ordenados de menor a mayor, sea cual sea el orden en que se añadieron;
  - no se puede repetir un porcentaje. Si la persona intenta añadir uno que ya está en la lista, la app no lo añade y muestra "Ya tienes una serie del P %.", con P el porcentaje;
  - si la persona intenta añadir un porcentaje no válido, la app no lo añade y muestra "Escribe un porcentaje entre 1 y 100.";
  - dos porcentajes distintos que cargan lo mismo se muestran los dos.
- **FR-05:** para cada porcentaje, el peso objetivo es el peso de trabajo × porcentaje / 100, redondeado a dos decimales con la mitad hacia arriba. Ese objetivo redondeado es el que se usa en todo lo demás: el cálculo de la carga, la diferencia y lo que se muestra. En el modo Barra, el objetivo incluye la barra y, si los hay, los collarines (FR-15).
- **FR-06:** el peso cargado es el mayor peso cargable con los discos habilitados (SPEC-CALC-002) que no supera el objetivo:
  - **modo Barra:** el peso de discos de cada lado, sobre lo que queda del objetivo tras restar la barra y, si los hay, los collarines (FR-15);
  - **modo Dos lados:** el peso de discos de cada lado;
  - **modo Un punto:** el peso total de discos.

  Con los 7 tipos habilitados, equivale a redondear hacia abajo a un múltiplo de 1,25 kg (el peso de cada lado o el total, según el modo).

  Si el peso cargado no coincide con el objetivo, la serie muestra la diferencia, D = objetivo − peso cargado, como "−D kg" junto al porcentaje, y una explicación que la persona puede abrir: "El P % de W kg son O kg. Con tus discos, lo más cercano sin pasarte es C kg: D kg menos.", con P el porcentaje, W el peso de trabajo, O el objetivo y C el peso cargado. Cómo se abre lo fija SPEC-CALC-003.
- **FR-07:** los tipos de disco son 25, 20, 15, 10, 5, 2,5 y 1,25 kg. Los discos se eligen entre los tipos habilitados, con existencias ilimitadas de cada uno, según SPEC-CALC-002 (FR-04), y se muestran de mayor a menor. Con los 7 tipos habilitados, el resultado es el de tomarlos de mayor a menor, tantos de cada uno como quepan.
- **FR-08:** cada serie muestra:
  - el porcentaje;
  - el peso total cargado (en el modo Barra, con la barra y, si los hay, los collarines);
  - la diferencia, cuando la hay (FR-06);
  - la etiqueta "Por lado" en los modos Barra y Dos lados, o "Total en discos" en el modo Un punto;
  - los discos de mayor a menor: cada tipo una vez, con su peso y, si se repite, "×n", con n el número de discos de ese tipo (por ejemplo, "25 ×2" y "10");
  - "+ collarín de 2,5 kg", si la serie lleva collarines (FR-15);
  - el aviso de capacidad, si los discos no caben (FR-16).

  La serie no muestra el peso de discos por lado. Los casos de FR-09 son la excepción. Sin ningún tipo habilitado, no se muestra ninguna serie (SPEC-CALC-002 FR-06).
- **FR-09:** excepción explícita a FR-06 y FR-08. Cuando el objetivo no alcanza para cargar el disco más pequeño, la serie no lleva discos ni collarines y no muestra la diferencia ni su explicación. En lugar de los discos, muestra una línea y una explicación, con P el porcentaje, O el objetivo, B el peso de la barra, Y el disco más pequeño y F lo que falta para cargarlo:

  | Modo | No alcanza cuando | Línea | Peso total | Explicación |
  | --- | --- | --- | --- | --- |
  | Barra, objetivo menor que la barra | O < B | "Solo la barra" | B | "El P % son O kg, menos que la barra (B kg)." |
  | Barra, sin collarines | B ≤ O < B + 2 × Y | "Solo la barra" | B | "El P % son O kg: faltan F kg para poner el disco más pequeño (Y kg) a cada lado.", con F = B + 2 × Y − O |
  | Barra, con collarines | B ≤ O < B + 2 × (Y + 2,5) | "Solo la barra" | B | "El P % son O kg: faltan F kg para poner el disco más pequeño (Y kg) y el collarín a cada lado.", con F = B + 2 × (Y + 2,5) − O |
  | Dos lados | O < 2 × Y | "Sin discos" | 0 kg | "El P % son O kg: faltan F kg para poner el disco más pequeño (Y kg) a cada lado.", con F = 2 × Y − O |
  | Un punto | O < Y | "Sin discos" | 0 kg | "El P % son O kg: faltan F kg para poner el disco más pequeño (Y kg).", con F = Y − O |

  El disco más pequeño, Y, es el tipo habilitado más pequeño (SPEC-CALC-002 FR-05); con los 7 tipos habilitados, 1,25 kg. Sin ningún tipo habilitado, esta regla no se aplica: no se muestra ninguna serie (SPEC-CALC-002 FR-06).
- **FR-10:** cualquier cambio de modo, barra, peso de la barra, peso de trabajo, porcentajes u opción de collarines recalcula las series al momento, sin un botón de calcular.
- **FR-11:** se guardan en el dispositivo, y se recuperan cuando la app arranca de cero, estos datos:

  | Dato | Cuándo se guarda | Valor la primera vez o si el dato guardado falta, no se puede leer o no es válido |
  | --- | --- | --- |
  | La lista de porcentajes | Al cambiar, aunque quede vacía | 40 %, 70 % y 90 % |
  | El peso de trabajo, tal como está escrito | Al terminar de editarlo, solo si el valor es válido (FR-03) | "100" |
  | El peso de la recta y el de la Z, cada uno por separado | Al terminar de editarlo, solo si el valor es válido (FR-02) | 10 kg cada uno |
  | La opción de collarines (FR-15) | Al cambiar | Desactivada |

  - Al arrancar de cero se recupera la lista guardada, aunque esté vacía.
  - Los pesos se guardan al terminar de editarlos, nunca con cada tecla. Terminar de editar un peso es cualquiera de estos momentos:
    - la persona sale del campo;
    - la persona cambia de barra o de modo;
    - la app pasa a segundo plano, por ejemplo al cambiar de app, al bloquear el teléfono o al abrir el selector de apps para cerrarla.
  - Cada peso tiene un valor confirmado. Al arrancar de cero, es el valor con el que arranca: el guardado o, si falta, no se puede leer o no es válido, el de la primera vez. Después, es el último valor válido que tenía el campo al terminar de editarlo. Al terminar de editar:
    - si el valor del campo es válido y distinto del confirmado, pasa a ser el confirmado y se guarda. El peso de trabajo se compara por su texto ("100" y "100,0" son distintos) y los pesos de barra, por su valor;
    - si el campo está vacío o no es válido, el confirmado no cambia y no se guarda nada. Lo que muestra el campo tampoco cambia (FR-14), salvo al cambiar de barra o de modo (FR-02).
  - Mientras se escribe, los valores intermedios no se guardan aunque sean válidos: al borrar "105" con la tecla de retroceso, no se guardan ni "10" ni "1". Las series sí se recalculan con cada tecla (FR-10).
  - Si la app pasa a segundo plano a mitad de una edición, se guarda el valor que tenga el campo en ese momento, si es válido, aunque sea un paso intermedio.
  - Una lista guardada es válida si es una lista de enteros del 1 al 100. Al leerla, se ordena de menor a mayor y se quitan los repetidos. Un peso de trabajo guardado es válido si cumple FR-03; un peso de barra guardado, si cumple FR-02. Cualquier otra cosa no es válida y se trata igual que un dato que no se puede leer.
  - Cada dato se recupera por separado: si uno falta o no es válido, los demás se recuperan igualmente, también los tipos de disco habilitados.
  - El modo y la barra no se guardan: al arrancar de cero, el modo es Barra con la olímpica de 20 kg.
  - Los tipos de disco habilitados se guardan y se recuperan según SPEC-CALC-002 FR-08. Si un dato no se puede guardar, se aplica SPEC-CALC-002 FR-09.

  Esta regla se aplica solo al arranque de cero. Cuando la app vuelve de segundo plano sin haberse cerrado, conserva todo su estado: modo, barra, pesos de las barras, peso de trabajo, porcentajes, opción de collarines y tipos de disco habilitados (SPEC-CALC-002 FR-08). Pasar a segundo plano termina la edición de un peso y lo guarda según las reglas anteriores, pero no cambia lo que muestra el campo. Si iOS la cerró mientras estaba en segundo plano, la vuelta es un arranque de cero (ADR-0001).
- **FR-12:** en el modo Barra, si el peso de trabajo es menor que el peso de la barra elegida, la app muestra el aviso general "El peso de trabajo es inferior a la barra: elige una barra más ligera o revisa el peso.". Las series se calculan igualmente según FR-09, salvo que no haya ningún tipo habilitado (SPEC-CALC-002 FR-06). Mientras el peso de la recta o de la Z elegida no es válido (FR-02), este aviso no se muestra.
- **FR-13:** cuando la lista de porcentajes está vacía, la app no muestra ninguna serie y muestra la indicación "Añade al menos un porcentaje.".
- **FR-14:** formato de los números:
  - al escribir un peso, la app acepta como separador decimal tanto la coma como el punto, con como mucho dos cifras escritas tras él y sin separador de miles (FR-03);
  - los pesos, el objetivo, la diferencia, lo que falta (FR-09) y la capacidad (FR-16) se muestran con coma decimal, como máximo dos decimales y sin ceros finales (por ejemplo, "73,5" y "40", nunca "73,50" ni "40,00");
  - la app nunca reescribe lo que la persona teclea en un campo: este formato solo se aplica a lo que la app muestra.
- **FR-15:** en el modo Barra, la persona puede activar o desactivar la opción "Collarines de competición", de 2,5 kg cada uno:
  - con la opción activada, la serie lleva un collarín a cada lado solo si lleva algún disco. Antes de buscar los discos, se restan del objetivo la barra y 2 × 2,5 kg (FR-06), y el peso total incluye los dos collarines;
  - si, al restarlos, no alcanza para el disco más pequeño, la serie queda sin discos y sin collarines (FR-09);
  - la serie que lleva collarines muestra "+ collarín de 2,5 kg" (FR-08);
  - en los modos Dos lados y Un punto, la opción no tiene efecto y conserva su valor para cuando se vuelva al modo Barra.
- **FR-16:** capacidad de la manga. Los discos se apilan con su grosor real, en milímetros:

  | Disco (kg) | 25 | 20 | 15 | 10 | 5 | 2,5 | 1,25 |
  | --- | --- | --- | --- | --- | --- | --- | --- |
  | Grosor (mm) | 27 | 22,5 | 21 | 21 | 16 | 12 | 11 |

  Cada equipo tiene una manga útil, que en las barras ya descuenta el espacio del collarín: la olímpica de 20 kg, 375 mm; la olímpica de 15 kg, 280 mm; la recta y la Z, 200 mm; y la máquina de los modos Dos lados y Un punto, 310 mm. La manga útil es la de cada lado en los modos Barra y Dos lados, y la del único punto en el modo Un punto.

  Si la suma de los grosores de los discos de un lado (o del único punto) supera la manga útil, el cálculo no cambia y la serie muestra "No caben en la manga: faltan X cm. Se dibujan los que caben.". X es el exceso redondeado hacia arriba al milímetro y expresado en centímetros (FR-14). Qué discos se dibujan lo fija SPEC-CALC-003. Si la tarjeta no muestra dibujo (SPEC-CALC-003 FR-14 y FR-15), el aviso es solo "No caben en la manga: faltan X cm.".

## 5. Criterios de aceptación

Los AC suponen los 7 tipos de disco habilitados (SPEC-CALC-002) y los collarines desactivados, salvo que se diga otra cosa. "25 + 10 por lado" describe la combinación de discos; cómo se muestra lo fija FR-08. "Muestra la diferencia −D kg (objetivo O kg)" significa que la serie muestra la marca de FR-06 y que su explicación cita ese objetivo. Algunos ejemplos de escritura superan el número de caracteres que admiten los campos (SPEC-CALC-003): describen la regla de validación y se comprueban en los tests de la lógica.

- **AC-01 → FR-05, FR-07, FR-08:** dado el modo Barra con la olímpica de 20 kg, un peso de trabajo de 100 kg y los porcentajes 40, 70 y 90, la app muestra estas tres series, sin diferencia:

  | Porcentaje | Peso cargado | Discos por lado |
  | --- | --- | --- |
  | 40 % | 40 kg | 10 |
  | 70 % | 70 kg | 25 |
  | 90 % | 90 kg | 25 + 10 |
- **AC-02 → FR-06:** con la olímpica de 20 kg, 105 kg y el 70 % (objetivo 73,5 kg), la app carga 72,5 kg (25 + 1,25 por lado) y muestra "−1 kg" junto al porcentaje. Su explicación dice "El 70 % de 105 kg son 73,5 kg. Con tus discos, lo más cercano sin pasarte es 72,5 kg: 1 kg menos.".
- **AC-03 → FR-09:** con la olímpica de 20 kg:
  - con 40 kg y el 40 % (objetivo 16 kg), la serie muestra "Solo la barra", un total de 20 kg y "El 40 % son 16 kg, menos que la barra (20 kg).", sin diferencia;
  - con 50 kg y el 42 % (objetivo 21 kg, que no llega a 1,25 kg por lado), muestra "Solo la barra", un total de 20 kg y "El 42 % son 21 kg: faltan 1,5 kg para poner el disco más pequeño (1,25 kg) a cada lado.", sin diferencia.
- **AC-04 → FR-02:** con la Z y un peso de barra de 8,5 kg, 50 kg y el 70 % (objetivo 35 kg), la app carga 33,5 kg (10 + 2,5 por lado) y muestra la diferencia −1,5 kg. Las olímpicas de 20 y 15 kg no permiten cambiar su peso, y el catálogo no permite añadir ni quitar barras.
- **AC-05 → FR-01, FR-08:** en el modo Dos lados, con 100 kg y el 70 %, la serie muestra 70 kg en total y 25 + 10 bajo "Por lado", sin peso de discos por lado.
- **AC-06 → FR-01, FR-06:** en el modo Un punto, con 60 kg y el 70 % (objetivo 42 kg), la serie muestra 41,25 kg con 25 + 15 + 1,25 bajo "Total en discos", y la diferencia −0,75 kg.
- **AC-07 → FR-09:** con 10 kg y el 10 % (objetivo 1 kg), sin diferencia en ningún caso:
  - en el modo Dos lados, la serie muestra "Sin discos", un total de 0 kg y "El 10 % son 1 kg: faltan 1,5 kg para poner el disco más pequeño (1,25 kg) a cada lado.";
  - en el modo Un punto, muestra "Sin discos", un total de 0 kg y "El 10 % son 1 kg: faltan 0,25 kg para poner el disco más pequeño (1,25 kg).".
- **AC-08 → FR-03:** el peso de trabajo vacío y el no válido se tratan de forma distinta:
  - con un peso de trabajo de 0 o de 500,01, la app muestra "El peso de trabajo debe estar entre 0 y 500 kg." y no muestra series;
  - con 100,123, muestra "El peso de trabajo admite como máximo dos decimales." y no muestra series;
  - con un peso de trabajo de 500 o de 0,01, la app acepta el valor y muestra las series, sin ningún mensaje de error;
  - si la persona borra el peso de trabajo, la app no muestra series ni ningún mensaje de error, solo la indicación "Escribe el peso de trabajo.".
- **AC-09 → FR-04:** la lista respeta los límites, el orden y los repetidos:
  - al intentar añadir los porcentajes 0, 101 o 40,5, la app muestra "Escribe un porcentaje entre 1 y 100." y no los añade;
  - los porcentajes 1, 99 y 100 se añaden a la lista sin ningún mensaje de error;
  - con la lista vacía, si la persona añade 90 y después 40, se muestran en el orden 40, 90;
  - con 70 en la lista, al intentar añadir 70 o " 70 ", la app muestra "Ya tienes una serie del 70 %." y la lista no cambia;
  - con la olímpica de 20 kg, 100 kg y los porcentajes 85 y 87, se muestran las dos series aunque ambas carguen 85 kg (la del 87 % con diferencia).
- **AC-10 → FR-10:** al cambiar el peso de trabajo, el peso de la barra, añadir o quitar un porcentaje, cambiar de modo o de barra, o activar o desactivar los collarines, las series se actualizan sin ninguna otra acción.
- **AC-11 → FR-11:** al arrancar de cero:
  - la primera vez que se abre, la lista es 40, 70 y 90, el peso de trabajo es "100" y se ven las series de AC-01, el modo es Barra con la olímpica de 20 kg, los collarines están desactivados y la recta y la Z pesan 10 kg;
  - si la persona cambia la lista a 50 y 75, el peso de trabajo a "102,5", la recta a 7,5 kg y la Z a 8,5 kg, activa los collarines, pasa al modo Dos lados, cierra la app y la vuelve a abrir, recupera la lista 50 y 75, el peso "102,5", la recta de 7,5 kg, la Z de 8,5 kg y los collarines activados, y el modo vuelve a ser Barra con la olímpica de 20 kg;
  - si la persona quita todos los porcentajes, cierra la app y la vuelve a abrir, la lista sigue vacía.
- **AC-12 → NFR-01:** con la app ya instalada en el iPhone y el teléfono en modo avión, la app se abre y reproduce el resultado de AC-01.
- **AC-13 → NFR-02:** durante un uso completo, incluida la primera carga (abrir, calcular, cambiar porcentajes, pesos y collarines, habilitar y deshabilitar tipos de disco y cerrar), todas las peticiones de red van al propio origen de la app, y ninguna contiene datos que haya introducido la persona: pesos, porcentajes, modo, barra, collarines o discos habilitados.
- **AC-14 → FR-12:** con la olímpica de 20 kg y un peso de trabajo de 15 kg, la app muestra "El peso de trabajo es inferior a la barra: elige una barra más ligera o revisa el peso.", y las series 40, 70 y 90 muestran "Solo la barra", un total de 20 kg y "El 40 % son 6 kg, menos que la barra (20 kg).", "El 70 % son 10,5 kg, menos que la barra (20 kg)." y "El 90 % son 13,5 kg, menos que la barra (20 kg).".
- **AC-15 → FR-13:** si la persona quita todos los porcentajes, con la olímpica de 20 kg y 100 kg, la app no muestra ninguna serie y muestra "Añade al menos un porcentaje.".
- **AC-16 → FR-05, FR-06:** con la olímpica de 20 kg, 101,11 kg y el 70 % (70,777 kg, que se redondea a un objetivo de 70,78 kg), la app carga 70 kg (25 por lado) y muestra la diferencia −0,78 kg (objetivo 70,78 kg).
- **AC-17 → FR-05, FR-06:** con la olímpica de 20 kg, 100,01 kg y el 40 % (40,004 kg, que se redondea a un objetivo de 40 kg), la app carga 40 kg (10 por lado) sin diferencia, porque el peso cargado coincide con el objetivo.
- **AC-18 → FR-14:** con la olímpica de 20 kg y el 70 %, escribir el peso de trabajo como "102,5" o como "102.5" da el mismo resultado: 70 kg (25 por lado), con la diferencia −1,75 kg (objetivo 71,75 kg).
- **AC-19 → FR-02:** con la Z o con la recta:
  - un peso de barra de 0,99, de 50,01, de 10,123, de "10,120", de "1.000", vacío, "," o solo con espacios muestra bajo el campo "Escribe un peso de barra entre 1 y 50 kg, con dos decimales como máximo." y no muestra series;
  - un peso de barra de 1 o de 50 se acepta: la app muestra las series, sin ningún mensaje de error sobre el peso de barra;
  - con la recta, un peso de barra escrito como "7,5", 60 kg y el 70 % (objetivo 42 kg), la app carga 40 kg (15 + 1,25 por lado) y muestra la diferencia −2 kg.
- **AC-20 → FR-05, FR-06:** en el modo Un punto, con 2,51 kg y el 50 % (1,255 kg, que se redondea con la mitad hacia arriba a un objetivo de 1,26 kg), la app carga 1,25 kg (un disco de 1,25) y muestra "−0,01 kg" (objetivo 1,26 kg).
- **AC-21 → FR-05, FR-06, FR-14:** con la olímpica de 20 kg, 99,99 kg y el 40 % (39,996 kg, que se redondea a un objetivo de 40 kg), la app carga 40 kg (10 por lado) sin diferencia. El peso cargado se muestra como "40 kg", sin ceros finales.
- **AC-22 → FR-11:** en el modo Barra, con la Z, un peso de barra de 8,5 kg, 50 kg y los porcentajes 40, 70 y 90, si la persona pasa a otra app y vuelve sin que la app haya arrancado de cero, siguen el modo Barra, la Z con 8,5 kg, el peso de trabajo de 50 kg, los mismos porcentajes y las mismas series.
- **AC-23 → FR-03, FR-14:** con la olímpica de 20 kg y el 70 %:
  - escribir el peso de trabajo como "100,10" o como "100,1" da el mismo resultado: 70 kg (25 por lado), con la diferencia −0,07 kg (objetivo 70,07 kg);
  - escribir "100,120" o "1.000" muestra "El peso de trabajo admite como máximo dos decimales." y no muestra series.
- **AC-24 → FR-04:** al intentar añadir el porcentaje "40,0" o "40.0", la app muestra "Escribe un porcentaje entre 1 y 100." y no lo añade.
- **AC-25 → FR-12, FR-09:** con la olímpica de 20 kg y un peso de trabajo de 20 kg, igual a la barra, la app no muestra el aviso de que el peso de trabajo es inferior a la barra, y las series 40, 70 y 90 muestran "Solo la barra" con "El 40 % son 8 kg, menos que la barra (20 kg).", "El 70 % son 14 kg, menos que la barra (20 kg)." y "El 90 % son 18 kg, menos que la barra (20 kg).".
- **AC-26 → FR-06, FR-09:** frontera de FR-09 en el modo Barra, con la olímpica de 20 kg y el 50 %:
  - con 45 kg (objetivo 22,5 kg, igual a la barra más 2 × 1,25 kg), la app carga 22,5 kg (1,25 por lado), sin diferencia;
  - con 44,98 kg (objetivo 22,49 kg), la serie muestra "Solo la barra" y "El 50 % son 22,49 kg: faltan 0,01 kg para poner el disco más pequeño (1,25 kg) a cada lado.", sin diferencia;
  - con 40 kg (objetivo 20 kg, igual a la barra), muestra "Solo la barra" y "El 50 % son 20 kg: faltan 2,5 kg para poner el disco más pequeño (1,25 kg) a cada lado.".
- **AC-27 → FR-03:** al escribir el peso de trabajo:
  - con la olímpica de 20 kg y los porcentajes 40, 70 y 90, " 100 ", "100 ", "100," y "100." muestran las mismas series que AC-01, sin ningún mensaje de error;
  - en el modo Un punto y con el 50 %, ",5" y ".5" se aceptan como 0,5 kg, sin ningún mensaje de error: la serie muestra "Sin discos" y "El 50 % son 0,25 kg: faltan 1 kg para poner el disco más pequeño (1,25 kg).";
  - ",", ".", " , " o solo espacios no muestran series ni ningún mensaje de error, solo la indicación "Escribe el peso de trabajo.";
  - ",0" muestra "El peso de trabajo debe estar entre 0 y 500 kg.", ",123" muestra "El peso de trabajo admite como máximo dos decimales." y "10 0", "100,5," y "100,," muestran "Escribe el peso solo con cifras y, si hace falta, una coma decimal."; en ningún caso hay series.
- **AC-28 → FR-02:** las mismas reglas de escritura valen para el peso de barra:
  - con la Z, un peso de barra escrito como " 8,5 ", 50 kg y el 70 % da el resultado de AC-04;
  - con la recta, un peso de barra escrito como "7,", 60 kg y el 70 % (objetivo 42 kg), la app carga 42 kg (15 + 2,5 por lado), sin diferencia;
  - con la recta, un peso de barra escrito como ",5" (0,5 kg) muestra el mensaje de peso de barra no válido y no muestra series.
- **AC-29 → FR-04:** sin 40 en la lista, al añadir el porcentaje " 40 ", la app lo añade como 40 %, sin ningún mensaje de error. Al intentar añadir "40,", ",5" o "4 0", la app muestra "Escribe un porcentaje entre 1 y 100." y no lo añade.
- **AC-30 → FR-04:** al intentar añadir un porcentaje vacío o que solo tiene espacios, la lista no cambia y la app no muestra ningún mensaje.
- **AC-31 → FR-03, FR-04:** con la olímpica de 20 kg y los porcentajes 40, 70 y 90, un peso de trabajo de 100 rodeado de un tabulador, un espacio duro o un salto de línea muestra las mismas series que AC-01, sin ningún mensaje de error. Sin 40 en la lista, al añadir 40 con un tabulador o un espacio duro detrás, la app lo añade como 40 %, sin ningún mensaje de error.
- **AC-32 → FR-14:** con la olímpica de 20 kg y el 70 %, si la persona escribe el peso de trabajo como "102.5", el campo sigue mostrando "102.5" mientras la explicación de la diferencia muestra el objetivo como "71,75 kg". Lo mismo con " 100 ", "100," y ",5": el campo conserva exactamente lo escrito.
- **AC-33 → FR-11:** datos guardados que faltan, ilegibles o no válidos, al arrancar de cero:
  - si la lista guardada falta, no se puede leer o contiene un porcentaje no válido (por ejemplo, 150 o 40,5), la lista es 40, 70 y 90;
  - si la lista guardada es 90, 40 y 40, la lista es 40 y 90;
  - si el peso de trabajo guardado falta o no es válido (por ejemplo, "abc" o "600"), el peso de trabajo es "100";
  - si el peso guardado de la recta es 60 o no se puede leer, la recta pesa 10 kg, y la Z conserva su peso guardado;
  - si la opción de collarines guardada no se puede leer, los collarines están desactivados;
  - con la lista ilegible, un peso de trabajo guardado de "102,5" y los collarines activados, la lista es 40, 70 y 90 y se recuperan el peso "102,5" y los collarines activados.
- **AC-34 → FR-11, FR-02, FR-03:** solo se guarda un peso válido, al terminar de editarlo:
  - con el peso de trabajo guardado "100", si la persona escribe "105", sale del campo, después borra el campo, sale del campo, cierra la app y la vuelve a abrir, el peso de trabajo es "105";
  - si la persona escribe "100,12", sale del campo, después lo cambia a "100,123", sale del campo, cierra la app y la vuelve a abrir, el peso de trabajo es "100,12";
  - si la persona escribe 7,5 en el peso de la recta, sale del campo, después lo cambia a 0,5, sale del campo, cierra la app y la vuelve a abrir, la recta pesa 7,5 kg.
- **AC-35 → FR-08:** con la olímpica de 20 kg y 120 kg, el 100 % (50 kg por lado) muestra "Por lado" y "25 ×2". En el modo Un punto, con 100 kg y el 70 %, la serie muestra "Total en discos" y "25 ×2" y "20".
- **AC-36 → FR-15, FR-08:** con la olímpica de 20 kg, los collarines activados y 100 kg:
  - el 70 % (objetivo 70 kg) carga 70 kg con 20 + 2,5 por lado, muestra "+ collarín de 2,5 kg" y no tiene diferencia;
  - el 90 % (objetivo 90 kg) carga 90 kg con 25 + 5 + 2,5 por lado y "+ collarín de 2,5 kg".

  Con 105 kg y el 70 % (objetivo 73,5 kg), carga 72,5 kg (20 + 2,5 + 1,25 por lado y los collarines) y muestra la diferencia −1 kg.
- **AC-37 → FR-15, FR-09:** frontera con los collarines activados, la olímpica de 20 kg y el 50 %:
  - con 55 kg (objetivo 27,5 kg, igual a 20 + 2 × (1,25 + 2,5)), la app carga 27,5 kg (1,25 por lado y los collarines), sin diferencia;
  - con 54,98 kg (objetivo 27,49 kg), la serie muestra "Solo la barra", un total de 20 kg, sin "+ collarín de 2,5 kg", y "El 50 % son 27,49 kg: faltan 0,01 kg para poner el disco más pequeño (1,25 kg) y el collarín a cada lado.";
  - con 44 kg (objetivo 22 kg), muestra "El 50 % son 22 kg: faltan 5,5 kg para poner el disco más pequeño (1,25 kg) y el collarín a cada lado.".
- **AC-38 → FR-15:** con los collarines activados y 100 kg, en el modo Dos lados el 70 % carga 70 kg con 25 + 10 por lado y sin "+ collarín de 2,5 kg". Al volver al modo Barra con la olímpica de 20 kg, los collarines siguen activados y el 70 % carga 20 + 2,5 por lado con "+ collarín de 2,5 kg".
- **AC-39 → FR-16:** el aviso de capacidad aparece solo cuando los discos no caben:
  - en el modo Un punto, con 500 kg y el 100 % (20 discos de 25, 540 mm sobre 310), la serie muestra los 20 discos y "No caben en la manga: faltan 23 cm. Se dibujan los que caben.";
  - en el modo Un punto, con solo el de 20 kg habilitado, 300 kg y el 100 % (15 discos de 20, 337,5 mm, 27,5 mm de exceso), muestra "faltan 2,8 cm";
  - con la olímpica de 20 kg, 500 kg y el 90 % (25 ×8 + 15 por lado, 237 mm sobre 375), no muestra el aviso de capacidad.
- **AC-40 → FR-02:** con la recta de 7,5 kg y la Z de 8,5 kg guardadas, al elegir la recta el campo muestra "7,5" y al elegir la Z muestra "8,5". Si la persona escribe "0,5" con la recta (mensaje de error), elige la Z y vuelve a la recta, el campo muestra "7,5", sin mensaje de error. Lo mismo si, en lugar de elegir la Z, pasa al modo Dos lados y vuelve al modo Barra.
- **AC-41 → FR-12, FR-02:** con la Z y un peso de trabajo de 5 kg, con un peso de barra de 8,5 kg la app muestra el aviso de que el peso de trabajo es inferior a la barra; al cambiar el peso de barra a 0,5, ese aviso desaparece y solo queda el mensaje de peso de barra no válido.
- **AC-42 → FR-11, FR-02, FR-03:** borrar tecla a tecla no guarda los pasos intermedios:
  - con el peso de trabajo guardado "105", si la persona lo borra con la tecla de retroceso hasta vaciar el campo ("10", "1" y vacío), el peso de trabajo guardado sigue siendo "105" en cada paso; si después cierra la app y la vuelve a abrir, el peso de trabajo es "105";
  - con la recta guardada en 7,5 kg y elegida, si la persona borra su peso con la tecla de retroceso hasta vaciar el campo ("7,", "7" y vacío), cierra la app y la vuelve a abrir, la recta pesa 7,5 kg.
- **AC-43 → FR-11, FR-02:** la edición de un peso también termina al pasar a segundo plano y al cambiar de barra o de modo:
  - con el peso de trabajo guardado "100", si la persona escribe "105" y, sin salir del campo, pasa la app a segundo plano, se guarda "105": al volver, el campo sigue mostrando "105", y si cierra la app y la vuelve a abrir, el peso de trabajo es "105";
  - con el peso de trabajo guardado "105", si la persona borra el campo hasta vaciarlo y pasa la app a segundo plano, al volver el campo sigue vacío, con la indicación "Escribe el peso de trabajo.", y si cierra la app y la vuelve a abrir, el peso de trabajo es "105";
  - con la recta guardada en 7,5 kg y elegida, si la persona cambia su peso a 8 y elige la Z, la recta queda guardada en 8 kg: al volver a ella el campo muestra "8", y si cierra la app y la vuelve a abrir, la recta pesa 8 kg. Lo mismo si, en lugar de elegir la Z, pasa al modo Dos lados;
  - con la recta guardada en 7,5 kg y elegida, si la persona borra su peso hasta "7,", después hasta vaciar el campo y elige la Z, al volver a la recta el campo muestra "7,5", sin mensaje de error.

## 6. Casos límite, errores y decisiones pendientes

- **Casos límite y errores:**
  - objetivo por debajo de la barra, o que no llega al disco más pequeño (con o sin collarines): "Solo la barra" o "Sin discos", con la explicación de lo que falta (FR-09, FR-15);
  - peso de trabajo inferior a la barra: aviso general y series calculadas igualmente (FR-12);
  - porcentajes distintos que dan el mismo peso: se muestran todos (AC-09);
  - porcentaje repetido: no se añade, con mensaje (FR-04);
  - lista de porcentajes vacía: no se muestra ninguna serie, solo la indicación de añadir porcentajes (FR-13);
  - peso de trabajo vacío: estado neutro, sin series ni error (FR-03);
  - peso de barra vacío o no válido: mensaje bajo el campo y sin series (FR-02);
  - peso de trabajo no válido: mensaje y sin series (FR-03);
  - porcentaje no válido: mensaje y no se añade (FR-04);
  - lista guardada vacía: se recupera vacía; 40/70/90 solo la primera vez o si los datos faltan, no se pueden leer o no son válidos; una lista guardada desordenada o con repetidos se ordena y se quitan los repetidos (FR-11);
  - los pesos se guardan solo al terminar de editarlos (salir del campo, cambiar de barra o de modo, pasar a segundo plano), nunca con cada tecla; si en ese momento el campo está vacío o no es válido, no se guarda y se conserva el valor confirmado (FR-11, AC-34, AC-43);
  - borrar un peso tecla a tecla no guarda los pasos intermedios (FR-11, AC-42);
  - pasar a segundo plano a mitad de una edición guarda el valor válido de ese momento, aunque sea un paso intermedio (FR-11);
  - cada dato guardado se recupera por separado (FR-11, AC-33);
  - tipos de disco habilitados guardados y fallo al guardar: los cubren SPEC-CALC-002 FR-08 y FR-09 (FR-11);
  - vuelta de segundo plano: se conserva todo el estado, incluidos los tipos de disco habilitados (SPEC-CALC-002 FR-08); FR-11 solo se aplica al arranque de cero (AC-22), y si iOS cerró la app en segundo plano, la vuelta es un arranque de cero (FR-11);
  - pesos o porcentajes con espacios al principio o al final, y pesos con un separador al final o al principio sin cifras ("100,", ",5"): se aceptan, y un peso que solo tiene espacios o el separador se trata como vacío; un peso con más de un separador o que vale 0 se sigue rechazando, también como paso intermedio (FR-03, FR-04);
  - al escribir un peso de barra, los pasos intermedios por debajo de 1 kg o el campo vacío muestran el mensaje de peso de barra no válido, y mientras tanto no se muestra el aviso de FR-12 (FR-02, FR-12, AC-41);
  - peso de barra al cambiar de barra o de modo: uno válido se confirma y se guarda; uno vacío o no válido se descarta y la barra conserva su peso confirmado (FR-02, AC-40, AC-43);
  - discos que no caben sin dibujo 3D: el aviso de capacidad omite "Se dibujan los que caben." (FR-16);
  - porcentaje vacío o solo con espacios: no se añade y no hay mensaje (FR-04);
  - lo tecleado en un campo no se reescribe nunca; el formato de FR-14 solo afecta a lo que la app muestra. Al elegir la recta o la Z, el campo muestra el peso confirmado de esa barra (FR-02, FR-14);
  - pesos con más de dos cifras tras el separador o con separador de miles, y porcentajes con separador decimal: se rechazan con mensaje (FR-03, FR-04);
  - objetivo con más de dos decimales: se redondea con la mitad hacia arriba antes de calcular la carga (FR-05);
  - collarines en los modos de máquina: sin efecto, y la opción se conserva (FR-15);
  - discos que no caben en la manga: el cálculo no cambia y se avisa del exceso (FR-16);
  - formato de números: entrada con coma o punto, presentación con coma decimal, hasta dos decimales y sin ceros finales (FR-14).
- **Decisiones pendientes:** ninguna crítica. El peso real de la recta y de la Z no hace falta para la spec, porque lo introduce la persona.

---

## 10. Requisitos no funcionales

- **NFR-01:** la app funciona completamente sin conexión después de la primera carga en el iPhone.
- **NFR-02:** la app no envía ningún dato introducido por la persona. Las únicas peticiones de red son a su propio origen, para descargar o actualizar la app.

## 11. Dependencias y restricciones

- Solo iPhone (iOS). Sin Mac y sin publicar en la App Store. La tecnología la fija ADR-0001: una PWA sin framework, instalable en la pantalla de inicio y publicada en GitHub Pages, que encaja con NFR-01.
- Tipos de disco del gimnasio de Víctor, fijos: 25, 20, 15, 10, 5, 2,5 y 1,25 kg. Cuáles están disponibles lo decide la persona (SPEC-CALC-002).
- Qué se guarda en el dispositivo y dónde lo fijan ADR-0002, que modifica ADR-0001 §3.2, ADR-0004, que amplía ADR-0002 con el peso de trabajo, los pesos de la recta y de la Z y la opción de collarines (FR-11), y ADR-0005, que modifica ADR-0004 para que los pesos se escriban al terminar de editarlos. Esta versión no se fusiona antes que ADR-0005.
- La presentación (estructura de la pantalla, dibujo de la carga, movimiento y accesibilidad) la fija SPEC-CALC-003, que coloca los textos de esta spec sin cambiarlos.
