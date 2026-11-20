// SPEC-CALC-003 NFR-02: el cálculo de contraste de WCAG 2.x que comparten los
// tests de contraste de presentacion.spec.js y anadir-borrar.spec.js. El fondo
// de un elemento es el del primer antecesor con fondo no transparente, sin
// componer transparencias (eso lo hace el de accesibilidad.spec.js, AC-21).

// Se ejecuta en la página: deja las funciones en window.medidasContraste.
// accesibilidad.spec.js la carga como init script para usar `lum`.
export function medidasContraste() {
  const rgb = (c) => c.match(/[\d.]+/g).map(Number);
  const lum = ([r, g, b]) => {
    const f = (x) => { const v = x / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const razon = (a, b) => {
    const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((m, n) => n - m);
    return (x + 0.05) / (y + 0.05);
  };
  const fondo = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const c = getComputedStyle(e).backgroundColor;
      if (rgb(c)[3] !== 0) return c;
    }
    return getComputedStyle(document.body).backgroundColor;
  };
  // Visible: con caja y sin visibility: hidden. Con `sinOcultos`, tampoco
  // dentro de .oculto; con `anchoMinimo`, más ancho que 1 px.
  const visible = (el, { sinOcultos = false, anchoMinimo = false } = {}) => el.getClientRects().length > 0
    && getComputedStyle(el).visibility !== 'hidden'
    && (!sinOcultos || !el.closest('.oculto')) && (!anchoMinimo || el.getBoundingClientRect().width > 1);
  // Mide cada elemento de `elementos` con texto propio y visible: 3:1 si es
  // grande (24 px, o 18,66 px en negrita) y 4,5:1 si no.
  const textos = (elementos, opciones) => {
    const fallos = [];
    let medidos = 0;
    for (const el of elementos) {
      const propio = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!propio || !visible(el, opciones)) continue;
      const s = getComputedStyle(el);
      const grande = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && Number(s.fontWeight) >= 700);
      const r = razon(s.color, fondo(el));
      medidos++;
      if (r < (grande ? 3 : 4.5)) fallos.push(`${el.textContent.trim()}: ${r.toFixed(2)}`);
    }
    return { fallos, medidos };
  };
  // Cada raíz de los selectores seguida de todos sus descendientes.
  const conDescendientes = (selectores) => selectores.flatMap((s) => [...document.querySelectorAll(s)])
    .flatMap((raiz) => [raiz, ...raiz.querySelectorAll('*')]);
  window.medidasContraste = { lum, razon, fondo, visible, textos, conDescendientes };
}

// Hay que llamarla antes de cada page.evaluate que use window.medidasContraste:
// una recarga la borra.
export const instalarContraste = (page) => page.evaluate(medidasContraste);
