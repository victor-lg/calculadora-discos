// Análisis de lo que escribe la persona (FR-02, FR-03, FR-04, FR-14).
// Los pesos se devuelven en centésimas de kg, como enteros, para no arrastrar
// errores de coma flotante en el redondeo. Nunca se modifica lo tecleado:
// estas funciones solo lo interpretan.

export const PESO_MAXIMO_CENT = 50000;
// FR-02: el peso de la recta y el de la Z van de 1 a 50 kg, ambos incluidos.
export const BARRA_MINIMA_CENT = 100;
export const BARRA_MAXIMA_CENT = 5000;

const RE_PESO = /^\d+([.,]\d{1,2})?$/;
const RE_PESO_MUCHOS_DECIMALES = /^\d+[.,]\d{3,}$/;
const RE_ENTERO = /^\d+$/;
const RE_SEPARADOR = /[.,]/g;

// FR-03: String.prototype.trim quita todos los espacios en blanco al principio
// y al final, incluidos el tabulador, el espacio duro y los saltos de línea.
// Un separador al final sin cifras detrás se ignora ("100," → "100") y uno al
// principio sin cifras delante lleva un 0 implícito (",5" → "0,5").
function normalizarPeso(texto) {
  let t = texto.trim();
  if ((t.match(RE_SEPARADOR) ?? []).length > 1) return t;
  if (/^[.,]/.test(t)) t = '0' + t;
  if (/[.,]$/.test(t)) t = t.slice(0, -1);
  return t;
}

// Devuelve { estado: 'vacio' } | { estado: 'invalido', causa } | { estado: 'ok', cent }.
// `causa` es la primera regla de FR-03 que se cumple: 'decimales' (un solo
// separador seguido de más de dos cifras), 'formato' (algo que no son cifras y
// un separador) o 'rango' (0 o más de 500 kg).
export function analizarPeso(texto) {
  const recortado = texto.trim();
  if (recortado === '' || recortado === ',' || recortado === '.') return { estado: 'vacio' };
  const t = normalizarPeso(texto);
  if (RE_PESO_MUCHOS_DECIMALES.test(t)) return { estado: 'invalido', causa: 'decimales' };
  if (!RE_PESO.test(t)) return { estado: 'invalido', causa: 'formato' };
  const [entero, decimales = ''] = t.split(/[.,]/);
  const cent = Number(entero) * 100 + Number(decimales.padEnd(2, '0'));
  if (cent <= 0 || cent > PESO_MAXIMO_CENT) return { estado: 'invalido', causa: 'rango' };
  return { estado: 'ok', cent };
}

// FR-02: el peso de la recta o de la Z se escribe como el de trabajo y vale de
// 1 a 50 kg. Devuelve el peso en centésimas, o null si está vacío o no es válido.
export function analizarPesoBarra(texto) {
  const r = analizarPeso(texto);
  return esPesoBarraValido(r.cent) ? r.cent : null;
}

export function esPesoBarraValido(cent) {
  return Number.isInteger(cent) && cent >= BARRA_MINIMA_CENT && cent <= BARRA_MAXIMA_CENT;
}

// FR-04. Devuelve { estado: 'vacio' } | { estado: 'invalido' } | { estado: 'ok', valor }.
// Un porcentaje vacío o solo con espacios no se añade y no lleva mensaje.
export function analizarPorcentaje(texto) {
  const t = texto.trim();
  if (t === '') return { estado: 'vacio' };
  const valor = RE_ENTERO.test(t) ? Number(t) : NaN;
  return esPorcentajeValido(valor) ? { estado: 'ok', valor } : { estado: 'invalido' };
}

export function esPorcentajeValido(valor) {
  return Number.isInteger(valor) && valor >= 1 && valor <= 100;
}
