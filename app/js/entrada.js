// Análisis de lo que escribe la persona (FR-02, FR-03, FR-04, FR-14).
// Los pesos se devuelven en centésimas de kg, como enteros, para no arrastrar
// errores de coma flotante en el redondeo. Nunca se modifica lo tecleado:
// estas funciones solo lo interpretan.

export const PESO_MAXIMO_CENT = 50000;

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

// Devuelve { estado: 'vacio' } | { estado: 'invalido', motivo } | { estado: 'ok', cent }.
// `motivo` completa una frase que empieza por "El peso de …".
export function analizarPeso(texto) {
  const recortado = texto.trim();
  if (recortado === '' || recortado === ',' || recortado === '.') return { estado: 'vacio' };
  if ((recortado.match(RE_SEPARADOR) ?? []).length > 1) {
    return {
      estado: 'invalido',
      motivo: 'lleva como mucho un separador decimal (una coma o un punto) y no lleva separador de miles',
    };
  }
  const t = normalizarPeso(texto);
  if (RE_PESO_MUCHOS_DECIMALES.test(t)) {
    return {
      estado: 'invalido',
      motivo: 'admite como mucho dos decimales y no lleva separador de miles',
    };
  }
  if (!RE_PESO.test(t)) {
    return {
      estado: 'invalido',
      motivo: 'se escribe solo con cifras y, si lleva decimales, una coma o un punto seguido de una o dos cifras',
    };
  }
  const [entero, decimales = ''] = t.split(/[.,]/);
  const cent = Number(entero) * 100 + Number(decimales.padEnd(2, '0'));
  if (cent <= 0) return { estado: 'invalido', motivo: 'tiene que ser mayor que 0 kg' };
  if (cent > PESO_MAXIMO_CENT) return { estado: 'invalido', motivo: 'no puede superar los 500 kg' };
  return { estado: 'ok', cent };
}

// FR-04. Devuelve { estado: 'vacio' } | { estado: 'invalido', mensaje } | { estado: 'ok', valor }.
// Un porcentaje vacío o solo con espacios no se añade y no lleva mensaje.
export function analizarPorcentaje(texto) {
  const t = texto.trim();
  if (t === '') return { estado: 'vacio' };
  if (!RE_ENTERO.test(t)) {
    return {
      estado: 'invalido',
      mensaje: 'El porcentaje tiene que ser un número entero del 1 al 99, escrito solo con cifras, sin coma ni punto.',
    };
  }
  const valor = Number(t);
  if (valor < 1 || valor > 99) {
    return { estado: 'invalido', mensaje: 'El porcentaje tiene que estar entre 1 y 99.' };
  }
  return { estado: 'ok', valor };
}

export function esPorcentajeValido(valor) {
  return Number.isInteger(valor) && valor >= 1 && valor <= 99;
}
