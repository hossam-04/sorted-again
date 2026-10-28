---
id: 57
module: intervals
patterns: [three phases of a sorted scan, merging intervals]
signature: "def insert(self, intervals: List[List[int]], newInterval: List[int]) -> List[List[int]]"
no_slow_wrong: appending the new interval and merging everything again costs O(n log n), barely more than the O(n) scan, so there's no natural approach that is much slower
---

## Task

You get a list of intervals `[start, end]` that don't overlap and are sorted by start, and one more interval, `newInterval`. Insert it: return the list with `newInterval` added, merging it with every interval it overlaps, so that the result is still sorted by start and has no overlaps.

Two intervals **overlap if they share at least one point**, so `[1, 2]` and `[2, 3]` overlap and merge into `[1, 3]`. You may build a new list rather than changing `intervals`.

## Constraints

- `0 <= len(intervals) <= 100_000`
- `0 <= start <= end <= 10**6` for every interval, `newInterval` included

```json examples
[
  {"args": [[[1, 2], [5, 7], [9, 12]], [3, 4]], "out": [[1, 2], [3, 4], [5, 7], [9, 12]], "why": "[3, 4] overlaps nothing, so it simply goes between [1, 2] and [5, 7]."},
  {"args": [[[1, 3], [4, 6], [8, 9], [11, 14]], [5, 10]], "out": [[1, 3], [4, 10], [11, 14]], "why": "[5, 10] overlaps [4, 6] and [8, 9], so the three merge into [4, 10]."},
  {"args": [[[2, 4], [6, 8]], [4, 6]], "out": [[2, 8]], "why": "[4, 6] shares an endpoint with both intervals, and sharing a point counts as overlapping, so everything merges into [2, 8]."}
]
```

```json edge
[
  {"name": "an empty list", "args": [[], [5, 7]], "out": [[5, 7]]},
  {"name": "before everything", "args": [[[3, 5], [7, 9]], [0, 1]], "out": [[0, 1], [3, 5], [7, 9]]},
  {"name": "after everything", "args": [[[3, 5], [7, 9]], [10, 12]], "out": [[3, 5], [7, 9], [10, 12]]},
  {"name": "covering everything", "args": [[[3, 5], [7, 9]], [0, 20]], "out": [[0, 20]]},
  {"name": "inside one interval", "args": [[[1, 10]], [3, 4]], "out": [[1, 10]]},
  {"name": "single points", "args": [[[1, 1], [3, 3]], [2, 2]], "out": [[1, 1], [2, 2], [3, 3]]},
  {"name": "touching on both sides", "args": [[[1, 2], [4, 5]], [2, 4]], "out": [[1, 5]]}
]
```

```python oracle
class Solution:
    def insert(self, intervals: List[List[int]], newInterval: List[int]) -> List[List[int]]:
        points = set()  # mark every covered point, then read the runs back
        for s, e in intervals + [newInterval]:
            points.update(range(2 * s, 2 * e + 1))  # doubled, so gaps between whole numbers show up
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
    n = rng.randint(0, 4) if size == "small" else rng.randint(4, 15)
    hi = 12 if size == "small" else 60
    points = sorted(rng.sample(range(hi + 1), min(2 * n, hi + 1)))
    intervals = [[points[i], points[i + 1]] for i in range(0, len(points) - 1, 2)]  # sorted, disjoint
    a, b = sorted(rng.randint(0, hi) for _ in range(2))
    return [intervals, [a, b]]
```

```python perf
def perf(rng):
    # 100,000 disjoint intervals, and a new interval that swallows the middle 40,000 of them.
    starts = sorted(rng.sample(range(0, 10**6, 5), 100_000))
    intervals = [[s, s + rng.randint(0, 3)] for s in starts]
    return [intervals, [intervals[30_000][0] - 1, intervals[70_000][1] + 1]]
```

## Hints

1. The list is already sorted, so the intervals fall into three groups: those that end before `newInterval` starts, those that overlap it, and those that start after it ends.
2. Copy the first group unchanged, merge the second group with `newInterval` into a single interval, then copy the third group.
3. An interval `[s, e]` overlaps `[a, b]` when `s <= b` and `e >= a`. Merging takes the smaller start and the larger end.

