---
id: ADR-0001
titulo: Tecnología de la calculadora de discos — PWA sin framework, alojada en GitHub Pages
estado: Propuesto         # Propuesto | Aceptado | Rechazado | Sustituido
fecha: 2026-10-21
sustituye: null
sustituido_por: null
referencias: [SPEC-CALC-001, docs/vision.md, PR #3]
---

<!--
Redactado por Claude a partir de SPEC-CALC-001 v0.2 y docs/vision.md, con las
decisiones de Víctor durante la revisión del PR #3. Recoge solo decisiones y su
porqué; los detalles de implementación están en la descripción del PR #3.
Fuentes externas consultadas el 2026-10-21 (§7).
-->

# ADR-0001 — Tecnología de la calculadora de discos

## 1. Contexto

SPEC-CALC-001 (§11) deja la tecnología a un ADR. Las restricciones son:

- un solo usuario, en su iPhone;
- sin Mac y sin App Store;
- 100 % sin conexión tras la primera carga (NFR-01);
- ninguna petición fuera del propio origen ni con datos de la persona (NFR-02);
- solo la lista de porcentajes se guarda en el dispositivo (FR-11).

AGENTS.md pide además el mínimo de dependencias (cada una nueva es R2) y un test por AC. Sin esta decisión, no se puede implementar la spec.

## 2. Alternativas consideradas

- **A. PWA instalada en la pantalla de inicio.**
  - No necesita Mac, firma ni cuenta de desarrollador. Desde iOS 26, una web añadida a la pantalla de inicio se abre por defecto como web app, con un interruptor para desactivarlo [F1].
  - Un service worker permite arrancar sin red [F2].
  - El origen de una web app de la pantalla de inicio está exento del límite de 7 días de ITP, y sus datos están aislados de Safari [F3].
  - Se prueba en Linux.
  - En contra:
    - la instalación es manual;
    - el almacenamiento es "best-effort", así que puede borrarse si falta espacio (desalojo LRU por origen) [F4][F5];
    - `navigator.storage.persist()` no garantiza nada [F4][F6];
    - exige HTTPS [F2].
- **B. App nativa en Swift instalada sin App Store**, compilada en un runner macOS y con *sideloading*.
  - Con un Apple ID gratuito, la firma caduca a los 7 días y la primera instalación necesita un ordenador [F7]. Es una fuente secundaria.
  - Con la cuenta de pago siguen haciendo falta la firma y los perfiles.
  - Si caduca la firma, la app no abre en el gimnasio.
- **C. React Native con Expo.**
  - Expo Go depende de un servidor de desarrollo [F8].
  - La distribución ad hoc exige una cuenta de pago de Apple y registrar el UDID [F9].
  - Añade decenas de dependencias R2.
- **D. Atajos o Scriptable** [F10].
  - Valoración propia, sin fuente: en Atajos, la interacción por diálogos sucesivos no permite recalcular al momento (FR-10).
  - Scriptable, metido en una vista web, sería la opción A dentro de una app de terceros, actualizada a mano en el teléfono.
- **Con o sin framework (dentro de A).** Preact, Lit o Svelte añadirían dependencias R2 (y, en Svelte, compilación). No compensa para una pantalla con unos pocos campos.

## 3. Decisión

**Opción A: una PWA sin framework.** Es la única opción sin firma ni caducidad y sin depender de terceros. Cumple NFR-01 y NFR-02 con piezas estándar del navegador y se prueba casi entera en Linux. Se aplica a toda la app, incluidas las capacidades futuras de `docs/vision.md`, mientras siga siendo de un solo usuario, sin conexión y sin servidor.

1. **Tecnología.** HTML, CSS y JavaScript estándar. Sin framework, sin paso de compilación y **cero dependencias en tiempo de ejecución**.
2. **Almacenamiento.**
   - La lista de porcentajes va en `localStorage`. Cualquier fallo al leerla cuenta como "no se puede leer" (FR-11).
   - El resto del estado vive solo en memoria.
   - Si iOS termina la app en segundo plano, la vuelta es un arranque de cero (decisión de Víctor; la spec no cambia).
3. **Sin conexión.**
   - Un service worker propio, sin librerías, que sirve primero desde la caché.
   - Se versiona en cada publicación.
   - Una versión nueva nunca cambia el código a mitad de un uso.
4. **Solo el propio origen.**
   - Ningún recurso de terceros: ni CDN, ni fuentes, ni analítica.
   - Una CSP en `<meta>`, porque la configuración de Pages no ofrece cabeceras HTTP propias (lo sé por conocimiento general; no lo he contrastado con una fuente). Esa CSP no cubre el service worker, que también pide solo al propio origen.
5. **Alojamiento.**
   - GitHub Pages desde este repositorio privado, con la cuenta GitHub Pro de Víctor [F11].
   - Con un **subdominio propio verificado en GitHub y sin DNS comodín** [F12]. La verificación evita que otro usuario reclame el subdominio. El subdominio aísla además el origen de los demás sitios `victor-lg.github.io`.
   - Pages da HTTPS también con dominio propio [F13].
6. **Publicación manual.**
   - El workflow de publicación solo se lanza a mano (`workflow_dispatch`), nunca al fusionar en `main`. Fusionar no es publicar (D25 del workflow SDD [F19]).
   - Publicar es una decisión de Víctor sobre una versión concreta de `main`. Aceptar un cambio y ponerlo en el iPhone son pasos distintos, y el agente no despliega (AGENTS.md).
   - **Lo impone GitHub, no la buena fe.** Lanzar un `workflow_dispatch` solo exige permiso de escritura [F17], y la cuenta del agente lo tiene. Con GitHub Pro, en un repositorio privado, los entornos no admiten aprobadores obligatorios, pero sí limitar las ramas que despliegan [F18]. Por eso:
     - el entorno `github-pages` solo admite `main`;
     - el job de publicación solo se ejecuta si tanto quien lo lanzó como quien lo relanza es la cuenta `victor-lg` (`github.actor` y `github.triggering_actor`), de modo que relanzar una ejecución tampoco publica desde otra cuenta.

     El agente no puede cambiar el workflow, porque su token no tiene el permiso `workflow`.
7. **Tests.**
   - `node --test` para la lógica, sin dependencias [F14].
   - Playwright, como **única dependencia de desarrollo**, para lo que necesita un navegador. En la CI corre **siempre** en Chromium y WebKit; en local, cuando el entorno lo permita.
   - Lo que dependa del service worker se prueba en Chromium, el único navegador donde Playwright ve su tráfico [F15]. El WebKit de Playwright no es Safari de iOS [F16].
8. **Prueba manual en el iPhone.** AC-12 y AC-22 no se dan por cumplidos sin una prueba manual en el iPhone, registrada en el PR de la entrega, aunque haya tests que los citen.
9. **Workflows.** Los workflows de tests y de publicación los añade una persona, porque el agente no tiene el permiso `workflow`.

## 4. Consecuencias

- **Beneficios:**
  - sin firma ni caducidad;
  - cero dependencias en tiempo de ejecución y una de desarrollo;
  - cada publicación es deliberada;
  - casi toda la spec se prueba en Linux.
- **Costes aceptados:**
  - instalación manual desde Safari;
  - las pruebas en iOS real son manuales;
  - en la práctica, la "primera carga" de NFR-01 es la primera apertura desde el icono con conexión, porque los datos de la web app están aislados de Safari [F3];
  - una corrección no llega al iPhone hasta que Víctor publica;
  - cambiar el subdominio después de instalar la app cambia el origen: hay que reinstalarla y se pierde la lista guardada (vuelve a 40/70/90, FR-11).
- **Riesgos y mitigaciones:**

  | Riesgo | Mitigación |
  | --- | --- |
  | iOS borra la lista guardada | Se pide almacenamiento persistente, sin garantía [F4][F6]. Si se borra, se aplica FR-11 (40/70/90). |
  | iOS termina la app en segundo plano y se pierde el peso | Aceptado como arranque de cero. Se observa en el uso real; si molesta, se reabre con una spec nueva. |
  | Un cambio de iOS altera las web apps | Repetir la prueba manual tras cada versión mayor de iOS. |
  | Se cuela una petición a terceros | CSP en `<meta>` para el documento, y el test de AC-13 y la revisión de código para el service worker. |
  | El iPhone se queda con una versión vieja | Versión nueva en cada publicación, sin mezclar ficheros de versiones distintas. Solo entra cuando no hay un uso en curso (§3.3), lo que en iOS puede tardar. |
  | Alguien que no es Víctor publica | Entorno limitado a `main` y job condicionado a que lo lance y lo relance la cuenta `victor-lg` (§3.6). |
  | Alguien reclama el subdominio | Verificación en GitHub, sin DNS comodín, y borrar el registro DNS si se deja Pages [F12]. |

- **Impacto:** el proyecto pasa a la etapa técnica, con PR propios posteriores:
  - código y tests;
  - `package.json` con Playwright (R2);
  - los workflows (R2, los añade una persona);
  - el README;
  - un PR de spec que enlace este ADR desde SPEC-CALC-001.

## 5. Validación

- La CI está en verde y la matriz de `checks-sdd` no deja ningún AC sin test.
- La prueba manual pasa en el iPhone de Víctor, con la versión de iOS anotada.
- **Hipótesis por verificar en el dispositivo**, porque las fuentes llegan hasta iOS 26:
  - que la lista sobreviva semanas de uso;
  - con qué frecuencia iOS termina la app en segundo plano;
  - cuánto tarda en activarse una versión nueva si la app queda suspendida.

## 6. Seguimiento

- **Pendiente:** el nombre del subdominio. Se fija al configurar Pages y no cambia este ADR.
- **Revisar este ADR si:**
  - Apple deja de exentar las web apps de la pantalla de inicio o borra sus datos con frecuencia;
  - el producto necesita algo que una PWA en iOS no da;
  - la app crece hasta que un framework compense;
  - cambian las condiciones de GitHub Pages.

## 7. Fuentes

Consultadas el 2026-10-21.

- [F1] WebKit, "News from WWDC25… Safari 26 beta" (2025-06-09): <https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/>
- [F2] MDN, "Using Service Workers" (HTTPS, caché primero): <https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers>
- [F3] WebKit, "Tracking Prevention in WebKit" (exención del límite de 7 días y aislamiento de las web apps de la pantalla de inicio): <https://webkit.org/tracking-prevention/>
- [F4] WebKit, "Updates to Storage Policy" (2023-08-10; desalojo LRU, `persist()` por heurísticas): <https://webkit.org/blog/14403/updates-to-storage-policy/>
- [F5] MDN, "Storage quotas and eviction criteria": <https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria>
- [F6] WebKit Bugzilla 271401, "navigator.storage.persist() always return false" (abierto): <https://bugs.webkit.org/show_bug.cgi?id=271401>
- [F7] Guía de *sideloading* en iOS 26 con SideStore (fuente secundaria): <https://fr0stb1rd.is-a.dev/posts/ios-26-unlimited-sideload-sidestore-livecontainer/>
- [F8] Expo CLI: <https://docs.expo.dev/more/expo-cli/>
- [F9] Expo, "Internal distribution": <https://docs.expo.dev/build/internal-distribution/>
- [F10] Scriptable en la App Store: <https://apps.apple.com/app/scriptable/id1405459188>
- [F11] GitHub Docs, "Creating a GitHub Pages site" (repositorios privados con Pro, Team o Enterprise): <https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site>
- [F12] GitHub Docs, "Verifying your custom domain for GitHub Pages": <https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages>
- [F13] GitHub Docs, "Securing your GitHub Pages site with HTTPS": <https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https>
- [F14] Node.js, "Test runner": <https://nodejs.org/api/test.html>
- [F15] Playwright, "Service Workers" (solo en Chromium): <https://playwright.dev/docs/service-workers>
- [F16] Playwright, "Browsers": <https://playwright.dev/docs/browsers>
- [F17] GitHub Docs, "Manually running a workflow" ("Write access to the repository is required"): <https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow>
- [F18] GitHub Docs, "Deployments and environments" (en Pro/Team, aprobadores obligatorios solo en repositorios públicos; ramas de despliegue también en privados): <https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments>
- [F19] Workflow SDD (`victor-lg/sdd-workflow`): `historial/registro-D00-D59.md`, "D25 — Separar integración, publicación y recuperación"; aplicada en `docs/linea-base-v1.md` §7 ("Fusionar no es desplegar… un paso aparte (D25)").
