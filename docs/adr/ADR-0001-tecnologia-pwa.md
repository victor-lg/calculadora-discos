---
id: ADR-0001
titulo: Tecnología de la calculadora de discos — PWA sin framework, alojada en GitHub Pages
estado: Propuesto         # Propuesto | Aceptado | Rechazado | Sustituido
fecha: 2026-10-21
sustituye: null
sustituido_por: null
referencias: [SPEC-CALC-001, docs/vision.md]
---

<!--
Redactado por Claude a partir de SPEC-CALC-001 v0.2 (en `main`), docs/vision.md
y AGENTS.md. Las fuentes externas se consultaron el 2026-10-21 y se citan en el
apartado 7. Se distinguen los hechos (con fuente), las hipótesis (sin verificar
en el iPhone de Víctor) y las propuestas. Nada de esto es norma hasta que una
persona fusione el PR.
-->

# ADR-0001 — Tecnología de la calculadora de discos

## 1. Contexto

- **Problema.** SPEC-CALC-001 (§11) deja la tecnología a un ADR técnico. Sin él no se puede pasar a la etapa técnica: no hay `src/`, ni tests del stack, ni CI de tests, y los AC de la spec no se pueden cubrir (G3).
- **Restricciones del producto** (`docs/vision.md`, SPEC-CALC-001 §3 y §11):
  - un solo usuario, en su iPhone;
  - sin Mac y sin publicar en la App Store;
  - 100 % sin conexión después de la primera carga (NFR-01, AC-12);
  - ninguna petición de red sale del propio origen de la app, y ninguna lleva datos de la persona (NFR-02, AC-13);
  - la lista de porcentajes se guarda en el dispositivo y se recupera al arrancar de cero; el resto del estado no se guarda (FR-11, AC-11); al volver de segundo plano se conserva todo (AC-22);
  - el cálculo se rehace al momento, sin botón (FR-10).
- **Restricciones del workflow** (AGENTS.md): el mínimo de dependencias, porque una dependencia nueva es R2, y cada AC con al menos un test que lo cite como `SPEC-CALC-001/AC-NN`.
- **Si no se decide**, no se puede implementar SPEC-CALC-001.

## 2. Alternativas consideradas

Solo se comparan las que se pueden instalar en un iPhone sin Mac y sin App Store.

### Opción A: PWA (web instalada en la pantalla de inicio)

HTML, CSS y JavaScript servidos por HTTPS, con un service worker que guarda la app en caché. Se instala con Safari → Compartir → "Añadir a pantalla de inicio".

- **Ventajas:**
  - No necesita Mac, cuenta de desarrollador ni firma. Desde iOS 26, cualquier web añadida a la pantalla de inicio se abre por defecto como web app, y basta un HTML y una URL [F1][F2].
  - El service worker y la Cache API permiten arrancar sin red después de la primera carga [F3], que es justo lo que piden NFR-01 y AC-12.
  - El origen de la web app de la pantalla de inicio está exento del límite de 7 días de ITP, y sus datos se guardan aparte de los de Safari [F4].
  - Se actualiza sola al publicar, sin reinstalar ni volver a firmar.
  - Se puede probar entera en Linux y en la CI: Node para la lógica y un navegador sin interfaz para la parte web.
- **Inconvenientes:**
  - La instalación es manual (Compartir → Añadir a pantalla de inicio). No hay aviso de instalación.
  - En Safari, el almacenamiento es "best-effort" por defecto [F5][F6]. En una web app de la pantalla de inicio, que está exenta del límite de 7 días [F4], el borrado que documentan las fuentes es por falta de espacio. El tiempo sin usarse solo decide qué origen se borra antes, porque el desalojo es LRU [F5]. `navigator.storage.persist()` no garantiza nada: WebKit lo concede según heurísticas, entre ellas si la web se usa como app de la pantalla de inicio [F5], y hay un error abierto que dice que en Safari 17 siempre devuelve `false` [F7].
  - Necesita HTTPS: el service worker solo funciona en un contexto seguro [F3].
