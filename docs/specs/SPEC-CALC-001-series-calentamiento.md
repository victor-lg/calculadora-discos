---
id: SPEC-CALC-001
titulo: Series de calentamiento con cálculo de discos
estado: en-revision
version: 0.1
riesgo: R1
sustituye: null
adr: []
transversales: []
---

<!--
Redactada con sdd-spec a partir de discovery/notas-descubrimiento.md
(rondas 1–4, 2026-10-20). Todas las reglas de negocio las decidió Víctor;
las que eran propuesta de Claude y él aceptó están marcadas en las notas.
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

Víctor, único usuario, en su iPhone. No hay servidor ni otros sistemas.

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

  El peso introducido cumple las mismas reglas de formato que el peso de trabajo (FR-03).
- **FR-03:** el peso de trabajo es mayor que 0 y como máximo 500 kg, con hasta dos decimales. Si un dato no es válido, la app indica cuál y por qué, y no muestra series.
- **FR-04:** los porcentajes de calentamiento forman una lista:
  - la persona puede añadir y quitar porcentajes en cualquier momento;
  - cada uno es un número entero del 1 al 99;
  - se muestran en el orden en que la persona los introduce, sin reordenar.
- **FR-05:** para cada porcentaje, el peso objetivo es el peso de trabajo × porcentaje / 100. En el modo Barra, ese objetivo incluye la barra.
- **FR-06:** el peso cargado es el mayor peso cargable que no supera el objetivo:
  - **modos Barra y Dos lados:** el peso de cada lado se redondea hacia abajo a un múltiplo de 1,25 kg;
  - **modo Un punto:** el peso total de discos se redondea hacia abajo a un múltiplo de 1,25 kg.

  Si el peso cargado no coincide con el objetivo, la serie muestra el objetivo y la diferencia.
- **FR-07:** los discos se eligen entre 25, 20, 15, 10, 5, 2,5 y 1,25 kg, con existencias ilimitadas. Se toman de mayor a menor, tantos de cada uno como quepan, y se muestran en ese orden.
- **FR-08:** cada serie muestra:
  - el porcentaje;
  - el peso total cargado;
  - los discos: por lado en los modos Barra y Dos lados, y en el único punto en el modo Un punto;
  - el peso de discos por lado, sin barra (en el modo Un punto, el peso total de discos);
  - el aviso de redondeo, cuando lo hay.
- **FR-09:** cuando el objetivo no alcanza para cargar el disco más pequeño (1,25 kg), la serie muestra el objetivo que salía y además:
  - en el modo Barra, "Solo barra (X kg) · 0 kg por lado";
  - en el modo Dos lados, "Peso por lado demasiado pequeño: el disco mínimo es de 1,25 kg";
  - en el modo Un punto, "Peso demasiado pequeño: el disco mínimo es de 1,25 kg".
- **FR-10:** cualquier cambio de modo, barra, peso o porcentajes recalcula las series al momento, sin un botón de calcular.
- **FR-11:** la lista de porcentajes se guarda en el dispositivo y se recupera al volver a abrir la app. La primera vez es 40 %, 70 % y 90 %. El modo, la barra, el peso de la barra y el peso de trabajo no se guardan: al abrir, el modo es Barra con la barra de 20 kg y el peso de trabajo está vacío.
- **FR-12:** en el modo Barra, si el peso de trabajo es menor que el peso de la barra elegida, la app muestra un aviso general: el peso de trabajo es inferior a la barra, conviene elegir una barra más ligera o revisar el peso. Las series se calculan igualmente según FR-09.

## 5. Criterios de aceptación

- **AC-01 → FR-05, FR-07, FR-08:** dado el modo Barra con la barra de 20 kg, un peso de trabajo de 100 kg y los porcentajes 40, 70 y 90, la app muestra estas tres series, sin aviso de redondeo:

  | Porcentaje | Peso cargado | Discos por lado | Peso por lado |
  | --- | --- | --- | --- |
  | 40 % | 40 kg | 10 | 10 kg |
  | 70 % | 70 kg | 25 | 25 kg |
  | 90 % | 90 kg | 25 + 10 | 35 kg |
