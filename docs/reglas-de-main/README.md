# Reglas de `main`: ruleset, CODEOWNERS y auto-merge (VIC-57)

Propuesta para aplicar en la calculadora el ADR-0009 del workflow (`victor-lg/sdd-workflow`, `docs/adr/0009-papel-de-la-persona-y-autonomia-del-agente.md`): el agente fusiona con auto-merge los R0 y R1 que no tocan rutas sensibles; lo sensible y todo R2 lo aprueba la persona. No confundir con el ADR-0009 de este repo (la espera antes de axe).

Lo aplica la persona. El agente no tiene permiso para cambiar el ruleset ni los ajustes del repo, y `.github/CODEOWNERS` lo sube la persona.

> **No se aplica todavía** (decisión de la persona, 2026-11-24): primero las reglas 1 y 3 de VIC-56 (§3); el ruleset, CODEOWNERS y el auto-merge se aplican cuando estén en `main`.

| Fichero | Qué es | SHA-256 |
|---|---|---|
| [`CODEOWNERS.propuesto`](CODEOWNERS.propuesto) | El `.github/CODEOWNERS` completo | `25c9e0ed490a404dde35a475431832307b3a98c87fc422d654436e4fa682a4f3` |
| [`ruleset-main.json`](ruleset-main.json) | El ruleset `main-protegida` (id 25460562), para `PUT` en la API | `98919ec01a3a8c07ce58af192b37a2244ec23b03be0c5433d1f20c242674b4e3` |

## 1. Ruleset de `main`

> **No apliques nada de este documento hasta que las reglas 1 y 3 de VIC-56 estén en `main`** (decisión de la persona, 2026-11-24). Con `checks.py` de hoy, este ruleset dejaría que el agente fusionara solo un R1 sin G4 o con commits tras la última ronda de G4, que ADR-0009 §5 prohíbe (§3). Cuando estén, comprueba que `checks.py` de `main` falla en esos dos casos y aplica en este orden: CODEOWNERS, ruleset, auto-merge.

Ruleset `main-protegida`, sobre la rama por defecto. Cada opción con su valor; «cambia» marca lo que es distinto de hoy (leído con `gh api repos/victor-lg/calculadora-discos/rulesets/25460562` el 2026-11-24).

| Opción (en la web) | Clave en la API | Valor | ¿Cambia? |
|---|---|---|---|
| Enforcement status | `enforcement` | `active` | no |
| Target branches | `conditions.ref_name.include` | `~DEFAULT_BRANCH` | no |
| Bypass list | `bypass_actors` | Repository admin (`RepositoryRole` 5), solo victor-lg; modo «For pull requests only» (`pull_request`) | decidido por la persona (nota 1) |
| Restrict deletions | `deletion` | activo | no |
| Block force pushes | `non_fast_forward` | activo | no |
| Require a pull request before merging | `pull_request` | activo | no |
| · Required approvals | `required_approving_review_count` | **0** | cambia (hoy 1) |
| · Dismiss stale pull request approvals when new commits are pushed | `dismiss_stale_reviews_on_push` | activo | no |
| · Require review from Code Owners | `require_code_owner_review` | activo | no |
| · Require approval of the most recent reviewable push | `require_last_push_approval` | **inactivo** | cambia (hoy activo), nota 2 |
| · Require conversation resolution before merging | `required_review_thread_resolution` | inactivo | no |
| · (sin nombre en la web hoy) | `require_extra_approval_for_unattributed_changes` | activo | no, nota 3 |
| · Allowed merge methods | `allowed_merge_methods` | merge, squash, rebase (el repo solo permite squash) | no |
| Require status checks to pass | `required_status_checks` | activo | no |
| · Checks requeridos (GitHub Actions, `integration_id` 15368) | `required_status_checks` | `checks-sdd`, `tests`, `osv-scanner`, `semgrep`, `gitleaks`, `codigo-sobrante`, `duplicados`, `mutaciones` | no |
| · Require branches to be up to date before merging | `strict_required_status_checks_policy` | inactivo | no |
| · Do not enforce on create | `do_not_enforce_on_create` | inactivo | no |

