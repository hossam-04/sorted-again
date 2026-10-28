---
id: 875
module: binary-search
patterns: [binary search on the answer, monotone condition]
signature: "def minEatingSpeed(self, piles: List[int], h: int) -> int"
---

## Task

A panda has `h` hours to finish several piles of bamboo shoots; `piles[i]` is the size of pile `i`. It picks an eating speed `k` (shoots per hour) and keeps it fixed. Every hour it chooses one pile and eats `k` shoots from it, or the whole pile if fewer than `k` are left. It never moves to a second pile within the same hour.

Return the smallest integer speed `k` that lets it finish every pile within `h` hours. There are never more piles than hours, so some speed always works.

## Constraints

- `1 <= len(piles) <= 10_000`
- `len(piles) <= h <= 10**9`
- `1 <= piles[i] <= 10**9`

```json examples
[
  {"args": [[4, 9, 2], 6], "out": 3, "why": "At 3 per hour: 2 + 3 + 1 = 6 hours. At 2 per hour: 2 + 5 + 1 = 8 hours, which is too many."},
  {"args": [[10, 10], 2], "out": 10, "why": "Two piles in two hours: each pile must be finished in one hour."},
  {"args": [[5, 1, 8], 20], "out": 1, "why": "Even at 1 per hour it takes only 14 hours, which fits in 20."}
]
```

```json edge
[
  {"name": "one pile, one hour", "args": [[7], 1], "out": 7},
  {"name": "one pile, plenty of time", "args": [[7], 7], "out": 1},
  {"name": "one hour per pile", "args": [[3, 8, 5, 2], 4], "out": 8},
  {"name": "piles of one", "args": [[1, 1, 1], 3], "out": 1},
  {"name": "one spare hour", "args": [[6, 6], 3], "out": 6},
  {"name": "large pile, one shoot per hour", "args": [[100000], 100000], "out": 1},
  {"name": "two large piles, three hours", "args": [[100000, 100000], 3], "out": 100000},
  {"name": "exact division", "args": [[12, 24], 6], "out": 6}
]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 5) if size == "small" else rng.randint(5, 60)
    piles = [rng.randint(1, 12 if size == "small" else 2_000) for _ in range(n)]
    h = rng.randint(n, max(n, sum(piles) + 3) if size == "small" else n * rng.choice((1, 2, 5, 50)))
    return [piles, h]
```

```python perf
def perf(rng):
    # 10,000 piles of up to a billion shoots and barely more hours than piles: the answer is in the hundreds
    # of millions, so trying speeds one at a time would take hundreds of millions of tries.
    piles = [rng.randint(10**8, 10**9) for _ in range(10_000)]
    return [piles, 12_000]
```

## Hints

1. If speed `k` is fast enough, every speed above `k` is too. The speeds split into "too slow" and "fast enough", and you want the boundary.
2. For a given speed, the hours needed are the sum over piles of `ceil(pile / k)`. That's O(n) to check.
3. Binary search over speeds from 1 to `max(piles)`: if `mid` is fast enough, the answer is `mid` or lower; otherwise it's above `mid`.

## Solution

```python solution time="n log m" space="1"
class Solution:
    def minEatingSpeed(self, piles: List[int], h: int) -> int:
        def hours(k):
            return sum((p + k - 1) // k for p in piles)  # ceil(p / k) without floats

        lo, hi = 1, max(piles)  # max(piles) is always fast enough
        while lo < hi:
            mid = (lo + hi) // 2
            if hours(mid) <= h:
                hi = mid  # mid works; the answer is mid or smaller
            else:
                lo = mid + 1  # mid is too slow, and so is everything below it
        return lo
```

You can't binary search the piles, but you can binary search the *answer*. The condition "speed k finishes in time" is monotone: once it's true, it stays true for every faster speed. So the speeds 1, 2, …, max(piles) look like `False False … False True True … True`, and the answer is the first `True`.

The loop keeps the first `True` inside `lo..hi`. When `mid` works, `hi = mid` keeps it as a candidate; when it doesn't, `lo = mid + 1` drops it. They meet at the boundary. Speeds above `max(piles)` never help, since any pile is already finished in one hour.

Each check costs O(n), and the search over m = max(piles) speeds takes O(log m) checks: O(n log m) in total, about 30 × 10,000 steps here.

## Alternatives

### Try every speed from 1 upwards

```python alt time="n·m" space="1" slow oracle
class Solution:
    def minEatingSpeed(self, piles: List[int], h: int) -> int:
        k = 1
        while sum((p + k - 1) // k for p in piles) > h:
            k += 1
        return k
```

The definition of "the smallest speed that works", taken literally. Correct, but when the answer is hundreds of millions it needs that many checks, each O(n).

## Wrong answers

### Rounds the hours down

```python wrong fails="example" test="Example 2"
class Solution:
    def minEatingSpeed(self, piles: List[int], h: int) -> int:
        lo, hi = 1, max(piles)
        while lo < hi:
            mid = (lo + hi) // 2
            if sum(p // mid for p in piles) <= h:  # a partly eaten pile still takes a whole hour
                hi = mid
            else:
                lo = mid + 1
        return lo
```

A pile of 10 at speed 6 takes two hours (6, then the remaining 4), but `10 // 6` says one. Rounding down undercounts the hours, so speeds that are too slow look fine. Use `(p + k - 1) // k`, or `-(-p // k)`, for the ceiling.

### Starts the search at speed 0

```python wrong fails="example" test="Example 3" how="error"
class Solution:
    def minEatingSpeed(self, piles: List[int], h: int) -> int:
        lo, hi = 0, max(piles)  # 0 is not a speed
        while lo < hi:
            mid = (lo + hi) // 2
            if sum((p + mid - 1) // mid for p in piles) <= h:
                hi = mid
            else:
                lo = mid + 1
        return lo
```

The search range must contain only valid candidates. When the answer is 1, the range narrows to `0..1`, `mid` becomes 0, and the hours check divides by zero.

### Lowers the speed one step at a time

```python wrong fails="perf"
class Solution:
    def minEatingSpeed(self, piles: List[int], h: int) -> int:
        k = max(piles)
        while k > 1 and sum((p + k - 2) // (k - 1) for p in piles) <= h:  # is one slower still fine?
            k -= 1
        return k
```

Starting from a speed that surely works and slowing down until it fails is correct, and it's quick when the answer is close to `max(piles)`. Here the answer is hundreds of millions below it, and each step costs a full pass over 10,000 piles.
