---
id: 630
module: greedy-heaps
patterns: [sort by deadline, swap out the longest]
signature: "def scheduleCourse(self, courses: List[List[int]]) -> int"
---

## Task

Each course `[duration, lastDay]` takes `duration` days in a row and must be **finished** by day `lastDay`. You take courses one at a time, starting on day 1, with no gaps needed, and each course at most once.

Return the largest number of courses you can take.

## Constraints

- `1 <= len(courses) <= 100_000`
- `1 <= duration, lastDay <= 10**9`

```json examples
[
  {"args": [[[5, 5], [4, 6], [4, 8]]], "out": 2, "why": "The 5-day course fits by day 5, but the 4-day course due on day 6 is shorter. Taking it instead finishes on day 4, which leaves room for the last course too: 4 + 4 = 8."},
  {"args": [[[3, 3], [2, 10]]], "out": 2, "why": "Order matters: the 3-day course has to come first to finish by day 3, and the other still finishes by day 5."},
  {"args": [[[7, 5], [3, 4]]], "out": 1, "why": "A course that's longer than its own deadline can never be taken."}
]
```

```json edge
[
  {"name": "one course that fits", "args": [[[1, 1]]], "out": 1},
  {"name": "one course too long", "args": [[[2, 1]]], "out": 0},
  {"name": "the same deadline", "args": [[[2, 6], [3, 6], [4, 6]]], "out": 2},
  {"name": "back to back", "args": [[[1, 1], [1, 2], [1, 3]]], "out": 3},
  {"name": "a long course swapped out", "args": [[[10, 10], [1, 2], [1, 11]]], "out": 2},
  {"name": "a duration equal to its deadline", "args": [[[4, 4], [4, 8]]], "out": 2},
  {"name": "huge values", "args": [[[1000000000, 1000000000], [1, 1000000000]]], "out": 1}
]
```

```python oracle
class Solution:
    def scheduleCourse(self, courses: List[List[int]]) -> int:
        courses = sorted(courses, key=lambda c: c[1])
        best = {0: 0}  # number of courses -> the earliest day the last one can end
        for d, last in courses:
            for count, end in sorted(best.items(), reverse=True):
                if end + d <= last and end + d < best.get(count + 1, float("inf")):
                    best[count + 1] = end + d
        return max(best)
```

```python gen
def gen(rng, size):
    n = rng.randint(1, 6) if size == "small" else rng.randint(20, 300)
    hi = 10 if size == "small" else rng.choice([100, 10**4])
    courses = []
    for _ in range(n):
        d = rng.randint(1, hi)
        courses.append([d, rng.randint(1, hi * 3)])
    return [courses]
```

```python perf
def perf(rng):
    # 100,000 courses with tight deadlines, so courses keep being swapped out.
    return [[[rng.randint(1, 10**4), rng.randint(1, 10**7)] for _ in range(100_000)]]
```

## Hints

1. If you've chosen a set of courses, taking them in order of deadline is always at least as good as any other order. So sort by `lastDay` and decide course by course.
2. Take each course tentatively. If the total time now passes its deadline, one course has to go. Which one hurts least?
3. Drop the longest course taken so far (possibly the new one): the count stays the same, and the total time shrinks as much as possible, which leaves the most room for later courses. A max-heap of durations finds it.

## Solution

```python solution time="n log n" space="n"
class Solution:
    def scheduleCourse(self, courses: List[List[int]]) -> int:
        taken = []  # durations of the courses taken, as a max-heap (negated)
        day = 0     # the day the last course taken ends
        for duration, last in sorted(courses, key=lambda c: c[1]):
            heappush(taken, -duration)
            day += duration
            if day > last:
                day += heappop(taken)  # drop the longest course taken so far
        return len(taken)
```

Courses are considered in order of deadline, and the courses taken so far always finish by their deadlines, back to back. A new course is added at the end. If that overruns its deadline, removing any one course brings the count back to what it was; removing the longest one also makes the total time as short as possible. Every course left then ends no later than before, so all of them still meet their deadlines, and later courses get the most room.

This is an **exchange argument**: whatever an optimal schedule does, swapping in this choice doesn't make it worse. Sorting and one heap operation per course make it O(n log n).

## Alternatives

### Dynamic programming over the number of courses

```python alt time="n²" space="n" slow
class Solution:
    def scheduleCourse(self, courses: List[List[int]]) -> int:
        end = [0]  # end[c]: the earliest day that c of the courses seen so far can all be finished
        for duration, last in sorted(courses, key=lambda c: c[1]):
            for c in range(len(end) - 1, -1, -1):  # downwards, so this course is used at most once
                if end[c] + duration <= last:
                    if c + 1 == len(end):
                        end.append(end[c] + duration)
                    else:
                        end[c + 1] = min(end[c + 1], end[c] + duration)
        return len(end) - 1
```

Still in deadline order, track for every count c the earliest day c courses can be finished. A new course extends count c to c + 1 if it still meets its own deadline after them. This needs no exchange argument, which makes it easy to trust, but it updates every count for every course: O(n²), far too slow for 100,000 courses.

## Wrong answers

### Never swaps a course out

```python wrong fails="example" test="Example 1"
class Solution:
    def scheduleCourse(self, courses: List[List[int]]) -> int:
        day, count = 0, 0
        for duration, last in sorted(courses, key=lambda c: c[1]):
            if day + duration <= last:  # takes a course only if it fits right now
                day += duration
                count += 1
        return count
```

Sorting by deadline is right, but a course that fits now can still be the wrong one to keep. In Example 1 the 5-day course is taken, the 4-day course due on day 6 doesn't fit after it, and neither does the last one: 1 course instead of 2. The swap that drops the longest course is what makes this greedy correct.

### Takes the shortest courses first

```python wrong fails="example" test="Example 2"
class Solution:
    def scheduleCourse(self, courses: List[List[int]]) -> int:
        day, count = 0, 0
        for duration, last in sorted(courses):  # by duration
            if day + duration <= last:
                day += duration
                count += 1
        return count
```

Short courses first maximises how many fit only when deadlines don't matter. In Example 2 the 2-day course goes first, so the 3-day course can no longer finish by day 3. Process courses by deadline, and use durations only to decide what to drop.

### Searches for the longest course with a scan

```python wrong fails="perf"
class Solution:
    def scheduleCourse(self, courses: List[List[int]]) -> int:
        taken = []
        day = 0
        for duration, last in sorted(courses, key=lambda c: c[1]):
            taken.append(duration)
            day += duration
            if day > last:
                longest = max(taken)  # O(n) each time
                taken.remove(longest)
                day -= longest
        return len(taken)
```

The decisions are right, but each swap scans the courses taken. In the test, most courses cause a swap, and over ten thousand courses are taken at a time, which adds up to over a billion steps. The heap finds the longest in O(log n).
