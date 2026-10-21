---
id: SPEC-CALC-001
titulo: Series de calentamiento con cálculo de discos
estado: en-revision
version: 0.3
riesgo: R1
sustituye: null
adr: [ADR-0001]
transversales: []
---

<!--
Redactada con sdd-spec a partir de discovery/notas-descubrimiento.md
(rondas 1–4, revisión del borrador y cierre, 2026-10-20). Todas las reglas
de negocio las decidió Víctor; las que eran propuesta de Claude y él aceptó
están marcadas en las notas. La versión 0.2 incorpora sus decisiones sobre las
rondas 1, 2 y 3 de la revisión G4 (2026-10-21), registradas en el PR #2. La
versión 0.3 enlaza ADR-0001 sin cambiar el comportamiento.
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
  - que los porcentajes se recuerden;
  - el funcionamiento sin conexión.
- **Excluye** (cada uno, si llega, será otra spec):
  - máquinas de placas y poleas;
  - mancuernas;
  - libras;
  - inventario limitado de discos;
  - repeticiones;
  - la serie de trabajo (100 %);
  - los cierres;
  - varios usuarios, cuentas o sincronización entre dispositivos.

## 3. Actores

Víctor, único usuario, en su iPhone. Ningún otro sistema recibe datos: la app solo se descarga y actualiza desde su propio origen (NFR-02).

## 4. Requisitos funcionales

- **FR-01:** la persona elige uno de tres modos de carga:
  - **Barra:** discos repartidos a los dos lados de una barra.
  - **Dos lados sin barra:** discos repartidos en dos lados, por ejemplo una prensa o una máquina de palanca. El peso propio de la máquina no cuenta.
  - **Un punto:** todos los discos en un único punto, por ejemplo un remo en T.
- **FR-02:** en el modo Barra, la persona elige una barra de un catálogo fijo, que no puede ampliar ni reducir:
  - 20 kg, con peso fijo;
  - 15 kg, con peso fijo;
  - recta pequeña, con el peso que introduce la persona;
  - barra Z, con el peso que introduce la persona.

  El peso de la barra Z y el de la recta pequeña cumplen las mismas reglas que el peso de trabajo (FR-03): rango, decimales, campo vacío como estado neutro y mensaje si el valor escrito no es válido.
- **FR-03:** el peso de trabajo es mayor que 0 y como máximo 500 kg, con hasta dos decimales.
  - Se escribe solo con cifras y, si lleva decimales, un separador decimal (coma o punto) seguido como mucho de dos cifras escritas. No se admite separador de miles. Por ejemplo, "100,10" vale (equivale a 100,1); "100,120" y "1.000" se rechazan.
  - Mientras el campo está vacío, la app no muestra series ni ningún error: muestra una indicación para rellenarlo.
  - Si el valor escrito no es válido, la app indica cuál y por qué, y no muestra series.
- **FR-04:** los porcentajes de calentamiento forman una lista:
  - la persona puede añadir y quitar porcentajes en cualquier momento;
  - cada uno es un número entero del 1 al 99, escrito solo con cifras: "40,0" se rechaza;
  - se muestran en el orden en que la persona los introduce, sin reordenar;
  - se puede repetir un porcentaje: cada repetición es una serie más y se muestran todas;
  - si la persona intenta añadir un porcentaje no válido, la app muestra un mensaje que dice qué falla y no lo añade.
- **FR-05:** para cada porcentaje, el peso objetivo es el peso de trabajo × porcentaje / 100, redondeado a dos decimales con la mitad hacia arriba. Ese objetivo redondeado es el que se usa en todo lo demás: el cálculo de la carga, el aviso de redondeo, la diferencia y lo que se muestra. En el modo Barra, el objetivo incluye la barra.
- **FR-06:** el peso cargado es el mayor peso cargable que no supera el objetivo:
  - **modos Barra y Dos lados:** el peso de cada lado se redondea hacia abajo a un múltiplo de 1,25 kg;
  - **modo Un punto:** el peso total de discos se redondea hacia abajo a un múltiplo de 1,25 kg.

  Si el peso cargado no coincide con el objetivo, la serie muestra un aviso de redondeo con el objetivo y la diferencia.