## Solution

```python solution time="n" space="n"
class Solution:
    def insert(self, intervals: List[List[int]], newInterval: List[int]) -> List[List[int]]:
        a, b = newInterval
        out, i, n = [], 0, len(intervals)
        while i < n and intervals[i][1] < a:  # ends before the new interval starts
            out.append(intervals[i])
            i += 1
        while i < n and intervals[i][0] <= b:  # overlaps (touching counts): absorb it
            a = min(a, intervals[i][0])
            b = max(b, intervals[i][1])
            i += 1
        out.append([a, b])
        out.extend(intervals[i:])  # everything left starts after the merged interval ends
        return out
```

One pass over a sorted list does it. Intervals that end before `a` stay as they are. The ones that start no later than `b` (and didn't end before `a`) overlap the new interval, so they're absorbed, stretching it to the smallest start and largest end. What's left starts after the merged interval ends.

Both comparisons, `< a` and `<= b`, treat touching intervals as overlapping, as the task requires. It's O(n) time, and the output takes O(n) space.

## Alternatives

### Append and merge everything

```python alt time="n log n" space="n"
class Solution:
    def insert(self, intervals: List[List[int]], newInterval: List[int]) -> List[List[int]]:
        merged = []
        for s, e in sorted(intervals + [newInterval]):
            if merged and s <= merged[-1][1]:
                merged[-1][1] = max(merged[-1][1], e)
            else:
                merged.append([s, e])
        return merged
```

Adding the new interval and running the general merge of [[p:56]] is shorter and just as correct. Sorting makes it O(n log n), though Python's sort notices the list is almost sorted and finishes quickly.

## Wrong answers

### Keeps touching intervals apart

```python wrong fails="example" test="Example 3"
class Solution:
    def insert(self, intervals: List[List[int]], newInterval: List[int]) -> List[List[int]]:
        a, b = newInterval
        out, i, n = [], 0, len(intervals)
        while i < n and intervals[i][1] <= a:  # an interval ending exactly at a is kept apart
            out.append(intervals[i])
            i += 1
        while i < n and intervals[i][0] < b:
            a = min(a, intervals[i][0])
            b = max(b, intervals[i][1])
            i += 1
        out.append([a, b])
        out.extend(intervals[i:])
        return out
```

Here an interval that only touches `newInterval` stays separate, but the task says sharing one point is an overlap. In Example 3, `[4, 6]` touches both neighbours, and all three should become `[2, 8]`. Whether touching counts is different from problem to problem, so check the statement every time.

### Merges with only the first overlapping interval

```python wrong fails="example" test="Example 2"
class Solution:
    def insert(self, intervals: List[List[int]], newInterval: List[int]) -> List[List[int]]:
        a, b = newInterval
        out, i, n = [], 0, len(intervals)
        while i < n and intervals[i][1] < a:
            out.append(intervals[i])
            i += 1
        if i < n and intervals[i][0] <= b:  # `if`, not `while`: one merge at most
            a = min(a, intervals[i][0])
            b = max(b, intervals[i][1])
            i += 1
        out.append([a, b])
        out.extend(intervals[i:])
        return out
```

A new interval can overlap any number of intervals. With `if` instead of `while`, only the first is absorbed, and the result in Example 2 still contains `[8, 9]`, which overlaps the merged `[4, 10]`. Keep absorbing while the next interval starts no later than the merged end.

### Forgets the new interval when it comes last

```python wrong fails="example" test="Example 3"
class Solution:
    def insert(self, intervals: List[List[int]], newInterval: List[int]) -> List[List[int]]:
        out, placed = [], False
        a, b = newInterval
        for s, e in intervals:
            if e < a:
                out.append([s, e])
            elif s > b:
                if not placed:
                    out.append([a, b])  # placed only when a later interval comes along
                    placed = True
                out.append([s, e])
            else:
                a, b = min(a, s), max(b, e)
        return out
```

The merged interval is added only when an interval after it shows up. When nothing comes after it, it's never added at all: in Example 3 it absorbs both intervals, and the answer comes back empty. Add it after the loop if it hasn't been placed.
