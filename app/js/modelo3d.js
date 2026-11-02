// SPEC-CALC-003 FR-07 y §11: el modelado de la carga, tal como lo dibuja la
// referencia visual (docs/diseno/maqueta-interfaz.html y notas §4): escena,
// materiales, discos IPF, barras, máquina y collarín. Medidas en milímetros. No
// calcula nada: dibujo.js le pide las piezas y las coloca.
import {
  BoxGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  Path,
  PlaneGeometry,
  PMREMGenerator,
  Quaternion,
  RepeatWrapping,
  RingGeometry,
  Scene,
  Shape,
  SRGBColorSpace,
  TubeGeometry,
  Vector2,
  Vector3,
} from '../vendor/three/three.module.min.js';

// Notas §4.2: radio, grosor, color y tinta de cada disco, por su peso en centésimas.
const DISCOS = new Map([
  [2500, { kg: '25', R: 225, t: 27, color: '#c8102e', tinta: '#ffffff' }],
  [2000, { kg: '20', R: 225, t: 22.5, color: '#0b4fc4', tinta: '#ffffff' }],
  [1500, { kg: '15', R: 200, t: 21, color: '#e9a600', tinta: '#ffffff' }],
  [1000, { kg: '10', R: 162.5, t: 21, color: '#13893a', tinta: '#ffffff' }],
  [500, { kg: '5', R: 114, t: 16, color: '#ffffff', tinta: '#151515' }],
  [250, { kg: '2.5', R: 95, t: 12, color: '#1b1c1f', tinta: '#ffffff' }],
  [125, { kg: '1.25', R: 80, t: 11, color: '#c3c8cf', tinta: '#151515', metal: true }],
]);
// Radio del buje: el agujero es de 50 mm en todos y el buje se estrecha en los pequeños.
const BUJE = new Map([[2500, 50], [2000, 50], [1500, 50], [1000, 50], [500, 40], [250, 40], [125, 34]]);

// Notas §4.3: manga de cada barra (la de la máquina es su cuerno) y su agarre.
const EQUIPOS = {
  20: { manga: 415, agarre: { r: 14 } },
  15: { manga: 320, agarre: { r: 12.5 } },
  recta: { manga: 240, agarre: { r: 12.5 } },
  z: { manga: 240, agarre: { r: 12.5, curva: true } },
  maquina: { manga: 320, maquina: true },
};
export const MANGA = Object.fromEntries(Object.entries(EQUIPOS).map(([id, e]) => [id, e.manga]));

// Notas §4.1: entorno de estudio hecho con planos emisivos, para los reflejos.
function estudio(pmrem) {
  const s = new Scene();
  s.background = new Color(0x0a0b0d);
  const caja = (w, h, pos, intensidad) => {
    const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: new Color(1, 1, 1).multiplyScalar(intensidad), side: DoubleSide }));
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    s.add(m);
  };
  caja(1400, 900, [-900, 1100, 900], 8); // softbox principal, arriba a la izquierda
  caja(260, 1700, [1300, 300, -300], 4.5); // tira de recorte, detrás a la derecha
  caja(1000, 700, [1100, 650, -1100], 0.8); // reflejo suave en las caras de los discos
  caja(1700, 500, [0, -900, 1100], 0.22); // relleno bajo, de frente
  caja(3000, 3000, [0, 1700, 0], 0.05); // rebote del techo
  return pmrem.fromScene(s, 0.02, 1, 10000).texture;
}

// El entorno PMREM, que se rehace con el renderizador.
export function entorno(renderer) {
  const pmrem = new PMREMGenerator(renderer);
  const textura = estudio(pmrem);
  pmrem.dispose();
  return textura;
}

// Notas §4.1: luz principal con sombras suaves y luz de recorte.
export function luces() {
  const luz = new DirectionalLight(0xffffff, 1.8);
  luz.position.set(-900, 1100, 900);
  luz.castShadow = true;
  luz.shadow.mapSize.set(2048, 2048);
  Object.assign(luz.shadow.camera, { left: -900, right: 900, top: 900, bottom: -900, near: 1, far: 4000 });
  luz.shadow.radius = 4;
  luz.shadow.bias = -0.0005;
  const recorte = new DirectionalLight(0xffffff, 0.9);
  recorte.position.set(600, 250, -700);
  return [luz, recorte];
}

