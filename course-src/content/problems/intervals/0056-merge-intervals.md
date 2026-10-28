---
id: 56
module: intervals
patterns: [sort by start, merge with the last interval]
signature: "def merge(self, intervals: List[List[int]]) -> List[List[int]]"
compare: unordered
---

## Task

You get a list of intervals `[start, end]` in no particular order. Merge every group of overlapping intervals into one interval covering them all, and return the resulting intervals, which no longer overlap, in any order.

Two intervals **overlap if they share at least one point**: `[1, 2]` and `[2, 3]` merge into `[1, 3]`.

## Constraints

- `1 <= len(intervals) <= 100_000`
- `0 <= start <= end <= 10**6`

```json examples
[
  {"args": [[[1, 4], [2, 5], [7, 9]]], "out": [[1, 5], [7, 9]], "why": "[1, 4] and [2, 5] overlap and merge into [1, 5]; [7, 9] stays on its own."},
  {"args": [[[6, 8], [1, 3], [2, 4]]], "out": [[1, 4], [6, 8]], "why": "The input isn't sorted. Sorted by start, [1, 3] and [2, 4] are next to each other and merge into [1, 4]."},
  {"args": [[[1, 10], [2, 3], [4, 5]]], "out": [[1, 10]], "why": "[2, 3] and [4, 5] lie inside [1, 10], so the merged interval keeps the larger end, 10."}
]
```

```json edge
[
  {"name": "touching intervals", "args": [[[1, 2], [2, 3]]], "out": [[1, 3]]},
  {"name": "a single interval", "args": [[[3, 6]]], "out": [[3, 6]]},
  {"name": "identical points", "args": [[[2, 2], [2, 2]]], "out": [[2, 2]]},
  {"name": "nothing overlaps", "args": [[[1, 2], [3, 4], [5, 6]]], "out": [[1, 2], [3, 4], [5, 6]]},
  {"name": "one interval joins two others", "args": [[[5, 9], [1, 3], [2, 10]]], "out": [[1, 10]]},
  {"name": "neighbouring points", "args": [[[0, 0], [1, 1]]], "out": [[0, 0], [1, 1]]}
]
```

```python oracle
class Solution:
    def merge(self, intervals: List[List[int]]) -> List[List[int]]:
        points = set()  # mark every covered point (doubled, so gaps between whole numbers show)
        for s, e in intervals:
            points.update(range(2 * s, 2 * e + 1))
        out, run = [], None
        for p in sorted(points):
            if run and p == run[1] + 1:
                run[1] = p
            else:
                run = [p, p]
                out.append(run)
        return [[a // 2, b // 2] for a, b in out]
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 5) if size == "small" else rng.randint(5, 20)
    hi = 12 if size == "small" else 80
    intervals = []
    for _ in range(n):
        s = rng.randint(0, hi)
        intervals.append([s, min(hi, s + rng.randint(0, hi // 4))])
    return [intervals]
```

```python perf
def perf(rng):
    # 100,000 short intervals in random order, mostly far apart: about 85,000 remain after merging.
    intervals = []
    for _ in range(100_000):
        s = rng.randint(0, 10**6 - 3)
        intervals.append([s, s + rng.randint(0, 3)])
    return [intervals]
```

## Hints

1. Overlapping intervals can be anywhere in the list. After sorting by start, any interval that overlaps an earlier one overlaps the most recent merged interval.
2. Walk through the sorted intervals, keeping a list of merged ones. Compare each interval with the *last* merged interval only.
3. If it starts no later than the last merged interval ends, extend that interval's end to the larger of the two ends; otherwise start a new merged interval.

## Solution

```python solution time="n log n" space="n"
class Solution:
    def merge(self, intervals: List[List[int]]) -> List[List[int]]:
        merged = []
        for start, end in sorted(intervals):  # by start
            if merged and start <= merged[-1][1]:  # overlaps the last one (touching counts)
                merged[-1][1] = max(merged[-1][1], end)  # it may lie entirely inside
            else:
                merged.append([start, end])
        return merged
```

After sorting by start, intervals that overlap come one after another. An interval either overlaps the last merged interval, which then stretches to cover it, or starts after it ends, and then no later interval can reach back to the earlier merged ones, because they all start later still.

The new end is the *maximum* of the two ends, since a short interval can sit entirely inside a long one. Sorting dominates: O(n log n), plus O(n) for the output.

## Alternatives

### Sort the starts and the ends separately

```python alt time="n log n" space="n"
class Solution:
    def merge(self, intervals: List[List[int]]) -> List[List[int]]:
        starts = sorted(s for s, _ in intervals)
        ends = sorted(e for _, e in intervals)
        merged, first = [], 0
        for i in range(len(intervals)):
            if i + 1 == len(intervals) or starts[i + 1] > ends[i]:  # nothing open crosses this end
                merged.append([starts[first], ends[i]])
                first = i + 1
        return merged
```

A merged interval ends at the i-th smallest end exactly when the next start comes after it: the first i + 1 starts and ends then pair up into one block. It's a sweep over the two sorted lists, and it never builds intervals in between.

## Wrong answers

### Doesn't sort first

```python wrong fails="example" test="Example 2"
class Solution:
    def merge(self, intervals: List[List[int]]) -> List[List[int]]:
        merged = []
        for start, end in intervals:  # in input order
            if merged and start <= merged[-1][1]:
                merged[-1][1] = max(merged[-1][1], end)
            else:
                merged.append([start, end])
        return merged
```

Comparing with the last merged interval only works when the intervals come sorted by start. In Example 2, `[1, 3]` arrives after `[6, 8]`: it "overlaps" because 1 ≤ 8, and disappears into `[6, 8]`. Sort by start first.

### Replaces the end instead of extending it

```python wrong fails="example" test="Example 3"
class Solution:
    def merge(self, intervals: List[List[int]]) -> List[List[int]]:
        merged = []
        for start, end in sorted(intervals):
            if merged and start <= merged[-1][1]:
                merged[-1][1] = end  # may shrink the merged interval
            else:
                merged.append([start, end])
        return merged
```

Taking the new interval's end shrinks the merged interval when the new one lies inside it. `[1, 10]` followed by `[2, 3]` becomes `[1, 3]`, and then `[4, 5]` looks separate. Use the larger of the two ends.

### Keeps touching intervals apart

```python wrong fails="edge" test="touching intervals"
class Solution:
    def merge(self, intervals: List[List[int]]) -> List[List[int]]:
        merged = []
        for start, end in sorted(intervals):
            if merged and start < merged[-1][1]:  # an interval starting exactly at the end stays separate
                merged[-1][1] = max(merged[-1][1], end)
            else:
                merged.append([start, end])
        return merged
```

In this problem, intervals that share a single point overlap, so `[1, 2]` and `[2, 3]` must become `[1, 3]`. With `<`, they stay apart. [[p:435]] uses the opposite rule, so read each statement carefully.

### Compares each interval with every merged one

```python wrong fails="perf"
class Solution:
    def merge(self, intervals: List[List[int]]) -> List[List[int]]:
        merged = []
        for s, e in intervals:  # no sorting, so check against everything merged so far
            keep = []
            for ms, me in merged:
                if ms <= e and s <= me:
                    s, e = min(s, ms), max(e, me)  # absorb it
                else:
                    keep.append([ms, me])
            keep.append([s, e])
            merged = keep
        return merged
```

Without sorting, any merged interval might overlap the next one, so this checks all of them every time. It's correct, but when most intervals stay apart, the merged list grows to tens of thousands and the scans add up to billions of comparisons. Sorting first means only the last merged interval needs checking.
