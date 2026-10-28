---
id: 352
module: ordered-structures
patterns: [sorted intervals with bisect, merging on insert]
kind: design
class: SummaryRanges
---

## Task

Numbers arrive one at a time. Build a class `SummaryRanges` that can describe all the numbers seen so far as a list of intervals:

- `SummaryRanges()` starts with no numbers.
- `addNum(value)` adds the number `value`. Adding a number that was already seen changes nothing.
- `getIntervals()` returns the numbers seen so far as a list of `[start, end]` intervals, sorted by start, where each interval covers every whole number from `start` to `end`, and no two intervals overlap or touch: `[1, 2]` and `[3, 4]` must be written as `[1, 4]`.

Tests list the method names called in order, their arguments, and what each call returns (`None` for the constructor and `addNum`).

## Constraints

- `0 <= value <= 10**4`
- At most `30_000` calls in total

```python starter
class SummaryRanges:
    def __init__(self):
        pass

    def addNum(self, value: int) -> None:
        pass

    def getIntervals(self) -> List[List[int]]:
        pass
```

```json examples
[
  {"ops": ["SummaryRanges", "addNum", "getIntervals", "addNum", "getIntervals", "addNum", "getIntervals"], "args": [[], [4], [], [6], [], [5], []], "out": [null, null, [[4, 4]], null, [[4, 4], [6, 6]], null, [[4, 6]]], "why": "5 fills the gap between 4 and 6, so the two intervals become one."},
  {"ops": ["SummaryRanges", "addNum", "addNum", "addNum", "addNum", "addNum", "getIntervals"], "args": [[], [10], [8], [9], [9], [0], []], "out": [null, null, null, null, null, null, [[0, 0], [8, 10]]], "why": "Numbers arrive in any order, and the second 9 changes nothing."},
  {"ops": ["SummaryRanges", "addNum", "addNum", "addNum", "getIntervals", "addNum", "addNum", "getIntervals"], "args": [[], [3], [2], [1], [], [5], [4], []], "out": [null, null, null, null, [[1, 3]], null, null, [[1, 5]]], "why": "An interval can grow at either end: 2 and 1 extend [3, 3] downwards, then 4 joins it to 5."}
]
```

```json edge
[
  {"name": "asked before any number", "ops": ["SummaryRanges", "getIntervals"], "args": [[], []], "out": [null, []]},
  {"name": "zero", "ops": ["SummaryRanges", "addNum", "getIntervals"], "args": [[], [0], []], "out": [null, null, [[0, 0]]]},
  {"name": "the largest number", "ops": ["SummaryRanges", "addNum", "addNum", "getIntervals"], "args": [[], [10000], [9999], []], "out": [null, null, null, [[9999, 10000]]]},
  {"name": "a number inside an interval", "ops": ["SummaryRanges", "addNum", "addNum", "addNum", "addNum", "getIntervals"], "args": [[], [1], [2], [3], [2], []], "out": [null, null, null, null, null, [[1, 3]]]},
  {"name": "the end of an interval again", "ops": ["SummaryRanges", "addNum", "addNum", "addNum", "getIntervals"], "args": [[], [7], [8], [8], []], "out": [null, null, null, null, [[7, 8]]]},
  {"name": "separate numbers", "ops": ["SummaryRanges", "addNum", "addNum", "addNum", "addNum", "getIntervals"], "args": [[], [6], [0], [4], [2], []], "out": [null, null, null, null, null, [[0, 0], [2, 2], [4, 4], [6, 6]]]},
  {"name": "one number joins two long intervals", "ops": ["SummaryRanges", "addNum", "addNum", "addNum", "addNum", "addNum", "addNum", "addNum", "getIntervals"], "args": [[], [1], [2], [3], [5], [6], [7], [4], []], "out": [null, null, null, null, null, null, null, null, [[1, 7]]]}
]
```

```python oracle
class SummaryRanges:
    def __init__(self):
        self.seen = set()

    def addNum(self, value: int) -> None:
        self.seen.add(value)

    def getIntervals(self) -> List[List[int]]:
        out = []
        for v in sorted(self.seen):
            if out and out[-1][1] == v - 1:
                out[-1][1] = v
            else:
                out.append([v, v])
        return out
```

```python gen
def gen(rng, size):
    calls = rng.randint(1, 10) if size == "small" else rng.randint(20, 300)
    hi = 8 if size == "small" else rng.choice([60, 10_000])
    ops, args = ["SummaryRanges"], [[]]
    for _ in range(calls):
        if rng.random() < 0.65:
            ops.append("addNum")
            args.append([rng.randint(0, hi)])
        else:
            ops.append("getIntervals")
            args.append([])
    return {"ops": ops, "args": args}
```

```python perf
def perf(rng):
    # Ten runs grow outwards from ten seeds, so there are never more than ten intervals. First 9,000
    # numbers arrive, then the intervals are asked for 20,000 times, with a few more numbers in between.
    ops, args = ["SummaryRanges"], [[]]
    runs = [[s, s] for s in range(500, 10_000, 1_000)]
    for v in [s for s, _ in runs]:
        ops.append("addNum")
        args.append([v])

    def grow():
        run = rng.choice(runs)
        if rng.random() < 0.5 and run[0] > 0:
            run[0] -= 1
            return run[0]
        run[1] += 1
        return min(run[1], 10_000)

    for _ in range(9_000):
        ops.append("addNum")
        args.append([grow()])
    for _ in range(20_000):
        if rng.random() < 0.05:
            ops.append("addNum")
            args.append([grow()])
        else:
            ops.append("getIntervals")
            args.append([])
    return {"ops": ops, "args": args}
```

## Hints

