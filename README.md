# divmod4

Division with a remainder, every way it's done, for JavaScript and TypeScript numbers and BigInts.
No dependencies.

JavaScript's `%` gives `-7 % 2 === -1`; Python gives `1`; mathematicians usually want `1` as well,
and sometimes you want the distance up to the next multiple. They're all correct: they just round
the quotient differently. divmod4 gives you each one by name, with the quotient and remainder
together, and does it right for BigInts too (whose `/` also truncates).

```sh
npm install divmod4
```

```ts
import { divmod, floorMod, euclidMod, awayMod } from 'divmod4';

divmod(-7, 2);              // { q: -4, r: 1 }    floored, the default
divmod(-7, 2, 'trunc');     // { q: -3, r: -1 }   the same as JavaScript's / and %
divmod(-7n, 2n, 'euclid');  // { q: -4n, r: 1n }  BigInts work the same way
floorMod(-7, 2);            // 1
awayMod(7, 2);              // -1                 the opposite of 7 % 2
```

## The six ways

Every mode gives a whole-number quotient `q` and a remainder `r` with **a = b × q + r** and
**|r| < |b|**. They differ only in which way `q` is rounded, which decides the remainder's sign.

| Mode | q rounds | r has the sign of | Where you meet it | Functions |
| --- | --- | --- | --- | --- |
| `trunc` | toward zero | a | `%` in JavaScript, C, Java | `truncDiv`, `truncMod` |
| `away` | away from zero | the opposite of a | the opposite of `%` | `awayDiv`, `awayMod` |
| `floor` | down | b | `%` and `//` in Python | `floorDiv`, `floorMod` |
| `ceil` | up | the opposite of b | padding up to the next multiple | `ceilDiv`, `ceilMod` |
| `euclid` | so that r ≥ 0 | never negative | most of mathematics, Rust's `rem_euclid` | `euclidDiv`, `euclidMod` |
| `round` | to the nearest (ties to even q) | whichever is smaller | least absolute remainder | `roundDiv`, `roundMod` |

`trunc` and `away` are the two that round by size (toward or away from zero); the other four
round by direction or by the remainder.

For 7 and 2 with every sign, as `q, r`:

| a ÷ b | trunc | away | floor | ceil | euclid | round |
| --- | --- | --- | --- | --- | --- | --- |
| 7 ÷ 2 | 3, 1 | 4, −1 | 3, 1 | 4, −1 | 3, 1 | 4, −1 |
| −7 ÷ 2 | −3, −1 | −4, 1 | −4, 1 | −3, −1 | −4, 1 | −4, 1 |
| 7 ÷ −2 | −3, 1 | −4, −1 | −4, −1 | −3, 1 | −3, 1 | −4, −1 |
| −7 ÷ −2 | 3, −1 | 4, 1 | 3, −1 | 4, 1 | 4, 1 | 4, 1 |

## API

- `divmod(a, b, mode = 'floor')` → `{ q, r }`
- `div(a, b, mode = 'floor')` → `q`
- `mod(a, b, mode = 'floor')` → `r`
- A pair for each mode: `truncDiv` / `truncMod`, `awayDiv` / `awayMod`, `floorDiv` / `floorMod`,
  `ceilDiv` / `ceilMod`, `euclidDiv` / `euclidMod`, `roundDiv` / `roundMod`
- `MODES`, the list of modes, and the `Mode` and `DivMod` types

Give two numbers or two BigInts. Numbers are exact for whole numbers up to 2^53 and also work with
fractions (`divmod(7.5, 2)` is `{ q: 3, r: 1.5 }`); BigInts are exact at any size. Dividing by zero,
infinity or NaN throws a `RangeError`, and mixing a number with a BigInt throws a `TypeError`.
Results never contain `-0`.

## Why not a `!%` operator?

`awayMod` is what an operator like `a !% b` would give: the opposite of `%`. JavaScript can't gain
an operator from a library, though: new syntax goes through TC39, the committee that designs the
language, and needs a proposal, a champion on the committee and years of review. (`a !% b` is a
syntax error today, so the spelling is at least free.) Functions work everywhere now, and a Babel
or TypeScript transform could turn `a !% b` into `awayMod(a, b)` for anyone who wants to try the
syntax.

## Develop

```sh
npm install
npm test        # the worked table, plus 120,000 random checks of a = b·q + r and each mode's rule
npm run build
```

Releasing: raise `version` in package.json, add a line to CHANGELOG.md, then make a GitHub release
with a tag like `v0.1.1`; GitHub publishes it to npm (trusted publishing, set up once on npmjs.com).

## Licence

MIT
