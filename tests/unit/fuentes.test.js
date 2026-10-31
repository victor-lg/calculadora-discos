// SPEC-CALC-003 §11: las fuentes se sirven desde la propia app. Barlow (400–600)
// y Barlow Semi Condensed (500–800), con su licencia OFL junto a ellas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const APP = fileURLToPath(new URL('../../app/', import.meta.url));
const sha256 = (ruta) => createHash('sha256').update(readFileSync(ruta)).digest('hex');

// Copias byte a byte de files/*-latin-*-normal.woff2 de @fontsource/barlow y
// @fontsource/barlow-semi-condensed 5.3.0, y OFL.txt de google/fonts
// (ofl/barlow, commit 8acd41abf23f6795163d97ffef8406d2449c63da), igual al de
// ofl/barlowsemicondensed. Integridad publicada en npm de los tarballs:
//   barlow-5.3.0.tgz                 sha512-tGR0y6QObRtKv71MOth44222+mdNFM/ZWFWDV1VLzNbG4oK9PNRlyJzmkck4vHAi9ibHBXgt4SlY51amFP55CA==
//   barlow-semi-condensed-5.3.0.tgz  sha512-EdpQ1GlLMofGqDsQhEw+g6DonNKmzt21p8y/oNbTl4BFzEkqYkFyE2fj25YGxmZBL/LZZGAxe74FlvEWcgc31w==
// Para contrastarlas a mano:
//   npm pack @fontsource/barlow@5.3.0 @fontsource/barlow-semi-condensed@5.3.0
//   tar -xzf <tarball> && sha256sum package/files/*-latin-{400..800}-normal.woff2
const COPIAS = {
  'OFL.txt': '186d750eb496a4c17a76385f82be6aea2ac1cf2de074a811d63786cf374ea73f',
  'barlow-latin-400-normal.woff2': 'b0a8ad37ac45f5fb22ced461576db72e44e295107aad7a9c8a7a4bad728fd03b',
  'barlow-latin-500-normal.woff2': 'cd759df8ef9efc98fee14307b4eb5ba27f08b1f8f2f3ad2872432e25c89907a8',
  'barlow-latin-600-normal.woff2': '4b52ddd4836b592df0e4832b8286956883cdc651b015126bdd18f184b7f90cc3',
  'barlow-semi-condensed-latin-500-normal.woff2': '0d7513795eaf8fdab7f340144841bd2d9fac7d9303c03aa6b525a2c908e9b371',
  'barlow-semi-condensed-latin-600-normal.woff2': 'f158417e9207b5362f9b71a2fe779ce5bb836ad972f38445c3163af39d2c998d',
  'barlow-semi-condensed-latin-700-normal.woff2': 'fb958c8c20a05552ac8a85d925d96028d52565792650e941a5fe96b6997aa5cb',
  'barlow-semi-condensed-latin-800-normal.woff2': 'a4f4f353506e6c61f9070de26d34a872ab32aeb1b9b318303732c22941755666',
};

test('app/fuentes/ tiene solo las copias acordadas, sin cambios', () => {
  assert.deepEqual(readdirSync(`${APP}fuentes`).sort(), Object.keys(COPIAS).sort());
  for (const [nombre, hash] of Object.entries(COPIAS)) {
    assert.equal(sha256(`${APP}fuentes/${nombre}`), hash, nombre);
  }
});

test('la licencia es la SIL Open Font License 1.1 del proyecto Barlow', () => {
  const licencia = readFileSync(`${APP}fuentes/OFL.txt`, 'utf8');
  assert.match(licencia, /^Copyright 2017 The Barlow Project Authors/);
  assert.match(licencia, /SIL Open Font License, Version 1\.1/);
});

// Cada @font-face del CSS, como "familia peso → fichero".
function caras() {
  const css = readFileSync(`${APP}css/estilos.css`, 'utf8');
  return [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(([, cuerpo]) => {
    const valor = (p) => cuerpo.match(new RegExp(`${p}:\\s*([^;]+);`))[1].trim();
    return `${valor('font-family')} ${valor('font-weight')} ${valor('font-style')} → ${valor('src')}`;
  });
}

test('el CSS declara cada familia y peso con su copia local en woff2', () => {
  const esperadas = [
    ...[400, 500, 600].map((p) => ['Barlow', p, 'barlow']),
    ...[500, 600, 700, 800].map((p) => ['Barlow Semi Condensed', p, 'barlow-semi-condensed']),
  ].map(([familia, peso, fichero]) =>
    `"${familia}" ${peso} normal → url("../fuentes/${fichero}-latin-${peso}-normal.woff2") format("woff2")`);
  assert.deepEqual(caras(), esperadas);
});

test('los ficheros woff2 lo son de verdad', () => {
  for (const nombre of Object.keys(COPIAS).filter((n) => n.endsWith('.woff2'))) {
    assert.equal(readFileSync(`${APP}fuentes/${nombre}`).subarray(0, 4).toString('latin1'), 'wOF2', nombre);
  }
});