- **FR-07:** los discos se eligen entre 25, 20, 15, 10, 5, 2,5 y 1,25 kg, con existencias ilimitadas. Se toman de mayor a menor, tantos de cada uno como quepan, y se muestran en ese orden.
- **FR-08:** cada serie muestra:
  - el porcentaje;
  - el peso total cargado;
  - los discos: por lado en los modos Barra y Dos lados, y en el único punto en el modo Un punto;
  - el peso de discos por lado, sin barra (en el modo Un punto, el peso total de discos);
  - el aviso de redondeo, cuando lo hay.

  Los casos de FR-09 son la excepción.
- **FR-09:** excepción explícita a FR-06 y FR-08. Cuando el objetivo no alcanza para cargar el disco más pequeño (1,25 kg), la serie muestra el objetivo que salía, sin cifra de diferencia ni aviso de redondeo, y además:
  - en el modo Barra (el objetivo es menor que la barra más 2 × 1,25 kg, incluido un objetivo por debajo de la barra), "Solo barra (X kg) · 0 kg por lado";
  - en el modo Dos lados (el objetivo por lado es menor de 1,25 kg), "Peso por lado demasiado pequeño: el disco mínimo es de 1,25 kg";
  - en el modo Un punto (el objetivo es menor de 1,25 kg), "Peso demasiado pequeño: el disco mínimo es de 1,25 kg".

  En los modos Dos lados y Un punto, la serie no muestra peso total.
- **FR-10:** cualquier cambio de modo, barra, peso o porcentajes recalcula las series al momento, sin un botón de calcular.
- **FR-11:** la lista de porcentajes se guarda en el dispositivo y se recupera cuando la app arranca de cero. Al arrancar de cero se recupera la lista guardada, aunque esté vacía. La lista 40 %, 70 % y 90 % se usa solo la primera vez o si los datos guardados faltan o no se pueden leer. Los datos guardados que se leen pero no son válidos (por ejemplo, una lista con un porcentaje que no cumple FR-04) se tratan igual que los que no se pueden leer. El modo, la barra, el peso de la barra y el peso de trabajo no se guardan: al arrancar de cero, el modo es Barra con la barra de 20 kg y el peso de trabajo está vacío, con la indicación de rellenarlo y sin error (FR-03).

  Esta regla se aplica solo al arranque de cero. Cuando la app vuelve de segundo plano sin haberse cerrado, conserva todo su estado: modo, barra, peso de la barra, peso de trabajo y porcentajes. Si iOS la cerró mientras estaba en segundo plano, la vuelta es un arranque de cero (ADR-0001).
- **FR-12:** en el modo Barra, si el peso de trabajo es menor que el peso de la barra elegida, la app muestra un aviso general: el peso de trabajo es inferior a la barra, conviene elegir una barra más ligera o revisar el peso. Las series se calculan igualmente según FR-09.
- **FR-13:** cuando la lista de porcentajes está vacía, la app no muestra ninguna serie y muestra una indicación para añadir porcentajes.
- **FR-14:** formato de los números:
  - al escribir un peso, la app acepta como separador decimal tanto la coma como el punto, con como mucho dos cifras escritas tras él y sin separador de miles (FR-03);
  - los pesos, el objetivo y la diferencia se muestran con coma decimal, como máximo dos decimales y sin ceros finales (por ejemplo, "73,5" y "40", nunca "73,50" ni "40,00").

## 5. Criterios de aceptación

