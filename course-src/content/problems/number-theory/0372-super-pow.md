---
id: 372
module: number-theory
patterns: [modular exponentiation, one digit of the exponent at a time]
signature: "def superPow(self, a: int, b: List[int]) -> int"
perf_repeat: 100
---

## Task

Return `a` raised to the power `b`, modulo 1337. The exponent `b` can be enormous, so it's given as a list of its decimal digits, most significant first: `[1, 0, 2]` means 102.

## Constraints

- `1 <= a <= 2**31 - 1`
- `1 <= len(b) <= 2000`, each element a digit from 0 to 9
- `b` has no leading zeros

```json examples
[
  {"args": [3, [4]], "out": 81, "why": "3⁴ = 81, already below 1337."},
  {"args": [2, [1, 1]], "out": 711, "why": "2¹¹ = 2048, and 2048 − 1337 = 711."},
  {"args": [7, [1, 1, 4, 0]], "out": 574, "why": "7¹¹⁴⁰ mod 1337. 1337 = 7 × 191 shares the factor 7 with the base, which matters for the shortcuts in the wrong answers below."}
]
```

```json edge
[
  {"name": "a base of 1", "args": [1, [9, 9, 9]], "out": 1},
  {"name": "a multiple of 1337", "args": [1337, [5]], "out": 0},
  {"name": "the largest base", "args": [2147483647, [1]], "out": 932},
  {"name": "an exponent above 1337", "args": [2, [1, 3, 4, 0]], "out": 1215},
  {"name": "zeros in the exponent", "args": [10, [1, 0, 1]], "out": 306},
  {"name": "a five-digit exponent", "args": [5, [9, 9, 9, 9, 9]], "out": 216}
]
```

```python oracle
class Solution:
    def superPow(self, a: int, b: List[int]) -> int:
        return pow(a, int("".join(map(str, b))), 1337)
```

```python gen
def gen(rng, size):
    digits = rng.randint(1, 3) if size == "small" else rng.randint(1, 5)
    b = [rng.randint(1, 9)] + [rng.randint(0, 9) for _ in range(digits - 1)]
    a = rng.randint(1, 20) if size == "small" else rng.choice([rng.randint(1, 2**31 - 1), 7 * rng.randint(1, 1000), 191 * rng.randint(1, 1000)])
    return [a, b]
```

```python perf
def perf(rng):
    # A 2,000-digit exponent, asked 100 times.
    return [rng.randint(1, 2**31 - 1), [rng.randint(1, 9)] + [rng.randint(0, 9) for _ in range(1999)]]
```

## Hints

1. Reduce the base first: `a % 1337` gives the same result. The difficulty is the exponent, which can have 2,000 digits.
2. If `b` is the digits so far followed by one more digit d, then a^b = (a^(digits so far))¹⁰ × a^d. So the answer can be built digit by digit, from the left.
3. Keep `result = a^(digits so far) mod 1337`. For each new digit: `result = result¹⁰ × a^d`, reduced modulo 1337 after every step, using fast exponentiation for the small powers.

## Solution

```python solution time="len(b)" space="1"
class Solution:
    def superPow(self, a: int, b: List[int]) -> int:
        mod = 1337
        a %= mod
        result = 1  # a ** (the digits read so far), mod 1337
        for d in b:
            result = pow(result, 10, mod) * pow(a, d, mod) % mod  # one more digit: x ** 10 * a ** d
        return result
```

Reading a number's digits from the left, each new digit multiplies the value by 10 and adds d, so the power is raised to the 10th and multiplied by a^d. Both are small powers, done with `pow(…, …, mod)`, and reducing after every step keeps every number below 1337², whatever the exponent's length.

That's a constant amount of work per digit: O(len(b)). The same idea, reading an exponent in pieces, works for any base and any modulus, which matters here because 1337 = 7 × 191 isn't prime.

## Alternatives

### Let Python handle the big exponent

```python alt time="len(b)" space="len(b)"
class Solution:
    def superPow(self, a: int, b: List[int]) -> int:
        return pow(a, int("".join(map(str, b))), 1337)  # a 2,000-digit exponent is fine for pow
```

Python's integers have no size limit, so the exponent can simply be built as one integer, and three-argument `pow` does binary exponentiation over its 6,600 or so bits. It's the shortest correct answer; the digit-by-digit version is what you'd write in a language with fixed-size integers, and what the problem was designed to test.

## Wrong answers

### Reduces the exponent modulo 1337

```python wrong fails="edge" test="an exponent above 1337"
class Solution:
    def superPow(self, a: int, b: List[int]) -> int:
        exp = 0
        for d in b:
            exp = (exp * 10 + d) % 1337  # wrong: exponents don't repeat with period 1337
        return pow(a, exp, 1337)
```

The base can be reduced modulo 1337, but the exponent can't: a^1337 is not a^0 in general. Powers modulo m repeat with a period that divides φ(m) (when the base is coprime to m), which is a different number. For 2^1340 this computes 2³ = 8 instead of 1215.

### Reduces the exponent with Euler's theorem

```python wrong fails="example" test="Example 3"
class Solution:
    def superPow(self, a: int, b: List[int]) -> int:
        phi = 6 * 190  # φ(1337) = φ(7) × φ(191) = 1140
        exp = 0
        for d in b:
            exp = (exp * 10 + d) % phi  # valid only when gcd(a, 1337) == 1
        return pow(a, exp, 1337)
```

Euler's theorem says a^φ(m) ≡ 1 (mod m), so exponents can be reduced modulo φ(1337) = 1140, *if a and 1337 have no common factor*. For a = 7 they share the factor 7, and in Example 3 the exponent 1140 is reduced to 0, giving 1 instead of 574. Reading the exponent digit by digit needs no such condition.

### Multiplies b times

```python wrong fails="perf"
class Solution:
    def superPow(self, a: int, b: List[int]) -> int:
        exp = int("".join(map(str, b)))
        result = 1
        for _ in range(exp):  # one multiplication per unit of the exponent
            result = result * a % 1337
        return result
```

Correct for small exponents, and hopeless for a 2,000-digit one: the loop would run about 10²⁰⁰⁰ times. Repeated squaring, or one step per digit, keeps the work proportional to the exponent's *length*.