- **Riesgos:**
  - Que iOS borre la lista guardada. El impacto es bajo: FR-11 ya define qué pasa si faltan los datos (vuelve a 40/70/90).
  - Apple puede cambiar el comportamiento de las web apps entre versiones de iOS. Ya lo hizo, en sentido favorable, en iOS 26 [F1].

### Opción B: app nativa en Swift, instalada sin App Store

Se compila en la nube, en un runner macOS de GitHub Actions, y se instala por *sideloading* (AltStore, SideStore o Sideloadly) o por distribución ad hoc.

- **Ventajas:** acceso total a iOS, almacenamiento nativo (`UserDefaults`) sin desalojo y funcionamiento sin conexión de serie.
- **Inconvenientes:**
  - Con un Apple ID gratuito, la app firmada caduca a los 7 días y hay que volver a firmarla desde un ordenador o con SideStore [F8]. La fuente es secundaria y no la he contrastado con documentación de Apple.
  - Con la cuenta de pago (Apple Developer Program, de pago anual) la firma dura más (no lo he verificado en una fuente primaria), pero sigue haciendo falta firmar, gestionar perfiles y compilar en macOS (en la nube, porque no hay Mac).
  - La CI con runner macOS y la firma son mucha infraestructura para una pantalla.
- **Riesgos:** que la app deje de abrirse en el gimnasio porque ha caducado la firma, lo que rompe de hecho NFR-01. Además, dependeríamos de herramientas de *sideloading* de terceros.

### Opción C: React Native con Expo

- **Ventajas:** un ecosistema conocido y desarrollo desde Windows o Linux.
- **Inconvenientes:**
  - Expo Go carga el código desde un servidor de desarrollo, así que no sirve como app independiente sin conexión [F9].
  - Una build instalable fuera de la App Store (distribución interna ad hoc con EAS) exige cuenta de pago de Apple y registrar el UDID del dispositivo [F10].
  - Añade decenas de dependencias, todas R2 según AGENTS.md.
- **Riesgos:** los mismos que B (firma y caducidad), más el coste de mantener el árbol de dependencias.

### Opción D: Atajos de Apple o Scriptable

Un atajo, o un script de Scriptable, que pida el peso y muestre los discos.

- **Ventajas:** nada que alojar ni firmar; funciona sin red; Scriptable ejecuta JavaScript [F11].
- **Inconvenientes:**
  - En Atajos, la interfaz es una secuencia de diálogos, así que no puede cumplir FR-10 (recálculo al momento al cambiar cualquier dato) ni mostrar todas las series a la vez con avisos (FR-08, FR-12).
  - Scriptable sí puede mostrar una vista web con HTML y JavaScript propios. Eso no lo he verificado en su documentación. Si es así, cumpliría FR-10. Pero entonces sería la opción A metida dentro de una app de terceros, con dos costes: dependeríamos de esa app, y cada versión habría que copiarla a mano al teléfono. La integración tampoco se podría probar en la CI.
  - Con Atajos, no hay una forma razonable de probarlo en la CI ni de cumplir G3.
  - Scriptable es una app de terceros (gratuita, de la App Store) de la que dependeríamos.
- **Riesgos:** quedarse fuera de la spec aprobada.

### Con framework o sin él (dentro de la opción A)

- **Sin framework (JavaScript con módulos ES, sin paso de compilación):**
  - cero dependencias en tiempo de ejecución;
  - lo que se publica es lo que hay en el repositorio, salvo la versión que se inyecta en `sw.js` al publicar (§3.3);
  - nada que actualizar por seguridad.

  La interfaz es una sola pantalla con unos pocos campos y una lista, y FR-10 se resuelve con un único `render()` que se llama en cada evento `input`.
- **Con un framework ligero (Preact, Lit o Svelte):** daría un estado reactivo más cómodo, pero añade al menos una dependencia R2 y, en Svelte, un paso de compilación. No compensa para una sola pantalla.

