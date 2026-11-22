// divmod4: division with a remainder, every way it's done, for numbers and BigInts.
//
// Every mode gives a quotient q (a whole number) and a remainder r with  a = b × q + r  and
// |r| < |b|. The modes differ only in which way q is rounded, which decides the remainder's sign:
//
//   trunc   q rounds toward zero          r has the sign of a      (JavaScript's %, C, Java)
//   away    q rounds away from zero       r has the opposite sign of a   (the opposite of %)
//   floor   q rounds down                 r has the sign of b      (Python's %)
//   ceil    q rounds up                   r has the opposite sign of b   (distance to the next multiple)
//   euclid  q rounds so that r ≥ 0        r is never negative      (most of mathematics)
//   round   q rounds to the nearest       |r| ≤ |b| / 2, ties to an even q  (least absolute remainder)
//
// Numbers: exact for whole numbers up to 2^53, and works for fractions too (q is still whole).
// BigInts: exact at any size.

export type Mode = 'trunc' | 'away' | 'floor' | 'ceil' | 'euclid' | 'round';
export const MODES: readonly Mode[] = ['trunc', 'away', 'floor', 'ceil', 'euclid', 'round'];

export interface DivMod<T extends number | bigint> {
  /** The quotient, a whole number. */
  q: T;
  /** The remainder: a = b × q + r. */
  r: T;
}

// ---- The rounding rules, shared by numbers and BigInts ----

/**
 * From the truncated quotient and remainder, how far to move q: 0, or ±1 (r then moves by ∓b).
 * `ra`, `rb` and `rr` are the signs (-1, 0 or 1) of a, b and the truncated r; `half` compares
 * 2|r| with |b| (-1 less, 0 equal, 1 more); `qOdd` says whether the truncated q is odd.
 */
function step(mode: Mode, sa: number, sb: number, sr: number, half: number, qOdd: boolean): number {
  if (sr === 0) return 0; // divides exactly: every mode agrees
  const away = sa * sb; // the step that moves q away from zero (r's sign is then flipped)
  switch (mode) {
    case 'trunc':
      return 0;
    case 'away':
      return away;
    case 'floor':
      return sr === sb ? 0 : -1;
    case 'ceil':
      return sr === sb ? 1 : 0;
    case 'euclid':
      return sr > 0 ? 0 : sb > 0 ? -1 : 1;
    case 'round':
      return half > 0 || (half === 0 && qOdd) ? away : 0;
  }
}

const sign = (x: number) => (x > 0 ? 1 : x < 0 ? -1 : 0);
const bsign = (x: bigint) => (x > 0n ? 1 : x < 0n ? -1 : 0);

// ---- Numbers ----

function numberDivMod(a: number, b: number, mode: Mode): DivMod<number> {
  if (!Number.isFinite(a) || !Number.isFinite(b)) throw new RangeError(`divmod4: ${a} and ${b} must both be finite numbers`);
  if (b === 0) throw new RangeError('divmod4: division by zero');
  // JavaScript's % is exact (IEEE fmod), so start from the truncated pair.
  let r = a % b;
  let q = Math.round((a - r) / b);
  const s = step(mode, sign(a), sign(b), sign(r), sign(2 * Math.abs(r) - Math.abs(b)), Math.abs(q) % 2 === 1);
  if (s !== 0) {
    q += s;
    r -= b * s;
  }
  // No negative zeros.
  return { q: q === 0 ? 0 : q, r: r === 0 ? 0 : r };
}

// ---- BigInts ----

function bigintDivMod(a: bigint, b: bigint, mode: Mode): DivMod<bigint> {
  if (b === 0n) throw new RangeError('divmod4: division by zero');
  let q = a / b; // BigInt division truncates
  let r = a % b;
  const absR = r < 0n ? -r : r;
  const absB = b < 0n ? -b : b;
  const s = step(mode, bsign(a), bsign(b), bsign(r), bsign(2n * absR - absB), q % 2n !== 0n);
  if (s !== 0) {
    q += BigInt(s);
    r -= b * BigInt(s);
  }
  return { q, r };
}

// ---- The API ----

/** Quotient and remainder of a ÷ b, rounded as `mode` says (default 'floor'). */
export function divmod(a: number, b: number, mode?: Mode): DivMod<number>;
export function divmod(a: bigint, b: bigint, mode?: Mode): DivMod<bigint>;
export function divmod(a: number | bigint, b: number | bigint, mode: Mode = 'floor'): DivMod<number> | DivMod<bigint> {
  if (!MODES.includes(mode)) throw new TypeError(`divmod4: unknown mode "${mode}" (use ${MODES.join(', ')})`);
  if (typeof a === 'bigint' && typeof b === 'bigint') return bigintDivMod(a, b, mode);
  if (typeof a === 'number' && typeof b === 'number') return numberDivMod(a, b, mode);
  throw new TypeError('divmod4: give two numbers or two BigInts, not one of each');
}

/** The quotient of a ÷ b, rounded as `mode` says (default 'floor'). */
export function div(a: number, b: number, mode?: Mode): number;
export function div(a: bigint, b: bigint, mode?: Mode): bigint;
export function div(a: number | bigint, b: number | bigint, mode: Mode = 'floor'): number | bigint {
  return (divmod as (a: number | bigint, b: number | bigint, m: Mode) => DivMod<number | bigint>)(a, b, mode).q;
}

/** The remainder of a ÷ b, for a quotient rounded as `mode` says (default 'floor'). */
export function mod(a: number, b: number, mode?: Mode): number;
export function mod(a: bigint, b: bigint, mode?: Mode): bigint;
export function mod(a: number | bigint, b: number | bigint, mode: Mode = 'floor'): number | bigint {
  return (divmod as (a: number | bigint, b: number | bigint, m: Mode) => DivMod<number | bigint>)(a, b, mode).r;
}

// Named shortcuts, one pair per mode: xDiv gives the quotient, xMod the remainder.
type Op = { (a: number, b: number): number; (a: bigint, b: bigint): bigint };
const quot = (mode: Mode) => ((a: never, b: never) => div(a, b, mode)) as Op;
const rem = (mode: Mode) => ((a: never, b: never) => mod(a, b, mode)) as Op;

/** Rounds toward zero, like JavaScript's own % (remainder has the sign of a). */
export const truncDiv = quot('trunc');
export const truncMod = rem('trunc');
/** Rounds away from zero: the opposite of % (remainder has the opposite sign of a). */
export const awayDiv = quot('away');
export const awayMod = rem('away');
/** Rounds down, like Python (remainder has the sign of b). */
export const floorDiv = quot('floor');
export const floorMod = rem('floor');
/** Rounds up (remainder has the opposite sign of b: the distance up to the next multiple). */
export const ceilDiv = quot('ceil');
export const ceilMod = rem('ceil');
/** Euclidean: the remainder is never negative. */
export const euclidDiv = quot('euclid');
export const euclidMod = rem('euclid');
/** Nearest: the smallest remainder in size, ties to an even quotient. */
export const roundDiv = quot('round');
export const roundMod = rem('round');
