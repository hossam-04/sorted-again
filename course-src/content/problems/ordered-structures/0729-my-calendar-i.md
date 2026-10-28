---
id: 729
module: ordered-structures
patterns: [sorted list with bisect, neighbours in sorted order]
kind: design
class: MyCalendar
---

## Task

Build a class `MyCalendar` that books events and refuses double bookings.

- `MyCalendar()` starts with an empty calendar.
- `book(startTime, endTime)` tries to add an event that runs from `startTime` up to `endTime`. The event includes its start but not its end, so an event that ends at 10 and one that starts at 10 don't clash. If the new event would overlap an event already in the calendar, nothing is added and `book` returns `False`; otherwise the event is added and `book` returns `True`.

Tests list the method names called in order, their arguments, and what each call returns (`None` for the constructor).

## Constraints

- `0 <= startTime < endTime <= 10**9`
- At most `50_000` calls to `book`

```python starter
class MyCalendar:
    def __init__(self):
        pass

    def book(self, startTime: int, endTime: int) -> bool:
        pass
```

```json examples
[
  {"ops": ["MyCalendar", "book", "book", "book", "book"], "args": [[], [30, 40], [35, 50], [40, 45], [20, 31]], "out": [null, true, false, true, false], "why": "35–50 starts while 30–40 is still running. 40–45 starts exactly when 30–40 ends, which is allowed. 20–31 runs into 30–40."},
  {"ops": ["MyCalendar", "book", "book", "book", "book"], "args": [[], [100, 200], [50, 300], [50, 100], [200, 250]], "out": [null, true, false, true, true], "why": "50–300 would cover the whole of 100–200, though neither of its ends falls inside it. 50–100 and 200–250 only touch it."},
  {"ops": ["MyCalendar", "book", "book", "book", "book"], "args": [[], [5, 6], [7, 8], [6, 7], [5, 8]], "out": [null, true, true, true, false], "why": "Three back-to-back events fit together. One that spans all of them clashes with each."}
]
```

```json edge
[
  {"name": "a single booking", "ops": ["MyCalendar", "book"], "args": [[], [0, 1]], "out": [null, true]},
  {"name": "the same booking twice", "ops": ["MyCalendar", "book", "book"], "args": [[], [3, 9], [3, 9]], "out": [null, true, false]},
  {"name": "inside an existing booking", "ops": ["MyCalendar", "book", "book"], "args": [[], [0, 100], [40, 60]], "out": [null, true, false]},
  {"name": "touching on both sides", "ops": ["MyCalendar", "book", "book", "book"], "args": [[], [10, 20], [30, 40], [20, 30]], "out": [null, true, true, true]},
  {"name": "a refused booking leaves no trace", "ops": ["MyCalendar", "book", "book", "book"], "args": [[], [10, 20], [15, 25], [20, 25]], "out": [null, true, false, true]},
  {"name": "the same start as a later booking", "ops": ["MyCalendar", "book", "book"], "args": [[], [50, 60], [50, 55]], "out": [null, true, false]},
  {"name": "the end of time", "ops": ["MyCalendar", "book", "book", "book"], "args": [[], [0, 1000000000], [999999999, 1000000000], [0, 1]], "out": [null, true, false, false]}
]
```

```python oracle
class MyCalendar:
    def __init__(self):
        self.events = []

    def book(self, startTime: int, endTime: int) -> bool:
        for s, e in self.events:
            if s < endTime and startTime < e:
                return False
        self.events.append((startTime, endTime))
        return True
```

```python gen
def gen(rng, size):
    calls = rng.randint(1, 8) if size == "small" else rng.randint(20, 300)
    hi = 20 if size == "small" else 2000
    longest = 5 if size == "small" else 60
    ops, args = ["MyCalendar"], [[]]
    for _ in range(calls):
        s = rng.randint(0, hi - 1)
        ops.append("book")
        args.append([s, rng.randint(s + 1, min(hi, s + longest))])
    return {"ops": ops, "args": args}
```

```python perf
def perf(rng):
    # 40,000 bookings at random times across a billion units: many fit, the rest clash with one already made.
    ops, args = ["MyCalendar"], [[]]
    for _ in range(40_000):
        s = rng.randint(0, 10**9 - 10**5)
        ops.append("book")
        args.append([s, s + rng.randint(1, 10**5)])
    return {"ops": ops, "args": args}
```

## Hints

1. Two events overlap exactly when each one starts before the other ends: `s1 < e2 and s2 < e1`. Checking every booked event works, but costs O(n) per call.
2. The booked events never overlap, so sorted by start they're also sorted by end. A new event can only clash with its two neighbours in that order: the last event that starts at or before it, and the first one that starts after it.
3. Keep the starts and the matching ends in two lists sorted by start. `bisect_right(starts, startTime)` finds where the new event would go; check the neighbour on each side, then insert at that position.