- **AC-01 → FR-05, FR-07, FR-08:** dado el modo Barra con la barra de 20 kg, un peso de trabajo de 100 kg y los porcentajes 40, 70 y 90, la app muestra estas tres series, sin aviso de redondeo:

  | Porcentaje | Peso cargado | Discos por lado | Peso por lado |
  | --- | --- | --- | --- |
  | 40 % | 40 kg | 10 | 10 kg |
  | 70 % | 70 kg | 25 | 25 kg |
  | 90 % | 90 kg | 25 + 10 | 35 kg |
- **AC-02 → FR-06:** con la barra de 20 kg, 105 kg y el 70 % (objetivo 73,5 kg), la app carga 72,5 kg (25 + 1,25 por lado) y avisa: objetivo 73,5 kg, diferencia −1 kg.
- **AC-03 → FR-09:** con la barra de 20 kg, 40 kg y el 40 % (objetivo 16 kg), la serie muestra "Solo barra (20 kg) · 0 kg por lado" y que el objetivo era 16 kg, sin cifra de diferencia. Con 50 kg y el 42 % (objetivo 21 kg, que no llega a 1,25 kg por lado), muestra lo mismo con objetivo 21 kg.
- **AC-04 → FR-02:** con la barra Z y un peso de barra de 8,5 kg, 50 kg y el 70 % (objetivo 35 kg), la app carga 33,5 kg (10 + 2,5 por lado, 12,5 kg por lado) y avisa de la diferencia de −1,5 kg. Las barras de 20 y 15 kg no permiten cambiar su peso, y el catálogo no permite añadir ni quitar barras.
- **AC-05 → FR-01, FR-08:** en el modo Dos lados, con 100 kg y el 70 %, la serie muestra 70 kg en total, 25 + 10 por lado y 35 kg por lado.
- **AC-06 → FR-01, FR-06:** en el modo Un punto, con 60 kg y el 70 % (objetivo 42 kg), la serie muestra 41,25 kg con 25 + 15 + 1,25 en el único punto, y avisa de la diferencia de −0,75 kg.
- **AC-07 → FR-09:** en el modo Dos lados, con 10 kg y el 10 % (objetivo 1 kg, 0,5 kg por lado), la serie indica que el peso por lado es demasiado pequeño y que el disco mínimo es de 1,25 kg, y que el objetivo era 1 kg. En el modo Un punto, con 10 kg y el 10 %, indica que el peso es demasiado pequeño, con el mismo mínimo y el mismo objetivo. En ambos casos la serie no muestra peso total ni cifra de diferencia.
- **AC-08 → FR-03:** el peso de trabajo vacío y el no válido se tratan de forma distinta:
  - con un peso de trabajo de 0, de 500,01 o de 100,123, la app muestra un mensaje que dice qué falla y no muestra series;
  - con un peso de trabajo de 500 o de 0,01, la app acepta el valor y muestra las series, sin ningún mensaje de error;
  - si la persona borra el peso de trabajo, la app no muestra series ni ningún mensaje de error, solo la indicación de rellenarlo.
- **AC-09 → FR-04:** la lista respeta los límites, el orden y los duplicados:
  - al intentar añadir los porcentajes 0, 100 o 40,5, la app muestra un mensaje que dice qué falla y no los añade;
  - los porcentajes 1 y 99 se añaden a la lista sin ningún mensaje de error;
  - si la persona introduce 90 y después 40, se muestran en ese orden;
  - con la barra de 20 kg, 100 kg y los porcentajes 70 y 70, se muestran dos series iguales del 70 % (70 kg, 25 por lado);
  - con la barra de 20 kg, 100 kg y los porcentajes 85 y 87, se muestran las dos series aunque ambas carguen 85 kg (la del 87 % con aviso de redondeo).