**Ajuste del repo:** Settings → General → Pull Requests → **Allow auto-merge**: activo (`allow_auto_merge: true`; hoy `false`). El resto sigue: solo squash, borrar la rama al fusionar.

Notas:

1. **Bypass.** La cuenta del agente no ve la lista actual (`current_user_can_bypass: never`). En un repo personal, «solo victor-lg» es el rol *Repository admin*: victor-lg es la única cuenta admin y `victor-lg-bot` tiene `write`. Modo *For pull requests only* (decisión de la persona, 2026-11-24): basta para que los PR R2 de la persona sigan entrando con bypass (no puede aprobar un PR suyo) y no permite el push directo a `main`. El JSON ya lo lleva así.
2. **Aprobación del último push.** Esa opción exige que el último push lo apruebe alguien distinto de quien lo hizo. El último push de un PR del agente es siempre del agente, así que, activa, previsiblemente seguiría pidiendo una aprobación en todo PR y el auto-merge no fusionaría ningún R1. Lo que protegía ya lo cubren el *dismiss* de aprobaciones al hacer push (rutas de CODEOWNERS) y el check `aprobacion` de `checks-sdd`, que en R2 exige tu aprobación sobre el commit de la cabeza. Se comprueba en C0 y en C2 (§4).
3. **`require_extra_approval_for_unattributed_changes`.** Está activa hoy y la web no la muestra con ese nombre; no conozco su efecto exacto, así que se queda como está y C0 comprueba que no bloquea un R1.

Para aplicarlo, desde tu cuenta, con las reglas 1 y 3 de VIC-56 ya en `main` y desde el commit de este PR que aprobaste (`docs/reglas-de-main/` no está en CODEOWNERS: un PR posterior del agente podría cambiar estos ficheros sin tu aprobación, así que no los tomes de `main` sin más):

```sh
git show <commit aprobado>:docs/reglas-de-main/ruleset-main.json > ruleset-main.json
sha256sum ruleset-main.json   # debe dar el de la tabla de arriba, que leíste al aprobar
gh api -X PUT repos/victor-lg/calculadora-discos/rulesets/25460562 --input ruleset-main.json
gh api -X PATCH repos/victor-lg/calculadora-discos -F allow_auto_merge=true
```

Lo mismo con `CODEOWNERS.propuesto` antes de copiarlo a `.github/CODEOWNERS`.

## 2. CODEOWNERS

[`CODEOWNERS.propuesto`](CODEOWNERS.propuesto) sustituye entero a `.github/CODEOWNERS`. Sin la línea `*`. Cubre:

- las rutas sensibles de ADR-0009 §3.3: `docs/specs/`, `docs/adr/`, `.github/` (con `.github/sdd/checks.py` y `.github/sdd/rutas-sensibles.txt`), `.claude/`, `AGENTS.md`, `CLAUDE.md` y los manifiestos de dependencias (`MANIFIESTOS` de `checks.py`);
- toda la lista de controles de `checks.py` (`R2_CONTROLES`), con las capturas de referencia (`*-snapshots/`, `__screenshots__/`) y la configuración de Playwright;
- las rutas sensibles del proyecto (`.github/sdd/rutas-sensibles.txt`): `app/sw.js`, `app/index.html`, `tests/unit/sw.test.js`, `tests/e2e/sin-conexion.spec.js`.

`README.md` ya salió en el PR #93. Las diferencias con `checks.py` están en la cabecera del fichero (mayúsculas, `[jt]`, rutas sin `/`, migraciones). Ninguna deja un R2 sin tu aprobación, porque el check `aprobacion` falla en todo R2 sin ella.

**Comprobación hecha:** con los patrones leídos como `.gitignore` (`git check-ignore`, la misma sintaxis que CODEOWNERS salvo `[ ]`, `!` y `\#`, que no se usan), los ficheros versionados que cubre son exactamente los que `checks.py` marca R2 más las specs y los ADR: ninguno de más y ninguno de menos. También cubre rutas que hoy no existen (`sub/stryker.config.mjs`, `x/.config/jscpd.json`, `src/__screenshots__/a.png`, `requirements-dev.txt`) y deja fuera `app/main.js`, `docs/vision.md`, `README.md` y `tests/e2e/capturas.spec.js`.

