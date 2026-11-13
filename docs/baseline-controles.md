# Baseline de los controles de la plantilla

Lo heredado que rechaza o señala un check de la plantilla del workflow SDD + IA y que se
queda como está, de momento. Es una lista para personas: **ningún check lee este fichero
y ninguno se relaja por él**. Si un PR toca uno de estos ficheros, el check salta igual y
el PR lo corrige o lo explica.

Se comprobó con el `checks.py` de `plantilla-proyecto` en `main` de `sdd-workflow`
(commit `7bb2a74`, 2026-11-14), con sus funciones aplicadas a todos los ADR y specs de
`main` de la calculadora (commit `3b0b1bf`). La estructura de las specs (`specs`) pasa
sin errores.

## M7: referencias sin comillas en la cabecera YAML de los ADR (`adr`, error)

Los cinco ADR escriben las listas `modifica` y `referencias` sin comillas. En YAML, un
`#` sin comillas empieza un comentario, así que `PR #20` se lee como `PR`, y una coma
dentro de un paréntesis parte la referencia en dos.

| ADR | Lo que el check lee mal |
| --- | --- |
| `docs/adr/ADR-0001-tecnologia-pwa.md` | `SPEC-CALC-001`, `docs/vision.md`, `PR` |
| `docs/adr/ADR-0002-datos-guardados.md` | `ADR-0001 (§3.2)`, `ADR-0001`, `SPEC-CALC-001`, `SPEC-CALC-002`, `VIC-8`, `PR` |
| `docs/adr/ADR-0003-dibujo-3d.md` | `ADR-0001 (§3.1)`, `ADR-0001`, `SPEC-CALC-003`, `SPEC-CALC-001`, `VIC-9`, `PR` |
| `docs/adr/ADR-0004-mas-datos-guardados.md` | `ADR-0002 (§3.1)`, `ADR-0001`, `ADR-0002`, `SPEC-CALC-001`, `SPEC-CALC-002`, `VIC-9`, `PR` |
| `docs/adr/ADR-0005-guardar-al-terminar-de-editar.md` | `ADR-0004 (§3`, `último párrafo; §4`, `segundo coste aceptado)`, `ADR-0001`, `ADR-0002`, `ADR-0004`, `SPEC-CALC-001`, `SPEC-CALC-002`, `VIC-13`, `PR` |

**Cuándo salta:** solo en un PR que cambie ese ADR; el check mira los ADR que cambian,
no todos.

**Por qué no se corrige aquí:** los ADR son normativos (`/docs/adr/` en CODEOWNERS) y
VIC-24 no puede tocarlos. El PR que cambie un ADR pone sus referencias entre comillas.

## M39: historial en la cabecera de las specs (`historial`, solo aviso)

Las tres specs llevan, en el comentario que va tras el frontmatter, el historial de sus
versiones: rondas de revisión, versiones anteriores, referencias a PR y fechas.

- `docs/specs/SPEC-CALC-001-series-calentamiento.md`
- `docs/specs/SPEC-CALC-002-inventario-discos.md`
- `docs/specs/SPEC-CALC-003-presentacion.md`

**Cuándo salta:** en un PR que cambie esa spec, como aviso. No bloquea.

**Por qué no se corrige aquí:** cambiar una spec va en su propio PR, y VIC-24 no toca
specs.

## M11: convenciones de nombres antiguas (`convenciones`, `commits` y `autoria`, error)

Dos ficheros que guían a las personas y al agente siguen la convención anterior a M11.
Quien la siga hará un PR que los checks de la plantilla rechazan:

- `.github/pull_request_template.md`: pone el ID como alcance del título
  (`feat(VIC-5): …`) y empieza la descripción por `Issue de Linear: <ID>`. La plantilla
  pide el alcance como zona (`feat(calculo): …`) y que la descripción empiece por
  `Fixes`, `Part of` o `Refs VIC-N`.
- `AGENTS.md`: pone el ID como alcance del título, nombra las ramas `vic-N-…`, `ci-…`…
  en lugar de `<tipo>/vic-N-…`, y pide `Co-Authored-By` del agente en los commits, que
  el check `autoria` rechaza (ADR-0007 del workflow). Tampoco pide el pie
  `Refs: VIC-N` en los commits.

**Cuándo salta:** en cualquier PR que siga estos ficheros al pie de la letra.

**Por qué no se corrige aquí:** los dos ficheros son de configuración del agente y de
GitHub (R2) y están fuera de los ficheros permitidos de VIC-24. Su puesta al día va a
otra issue.

## Exclusiones de los escáneres

Ninguna. No hay `osv-scanner.toml` ni `.semgrepignore`: no se ha visto ningún hallazgo
que excluir. Si osv-scanner o Semgrep dan hallazgos en `app/vendor/three/**` (three.js
0.170.0 copiado del paquete npm, ADR-0003), la exclusión se añade aquí con su motivo.