## 3. Decisión

Se propone la **opción A, una PWA sin framework**:

- es la única opción que no necesita firma, que no caduca y que no depende de una app de terceros;
- cumple NFR-01 con un service worker y NFR-02 sin ningún tercero;
- se prueba casi entera en Linux;
- tiene cero dependencias en tiempo de ejecución.

Estas son sus reglas.

**Cuándo se aplica:** a toda la app, incluidas las capacidades futuras de `docs/vision.md` (máquinas de placas y poleas, y mancuernas), mientras sigan siendo de un solo usuario, sin conexión y sin servidor. Si alguna de esas condiciones cambia, hay que revisar este ADR (§6).

### 3.1 Tecnología y estructura

- HTML, CSS y JavaScript estándar con módulos ES, **sin framework, sin bundler y sin paso de compilación**. Cero dependencias en tiempo de ejecución.
- La lógica va en módulos puros, sin DOM, que se prueban con Node:
  - el análisis de la entrada;
  - el cálculo de objetivos y discos;
  - el formato de números;
  - la validación de la lista guardada;
  - un **modelo de vista** completo, a partir del estado: las series, y todos los textos que se muestran (mensajes de error, indicaciones, "Solo barra (X kg) · 0 kg por lado", avisos) y qué campos se pueden editar.

  La interfaz es una capa fina que lee el estado, pide el modelo de vista y lo pinta tal cual, sin decidir nada. Los textos se pintan con `textContent`, nunca con `innerHTML`. Así los tests unitarios prueban también los textos que exigen los AC.
- Un `manifest.webmanifest` con nombre, iconos y `display: standalone`. iOS 26 no lo exige [F2], pero sus iconos y ajustes se usan si existe. `start_url` y `scope` son relativos (`./`), así que la app funciona igual en la raíz del subdominio propio (§3.5) o en cualquier otra ruta.
- Todo el JavaScript y el CSS van en ficheros propios, nunca en línea, para que la CSP de §3.4 no tenga que relajarse.

### 3.2 Almacenamiento local (FR-11, AC-11, AC-22)

- La lista de porcentajes se guarda en **`localStorage`**, bajo una clave con versión (por ejemplo, `calculadora-discos:v1:porcentajes`), como JSON.
  - Es síncrono y basta para unos pocos bytes.
  - Para Safari, IndexedDB no es más duradero: el desalojo borra todos los datos del origen a la vez [F6].
- Se guarda en cada cambio de la lista. Al arrancar de cero se lee y se valida. Si falta, no se puede leer o no es válida, la lista es 40/70/90 (FR-11). Todo acceso a `localStorage` va en `try/catch`, y un fallo cuenta como "no se puede leer".
- Lo guardado es válido solo si es un array JSON de números enteros (tipo número, no cadenas) del 1 al 99, que es la traducción de FR-04 al dato guardado. Cualquier otra cosa no es válida: JSON roto, un objeto, `"40"`, `40.5`, `0`, `150`, `null`… Un array vacío sí es válido (FR-11).
- **No se guardan** el modo, la barra, el peso de la barra ni el peso de trabajo (FR-11). Viven solo en memoria. Cuando la app vuelve de segundo plano sin haber terminado, el estado en memoria se conserva solo (AC-22).
- **Si iOS termina el proceso mientras la app está en segundo plano**, la vuelta es un **arranque de cero** y se aplica FR-11: se recupera la lista y se pierden el modo, la barra y el peso de trabajo. Lo decidió Víctor el 2026-10-21 (§6.3). No se guarda ningún estado de sesión, así que la spec no cambia.
- Se llama a `navigator.storage.persist()` en cada arranque, como mejora sin garantía [F5]. La recomendación de pedirlo en cada arranque es una hipótesis: viene de un foro sin respuesta de Apple [F12]. No tiene coste, y la app no depende de su resultado.
- **Hecho:** los datos de la web app de la pantalla de inicio están aislados de los de Safari [F4]. La lista que se edite en una pestaña de Safari no aparece en la app instalada, y al revés.
  - Lo mismo vale, por deducción, para la caché del service worker: la caché que se llena en la pestaña no tiene por qué servirle a la app instalada.
  - Por eso, en la práctica, la "primera carga" de NFR-01 es la primera vez que se abre la app **desde el icono y con conexión**. Se instala primero y se usa siempre desde el icono.