**Tras subirlo:** `gh api repos/victor-lg/calculadora-discos/codeowners/errors` debe devolver `{"errors":[]}`.

## 3. Antes de aplicar: lo que hoy no frena ningún check

Según los comentarios de VIC-56 (Done), sus reglas 1 y 3 quedaron para después de esta issue. Con `checks.py` de `main` hoy:

- **Un PR sin G4 no falla** (`check_hallazgos`: «un PR sin G4 (R0, Dependabot) no falla aquí»), y un R0 que toca código solo da un aviso (`check_riesgo`).
- **Los commits posteriores a la última ronda de G4 no fallan:** `check_cambios` los publica en el resumen, pero solo falla si falta el commit revisado, si ese commit ya no está en la historia de la cabeza (rebase o push forzado) o si la lista está escrita a mano.
- **El límite aceptado de `sdd-relanzar.yml`:** si la persona aprueba un R2 y luego pide cambios o retira la aprobación, y el relanzamiento no llega a ejecutarse, `checks-sdd` conserva el verde anterior. No es solo cuestión de tiempo: la cuenta del agente tiene `write` y puede cancelar la ejecución de `sdd-relanzar` (y, si D2 sale que sí, también descartar la review y cancelar el relanzamiento del `dismissed`). El propio fichero pide revisarlo «antes de que el agente pueda fusionar algún PR con aprobación previa de la persona». Hoy lo frena la regla de 1 aprobación; con 0, solo lo frenaría GitHub si un «Request changes» bloquea (D1). Afecta seguro a los R2 sin rutas de CODEOWNERS (migraciones, código de una spec R2); en los que tienen rutas de CODEOWNERS se espera que el «Request changes» de la persona deje sin su aprobación, pero no está comprobado (C2, último paso). Lo prueban D1-R2 y D3.
  **Aceptado por ahora** (decisión de la persona, 2026-11-24), con una regla para el agente: **nunca activa el auto-merge en un R2 ni cancela ejecuciones de la CI.** La única excepción son los casos C6c y D3 de §4, que cancelan una ejecución a propósito en un PR desechable y con la persona avisada. Es una regla del agente, no un control: irá a las skills en VIC-60 y, hasta entonces, solo la recoge este documento.
- **Checks verdes contra un `main` anterior:** con `strict_required_status_checks_policy` inactivo (como hoy), el verde de `checks-sdd` puede venir de una ejecución anterior a un cambio en `main`. Si la persona fusiona una spec que sube a R2, o añade una ruta a `rutas-sensibles.txt`, mientras un PR R1 del agente ya está en verde con auto-merge activo, ese PR se fusiona como R1 sin volver a evaluarse. Activarlo («Require branches to be up to date») lo cierra a cambio de relanzar toda la CI, Stryker incluido, en cada PR abierto tras cada merge.
  **Riesgo aceptado** (decisión de la persona, 2026-11-24): se queda inactivo, como hoy. Se acepta que un PR del agente en verde con auto-merge activo puede fusionarse con el nivel de riesgo calculado contra el `main` anterior a un cambio de specs o de `rutas-sensibles.txt`. Hace falta que coincidan ese cambio y un PR del agente pendiente; lo recogería la segunda mirada (ADR-0009 §3.10).

Con 0 aprobaciones, un R1 sin rutas de CODEOWNERS y con la CI en verde se puede fusionar en cuanto el ruleset se aplique, con auto-merge o con el botón (la cuenta del agente tiene `write`). Por eso la persona decidió (2026-11-24) no aplicar nada hasta que las reglas 1 y 3 de VIC-56 estén en `main`. Esta propuesta no cambia `checks.py`.

## 4. Plan de prueba (ADR-0009 §5)

