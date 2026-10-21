// Análisis de lo que escribe la persona (FR-02, FR-03, FR-04, FR-14).
// Los pesos se devuelven en centésimas de kg, como enteros, para no arrastrar
// errores de coma flotante en el redondeo.

export const PESO_MAXIMO_CENT = 50000;

const RE_PESO = /^\d+([.,]\d{1,2})?$/;
const RE_PESO_MUCHOS_DECIMALES = /^\d+[.,]\d{3,}$/;
const RE_ENTERO = /^\d+$/;

// Devuelve { estado: 'vacio' } | { estado: 'invalido', motivo } | { estado: 'ok', cent }.
// `motivo` completa una frase que empieza por "El peso de …".
export function analizarPeso(texto) {
  if (texto === '') return { estado: 'vacio' };
  if (RE_PESO_MUCHOS_DECIMALES.test(texto)) {
    return {
      estado: 'invalido',
      motivo: 'admite como mucho dos decimales y no lleva separador de miles',
    };
  }
  if (!RE_PESO.test(texto)) {
    return {
      estado: 'invalido',
      motivo: 'se escribe solo con cifras y, si lleva decimales, una coma o un punto seguido de una o dos cifras',
    };
  }
  const [entero, decimales = ''] = texto.split(/[.,]/);
  const cent = Number(entero) * 100 + Number(decimales.padEnd(2, '0'));
  if (cent <= 0) return { estado: 'invalido', motivo: 'tiene que ser mayor que 0 kg' };
  if (cent > PESO_MAXIMO_CENT) return { estado: 'invalido', motivo: 'no puede superar los 500 kg' };
  return { estado: 'ok', cent };
}

// Devuelve { ok: true, valor } | { ok: false, mensaje }.
export function analizarPorcentaje(texto) {
  if (texto === '') {
    return { ok: false, mensaje: 'Escribe un porcentaje entero del 1 al 99.' };
  }
  if (!RE_ENTERO.test(texto)) {
    return {
      ok: false,
      mensaje: 'El porcentaje tiene que ser un número entero del 1 al 99, escrito solo con cifras, sin coma ni punto.',
    };
  }
  const valor = Number(texto);
  if (valor < 1 || valor > 99) {
    return { ok: false, mensaje: 'El porcentaje tiene que estar entre 1 y 99.' };
  }
  return { ok: true, valor };
}

export function esPorcentajeValido(valor) {
  return Number.isInteger(valor) && valor >= 1 && valor <= 99;
}