## Solution

```python solution time="n" space="n"
class MyCalendar:
    def __init__(self):
        self.starts = []  # start times of the booked events, sorted
        self.ends = []    # their end times, in the same order

    def book(self, startTime: int, endTime: int) -> bool:
        i = bisect_right(self.starts, startTime)  # events before i start at or before startTime
        if i > 0 and self.ends[i - 1] > startTime:  # the one just before runs past our start
            return False
        if i < len(self.starts) and self.starts[i] < endTime:  # the one just after starts before our end
            return False
        self.starts.insert(i, startTime)
        self.ends.insert(i, endTime)
        return True
```

Booked events never overlap, so in order of start they form a single row, each one ending before the next begins. A new event has a place in that row, and only its two neighbours could reach it: an event further left ends before the left neighbour starts, and an event further right starts after the right neighbour does. So the two checks are enough.

`bisect_right` finds the place in O(log n). Inserting into a Python list shifts everything after it, which is O(n) in theory but a single block move in memory, fast enough for tens of thousands of events. A balanced search tree would make each booking O(log n); Python has none built in, and this is the usual substitute.

## Alternatives

### A binary search tree of events

```python alt time="n" space="n"
class Node:
    __slots__ = ("start", "end", "left", "right")

    def __init__(self, start, end):
        self.start, self.end = start, end
        self.left = self.right = None


class MyCalendar:
    def __init__(self):
        self.root = None

    def book(self, startTime: int, endTime: int) -> bool:
        if self.root is None:
            self.root = Node(startTime, endTime)
            return True
        node = self.root
        while True:
            if endTime <= node.start:  # entirely before this event
                if node.left is None:
                    node.left = Node(startTime, endTime)
                    return True
                node = node.left
            elif startTime >= node.end:  # entirely after it
                if node.right is None:
                    node.right = Node(startTime, endTime)
                    return True
                node = node.right
            else:
                return False  # it overlaps this event
```

Each node is an event, with earlier events to its left and later ones to its right. Walking down compares the new event with one event per level, and a clash is found on the way. With events booked in random order, the tree stays about 2 ln n levels deep, so each booking is fast. Booked in time order, though, the tree becomes a chain and every booking walks all of it: O(n). A self-balancing tree (red-black, AVL) fixes that, at the cost of a lot more code.

## Wrong answers

### Counts touching events as a clash

```python wrong fails="example" test="Example 1"
class MyCalendar:
    def __init__(self):
        self.events = []

    def book(self, startTime: int, endTime: int) -> bool:
        for s, e in self.events:
            if s <= endTime and startTime <= e:  # also true when one event ends as the other starts
                return False
        self.events.append((startTime, endTime))
        return True
```

An event runs up to its end time but doesn't include it, so 30–40 and 40–45 fit together. With `<=`, sharing a single moment counts as an overlap, and in Example 1 the booking of 40–45 is refused.

### Checks only whether an end falls inside a booking

```python wrong fails="example" test="Example 2"
class MyCalendar:
    def __init__(self):
        self.events = []

    def book(self, startTime: int, endTime: int) -> bool:
        for s, e in self.events:
            if s <= startTime < e or s < endTime <= e:  # misses an event that covers a booking
                return False
        self.events.append((startTime, endTime))
        return True
```

Looking for the new start or end inside an existing event misses the third way to overlap: the new event can contain a whole booking. In Example 2, 50–300 surrounds 100–200, neither of its ends is inside it, and it gets booked.

### Looks only at the event before

```python wrong fails="example" test="Example 1"
class MyCalendar:
    def __init__(self):
        self.starts, self.ends = [], []

    def book(self, startTime: int, endTime: int) -> bool:
        i = bisect_right(self.starts, startTime)
        if i > 0 and self.ends[i - 1] > startTime:
            return False
        # forgot: the event after position i may start before endTime
        self.starts.insert(i, startTime)
        self.ends.insert(i, endTime)
        return True
```

The sorted order is right, but a clash can come from either side. In Example 1, 20–31 goes before 30–40, has nothing before it, and is accepted, though it runs into 30–40. Check the neighbour after the insertion point too.

### Compares with every booked event

```python wrong fails="perf"
class MyCalendar:
    def __init__(self):
        self.events = []

    def book(self, startTime: int, endTime: int) -> bool:
        for s, e in self.events:  # every booking so far, every time
            if s < endTime and startTime < e:
                return False
        self.events.append((startTime, endTime))
        return True
```

Correct, and fine for LeetCode's 1,000 calls. With 40,000 bookings, the scans add up to about 210 million comparisons. Keeping the events sorted means only two of them ever need checking.