export const sombra = (o) => o.traverse((m) => {
  if (m.isMesh && !m.material.transparent) {
    m.castShadow = true;
    m.receiveShadow = true;
  }
});

// Texturas de relieve dibujadas en un lienzo 2D.
function lienzo(ancho, alto) {
  const c = document.createElement('canvas');
  c.width = ancho;
  c.height = alto;
  return c;
}

function repetida(c, x, y) {
  const t = new CanvasTexture(c);
  t.wrapS = RepeatWrapping;
  t.wrapT = RepeatWrapping;
  t.repeat.set(x, y);
  return t;
}

function moleteado(x = 30, y = 60) {
  const c = lienzo(64, 64);
  const g = c.getContext('2d');
  g.fillStyle = '#808080';
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#2a2a2a';
  g.lineWidth = 6;
  g.beginPath();
  g.moveTo(-8, 72);
  g.lineTo(72, -8);
  g.moveTo(-8, -8);
  g.lineTo(72, 72);
  g.stroke();
  return repetida(c, x, y);
}

function ruido() {
  const c = lienzo(256, 256);
  const g = c.getContext('2d');
  const img = g.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 150 + Math.random() * 60;
    img.data.fill(v, i, i + 3);
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return repetida(c, 6, 2);
}

function mecanizado(y) {
  const c = lienzo(4, 256);
  const g = c.getContext('2d');
  for (let i = 0; i < 256; i++) {
    const v = 110 + Math.random() * 40 + (i % 3 === 0 ? 50 : 0);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(0, i, 4, 1);
  }
  return repetida(c, 1, y);
}

