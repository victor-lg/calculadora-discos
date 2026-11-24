# Reglas de `main`: ruleset, CODEOWNERS y auto-merge (VIC-57)

Propuesta para aplicar en la calculadora el ADR-0009 del workflow (`victor-lg/sdd-workflow`, `docs/adr/0009-papel-de-la-persona-y-autonomia-del-agente.md`): el agente fusiona con auto-merge los R0 y R1 que no tocan rutas sensibles; lo sensible y todo R2 lo aprueba la persona. No confundir con el ADR-0009 de este repo (la espera antes de axe).

Lo aplica la persona. El agente no tiene permiso para cambiar el ruleset ni los ajustes del repo, y `.github/CODEOWNERS` lo sube la persona.

| Fichero | Qué es | SHA-256 |
|---|---|---|
| [`CODEOWNERS.propuesto`](CODEOWNERS.propuesto) | El `.github/CODEOWNERS` completo | `25c9e0ed490a404dde35a475431832307b3a98c87fc422d654436e4fa682a4f3` |
| [`ruleset-main.json`](ruleset-main.json) | El ruleset `main-protegida` (id 25460562), para `PUT` en la API | `98919ec01a3a8c07ce58af192b37a2244ec23b03be0c5433d1f20c242674b4e3` |

## 1. Ruleset de `main`

Ruleset `main-protegida`, sobre la rama por defecto. Cada opción con su valor; «cambia» marca lo que es distinto de hoy (leído con `gh api repos/victor-lg/calculadora-discos/rulesets/25460562` el 2026-11-24).

| Opción (en la web) | Clave en la API | Valor | ¿Cambia? |
|---|---|---|---|
| Enforcement status | `enforcement` | `active` | no |
| Target branches | `conditions.ref_name.include` | `~DEFAULT_BRANCH` | no |
| Bypass list | `bypass_actors` | Repository admin (`RepositoryRole` 5), solo victor-lg; modo «For pull requests only» (`pull_request`) | ver nota 1 |
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

1. **Bypass.** La cuenta del agente no ve la lista actual (`current_user_can_bypass: never`). En un repo personal, «solo victor-lg» es el rol *Repository admin*: victor-lg es la única cuenta admin y `victor-lg-bot` tiene `write`. Propongo el modo *For pull requests only*, que basta para que tus PR R2 sigan entrando con bypass (no puedes aprobar un PR tuyo) y no permite el push directo a `main`. Si hoy está en *Always* y quieres conservar el push directo, deja *Always*: no cambia nada de lo que se prueba en §4 (el bypass es de tu cuenta). Antes de aplicar, compara con `gh api repos/victor-lg/calculadora-discos/rulesets/25460562 --jq .bypass_actors` desde tu cuenta.
2. **Aprobación del último push.** Esa opción exige que el último push lo apruebe alguien distinto de quien lo hizo. El último push de un PR del agente es siempre del agente, así que, activa, previsiblemente seguiría pidiendo una aprobación en todo PR y el auto-merge no fusionaría ningún R1. Lo que protegía ya lo cubren el *dismiss* de aprobaciones al hacer push (rutas de CODEOWNERS) y el check `aprobacion` de `checks-sdd`, que en R2 exige tu aprobación sobre el commit de la cabeza. Se comprueba en C0 y en C2 (§4).
3. **`require_extra_approval_for_unattributed_changes`.** Está activa hoy y la web no la muestra con ese nombre; no conozco su efecto exacto, así que se queda como está y C0 comprueba que no bloquea un R1.

Para aplicarlo, desde tu cuenta y con este PR ya en `main`:

```sh
gh api -X PUT repos/victor-lg/calculadora-discos/rulesets/25460562 --input docs/reglas-de-main/ruleset-main.json
gh api -X PATCH repos/victor-lg/calculadora-discos -F allow_auto_merge=true
```

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
- **Los commits posteriores a la última ronda de G4 no fallan:** `check_cambios` los publica en el resumen, pero solo falla si falta el commit revisado o si la lista está escrita a mano.

Con 0 aprobaciones, un R1 sin rutas de CODEOWNERS y con la CI en verde se puede fusionar en cuanto el ruleset se aplique, con auto-merge o con el botón (la cuenta del agente tiene `write`). Esos dos casos de §5 (C4a y C5) **se espera que fallen** hasta que se hagan las reglas 1 y 3. Decides tú: aplicar ya y aceptar ese hueco hasta entonces, o hacer antes las reglas 1 y 3. Esta propuesta no cambia `checks.py`.

## 4. Plan de prueba (ADR-0009 §5)

Se ejecuta después de que apliques el ruleset, CODEOWNERS y el auto-merge. Sustituye a N4; N5 se mantiene (C7).

### Cómo se hace cada prueba

- **PR desechables:** rama `test/vic-57-prueba-<caso>` desde `main`, título `test(reglas): prueba desechable <caso>`, descripción con `Refs VIC-57` y la plantilla. Contenido inofensivo (ficheros nuevos de texto con el prefijo `_prueba-vic-57`), nunca en `.github/workflows/` salvo C7. Se cierran sin fusionar y se borra la rama.
- **El intento:** con todos los checks terminados, se lee `gh pr view N --json mergeStateStatus,reviewDecision,statusCheckRollup`. Con `BLOCKED`, se intenta `gh pr merge N --squash` (debe fallar) y `gh pr merge N --squash --auto`; tras el siguiente evento (o 5 minutos), el PR debe seguir abierto. Luego `gh pr merge N --disable-auto`.
- **Si sale `CLEAN` donde se esperaba `BLOCKED`,** el caso ha fallado: no se intenta fusionar, se anota y se para la prueba, para que no entre nada en `main`.
- **Antes de que la persona apruebe** cualquier PR de prueba, el auto-merge se desactiva: con él activo, un Approve lo fusionaría.
- **Comprobaciones previas:** `gh api repos/victor-lg/calculadora-discos/rulesets/25460562` igual a `ruleset-main.json` (salvo `bypass_actors`, que el agente no ve), `.allow_auto_merge` en `true` y `codeowners/errors` vacío.