- **AC-10 → FR-10:** al cambiar el peso de trabajo, añadir o quitar un porcentaje, o cambiar de modo o de barra, las series se actualizan sin ninguna otra acción.
- **AC-11 → FR-11:** la primera vez que se abre, la lista es 40, 70 y 90. Si la persona la cambia a 50 y 75, cierra la app y la vuelve a abrir (arranque de cero), la lista es 50 y 75. Si la persona quita todos los porcentajes, cierra la app y la vuelve a abrir, la lista sigue vacía. Si los datos guardados faltan, no se pueden leer o contienen un porcentaje no válido (por ejemplo, 150), la lista es 40, 70 y 90. En todos los casos, al arrancar de cero, el modo es Barra, la barra es la de 20 kg y el peso de trabajo está vacío, con la indicación de rellenarlo y sin ningún mensaje de error.
- **AC-12 → NFR-01:** con la app ya instalada en el iPhone y el teléfono en modo avión, la app se abre y reproduce el resultado de AC-01.
- **AC-13 → NFR-02:** durante un uso completo, incluida la primera carga (abrir, calcular, cambiar porcentajes y cerrar), todas las peticiones de red van al propio origen de la app, y ninguna contiene datos que haya introducido la persona: pesos, porcentajes, modo o barra.
- **AC-14 → FR-12:** con la barra de 20 kg y un peso de trabajo de 15 kg, la app muestra el aviso de que el peso de trabajo es inferior a la barra, y las series 40, 70 y 90 aparecen como "Solo barra (20 kg) · 0 kg por lado" con sus objetivos (6, 10,5 y 13,5 kg).
- **AC-15 → FR-13:** si la persona quita todos los porcentajes, con la barra de 20 kg y 100 kg, la app no muestra ninguna serie y muestra la indicación de añadir porcentajes.
- **AC-16 → FR-05, FR-06:** con la barra de 20 kg, 101,11 kg y el 70 % (70,777 kg, que se redondea a un objetivo de 70,78 kg), la app carga 70 kg (25 por lado) y avisa: objetivo 70,78 kg, diferencia −0,78 kg.
- **AC-17 → FR-05, FR-06:** con la barra de 20 kg, 100,01 kg y el 40 % (40,004 kg, que se redondea a un objetivo de 40 kg), la app carga 40 kg (10 por lado) sin aviso de redondeo, porque el peso cargado coincide con el objetivo.
- **AC-18 → FR-14:** con la barra de 20 kg y el 70 %, escribir el peso de trabajo como "102,5" o como "102.5" da el mismo resultado: 70 kg (25 por lado), con aviso de objetivo 71,75 kg y diferencia −1,75 kg.
- **AC-19 → FR-02:** con la barra Z o con la recta pequeña:
  - un peso de barra de 0, de 500,01, de 100,123, de "100,120" o de "1.000" muestra un mensaje que dice qué falla y no muestra series;
  - un peso de barra de 500 o de 0,01 se acepta: la app muestra las series, sin ningún mensaje de error sobre el peso de barra;
  - un peso de barra vacío no muestra series ni ningún mensaje de error, solo la indicación de rellenarlo;
  - con la recta pequeña, un peso de barra escrito como "7,5", 60 kg y el 70 % (objetivo 42 kg), la app carga 40 kg (15 + 1,25 por lado, 16,25 kg por lado) y avisa de la diferencia de −2 kg.
- **AC-20 → FR-05, FR-06:** en el modo Un punto, con 2,51 kg y el 50 % (1,255 kg, que se redondea con la mitad hacia arriba a un objetivo de 1,26 kg), la app carga 1,25 kg (un disco de 1,25) y avisa: objetivo 1,26 kg, diferencia −0,01 kg.
- **AC-21 → FR-05, FR-06, FR-14:** con la barra de 20 kg, 99,99 kg y el 40 % (39,996 kg, que se redondea a un objetivo de 40 kg), la app carga 40 kg (10 por lado) sin aviso de redondeo. El peso cargado se muestra como "40 kg", sin ceros finales.
- **AC-22 → FR-11:** en el modo Barra, con la barra Z, un peso de barra de 8,5 kg, 50 kg y los porcentajes 40, 70 y 90, si la persona pasa a otra app y vuelve sin que la app haya arrancado de cero, siguen el modo Barra, la barra Z con 8,5 kg, el peso de trabajo de 50 kg, los mismos porcentajes y las mismas series.
- **AC-23 → FR-03, FR-14:** con la barra de 20 kg y el 70 %:
  - escribir el peso de trabajo como "100,10" o como "100,1" da el mismo resultado: 70 kg (25 por lado), con aviso de objetivo 70,07 kg y diferencia −0,07 kg;
  - escribir "100,120" o "1.000" muestra un mensaje que dice qué falla y no muestra series.