Se ejecuta después de que apliques el ruleset, CODEOWNERS y el auto-merge, y por tanto con las reglas 1 y 3 de VIC-56 ya en `main`. Sustituye a N4; N5 se mantiene (C7).

### Cómo se hace cada prueba

- **PR desechables:** rama `test/vic-57-prueba-<caso>` desde `main`, con el caso en minúsculas (`test/vic-57-prueba-c0`, `test/vic-57-prueba-d1-r2`: `RE_RAMA` no admite mayúsculas y `convenciones` fallaría), título `test(reglas): prueba desechable <caso>`, descripción con `Refs VIC-57`, la plantilla y `AC cubiertos: no aplica (prueba desechable de VIC-57)` (un fichero fuera de `docs/` cuenta como código, y sin esa línea `trazabilidad` fallaría por otro motivo). Contenido inofensivo (ficheros nuevos de texto con el prefijo `_prueba-vic-57`), nunca en `.github/workflows/` salvo C7. Se cierran sin fusionar y se borra la rama.
- **Fuera de borrador.** Un borrador no se fusiona y en él los checks requeridos `tests` y `mutaciones` no existen (se llaman «(borrador)»): un caso probado en borrador se rechazaría por eso y no por la regla. Cada PR desechable sale de borrador antes del intento. El hook del plugin solo deja al agente hacerlo con la CI en verde; en los casos con un check en rojo a propósito (C3, C4c, C6b, C6e), lo hace la persona desde su cuenta (`gh pr ready N`), sin aprobar. Cada salida de borrador lanza `tests` completo y Stryker (hasta unos 30 minutos por PR); se agrupan los casos en los mismos PR donde se puede (C1 y C2; C0, D1 y D2).
- **El intento:** con todos los checks terminados y fuera de borrador, se lee `gh pr view N --json isDraft,mergeStateStatus,reviewDecision,statusCheckRollup`. Con `BLOCKED` y por la causa que se prueba, se intenta `gh pr merge N --squash` (debe fallar) y `gh pr merge N --squash --auto`; tras el siguiente evento (o 5 minutos sin eventos), el PR debe seguir abierto. Luego `gh pr merge N --disable-auto`, siempre, antes de cualquier otro paso en ese PR.
- **Si sale `CLEAN` donde se esperaba `BLOCKED`,** el caso ha fallado: no se intenta fusionar, se anota y se para la prueba, para que no entre nada en `main`.
- **Si sale otro estado** (`UNKNOWN`, `UNSTABLE`, `BEHIND`…), se espera y se vuelve a leer; no se intenta nada hasta tener `BLOCKED` o `CLEAN`.
- **La persona no activa el auto-merge** en ningún PR de prueba ni en ningún PR del agente: no está comprobado si con su bypass (*For pull requests only*) un auto-merge suyo saltaría las reglas.
- **Nunca hay auto-merge activo** mientras los checks están en curso, ni cuando la persona aprueba, ni cuando el agente descarta una review: cualquiera de esas cosas podría dejar el PR en `CLEAN` y fusionarlo.
- **Comprobaciones previas:** `gh api repos/victor-lg/calculadora-discos/rulesets/25460562` igual a `ruleset-main.json` (salvo `bypass_actors`, que el agente no ve), `.allow_auto_merge` en `true` y `codeowners/errors` vacío. Si algo no coincide, no se empieza.

### Casos