### 3.3 Funcionamiento sin conexión (NFR-01, AC-12)

- Un service worker propio, sin librerías (Workbox no hace falta), que:
  - en `install`, precarga en una caché versionada (`calculadora-discos-<versión>`) **todos** los ficheros de la app: HTML, CSS, JS, manifiesto e iconos. La raíz de la app (`./`) y `index.html` se precargan los dos, y `start_url` coincide con una de esas claves; si no, la app no abre sin conexión.
    - Cada fichero se pide **saltándose la caché HTTP del navegador** (`new Request(url, { cache: 'reload' })`). Si no, la caché de la versión nueva podría llenarse con ficheros de la anterior que el navegador aún guarda;
  - en `activate`, borra las cachés de versiones anteriores;
  - en `fetch`, responde **primero desde la caché de su propia versión** (no con `caches.match()` sobre todas las cachés) y solo va a la red si el recurso no está [F3].
- **La versión no se cambia a mano.** El workflow de publicación sustituye un marcador de `sw.js` por el SHA del commit publicado. Es una sustitución de texto en el despliegue, no un paso de compilación: el repositorio sigue siendo lo que se sirve, salvo ese valor. Así, cada publicación cambia `sw.js` byte a byte y el navegador instala el service worker nuevo.
- **Activación:** sin `skipWaiting()` ni `clients.claim()`, que es el ciclo de vida estándar.
  1. Con conexión, la versión nueva se descarga e instala en una apertura de la app.
  2. Se activa cuando ya no queda ninguna ventana de la app abierta. Una app suspendida en segundo plano sigue contando como abierta, así que en iOS puede tardar hasta que el sistema o Víctor cierren el proceso. Es una hipótesis (§5).

  Así una actualización nunca cambia el código a mitad de un uso. Sin conexión, la app sigue con la versión instalada.
- La app no hace ninguna petición en tiempo de ejecución: no hay API, fuentes externas, analítica ni CDN. Todo lo que necesita está en la caché desde la primera carga.

### 3.4 Origen único y privacidad (NFR-02, AC-13)

- Todos los recursos se sirven desde el propio origen. No se usan CDN, fuentes de Google, analítica ni ningún tercero.
- Una política CSP en una etiqueta `<meta http-equiv="Content-Security-Policy">` (`default-src 'self'; connect-src 'self'; …`), como primer elemento del `<head>`, hace que el navegador bloquee las peticiones **del documento** a otro origen, aunque se cuele una por error. Va en `<meta>` porque GitHub Pages no permite cabeceras HTTP propias.
- Esa CSP **no cubre el service worker**: el service worker tomaría su CSP de las cabeceras de la respuesta de `sw.js`, y Pages no las envía. Las peticiones del service worker las controlan:
  - el test E2E de AC-13 en Chromium, que sí ve su tráfico [F17];
  - la revisión de código: `sw.js` solo pide rutas relativas de la propia app.
- La app no envía nada: no hay formularios con `action`, `fetch` con datos ni *beacons*. Las únicas peticiones son la descarga y la actualización de los ficheros estáticos.

### 3.5 Alojamiento (HTTPS)

**Requisitos del alojamiento, sea cual sea:**
- sirve ficheros estáticos;
- usa HTTPS, que necesita el service worker [F3];
- publica desde este repositorio sin exponer secretos;
- no exige cabeceras propias (la app no depende de ellas, §3.4);
- su origen pasa a ser el "propio origen" de NFR-02.

**Decisión: GitHub Pages con un subdominio propio de Víctor** (§6.1 y §6.2, decididos por Víctor el 2026-10-21).

