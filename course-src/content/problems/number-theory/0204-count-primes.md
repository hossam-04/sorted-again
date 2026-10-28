---
id: 204
module: number-theory
patterns: [sieve of Eratosthenes, slice assignment]
signature: "def countPrimes(self, n: int) -> int"
lc_skip: "LeetCode's example inputs (0, 1, 2) don't match the outputs in its statement (for 10, 0, 1)"
---

## Task

Return how many prime numbers are **strictly less** than `n`. A prime is a whole number above 1 whose only divisors are 1 and itself.

## Constraints

- `0 <= n <= 5 * 10**6`

```json examples
[
  {"args": [20], "out": 8, "why": "2, 3, 5, 7, 11, 13, 17 and 19."},
  {"args": [7], "out": 3, "why": "2, 3 and 5. The count stops below n, so 7 itself isn't included."},
  {"args": [2], "out": 0, "why": "There are no primes below 2."}
]
```

```json edge
[
  {"name": "zero", "args": [0], "out": 0},
  {"name": "three", "args": [3], "out": 1},
  {"name": "just past a prime square", "args": [26], "out": 9},
  {"name": "a hundred", "args": [100], "out": 25},
  {"name": "ten thousand", "args": [10000], "out": 1229}
]
```

```python oracle
class Solution:
    def countPrimes(self, n: int) -> int:
        def is_prime(k):
            if k < 2:
                return False
            d = 2
            while d * d <= k:
                if k % d == 0:
                    return False
                d += 1
            return True
        return sum(1 for k in range(n) if is_prime(k))
```

```python gen
def gen(rng, size):
    return [rng.randint(0, 120) if size == "small" else rng.randint(0, 10_000)]
```

```python perf
def perf(rng):
    # The largest n.
    return [5_000_000]
```

## Hints

1. Testing each number for divisors costs up to √k per number, about n√n / log n in all: billions of steps for 5 million.
2. Turn it around: instead of asking which numbers divide k, cross out the multiples of each prime. Whatever is never crossed out is prime: the **sieve of Eratosthenes**.
3. Only primes up to √n need their multiples crossed out, starting from p², since smaller multiples were crossed out by smaller primes. In Python, cross them out in one slice assignment on a `bytearray`, not in a loop.

## Solution

```python solution time="n log log n" space="n"
class Solution:
    def countPrimes(self, n: int) -> int:
        if n < 3:
            return 0
        is_prime = bytearray([1]) * n  # is_prime[k] for 0 <= k < n
        is_prime[0] = is_prime[1] = 0
        p = 2
        while p * p < n:
            if is_prime[p]:
                is_prime[p * p::p] = bytes(len(range(p * p, n, p)))  # cross out p², p² + p, ... in one go
            p += 1
        return sum(is_prime)
```

Every composite number k has a prime factor at most √k, so it's crossed out when that prime is processed; primes are never crossed out, because nothing smaller divides them. Starting at p² is safe: a smaller multiple m · p with m < p has a prime factor below p and was crossed out already.

The total work is n/2 + n/3 + n/5 + … over the primes up to √n, which is O(n log log n): nearly linear. The slice assignment does each prime's crossing out in C, which is what makes 5 million fast in Python; a Python loop over the multiples would be about fifty times slower.

## Alternatives

### A sieve over odd numbers only

```python alt time="n log log n" space="n"
class Solution:
    def countPrimes(self, n: int) -> int:
        if n < 3:
            return 0
        odd = bytearray([1]) * (n // 2)  # odd[i] stands for 2i + 1
        odd[0] = 0  # 1 isn't prime
        i = 1
        while (2 * i + 1) ** 2 < n:
            if odd[i]:
                p = 2 * i + 1
                start = p * p // 2
                odd[start::p] = bytes(len(range(start, n // 2, p)))  # odd multiples of p, from p²
            i += 1
        return sum(odd) + 1  # + 1 for the prime 2
```

Even numbers other than 2 are never prime, so storing only the odd ones halves the memory and the work. Index i stands for 2i + 1; consecutive odd multiples of p are 2p apart, which is p apart in this indexing. The same trick extends to skipping multiples of 3 and 5 (a *wheel*), with diminishing returns.

## Wrong answers

### Counts up to n inclusive

```python wrong fails="example" test="Example 2"
class Solution:
    def countPrimes(self, n: int) -> int:
        if n < 2:
            return 0
        is_prime = bytearray([1]) * (n + 1)  # includes n itself
        is_prime[0] = is_prime[1] = 0
        p = 2
        while p * p <= n:
            if is_prime[p]:
                is_prime[p * p::p] = bytes(len(range(p * p, n + 1, p)))
            p += 1
        return sum(is_prime)
```

The task counts primes *below* n. Sieving up to n inclusive counts n itself whenever it's prime: Example 2 gives 4, counting 7.

### Treats 1 as a prime

```python wrong fails="example" test="Example 1"
class Solution:
    def countPrimes(self, n: int) -> int:
        if n < 2:
            return 0
        is_prime = bytearray([1]) * n
        is_prime[0] = 0  # forgot is_prime[1] = 0
        p = 2
        while p * p < n:
            if is_prime[p]:
                is_prime[p * p::p] = bytes(len(range(p * p, n, p)))
            p += 1
        return sum(is_prime)
```

1 has only one divisor, so it isn't prime, and the sieve never crosses it out because it's no prime's multiple. It has to be removed by hand, along with 0, or every answer from n = 2 on is one too big.

### Tests each number for divisors

```python wrong fails="perf"
class Solution:
    def countPrimes(self, n: int) -> int:
        count = 0
        for k in range(2, n):
            d = 2
            while d * d <= k and k % d:  # trial division up to the square root
                d += 1
            if d * d > k:
                count += 1
        return count
```

Correct, and fine for ten thousand. For 5 million, every prime needs about √k trial divisions, over two thousand for the largest, and there are about 350,000 primes, plus the composites: well over a hundred million steps in Python. The sieve does its crossing out in C, in nearly linear time.