| Caso | §5 | PR desechable | Qué se hace | Se espera |
|---|---|---|---|---|
| C0 | control | R1 sin rutas de CODEOWNERS, con una ronda de G4 sin hallazgos sobre la cabeza | Leer el estado; **no** se fusiona | `CLEAN`: 0 aprobaciones, `require_last_push_approval` desactivada y la nota 3 no bloquean. Si sale `BLOCKED`, el ruleset impide el primer escalón y se revisa antes de seguir |
| C1 | 1 | R1 que añade `docs/adr/_prueba-vic-57.md` (de CODEOWNERS; no cuenta como ADR por el `_`) | Intento sin review | `BLOCKED`, `reviewDecision: REVIEW_REQUIRED`; review pedida a victor-lg; los dos intentos, rechazados |
| C2 | 2 | El de C1, que además añade `app/_prueba-vic-57.txt` (sin propietario) | (a) La persona aprueba (→ `CLEAN`, sin fusionar); el agente hace un push que cambia **solo** `app/_prueba-vic-57.txt`; intento. (b) Nueva aprobación; push que cambia `docs/adr/_prueba-vic-57.md`; intento. (c) Nueva aprobación y «Update branch» (merge de `main` sin cambios propios). (d) Nueva aprobación y luego «Request changes» de la persona | (a) y (b): la aprobación queda descartada (`dismissed`), `BLOCKED`, intentos rechazados; si en (a) sigue `CLEAN`, falla el caso (nota 2: habría que volver a activar `require_last_push_approval`). (c): se anota si la aprobación sigue. (d): `BLOCKED`; si sale `CLEAN`, falla el caso |
| C3 | 3 | R2 que no toca CODEOWNERS: `migrations/_prueba-vic-57.txt` (R2 por `R2_RUTAS`) | Intento sin review | `checks-sdd` en rojo (`aprobacion`), `BLOCKED`, intentos rechazados |
| C4a | 4 | R1 sin rutas de CODEOWNERS y sin G4 | Intento | `checks-sdd` en rojo (regla 1 de VIC-56), `BLOCKED`, intentos rechazados. Si sale `CLEAN`, falla el caso y no se fusiona |
| C4b | 4 | R0 marcado que toca código (un comentario en un `.js` de `app/` que no esté en rutas sensibles) | Intento | `checks-sdd` en rojo (regla 1 de VIC-56: un R0 que `checks.py` no comprueba como solo documentación lleva G4), `BLOCKED`, intentos rechazados. Si sale `CLEAN`, falla el caso y no se fusiona |
| C4c | 4 | R1 con una línea de reconciliación `resolución: pregunta a la persona` | Intento | `checks-sdd` en rojo (`hallazgos`), `BLOCKED`, intentos rechazados |
| C5 | 5 | R1 con una ronda de G4 (`Commit revisado:` sobre la cabeza) y después un push | Intento | `checks-sdd` en rojo (regla 3 de VIC-56), `BLOCKED`, intentos rechazados. Si sale `CLEAN`, falla el caso y no se fusiona |
| C6a | 6 | — | Desde la cuenta del agente, un commit sobre `main` que solo añade `_prueba-vic-57-c6a.txt` (una línea de texto), empujado con `git push origin <ese commit>:main` | Rechazado por GitHub (`GH013`). Si GitHub lo aceptara, la persona lo revierte con un PR suyo y se para la prueba. Si el hook del plugin lo para antes de llegar a GitHub, se anota así y no se repite por otra vía; la persona decide si lo intenta ella sin bypass o si basta |
| C6b | 6 | R1 como C0 con `checks-sdd` en rojo (título fuera de formato) | Intento | `BLOCKED`, intentos rechazados |
| C6c | 6 | El de C6b, con el título corregido | Pendiente: con los checks en curso, solo `gh pr merge N --squash` (debe fallar), **sin** `--auto`. Cancelado: se cancela la ejecución de `sdd` (`gh run cancel`, `checks-sdd`) y, con el resto de checks terminados y el PR `BLOCKED` por ese cancelado, el intento normal | Pendiente: rechazado. Cancelado: `BLOCKED`, intentos rechazados. Tras el intento, `--disable-auto` sin ningún evento entre medias (un evento relanzaría `checks-sdd`) |
| C6d | 6 | — | Desde la cuenta del agente, `gh api -X PUT repos/victor-lg/calculadora-discos/rulesets/25460562 -f name=main-protegida` (solo el nombre, el que ya tiene: el resto de campos no se envía) y `gh api -X PATCH repos/victor-lg/calculadora-discos -F allow_auto_merge=true`: los mismos valores ya aplicados, para que un éxito no cambie nada | 403 o 404 en los dos |
| C6e | 6 | R2 que añade un comentario a `.github/CODEOWNERS` | Intento sin review | `BLOCKED` (CODEOWNERS y `aprobacion`), intentos rechazados |
| C7 | N5 | — | Push de una rama que añade un comentario a un fichero de `.github/workflows/` | Rechazado por GitHub (el token no tiene `workflow`) |