1. Keeping a set and building the intervals from the sorted numbers on every `getIntervals` works, but redoes all the work each time. Keep the intervals themselves instead.
2. Store the intervals sorted by start. For a new number v, `bisect` finds the last interval starting at or before v. Only that interval and the next one can be affected.
3. Four cases: v is already inside the interval before; v joins both neighbours (it fills a gap of one); v extends one of them; or v starts a new interval of its own.

## Solution

```python solution time="k" space="k"
class SummaryRanges:
    def __init__(self):
        self.starts = []  # interval starts, sorted
        self.ends = []    # the matching ends

    def addNum(self, value: int) -> None:
        s, e = self.starts, self.ends
        i = bisect_right(s, value) - 1  # the last interval starting at or before value, or -1
        if i >= 0 and e[i] >= value:
            return  # already covered
        joins_left = i >= 0 and e[i] == value - 1
        joins_right = i + 1 < len(s) and s[i + 1] == value + 1
        if joins_left and joins_right:  # value fills the gap: merge the two intervals
            e[i] = e[i + 1]
            del s[i + 1], e[i + 1]
        elif joins_left:
            e[i] = value
        elif joins_right:
            s[i + 1] = value
        else:
            s.insert(i + 1, value)
            e.insert(i + 1, value)

    def getIntervals(self) -> List[List[int]]:
        return [[a, b] for a, b in zip(self.starts, self.ends)]
```

The intervals are kept merged at all times, so `getIntervals` only has to copy them out. A new number can only touch the interval just before it and the interval just after it, which `bisect_right` finds in O(log k) for k intervals. Of the four cases, three change one or two numbers in place; a brand-new interval is inserted into the two lists, which shifts the entries after it.

With k intervals, `addNum` costs O(log k) plus an O(k) block move at worst, and `getIntervals` is O(k). When numbers keep merging into a few intervals, as LeetCode's follow-up asks, both stay small however many numbers arrive.

## Alternatives

### Two dicts of interval ends

```python alt time="k log k" space="n"
class SummaryRanges:
    def __init__(self):
        self.seen = set()
        self.end_of = {}    # start -> end of each interval
        self.start_of = {}  # end -> start of each interval

    def addNum(self, value: int) -> None:
        if value in self.seen:
            return
        self.seen.add(value)
        start, end = value, value
        if value - 1 in self.start_of:  # an interval ends just before value
            start = self.start_of.pop(value - 1)
        if value + 1 in self.end_of:    # an interval starts just after value
            end = self.end_of.pop(value + 1)
        self.end_of[start] = end
        self.start_of[end] = start

    def getIntervals(self) -> List[List[int]]:
        return [[s, self.end_of[s]] for s in sorted(self.end_of)]
```

Each interval is known by both of its ends, so a new number finds a neighbour ending at `value − 1` or starting at `value + 1` with two dict lookups, and merges in O(1). The set catches numbers already inside an interval. The price is paid in `getIntervals`, which sorts the k starts each time: O(k log k), good when there are few intervals and many additions.

## Wrong answers

### Forgets to merge both neighbours

```python wrong fails="example" test="Example 1"
class SummaryRanges:
    def __init__(self):
        self.starts, self.ends = [], []

    def addNum(self, value: int) -> None:
        s, e = self.starts, self.ends
        i = bisect_right(s, value) - 1
        if i >= 0 and e[i] >= value:
            return
        if i >= 0 and e[i] == value - 1:
            e[i] = value  # extends the left interval, even when value also touches the right one
        elif i + 1 < len(s) and s[i + 1] == value + 1:
            s[i + 1] = value
        else:
            s.insert(i + 1, value)
            e.insert(i + 1, value)

    def getIntervals(self) -> List[List[int]]:
        return [[a, b] for a, b in zip(self.starts, self.ends)]
```

When a number fills a gap of exactly one, it touches two intervals at once. This version extends the left one and stops, leaving `[4, 5]` and `[6, 6]` in Example 1, which touch. Check both sides, and merge when both match.

### Adds numbers that are already covered

```python wrong fails="example" test="Example 2"
class SummaryRanges:
    def __init__(self):
        self.starts, self.ends = [], []

    def addNum(self, value: int) -> None:
        s, e = self.starts, self.ends
        i = bisect_right(s, value) - 1
        # missing: return when e[i] >= value, because value is already inside interval i
        joins_left = i >= 0 and e[i] == value - 1
        joins_right = i + 1 < len(s) and s[i + 1] == value + 1
        if joins_left and joins_right:
            e[i] = e[i + 1]
            del s[i + 1], e[i + 1]
        elif joins_left:
            e[i] = value
        elif joins_right:
            s[i + 1] = value
        else:
            s.insert(i + 1, value)
            e.insert(i + 1, value)

    def getIntervals(self) -> List[List[int]]:
        return [[a, b] for a, b in zip(self.starts, self.ends)]
```

A repeated number, or any number inside an existing interval, matches none of the merge cases, so it's inserted as a new interval of its own. In Example 2 the second 9 becomes `[9, 9]` next to `[8, 10]`, which already covers it. Return early when the interval before already reaches the number.

### Sorts every number on every call

```python wrong fails="perf"
class SummaryRanges:
    def __init__(self):
        self.seen = set()

    def addNum(self, value: int) -> None:
        self.seen.add(value)

    def getIntervals(self) -> List[List[int]]:
        out = []
        for v in sorted(self.seen):  # rebuilt from scratch on every call
            if out and out[-1][1] == v - 1:
                out[-1][1] = v
            else:
                out.append([v, v])
        return out
```

Correct and simple, and adding is O(1). But each `getIntervals` sorts and walks every number seen, even when they form just a few intervals. In the test, 19,000 calls each walk about 9,000 numbers that make up ten intervals: about 180 million steps. Keeping the intervals merged as numbers arrive makes each call proportional to the number of intervals.
