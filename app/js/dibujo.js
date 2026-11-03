// ADR-0003 §3.5 y §3.6: un solo renderizador WebGL, fuera de la página, para
// todos los dibujos. Cada tarjeta y cada miniatura tiene su propio lienzo 2D,
// donde se copia lo que pinta. El dibujo recibe la carga del modelo de vista
// (vista.js) y no calcula nada; las piezas las modela modelo3d.js.
import {
  ACESFilmicToneMapping,
  DirectionalLight,
  Group,
  OrthographicCamera,
  PCFSoftShadowMap,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from '../vendor/three/three.module.min.js';
import {
  entorno,
  luces,
  estructura,
  disco,
  collarin,
  posiciones,
  mediaBarra,
  grosor,
  largoManga,
  abrirPalanca,
  abrirRanura,
  PALANCA_ABIERTA,
  RANURA_ABIERTA,
  RANURA_CERRADA,
  FUENTES_ROTULO,
} from './modelo3d.js';

// Notas §4.1: cámara ortográfica "aún más de frente", con 540 mm de alto
// visible en las barras y 600 en la máquina; lienzo de proporción 1,25 y hasta
// 2× la resolución del dispositivo.
const DIRECCION = new Vector3(0.6, 0.16, 0.784).normalize();
const OBJETIVO = new Vector3(110, -10, 0);
const RESOLUCION_MAXIMA = 2;
// Las miniaturas, de frente y todas a la misma escala (notas §4.3).
const MINIATURA = { ancho: 264, alto: 90, mitad: 410, centro: new Vector3(30, -2, 0), direccion: new Vector3(0, 0.28, 0.96).normalize() };

// SPEC-CALC-003 FR-11 y notas §6: mientras se escribe un peso, el dibujo espera
// 400 ms desde la última tecla, y cada tarjeta empieza su animación 90 ms
// después de la anterior. Las curvas, como en la referencia visual.
const ESPERA_MS = 400;
const DESFASE_MS = 90;
const salida = (x) => x * x * x;
const entrada = (x) => 1 - (1 - x) ** 3;
const rebote = (x) => 1 + 2.9 * (x - 1) ** 3 + 1.9 * (x - 1) ** 2;
// FR-13: con "Reducir movimiento", ninguna animación.
const sinMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function mover(o, que, valor) {
  if (que === 'x') o.position.x = valor;
  else if (que === 'palanca') abrirPalanca(o, valor);
  else abrirRanura(o, valor);
}

// El renderizador, con la salida de las notas §4.1. Lanza un error si el
// dispositivo no puede dibujar en 3D o no tiene lienzos 2D donde copiar los
// dibujos; entonces libera el contexto que hubiera creado.
function preparar() {
  const lienzo3d = document.createElement('canvas');
  const renderer = new WebGLRenderer({ canvas: lienzo3d, antialias: true, alpha: true, preserveDrawingBuffer: true });
  try {
    if (!document.createElement('canvas').getContext('2d') || !('ResizeObserver' in window)) throw new Error('Sin lienzo 2D');
  } catch (e) {
    renderer.dispose();
    renderer.forceContextLoss();
    throw e;
  }
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  return { lienzo3d, renderer };
}

// Prepara el dibujo. Devuelve null si el dispositivo no puede dibujar en 3D o
// falla al prepararlo (SPEC-CALC-003 FR-14). `alPerder` se llama una vez si el
// sistema retira el contexto gráfico, o si pintar falla; desde entonces el
// motor no pinta nada más.
export function crearMotor({ alPerder }) {
  let base;
  try {
    base = preparar();
  } catch {
    return null;
  }
  const { lienzo3d, renderer } = base;
  // La escena se ilumina antes del primer dibujo, no al arrancar: generar el
  // entorno tarda, y el texto de las tarjetas no tiene que esperarlo.
  const escena = new Scene();

  // Desde que se pierde, el motor se libera y no pinta nada más.
  let perdido = false;
  const perder = () => {
    if (perdido) return;
    perdido = true;
    observador.disconnect();
    renderer.dispose();
    alPerder();
  };
  lienzo3d.addEventListener('webglcontextlost', perder);
  // Un sombreador que no compila no lanza ningún error en three.js: dejaría el
  // lienzo vacío con una etiqueta que describe la carga.
  renderer.debug.onShaderError = perder;

  const camara = new OrthographicCamera();
  let equipo = null;
  // Cambiar el tamaño del renderizador vacía su imagen: solo se hace si cambia.
  let tamano = '';
  const medir = (ancho, alto) => {
    if (tamano === `${ancho}×${alto}`) return;
    tamano = `${ancho}×${alto}`;
    renderer.setSize(ancho, alto, false);
  };

  // Cada lienzo de tarjeta, con la carga que tiene que mostrar (`carga`), la
  // que muestra (`mostrada`, FR-16), el grupo con sus discos y su collarín, los
  // movimientos en curso y la firma de lo último que se pintó.
  const tarjetas = new Map();
  // FR-11: las cargas nuevas que aún no se han empezado a dibujar, y el reloj
  // de la espera mientras se escribe un peso.
  const cola = new Map();
  let reloj = null;
  let enCola = false;
  const observador = new ResizeObserver(() => pintarPendientes());
  // Un cambio de carga sin cambio de tamaño se pinta antes del siguiente fotograma.
  let programado = false;
  const programar = () => {
    if (programado) return;
    programado = true;
    requestAnimationFrame(() => {
      programado = false;
      pintarPendientes();
    });
  };

  // SPEC-CALC-003 §11: los discos se rotulan con Barlow Semi Condensed; hasta
  // que está cargada no se modela ninguno. Después se ilumina la escena; un
  // fallo ahí es un fallo al prepararlo (FR-14).
  let listo = false;
  // Las miniaturas por pintar: se pintan una vez, cuando se ven por primera
  // vez (el panel Carga arranca plegado).
  const miniaturas = new Map();
  Promise.all(FUENTES_ROTULO.map((f) => document.fonts?.load(f).catch(() => {})))
    .then(() => requestAnimationFrame(() => {
      try {
        escena.environment = entorno(renderer);
        escena.add(...luces());
      } catch {
        perder();
        return;
      }
      listo = true;
      pintarPendientes();
    }));

  // FR-10 y FR-11: la tarjeta, ya cargada y sin animación.
  function montar(t) {
    t.grupo = new Group();
    t.piezas = [];
    t.collar = null;
    poner(t, 0);
    t.mostrada = t.carga;
  }

  // Coloca en su sitio, sin animación, los discos de la carga desde el
  // índice `k` y el collarín, si lo lleva.
  function poner(t, k) {
    const x = posiciones(t.carga.discos);
    for (let i = k; i < t.carga.discos.length; i++) {
      const o = disco(t.carga.discos[i]);
      o.position.x = x.discos[i];
      t.grupo.add(o);
      t.piezas.push({ cent: t.carga.discos[i], o });
    }
    if (t.carga.collarin) {
      t.collar = collarin();
      t.collar.position.x = x.collarin;
      t.grupo.add(t.collar);
    }
  }

  // FR-12: los movimientos en curso terminan de golpe, en su posición final.
  function acabar(t) {
    for (const m of t.movimientos) {
      if (!m.empezado) m.alEmpezar?.();
      mover(m.o, m.que, m.hasta);
      m.alAcabar?.();
    }
    t.movimientos = [];
  }

  // SPEC-CALC-003 FR-11 y notas §6: cambia la carga de una tarjeta. Se
  // conservan los discos interiores que no cambian y solo se anima lo que
  // cambia: sale el collarín, salen los discos que sobran de fuera hacia dentro
  // y de uno en uno, entran los nuevos del más pesado al más ligero y entra el
  // collarín, que se cierra. Al cambiar de equipo, la tarjeta se vacía y se
  // carga de nuevo. Devuelve si se anima.
  function cambiar(t, carga, retraso) {
    acabar(t);
    const antes = t.carga;
    t.carga = carga;
    // Una tarjeta que aún no se ha pintado se monta ya con la carga nueva.
    if (!t.grupo) {
      t.mostrada = carga;
      return false;
    }
    t.sucio = true;
    if (carga.equipo !== antes.equipo) {
      for (const { o } of t.piezas) t.grupo.remove(o);
      if (t.collar) t.grupo.remove(t.collar);
      t.piezas = [];
      t.collar = null;
    }
    let k = 0;
    while (k < t.piezas.length && t.piezas[k].cent === carga.discos[k]) k++;
    if (k === t.piezas.length && k === carga.discos.length && Boolean(t.collar) === carga.collarin) {
      t.mostrada = carga;
      return false;
    }
    const sobran = t.piezas.splice(k).reverse();
    if (sinMovimiento()) {
      for (const { o } of sobran) t.grupo.remove(o);
      if (t.collar) t.grupo.remove(t.collar);
      t.collar = null;
      poner(t, k);
      t.mostrada = carga;
      return false;
    }

    const inicio = performance.now();
    const fin = largoManga(carga.equipo);
    const fuera = (cent) => fin + 40 + grosor(cent) / 2;
    const x = posiciones(carga.discos);
    // Añade un movimiento que empieza `desde` ms después del inicio y devuelve
    // cuándo termina.
    const movimiento = (o, que, de, a, desde, dur, curva, extra = {}) => {
      t.movimientos.push({ o, que, desde: de, hasta: a, t0: inicio + desde, dur, curva, ...extra });
      return desde + dur;
    };
    let ms = retraso;
    // 1. Se abre la palanca y sale el collarín.
    if (t.collar) {
      const c = t.collar;
      t.collar = null;
      movimiento(c, 'ranura', RANURA_CERRADA, RANURA_ABIERTA, ms + 60, 160, entrada);
      ms = movimiento(c, 'palanca', 0, PALANCA_ABIERTA, ms, 220, entrada);
      ms = movimiento(c, 'x', c.position.x, fin + 80, ms, 260, salida, { alAcabar: () => t.grupo.remove(c) });
    }
    // 2. Salen los que sobran, de fuera hacia dentro: el siguiente no se mueve
    // hasta que el anterior ha salido de la manga.
    for (const { cent, o } of sobran) {
      const hasta = fuera(cent) + 60;
      ms = movimiento(o, 'x', o.position.x, hasta, ms, 140 + (hasta - o.position.x) * 0.5, salida, { alAcabar: () => t.grupo.remove(o) });
    }
    // 3. Entran los nuevos, del más pesado al más ligero, ocultos hasta que les
    // toca; cada uno empieza al 75 % del anterior.
    let anterior = null;
    for (let i = k; i < carga.discos.length; i++) {
      const cent = carga.discos[i];
      const o = disco(cent);
      const desdeX = fuera(cent);
      o.position.x = desdeX;
      o.visible = false;
      t.grupo.add(o);
      t.piezas.push({ cent, o });
      const dur = 220 + (desdeX - x.discos[i]) * 0.7;
      const empieza = anterior ? anterior.empieza + anterior.dur * 0.75 : ms;
      movimiento(o, 'x', desdeX, x.discos[i], empieza, dur, entrada, { alEmpezar: () => { o.visible = true; } });
      anterior = { empieza, dur };
      ms = Math.max(ms, empieza + dur);
    }
    // 4. Entra el collarín con la palanca abierta y la cierra al llegar.
    if (carga.collarin) {
      const c = collarin();
      abrirPalanca(c, PALANCA_ABIERTA);
      abrirRanura(c, RANURA_ABIERTA);
      c.position.x = fin + 80;
      c.visible = false;
      t.grupo.add(c);
      t.collar = c;
      ms = movimiento(c, 'x', fin + 80, x.collarin, ms + 60, 200 + (fin + 80 - x.collarin) * 0.6, entrada, { alEmpezar: () => { c.visible = true; } });
      movimiento(c, 'palanca', PALANCA_ABIERTA, 0, ms + 40, 340, rebote);
      movimiento(c, 'ranura', RANURA_ABIERTA, RANURA_CERRADA, ms + 200, 180, entrada);
    }
    return true;
  }

  // Avanza los movimientos de una tarjeta hasta `ahora`. Al terminar el último,
  // el dibujo muestra su carga (FR-16). Devuelve si hay que repintarla.
  function avanzar(t, ahora) {
    if (!t.movimientos.length) return false;
    t.movimientos = t.movimientos.filter((m) => {
      const k = (ahora - m.t0) / m.dur;
      if (k < 0) return true;
      if (!m.empezado) {
        m.empezado = true;
        m.alEmpezar?.();
      }
      mover(m.o, m.que, m.desde + (m.hasta - m.desde) * m.curva(Math.min(1, k)));
      if (k < 1) return true;
      m.alAcabar?.();
      return false;
    });
    if (!t.movimientos.length) t.mostrada = t.carga;
    return true;
  }

  // FR-11: empieza a dibujar las cargas de la cola, en el orden de las
  // tarjetas; cada una que se anima empieza 90 ms después de la anterior.
  function aplicarCola() {
    clearTimeout(reloj);
    reloj = null;
    enCola = false;
    if (perdido) return;
    const lista = [...cola].filter(([lienzo]) => tarjetas.has(lienzo) && lienzo.isConnected);
    cola.clear();
    lista.sort(([a], [b]) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    let n = 0;
    for (const [lienzo, carga] of lista) {
      if (cambiar(tarjetas.get(lienzo), carga, n * DESFASE_MS)) n += 1;
    }
    programar();
  }

  function usarEquipo(id) {
    if (equipo === id) return;
    if (equipo !== null) escena.remove(estructura(equipo));
    escena.add(estructura(id));
    equipo = id;
  }

  function encuadrar(ancho, alto) {
    const visible = equipo === 'maquina' ? 600 : 540;
    const a = (visible * ancho) / alto;
    Object.assign(camara, { left: -a / 2, right: a / 2, top: visible / 2, bottom: -visible / 2, near: 1, far: 5000 });
    camara.position.copy(OBJETIVO).addScaledVector(DIRECCION, 2000);
    camara.up.set(0, 1, 0);
    camara.lookAt(OBJETIVO);
    camara.updateProjectionMatrix();
  }

  // Pinta una tarjeta y expone lo que muestra (SPEC-CALC-003 FR-16): la
  // etiqueta accesible describe la carga dibujada.
  function pintar(lienzo, t, ancho, alto) {
    if (!t.grupo) montar(t);
    for (const otra of tarjetas.values()) if (otra.grupo) otra.grupo.visible = otra === t;
    if (!t.grupo.parent) escena.add(t.grupo);
    usarEquipo(t.carga.equipo);
    if (lienzo.width !== ancho || lienzo.height !== alto) {
      lienzo.width = ancho;
      lienzo.height = alto;
    }
    medir(ancho, alto);
    encuadrar(ancho, alto);
    renderer.render(escena, camara);
    if (perdido) return;
    // Si el contexto se ha perdido y aún no ha llegado su evento, no se borra
    // lo pintado: se sigue viendo hasta que la app pasa a la vista de FR-14.
    if (renderer.getContext().isContextLost()) throw new Error('Contexto perdido');
    const ctx = lienzo.getContext('2d');
    ctx.clearRect(0, 0, ancho, alto);
    ctx.drawImage(lienzo3d, 0, 0);
    // Los discos y el collarín, los que se ven en la escena, de dentro afuera;
    // la etiqueta, la de la carga que muestra al terminar de cambiar.
    const vistas = t.grupo.children.filter((o) => o.visible).sort((a, b) => a.position.x - b.position.x);
    lienzo.dataset.equipo = t.carga.equipo;
    lienzo.dataset.discos = vistas.filter((o) => o.userData.cent).map((o) => o.userData.cent).join(',');
    lienzo.dataset.collarin = String(vistas.some((o) => o.name === 'collarin'));
    lienzo.dataset.animando = String(t.movimientos.length > 0);
    lienzo.setAttribute('aria-label', t.mostrada.etiqueta);
    lienzo.removeAttribute('aria-hidden');
  }

  // ADR-0003 §3.5: solo se repintan las tarjetas que lo necesitan: las que
  // cambian de tamaño o de carga y las que tienen una animación en curso. Las
  // que ya no están en la página se olvidan.
  function pintarPendientes() {
    for (const [lienzo, t] of tarjetas) {
      if (lienzo.isConnected) continue;
      observador.unobserve(lienzo);
      if (t.grupo) escena.remove(t.grupo);
      tarjetas.delete(lienzo);
    }
    if (!listo || perdido) return;
    for (const [lienzo, id] of miniaturas) {
      if (!lienzo.clientWidth) continue;
      miniaturas.delete(lienzo);
      observador.unobserve(lienzo);
      pintarMiniatura({ lienzo, id });
    }
    const resolucion = Math.min(window.devicePixelRatio || 1, RESOLUCION_MAXIMA);
    const ahora = performance.now();
    try {
      for (const [lienzo, t] of tarjetas) {
        const ancho = Math.round(lienzo.clientWidth * resolucion);
        const alto = Math.round(lienzo.clientHeight * resolucion);
        const firma = `${ancho}×${alto}`;
        const mueve = avanzar(t, ahora);
        if (!ancho || !alto || (t.firma === firma && !t.sucio && !mueve)) continue;
        pintar(lienzo, t, ancho, alto);
        t.firma = firma;
        t.sucio = false;
      }
      if ([...tarjetas.values()].some((t) => t.movimientos.length)) programar();
    } catch {
      // SPEC-CALC-003 FR-14: un error al pintar se trata como un fallo al
      // prepararlo (decisión de Víctor del 2026-11-03, PR #33).
      perder();
    }
  }

  function pintarMiniatura(m) {
    if (perdido) return;
    try {
      dibujarMiniatura(m);
    } catch {
      perder();
    }
  }

  function dibujarMiniatura({ lienzo, id }) {
    const { ancho, alto, mitad, centro, direccion } = MINIATURA;
    const escenaMini = new Scene();
    escenaMini.environment = escena.environment;
    const luz = new DirectionalLight(0xffffff, 1.6);
    luz.position.set(-900, 1100, 900);
    escenaMini.add(luz, mediaBarra(id));
    const cam = new OrthographicCamera(-mitad, mitad, (mitad * alto) / ancho, (-mitad * alto) / ancho, 1, 8000);
    cam.position.copy(centro).addScaledVector(direccion, 3000);
    cam.lookAt(centro);
    medir(ancho, alto);
    renderer.toneMappingExposure = 1.4;
    renderer.render(escenaMini, cam);
    renderer.toneMappingExposure = 1.05;
    if (renderer.getContext().isContextLost()) throw new Error('Contexto perdido');
    lienzo.width = ancho;
    lienzo.height = alto;
    lienzo.getContext('2d').drawImage(lienzo3d, 0, 0);
  }

  return {
    // SPEC-CALC-003 FR-07 y FR-10: el lienzo de una tarjeta (index.html,
    // #plantilla-dibujo) con su carga. Un lienzo nuevo aparece ya cargado y
    // hasta pintarse no se anuncia. En uno que ya está, la carga nueva se
    // anima (FR-11): con `esperar`, 400 ms después de la última llamada que
    // espera; sin él, al momento, junto con las que estuvieran esperando. Un
    // lienzo que ya tiene esa carga no cambia.
    dibujar(lienzo, carga, { esperar = false } = {}) {
      const t = tarjetas.get(lienzo);
      if (!t) {
        tarjetas.set(lienzo, { carga, mostrada: carga, grupo: null, piezas: [], collar: null, movimientos: [], firma: null, sucio: false });
        observador.observe(lienzo);
        return;
      }
      if (igual(cola.get(lienzo) ?? t.carga, carga)) return;
      cola.set(lienzo, carga);
      if (esperar) {
        this.esperar();
        return;
      }
      clearTimeout(reloj);
      reloj = null;
      if (enCola) return;
      enCola = true;
      queueMicrotask(aplicarCola);
    },
    // FR-11: una tecla en un campo de peso vuelve a empezar la espera.
    esperar() {
      if (enCola || !cola.size) return;
      clearTimeout(reloj);
      reloj = setTimeout(aplicarCola, ESPERA_MS);
    },
    // SPEC-CALC-003 FR-07: la miniatura de una ficha de barra.
    miniatura(lienzo, id) {
      miniaturas.set(lienzo, id);
      observador.observe(lienzo);
    },
  };
}