### Las dos dudas del ADR (§6)

| Duda | PR | Qué se hace | Qué se anota |
|---|---|---|---|
| D1. ¿Un «Request changes» de victor-lg frena el auto-merge con 0 aprobaciones? | El de C0 (R1, `CLEAN`), con el auto-merge **desactivado** | La persona envía «Request changes». Se lee el estado tras la nueva ejecución de `checks-sdd`. Solo si sale `BLOCKED`, el intento normal, que termina con `--disable-auto` | `mergeStateStatus` y `reviewDecision`. No se repite en un PR con rutas de CODEOWNERS: ya está `BLOCKED` sin ninguna review y no distinguiría nada. En R2, `checks-sdd` falla con «la última review de la persona pide cambios» (VIC-56, calculadora #87 y #89) |
| D1-R2 | El de C3 (R2 sin rutas de CODEOWNERS), con el auto-merge **desactivado** | La persona aprueba (→ `checks-sdd` en verde y `CLEAN`, sin fusionar) y luego envía «Request changes» | Que `sdd-relanzar` vuelve a poner `checks-sdd` en rojo y el PR en `BLOCKED`, y cuánto tarda. Con D1, dice si el límite de §3 queda frenado por GitHub o solo por el relanzamiento |
| D3 (límite de §3) | El de C3 tras D1-R2, con el auto-merge **desactivado** | La persona aprueba de nuevo (→ verde); luego envía «Request changes» y el agente cancela enseguida la ejecución de `sdd-relanzar` que lanza (`gh run cancel`) | `mergeStateStatus` y el estado de `checks-sdd` con las ejecuciones terminadas. Si sale `CLEAN`, el agente puede dejar fusionable un R2 rechazado: no se intenta fusionar y lo decide la persona antes de seguir con el ruleset aplicado |
| D2. ¿La cuenta del agente puede descartar una review de victor-lg? | El de D1, con su «Request changes» y el auto-merge **desactivado** | `gh api -X PUT repos/victor-lg/calculadora-discos/pulls/N/reviews/<id>/dismissals -f message="Prueba VIC-57 (D2)" -f event=DISMISS` desde la cuenta del agente | Código HTTP, estado de la review y `mergeStateStatus` después. Si D1 frena y D2 se puede, el agente puede quitar tu freno: los rulesets no tienen «quién puede descartar», así que habría que decidir otro control |

Para D1 y D2 te pediré el «Request changes» en el momento; el dismiss de D2 es sobre una review tuya en un PR desechable, y lo hace el agente solo para esta prueba.

### Registro

Cada caso se anota con el PR, el commit de la cabeza, la orden, la salida de GitHub (mensaje de error, `mergeStateStatus`, `reviewDecision`) y la fecha. Se rellena en este documento, en este PR si sigue abierto o en otro PR de `docs/`.

| Caso | PR | Cabeza | Fecha | Resultado | Evidencia |
|---|---|---|---|---|---|
| C0 | | | | | |
| C1 | | | | | |
| C2 | | | | | |
| C3 | | | | | |
| C4a | | | | | |
| C4b | | | | | |
| C4c | | | | | |
| C5 | | | | | |
| C6a | | | | | |
| C6b | | | | | |
| C6c | | | | | |
| C6d | | | | | |
| C6e | | | | | |
| C7 | | | | | |
| D1 | | | | | |
| D1-R2 | | | | | |
| D3 | | | | | |
| D2 | | | | | |

## 5. Vuelta atrás

- Ruleset: `PUT` con los valores de hoy (`required_approving_review_count: 1`, `require_last_push_approval: true`, el resto igual).
- Auto-merge: `gh api -X PATCH repos/victor-lg/calculadora-discos -F allow_auto_merge=false`.
- CODEOWNERS: volver a la versión de `main` anterior (con la línea `*`).