### Casos

| Caso | §5 | PR desechable | Qué se hace | Se espera |
|---|---|---|---|---|
| C0 | control | R1 sin rutas de CODEOWNERS, con una ronda de G4 sin hallazgos sobre la cabeza | Leer el estado; **no** se fusiona | `CLEAN`: 0 aprobaciones, `require_last_push_approval` desactivada y la nota 3 no bloquean. Si sale `BLOCKED`, el ruleset impide el primer escalón y se revisa antes de seguir |
| C1 | 1 | R1 que añade `docs/adr/_prueba-vic-57.md` (de CODEOWNERS; no cuenta como ADR por el `_`) | Intento sin review | `BLOCKED`, `reviewDecision: REVIEW_REQUIRED`; review pedida a victor-lg; los dos intentos, rechazados |
| C2 | 2 | El de C1 | La persona aprueba (→ `CLEAN`, sin fusionar); el agente hace un push; intento | La aprobación queda descartada (`dismissed`), `BLOCKED`, intentos rechazados |
| C3 | 3 | R2 que no toca CODEOWNERS: `migrations/_prueba-vic-57.txt` (R2 por `R2_RUTAS`) | Intento sin review | `checks-sdd` en rojo (`aprobacion`), `BLOCKED`, intentos rechazados |
| C4a | 4 | R1 sin rutas de CODEOWNERS y sin G4 | Leer el estado | **Hoy se espera `CLEAN` (falla el caso):** falta la regla 1 de VIC-56 (§3). No se fusiona |
| C4b | 4 | R0 marcado que toca código (un comentario en un `.js` de `app/` que no esté en rutas sensibles) | Leer el estado | **Hoy se espera `CLEAN` con aviso (falla el caso):** `checks.py` no comprueba que un R0 sea solo documentación |
| C4c | 4 | R1 con una línea de reconciliación `resolución: pregunta a la persona` | Intento | `checks-sdd` en rojo (`hallazgos`), `BLOCKED`, intentos rechazados |
| C5 | 5 | R1 con una ronda de G4 (`Commit revisado:` sobre la cabeza) y después un push | Intento | **Hoy se espera `CLEAN` (falla el caso):** falta la regla 3 de VIC-56 (§3). No se fusiona |
| C6a | 6 | — | `git push origin <commit>:main` desde la cuenta del agente | Rechazado por GitHub (`GH013`). Si el hook del plugin lo para antes, se anota y decides si se repite |
| C6b | 6 | R1 como C0 con `checks-sdd` en rojo (título fuera de formato) | Intento | `BLOCKED`, intentos rechazados |
| C6c | 6 | El de C6b, con el título corregido | Intento con los checks en curso | Directo rechazado; con `--auto`, espera y no fusiona cuando se cancela la ejecución (`gh run cancel`) |
| C6d | 6 | — | `gh api -X PUT repos/victor-lg/calculadora-discos/rulesets/25460562 --input docs/reglas-de-main/ruleset-main.json` y `gh api -X PATCH repos/victor-lg/calculadora-discos -F allow_auto_merge=false` desde la cuenta del agente | 403 o 404 en los dos |
| C6e | 6 | R2 que añade un comentario a `.github/CODEOWNERS` | Intento sin review | `BLOCKED` (CODEOWNERS y `aprobacion`), intentos rechazados |
| C7 | N5 | — | Push de una rama que añade un comentario a un fichero de `.github/workflows/` | Rechazado por GitHub (el token no tiene `workflow`) |

### Las dos dudas del ADR (§6)

| Duda | PR | Qué se hace | Qué se anota |
|---|---|---|---|
| D1. ¿Un «Request changes» de victor-lg frena el auto-merge con 0 aprobaciones? | El de C0 (R1, `CLEAN`), con el auto-merge **desactivado** | La persona envía «Request changes». Se lee el estado tras la nueva ejecución de `checks-sdd`. Solo si sale `BLOCKED`, se activa `--auto` y se comprueba que no fusiona | `mergeStateStatus` y `reviewDecision`. Se repite en el de C1 (ruta de CODEOWNERS). En R2 ya se sabe que frena: `checks-sdd` falla con «la última review de la persona pide cambios» (VIC-56, calculadora #87 y #89) |
| D2. ¿La cuenta del agente puede descartar una review de victor-lg? | El de D1, con su «Request changes» | `gh api -X PUT repos/victor-lg/calculadora-discos/pulls/N/reviews/<id>/dismissals -f message="Prueba VIC-57 (D2)" -f event=DISMISS` desde la cuenta del agente | Código HTTP y estado de la review. Si D1 frena y D2 se puede, el agente puede quitar tu freno: los rulesets no tienen «quién puede descartar», así que habría que decidir otro control |

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
| D2 | | | | | |

## 5. Vuelta atrás

- Ruleset: `PUT` con los valores de hoy (`required_approving_review_count: 1`, `require_last_push_approval: true`, el resto igual).
- Auto-merge: `gh api -X PATCH repos/victor-lg/calculadora-discos -F allow_auto_merge=false`.
- CODEOWNERS: volver a la versión de `main` anterior (con la línea `*`).