- **AC-02 → FR-06:** con la barra de 20 kg, 105 kg y el 70 % (objetivo 73,5 kg), la app carga 72,5 kg (25 + 1,25 por lado) y avisa: objetivo 73,5 kg, diferencia −1 kg.
- **AC-03 → FR-09:** con la barra de 20 kg, 40 kg y el 40 % (objetivo 16 kg), la serie muestra "Solo barra (20 kg) · 0 kg por lado" y que el objetivo era 16 kg. Con 50 kg y el 42 % (objetivo 21 kg, que no llega a 1,25 kg por lado), muestra lo mismo con objetivo 21 kg.
- **AC-04 → FR-02:** con la barra Z y un peso de barra de 8,5 kg, 50 kg y el 70 % (objetivo 35 kg), la app carga 33,5 kg (10 + 2,5 por lado, 12,5 kg por lado) y avisa de la diferencia de −1,5 kg. Las barras de 20 y 15 kg no permiten cambiar su peso, y el catálogo no permite añadir ni quitar barras.
- **AC-05 → FR-01, FR-08:** en el modo Dos lados, con 100 kg y el 70 %, la serie muestra 70 kg en total, 25 + 10 por lado y 35 kg por lado.
- **AC-06 → FR-01, FR-06:** en el modo Un punto, con 60 kg y el 70 % (objetivo 42 kg), la serie muestra 41,25 kg con 25 + 15 + 1,25 en el único punto, y avisa de la diferencia de −0,75 kg.
- **AC-07 → FR-09:** en el modo Dos lados, con 10 kg y el 10 % (objetivo 1 kg, 0,5 kg por lado), la serie indica que el peso por lado es demasiado pequeño y que el disco mínimo es de 1,25 kg, y que el objetivo era 1 kg. En el modo Un punto, con 10 kg y el 10 %, indica que el peso es demasiado pequeño, con el mismo mínimo y el mismo objetivo.
- **AC-08 → FR-03:** cada uno de estos datos muestra un mensaje que dice qué falla y deja de mostrar series:
  - un peso de trabajo de 0, de 500,01 o de 100,123;
  - con la barra Z, un peso de barra vacío.
- **AC-09 → FR-04:** la lista respeta los límites, el orden y los duplicados:
  - no se pueden añadir los porcentajes 0, 100 ni 40,5;
  - si la persona introduce 90 y después 40, se muestran en ese orden;
  - con la barra de 20 kg, 100 kg y los porcentajes 85 y 87, se muestran las dos series aunque ambas carguen 85 kg (la del 87 % con aviso de redondeo).
- **AC-10 → FR-10:** al cambiar el peso de trabajo, añadir o quitar un porcentaje, o cambiar de modo o de barra, las series se actualizan sin ninguna otra acción.
- **AC-11 → FR-11:** la primera vez que se abre, la lista es 40, 70 y 90. Si la persona la cambia a 50 y 75, cierra la app y la vuelve a abrir, la lista es 50 y 75. El modo es Barra, la barra es la de 20 kg y el peso de trabajo está vacío.
- **AC-12 → NFR-01:** con la app ya instalada en el iPhone y el teléfono en modo avión, la app se abre y reproduce el resultado de AC-01.
- **AC-13 → NFR-02:** durante un uso completo (abrir, calcular, cambiar porcentajes y cerrar), la app no hace ninguna petición de red después de la primera carga.
- **AC-14 → FR-12:** con la barra de 20 kg y un peso de trabajo de 15 kg, la app muestra el aviso de que el peso de trabajo es inferior a la barra, y las series 40, 70 y 90 aparecen como "Solo barra (20 kg) · 0 kg por lado" con sus objetivos (6, 10,5 y 13,5 kg).

## 6. Casos límite, errores y decisiones pendientes

- **Casos límite y errores:**
  - objetivo por debajo de la barra, o que no llega al disco más pequeño: "Solo barra" o aviso de peso demasiado pequeño (FR-09);
  - peso de trabajo inferior a la barra: aviso general y series calculadas igualmente (FR-12);
  - porcentajes que dan el mismo peso: se muestran todos (AC-09);
  - lista de porcentajes vacía: no se muestra ninguna serie, solo la indicación de añadir porcentajes;
  - datos no válidos: mensaje y sin series (FR-03);
  - formato de números en español, con coma decimal y hasta dos decimales.
- **Decisiones pendientes:** ninguna. El peso real de la barra recta pequeña y de la Z no hace falta para la spec, porque se introduce en cada uso.

---

## 10. Requisitos no funcionales

- **NFR-01:** la app funciona completamente sin conexión después de la primera carga en el iPhone.
- **NFR-02:** la app no envía datos fuera del dispositivo: no tiene servidor, ni cuentas, ni analítica.

## 11. Dependencias y restricciones

- Solo iPhone (iOS). Sin Mac y sin publicar en la App Store: la tecnología la decidirá un ADR técnico. La candidata es una PWA instalable, que encaja con NFR-01.
- Juego de discos del gimnasio de Víctor, fijo: 25, 20, 15, 10, 5, 2,5 y 1,25 kg.
