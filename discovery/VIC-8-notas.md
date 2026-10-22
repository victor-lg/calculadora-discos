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

## Inferencias de Claude (en la spec, a confirmar en la revisión)

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
