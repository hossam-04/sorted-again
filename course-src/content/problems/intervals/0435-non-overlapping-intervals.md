---
id: 435
module: intervals
patterns: [greedy by earliest end, interval scheduling]
signature: "def eraseOverlapIntervals(self, intervals: List[List[int]]) -> int"
---

## Task

You get a list of intervals `[start, end]` with `start < end`. Return the smallest number of intervals you must remove so that none of the rest overlap.

Here, intervals that **only touch at a point do not overlap**: `[1, 2]` and `[2, 3]` can both stay.

## Constraints

- `1 <= len(intervals) <= 100_000`
- `-5 * 10**4 <= start < end <= 5 * 10**4`

```json examples
[
  {"args": [[[1, 10], [2, 3], [4, 5]]], "out": 1, "why": "Removing the long [1, 10] leaves [2, 3] and [4, 5], which don't overlap. Keeping [1, 10] would cost two removals instead."},
  {"args": [[[0, 2], [1, 3], [2, 4], [3, 5]]], "out": 2, "why": "Keep [0, 2] and [2, 4], which only touch. [1, 3] and [3, 5] each overlap one of them, so two intervals must go."},
  {"args": [[[5, 7], [1, 3]]], "out": 0, "why": "The two intervals don't overlap, so nothing needs removing."}
]
```

```json edge
[
  {"name": "identical intervals", "args": [[[2, 4], [2, 4], [2, 4]]], "out": 2},
  {"name": "a chain of touching intervals", "args": [[[1, 2], [2, 3], [3, 4]]], "out": 0},
  {"name": "negative coordinates", "args": [[[-5, -1], [-3, 2], [0, 4]]], "out": 1},
  {"name": "a single interval", "args": [[[1, 5]]], "out": 0},
  {"name": "one long interval over many short ones", "args": [[[1, 100], [2, 3], [3, 4], [4, 5], [5, 6]]], "out": 1}
]
```

```python oracle
class Solution:
    def eraseOverlapIntervals(self, intervals: List[List[int]]) -> int:
        n = len(intervals)
        for keep in range(n, 0, -1):  # the largest set of intervals that fits, tried by brute force
            for chosen in itertools.combinations(sorted(intervals), keep):
                if all(chosen[i][1] <= chosen[i + 1][0] for i in range(keep - 1)):
                    return n - keep
        return n
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 5) if size == "small" else rng.randint(5, 11)
    hi = 10 if size == "small" else 40
    intervals = []
    for _ in range(n):
        s = rng.randint(-hi, hi - 1)
        intervals.append([s, rng.randint(s + 1, min(hi, s + hi // 2))])
    return [intervals]
```

```python perf
def perf(rng):
    # 100,000 random intervals.
    intervals = []
    for _ in range(100_000):
        s = rng.randint(-5 * 10**4, 5 * 10**4 - 1)
        intervals.append([s, rng.randint(s + 1, min(5 * 10**4, s + 1000))])
    return [intervals]
```

## Hints

1. Removing as few intervals as possible is the same as keeping as many as possible that don't overlap.
2. Which interval should you keep first? The one that *ends* earliest: it leaves the most room for everything after it.
3. Sort by end. Keep an interval if it starts at or after the end of the last kept one; otherwise remove it. The answer is the number removed.

## Solution

```python solution time="n log n" space="n"
class Solution:
    def eraseOverlapIntervals(self, intervals: List[List[int]]) -> int:
        removed, last_end = 0, -inf
        for start, end in sorted(intervals, key=lambda iv: iv[1]):  # earliest end first
            if start >= last_end:  # fits after the last kept interval (touching is fine)
                last_end = end
            else:
                removed += 1  # overlaps a kept interval that ends no later: drop this one
        return removed
```

This is the classic **interval scheduling** greedy. Among all intervals, the one that ends first can always be part of a best selection: whatever a best selection starts with, swapping it for the earliest-ending interval keeps everything else valid, because the swap only frees up room. Repeating the argument on what's left gives the whole algorithm.

Every interval that starts before the last kept end overlaps it, and it ends no earlier (that's the sorted order), so dropping it is never worse than dropping the kept one. Sorting takes O(n log n) and the scan O(n).

## Alternatives

### Sort by start, keep the earlier end

```python alt time="n log n" space="n"
class Solution:
    def eraseOverlapIntervals(self, intervals: List[List[int]]) -> int:
        removed, last_end = 0, -inf
        for start, end in sorted(intervals):  # by start
            if start >= last_end:
                last_end = end
            else:
                removed += 1  # two overlap: drop one, and keep whichever ends first
                last_end = min(last_end, end)
        return removed
```

Sorting by start works too, as long as every overlap keeps the interval that ends first. The `min` is the whole difference: it undoes a long interval kept earlier as soon as a shorter one inside it comes along.

## Wrong answers

### Keeps whichever interval starts first

```python wrong fails="example" test="Example 1"
class Solution:
    def eraseOverlapIntervals(self, intervals: List[List[int]]) -> int:
        removed, last_end = 0, -inf
        for start, end in sorted(intervals):  # by start, always keeping the earlier one
            if start >= last_end:
                last_end = end
            else:
                removed += 1
        return removed
```

Keeping the interval that starts first lets one long interval push out many short ones. In Example 1, `[1, 10]` is kept and both `[2, 3]` and `[4, 5]` are removed, two removals where one would do. The greedy choice has to be about where an interval *ends*.

### Counts touching intervals as overlapping

```python wrong fails="edge" test="a chain of touching intervals"
class Solution:
    def eraseOverlapIntervals(self, intervals: List[List[int]]) -> int:
        removed, last_end = 0, -inf
        for start, end in sorted(intervals, key=lambda iv: iv[1]):
            if start > last_end:  # an interval starting exactly at last_end is dropped
                last_end = end
            else:
                removed += 1
        return removed
```

The task says that intervals touching at a point don't overlap, so `[1, 2]`, `[2, 3]` and `[3, 4]` can all stay. With `>`, each one that starts where the previous ended is removed. Unlike [[p:56]], here a shared endpoint is allowed: compare with `>=`.

### Finds the longest chain by trying every earlier interval

```python wrong fails="perf"
class Solution:
    def eraseOverlapIntervals(self, intervals: List[List[int]]) -> int:
        intervals = sorted(intervals)
        n = len(intervals)
        chain = [1] * n  # chain[i]: most intervals that fit together, ending with interval i
        for i in range(n):
            for j in range(i):
                if intervals[j][1] <= intervals[i][0]:
                    chain[i] = max(chain[i], chain[j] + 1)
        return n - max(chain)
```

This dynamic program finds the largest set of intervals that fit together, so it's correct. But it compares every pair: O(n²), about 5 billion steps for 100,000 intervals. The greedy choice makes one pass after sorting.
