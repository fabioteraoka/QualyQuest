/**
 * Utilitário Universal de Hashing Criptográfico SHA-256 (FIPS 180-4)
 * Atende aos requisitos da especificação do Acervo de IA (QualyQuest SGQ).
 * Gera hash hexadecimal canônico de 64 caracteres (256 bits) de forma 100% determinística.
 */

export function sha256Pure(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result = '';

  const words: number[] = [];
  const utf8: number[] = [];
  for (let c = 0; c < ascii.length; c++) {
    let charcode = ascii.charCodeAt(c);
    if (charcode < 0x80) utf8.push(charcode);
    else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(0xe0 | (charcode >> 12), 0x80 | ((charcode >> 6) & 0x3f), 0x80 | (charcode & 0x3f));
    } else {
      c++;
      charcode = 0x10000 + (((charcode & 0x3ff) << 10) | (ascii.charCodeAt(c) & 0x3ff));
      utf8.push(
        0xf0 | (charcode >> 18),
        0x80 | ((charcode >> 12) & 0x3f),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f)
      );
    }
  }

  const utf8BitLength = utf8.length * 8;
  for (let i = 0; i < utf8.length; i++) {
    words[i >> 2] |= utf8[i] << (24 - (i % 4) * 8);
  }

  words[utf8.length >> 2] |= 0x80 << (24 - (utf8.length % 4) * 8);
  const endBlock = ((utf8.length + 8) >> 6) << 4;
  while (words.length < endBlock + 16) words.push(0);
  words[endBlock + 14] = Math.floor(utf8BitLength / maxWord);
  words[endBlock + 15] = utf8BitLength % maxWord;

  const hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];

  const w = new Array(64);
  for (let i = 0; i < words.length; i += 16) {
    let s0 = hash[0], s1 = hash[1], s2 = hash[2], s3 = hash[3];
    let s4 = hash[4], s5 = hash[5], s6 = hash[6], s7 = hash[7];

    for (let j = 0; j < 64; j++) {
      if (j < 16) {
        w[j] = words[j + i] | 0;
      } else {
        const gamma0 = rightRotate(w[j - 15], 7) ^ rightRotate(w[j - 15], 18) ^ (w[j - 15] >>> 3);
        const gamma1 = rightRotate(w[j - 2], 17) ^ rightRotate(w[j - 2], 19) ^ (w[j - 2] >>> 10);
        w[j] = (w[j - 16] + gamma0 + w[j - 7] + gamma1) | 0;
      }

      const s0rr = rightRotate(s0, 2) ^ rightRotate(s0, 13) ^ rightRotate(s0, 22);
      const maj = (s0 & s1) ^ (s0 & s2) ^ (s1 & s2);
      const t2 = (s0rr + maj) | 0;

      const s4rr = rightRotate(s4, 6) ^ rightRotate(s4, 11) ^ rightRotate(s4, 25);
      const ch = (s4 & s5) ^ (~s4 & s6);
      const t1 = (s7 + s4rr + ch + k[j] + w[j]) | 0;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + t1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (t1 + t2) | 0;
    }

    hash[0] = (hash[0] + s0) | 0;
    hash[1] = (hash[1] + s1) | 0;
    hash[2] = (hash[2] + s2) | 0;
    hash[3] = (hash[3] + s3) | 0;
    hash[4] = (hash[4] + s4) | 0;
    hash[5] = (hash[5] + s5) | 0;
    hash[6] = (hash[6] + s6) | 0;
    hash[7] = (hash[7] + s7) | 0;
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 3; j >= 0; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }

  return result;
}

/**
 * Calcula hash SHA-256 canônico de 64 caracteres hexadecimais para qualquer texto
 */
export function calcularHashSHA256(texto: string): string {
  if (!texto) return 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

  try {
    if (typeof process !== 'undefined' && (process as any).versions?.node) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodeCrypto = require('crypto');
      if (nodeCrypto && typeof nodeCrypto.createHash === 'function') {
        return nodeCrypto.createHash('sha256').update(texto, 'utf8').digest('hex');
      }
    }
  } catch {
    // Fallback
  }

  return sha256Pure(texto);
}