// Materiales, creados la primera vez que se modela algo (no al importar, para
// que sin 3D no se prepare nada) y compartidos por todas las tarjetas.
const fisico = (opciones) => new MeshPhysicalMaterial(opciones);
let materiales = null;
function mat() {
  materiales ??= {
    grano: ruido(),
    cromo: fisico({ color: 0xe3e7ec, metalness: 1, roughness: 0.12 }),
    agarre: fisico({ color: 0xc4c9d0, metalness: 1, roughness: 0.38, bumpMap: moleteado(), bumpScale: 1.2 }),
    agarreZ: fisico({ color: 0xc4c9d0, metalness: 1, roughness: 0.38, bumpMap: moleteado(79, 30), bumpScale: 1.2 }),
    buje: fisico({ color: 0xe3e7ec, metalness: 1, roughness: 0.2, bumpMap: mecanizado(3), bumpScale: 0.5 }),
    manga: fisico({ color: 0xe3e7ec, metalness: 1, roughness: 0.16, bumpMap: mecanizado(26), bumpScale: 0.35 }),
    tope: fisico({ color: 0xe3e7ec, metalness: 1, roughness: 0.16, bumpMap: mecanizado(4), bumpScale: 0.4 }),
    maquina: fisico({ color: 0x1d1f23, metalness: 0.35, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.3 }),
    acero: fisico({ color: 0xc9ced5, metalness: 1, roughness: 0.32, bumpMap: mecanizado(26), bumpScale: 0.2 }),
    goma: fisico({ color: 0x111214, metalness: 0, roughness: 0.85 }),
    naranja: fisico({ color: new Color('#ff7a1a'), metalness: 0.15, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
    palanca: fisico({ color: new Color('#ff8a2a'), metalness: 0.55, roughness: 0.28, clearcoat: 0.5 }),
    grafito: fisico({ color: 0x5c6269, metalness: 0.85, roughness: 0.3, clearcoat: 0.3 }),
  };
  return materiales;
}
const pintura = (color, brillo) => fisico({
  side: DoubleSide,
  color: new Color(color),
  metalness: brillo ? 0.55 : 0.2,
  roughness: brillo ? 0.3 : 0.42,
  roughnessMap: mat().grano,
  clearcoat: 0.85,
  clearcoatRoughness: 0.1,
});

// Pieza de revolución alrededor del eje X a partir de un perfil (radio,
// posición axial). Se ve por las dos caras: los perfiles son abiertos.
const dobles = new Map();

function torno(perfil, material, segmentos = 128) {
  const g = new LatheGeometry(perfil.map(([r, y]) => new Vector2(r, y)), segmentos);
  g.rotateZ(-Math.PI / 2);
  if (material.side !== DoubleSide && !dobles.has(material)) {
    const doble = material.clone();
    doble.side = DoubleSide;
    dobles.set(material, doble);
  }
  return new Mesh(g, material.side === DoubleSide ? material : dobles.get(material));
}

// Notas §4.2: cara con aro exterior en relieve y, en los grandes y en el de 5,
// un anillo intermedio que separa dos coronas.
function diseno(cent) {
  const { R } = DISCOS.get(cent);
  const hub = BUJE.get(cent);
  const borde = 0.089 * R;
  const an = 0.018 * R;
  if (R > 120 || cent === 500) {
    const rc = R > 120 ? 0.42 * R : hub + 12;
    return { R, hub, borde, anillo: [rc - an, rc + an], corona: [rc + an, R - borde] };
  }
  return { R, hub, borde, anillo: null, corona: [hub + 4, R - borde] };
}

// Notas §4.2: rotulación con la tipografía de la app. La marca, con interletraje
// por parejas; el peso, con los decimales al 78 %, la coma al 60 % y "KG" debajo.
const FUENTE = '"Barlow Semi Condensed", "Arial Narrow", Arial, sans-serif';
export const FUENTES_ROTULO = [`800 64px ${FUENTE}`, `700 64px ${FUENTE}`];
const MARCA = 'BVNKER';
const KERN = { BV: -0.07, VN: -0.075, NK: 0.04, KE: 0.035, ER: 0.04 };

function arco(g, texto, cx, cy, radio, track, cuerpo) {
  const letras = [...texto];
  const anchos = letras.map((ch, i) => g.measureText(ch).width + track + (KERN[ch + (letras[i + 1] || '')] || 0) * cuerpo);
  let a = -Math.PI / 2 - anchos.reduce((x, y) => x + y, 0) / radio / 2;
  letras.forEach((ch, i) => {
    const paso = anchos[i] / radio;
    const m = a + paso / 2;
    g.save();
    g.translate(cx + radio * Math.cos(m), cy + radio * Math.sin(m));
    g.rotate(m + Math.PI / 2);
    g.fillText(ch, 0, 0);
    g.restore();
    a += paso;
  });
}

function peso(g, kg, x, y, A, girado) {
  const [ent, dec] = kg.split('.');
  const f = (k) => `800 ${A * k}px ${FUENTE}`;
  const trozos = [[ent, f(1)]].concat(dec ? [[',', f(0.6)], [dec, f(0.78)]] : []);
  const ancho = trozos.reduce((s, [t, fu]) => {
    g.font = fu;
    return s + g.measureText(t).width;
  }, 0) + (dec ? A * -0.02 : 0);
  g.save();
  g.translate(x, y);
  if (girado) g.rotate(Math.PI);
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  let cx = -ancho / 2;
  for (const [t, fu] of trozos) {
    g.font = fu;
    g.fillText(t, cx, A * 0.26);
    cx += g.measureText(t).width + (t === ',' ? -A * 0.02 : 0);
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `700 ${A * (dec ? 0.44 : 0.34)}px ${FUENTE}`;
  g.letterSpacing = `${A * 0.02}px`;
  g.fillText('KG', 0, A * (dec ? 0.68 : 0.62));
  g.letterSpacing = '0px';
  g.restore();
}

function textos(g, cent, N, color) {
  const d = DISCOS.get(cent);
  const mm = N / (2 * d.R);
  const [c0, c1] = diseno(cent).corona;
  const rm = ((c0 + c1) / 2) * mm;
  const ancho = (c1 - c0) * mm;
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const tb = ancho * 0.66;
  g.font = `800 ${tb}px ${FUENTE}`;
  arco(g, MARCA, N / 2, N / 2, rm, tb * 0.08, tb);
  g.save();
  g.translate(N / 2, N / 2);
  g.rotate(Math.PI);
  g.translate(-N / 2, -N / 2);
  arco(g, MARCA, N / 2, N / 2, rm, tb * 0.08, tb);
  g.restore();
  const A = ancho * 0.56;
  peso(g, d.kg, N / 2 - rm, N / 2, A, false);
  peso(g, d.kg, N / 2 + rm, N / 2, A, true);
}

// La corona rotulada: el color y un mapa de rugosidad con el mismo texto.
function rotulo(cent) {
  const d = DISCOS.get(cent);
  const N = 1024;
  const [c0, c1] = diseno(cent).corona;
  const dibujar = (fondo, tinta) => {
    const c = lienzo(N, N);
    const g = c.getContext('2d');
    g.fillStyle = fondo;
    g.fillRect(0, 0, N, N);
    textos(g, cent, N, tinta);
    return c;
  };
  const k = c1 / d.R;
  const ajustar = (t) => {
    t.repeat.set(k, k);
    t.offset.set((1 - k) / 2, (1 - k) / 2);
    t.anisotropy = 8;
    return t;
  };
  const color = ajustar(new CanvasTexture(dibujar(d.color, d.tinta)));
  color.colorSpace = SRGBColorSpace;
  const rugoso = ajustar(new CanvasTexture(dibujar('rgb(107,107,107)', 'rgb(158,158,158)')));
  const malla = new Mesh(new RingGeometry(c0 + 0.4, c1 - 0.4, 256, 4), new MeshPhysicalMaterial({
    map: color,
    roughnessMap: rugoso,
    roughness: 1,
    metalness: d.metal ? 0.55 : 0.2,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
  }));
  malla.rotation.y = Math.PI / 2;
  return malla;
}

// Redondea las esquinas de un perfil con curvas cuadráticas.
function redondear(p, radio) {
  const fuera = [p[0]];
  for (let i = 1; i < p.length - 1; i++) {
    const [ax, ay] = p[i - 1];
    const [bx, by] = p[i];
    const [cx, cy] = p[i + 1];
    const l1 = Math.hypot(bx - ax, by - ay);
    const l2 = Math.hypot(cx - bx, cy - by);
    if (!l1 || !l2) continue;
    const d = Math.min(radio, l1 / 3, l2 / 3);
    const p0 = [bx - ((bx - ax) / l1) * d, by - ((by - ay) / l1) * d];
    const p2 = [bx + ((cx - bx) / l2) * d, by + ((cy - by) / l2) * d];
    for (let k = 0; k <= 4; k++) {
      const t = k / 4;
      const u = 1 - t;
      fuera.push([u * u * p0[0] + 2 * u * t * bx + t * t * p2[0], u * u * p0[1] + 2 * u * t * by + t * t * p2[1]]);
    }
  }
  fuera.push(p[p.length - 1]);
  return fuera;
}

// Perfil de la cara: centro macizo, corona rebajada y aro exterior en relieve.
function perfilDisco(cent, h, rebaje) {
  const { R, hub, anillo, corona } = diseno(cent);
  const macizo = anillo ? anillo[1] : corona[0];
  const zonas = [[macizo, h], [corona[1], h - rebaje], [R - 0.018 * R, h]];
  const frente = [[hub - 3, h]];
  let r = hub - 3;
  let z0 = h;
  for (const [r1, z] of zonas) {
    if (z !== z0) frente.push([r + 2, z]);
    frente.push([r1, z]);
    r = r1;
    z0 = z;
  }
  frente.push([R, h - Math.min(3, h * 0.45)]);
  return redondear(frente.concat(frente.slice().reverse().map(([rr, zz]) => [rr, -zz]), [frente[0]]), 1.4);
}

// Cada tipo de disco se modela una vez y las tarjetas usan copias, que
// comparten geometría, materiales y texturas.
const moldes = new Map();

function molde(cent) {
  const d = DISCOS.get(cent);
  const h = d.t / 2;
  const r0 = 25.25;
  const rebaje = Math.min(2.2, h - 2);
  const hub = BUJE.get(cent);
  const g = new Group();
  g.add(torno(perfilDisco(cent, h, rebaje), pintura(d.color, d.metal)));
  g.add(torno([[r0, -h - 1], [hub - 3, -h - 1], [hub - 3, -h - 0.4], [hub, -h - 0.4], [hub, h + 0.4], [hub - 3, h + 0.4], [hub - 3, h + 1], [r0, h + 1], [r0, -h - 1]], mat().buje, 96));
  const r = rotulo(cent);
  r.position.x = h - rebaje + 0.05;
  g.add(r);
  sombra(g);
  return g;
}

export function disco(cent) {
  if (!moldes.has(cent)) moldes.set(cent, molde(cent));
  return moldes.get(cent).clone();
}

// Notas §5.1 y SPEC-CALC-001 FR-16: los discos se colocan de dentro afuera
// desde x = 1, con su grosor; el collarín va 18,5 mm más allá del último.
export function posiciones(discos) {
  let x = 1;
  const centros = discos.map((cent) => {
    const t = DISCOS.get(cent).t;
    const c = x + t / 2;
    x += t;
    return c;
  });
  return { discos: centros, collarin: x + 18.5 };
}

// Notas §4.4: collarín de diseño propio, cerrado: anillo partido de grafito
// con banda naranja, orejetas, tornillo y leva con palanca.
let moldeCollarin = null;

function crearCollarin() {
  const g = new Group();
  const RE = 40;
  const RI = 25.4;
  const MEDIO = 0.16;
  const forma = new Shape();
  forma.absarc(0, 0, RE, Math.PI / 2 + MEDIO, Math.PI / 2 - MEDIO + Math.PI * 2, false);
  forma.lineTo(RI * Math.cos(Math.PI / 2 - MEDIO), RI * Math.sin(Math.PI / 2 - MEDIO));
  forma.absarc(0, 0, RI, Math.PI / 2 - MEDIO + Math.PI * 2, Math.PI / 2 + MEDIO, true);
  forma.closePath();
  const geo = new ExtrudeGeometry(forma, { depth: 32, bevelEnabled: true, bevelThickness: 1.6, bevelSize: 1.2, bevelSegments: 3, curveSegments: 96 });
  geo.translate(0, 0, -16);
  geo.rotateY(Math.PI / 2);
  g.add(new Mesh(geo, mat().grafito));
  g.add(torno([[39.6, -5], [41.3, -5], [41.3, 5], [39.6, 5], [39.6, -5]], mat().palanca, 96));
  // Cerrado, la ranura es de 3 mm.
  for (const s of [-1, 1]) {
    const oreja = new Mesh(new BoxGeometry(30, 15, 7), mat().grafito);
    oreja.position.set(0, 44, s * (5.5 + 3 / 2));
    g.add(oreja);
  }
  const tornillo = new Mesh(new CylinderGeometry(2.6, 2.6, 30, 20), mat().cromo);
  tornillo.rotation.x = Math.PI / 2;
  tornillo.position.set(0, 47, 0);
  g.add(tornillo);
  const pivote = new Group();
  pivote.position.set(0, 47, 0);
  const leva = new Mesh(new CylinderGeometry(9, 9, 12, 32), mat().palanca);
  leva.rotation.x = Math.PI / 2;
  const brazo = new Mesh(new BoxGeometry(65, 8, 14), mat().palanca);
  brazo.position.set(32.5, 5, 0);
  const punta = new Mesh(new CylinderGeometry(6.5, 6.5, 16, 24), mat().palanca);
  punta.rotation.x = Math.PI / 2;
  punta.position.set(65, 5, 0);
  pivote.add(leva, brazo, punta);
  g.add(pivote);
  sombra(g);
  return g;
}

export function collarin() {
  moldeCollarin ??= crearCollarin();
  return moldeCollarin.clone();
}

// Notas §4.3: manga con bisel final, tope y agarre (recto o con los quiebros de la Z).
const manga = (largo) => torno([[0, 0], [25, 0], [25, largo - 6], [23.5, largo], [0, largo]], mat().manga, 96);
const tope = () => torno([[14, -30], [27, -30], [30, -27], [30, -3], [27, 0], [14, 0], [14, -30]], mat().tope, 96);

function agarre({ r, curva }, desde = -360) {
  if (curva) {
    const puntos = [[desde, 0], [-325, 0], [-310, -4], [-282, -24], [-268, -28], [-254, -24], [-200, 14], [-186, 18], [-172, 14], [-150, 4], [-138, 0], [-30, 0]];
    const linea = new CatmullRomCurve3(puntos.map(([x, y]) => new Vector3(x, y, 0)), false, 'centripetal');
    return new Mesh(new TubeGeometry(linea, 160, r, 32), mat().agarreZ);
  }
  const m = new Mesh(new CylinderGeometry(r, r, -30 - desde, 64, 1), mat().agarre);
  m.geometry.rotateZ(-Math.PI / 2);
  m.position.x = (desde - 30) / 2;
  return m;
}

// ADR-0003 §3.4: caja de aristas redondeadas, en lugar de RoundedBoxGeometry
// de examples/jsm (three.js, MIT). Solo se necesitan posiciones y normales: sus
// materiales no llevan texturas.
function cajaRedondeada(ancho, alto, fondo, segmentos, radio) {
  const n = segmentos * 2 + 1;
  const r = Math.min(ancho / 2, alto / 2, fondo / 2, radio);
  const g = new BoxGeometry(1, 1, 1, n, n, n).toNonIndexed();
  const pos = g.attributes.position.array;
  const nor = g.attributes.normal.array;
  const caja = new Vector3(ancho, alto, fondo).divideScalar(2).subScalar(r);
  const medio = 0.5 / n;
  const p = new Vector3();
  const v = new Vector3();
  for (let i = 0; i < pos.length; i += 3) {
    p.fromArray(pos, i);
    v.copy(p);
    v.x -= Math.sign(v.x) * medio;
    v.y -= Math.sign(v.y) * medio;
    v.z -= Math.sign(v.z) * medio;
    v.normalize();
    pos[i] = caja.x * Math.sign(p.x) + v.x * r;
    pos[i + 1] = caja.y * Math.sign(p.y) + v.y * r;
    pos[i + 2] = caja.z * Math.sign(p.z) + v.z * r;
    v.toArray(nor, i);
  }
  return g;
}

// Notas §4.3: la máquina de carga por discos. Todo va en la misma línea:
// brazo, horquilla, montante y tope. El cuerno sale del costado del brazo.
function maquina(e) {
  const g = new Group();
  const caja = (w, h, d, r, material) => new Mesh(cajaRedondeada(w, h, d, 3, r), material);
  const XA = -28;
  const W = 45;
  const T = 28;
  const RC = 11;
  const curva = new CatmullRomCurve3([[XA, -620, -375], [XA, -330, -200], [XA, 0, 0], [XA, 320, 235], [XA, 760, 555]].map(([x, y, z]) => new Vector3(x, y, z)));
  const seccion = new Shape();
  seccion.moveTo(-T + RC, -W);
  seccion.lineTo(T - RC, -W);
  seccion.absarc(T - RC, -W + RC, RC, -Math.PI / 2, 0, false);
  seccion.lineTo(T, W - RC);
  seccion.absarc(T - RC, W - RC, RC, 0, Math.PI / 2, false);
  seccion.lineTo(-T + RC, W);
  seccion.absarc(-T + RC, W - RC, RC, Math.PI / 2, Math.PI, false);
  seccion.lineTo(-T, -W + RC);
  seccion.absarc(-T + RC, -W + RC, RC, Math.PI, Math.PI * 1.5, false);
  g.add(new Mesh(new ExtrudeGeometry(seccion, { steps: 160, extrudePath: curva, bevelEnabled: false, curveSegments: 6 }), mat().naranja));
  // Punto del brazo a una altura dada, su tangente y la normal hacia su cara inferior.
  const enY = (y) => {
    let mejor = 0;
    let distancia = Infinity;
    for (let i = 0; i <= 400; i++) {
      const d = Math.abs(curva.getPointAt(i / 400).y - y);
      if (d < distancia) {
        distancia = d;
        mejor = i / 400;
      }
    }
    const tg = curva.getTangentAt(mejor);
    const n = new Vector3(0, -tg.z, tg.y).normalize();
    if (n.y > 0) n.negate();
    return { p: curva.getPointAt(mejor), n };
  };
  // Horquilla: dos pletinas con el eje, bajo el brazo.
  const piv = enY(300);
  const PV = piv.p.clone().addScaledVector(piv.n, W - 10);
  const pletina = new Shape();
  pletina.moveTo(-55, -120);
  pletina.lineTo(55, -120);
  pletina.lineTo(55, 0);
  pletina.absarc(0, 0, 55, 0, Math.PI, false);
  pletina.lineTo(-55, -120);
  const hueco = new Path();
  hueco.absarc(0, 0, 16, 0, Math.PI * 2, true);
  pletina.holes.push(hueco);
  for (const dx of [-46, 46]) {
    const geo = new ExtrudeGeometry(pletina, { depth: 14, bevelEnabled: true, bevelThickness: 2.5, bevelSize: 2.5, bevelSegments: 3, curveSegments: 48 });
    geo.translate(0, 0, -7);
    geo.rotateY(Math.PI / 2);
    const m = new Mesh(geo, mat().maquina);
    m.position.set(PV.x + dx, PV.y, PV.z);
    g.add(m);
  }
  const puente = caja(110, 22, 112, 5, mat().maquina);
  puente.position.set(PV.x, PV.y - 109, PV.z);
  const montante = caja(60, 900, 78, 9, mat().maquina);
  montante.position.set(PV.x, PV.y - 120 - 450, PV.z);
  const cilindro = (r, largo, lados, material, x = PV.x) => {
    const m = new Mesh(new CylinderGeometry(r, r, largo, lados), material);
    m.rotation.z = Math.PI / 2;
    m.position.set(x, PV.y, PV.z);
    return m;
  };
  g.add(puente, montante, cilindro(27, 76, 40, mat().naranja), cilindro(15, 128, 32, mat().acero), cilindro(27, 3, 40, mat().acero, PV.x + 57), cilindro(17, 10, 6, mat().cromo, PV.x + 64));
  // Tope con taco de goma, perpendicular al brazo, entre el pivote y el cuerno.
  const ap = enY(140);
  const C = ap.p.clone().addScaledVector(ap.n, W);
  const L = Math.max(120, (PV.z - C.z) / ap.n.z);
  const giro = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), ap.n.clone().negate());
  const taco = caja(58, 44, 84, 9, mat().goma);
  taco.position.copy(C).addScaledVector(ap.n, 22);
  const capuchon = caja(56, 16, 76, 5, mat().maquina);
  capuchon.position.copy(C).addScaledVector(ap.n, 52);
  const ini = C.clone().addScaledVector(ap.n, 60);
  const fin = C.clone().addScaledVector(ap.n, L + 30);
  const tubo = caja(46, ini.distanceTo(fin), 50, 6, mat().maquina);
  tubo.position.copy(ini).add(fin).multiplyScalar(0.5);
  for (const m of [taco, capuchon, tubo]) m.quaternion.copy(giro);
  g.add(taco, tubo, capuchon);
  // Cuerno con su collar, soldado al costado exterior del brazo.
  g.add(torno([[25.5, -1], [38, -1], [38, 4], [36, 6], [25.5, 6], [25.5, -1]], mat().tope, 64), manga(e.manga));
  // Se retira 6 mm para que el primer disco quede donde en las barras.
  g.position.x = -6;
  return g;
}

// La barra elegida o la máquina, sin la carga. Se modela una vez por equipo.
const estructuras = new Map();

export function estructura(id) {
  if (!estructuras.has(id)) {
    const e = EQUIPOS[id];
    const g = e.maquina ? maquina(e) : new Group().add(agarre(e.agarre), tope(), manga(e.manga));
    sombra(g);
    estructuras.set(id, g);
  }
  return estructuras.get(id);
}

// SPEC-CALC-003 FR-07 (miniaturas): media barra, de frente y a la misma escala.
export function mediaBarra(id) {
  const e = EQUIPOS[id];
  return new Group().add(agarre(e.agarre), tope(), manga(e.manga));
}
