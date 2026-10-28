---
id: intervals
title: Intervals
kicker: sort by start · merge · earliest end first · rooms and sweep lines · offline queries
summary: "Meetings, bookings, time ranges and genomic regions are all intervals: pairs of a start and an end. Almost every interval problem starts by sorting, after which overlapping intervals sit next to each other and one pass over the list does the rest."
---

## Intervals on a line

An interval is a pair `[start, end]`. Two intervals `[a, b]` and `[c, d]` overlap when each one starts before the other ends:

```python
def overlap(a, b, c, d):
    return a <= d and c <= b  # with <= , sharing a single point counts as overlapping
```

Drawn on a number line, they fail to overlap only when one lies entirely to the left of the other, and the test is just the negation of that.

:::gotcha Do touching intervals overlap?
Whether `[1, 2]` and `[2, 3]` overlap depends on the problem, and the difference is a single `<` versus `<=`. [[p:56]] and [[p:57]] merge them, because the intervals share the point 2. [[p:435]] says they don't overlap. Meetings in [[p:252]] and [[p:253]] use the time up to their end, so one ending at 10 and another starting at 10 don't clash. Read the statement, decide, and write the comparison deliberately: it's the most common off-by-one in interval problems.
:::

```python run title=Two_ways_to_compare
def overlap_closed(a, b):  # both ends included: sharing a point overlaps
    return a[0] <= b[1] and b[0] <= a[1]

def overlap_half_open(a, b):  # [start, end): the end itself is free
    return a[0] < b[1] and b[0] < a[1]

for a, b in [([1, 2], [2, 3]), ([1, 5], [2, 3]), ([1, 2], [3, 4])]:
    print(a, b, "closed:", overlap_closed(a, b), " half-open:", overlap_half_open(a, b))
```

## Sort by start, then merge

Overlapping intervals can be scattered anywhere in a list. **After sorting by start**, any interval that overlaps an earlier one also overlaps the most recent merged interval, so one pass that compares each interval with the last merged one is enough ([[p:56]]):

:::viz merge-intervals
:::

Two details matter. The merged end is the *maximum* of the two ends, because a short interval can sit entirely inside a long one. And the comparison decides whether touching intervals merge.

When the list is already sorted and non-overlapping, inserting one more interval doesn't even need a sort ([[p:57]]): the intervals that end before it, the ones that overlap it, and the ones that start after it come in three consecutive groups.

## Keep the most: earliest end first

To keep as many non-overlapping intervals as possible, or equivalently to remove as few as possible ([[p:435]]), sort by **end** and keep every interval that starts after the last kept one ends. This is the classic **interval scheduling** greedy, and the reason it works is an exchange argument: in any best selection, swapping the first interval for the one that ends earliest still leaves room for everything else.

```python run title=Earliest_end_first
def most_compatible(intervals):
    kept, last_end = [], float("-inf")
    for start, end in sorted(intervals, key=lambda iv: iv[1]):  # by end
        if start >= last_end:  # touching is allowed here
            kept.append([start, end])
            last_end = end
    return kept

talks = [[9, 17], [9, 10], [10, 11], [11, 13], [12, 14], [13, 15]]
print(most_compatible(talks))
```

Sorting by start and keeping the earliest-starting interval fails: the all-day `[9, 17]` would block every short talk.

## How many at once: rooms and sweep lines

"How many rooms do these meetings need?" ([[p:253]]) is the same as "what's the largest number of intervals that cover one point?". Two standard ways:

- **A min-heap of end times.** Go through the meetings by start time; the heap holds the end of each room's current meeting. If the earliest end is at or before the new start, that room is free again: reuse it. Otherwise open a new room.
- **A sweep line.** Turn every meeting into two events, +1 at its start and −1 at its end, sort the events by time, and add them up. The running total is the number of rooms in use; its maximum is the answer. Sorting ends before starts at equal times lets back-to-back meetings share a room.

:::viz meeting-rooms-sweep
:::

