---
id: 253
title: Fewest Meeting Rooms
own: true
module: intervals
patterns: [min-heap of end times, sweep line]
signature: "def minMeetingRooms(self, intervals: List[List[int]]) -> int"
lc_skip: Premium on LeetCode, so there are no published outputs to replay
---

## Task

You get the day's meetings as `[start, end]` pairs. Each meeting needs a room for the whole time from `start` up to `end`. A room becomes free the moment its meeting ends, so a meeting that starts exactly then can use it.

Return the smallest number of rooms that can host all the meetings.

## Constraints

- `0 <= len(intervals) <= 100_000`
- `0 <= start < end <= 10**6`

```json examples
[
  {"args": [[[1, 4], [2, 5], [3, 6]]], "out": 3, "why": "At time 3, all three meetings are running, so three rooms are needed."},
  {"args": [[[1, 3], [3, 5], [5, 7]]], "out": 1, "why": "Each meeting ends exactly when the next one starts, so one room is enough for all three."},
  {"args": [[[2, 8], [3, 4], [5, 6], [7, 9]]], "out": 2, "why": "The long meeting from 2 to 8 keeps one room busy. The other three never overlap each other, so they can take turns in a second room."}
]
```

```json edge
[
  {"name": "no meetings", "args": [[]], "out": 0},
  {"name": "a single meeting", "args": [[[4, 9]]], "out": 1},
  {"name": "the same meeting four times", "args": [[[1, 5], [1, 5], [1, 5], [1, 5]]], "out": 4},
  {"name": "nested meetings", "args": [[[1, 10], [2, 9], [3, 8]]], "out": 3},
  {"name": "far apart", "args": [[[1, 2], [5, 6], [9, 10]]], "out": 1},
  {"name": "unsorted input", "args": [[[6, 8], [1, 3], [2, 7]]], "out": 2}
]
```

```python oracle
class Solution:
    def minMeetingRooms(self, intervals: List[List[int]]) -> int:
        # The busiest moment is always some meeting's start: count the meetings running then.
        return max((sum(1 for a, b in intervals if a <= s < b) for s, _ in intervals), default=0)
```

```python gen
def gen(rng, size):
    n = rng.randint(0, 5) if size == "small" else rng.randint(5, 20)
    hi = 12 if size == "small" else 50
    out = []
    for _ in range(n):
        s = rng.randint(0, hi - 1)
        out.append([s, rng.randint(s + 1, min(hi, s + 8))])
    return [out]
```

```python perf
def perf(rng):
    # 100,000 meetings of random lengths over the day.
    out = []
    for _ in range(100_000):
        s = rng.randint(0, 10**6 - 1)
        out.append([s, rng.randint(s + 1, min(10**6, s + 5000))])
    return [out]
```

## Hints

1. Process the meetings in order of start time. When a meeting starts, can it reuse a room, or does it need a new one?
2. It can reuse a room if some meeting in progress has already ended. The one most likely to have ended is the meeting that ends *earliest*.
3. Keep a min-heap of the end times of the rooms in use. If the earliest end is at or before the new start, that room is free: replace its end time. Otherwise open a new room. The heap's final size is the answer.

## Solution

```python solution time="n log n" space="n"
class Solution:
    def minMeetingRooms(self, intervals: List[List[int]]) -> int:
        ends = []  # min-heap: when each room in use becomes free
        for start, end in sorted(intervals):  # by start time
            if ends and ends[0] <= start:
                heapreplace(ends, end)  # the earliest room is free again: reuse it
            else:
                heappush(ends, end)  # every room is busy: open another
        return len(ends)
```

Meetings are handled in order of start time, and every room is represented by the time it becomes free. A new meeting can take a room only if some room is already free, and checking the one that frees up earliest is enough: if even that one is busy, they all are. Reusing never hurts, so a room is opened only when all of them are in use, and the heap ends up as large as the busiest moment of the day.

Each meeting does one O(log n) heap operation, after an O(n log n) sort. `<=` lets a meeting start in a room the instant it's freed.

## Alternatives

### Sweep over the start and end times

```python alt time="n log n" space="n"
class Solution:
    def minMeetingRooms(self, intervals: List[List[int]]) -> int:
        starts = sorted(s for s, _ in intervals)
        ends = sorted(e for _, e in intervals)
        rooms = busiest = j = 0
        for s in starts:  # walk through the starts, closing every meeting that ended by then
            while j < len(ends) and ends[j] <= s:
                rooms -= 1
                j += 1
            rooms += 1
            busiest = max(busiest, rooms)
        return busiest
```

Which meeting ends doesn't matter, only how many are running. Sorting the starts and the ends separately and sweeping through them counts the meetings in progress at every start, and the largest count is the answer. Ends at the same time as a start are processed first, so back-to-back meetings share a room.

## Wrong answers

### Gives back-to-back meetings separate rooms

```python wrong fails="example" test="Example 2"
class Solution:
    def minMeetingRooms(self, intervals: List[List[int]]) -> int:
        ends = []
        for start, end in sorted(intervals):
            if ends and ends[0] < start:  # a room freed exactly at `start` isn't reused
                heapreplace(ends, end)
            else:
                heappush(ends, end)
        return len(ends)
```

A room is free the moment its meeting ends, so a meeting starting at that very time can use it. With `<`, the 3–5 meeting can't take the room freed at 3, and Example 2 needs three rooms instead of one.

### Doesn't sort the meetings

```python wrong fails="edge" test="unsorted input"
class Solution:
    def minMeetingRooms(self, intervals: List[List[int]]) -> int:
        ends = []
        for start, end in intervals:  # in input order
            if ends and ends[0] <= start:
                heapreplace(ends, end)
            else:
                heappush(ends, end)
        return len(ends)
```

The heap only says whether a room is free *now*, so the meetings must come in time order. Out of order, a meeting at 1–3 arrives after one at 6–8 and finds every room "busy until later", although its time slot was free. Sort by start first.

### Counts the meetings running at every start

```python wrong fails="perf"
class Solution:
    def minMeetingRooms(self, intervals: List[List[int]]) -> int:
        busiest = 0
        for s, _ in intervals:  # how many meetings are running when this one starts?
            busiest = max(busiest, sum(1 for a, b in intervals if a <= s < b))
        return busiest
```

The busiest moment of the day is always the start of some meeting, so counting the meetings running at every start gives the right answer. But each count looks at every meeting: O(n²), about 10 billion checks for 100,000 meetings. Sorting once lets a heap or a sweep keep the count up to date.
