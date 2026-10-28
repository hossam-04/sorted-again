---
id: 252
title: Can You Attend Every Meeting?
own: true
module: intervals
patterns: [sort by start, compare neighbours]
signature: "def canAttendMeetings(self, intervals: List[List[int]]) -> bool"
lc_skip: Premium on LeetCode, so there are no published outputs to replay
---

## Task

Your calendar is a list of meetings `[start, end]`. A meeting occupies the time from `start` up to `end`, so one that ends at 10 and another that starts at 10 **don't clash**: you can walk straight from one to the other.

Return `True` if you can attend every meeting, that is, if no two of them clash.

## Constraints

- `0 <= len(intervals) <= 100_000`
- `0 <= start < end <= 10**6`

```json examples
[
  {"args": [[[9, 10], [13, 15], [10, 12]]], "out": true, "why": "In time order the meetings are 9–10, 10–12 and 13–15. The first ends exactly when the second begins, which is fine."},
  {"args": [[[1, 5], [8, 9], [4, 6]]], "out": false, "why": "The meeting from 4 to 6 starts before the one from 1 to 5 has ended."},
  {"args": [[]], "out": true, "why": "An empty calendar has no clashes."}
]
```

```json edge
[
  {"name": "a single meeting", "args": [[[3, 8]]], "out": true},
  {"name": "the same meeting twice", "args": [[[2, 6], [2, 6]]], "out": false},
  {"name": "a meeting inside another", "args": [[[1, 10], [4, 5]]], "out": false},
  {"name": "back to back all day", "args": [[[0, 1], [1, 2], [2, 3], [3, 4]]], "out": true}
]
```

```python oracle
class Solution:
    def canAttendMeetings(self, intervals: List[List[int]]) -> bool:
        for i in range(len(intervals)):  # check every pair
            for j in range(i + 1, len(intervals)):
                (a, b), (c, d) = intervals[i], intervals[j]
                if a < d and c < b:
                    return False
        return True
```

```python gen
def gen(rng, size):
    n = rng.randint(0, 4) if size == "small" else rng.randint(4, 15)
    hi = 12 if size == "small" else 60
    out = []
    for _ in range(n):
        s = rng.randint(0, hi - 1)
        out.append([s, rng.randint(s + 1, min(hi, s + 4))])
    return [out]
```

```python perf
def perf(rng):
    # 100,000 meetings back to back, in random order: no clash anywhere.
    meetings = [[i * 10, i * 10 + 10] for i in range(100_000)]
    rng.shuffle(meetings)
    return [meetings]
```

## Hints

1. Comparing every pair of meetings works, but it's O(n²).
2. If the meetings are sorted by start, a clash always shows up between two *neighbours* in that order.
3. Sort by start, then check that each meeting ends no later than the next one starts.

## Solution

```python solution time="n log n" space="n"
class Solution:
    def canAttendMeetings(self, intervals: List[List[int]]) -> bool:
        meetings = sorted(intervals)  # by start
        for (_, end), (next_start, _) in zip(meetings, meetings[1:]):
            if next_start < end:  # starts before the previous one is over
                return False
        return True
```

After sorting by start, suppose some meeting clashes with a later one. Then it also clashes with the very next meeting, which starts no later than that one, so checking neighbours is enough. A meeting may start exactly when the previous one ends, so the test is `<`, not `<=`. Sorting dominates: O(n log n).

## Alternatives

### Sweep over sorted starts and ends

```python alt time="n log n" space="n"
class Solution:
    def canAttendMeetings(self, intervals: List[List[int]]) -> bool:
        starts = sorted(s for s, _ in intervals)
        ends = sorted(e for _, e in intervals)
        return all(starts[i + 1] >= ends[i] for i in range(len(intervals) - 1))
```

With starts and ends sorted separately, every meeting can be attended exactly when each start after the first comes no earlier than the previous end. It's the same check, phrased as a sweep, and it's the starting point of [[p:253]].

## Wrong answers

### Checks neighbours without sorting

```python wrong fails="example" test="Example 1"
class Solution:
    def canAttendMeetings(self, intervals: List[List[int]]) -> bool:
        for (_, end), (next_start, _) in zip(intervals, intervals[1:]):  # input order, not time order
            if next_start < end:
                return False
        return True
```

Neighbours in the input aren't neighbours in time. In Example 1, the 13–15 meeting is followed in the list by 10–12, which looks like a clash even though the calendar works. Sort by start before comparing neighbours.

### Treats back-to-back meetings as a clash

```python wrong fails="example" test="Example 1"
class Solution:
    def canAttendMeetings(self, intervals: List[List[int]]) -> bool:
        meetings = sorted(intervals)
        for (_, end), (next_start, _) in zip(meetings, meetings[1:]):
            if next_start <= end:  # a meeting starting right as one ends is not a clash
                return False
        return True
```

A meeting occupies the time up to its end, not including it, so 9–10 and 10–12 fit together. With `<=`, every back-to-back pair counts as a clash.

### Compares every pair of meetings

```python wrong fails="perf"
class Solution:
    def canAttendMeetings(self, intervals: List[List[int]]) -> bool:
        for i in range(len(intervals)):
            for j in range(i + 1, len(intervals)):
                (a, b), (c, d) = intervals[i], intervals[j]
                if a < d and c < b:  # the two meetings share some time
                    return False
        return True
```

Checking every pair is the definition of "no two clash", and it's correct. But a calendar of 100,000 meetings that all fit has about 5 billion pairs to check. Sorting turns it into one pass over neighbours.