```python run title=Heap_and_sweep_agree
from heapq import heappush, heapreplace

def rooms_heap(meetings):
    ends = []
    for start, end in sorted(meetings):
        if ends and ends[0] <= start:
            heapreplace(ends, end)  # reuse the room that frees up first
        else:
            heappush(ends, end)
    return len(ends)

def rooms_sweep(meetings):
    events = sorted([(s, 1) for s, e in meetings] + [(e, -1) for s, e in meetings])
    in_use = most = 0
    for _, change in events:
        in_use += change
        most = max(most, in_use)
    return most

day = [[9, 12], [9, 10], [10, 11], [11, 13], [12, 15], [14, 16]]
print(rooms_heap(day), rooms_sweep(day))
```

[[p:252]] is the simplest case: can a single room hold everything? After sorting by start, it's enough to check each meeting against the next one.

## Queries over intervals, offline

When many queries ask about the same set of intervals, answering each one separately costs O(n) per query. If the queries are all known in advance, answer them **offline**: sort the queries too, sweep through both lists together, and write each answer back to its query's original position. In [[p:1851]], the intervals that have started go into a min-heap by size, and the ones that have already ended are dropped lazily when they reach the top.

The same sorted-endpoints idea answers "how many intervals cover point q?" with two binary searches: the intervals that started at or before q, minus those that ended before it.

```python run title=Counting_intervals_that_cover_a_point
from bisect import bisect_left, bisect_right

intervals = [[1, 5], [2, 3], [4, 8], [6, 6], [7, 10]]
starts = sorted(s for s, _ in intervals)
ends = sorted(e for _, e in intervals)

def covering(q):  # intervals include both ends
    return bisect_right(starts, q) - bisect_left(ends, q)  # started by q, minus ended before q

for q in [0, 2, 5, 6, 9, 11]:
    print(q, covering(q))
```

## Complexity

| Task | Approach | Time |
|---|---|---|
| Merge overlapping intervals | sort by start, one pass | `O(n log n)` |
| Insert into a sorted, merged list | one pass | `O(n)` |
| Most non-overlapping intervals | sort by end, greedy | `O(n log n)` |
| Most intervals at once (rooms) | heap of ends, or a sweep over events | `O(n log n)` |
| q queries over n intervals | sort both, sweep with a heap | `O((n + q) log n)` |
| Intervals covering one point, many times | sorted starts and ends, binary search | `O(log n)` per query |

:::interview
Start by asking, or stating, whether intervals that touch at an endpoint overlap, and whether ends are included. Then say what you sort by and why: by start to merge or to process meetings in time order, by end for "keep as many as possible". For the greedy, give the one-line exchange argument. For room counting, mention both the heap and the sweep.
:::

:::work
Calendars and booking systems are interval code: free/busy lookups, double-booking checks, and room or resource allocation. The same patterns merge time ranges in monitoring dashboards, coalesce overlapping regions in genomics and text editors, and schedule jobs on machines. Databases support them directly: PostgreSQL's range types, for example, have overlap operators and indexes for this.
:::

## Quick check

:::quiz
? Why sort intervals by start before merging them?
- [ ] To make the merged intervals come out shorter
- [x] So that any interval overlapping an earlier one also overlaps the last merged interval
- [ ] Sorting isn't needed, merging works in any order
> Once sorted by start, overlapping intervals are consecutive, so comparing with the last merged interval is enough.

? You merge `[1, 10]` and then `[2, 3]`. What's the merged interval?
- [ ] `[1, 3]`
- [x] `[1, 10]`
- [ ] `[2, 10]`
> The new end is the larger of the two ends. `[2, 3]` lies entirely inside `[1, 10]`.

? To keep as many non-overlapping intervals as possible, which interval should the greedy choose first?
- [ ] The one that starts first
- [ ] The shortest one
- [x] The one that ends first
> The interval that ends earliest leaves the most room for the rest, and swapping it into any best selection keeps that selection valid.

? A sweep line processes +1 at each meeting's start and −1 at each end. Why sort ends before starts at the same time?
- [x] So that a meeting starting exactly when another ends can reuse its room
- [ ] Because Python sorts negative numbers first by accident
- [ ] It doesn't matter for the answer
> Processing the end first frees the room before the new meeting takes one, so back-to-back meetings don't count as overlapping.

? Answering queries "offline" means:
- [ ] Without a network connection
- [x] Processing them in a convenient order, such as sorted, and writing each answer back to its original position
- [ ] Answering them one at a time as they arrive
> When every query is known in advance, sorting them lets one sweep share work between queries.
:::