- Se publica con **GitHub Pages**, desde un workflow de GitHub Actions (`actions/deploy-pages`) que sube solo la carpeta de la app. El workflow:
  - se lanza al fusionar en `main`, solo si cambian ficheros de esa carpeta;
  - lleva las acciones fijadas por SHA;
  - tiene los permisos mínimos (`contents: read`, `pages: write`, `id-token: write`).
- Se descartan otros alojamientos estáticos (Cloudflare, Netlify) porque añadirían otra cuenta y otro tercero sin aportar nada que Pages no dé (§6.1).
  - Todos los sitios de Pages, también los que tienen un dominio propio bien configurado, admiten HTTPS. Con un dominio propio, GitHub pide el certificado a Let's Encrypt tras comprobar el DNS [F13]. Eso es lo que necesita el service worker.
  - Los límites (1 GB por sitio y 100 GB al mes de tráfico como límite blando) quedan muy lejos de lo que usa una app de pocos KB [F14].
- **Repositorio privado:** este repositorio es privado (lo comprobé el 2026-10-21 con `gh repo view`). En repositorios privados, Pages exige GitHub Pro, Team o Enterprise [F15]. Víctor tiene GitHub Pro (lo dice él; no lo he verificado). El sitio publicado es accesible para cualquiera aunque el repositorio sea privado. No es un problema, porque la app no contiene secretos ni datos de nadie.
- **Subdominio propio** (el nombre exacto se fija al configurarlo):
  - la app se sirve en la raíz de `https://<subdominio>/`, con un registro DNS hacia Pages y "Enforce HTTPS" activado [F13];
  - el origen queda aislado de los demás proyectos de `victor-lg.github.io`, que comparten origen entre sí. Ningún otro proyecto comparte su `localStorage`, y ningún service worker con alcance `/` de otro sitio de la cuenta puede controlar la app;
  - **el dominio se verifica en la cuenta de GitHub.** Si no, otro usuario podría reclamar el subdominio en Pages cuando el sitio se desactive o el repositorio cambie, y servir su propio `sw.js` en el mismo origen. GitHub recomienda esta verificación contra ese caso, y avisa de no usar registros DNS comodín [F19]. Si se deja de usar Pages, se borra el registro DNS del subdominio.
- **Relación con NFR-02:** el "propio origen" es `https://<subdominio>`. GitHub recibe las peticiones de descarga y actualización, como cualquier servidor, pero nunca datos de la persona, porque la app no los envía (§3.4).
- **Si el subdominio deja de apuntar a Pages** (DNS o certificado), la app instalada sigue funcionando sin conexión con la versión que tiene en caché. Solo deja de recibir actualizaciones.

### 3.6 Tests y CI

- **Ubicación y nombres de los tests:**
  - unitarios en `tests/unit/*.test.js`;
  - E2E en `tests/e2e/*.spec.js`.

  Encajan con `CARPETAS_TEST` y `RE_FICHERO_TEST` de `.github/sdd/checks.py` sin tocarlos. Cada runner recibe su ruta de forma explícita, para que uno no ejecute los tests del otro: el patrón en `node --test` y `testDir: 'tests/e2e'` en la configuración de Playwright.
- **Servidor para E2E:** un script propio de pocas líneas con `node:http`, que sirve la carpeta de la app en `localhost` (contexto seguro para el service worker [F3]). Playwright lo arranca con su opción `webServer`. No se añade ninguna dependencia para esto.
  - Los E2E usan el `sw.js` con el marcador de versión sin sustituir. Es la única diferencia con lo que se publica.
- **Tests unitarios: el runner integrado de Node (`node --test "tests/unit/**/*.test.js"`).**
  - Es estable desde Node 20 [F16] y añade **cero dependencias**.
  - Cubre el modelo de vista (§3.1), y con él la mayoría de los AC: AC-01 a AC-09, AC-11 (con un almacenamiento simulado), AC-14 a AC-21 y AC-23 a AC-26, incluidos sus textos.
  - Los nombres de los tests citan `SPEC-CALC-001/AC-NN`.
