---
id: 50
module: recursion
patterns: [divide and conquer, fast exponentiation]
signature: "def myPow(self, x: float, n: int) -> float"
compare: float
tol: 0.00001
perf_repeat: 10000
---

## Task

You get a number `x` and an integer `n`, which may be negative or zero. Return x raised to the power n, as a float.

Build it from multiplications yourself instead of calling `**`, `pow` or `math.pow`: the point is to need far fewer than n of them. For negative n, x to the n is 1 divided by x to the −n.

Answers within 0.00001 (absolute or relative) of the exact value count as correct.

## Constraints

- `-100 < x < 100`
- `-2**31 <= n <= 2**31 - 1`
- `x` is not 0 when `n <= 0`
- The answer is between `-10**4` and `10**4`

```json examples
[
  {"args": [3.0, 4], "out": 81.0, "why": "3 × 3 × 3 × 3 = 81."},
  {"args": [0.5, -3], "out": 8.0, "why": "A negative power is a reciprocal: 1 / 0.5³ = 1 / 0.125 = 8."},
  {"args": [1.5, 0], "out": 1.0, "why": "Anything (except 0) to the power 0 is 1."}
]
```

```json edge
[
  {"name": "exponent one", "args": [7.5, 1], "out": 7.5},
  {"name": "negative base, odd exponent", "args": [-2.0, 3], "out": -8.0},
  {"name": "negative base, even exponent", "args": [-2.0, 4], "out": 16.0},
  {"name": "zero base", "args": [0.0, 5], "out": 0.0},
  {"name": "minus one", "args": [-1.0, -7], "out": -1.0},
  {"name": "a fraction to a negative power", "args": [0.25, -5], "out": 1024.0},
  {"name": "a million multiplications", "args": [1.000001, 1000000], "out": 2.7182804690957534}
]
```

```python gen
def gen(rng, size):
    while True:
        if size == "small":
            x, n = round(rng.uniform(-3, 3), 2), rng.randint(-6, 6)
        else:
            x, n = round(rng.uniform(0.8, 1.25), 4) * rng.choice((1, -1)), rng.randint(-40, 40)
        if (x != 0 or n > 0) and abs(x) ** n <= 10**4:
            return [x, n]
```

```python perf
def perf(rng):
    # An exponent near 2**31, computed 10,000 times. A base this close to 1 keeps the answer small.
    return [1.000000001, 2**31 - 1]
```

## Hints

1. Multiplying x by itself n times is O(n), and n can be two billion. Can one result be reused to get the next?
2. x to the 2k is (x to the k) squared, so one multiplication doubles the exponent. For odd exponents, multiply in one extra x.
3. Recursively: compute `half = self.myPow(x, n // 2)` once, then return `half * half`, times x if n is odd. Handle negative n first by inverting x.

## Solution

```python solution time="log n" space="1"
class Solution:
    def myPow(self, x: float, n: int) -> float:
        if n < 0:
            x, n = 1 / x, -n  # x to the -n is (1/x) to the n
        result = 1.0
        while n:
            if n & 1:          # this binary digit of n is 1: include the current power
                result *= x
            x *= x             # x, x², x⁴, x⁸, ... one squaring per binary digit
            n >>= 1
        return result
```

Write n in binary. For n = 13 = 1101₂, x¹³ = x⁸ · x⁴ · x¹. The loop squares `x` once per binary digit of n, producing x, x², x⁴, x⁸, …, and multiplies the ones whose digit is 1 into `result`. A negative exponent is handled first by switching to 1/x, since x to the −n is (1/x) to the n.

n has about log₂ n binary digits, so the loop runs about 31 times even for n near 2³¹: O(log n) multiplications and O(1) space.

## Alternatives

### Use the power operator

```python alt time="log n" space="1" oracle
class Solution:
    def myPow(self, x: float, n: int) -> float:
        return x ** n
```

Python's `**` does exactly this job (and the task asks you not to use it). It's the obvious check for your own version.

### Recursive halving

```python alt time="log n" space="log n"
class Solution:
    def myPow(self, x: float, n: int) -> float:
        if n < 0:
            return 1 / self.myPow(x, -n)
        if n == 0:
            return 1.0
        half = self.myPow(x, n // 2)  # computed once, used twice
        return half * half * (x if n % 2 else 1)
```

The same idea top-down: x to the n is (x to the n//2) squared, times one more x for odd n. Calling the function once and squaring is what makes it O(log n); calling it twice for the two halves would bring back O(n) calls. It recurses about 31 levels deep.

## Wrong answers

### Ignores negative exponents

```python wrong fails="example" test="Example 2"
class Solution:
    def myPow(self, x: float, n: int) -> float:
        result = 1.0
        while n > 0:  # a negative n skips the loop entirely
            if n & 1:
                result *= x
            x *= x
            n >>= 1
        return result
```

Fast exponentiation is right for n ≥ 0, but for negative n the loop never runs and the answer is 1. Invert x (and negate n) first.

### Peels off one factor per call

```python wrong fails="edge" test="a million multiplications" how="error"
class Solution:
    def myPow(self, x: float, n: int) -> float:
        if n < 0:
            return 1 / self.myPow(x, -n)
        if n == 0:
            return 1.0
        return x * self.myPow(x, n - 1)  # one nested call per multiplication
```

The recursion is correct, but each call removes a single factor, so the depth equals n. For n = 1,000,000 that goes past the recursion limit (100,000 here, 1,000 in a default Python) and raises `RecursionError`. Halve the exponent instead of decrementing it.

### Multiplies n times

```python wrong fails="perf"
class Solution:
    def myPow(self, x: float, n: int) -> float:
        if n < 0:
            x, n = 1 / x, -n
        result = 1.0
        for _ in range(n):  # n multiplications: two billion for n near 2**31
            result *= x
        return result
```

A loop doesn't hit the recursion limit, and for small n it's fine. But it's O(n): for an exponent near 2³¹ a single call does two billion multiplications, and the performance test asks 10,000 times.

## Notes

In languages with 32-bit integers, `-n` overflows when n = −2³¹, because 2³¹ doesn't fit; Python integers don't have that problem. The same squaring trick computes powers modulo a number, which is how `pow(a, b, m)` and RSA encryption work.
