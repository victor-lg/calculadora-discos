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
import { entorno, luces, estructura, disco, collarin, posiciones, mediaBarra, FUENTES_ROTULO } from './modelo3d.js';

// Notas §4.1: cámara ortográfica "aún más de frente", con 540 mm de alto
// visible en las barras y 600 en la máquina; lienzo de proporción 1,25 y hasta
// 2× la resolución del dispositivo.
const DIRECCION = new Vector3(0.6, 0.16, 0.784).normalize();
const OBJETIVO = new Vector3(110, -10, 0);
const RESOLUCION_MAXIMA = 2;
// Las miniaturas, de frente y todas a la misma escala (notas §4.3).
const MINIATURA = { ancho: 264, alto: 90, mitad: 410, centro: new Vector3(30, -2, 0), direccion: new Vector3(0, 0.28, 0.96).normalize() };

// El renderizador, con la salida de las notas §4.1, y la escena con su entorno
// y sus luces. Lanza un error si el dispositivo no puede dibujar en 3D o no
// tiene lienzos 2D donde copiar los dibujos.
function preparar() {
  const lienzo3d = document.createElement('canvas');
  const renderer = new WebGLRenderer({ canvas: lienzo3d, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;
  const escena = new Scene();
  escena.environment = entorno(renderer);
  escena.add(...luces());
  if (!document.createElement('canvas').getContext('2d')) throw new Error('Sin lienzo 2D');
  return { lienzo3d, renderer, escena };
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
  const { lienzo3d, renderer, escena } = base;

  let perdido = false;
  const perder = () => {
    if (perdido) return;
    perdido = true;
    alPerder();
  };
  lienzo3d.addEventListener('webglcontextlost', perder);

  const camara = new OrthographicCamera();
  let equipo = null;
  // Cambiar el tamaño del renderizador vacía su imagen: solo se hace si cambia.
  let tamano = '';
  const medir = (ancho, alto) => {
    if (tamano === `${ancho}×${alto}`) return;
    tamano = `${ancho}×${alto}`;
    renderer.setSize(ancho, alto, false);
  };

  // Cada lienzo de tarjeta, con la carga que tiene que mostrar, el grupo de
  // piezas que la dibuja y la firma de lo último que se pintó.
  const tarjetas = new Map();
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
  // que está cargada no se modela ninguno.
  let listo = false;
  // Las miniaturas por pintar: se pintan una vez, cuando se ven por primera
  // vez (el panel Carga arranca plegado).
  const miniaturas = new Map();
  Promise.all(FUENTES_ROTULO.map((f) => document.fonts?.load(f).catch(() => {})))
    .then(() => {
      listo = true;
      requestAnimationFrame(() => {
        pintarPendientes();
      });
    });

  function montar(carga) {
    const grupo = new Group();
    const x = posiciones(carga.discos);
    carga.discos.forEach((cent, i) => {
      const d = disco(cent);
      d.position.x = x.discos[i];
      grupo.add(d);
    });
    if (carga.collarin) {
      const c = collarin();
      c.position.x = x.collarin;
      grupo.add(c);
    }
    return grupo;
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
    t.grupo ??= montar(t.carga);
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
    const ctx = lienzo.getContext('2d');
    ctx.clearRect(0, 0, ancho, alto);
    ctx.drawImage(lienzo3d, 0, 0);
    lienzo.dataset.equipo = t.carga.equipo;
    lienzo.dataset.discos = t.carga.discos.join(',');
    lienzo.dataset.collarin = String(t.carga.collarin);
    lienzo.dataset.animando = 'false';
    lienzo.setAttribute('aria-label', t.carga.etiqueta);
    lienzo.removeAttribute('aria-hidden');
  }

  // ADR-0003 §3.5: solo se repintan las tarjetas que lo necesitan. Las que ya
  // no están en la página se olvidan.
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
    try {
      for (const [lienzo, t] of tarjetas) {
        const ancho = Math.round(lienzo.clientWidth * resolucion);
        const alto = Math.round(lienzo.clientHeight * resolucion);
        const firma = `${ancho}×${alto}`;
        if (!ancho || !alto || t.firma === firma) continue;
        pintar(lienzo, t, ancho, alto);
        t.firma = firma;
      }
    } catch {
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
    lienzo.width = ancho;
    lienzo.height = alto;
    lienzo.getContext('2d').drawImage(lienzo3d, 0, 0);
  }

  return {
    // SPEC-CALC-003 FR-07 y FR-10: el lienzo de una tarjeta (index.html,
    // #plantilla-dibujo) con su carga, que aparece ya cargado. Hasta pintarse
    // no se anuncia. Un lienzo que ya tiene esa carga no se repinta.
    dibujar(lienzo, carga) {
      const t = tarjetas.get(lienzo);
      if (!t) {
        tarjetas.set(lienzo, { carga, grupo: null, firma: null });
        observador.observe(lienzo);
        return;
      }
      if (JSON.stringify(t.carga) === JSON.stringify(carga)) return;
      if (t.grupo) escena.remove(t.grupo);
      Object.assign(t, { carga, grupo: null, firma: null });
      programar();
    },
    // SPEC-CALC-003 FR-07: la miniatura de una ficha de barra.
    miniatura(lienzo, id) {
      miniaturas.set(lienzo, id);
      observador.observe(lienzo);
    },
  };
}