- **E2E: Playwright, solo para lo que no se puede probar sin navegador.** Es la única dependencia de desarrollo (R2 cuando se añada). Cubre:
  - **AC-10:** el recálculo en la interfaz.
  - **AC-11:** la lista recuperada tras recargar la página con `localStorage` real, y el estado inicial de la interfaz. Complementa el test unitario.
  - **AC-04:** las barras de 20 y 15 kg no permiten editar su peso en la interfaz.
  - **AC-12:** sin conexión tras la primera carga.
  - **AC-13:** las dos mitades del AC.
    - Durante un recorrido completo, todas las peticiones van al propio origen.
    - Ninguna lleva cuerpo, y ni las URL ni las cabeceras contienen los valores que se introducen en el recorrido (pesos, porcentajes, modo o barra).
  - **AC-22:** solo demuestra que la app no recarga la página ni reinicia los campos con `visibilitychange`, `pagehide` o `pageshow`. No demuestra el comportamiento de iOS: la evidencia de AC-22 es la comprobación manual.

  AC-12 y AC-13 se prueban en **Chromium**, porque Playwright solo intercepta el tráfico del service worker en navegadores basados en Chromium [F17]. Los AC de interfaz se prueban también en **WebKit** de Playwright, que es lo más cercano a Safari que corre en Linux [F18]. No es Safari de iOS.
- **Comprobación manual en el iPhone**, como punto fijo del PR de la entrega, que registra la versión de iOS:
  1. Abrir la URL en Safari y añadirla a la pantalla de inicio, comprobando que "Abrir como app web" está activado.
  2. Abrir la app **desde el icono, con conexión**, y cerrarla desde el selector de apps.
  3. Poner el modo avión, abrirla desde el icono y reproducir AC-01 (AC-12).
  4. Preparar el estado de AC-22: modo Barra, barra Z con 8,5 kg, 50 kg y 40/70/90. Pasar a otra app y volver: primero a los pocos segundos y luego tras varios minutos (AC-22 y la hipótesis de §5).
  5. Cambiar la lista, cerrar desde el selector de apps y volver a abrir (AC-11).

  Ningún test automático sustituye a esto en iOS. **AC-12 y AC-22 no se dan por cumplidos sin el resultado de esta comprobación en el PR de la entrega**, aunque la matriz de `checks-sdd` los vea cubiertos por los E2E.
- **CI:** un workflow nuevo, `.github/workflows/tests.yml`, en cada PR contra `main`, con las acciones fijadas por SHA, como en `sdd.yml`:
  1. `actions/setup-node`, con la versión mayor de Node LTS fijada en `.nvmrc`, como mínimo la 22, sin "LTS" flotante (el patrón glob de `node --test` no funciona en Node 20);
  2. `npm ci`, que instala desde `package-lock.json` exactamente la versión de Playwright fijada;
  3. `node --test "tests/unit/**/*.test.js"`;
  4. `npx playwright install --with-deps chromium webkit` y `npx playwright test` (con `testDir: 'tests/e2e'`), ambos con el Playwright instalado en el paso 2.

  Su job se marca como check requerido en la regla de `main`. Lo añade una persona, porque el token del agente no tiene el permiso `workflow`.

## 4. Consecuencias

- **Beneficios:**
  - sin coste de firma ni caducidades;
  - actualización automática;
  - cero dependencias en tiempo de ejecución y una sola de desarrollo;
  - casi toda la spec se prueba en Linux.
- **Costes y compromisos aceptados:**
  - instalación manual desde Safari;
  - el almacenamiento puede borrarse si el teléfono se queda sin espacio, y entonces la lista vuelve a 40/70/90 (comportamiento ya definido en FR-11);
  - las pruebas de iOS real son manuales.
