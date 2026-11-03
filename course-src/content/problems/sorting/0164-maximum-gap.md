---
id: 164
module: sorting
patterns: [buckets and the pigeonhole principle, radix sort]
signature: "def maximumGap(self, nums: List[int]) -> int"
---

## Task

You get a list of non-negative whole numbers. Imagine it sorted: return the **largest difference between two neighbours** in that sorted order. If the list has fewer than two numbers, return 0.

Try to do it in linear time and memory, without comparison sorting the whole list.

## Constraints

- `1 <= len(nums) <= 100_000`
- `0 <= nums[i] <= 10**9`

```json examples
[
  {"args": [[1, 10, 5]], "out": 5, "why": "Sorted, the list is 1, 5, 10. The gaps are 4 and 5, so the largest is 5."},
  {"args": [[7, 7, 7]], "out": 0, "why": "Equal neighbours have a gap of 0."},
  {"args": [[30, 2, 14, 26, 16]], "out": 12, "why": "Sorted: 2, 14, 16, 26, 30. The gaps are 12, 2, 10 and 4."}
]
```

```json edge
[
  {"name": "a single number", "args": [[42]], "out": 0},
  {"name": "two numbers", "args": [[9, 3]], "out": 6},
  {"name": "the whole range", "args": [[0, 1000000000]], "out": 1000000000},
  {"name": "evenly spaced", "args": [[0, 3, 6, 9, 12]], "out": 3},
  {"name": "duplicates around the gap", "args": [[5, 5, 1, 1, 9, 9]], "out": 4},
  {"name": "one far outlier", "args": [[1, 2, 3, 4, 100]], "out": 96}
]
```

```python oracle
class Solution:
    def maximumGap(self, nums: List[int]) -> int:
        s = sorted(nums)
        return max((b - a for a, b in zip(s, s[1:])), default=0)
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 8) if size == "small" else rng.randint(8, 200)
    hi = rng.choice([5, 30]) if size == "small" else rng.choice([100, 10**9])
    return [[rng.randint(0, hi) for _ in range(n)]]
```

```python perf
def perf(rng):
    # 100,000 numbers spread over the whole range.
    return [[rng.randint(0, 10**9) for _ in range(100_000)]]
```

## Hints

1. Sorting and scanning takes O(n log n). For linear time, think about what the largest gap can't be smaller than.
2. n numbers between `lo` and `hi` leave n − 1 gaps that add up to `hi − lo`, so the largest gap is at least `(hi − lo) / (n − 1)`.
3. Split the range into buckets narrower than that, and remember only each bucket's smallest and largest number. The largest gap can't fall inside one bucket, so it's between one bucket's largest number and the next non-empty bucket's smallest.

## Solution

```python solution time="n" space="n"
class Solution:
    def maximumGap(self, nums: List[int]) -> int:
        n = len(nums)
        if n < 2:
            return 0
        lo, hi = min(nums), max(nums)
        if lo == hi:
            return 0
        size = max(1, (hi - lo) // (n - 1))  # no wider than the smallest possible largest gap
        count = (hi - lo) // size + 1
        low, high = [None] * count, [None] * count
        for x in nums:
            b = (x - lo) // size
            if low[b] is None or x < low[b]:
                low[b] = x
            if high[b] is None or x > high[b]:
                high[b] = x
        best, prev = 0, high[0]  # bucket 0 always holds lo
        for b in range(1, count):
            if low[b] is not None:
                best = max(best, low[b] - prev)  # the gap across the empty buckets in between
                prev = high[b]
        return best
```

The n − 1 gaps between neighbours add up to `hi − lo`, so the largest is at least their average, `(hi − lo) / (n − 1)`. Each bucket covers `size` consecutive values, with `size` no larger than that average. So two numbers in the same bucket differ by less than `size`, and their gap can't be the answer unless every gap is that small, which the scan finds anyway.

The largest gap is then between neighbouring non-empty buckets: from one bucket's largest number to the next one's smallest. Only those two values per bucket need keeping. There are at most n buckets, so both passes are O(n).

## Alternatives

### Radix sort, then scan

```python alt time="n" space="n"
class Solution:
    def maximumGap(self, nums: List[int]) -> int:
        if len(nums) < 2:
            return 0
        place, top = 1, max(nums)
        while top // place:  # one stable pass per base-1024 digit: 3 passes for 10**9
            buckets = [[] for _ in range(1024)]
            for x in nums:
                buckets[x // place % 1024].append(x)
            nums = [x for b in buckets for x in b]
            place *= 1024
        return max(b - a for a, b in zip(nums, nums[1:]))
```

Sort without comparing: numbers up to 10⁹ have three digits in base 1024, so three stable bucket passes sort them, each O(n + 1024). Then scan the neighbours. It's linear too, and easier to trust than the bucket argument, but it builds new lists on every pass.

## Wrong answers

### Measures gaps inside each bucket too

```python wrong fails="example" test="Example 1"
class Solution:
    def maximumGap(self, nums: List[int]) -> int:
        n = len(nums)
        if n < 2:
            return 0
        lo, hi = min(nums), max(nums)
        if lo == hi:
            return 0
        size = max(1, (hi - lo) // (n - 1))
        count = (hi - lo) // size + 1
        low, high = [None] * count, [None] * count
        for x in nums:
            b = (x - lo) // size
            low[b] = x if low[b] is None else min(low[b], x)
            high[b] = x if high[b] is None else max(high[b], x)
        best = 0
        for b in range(count):
            if low[b] is not None:
                best = max(best, high[b] - low[b])  # a span inside one bucket, not a gap between neighbours
        return best
```

The spread of one bucket, its largest number minus its smallest, isn't a gap between neighbours: other numbers can sit in between. It also never looks across buckets, which is where the largest gap is. In Example 1, each number gets a bucket of its own, so every spread is 0, and the answer comes out 0 instead of 5.

### Divides by a bucket size of zero

```python wrong fails="example" test="Example 2" how="error"
class Solution:
    def maximumGap(self, nums: List[int]) -> int:
        n = len(nums)
        if n < 2:
            return 0
        lo, hi = min(nums), max(nums)
        size = (hi - lo) // (n - 1)  # 0 when the numbers are close together
        count = (hi - lo) // size + 1
        low, high = [None] * count, [None] * count
        for x in nums:
            b = (x - lo) // size
            low[b] = x if low[b] is None else min(low[b], x)
            high[b] = x if high[b] is None else max(high[b], x)
        best, prev = 0, high[0]
        for b in range(1, count):
            if low[b] is not None:
                best = max(best, low[b] - prev)
                prev = high[b]
        return best
```

When the range is smaller than the number of gaps, for example three equal numbers, the bucket size rounds down to 0, and the next line raises `ZeroDivisionError`. A size of at least 1 is always safe: it only gets that small when every gap is tiny anyway.

### Looks for each number's next larger value

```python wrong fails="perf"
class Solution:
    def maximumGap(self, nums: List[int]) -> int:
        best = 0
        for x in nums:
            nxt = None
            for y in nums:  # the smallest number larger than x
                if y > x and (nxt is None or y < nxt):
                    nxt = y
            if nxt is not None:
                best = max(best, nxt - x)
        return best
```

Each number's neighbour in sorted order is the smallest number larger than it, so this finds every gap without sorting. But each search scans the whole list: for 100,000 numbers that's 10 billion steps. Sorting gets all the neighbours at once in O(n log n), and buckets in O(n).
