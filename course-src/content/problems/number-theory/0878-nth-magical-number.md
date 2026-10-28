---
id: 878
module: number-theory
patterns: [lcm and inclusion–exclusion, binary search on the answer]
signature: "def nthMagicalNumber(self, n: int, a: int, b: int) -> int"
perf_repeat: 20
---

## Task

A positive integer is **magical** if it's divisible by `a` or by `b`. Return the `n`-th magical number, counting from the smallest, **modulo 1,000,000,007**: find the number first, then take its remainder.

## Constraints

- `1 <= n <= 10**9`
- `2 <= a, b <= 40_000`

```json examples
[
  {"args": [5, 3, 5], "out": 10, "why": "The magical numbers start 3, 5, 6, 9, 10: the fifth is 10."},
  {"args": [5, 4, 6], "out": 16, "why": "4, 6, 8, 12, 16. 12 is divisible by both, but it's one number, counted once."},
  {"args": [100000, 39999, 40000], "out": 999999993, "why": "The 100,000th magical number is exactly 2,000,000,000, which is over the modulus: its remainder is returned."}
]
```

```json edge
[
  {"name": "equal divisors", "args": [3, 7, 7], "out": 21},
  {"name": "one divides the other", "args": [3, 4, 8], "out": 12},
  {"name": "coprime divisors", "args": [6, 3, 5], "out": 12},
  {"name": "the first one", "args": [1, 9, 4], "out": 4},
  {"name": "small divisors, many numbers", "args": [10, 2, 3], "out": 15}
]
```

```python oracle
class Solution:
    def nthMagicalNumber(self, n: int, a: int, b: int) -> int:
        x = y = 0  # the last multiples of a and of b used
        current = 0
        for _ in range(n):
            na, nb = x + a, y + b
            current = min(na, nb)
            if na == current:
                x = na
            if nb == current:
                y = nb
        return current % 1_000_000_007
```

```python gen
def gen(rng, size):
    if size == "small":
        return [rng.randint(1, 20), rng.randint(2, 12), rng.randint(2, 12)]
    return [rng.randint(1, 100_000), rng.randint(2, 40_000), rng.randint(2, 40_000)]
```

```python perf
def perf(rng):
    # The largest n with large coprime divisors, asked 20 times.
    return [10**9, 39_999, 40_000]
```

## Hints

1. Listing magical numbers one by one takes n steps, up to a billion. Turn it around: for a number x, how many magical numbers are at most x?
2. `x // a` multiples of a and `x // b` of b, but the common multiples were counted twice. They're the multiples of `lcm(a, b) = a * b // gcd(a, b)`, so the count is `x // a + x // b - x // lcm`. That's **inclusion–exclusion**.
3. The count only grows with x, so binary search for the smallest x whose count reaches n. That x is magical, and it's the n-th one. The search range is 1 to `n * min(a, b)`.

## Solution

```python solution time="log(n · min(a, b))" space="1"
class Solution:
    def nthMagicalNumber(self, n: int, a: int, b: int) -> int:
        both = a * b // gcd(a, b)  # the least common multiple

        def count(x):  # how many magical numbers are at most x
            return x // a + x // b - x // both

        lo, hi = 1, n * min(a, b)  # the n-th multiple of the smaller divisor is certainly enough
        while lo < hi:
            mid = (lo + hi) // 2
            if count(mid) >= n:
                hi = mid
            else:
                lo = mid + 1
        return lo % 1_000_000_007
```

Counting is easy even though listing is slow: multiples of a up to x are `x // a`, and the same for b, minus the numbers divisible by both, which are exactly the multiples of their **least common multiple**. Since the count never decreases, the smallest x with at least n magical numbers up to it is found by binary search, the "search over the answer" of [[m:binary-search]]. That x is itself magical, or a smaller x would already have the same count.

About 46 halvings cover the range up to 4 × 10¹³, each with three divisions: O(log(n · min(a, b))). The remainder is taken only at the end, because the binary search needs the real number.

## Alternatives

### Count whole periods, then walk the last one

```python alt time="a + b" space="1"
class Solution:
    def nthMagicalNumber(self, n: int, a: int, b: int) -> int:
        both = a * b // gcd(a, b)
        per_period = both // a + both // b - 1  # magical numbers in 1 .. lcm
        periods, rest = divmod(n, per_period)
        x = y = 0
        current = 0
        for _ in range(rest):  # the rest-th magical number within one period
            na, nb = x + a, y + b
            current = min(na, nb)
            if na == current:
                x = na
            if nb == current:
                y = nb
        return (periods * both + current) % 1_000_000_007
```

Magical numbers repeat with period `lcm(a, b)`: the pattern in 1 to lcm repeats in every later block. So skip whole periods with one division, and walk only the remainder, merging the multiples of a and b in order. The walk is at most one period, under a + b steps. It's exact arithmetic instead of a search, and a nice use of the structure of multiples.

## Wrong answers

### Counts common multiples twice

```python wrong fails="example" test="Example 2"
class Solution:
    def nthMagicalNumber(self, n: int, a: int, b: int) -> int:
        lo, hi = 1, n * min(a, b)
        while lo < hi:
            mid = (lo + hi) // 2
            if mid // a + mid // b >= n:  # numbers divisible by both are counted twice
                hi = mid
            else:
                lo = mid + 1
        return lo % 1_000_000_007
```

A number divisible by both a and b is one magical number, but it's in both counts. In Example 2, 12 counts twice, so the count reaches 5 at 12 and the answer comes out as 12 instead of 16. Subtract the common multiples once.

### Uses a × b for the common multiples

```python wrong fails="example" test="Example 2"
class Solution:
    def nthMagicalNumber(self, n: int, a: int, b: int) -> int:
        both = a * b  # the least common multiple only when a and b share no factor
        lo, hi = 1, n * min(a, b)
        while lo < hi:
            mid = (lo + hi) // 2
            if mid // a + mid // b - mid // both >= n:
                hi = mid
            else:
                lo = mid + 1
        return lo % 1_000_000_007
```

The common multiples are the multiples of the *least* common multiple. `a * b` is a common multiple, but for 4 and 6 the least is 12, not 24, so 12 is still counted twice and Example 2 again comes out as 12. Divide by the gcd: `a * b // gcd(a, b)`.

### Forgets the remainder

```python wrong fails="example" test="Example 3"
class Solution:
    def nthMagicalNumber(self, n: int, a: int, b: int) -> int:
        both = a * b // gcd(a, b)
        lo, hi = 1, n * min(a, b)
        while lo < hi:
            mid = (lo + hi) // 2
            if mid // a + mid // b - mid // both >= n:
                hi = mid
            else:
                lo = mid + 1
        return lo  # not reduced
```

Python happily returns 2,000,000,000 for Example 3, but the task asks for the remainder modulo 10⁹ + 7. Reduce once, at the end, never inside the search.

### Walks the magical numbers one by one

```python wrong fails="perf"
class Solution:
    def nthMagicalNumber(self, n: int, a: int, b: int) -> int:
        x = y = 0
        current = 0
        for _ in range(n):  # n steps: up to a billion
            na, nb = x + a, y + b
            current = min(na, nb)
            if na == current:
                x = na
            if nb == current:
                y = nb
        return current % 1_000_000_007
```

Merging the two sequences of multiples, as in merge sort, lists the magical numbers in order and is correct. It's n steps, though, and n can be a billion. Counting with inclusion–exclusion and binary searching takes under fifty.