- **Riesgos y mitigaciones:**

  | Riesgo | Mitigación |
  | --- | --- |
  | iOS borra la lista guardada | Llamar a `persist()` en cada arranque. Si se borra, el comportamiento lo define FR-11. Es una lista corta. |
  | iOS termina la app en segundo plano y se pierde el peso de trabajo | Aceptado: es un arranque de cero (§6.3). La comprobación manual mide con qué frecuencia pasa; si molesta en el uso real, se reabre con una spec nueva. |
  | Una actualización de iOS cambia el comportamiento de las web apps | Repetir la comprobación manual tras cada actualización mayor de iOS. |
  | Una petición a terceros se cuela (NFR-02) | CSP `default-src 'self'` en `<meta>` para el documento. Para el service worker, el test E2E de AC-13 y la revisión de código. |
  | El service worker sirve una versión vieja | SHA del commit inyectado en `sw.js` al publicar, precarga con `cache: 'reload'`, caché versionada y limpieza en `activate`. Con conexión, la versión nueva se instala en una apertura y se activa cuando la app se cierra del todo (§3.3). |
  | Alguien reclama el subdominio en Pages | Dominio verificado en la cuenta de GitHub y sin DNS comodín [F19]. Si se deja de usar Pages, se borra el registro DNS. |

- **Impacto en lo existente:** el proyecto pasa a la etapa técnica. Los cambios siguientes se hacen en PR propios, después de aceptar este ADR, y varios son R2:
  - `src/` y `tests/`;
  - `package.json`, `package-lock.json` y `.nvmrc`, con Playwright como dependencia de desarrollo (R2);
  - el workflow de tests y el de publicación (R2, los añade una persona);
  - el README con la etapa "técnica". Por sí solo no sube el nivel: `checks.py` solo lo sube a R2 si cambia la lista de rutas sensibles;
  - SPEC-CALC-001: enlazar ADR-0001 en `adr:` y actualizar §11 ("la candidata es una PWA"). Va en un PR de spec propio, después de aceptar este ADR;
  - `CARPETAS_TEST` en `.github/sdd/checks.py` no necesita cambios con los nombres de §3.6;
  - se puede valorar añadir `sw.js` y `index.html` (donde va la CSP) a las rutas sensibles del README en ese mismo PR. Eso sí es R2.

## 5. Validación

- La CI ejecuta en verde los tests unitarios y E2E, y la matriz AC ↔ tests de `checks-sdd` no deja ningún AC de SPEC-CALC-001 sin test.
- La comprobación manual de §3.6 pasa en el iPhone de Víctor, con la versión de iOS anotada.
- **Hipótesis por verificar en el dispositivo:**
  - que la lista guardada sobreviva varias semanas de uso normal;
  - con qué frecuencia iOS termina la app tras unos minutos en segundo plano (§3.2, §6.3);
  - cuánto tarda en activarse una versión nueva del service worker, si la app se queda suspendida en segundo plano (§3.3).

  Las fuentes (§7) describen el comportamiento hasta iOS 26. No he encontrado documentación de Apple específica de versiones posteriores, y el iPhone puede tener ya una versión más reciente.

## 6. Seguimiento

