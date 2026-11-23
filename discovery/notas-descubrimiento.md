# Descubrimiento: calculadora de discos para series de calentamiento

**Fase:** F1 (descubrimiento), primer recorrido del workflow SDD + IA. **Cerrada el 2026-10-20 → borrador de `docs/specs/SPEC-CALC-001-series-calentamiento.md`.**
**Issue de Linear:** pendiente; Linear aún no está configurado. Cuando exista, el fichero se renombra a `discovery/<ID>-notas.md` en el repo `calculadora-discos`.
**Inicio:** 2026-10-20, desde la app móvil de Claude.

Estas notas son contexto, no norma (AGENTS.md). Lo que acabe en la spec lo aprueba Víctor con un PR.

## Confirmado

- **Idea original (Q06, 2026-10-19):** una app que, a partir de un porcentaje, de los discos disponibles y del peso total, calcula cuántos discos cargar para hacer series aproximadas de calentamiento.
- **Plataforma:** el uso es en iPhone (iOS).
- **Distribución:** no hay Mac y no se publicará en la App Store.
- **Usuarios:** solo Víctor. No hay más usuarios.
- **Entrada:** Víctor introduce el peso de la serie de trabajo y los porcentajes de calentamiento que quiere.
- **Peso de trabajo:** admite hasta dos decimales; máximo 500 kg.
- **Esquema habitual:** 3 series al 40 %, 70 % y 90 %.
- **Series variables:** quiere poder añadir o quitar series de aproximación en el momento, sobre la marcha.
- **Porcentajes:**
  - estrictamente entre el 0 % y el 100 % (ninguno de los dos extremos);
  - se muestran en el orden en que los introduce la persona, sin reordenar;
  - si dos dan el mismo peso tras redondear, se muestran los dos.
- **Modos de carga, los tres en la primera versión:**
  - **Barra:** total = barra + 2 × lado.
  - **Dos lados sin barra:** prensa o máquinas de palanca; el peso propio de la máquina no cuenta.
  - **Un punto:** remo en T o *landmine*; los discos no se reparten.
- **Barras:** un catálogo fijo, definido en el diseño. La persona no añade ni quita barras.
  - 20 kg y 15 kg, con su peso fijo.
  - Recta pequeña (curl de bíceps) y barra Z: la persona introduce su peso en cada uso, porque la barra no se recuerda.
  - Todas usan los mismos discos.
- **Unidades:** solo kg.
- **Discos del gimnasio:** 25, 20, 15, 10, 5, 2,5 y 1,25 kg, con pares de sobra.
- **Sin inventario:** se suponen discos ilimitados de cada peso; no hay pantalla de existencias.
- **Salto mínimo de 2,5 kg** en el peso cargado con barra (1,25 kg por lado).
- **Carga simétrica:** la app indica los discos de cada lado.
- **Porcentajes sobre el peso total, barra incluida.**
- **Qué se ve en cada serie:**
  - el porcentaje;
  - el peso total cargado;
  - los discos por lado;
  - el peso por lado sin barra;
  - el aviso de redondeo, si lo hay.
- **Redondeo:** hacia abajo, y la app indica que ha redondeado.
- **Cierres:** no cuentan en el peso.
- **Repeticiones:** la app no las sugiere ni las muestra. No muestra la serie de trabajo (100 %).
- **Por debajo de la barra:** "solo barra", indicando el valor que salía (por ejemplo, "Solo barra (20 kg); el 40 % eran 16 kg").
- **Sin conexión:** debe funcionar 100 % offline.
- **Memoria:** guarda los porcentajes entre usos. No guarda la barra ni el peso de trabajo. *(Cambia lo dicho en la ronda 2, donde no se recordaba nada.)*
- **Fuera de la primera versión:** máquinas de placas y poleas, y mancuernas fijas, para una funcionalidad futura. No hay mancuernas cargables con discos.

## Decisiones de la revisión del borrador (2026-10-20)

- **Peso de trabajo inferior a la barra:** no es un error. Las series salen igualmente ("Solo barra · 0 kg por lado") y un aviso general sugiere elegir una barra más ligera o revisar el peso. *(Propuesta de Claude a petición de Víctor; confirmada: aviso genérico, sin recomendar una barra concreta.)*
- **Objetivo menor que el disco más pequeño, en los modos sin barra:** mensaje "Peso (por lado) demasiado pequeño: el disco mínimo es de 1,25 kg", con el objetivo que salía. *(Decisión de Víctor.)*
- **Al abrir:** modo Barra, barra de 20 kg y peso de trabajo vacío: sí.
- **Lista de porcentajes vacía:** no se muestra ninguna serie, solo la indicación de añadir porcentajes: sí.
- **Porcentajes:** enteros del 1 al 99: sí.
- **Catálogo de barras:** exactamente cuatro (20 kg, 15 kg, recta pequeña y Z), de momento.
- **Formato de números:** coma decimal, hasta dos decimales.

