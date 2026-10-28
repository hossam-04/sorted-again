---
id: 1922
module: number-theory
patterns: [fast modular exponentiation, counting choices]
signature: "def countGoodNumbers(self, n: int) -> int"
perf_repeat: 1000
---

## Task

A digit string (leading zeros allowed) is **good** if every digit at an even index (0, 2, 4, …) is even, 0, 2, 4, 6 or 8, and every digit at an odd index is prime, 2, 3, 5 or 7.

Return how many good digit strings of length `n` there are. The count is enormous, so return it **modulo 1,000,000,007**.

## Constraints

- `1 <= n <= 10**15`

```json examples
[
  {"args": [3], "out": 100, "why": "Positions 0 and 2 have 5 choices each, position 1 has 4: 5 × 4 × 5 = 100."},
  {"args": [2], "out": 20, "why": "5 even digits, then 4 prime digits."},
  {"args": [25], "out": 856640007, "why": "13 even positions and 12 odd ones: 5¹³ × 4¹² is about 2 × 10¹⁶, so the remainder is returned."}
]
```

```json edge
[
  {"name": "one digit", "args": [1], "out": 5},
  {"name": "an even length", "args": [6], "out": 8000},
  {"name": "just over the modulus", "args": [14], "out": 279999993},
  {"name": "a hundred thousand digits", "args": [100000], "out": 86331955}
]
```

```python oracle
class Solution:
    def countGoodNumbers(self, n: int) -> int:
        mod = 10**9 + 7
        return pow(5, (n + 1) // 2, mod) * pow(4, n // 2, mod) % mod
```

```python gen
def gen(rng, size):
    return [rng.randint(1, 20) if size == "small" else rng.randint(1, 100_000)]
```

```python perf
def perf(rng):
    # The largest n, asked 1,000 times.
    return [10**15]
```

## Hints

1. The positions are independent: (n + 1) // 2 even positions with 5 choices each and n // 2 odd positions with 4 each. The answer is 5^((n+1)//2) × 4^(n//2), reduced modulo 10⁹ + 7.
2. Multiplying one factor at a time takes n steps, and n can be 10¹⁵. You need a power in O(log n) multiplications.
3. **Square and multiply**: xᵉ = (x^(e/2))² when e is even, and x · x^(e−1) when e is odd. Walking through the bits of e, square the base at every step and multiply it into the result when the bit is 1. Reduce after every multiplication.

## Solution

```python solution time="log n" space="1"
class Solution:
    def countGoodNumbers(self, n: int) -> int:
        mod = 10**9 + 7

        def power(base, exp):  # base ** exp % mod, by repeated squaring
            result = 1
            base %= mod
            while exp:
                if exp & 1:
                    result = result * base % mod
                base = base * base % mod  # base ** 2, ** 4, ** 8, ...
                exp >>= 1
            return result

        return power(5, (n + 1) // 2) * power(4, n // 2) % mod
```

The count is a product of independent choices, so it's two powers multiplied together. Each power is computed by **binary exponentiation**: the exponent's binary digits say which of base, base², base⁴, base⁸, … to multiply together, and each of those is the square of the one before. That's about log₂ n squarings, fifty for 10¹⁵.

Reducing after every multiplication keeps every number below 10⁹ + 7, so each product is below 10¹⁹. Python's integers would cope without it, but the numbers would grow to millions of digits and the arithmetic would crawl.

## Alternatives

### Python's three-argument pow

```python alt time="log n" space="1"
class Solution:
    def countGoodNumbers(self, n: int) -> int:
        mod = 10**9 + 7
        return pow(5, (n + 1) // 2, mod) * pow(4, n // 2, mod) % mod
```

`pow(base, exp, mod)` is binary exponentiation built in, in C. It's the right tool in real code; writing the loop yourself is what interviewers want to see once, and what you need in languages that don't have it.

## Wrong answers

### Swaps the digit counts

```python wrong fails="example" test="Example 1"
class Solution:
    def countGoodNumbers(self, n: int) -> int:
        mod = 10**9 + 7
        return pow(4, (n + 1) // 2, mod) * pow(5, n // 2, mod) % mod  # 4 choices at even positions?
```

There are five even digits (0, 2, 4, 6, 8, counting 0) and four prime digits (2, 3, 5, 7). With the counts swapped, Example 1 gives 4 × 5 × 4 = 80 instead of 100.

### Counts the even positions with n // 2

```python wrong fails="example" test="Example 1"
class Solution:
    def countGoodNumbers(self, n: int) -> int:
        mod = 10**9 + 7
        return pow(5, n // 2, mod) * pow(4, n // 2, mod) % mod  # loses an even position when n is odd
```

Positions start at 0, which is even, so an odd length has one more even position than odd ones: (n + 1) // 2 of them. With n // 2 for both, every odd n loses a factor of 5: Example 1 gives 20.

### Multiplies one position at a time

```python wrong fails="perf"
class Solution:
    def countGoodNumbers(self, n: int) -> int:
        mod = 10**9 + 7
        count = 1
        for i in range(n):  # n multiplications
            count = count * (5 if i % 2 == 0 else 4) % mod
        return count
```

Correct, and fine for a hundred thousand digits. For n = 10¹⁵ it would need 10¹⁵ multiplications. Repeated squaring needs about fifty.