- **Decisiones de Víctor (2026-10-21, durante la revisión G4 del PR #3):**
  1. **Alojamiento:** GitHub Pages desde el repositorio privado, con su cuenta GitHub Pro. Se descartan hacer público el repositorio y usar otro alojamiento.
  2. **Dominio:** un subdominio propio en lugar de `victor-lg.github.io`, para aislar el origen (§3.5).
  3. **App terminada por iOS en segundo plano:** es un arranque de cero, y se aplica FR-11 (§3.2). La spec no cambia.
- **Pendiente:** el nombre exacto del subdominio. Se fija al configurar Pages; no cambia ninguna decisión de este ADR.
- **Condiciones para revisar este ADR:**
  - Apple deja de exentar las web apps de la pantalla de inicio del límite de ITP, o empieza a borrar sus datos con frecuencia;
  - el producto necesita algo que una PWA en iOS no da (por ejemplo, integración con Salud o widgets);
  - la app crece hasta el punto de que un framework compense su dependencia;
  - cambian los límites o condiciones de GitHub Pages.

## 7. Fuentes

Consultadas el 2026-10-21.

- **[F1]** WebKit, "News from WWDC25: Web technology coming this fall in Safari 26 beta" (2025-06-09): "By default, every website added to the Home Screen opens as a web app". <https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/>
- **[F2]** El mismo artículo: "nothing is required beyond the basics of an HTML file and a URL"; el manifiesto se usa si existe. Guía de usuario de Apple (no he podido leer su texto; solo enlace): <https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios>
- **[F3]** MDN, "Using Service Workers" (requisito de HTTPS y patrón *cache-first* con la Cache API): <https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers>
- **[F4]** WebKit, "Tracking Prevention in WebKit": "The first-party domain of home screen web applications is exempt from ITP's 7-day cap", y los datos de esas apps se guardan aparte de los de Safari. <https://webkit.org/tracking-prevention/>. Antecedente: WebKit, "Full Third-Party Cookie Blocking and More" (2020-03-24): <https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/>
- **[F5]** WebKit, "Updates to Storage Policy" (2023-08-10, Safari 17 / iOS 17): cuotas, desalojo LRU por origen, modo persistente y "WebKit currently grants a request based on heuristics like whether the website is opened as a Home Screen Web App". <https://webkit.org/blog/14403/updates-to-storage-policy/>
- **[F6]** MDN, "Storage quotas and eviction criteria" (Safari: cuotas, desalojo de 7 días en Safari y desalojo de todos los datos del origen a la vez): <https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria>
- **[F7]** WebKit Bugzilla 271401, "navigator.storage.persist() always return false" (2024-03-21, abierto, en pestañas de Safari 17): <https://bugs.webkit.org/show_bug.cgi?id=271401>
- **[F8]** Guía de *sideloading* en iOS 26 con SideStore : "Apps expire every 7 days" con Apple ID gratuito, como mucho 3 apps activas a la vez, y la instalación inicial necesita un ordenador. <https://fr0stb1rd.is-a.dev/posts/ios-26-unlimited-sideload-sidestore-livecontainer/>. Es una fuente secundaria.
- **[F9]** Expo CLI (Expo Go abre el proyecto desde el servidor de desarrollo que lanza `npx expo start`): <https://docs.expo.dev/more/expo-cli/>
- **[F10]** Expo, "Internal distribution": "This method requires a paid Apple Developer account". <https://docs.expo.dev/build/internal-distribution/>
- **[F11]** Scriptable en la App Store: <https://apps.apple.com/app/scriptable/id1405459188>
- **[F12]** Apple Developer Forums, "Safari iOS PWA Data Persistence Beyond 7 Days" (2022–2023, sin respuesta de Apple; anecdótico). Hay experiencia de desarrolladores de que `persist()` hay que pedirlo en cada arranque. <https://developer.apple.com/forums/thread/710157>
- **[F13]** GitHub Docs, "Securing your GitHub Pages site with HTTPS" (HTTPS también con dominio propio, certificado de Let's Encrypt y "Enforce HTTPS"): <https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https>
- **[F14]** GitHub Docs, "GitHub Pages limits": <https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits>
- **[F15]** GitHub Docs, "Creating a GitHub Pages site": "If the account that owns the repository uses GitHub Free or GitHub Free for organizations, the repository must be public." <https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site>
- **[F16]** Node.js, "Test runner" (estable desde Node 20): <https://nodejs.org/api/test.html>
- **[F17]** Playwright, "Service Workers": "Service workers are only supported on Chromium-based browsers". <https://playwright.dev/docs/service-workers>
- **[F18]** Playwright, "Browsers" (WebKit de Playwright, no Safari de marca; WebKit en Linux para la CI): <https://playwright.dev/docs/browsers>
- **[F19]** GitHub Docs, "Verifying your custom domain for GitHub Pages": la verificación "stops other GitHub users from taking over your custom domain"; también advierte contra los registros DNS comodín. <https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages>