- **AC-24 → FR-04:** al intentar añadir el porcentaje "40,0" o "40.0", la app muestra un mensaje que dice qué falla y no lo añade.
- **AC-25 → FR-12, FR-09:** con la barra de 20 kg y un peso de trabajo de 20 kg, igual a la barra, la app no muestra el aviso de que el peso de trabajo es inferior a la barra, y las series 40, 70 y 90 aparecen como "Solo barra (20 kg) · 0 kg por lado" con sus objetivos (8, 14 y 18 kg).
- **AC-26 → FR-06, FR-09:** frontera de FR-09 en el modo Barra, con la barra de 20 kg y el 50 %:
  - con 45 kg (objetivo 22,5 kg, igual a la barra más 2 × 1,25 kg), la app carga 22,5 kg (1,25 por lado, 1,25 kg por lado), sin aviso de redondeo;
  - con 44,98 kg (objetivo 22,49 kg), la serie muestra "Solo barra (20 kg) · 0 kg por lado" y que el objetivo era 22,49 kg, sin cifra de diferencia.

## 6. Casos límite, errores y decisiones pendientes

- **Casos límite y errores:**
  - objetivo por debajo de la barra, o que no llega al disco más pequeño: "Solo barra" o aviso de peso demasiado pequeño (FR-09);
  - peso de trabajo inferior a la barra: aviso general y series calculadas igualmente (FR-12);
  - porcentajes que dan el mismo peso: se muestran todos (AC-09);
  - lista de porcentajes vacía: no se muestra ninguna serie, solo la indicación de añadir porcentajes (FR-13);
  - campo de peso vacío: estado neutro, sin series ni error (FR-03, FR-02);
  - datos no válidos: mensaje y sin series (FR-03, FR-02);
  - porcentaje no válido: mensaje y no se añade (FR-04);
  - lista guardada vacía: se recupera vacía; 40/70/90 solo la primera vez o si los datos faltan, no se pueden leer o no son válidos (FR-11);
  - vuelta de segundo plano: se conserva todo el estado; FR-11 solo se aplica al arranque de cero (AC-22);
  - pesos con más de dos cifras tras el separador o con separador de miles, y porcentajes con separador decimal: se rechazan con mensaje (FR-03, FR-04);
  - objetivo con más de dos decimales: se redondea con la mitad hacia arriba antes de calcular la carga (FR-05);
  - formato de números: entrada con coma o punto, presentación con coma decimal, hasta dos decimales y sin ceros finales (FR-14).
- **Decisiones pendientes:** ninguna. El peso real de la barra recta pequeña y de la Z no hace falta para la spec, porque se introduce en cada uso.

---

## 10. Requisitos no funcionales

- **NFR-01:** la app funciona completamente sin conexión después de la primera carga en el iPhone.
- **NFR-02:** la app no envía ningún dato introducido por la persona. Las únicas peticiones de red son a su propio origen, para descargar o actualizar la app.

## 11. Dependencias y restricciones

- Solo iPhone (iOS). Sin Mac y sin publicar en la App Store. La tecnología la fija ADR-0001: una PWA sin framework, instalable en la pantalla de inicio y publicada en GitHub Pages, que encaja con NFR-01.
- Juego de discos del gimnasio de Víctor, fijo: 25, 20, 15, 10, 5, 2,5 y 1,25 kg.
