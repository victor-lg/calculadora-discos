// FR-14: coma decimal, como máximo dos decimales y sin ceros finales.
// El signo negativo es el signo menos tipográfico (U+2212), como en la spec.
export function formatearKg(cent) {
  const signo = cent < 0 ? '−' : '';
  const abs = Math.abs(cent);
  const entero = Math.floor(abs / 100);
  const decimales = String(abs % 100).padStart(2, '0').replace(/0+$/, '');
  return signo + entero + (decimales ? ',' + decimales : '');
}
// Prueba de VIC-56 (PR desechable): R2.
