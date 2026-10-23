# Descubrimiento: inventario de discos disponibles (VIC-8)

**Fase:** F1–F2, con sdd-spec. **Cerrada el 2026-10-23 → `docs/specs/SPEC-CALC-002-inventario-discos.md`.**
**Issue de Linear:** VIC-8, "Inventario de discos disponibles: el cálculo usa solo los discos que tengo" (sin descripción).
**Fecha:** 2026-10-23, en Claude Code.

Estas notas son contexto, no norma (AGENTS.md). Lo que acabe en la spec lo aprueba Víctor con un PR.

## Confirmado por Víctor

- **Qué es "disponible":** qué tipos de disco hay, no cuántos. Los habilitados tienen existencias ilimitadas.
- **Cómo se elige:** cada disco se representa (la idea es con una imagen) y con un toque se habilita o se deshabilita. El diseño vendrá después: de momento la representación puede ser cualquiera.
- **Un solo juego:** el del gimnasio. Nada de casa ni de varios juegos.
- **Tipos:** solo los 7 que ya hay (25, 20, 15, 10, 5, 2,5 y 1,25 kg). No se añaden pesos nuevos.
- **Cálculo:** cada serie por separado, con todos los discos habilitados. Igual en los tres modos y con todas las barras.
- **Combinación** *(propuesta de Claude, aceptada)*: el mayor peso cargable que no supera el objetivo, buscando la mejor combinación entre los habilitados. Si empatan en peso, gana la de menos discos. Si siguen empatadas, la que tiene el disco más grande.
- **Disco mínimo** *(propuesta de Claude, aceptada)*: el "disco mínimo" de FR-09 de SPEC-CALC-001 pasa a ser el habilitado más pequeño.
- **Memoria** *(propuesta de Claude, aceptada)*: se guarda qué discos están habilitados y se recupera al arrancar de cero. La primera vez, o si los datos faltan o no se pueden leer, están los 7 habilitados.
- **Ninguno habilitado** *(propuesta de Claude, aceptada)*: no se muestra ninguna serie y aparece una indicación para habilitar al menos uno, como con la lista de porcentajes vacía.

## Inferencias de Claude (confirmadas por Víctor el 2026-10-23)

- Un conjunto guardado vacío se recupera vacío, igual que la lista de porcentajes (SPEC-CALC-001 FR-11).
- Los datos guardados que se leen pero no son válidos se tratan como ilegibles (los 7 habilitados), igual que con los porcentajes.
- La lista de porcentajes y los discos habilitados se guardan y se recuperan por separado: un fallo en uno no afecta al otro.
- La indicación de "ningún disco habilitado" convive con las demás indicaciones, avisos y errores.

## Verificado por Claude

- Con los 7 habilitados, la regla nueva (mayor peso, después menos discos, después el disco más grande) da el mismo resultado que tomar de mayor a menor (SPEC-CALC-001 FR-07) para cualquier peso de hasta 500 kg por lado. Por eso los AC de SPEC-CALC-001 no cambian.
- Con un subconjunto, tomar de mayor a menor puede fallar: con solo 25 y 20 y 40 kg por lado, carga 25 en vez de 20 + 20.

## Registro de preguntas y respuestas

### Ronda 1 (2026-10-23)

1. **¿Qué tipos o cuántos?** a: qué tipos.
2. **¿Dónde se configura?** Los discos se representan con una imagen y con un clic o un toque se habilitan o deshabilitan. El diseño vendrá después. Un solo juego, solo gimnasio, nada de casa.
3. **¿Pesos nuevos?** Solo los que ya hay.
4. **¿Si no se llega al objetivo?** Las existencias se limitan por tipo, no por cantidad. Por lo demás, de acuerdo con la propuesta.
5. **¿Cada serie por separado?** Sí, y lo mismo en los 3 modos y con todas las barras.

### Ronda 2 (2026-10-23)

6. **¿Se recuerda?** Sí.
7. **¿Ninguno habilitado?** Lo propuesto: sin series y con una indicación.
8. **¿Desempate?** El del disco más grande.
- Lo dado por resuelto (buscar la mejor combinación y el disco mínimo = el habilitado más pequeño): de acuerdo.

### Revisión del PR (2026-10-23)

- Confirma las cuatro inferencias.
- NFR-01 y NFR-02 se citan por ID a SPEC-CALC-001, sin copiar su texto. La SPEC-XCUT se deja para más adelante.

### Revisión G4, ronda 1 (2026-10-23)

- **ADR:** guardar los tipos habilitados contradice ADR-0001 §3.2. Se decide un ADR nuevo, ADR-0002, en su propio PR, que modifica ADR-0001 §3.2 (fusionado en `main` con el PR #13).
- **Validez de los datos guardados de los tipos:** lista estricta. Solo es válida una lista de pesos sin repetidos, cada uno igual a uno de los 7 tipos; cualquier otra cosa no es válida y se habilitan los 7 (SPEC-CALC-002 FR-08).
- **Fallo al guardar:** la app sigue funcionando con los valores en memoria y muestra un aviso discreto: "No se ha podido guardar: se mantendrá hasta cerrar la app". Vale para los discos y para los porcentajes. El aviso sigue visible hasta que un cambio posterior se guarda bien (SPEC-CALC-002 FR-09, citado desde SPEC-CALC-001 FR-11).

### Revisión G4, ronda 2 (2026-10-23)

- **Aviso de fallo al guardar:** sigue visible mientras alguno de los dos datos (discos o porcentajes) tenga un valor que no se ha podido guardar; desaparece cuando los dos están guardados con su valor actual (sustituye a "hasta que un cambio posterior se guarda bien").
- **Muchos discos:** con pocos tipos habilitados se muestran todos los discos, sin límite; la presentación es del diseño visual.