## Propuesto (no entra en la spec)

- Tecnología: una PWA instalable en el iPhone es la candidata natural, por no haber Mac ni App Store, y encaja con el requisito de funcionar 100 % offline. Se fijará con un ADR técnico.

## Registro de preguntas y respuestas

### Ronda 1 (2026-10-20)

1. **¿Para quién es?** Solo para mí.
2. **¿Cómo la usarías?** Introduzco el peso y los porcentajes que quiero. Ahora uso 3 porcentajes; podría haber una opción para añadir o quitar series de aproximación, quizá en el mismo momento. Suelo hacer 40 %, 70 % y 90 %.
3. **Barra y unidades:** podemos poner las distintas barras: la de 20, la de 15, la recta pequeña para curl de bíceps, la barra Z, etc. Trabajo solo en kg.
4. **Discos:** hay de todo tipo: 25, 20, 15, 10, 5, 2,5 y 1,25, con pares de sobra.
5. **Redondeo:** hacia abajo, y que se especifique.

### Ronda 2 (2026-10-20)

- **Inferencias de la ronda 1:** sin inventario, salto de 2,5 kg y carga simétrica: sí. Porcentajes sobre el peso total, sí, pero quiero que se indique también el peso por lado sin contar la barra.
1. **Barras:** no quiero poner ni quitar barras; eso debe estar diseñado, no algo variable. No sé cuánto pesan, pero creo que son las estándar.
2. **Cierres:** no cuentan.
3. **Repeticiones y serie de trabajo:** no, nada de eso.
4. **Por debajo de la barra:** solo barra. ¿Recomiendas algo distinto?
5. **Memoria y conexión:** 100 % offline. No debe recordar la última barra, los porcentajes ni el peso.

### Ronda 3 (2026-10-20)

- **Recomendación de "solo barra" indicando el valor que salía:** me parece bien.
1. **Peso de las barras pequeñas:** podemos hacer que el peso de esas sea variable, algo que se especifique. Son los mismos discos.
2. **Al abrir la app:** que guarde los porcentajes; la barra no. Estoy pensando en dejar también la opción de que no haya barra, por ejemplo en máquinas o mancuernas, para calcular el peso sin contar la barra. Hay máquinas donde el peso va separado, como las mancuernas o la prensa, y otras donde va todo junto y no se divide, como el remo en T o las poleas. Hay que pensar cómo representarlo; si me das alguna sugerencia…
3. **Peso de trabajo:** puede tener decimales. Máximo 500 kg, por ejemplo.
4. **Porcentajes:** por debajo del 100 % y por encima del 0 %. No se ordenan: van en el orden que especifica el usuario. Si coinciden, se muestran los dos igualmente.
5. **Qué se ve en cada serie:** creo que está bien así.

### Ronda 4 (2026-10-20)

- **Placas y mancuernas:** las dejamos para una funcionalidad futura. No serían mancuernas de discos.
1. **Modos en la primera versión:** A, B y C.
2. **Mancuernas cargables con discos:** no.
3. **Deducciones:** correcto. Hasta dos decimales.

### Revisión del borrador (2026-10-20)

1. **Peso de trabajo menor que la barra:** no, debe aparecer algo así como 0 kg por lado, o indicar que el peso es inferior al de la barra. ¿Qué recomendarías? O quizá una sugerencia de que cambie de barra, aunque podría pasar lo mismo con la de 15 kg.
2. **Valores al abrir:** sí.
3. **Lista vacía:** sí.
4. **Porcentajes enteros:** sí.
5. **Catálogo de cuatro barras:** así de momento.
6. **"Sin discos":** no termino de entender a qué te refieres. ¿Por qué no iba a caber ningún disco?

### Cierre (2026-10-20)

- Para lo de "sin discos", un mensaje que diga algo así como que el peso por lado es demasiado pequeño y que como mínimo requiere 1,25 kg.
- Aviso genérico, sin especificar que cojan otra barra.
- **Spec lista para revisión.**

<!-- Segunda prueba de VIC-56 (sdd-relanzar): PR desechable, no se fusiona. -->
<!-- Segundo commit de la segunda prueba de VIC-56. -->
<!-- Tercer commit de la segunda prueba de VIC-56. -->
