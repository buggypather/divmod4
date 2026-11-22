import { describe, expect, it } from 'vitest';
import {
  awayDiv, awayMod, ceilDiv, ceilMod, div, divmod, euclidDiv, euclidMod, floorDiv, floorMod, mod, MODES,
  roundDiv, roundMod, truncDiv, truncMod, type Mode,
} from '../src/index';

// The answers for 7 and 2 with every sign, worked out by hand: [q, r] per mode.
const TABLE: Record<string, Record<Mode, [number, number]>> = {
  '7,2': { trunc: [3, 1], away: [4, -1], floor: [3, 1], ceil: [4, -1], euclid: [3, 1], round: [4, -1] },
  '-7,2': { trunc: [-3, -1], away: [-4, 1], floor: [-4, 1], ceil: [-3, -1], euclid: [-4, 1], round: [-4, 1] },
  '7,-2': { trunc: [-3, 1], away: [-4, -1], floor: [-4, -1], ceil: [-3, 1], euclid: [-3, 1], round: [-4, -1] },
  '-7,-2': { trunc: [3, -1], away: [4, 1], floor: [3, -1], ceil: [4, 1], euclid: [4, 1], round: [4, 1] },
};

const sign = (x: number | bigint) => (x > 0 ? 1 : x < 0 ? -1 : 0);

/** What each mode promises about its remainder (with r ≠ 0). */
function remainderRule(mode: Mode, a: number | bigint, b: number | bigint, q: number | bigint, r: number | bigint): boolean {
  if (sign(r) === 0) return true;
  const absR = r < 0 ? -r : r;
  const absB = b < 0 ? -b : b;
  if (!(absR < absB)) return false;
  switch (mode) {
    case 'trunc': return sign(r) === sign(a);
    case 'away': return sign(r) === -sign(a);
    case 'floor': return sign(r) === sign(b);
    case 'ceil': return sign(r) === -sign(b);
    case 'euclid': return sign(r) > 0;
    case 'round': {
      const twice = typeof absR === 'bigint' ? 2n * absR : 2 * (absR as number);
      if (twice < absB) return true;
      if (twice > absB) return false;
      return typeof q === 'bigint' ? q % 2n === 0n : (q as number) % 2 === 0; // ties to an even q
    }
  }
}

describe('divmod', () => {
  it('matches the hand-worked table, for numbers and BigInts', () => {
    for (const [key, row] of Object.entries(TABLE)) {
      const [a, b] = key.split(',').map(Number);
      for (const mode of MODES) {
        expect(divmod(a, b, mode), `${a} ÷ ${b} ${mode}`).toEqual({ q: row[mode][0], r: row[mode][1] });
        expect(divmod(BigInt(a), BigInt(b), mode)).toEqual({ q: BigInt(row[mode][0]), r: BigInt(row[mode][1]) });
      }
    }
  });

  it('trunc is exactly JavaScript\'s % and BigInt division', () => {
    for (let i = 0; i < 2000; i++) {
      const a = Math.floor(Math.random() * 2001) - 1000;
      const b = (Math.floor(Math.random() * 100) + 1) * (Math.random() < 0.5 ? -1 : 1);
      expect(truncMod(a, b)).toBe(a % b === 0 ? 0 : a % b);
      expect(truncDiv(BigInt(a), BigInt(b))).toBe(BigInt(a) / BigInt(b));
    }
  });

  it('keeps a = b·q + r and each mode\'s promise, on random numbers and BigInts', () => {
    for (let i = 0; i < 20000; i++) {
      const a = Math.floor(Math.random() * 20001) - 10000;
      const b = (Math.floor(Math.random() * 60) + 1) * (Math.random() < 0.5 ? -1 : 1);
      for (const mode of MODES) {
        const { q, r } = divmod(a, b, mode);
        expect(Number.isInteger(q)).toBe(true);
        expect(b * q + r).toBe(a);
        expect(remainderRule(mode, a, b, q, r), `${a} ÷ ${b} ${mode} gave q ${q} r ${r}`).toBe(true);
        const big = divmod(BigInt(a), BigInt(b), mode);
        expect(big).toEqual({ q: BigInt(q), r: BigInt(r) }); // numbers and BigInts agree
      }
    }
  });

  it('works on BigInts far past 2^53', () => {
    const a = -(10n ** 40n) - 7n;
    const b = 10n ** 20n + 3n;
    for (const mode of MODES) {
      const { q, r } = divmod(a, b, mode);
      expect(b * q + r).toBe(a);
      expect(remainderRule(mode, a, b, q, r)).toBe(true);
    }
  });

  it('rounds ties to an even quotient', () => {
    expect(divmod(5, 2, 'round')).toEqual({ q: 2, r: 1 }); // 2.5 → 2
    expect(divmod(7, 2, 'round')).toEqual({ q: 4, r: -1 }); // 3.5 → 4
    expect(divmod(-5, 2, 'round')).toEqual({ q: -2, r: -1 });
    expect(divmod(9n, 6n, 'round')).toEqual({ q: 2n, r: -3n }); // 1.5 → 2
  });

  it('gives the distance to the next multiple with ceil', () => {
    expect(ceilMod(4, 6)).toBe(-2);
    expect(ceilMod(10, 7)).toBe(-4);
    expect(-ceilMod(1000, 512)).toBe(24); // bytes of padding to a 512-byte block
  });

  it('handles fractions, exact multiples and zero without negative zeros', () => {
    expect(divmod(7.5, 2, 'floor')).toEqual({ q: 3, r: 1.5 });
    expect(divmod(-7.5, 2, 'euclid')).toEqual({ q: -4, r: 0.5 });
    for (const mode of MODES) {
      expect(Object.is(divmod(-4, 2, mode).r, 0)).toBe(true);
      expect(Object.is(divmod(0, -3, mode).q, 0)).toBe(true);
    }
  });

  it('has div, mod and a named pair for each mode', () => {
    expect(div(-7, 2)).toBe(-4); // floor by default
    expect(mod(-7, 2)).toBe(1);
    expect([awayDiv(7, 2), awayMod(7, 2)]).toEqual([4, -1]);
    expect([floorDiv(-7n, 2n), floorMod(-7n, 2n)]).toEqual([-4n, 1n]);
    expect([ceilDiv(7, 2), ceilMod(7, 2)]).toEqual([4, -1]);
    expect([euclidDiv(7, -2), euclidMod(7, -2)]).toEqual([-3, 1]);
    expect([roundDiv(7, 3), roundMod(7, 3)]).toEqual([2, 1]);
  });

  it('explains what it can\'t do', () => {
    expect(() => divmod(1, 0)).toThrow(RangeError);
    expect(() => divmod(1n, 0n)).toThrow(RangeError);
    expect(() => divmod(Infinity, 2)).toThrow(RangeError);
    expect(() => divmod(NaN, 2)).toThrow(RangeError);
    expect(() => (divmod as (a: unknown, b: unknown) => unknown)(1, 2n)).toThrow(TypeError);
    expect(() => divmod(1, 2, 'sideways' as Mode)).toThrow(TypeError);
  });
});
